import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ClipboardList, Copy, Link2, Mail, MessageCircle, Plus, RotateCcw, Save, Settings2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SECTIONS, briefAsText, progress, visibleSections, type BriefAnswers } from '../lib/brief';
import { CLIENT_TYPES, DEFAULT_SETTINGS, EMPTY_ADJUST, estimate, guessEntities, proposalText, type Adjust, type Range, type Settings } from '../lib/quote';
import { BriefForm } from '../components/BriefForm';

export type LeadLite = { id: string; name: string; email: string; service: string; message: string };
type Brief = { id: string; token: string; lead_id: string | null; client_name: string; client_email: string; status: string; answers: BriefAnswers; created_at: string; submitted_at: string | null };
type SavedQuote = {
  id: string; brief_id: string | null; lead_id: string | null; client_name: string; client_type: string; answers: { answers?: BriefAnswers; adjust?: Adjust };
  hours_min: number; hours_max: number; price_floor: number; price_target: number; price_high: number;
  final_price: number | null; status: string; actual_hours: number | null; created_at: string;
};

const usd = (n: number) => `USD ${Math.round(n).toLocaleString('es-UY')}`;
const briefUrl = (token: string) => `${window.location.origin}/cuestionario/${token}`;
const inviteText = (name: string, token: string) =>
  `Hola${name ? ` ${name.split(' ')[0]}` : ''}! Gracias por contactarme. Para preparar tu presupuesto necesito conocer un poco más tu idea. ` +
  `Completa este cuestionario cuando puedas (lleva 10 a 20 minutos y se guarda solo):\n${briefUrl(token)}\n\nJD Soluciones Informáticas`;
const STATUS_LABEL: Record<string, string> = { enviado: 'Enviado', en_progreso: 'Completando', respondido: 'Respondido' };

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

function HoursInput({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <span className="hours-input">
      <input type="number" min={0} value={Math.round(value[0])} onChange={(e) => onChange([Number(e.target.value) || 0, Math.max(Number(e.target.value) || 0, value[1])])} aria-label="Horas mínimas" />
      –
      <input type="number" min={0} value={Math.round(value[1])} onChange={(e) => onChange([value[0], Number(e.target.value) || 0])} aria-label="Horas máximas" />
      <small>h</small>
    </span>
  );
}

