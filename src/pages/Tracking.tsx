import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, MessageCircle, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { arr, str, Q3, type BriefAnswers } from '../lib/brief';
import { DEFAULT_SETTINGS, EMPTY_ADJUST, estimate, roundPrice, type Adjust, type Settings } from '../lib/quote';
import {
  CHANGE_LABEL, DEFAULT_STAGES, STAGE_LABEL, extraDays, progressPct, roundsLeft, totals, uid, usd,
  type Change, type Engagement, type Stage, type StageStatus, type Update,
} from '../lib/engagement';

type QuoteRow = {
  id: string; client_name: string; final_price: number | null; price_target: number; status: string; created_at: string;
  answers: { answers?: BriefAnswers; adjust?: Adjust };
};

const linkFor = (token: string) => `${window.location.origin}/proyecto/${token}`;
const inviteText = (e: Engagement) =>
  `Hola ${e.client_name.split(' ')[0]}! Arrancamos con ${e.title}. En este enlace vas a poder seguir el avance, ver lo que necesito de tu parte, ` +
  `pedir cambios y aprobar cada etapa:\n${linkFor(e.token)}\n\nGuárdalo, es personal. JD Soluciones Informáticas`;

async function copyText(t: string) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }

/** Pendientes del cliente según lo que respondió en el cuestionario. */
function defaultTodos(a: BriefAnswers): { id: string; label: string; done: boolean }[] {
  const out: string[] = [];
  const q25 = str(a, 'q25');
  if (q25.startsWith('Sí') || q25.startsWith('Tengo logo')) out.push('Enviar el logo en buena calidad y los colores de la marca');
  out.push('Enviar los textos de cada sección');
  out.push('Enviar las fotos o imágenes que quieras usar');
  const q21 = str(a, 'q21');
  if (q21.startsWith('Sí')) out.push('Enviar las planillas o datos que hay que pasar al sistema');
  if (arr(a, 'q3').includes(Q3.improve)) out.push('Pasar los accesos al sistema actual (dominio, hosting, contraseñas)');
  if (/whats?app/i.test(str(a, 'q23_detail')) || arr(a, 'q18').includes('Por WhatsApp.')) out.push('Verificar la empresa en Meta para usar WhatsApp');
  out.push('Indicar el dominio que quieres usar (o si hay que comprarlo)');
  return out.map((label) => ({ id: uid(), label, done: false }));
}

