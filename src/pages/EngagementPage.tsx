import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, Check, CircleDot, ExternalLink, Lock, MessageSquarePlus, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { BRAND } from '../lib/brand';
import {
  CHANGE_LABEL, STAGE_LABEL, currentStage, progressPct, roundsLeft, totals, usd, type Change, type PublicEngagement,
} from '../lib/engagement';

const fmt = (d: string) => new Date(d).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });

export default function EngagementPage() {
  const { token = '' } = useParams();
  const [e, setE] = useState<PublicEngagement | null | undefined>(undefined);
  const [req, setReq] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'approve' | 'reject' | 'stage'; id: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setE(null); return; }
    const { data, error } = await supabase.rpc('get_engagement', { p_token: token });
    setE(error || !data ? null : (data as PublicEngagement));
  }, [token]);

  useEffect(() => {
    document.title = 'Tu proyecto · JD Soluciones';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    load();
  }, [load]);

  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await supabase!.rpc(fn, { p_token: token, ...args });
    setMsg(error ? error.message : ok);
    setConfirm(null);
    load();
  };

  const sendRequest = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSending(true);
    await call('request_change', { p_body: req }, 'Recibimos tu pedido. Te respondemos si está incluido o si es un adicional, antes de hacerlo.');
    setReq('');
    setSending(false);
  };

  if (e === undefined) return <div className="brief"><main className="brief-main"><p className="muted">Cargando…</p></main></div>;
  if (e === null)
    return (
      <div className="brief"><header className="brief-bar"><Logo compact /></header>
        <main className="brief-main"><div className="brief-card"><h1>No encontramos este proyecto</h1>
          <p className="lead">Puede que el enlace esté incompleto. Escríbenos a <span className="mono select">{BRAND.email}</span>.</p></div></main>
      </div>
    );

  const pct = progressPct(e.stages);
  const cur = currentStage(e.stages);
  const t = totals(Number(e.base_price), e.changes, e.payments);
  const pendingTodos = e.client_todos.filter((x) => !x.done).length;
  const waiting = e.changes.filter((c) => c.status === 'adicional');
  const first = e.client_name.split(' ')[0];

  return (
    <div className="brief eng">
      <header className="brief-bar"><Logo compact /><span className="mono muted small">{e.status === 'terminado' ? 'Proyecto terminado' : e.status === 'pausado' ? 'En pausa' : 'En marcha'}</span></header>
      <main className="brief-main eng-main">
        <section className="eng-hero">
          <p className="eyebrow"><span className="dot" /> Seguimiento del proyecto</p>
          <h1>{e.title}</h1>
          <p className="lead">Hola {first}. Acá ves cómo avanza tu proyecto, lo que necesitamos de ti y cualquier cambio que pidas.</p>
          <div className="eng-progress" role="img" aria-label={`Avance ${pct}%`}>
            <div className="eng-bar"><span style={{ width: `${pct}%` }} /></div>
            <b className="mono">{pct}%</b>
          </div>
          {e.preview_url && (
            <a className="btn btn-hot" href={e.preview_url} target="_blank" rel="noreferrer">Ver la versión en curso <ExternalLink size={16} /></a>
          )}
        </section>

        {msg && <p className="form-note" role="status">{msg}</p>}

        {/* Avisos que requieren acción */}
        {(waiting.length > 0 || cur?.status === 'revision' || pendingTodos > 0) && (
          <section className="eng-card eng-action">
            <h2>Necesitamos tu respuesta</h2>
            <ul>
              {cur?.status === 'revision' && <li>La etapa <b>{cur.title}</b> está lista para que la revises y la apruebes.</li>}
              {waiting.length > 0 && <li>Hay {waiting.length} adicional{waiting.length > 1 ? 'es' : ''} esperando tu aprobación.</li>}
              {pendingTodos > 0 && <li>Faltan {pendingTodos} cosa{pendingTodos > 1 ? 's' : ''} de tu lado para poder avanzar.</li>}
            </ul>
          </section>
        )}

        {/* Etapas */}
        <section className="eng-card">
          <h2>Etapas</h2>
          <ol className="eng-stages">
            {e.stages.map((s) => (
              <li key={s.id} className={`st-${s.status}`}>
                <span className="eng-node">{s.status === 'aprobada' ? <Check size={14} strokeWidth={3} /> : s.status === 'pendiente' ? null : <CircleDot size={14} />}</span>
                <div className="eng-stage-main">
                  <b>{s.title}</b>
                  <small>{STAGE_LABEL[s.status]}{s.approved_at ? ` · ${fmt(s.approved_at)}` : ''}</small>
                  {(s.status === 'en_curso' || s.status === 'revision') && (
                    <small>Rondas de ajustes disponibles en esta etapa: <b>{roundsLeft(s, e.revision_rounds)} de {e.revision_rounds}</b></small>
                  )}
                  {s.status === 'revision' && (
                    confirm?.kind === 'stage' && confirm.id === s.id ? (
                      <div className="eng-confirm">
                        <p>Al aprobar la etapa damos por terminada esta parte. Cambiar algo de lo aprobado después se cotiza como adicional.</p>
                        <button className="btn btn-hot sm" onClick={() => call('approve_stage', { p_stage_id: s.id }, `Aprobaste la etapa "${s.title}". ¡Gracias!`)}><Check size={14} /> Sí, aprobar</button>
                        <button className="btn btn-ghost sm" onClick={() => setConfirm(null)}>Todavía no</button>
                      </div>
                    ) : (
                      <button className="btn btn-hot sm" onClick={() => setConfirm({ kind: 'stage', id: s.id })}>Aprobar esta etapa</button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Pendientes del cliente */}
        {e.client_todos.length > 0 && (
          <section className="eng-card">
            <h2>Lo que necesitamos de ti</h2>
            <p className="muted small">Márcalo cuando lo envíes. El proyecto avanza más rápido cuando esto está completo.</p>
            <div className="toggles">
              {e.client_todos.map((td) => (
                <button key={td.id} type="button" aria-pressed={td.done} className={`toggle${td.done ? ' on' : ''}`}
                  onClick={() => call('toggle_client_todo', { p_todo_id: td.id, p_done: !td.done }, td.done ? 'Marcado como pendiente.' : '¡Gracias! Lo marcamos como enviado.')}>
                  <span className="toggle-box">{td.done && <Check size={13} strokeWidth={3} />}</span>
                  <span className="toggle-text">{td.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Novedades */}
        <section className="eng-card">
          <h2>Novedades</h2>
          {e.updates.length === 0 ? <p className="muted">Todavía no hay novedades. Aparecen acá a medida que avanzamos.</p> : (
            <ul className="eng-updates">
              {e.updates.map((u) => (
                <li key={u.id}>
                  <span className="mono muted small">{fmt(u.created_at)}</span>
                  <p>{u.body}</p>
                  {u.link && <a className="link" href={u.link} target="_blank" rel="noreferrer">Ver <ArrowUpRight size={14} /></a>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cambios */}
        <section className="eng-card" id="cambios">
          <h2>Cambios</h2>
          <p className="muted small">
            Puedes pedir cambios cuando quieras. Te respondemos si están incluidos en lo acordado o si son un adicional,
            con su precio y el tiempo que suman. <b>Los adicionales solo se hacen si los apruebas.</b>
          </p>
          {e.status !== 'terminado' && (
            <form className="eng-request" onSubmit={sendRequest}>
              <textarea id="eng-req" rows={3} maxLength={2000} required value={req} onChange={(x) => setReq(x.target.value)} placeholder="Ej: quiero que el botón de reservar esté más arriba, o agregar una sección de preguntas frecuentes." />
              <button className="btn btn-hot" disabled={sending || req.trim().length < 3}>{sending ? 'Enviando…' : <>Pedir este cambio <Send size={16} /></>}</button>
            </form>
          )}
          {e.changes.length > 0 && (
            <ul className="eng-changes">
              {e.changes.map((c: Change) => (
                <li key={c.id} className={`ch-${c.status}`}>
                  <div className="ch-head">
                    <span className={`pill ${c.status === 'aprobado' || c.status === 'incluido' ? 'ok' : ''}`}>{CHANGE_LABEL[c.status]}</span>
                    <span className="mono muted small">{fmt(c.created_at)}</span>
                  </div>
                  <p>{c.body}</p>
                  {c.admin_note && <p className="ch-note">{c.admin_note}</p>}
                  {(c.status === 'adicional' || c.status === 'aprobado') && c.price != null && (
                    <p className="ch-price"><b>{usd(c.price)}</b> · suma {c.days ?? '?'} día{c.days === 1 ? '' : 's'} al plazo</p>
                  )}
                  {c.status === 'adicional' && (
                    confirm && confirm.id === c.id ? (
                      <div className="eng-confirm">
                        <p>{confirm.kind === 'approve' ? `Confirmas que se agrega este cambio por ${usd(c.price ?? 0)} al total del proyecto.` : 'Confirmas que no se hace este cambio.'}</p>
                        <button className={`btn sm ${confirm.kind === 'approve' ? 'btn-hot' : 'btn-danger'}`}
                          onClick={() => call('answer_change', { p_change_id: c.id, p_approve: confirm.kind === 'approve' }, confirm.kind === 'approve' ? 'Aprobaste el adicional. Lo sumamos al plan.' : 'Listo, ese cambio no se hace.')}>
                          Sí, confirmar
                        </button>
                        <button className="btn btn-ghost sm" onClick={() => setConfirm(null)}>Volver</button>
                      </div>
                    ) : (
                      <div className="ch-actions">
                        <button className="btn btn-hot sm" onClick={() => setConfirm({ kind: 'approve', id: c.id })}><Check size={14} /> Aprobar adicional</button>
                        <button className="btn btn-ghost sm" onClick={() => setConfirm({ kind: 'reject', id: c.id })}><X size={14} /> No hacerlo</button>
                      </div>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Alcance */}
        <section className="eng-card">
          <h2><Lock size={18} /> Alcance acordado</h2>
          <p className="muted small">Esto es lo que incluye el precio acordado. Incluye {e.revision_rounds} ronda{e.revision_rounds === 1 ? '' : 's'} de ajustes por etapa.</p>
          <ul className="eng-scope">{e.scope.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        {/* Pagos */}
        <section className="eng-card">
          <h2>Pagos</h2>
          <table className="eng-pay">
            <tbody>
              <tr><td>Precio acordado</td><td className="mono">{usd(Number(e.base_price))}</td></tr>
              {t.extras > 0 && <tr><td>Adicionales aprobados</td><td className="mono">+ {usd(t.extras)}</td></tr>}
              <tr className="total"><td>Total</td><td className="mono">{usd(t.total)}</td></tr>
            </tbody>
          </table>
          <ul className="eng-payments">
            {e.payments.map((p) => (
              <li key={p.id} className={p.paid ? 'paid' : ''}>
                <span className="toggle-box">{p.paid && <Check size={13} strokeWidth={3} />}</span>
                <span className="eng-pay-label">{p.label}</span>
                <span className="mono">{usd(p.amount)}</span>
                <small>{p.paid ? `Recibido${p.paid_at ? ` ${fmt(p.paid_at)}` : ''}` : 'Pendiente'}</small>
              </li>
            ))}
          </ul>
          {t.extras > 0 && <p className="muted small">Los adicionales aprobados se cobran junto con el último pago, salvo que acordemos otra cosa.</p>}
        </section>

        <p className="muted small eng-foot"><MessageSquarePlus size={14} /> ¿Dudas? Escríbenos a <span className="mono select">{BRAND.email}</span>.</p>
      </main>
    </div>
  );
}