export default function Quoter({ leads, presetLead }: { leads: LeadLite[]; presetLead?: LeadLite | null }) {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [saved, setSaved] = useState<SavedQuote[]>([]);
  const [dbReady, setDbReady] = useState(true);
  const [msg, setMsg] = useState('');

  // Nuevo cuestionario
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLead, setNewLead] = useState('');
  const [created, setCreated] = useState<Brief | null>(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);

  // Espacio de cotización
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [briefId, setBriefId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [adj, setAdj] = useState<Adjust>(EMPTY_ADJUST);
  const [final, setFinal] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraHours, setExtraHours] = useState<Range>([4, 8]);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const q = useMemo(() => estimate(answers, adj, s), [answers, adj, s]);
  const price = typeof final === 'number' && final > 0 ? final : q.target;
  const text = useMemo(() => proposalText(answers, clientName, q, price, s.revision_rounds), [answers, clientName, q, price, s.revision_rounds]);
  const sections = useMemo(() => visibleSections(answers), [answers]);

  const load = useCallback(async () => {
    if (!supabase) { setDbReady(false); return; }
    const [st, bs, qs] = await Promise.all([
      supabase.from('quote_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('briefs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (st.error || bs.error || qs.error) { setDbReady(false); return; }
    setDbReady(true);
    if (st.data) {
      const n = (x: unknown, d: number) => (x == null ? d : Number(x));
      setS({
        floor_rate: n(st.data.floor_rate, 15), target_rate: n(st.data.target_rate, 22), high_rate: n(st.data.high_rate, 32),
        hours_per_week: n(st.data.hours_per_week, 15), min_project: n(st.data.min_project, 150),
        overhead_pct: n(st.data.overhead_pct, 15), qa_pct: n(st.data.qa_pct, 10), revision_rounds: n(st.data.revision_rounds, 2),
      });
    }
    setBriefs((bs.data ?? []) as Brief[]);
    setSaved((qs.data ?? []) as SavedQuote[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!presetLead) return;
    setNewName(presetLead.name); setNewEmail(presetLead.email); setNewLead(presetLead.id); setCreated(null);
  }, [presetLead]);

  const flash = (key: string) => { setCopiedKey(key); setTimeout(() => setCopiedKey(''), 1800); };

  const createBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase!.from('briefs')
      .insert({ client_name: newName.trim(), client_email: newEmail.trim(), lead_id: newLead || null })
      .select('*').single();
    if (error || !data) { setMsg('No se pudo crear el cuestionario. ¿Aplicaste la migración del cotizador?'); return; }
    setCreated(data as Brief);
    setNewName(''); setNewEmail(''); setNewLead('');
    load();
  };

  const startFromBrief = (b: Brief) => {
    setClientName(b.client_name); setBriefId(b.id); setLeadId(b.lead_id); setAnswers(b.answers ?? {});
    setAdj(EMPTY_ADJUST); setFinal(''); setEditingId(null); setOpen(true); setShowAnswers(false);
    setMsg(b.status === 'respondido' ? '' : 'Este cuestionario todavía no está terminado: la cotización puede cambiar cuando lo complete.');
    setTimeout(() => document.getElementById('cotizacion')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const startBlank = () => {
    setClientName(''); setBriefId(null); setLeadId(null); setAnswers({}); setAdj(EMPTY_ADJUST); setFinal('');
    setEditingId(null); setOpen(true); setShowAnswers(true); setMsg('');
    setTimeout(() => document.getElementById('cotizacion')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const openQuote = (x: SavedQuote) => {
    setClientName(x.client_name); setBriefId(x.brief_id); setLeadId(x.lead_id);
    setAnswers(x.answers?.answers ?? {}); setAdj({ ...EMPTY_ADJUST, ...(x.answers?.adjust ?? {}), clientType: (x.client_type as Adjust['clientType']) ?? 'pyme' });
    setFinal(x.final_price ?? ''); setEditingId(x.id); setOpen(true); setShowAnswers(false);
    setMsg(`Editando la cotización de ${x.client_name}.`);
    setTimeout(() => document.getElementById('cotizacion')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const toggleBlock = (id: string) => setAdj((p) => ({ ...p, off: p.off.includes(id) ? p.off.filter((x) => x !== id) : [...p.off, id] }));
  const setBlockHours = (id: string, r: Range) => setAdj((p) => ({ ...p, hours: { ...p.hours, [id]: r }, extras: p.extras.map((e) => (e.id === id ? { ...e, hours: r } : e)) }));
  const addExtra = () => {
    if (!extraLabel.trim()) return;
    setAdj((p) => ({ ...p, extras: [...p.extras, { id: `extra_${Date.now()}`, label: extraLabel.trim(), hours: extraHours }] }));
    setExtraLabel(''); setExtraHours([4, 8]);
  };
  const removeExtra = (id: string) => setAdj((p) => ({ ...p, extras: p.extras.filter((e) => e.id !== id) }));

  const saveQuote = async () => {
    if (!clientName.trim()) { setMsg('Poné el nombre del cliente para guardar.'); return; }
    const row = {
      brief_id: briefId, lead_id: leadId, client_name: clientName.trim(), client_type: adj.clientType,
      project_type: (answers.q3 as string[] | undefined)?.join(' / ') ?? '', answers: { answers, adjust: adj },
      hours_min: q.hours[0], hours_max: q.hours[1], price_floor: q.floor, price_target: q.target, price_high: q.high,
      final_price: typeof final === 'number' && final > 0 ? final : null,
    };
    const res = editingId ? await supabase!.from('quotes').update(row).eq('id', editingId) : await supabase!.from('quotes').insert(row).select('id').single();
    if (res.error) { setMsg('No se pudo guardar la cotización.'); return; }
    if (!editingId && 'data' in res && res.data) setEditingId((res.data as { id: string }).id);
    setMsg('Cotización guardada.');
    load();
  };
  const updateSaved = async (id: string, patch: Partial<SavedQuote>) => { await supabase!.from('quotes').update(patch).eq('id', id); load(); };
  const delSaved = async (id: string) => { await supabase!.from('quotes').delete().eq('id', id); setConfirmDel(null); load(); };
  const delBrief = async (id: string) => { await supabase!.from('briefs').delete().eq('id', id); setConfirmDel(null); load(); };
  const saveSettings = async () => {
    const { error } = await supabase!.from('quote_settings').upsert({ id: 1, ...s, updated_at: new Date().toISOString() });
    setMsg(error ? 'No se pudieron guardar las tarifas.' : 'Tarifas guardadas.');
  };

  const done = saved.filter((x) => x.actual_hours && x.actual_hours > 0);
  const calib = done.length ? done.reduce((acc, x) => acc + Number(x.actual_hours) / ((Number(x.hours_min) + Number(x.hours_max)) / 2), 0) / done.length : null;
  const span = Math.max(1, q.high - q.floor);
  const pos = (n: number) => `${Math.min(100, Math.max(0, ((n - q.floor) / span) * 100))}%`;
  const prog = progress(answers);
  const autoEntities = guessEntities(answers);

  return (
    <div className="quoter">
      {!dbReady && (
        <p className="form-note" role="alert">
          Faltan las tablas del cotizador en Supabase: ejecutá <code>supabase/migrations/20261016120000_quotes.sql</code> en el SQL Editor. Mientras tanto podés cotizar completando vos el cuestionario, pero no se guarda nada.
        </p>
      )}

      {/* ---------- Cuestionarios ---------- */}
      <section className="qr-briefs">
        <div className="qr-briefs-head">
          <div>
            <h2>Cuestionarios</h2>
            <p className="muted">Mandale el cuestionario al cliente después de que te contacte. Cuando lo responde, lo cotizás con un clic.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={startBlank}><ClipboardList size={16} /> Completarlo yo en una llamada</button>
        </div>

        <form className="form brief-new" onSubmit={createBrief}>
          <div className="field-row three">
            <label className="field"><span>Nombre del cliente</span><input id="bn-name" required value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={160} /></label>
            <label className="field"><span>Correo <em>(opcional)</em></span><input id="bn-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={200} /></label>
            {leads.length > 0 && (
              <label className="field"><span>Viene de una consulta <em>(opcional)</em></span>
                <select id="bn-lead" value={newLead} onChange={(e) => { const l = leads.find((x) => x.id === e.target.value); setNewLead(e.target.value); if (l) { setNewName(l.name); setNewEmail(l.email); } }}>
                  <option value="">— Ninguna —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.service}</option>)}
                </select>
              </label>
            )}
          </div>
          <button className="btn btn-hot" disabled={!dbReady}><Link2 size={16} /> Crear enlace del cuestionario</button>
        </form>

        {created && (
          <div className="brief-created" role="status">
            <p><b>Listo.</b> Mandale este mensaje a {created.client_name}:</p>
            <pre className="qr-text">{inviteText(created.client_name, created.token)}</pre>
            <div className="qr-actions">
              <button type="button" className="btn btn-hot sm" onClick={async () => { if (await copyText(inviteText(created.client_name, created.token))) flash('invite'); }}>
                {copiedKey === 'invite' ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar mensaje</>}
              </button>
              <a className="btn btn-ghost sm" href={`https://wa.me/?text=${encodeURIComponent(inviteText(created.client_name, created.token))}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Abrir WhatsApp</a>
              {created.client_email && (
                <a className="btn btn-ghost sm" href={`mailto:${created.client_email}?subject=${encodeURIComponent('Cuestionario para tu proyecto')}&body=${encodeURIComponent(inviteText(created.client_name, created.token))}`}><Mail size={14} /> Abrir correo</a>
              )}
              <button type="button" className="icon-btn sm" aria-label="Cerrar" onClick={() => setCreated(null)}><X size={14} /></button>
            </div>
          </div>
        )}

        {briefs.length > 0 && (
          <ul className="admin-list briefs-list">
            {briefs.map((b) => {
              const p = progress(b.answers ?? {});
              return (
                <li key={b.id} className={`brief-row st-${b.status}`}>
                  <div className="admin-list-main">
                    <b>{b.client_name || 'Sin nombre'}</b>
                    <span className="muted">{new Date(b.created_at).toLocaleDateString('es-UY')}{b.status !== 'enviado' ? ` · ${p.pct}% respondido` : ''}</span>
                  </div>
                  <span className={`pill ${b.status === 'respondido' ? 'ok' : ''}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
                  <button type="button" className="btn btn-ghost sm" onClick={async () => { if (await copyText(briefUrl(b.token))) flash(b.id); }}>
                    {copiedKey === b.id ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Enlace</>}
                  </button>
                  {b.status !== 'enviado' && <button type="button" className="btn btn-ghost sm" onClick={() => setViewing(viewing === b.id ? null : b.id)}>Respuestas</button>}
                  <button type="button" className="btn btn-hot sm" onClick={() => startFromBrief(b)}>Cotizar</button>
                  {confirmDel === b.id ? (
                    <span className="confirm">¿Borrar? <button className="btn btn-danger sm" onClick={() => delBrief(b.id)}>Sí</button><button className="btn btn-ghost sm" onClick={() => setConfirmDel(null)}>No</button></span>
                  ) : (
                    <button type="button" className="icon-btn sm" aria-label={`Borrar cuestionario de ${b.client_name}`} onClick={() => setConfirmDel(b.id)}><Trash2 size={14} /></button>
                  )}
                  {viewing === b.id && <pre className="qr-text brief-answers">{briefAsText(b.answers ?? {})}</pre>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Cotización ---------- */}
      {open && (
        <section id="cotizacion" className="qr-work">
          <div className="qr-work-head">
            <h2>Cotización</h2>
            <label className="field"><span>Cliente</span><input id="qt-client" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={160} /></label>
          </div>

          <div className="quoter-grid">
            <div className="qr-left">
              <div className="qr-card">
                <div className="qr-head"><h3>Bloques de trabajo</h3><span className="muted mono">{Math.round(q.dev[0])}–{Math.round(q.dev[1])} h</span></div>
                <p className="muted small">Salen de las respuestas. Apagá lo que no va, cambiá las horas o agregá lo que falte.</p>
                {autoEntities > 0 && (
                  <div className="ent-row">
                    <span>Tipos de información que maneja <small>(clientes, pedidos, productos…)</small></span>
                    <span className="hours-input">
                      <input type="number" min={0} max={40} value={adj.entities ?? autoEntities} onChange={(e) => setAdj((p) => ({ ...p, entities: Number(e.target.value) }))} aria-label="Tipos de información" />
                      {adj.entities != null && <button type="button" className="link" onClick={() => setAdj((p) => ({ ...p, entities: null }))}>auto</button>}
                    </span>
                  </div>
                )}
                <ul className="blocks">
                  {q.blocks.map((b) => {
                    const on = !adj.off.includes(b.id);
                    const isExtra = b.id.startsWith('extra_');
                    return (
                      <li key={b.id} className={on ? '' : 'off'}>
                        <button type="button" className={`toggle-box btn-box${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? `Quitar ${b.label}` : `Incluir ${b.label}`} onClick={() => toggleBlock(b.id)}>
                          {on && <Check size={13} strokeWidth={3} />}
                        </button>
                        <div className="block-main"><b>{b.label}</b><small>{b.why}</small></div>
                        <HoursInput value={b.hours} onChange={(r) => setBlockHours(b.id, r)} />
                        {isExtra && <button type="button" className="icon-btn sm" aria-label={`Quitar ${b.label}`} onClick={() => removeExtra(b.id)}><X size={14} /></button>}
                      </li>
                    );
                  })}
                </ul>
                <div className="extra-row">
                  <input id="qt-extra" placeholder="Agregar algo que no está (ej: integración con su sistema de caja)" value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }} />
                  <HoursInput value={extraHours} onChange={setExtraHours} />
                  <button type="button" className="btn btn-ghost sm" onClick={addExtra}><Plus size={14} /> Agregar</button>
                </div>
                <table className="qr-sums">
                  <tbody>
                    <tr><td>Desarrollo</td><td className="mono">{Math.round(q.dev[0])}–{Math.round(q.dev[1])} h</td></tr>
                    <tr><td>Reuniones y gestión ({s.overhead_pct}%)</td><td className="mono">{Math.round(q.overhead[0])}–{Math.round(q.overhead[1])} h</td></tr>
                    <tr><td>Pruebas y ajustes</td><td className="mono">{Math.round(q.qa[0])}–{Math.round(q.qa[1])} h</td></tr>
                    {q.risk[1] > 0.5 && <tr><td>Margen por lo que falta definir ({Math.round(q.unknownPct * 100)}% sin definir)</td><td className="mono">{Math.round(q.risk[0])}–{Math.round(q.risk[1])} h</td></tr>}
                    <tr className="total"><td>Total</td><td className="mono">{q.hours[0]}–{q.hours[1]} h</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="qr-card">
                <div className="qr-head">
                  <h3>Respuestas del cuestionario <span className="muted mono">· {prog.pct}%</span></h3>
                  <button type="button" className="btn btn-ghost sm" onClick={() => setShowAnswers((v) => !v)} aria-expanded={showAnswers}>
                    {showAnswers ? 'Ocultar' : 'Ver y editar'} <ChevronDown size={14} className={showAnswers ? 'rot' : ''} />
                  </button>
                </div>
                {!showAnswers && (
                  <p className="muted">
                    {prog.done === 0 ? 'Todavía no hay respuestas. Tocá "Ver y editar" para completarlo vos mientras hablás con el cliente.' :
                      `${prog.done} de ${prog.total} preguntas respondidas. Podés corregir o completar lo que haga falta: la cotización se recalcula sola.`}
                  </p>
                )}
                {showAnswers && <BriefForm sections={sections.length ? sections : SECTIONS.slice(0, 1)} answers={answers} onChange={setAnswers} />}
              </div>

            </div>

            <aside className="quoter-result" aria-live="polite">
              <div className="qr-card">
                <div className="chips">
                  {CLIENT_TYPES.map((t) => (
                    <button key={t.id} type="button" className={`chip${adj.clientType === t.id ? ' on' : ''}`} aria-pressed={adj.clientType === t.id} onClick={() => setAdj((p) => ({ ...p, clientType: t.id }))} title={t.hint}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="qr-prices">
                  <div className="qr-price floor"><span>Piso</span><b>{usd(q.floor)}</b><small>No bajes de acá</small></div>
                  <div className="qr-price target"><span>Recomendado</span><b>{usd(q.target)}</b><small>Precio justo</small></div>
                  <div className="qr-price high"><span>Techo</span><b>{usd(q.high)}</b><small>Si valora mucho</small></div>
                </div>
                <div className="qr-bar" aria-hidden="true">
                  <span className="qr-bar-fill" />
                  <i className="qr-mark target" style={{ left: pos(q.target) }} />
                  {price !== q.target && <i className="qr-mark mine" style={{ left: pos(price) }} />}
                </div>
                <dl className="qr-facts">
                  <div><dt>Horas</dt><dd className="mono">{q.hours[0]}–{q.hours[1]} h</dd></div>
                  <div><dt>Plazo a {s.hours_per_week} h/semana</dt><dd className="mono">{q.weeks[0] === q.weeks[1] ? q.weeks[0] : `${q.weeks[0]}–${q.weeks[1]}`} sem.</dd></div>
                  <div><dt>Te queda por hora</dt><dd className="mono">{usd(price / Math.max(1, q.hoursMid))}</dd></div>
                  {q.monthly && <div><dt>Mantenimiento</dt><dd className="mono">{usd(q.monthly)}/mes</dd></div>}
                  {q.budget && <div className="wide"><dt>Presupuesto del cliente</dt><dd>{q.budget}</dd></div>}
                </dl>
                <label className="field">
                  <span>Precio que vas a pasar</span>
                  <input id="qt-final" type="number" min={0} step={10} placeholder={String(q.target)} value={final} onChange={(e) => setFinal(e.target.value === '' ? '' : Number(e.target.value))} />
                  {typeof final === 'number' && final > 0 && final < q.floor && <small className="warn">Está por debajo del piso: cobrarías menos de {usd(s.floor_rate)} la hora.</small>}
                </label>
                {q.warnings.length > 0 && <ul className="qr-warnings">{q.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
              </div>

              <div className="qr-card">
                <div className="qr-head"><h3>Propuesta para el cliente</h3>
                  <button type="button" className="btn btn-ghost sm" onClick={async () => { if (await copyText(text)) flash('prop'); }}>{copiedKey === 'prop' ? <><Check size={14} /> Copiada</> : <><Copy size={14} /> Copiar</>}</button>
                </div>
                <pre className="qr-text">{text}</pre>
              </div>

              <div className="qr-actions">
                <button type="button" className="btn btn-hot" onClick={saveQuote} disabled={!dbReady}><Save size={16} /> {editingId ? 'Actualizar cotización' : 'Guardar cotización'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}><RotateCcw size={16} /> Cerrar</button>
              </div>
              {msg && <p className="muted qr-msg" role="status">{msg}</p>}
            </aside>
          </div>
        </section>
      )}

      {/* ---------- Tarifas ---------- */}
      <section className="qr-settings">
        <button type="button" className="link" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}><Settings2 size={16} /> Mis tarifas y supuestos</button>
        {showSettings && (
          <div className="form qr-settings-form">
            <p className="muted">Referencia en Uruguay: un freelance cobra entre USD 25 y 45 la hora según experiencia. Empezá abajo para ganar clientes y subí a medida que sumes proyectos.</p>
            <div className="settings-grid">
              {([
                ['floor_rate', 'Piso (USD/hora)', 'Lo mínimo que aceptás por tu hora'],
                ['target_rate', 'Objetivo (USD/hora)', 'Lo que querés ganar normalmente'],
                ['high_rate', 'Alto (USD/hora)', 'Para clientes que valoran mucho'],
                ['min_project', 'Mínimo por proyecto (USD)', 'Ningún trabajo por menos de esto'],
                ['hours_per_week', 'Horas por semana disponibles', 'Para calcular el plazo'],
                ['overhead_pct', 'Reuniones y gestión (%)', 'Charlas, mails, coordinación'],
                ['qa_pct', 'Pruebas y ajustes (%)', 'Probar, corregir, publicar'],
                ['revision_rounds', 'Rondas de ajustes por etapa', 'Incluidas en el precio; después, adicional'],
              ] as [keyof Settings, string, string][]).map(([k, label, hint]) => (
                <label key={k} className="field"><span>{label}</span>
                  <input id={`qs-${k}`} type="number" min={0} step={1} value={s[k]} onChange={(e) => setS((p) => ({ ...p, [k]: Number(e.target.value) || 0 }))} />
                  <small>{hint}</small>
                </label>
              ))}
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setS(DEFAULT_SETTINGS)}>Valores sugeridos</button>
              <button type="button" className="btn btn-hot" onClick={saveSettings} disabled={!dbReady}>Guardar tarifas</button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Historial ---------- */}
      <section className="qr-history">
        <h2>Cotizaciones guardadas</h2>
        {calib && (
          <p className="calib">
            En los proyectos terminados, las horas reales fueron <b>{Math.round(calib * 100)}%</b> de lo estimado.
            {calib > 1.1 ? ' Estás subestimando: subí el % de gestión o las horas de los bloques.' : calib < 0.9 ? ' Estás sobreestimando: podés ser más competitivo.' : ' Tus estimaciones van bien.'}
          </p>
        )}
        {saved.length === 0 ? (
          <p className="muted">Todavía no guardaste cotizaciones. Cuando termines un proyecto, cargá las horas reales: así ves si estás estimando bien.</p>
        ) : (
          <ul className="admin-list quotes-list">
            {saved.map((x) => (
              <li key={x.id}>
                <div className="admin-list-main">
                  <b>{x.client_name}</b>
                  <span className="muted">{new Date(x.created_at).toLocaleDateString('es-UY')} · {Math.round(x.hours_min)}–{Math.round(x.hours_max)} h</span>
                </div>
                <span className="mono">{usd(x.final_price ?? x.price_target)}</span>
                <select aria-label="Estado" value={x.status} onChange={(e) => updateSaved(x.id, { status: e.target.value })}>
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
                <label className="inline-num" title="Horas que te llevó de verdad">
                  Horas reales
                  <input type="number" min={0} defaultValue={x.actual_hours ?? ''} onBlur={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    if (v !== x.actual_hours) updateSaved(x.id, { actual_hours: v });
                  }} />
                </label>
                <button type="button" className="btn btn-ghost sm" onClick={() => openQuote(x)}>Abrir</button>
                {confirmDel === x.id ? (
                  <span className="confirm">¿Borrar? <button className="btn btn-danger sm" onClick={() => delSaved(x.id)}>Sí</button><button className="btn btn-ghost sm" onClick={() => setConfirmDel(null)}>No</button></span>
                ) : (
                  <button type="button" className="icon-btn" aria-label={`Borrar cotización de ${x.client_name}`} onClick={() => setConfirmDel(x.id)}><Trash2 size={16} /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