export default function Tracking({ onPending }: { onPending?: (n: number) => void }) {
  const [list, setList] = useState<Engagement[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [changesCount, setChangesCount] = useState<Record<string, number>>({});
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [dbReady, setDbReady] = useState(true);
  const [msg, setMsg] = useState('');

  // Crear
  const [fromQuote, setFromQuote] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState<number | ''>('');

  // Detalle
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Engagement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [newUpdateLink, setNewUpdateLink] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [quoting, setQuoting] = useState<{ id: string; hours: number | ''; note: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setDbReady(false); return; }
    const [es, qs, cs, st] = await Promise.all([
      supabase.from('engagements').select('*').order('created_at', { ascending: false }),
      supabase.from('quotes').select('id,client_name,final_price,price_target,status,created_at,answers').order('created_at', { ascending: false }).limit(100),
      supabase.from('change_requests').select('engagement_id,status').eq('status', 'nuevo'),
      supabase.from('quote_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (es.error) { setDbReady(false); return; }
    setDbReady(true);
    setList((es.data ?? []) as Engagement[]);
    setQuotes((qs.data ?? []) as QuoteRow[]);
    const counts: Record<string, number> = {};
    for (const c of (cs.data ?? []) as { engagement_id: string }[]) counts[c.engagement_id] = (counts[c.engagement_id] ?? 0) + 1;
    setChangesCount(counts);
    onPending?.(Object.values(counts).reduce((a, b) => a + b, 0));
    if (st.data) setS((p) => ({ ...p, ...Object.fromEntries(Object.entries(st.data).filter(([k]) => k in p).map(([k, v]) => [k, Number(v)])) }));
  }, [onPending]);
  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    const [u, c] = await Promise.all([
      supabase!.from('engagement_updates').select('*').eq('engagement_id', id).order('created_at', { ascending: false }),
      supabase!.from('change_requests').select('*').eq('engagement_id', id).order('created_at', { ascending: false }),
    ]);
    setUpdates((u.data ?? []) as Update[]);
    setChanges((c.data ?? []) as Change[]);
  }, []);

  const open = (e: Engagement) => { setSelId(e.id); setDraft(structuredClone(e)); setDirty(false); setMsg(''); loadDetail(e.id); setTimeout(() => document.getElementById('seg-detail')?.scrollIntoView({ behavior: 'smooth' }), 50); };
  useEffect(() => { if (selId) { const e = list.find((x) => x.id === selId); if (e && !dirty) setDraft(structuredClone(e)); } }, [list, selId, dirty]);

  const edit = (patch: Partial<Engagement>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setDirty(true); };
  const editStage = (i: number, patch: Partial<Stage>) => draft && edit({ stages: draft.stages.map((st, j) => (j === i ? { ...st, ...patch, approved_at: patch.status === 'aprobada' ? (st.approved_at ?? new Date().toISOString()) : patch.status ? null : st.approved_at } : st)) });
  const moveStage = (i: number, dir: -1 | 1) => {
    if (!draft) return;
    const st = [...draft.stages]; const j = i + dir;
    if (j < 0 || j >= st.length) return;
    [st[i], st[j]] = [st[j], st[i]]; edit({ stages: st });
  };

  const create = async (ev: React.FormEvent) => {
    ev.preventDefault();
    let row: Record<string, unknown>;
    if (fromQuote) {
      const q = quotes.find((x) => x.id === fromQuote)!;
      const a = q.answers?.answers ?? {};
      const est = estimate(a, { ...EMPTY_ADJUST, ...(q.answers?.adjust ?? {}) }, s);
      const price = Number(q.final_price ?? q.price_target);
      const payLabels = est.payments.map((p) => `${p.pct}% ${p.label}`);
      row = {
        quote_id: q.id, client_name: q.client_name, title: str(a, 'q1') || `Proyecto de ${q.client_name}`,
        scope: est.active.map((b) => b.scope), base_price: price, hourly_rate: s.target_rate, revision_rounds: s.revision_rounds,
        stages: DEFAULT_STAGES.map((t, i) => ({ id: uid(), title: t, status: i === 0 ? 'en_curso' : 'pendiente', rounds_used: 0 })),
        payments: est.payments.map((p, i) => ({ id: uid(), label: payLabels[i], amount: roundPrice((price * p.pct) / 100), paid: false })),
        client_todos: defaultTodos(a),
      };
    } else {
      if (!manualName.trim() || !manualTitle.trim()) { setMsg('Completá cliente y nombre del proyecto.'); return; }
      const price = Number(manualPrice) || 0;
      row = {
        client_name: manualName.trim(), title: manualTitle.trim(), scope: [], base_price: price, hourly_rate: s.target_rate, revision_rounds: s.revision_rounds,
        stages: DEFAULT_STAGES.map((t, i) => ({ id: uid(), title: t, status: i === 0 ? 'en_curso' : 'pendiente', rounds_used: 0 })),
        payments: [{ id: uid(), label: '50% al aprobar la propuesta', amount: roundPrice(price / 2), paid: false }, { id: uid(), label: '50% al publicar', amount: roundPrice(price / 2), paid: false }],
        client_todos: defaultTodos({}),
      };
    }
    const { data, error } = await supabase!.from('engagements').insert(row).select('*').single();
    if (error || !data) { setMsg('No se pudo crear el seguimiento. ¿Aplicaste la migración de seguimiento?'); return; }
    if (fromQuote) await supabase!.from('quotes').update({ status: 'aceptada' }).eq('id', fromQuote);
    setFromQuote(''); setManualName(''); setManualTitle(''); setManualPrice('');
    await load();
    open(data as Engagement);
    setMsg('Seguimiento creado. Revisá etapas, pagos y pendientes, y mandale el enlace al cliente.');
  };

  const save = async () => {
    if (!draft) return;
    const { id, token: _t, ...rest } = draft; void _t;
    const { error } = await supabase!.from('engagements').update({
      title: rest.title, client_name: rest.client_name, scope: rest.scope.map((x) => x.trim()).filter(Boolean), base_price: Number(rest.base_price) || 0, hourly_rate: Number(rest.hourly_rate) || s.target_rate,
      revision_rounds: Number(rest.revision_rounds) || 0, stages: rest.stages, payments: rest.payments, client_todos: rest.client_todos,
      preview_url: rest.preview_url?.trim() || null, status: rest.status,
    }).eq('id', id);
    if (error) { setMsg(`No se pudo guardar: ${error.message}`); return; }
    setDirty(false); setMsg('Cambios guardados. El cliente ya los ve.'); load();
  };

  const postUpdate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!draft || !newUpdate.trim()) return;
    const { error } = await supabase!.from('engagement_updates').insert({ engagement_id: draft.id, body: newUpdate.trim(), link: newUpdateLink.trim() || null });
    if (error) { setMsg('No se pudo publicar la novedad. Revisá que el enlace empiece con https://'); return; }
    setNewUpdate(''); setNewUpdateLink(''); loadDetail(draft.id);
  };
  const delUpdate = async (id: string) => { await supabase!.from('engagement_updates').delete().eq('id', id); if (draft) loadDetail(draft.id); };

  const cur = draft ? (draft.stages.find((x) => x.status === 'en_curso' || x.status === 'revision') ?? null) : null;

  const classifyIncluded = async (c: Change) => {
    if (!draft) return;
    if (cur) {
      const stages = draft.stages.map((x) => (x.id === cur.id ? { ...x, rounds_used: (x.rounds_used || 0) + 1 } : x));
      await supabase!.from('engagements').update({ stages }).eq('id', draft.id);
      setDraft({ ...draft, stages });
    }
    await supabase!.from('change_requests').update({ status: 'incluido', decided_at: new Date().toISOString(), stage_id: cur?.id ?? null }).eq('id', c.id);
    loadDetail(draft.id); load();
  };
  const proposeExtra = async () => {
    if (!draft || !quoting || !quoting.hours) return;
    const hours = Number(quoting.hours);
    const price = roundPrice(hours * Number(draft.hourly_rate || s.target_rate));
    const days = extraDays(hours, s.hours_per_week);
    await supabase!.from('change_requests').update({ status: 'adicional', hours, price, days, admin_note: quoting.note.trim(), decided_at: new Date().toISOString() }).eq('id', quoting.id);
    setQuoting(null); loadDetail(draft.id); load();
  };
  const discard = async (c: Change) => { await supabase!.from('change_requests').update({ status: 'descartado', decided_at: new Date().toISOString() }).eq('id', c.id); if (draft) { loadDetail(draft.id); load(); } };
  const del = async () => { if (!draft) return; await supabase!.from('engagements').delete().eq('id', draft.id); setSelId(null); setDraft(null); setConfirmDel(false); load(); };

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(''), 1800); };
  const t = draft ? totals(Number(draft.base_price), changes, draft.payments) : null;
  const left = draft ? roundsLeft(cur ?? undefined, Number(draft.revision_rounds)) : 0;
  const availableQuotes = useMemo(() => quotes.filter((q) => !list.some((e) => e.quote_id === q.id)), [quotes, list]);

  return (
    <div className="quoter tracking">
      {!dbReady && <p className="form-note" role="alert">Faltan las tablas de seguimiento: ejecutá <code>supabase/migrations/20261016130000_engagements.sql</code> en el SQL Editor de Supabase.</p>}

      <section className="qr-briefs">
        <div><h2>Seguimiento de proyectos</h2><p className="muted">Cuando el cliente acepta, creás su seguimiento y le mandás el enlace. Ahí ve el avance, sus pendientes y los pagos, y pide cambios que vos clasificás.</p></div>
        <form className="form brief-new" onSubmit={create}>
          <label className="field"><span>Desde una cotización guardada</span>
            <select id="tr-quote" value={fromQuote} onChange={(e) => setFromQuote(e.target.value)}>
              <option value="">— Crear sin cotización —</option>
              {availableQuotes.map((q) => <option key={q.id} value={q.id}>{q.client_name} · {usd(Number(q.final_price ?? q.price_target))} · {new Date(q.created_at).toLocaleDateString('es-UY')}</option>)}
            </select>
          </label>
          {!fromQuote && (
            <div className="field-row three">
              <label className="field"><span>Cliente</span><input id="tr-name" value={manualName} onChange={(e) => setManualName(e.target.value)} /></label>
              <label className="field"><span>Nombre del proyecto</span><input id="tr-title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} /></label>
              <label className="field"><span>Precio acordado (USD)</span><input id="tr-price" type="number" min={0} value={manualPrice} onChange={(e) => setManualPrice(e.target.value === '' ? '' : Number(e.target.value))} /></label>
            </div>
          )}
          <button className="btn btn-hot" disabled={!dbReady}><Plus size={16} /> Crear seguimiento</button>
        </form>

        {list.length > 0 && (
          <ul className="admin-list">
            {list.map((e) => (
              <li key={e.id} className={selId === e.id ? 'sel' : ''}>
                <div className="admin-list-main"><b>{e.title}</b><span className="muted">{e.client_name} · {progressPct(e.stages)}% · {e.status}</span></div>
                {changesCount[e.id] ? <span className="badge">{changesCount[e.id]} cambio{changesCount[e.id] > 1 ? 's' : ''} nuevo{changesCount[e.id] > 1 ? 's' : ''}</span> : null}
                <a className="btn btn-ghost sm" href={linkFor(e.token)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Ver como cliente</a>
                <button type="button" className="btn btn-hot sm" onClick={() => open(e)}>Abrir</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draft && (
        <section id="seg-detail" className="qr-work">
          <div className="qr-work-head">
            <div className="seg-title">
              <input id="tr-d-title" className="seg-title-input" value={draft.title} onChange={(e) => edit({ title: e.target.value })} aria-label="Nombre del proyecto" />
              <span className="muted">{draft.client_name}</span>
            </div>
            <div className="qr-actions">
              <button type="button" className="btn btn-ghost sm" onClick={async () => { if (await copyText(inviteText(draft))) flash('inv'); }}>{copied === 'inv' ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar mensaje con enlace</>}</button>
              <a className="btn btn-ghost sm" href={`https://wa.me/?text=${encodeURIComponent(inviteText(draft))}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              <button type="button" className="btn btn-hot" onClick={save} disabled={!dirty}><Save size={16} /> {dirty ? 'Guardar cambios' : 'Guardado'}</button>
            </div>
          </div>
          {msg && <p className="muted qr-msg" role="status">{msg}</p>}

          <div className="quoter-grid">
            <div className="qr-left">
              {/* Cambios pedidos */}
              <div className="qr-card">
                <div className="qr-head"><h3>Cambios pedidos</h3>{cur && <span className="muted small">Etapa actual: {cur.title} · rondas libres {left} de {draft.revision_rounds}</span>}</div>
                {changes.length === 0 ? <p className="muted">El cliente todavía no pidió cambios.</p> : (
                  <ul className="eng-changes">
                    {changes.map((c) => (
                      <li key={c.id} className={`ch-${c.status}`}>
                        <div className="ch-head"><span className={`pill ${['incluido', 'aprobado'].includes(c.status) ? 'ok' : ''}`}>{CHANGE_LABEL[c.status]}</span><span className="mono muted small">{new Date(c.created_at).toLocaleDateString('es-UY')}</span></div>
                        <p>{c.body}</p>
                        {c.admin_note && <p className="ch-note">{c.admin_note}</p>}
                        {c.price != null && <p className="ch-price">{c.hours} h · <b>{usd(c.price)}</b> · +{c.days} días</p>}
                        {c.status === 'nuevo' && (
                          quoting?.id === c.id ? (
                            <div className="ch-quote">
                              <label className="field"><span>Horas que lleva</span><input type="number" min={0.5} step={0.5} value={quoting.hours} onChange={(e) => setQuoting({ ...quoting, hours: e.target.value === '' ? '' : Number(e.target.value) })} autoFocus /></label>
                              <label className="field"><span>Nota para el cliente <em>(opcional)</em></span><input value={quoting.note} onChange={(e) => setQuoting({ ...quoting, note: e.target.value })} placeholder="Ej: implica una pantalla nueva y cambios en la base de datos." /></label>
                              {quoting.hours !== '' && <p className="mono">{usd(roundPrice(Number(quoting.hours) * Number(draft.hourly_rate)))} · +{extraDays(Number(quoting.hours), s.hours_per_week)} días</p>}
                              <div className="ch-actions">
                                <button type="button" className="btn btn-hot sm" onClick={proposeExtra} disabled={!quoting.hours}><Send size={14} /> Enviar adicional al cliente</button>
                                <button type="button" className="btn btn-ghost sm" onClick={() => setQuoting(null)}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="ch-actions">
                              <button type="button" className="btn btn-ghost sm" onClick={() => classifyIncluded(c)} title="Ajuste dentro de lo acordado: usa una ronda de la etapa actual">
                                <Check size={14} /> Incluido{cur ? ` (ronda ${(cur.rounds_used || 0) + 1} de ${draft.revision_rounds})` : ''}
                              </button>
                              <button type="button" className="btn btn-hot sm" onClick={() => setQuoting({ id: c.id, hours: '', note: '' })}>Es adicional: cotizar</button>
                              <button type="button" className="icon-btn sm" aria-label="Descartar" onClick={() => discard(c)}><X size={14} /></button>
                              {cur && left === 0 && <small className="warn">No quedan rondas en esta etapa: corresponde cotizarlo como adicional.</small>}
                            </div>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Etapas */}
              <div className="qr-card">
                <div className="qr-head"><h3>Etapas</h3><span className="mono muted">{progressPct(draft.stages)}%</span></div>
                <p className="muted small">Cuando termines una etapa, ponela en "Esperando aprobación": el cliente la aprueba desde su panel.</p>
                <ul className="blocks">
                  {draft.stages.map((st, i) => (
                    <li key={st.id}>
                      <div className="stage-move">
                        <button type="button" className="icon-btn sm" aria-label="Subir" onClick={() => moveStage(i, -1)} disabled={i === 0}><ArrowUp size={12} /></button>
                        <button type="button" className="icon-btn sm" aria-label="Bajar" onClick={() => moveStage(i, 1)} disabled={i === draft.stages.length - 1}><ArrowDown size={12} /></button>
                      </div>
                      <input className="stage-title" value={st.title} onChange={(e) => editStage(i, { title: e.target.value })} aria-label="Nombre de la etapa" />
                      <select value={st.status} onChange={(e) => editStage(i, { status: e.target.value as StageStatus })} aria-label="Estado">
                        {(Object.keys(STAGE_LABEL) as StageStatus[]).map((k) => <option key={k} value={k}>{k === 'revision' ? 'Esperando aprobación' : STAGE_LABEL[k]}</option>)}
                      </select>
                      <span className="hours-input" title="Rondas de ajustes usadas">
                        <input type="number" min={0} value={st.rounds_used || 0} onChange={(e) => editStage(i, { rounds_used: Number(e.target.value) || 0 })} aria-label="Rondas usadas" />
                        <small>rondas</small>
                      </span>
                      <button type="button" className="icon-btn sm" aria-label="Quitar etapa" onClick={() => edit({ stages: draft.stages.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn-ghost sm" onClick={() => edit({ stages: [...draft.stages, { id: uid(), title: 'Nueva etapa', status: 'pendiente', rounds_used: 0 }] })}><Plus size={14} /> Agregar etapa</button>
              </div>

              {/* Novedades */}
              <div className="qr-card">
                <h3>Novedades</h3>
                <form className="seg-update" onSubmit={postUpdate}>
                  <textarea rows={2} maxLength={2000} value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Ej: Terminé el diseño de la página de inicio. Ya podés verlo en el enlace de prueba." />
                  <div className="extra-row">
                    <input value={newUpdateLink} onChange={(e) => setNewUpdateLink(e.target.value)} placeholder="Enlace opcional (captura, video, versión de prueba)" />
                    <button className="btn btn-hot sm" disabled={!newUpdate.trim()}><Send size={14} /> Publicar</button>
                  </div>
                </form>
                <ul className="eng-updates">
                  {updates.map((u) => (
                    <li key={u.id}>
                      <span className="mono muted small">{new Date(u.created_at).toLocaleDateString('es-UY')}</span>
                      <p>{u.body}</p>
                      {u.link && <a className="link" href={u.link} target="_blank" rel="noreferrer">{u.link}</a>}
                      <button type="button" className="icon-btn sm" aria-label="Borrar novedad" onClick={() => delUpdate(u.id)}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="quoter-result">
              {/* Pagos */}
              <div className="qr-card">
                <h3>Pagos</h3>
                {t && (
                  <dl className="qr-facts">
                    <div><dt>Acordado</dt><dd className="mono">{usd(Number(draft.base_price))}</dd></div>
                    <div><dt>Adicionales aprobados</dt><dd className="mono">{usd(t.extras)}</dd></div>
                    <div><dt>Total</dt><dd className="mono">{usd(t.total)}</dd></div>
                    <div><dt>Cobrado</dt><dd className="mono">{usd(t.paid)}</dd></div>
                  </dl>
                )}
                <ul className="blocks">
                  {draft.payments.map((p, i) => (
                    <li key={p.id}>
                      <button type="button" className={`toggle-box btn-box${p.paid ? ' on' : ''}`} aria-pressed={p.paid} aria-label={p.paid ? 'Marcar como pendiente' : 'Marcar como cobrado'}
                        onClick={() => edit({ payments: draft.payments.map((x, j) => (j === i ? { ...x, paid: !x.paid, paid_at: !x.paid ? new Date().toISOString() : null } : x)) })}>
                        {p.paid && <Check size={13} strokeWidth={3} />}
                      </button>
                      <input className="stage-title" value={p.label} onChange={(e) => edit({ payments: draft.payments.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Concepto" />
                      <span className="hours-input"><input type="number" min={0} value={p.amount} onChange={(e) => edit({ payments: draft.payments.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) })} aria-label="Monto" /><small>USD</small></span>
                      <button type="button" className="icon-btn sm" aria-label="Quitar pago" onClick={() => edit({ payments: draft.payments.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn-ghost sm" onClick={() => edit({ payments: [...draft.payments, { id: uid(), label: t && t.extras > 0 ? 'Adicionales aprobados' : 'Pago', amount: t ? Math.max(0, t.pending - draft.payments.filter((p) => !p.paid).reduce((a, p) => a + Number(p.amount), 0)) : 0, paid: false }] })}><Plus size={14} /> Agregar pago</button>
              </div>

              {/* Pendientes del cliente */}
              <div className="qr-card">
                <h3>Lo que necesitás del cliente</h3>
                <ul className="blocks">
                  {draft.client_todos.map((td, i) => (
                    <li key={td.id} className={td.done ? 'off' : ''}>
                      <span className={`toggle-box${td.done ? ' on btn-box' : ''}`}>{td.done && <Check size={13} strokeWidth={3} />}</span>
                      <input className="stage-title" value={td.label} onChange={(e) => edit({ client_todos: draft.client_todos.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Pendiente" />
                      <button type="button" className="icon-btn sm" aria-label="Quitar" onClick={() => edit({ client_todos: draft.client_todos.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
                <div className="extra-row">
                  <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Agregar pendiente" onKeyDown={(e) => { if (e.key === 'Enter' && newTodo.trim()) { e.preventDefault(); edit({ client_todos: [...draft.client_todos, { id: uid(), label: newTodo.trim(), done: false }] }); setNewTodo(''); } }} />
                  <button type="button" className="btn btn-ghost sm" onClick={() => { if (newTodo.trim()) { edit({ client_todos: [...draft.client_todos, { id: uid(), label: newTodo.trim(), done: false }] }); setNewTodo(''); } }}><Plus size={14} /></button>
                </div>
              </div>

              {/* Configuración */}
              <div className="qr-card">
                <h3>Proyecto</h3>
                <label className="field"><span>Enlace de la versión de prueba</span><input type="url" value={draft.preview_url ?? ''} onChange={(e) => edit({ preview_url: e.target.value })} placeholder="https://" /></label>
                <div className="field-row">
                  <label className="field"><span>Precio acordado (USD)</span><input type="number" min={0} value={draft.base_price} onChange={(e) => edit({ base_price: Number(e.target.value) || 0 })} /></label>
                  <label className="field"><span>Tu tarifa para adicionales</span><input type="number" min={0} value={draft.hourly_rate} onChange={(e) => edit({ hourly_rate: Number(e.target.value) || 0 })} /><small>USD por hora; el cliente no la ve</small></label>
                </div>
                <div className="field-row">
                  <label className="field"><span>Rondas de ajustes por etapa</span><input type="number" min={0} max={10} value={draft.revision_rounds} onChange={(e) => edit({ revision_rounds: Number(e.target.value) || 0 })} /></label>
                  <label className="field"><span>Estado</span>
                    <select value={draft.status} onChange={(e) => edit({ status: e.target.value })}>
                      <option value="activo">En marcha</option><option value="pausado">En pausa</option><option value="terminado">Terminado</option>
                    </select>
                  </label>
                </div>
                <label className="field"><span>Alcance acordado (uno por línea)</span>
                  <textarea rows={6} value={draft.scope.join('\n')} onChange={(e) => edit({ scope: e.target.value.split('\n') })} />
                  <small>El cliente lo ve como solo lectura. Cambialo solo si lo acordaron.</small>
                </label>
                {confirmDel ? (
                  <span className="confirm">¿Borrar el seguimiento y su historial? <button className="btn btn-danger sm" onClick={del}>Sí, borrar</button><button className="btn btn-ghost sm" onClick={() => setConfirmDel(false)}>No</button></span>
                ) : (
                  <button type="button" className="btn btn-ghost sm" onClick={() => setConfirmDel(true)}><Trash2 size={14} /> Borrar seguimiento</button>
                )}
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
