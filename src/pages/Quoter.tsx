import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Plus, RotateCcw, Save, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  CLARITY, CLIENT_TYPES, DEFAULT_SETTINGS, EMPTY_ANSWERS, FEATURES, INTEGRATIONS, OPTIONS, PROJECT_TYPES, URGENCY,
  detect, estimate, proposalText, type Answers, type Settings, type Suggestion,
} from '../lib/quote';

type LeadLite = { id: string; name: string; service: string; message: string };
type SavedQuote = {
  id: string; lead_id: string | null; client_name: string; project_type: string; answers: Answers;
  hours_min: number; hours_max: number; price_floor: number; price_target: number; price_high: number;
  final_price: number | null; status: string; actual_hours: number | null; created_at: string;
};

const usd = (n: number) => `USD ${Math.round(n).toLocaleString('es-UY')}`;
const SERVICE_TO_TYPE: Record<string, Answers['projectType']> = {
  'Página web': 'institucional', 'App a medida': 'app', Dashboard: 'dashboard', Integración: 'integracion', Soporte: 'soporte',
};

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`chip${value === o.id ? ' on' : ''}`} onClick={() => onChange(o.id)} title={o.hint}>
          {o.label}
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

function Toggles({ value, options, onChange }: { value: string[]; options: { id: string; label: string; ask?: string }[]; onChange: (v: string[]) => void }) {
  return (
    <div className="toggles">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" aria-pressed={on} className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}>
            <span className="toggle-box">{on && <Check size={13} strokeWidth={3} />}</span>
            <span className="toggle-text">{o.ask ?? o.label}{o.ask && <small>{o.label}</small>}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ id, value, onChange, min = 0, max = 60 }: { id: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Menos">−</button>
      <input id={id} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Más">+</button>
    </div>
  );
}

function Q({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="q">
      <h3><span className="q-n mono">{n}</span>{title}</h3>
      {children}
    </section>
  );
}

export default function Quoter({ leads }: { leads: LeadLite[] }) {
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS);
  const [leadId, setLeadId] = useState<string>('');
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [final, setFinal] = useState<number | ''>('');
  const [saved, setSaved] = useState<SavedQuote[]>([]);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(true);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => { if (k === 'projectType') setDismissedType(true); setA((p) => ({ ...p, [k]: v })); };
  const q = useMemo(() => estimate(a, s), [a, s]);
  const price = typeof final === 'number' && final > 0 ? final : q.target;
  const text = useMemo(() => proposalText(a, q, price), [a, q, price]);
  const type = PROJECT_TYPES.find((t) => t.id === a.projectType)!;

  const [dismissedType, setDismissedType] = useState(false);
  const suggestions = useMemo(() => detect(a.notes), [a.notes]);
  const pending = suggestions.filter((sg) =>
    sg.kind === 'feature' ? !a.features.includes(sg.id) && !FEATURES.find((f) => f.id === sg.id)?.skipFor?.includes(a.projectType)
    : sg.kind === 'integration' ? !a.integrations.includes(sg.id)
    : !dismissedType && sg.id !== a.projectType);
  const apply = (list: Suggestion[]) => {
    setA((p) => {
      const n = { ...p, features: [...p.features], integrations: [...p.integrations] };
      for (const sg of list) {
        if (sg.kind === 'feature' && !n.features.includes(sg.id)) n.features.push(sg.id);
        if (sg.kind === 'integration' && !n.integrations.includes(sg.id)) n.integrations.push(sg.id);
        if (sg.kind === 'type') n.projectType = sg.id as Answers['projectType'];
      }
      return n;
    });
    if (list.some((sg) => sg.kind === 'type')) setDismissedType(true);
  };

  const load = useCallback(async () => {
    if (!supabase) { setDbReady(false); return; }
    const [st, qs] = await Promise.all([
      supabase!.from('quote_settings').select('*').eq('id', 1).maybeSingle(),
      supabase!.from('quotes').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (st.error || qs.error) { setDbReady(false); return; }
    setDbReady(true);
    if (st.data) {
      const n = (x: unknown, d: number) => (x == null ? d : Number(x));
      setS({
        floor_rate: n(st.data.floor_rate, 15), target_rate: n(st.data.target_rate, 22), high_rate: n(st.data.high_rate, 32),
        hours_per_week: n(st.data.hours_per_week, 15), min_project: n(st.data.min_project, 150),
        overhead_pct: n(st.data.overhead_pct, 15), qa_pct: n(st.data.qa_pct, 10),
      });
    }
    setSaved((qs.data ?? []) as SavedQuote[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pickLead = (id: string) => {
    setLeadId(id);
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    setA((p) => ({ ...p, clientName: l.name, projectType: SERVICE_TO_TYPE[l.service] ?? p.projectType, notes: p.notes || l.message }));
  };

  const saveSettings = async () => {
    const { error } = await supabase!.from('quote_settings').upsert({ id: 1, ...s, updated_at: new Date().toISOString() });
    setMsg(error ? 'No se pudieron guardar las tarifas. ¿Aplicaste la migración de cotizaciones?' : 'Tarifas guardadas.');
  };

  const saveQuote = async () => {
    if (!a.clientName.trim()) { setMsg('Poné el nombre del cliente para guardar la cotización.'); return; }
    const row = {
      lead_id: leadId || null, client_name: a.clientName.trim(), client_type: a.clientType, project_type: a.projectType, answers: a,
      hours_min: q.hours[0], hours_max: q.hours[1], price_floor: q.floor, price_target: q.target, price_high: q.high,
      final_price: typeof final === 'number' && final > 0 ? final : null,
    };
    const res = editingId ? await supabase!.from('quotes').update(row).eq('id', editingId) : await supabase!.from('quotes').insert(row);
    if (res.error) setMsg('No se pudo guardar. ¿Aplicaste la migración de cotizaciones?');
    else { setMsg(editingId ? 'Cotización actualizada.' : 'Cotización guardada.'); load(); }
  };

  const openQuote = (x: SavedQuote) => {
    setA({ ...EMPTY_ANSWERS, ...x.answers });
    setLeadId(x.lead_id ?? '');
    setFinal(x.final_price ?? '');
    setEditingId(x.id);
    setMsg(`Editando la cotización de ${x.client_name}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => { setDismissedType(false); setA(EMPTY_ANSWERS); setLeadId(''); setFinal(''); setEditingId(null); setMsg(''); };
  const updateSaved = async (id: string, patch: Partial<SavedQuote>) => { await supabase!.from('quotes').update(patch).eq('id', id); load(); };
  const delSaved = async (id: string) => { await supabase!.from('quotes').delete().eq('id', id); setConfirmDel(null); if (editingId === id) reset(); load(); };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* el texto queda visible para copiar a mano */ }
  };

  // Calibración: cuánto se desvían tus estimaciones de las horas reales
  const done = saved.filter((x) => x.actual_hours && x.actual_hours > 0);
  const calib = done.length
    ? done.reduce((acc, x) => acc + Number(x.actual_hours) / ((Number(x.hours_min) + Number(x.hours_max)) / 2), 0) / done.length
    : null;
  const realRate = saved.filter((x) => x.status === 'aceptada' && x.actual_hours && x.final_price);

  let qn = 0;
  const next = () => ++qn;

  // Posición del precio elegido dentro del rango, para la barra
  const span = Math.max(1, q.high - q.floor);
  const pos = (n: number) => `${Math.min(100, Math.max(0, ((n - q.floor) / span) * 100))}%`;

  return (
    <div className="quoter">
      {!dbReady && (
        <p className="form-note" role="alert">
          Falta crear las tablas del cotizador en Supabase (archivo <code>supabase/migrations/20261016120000_quotes.sql</code>). Igual podés cotizar; guardar se habilita cuando estén.
        </p>
      )}

      <div className="quoter-grid">
        {/* ---------- Encuesta ---------- */}
        <form className="quoter-form" onSubmit={(e) => e.preventDefault()}>
          <Q n={next()} title="Contame qué necesita, con sus palabras">
            <textarea id="qt-notes" rows={5} value={a.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Escribí lo que te cuenta el cliente tal cual. Ej: «Tengo una peluquería y quiero que las clientas saquen turno solas y les llegue un recordatorio por WhatsApp. También quiero cobrar una seña.»" />
            {pending.length > 0 && (
              <div className="detect">
                <p><Sparkles size={15} /> Por lo que cuenta, parece que necesita:</p>
                <div className="detect-chips">
                  {pending.map((sg) => (
                    <button key={sg.kind + sg.id} type="button" className="detect-chip" onClick={() => apply([sg])} title={`Porque ${sg.why}`}>
                      <Plus size={13} /> {sg.kind === 'type' ? `Tipo: ${sg.label}` : sg.label}<small>{sg.why}</small>
                    </button>
                  ))}
                </div>
                {pending.length > 1 && <button type="button" className="link" onClick={() => apply(pending)}>Agregar todo</button>}
              </div>
            )}
          </Q>

          <Q n={next()} title="Cliente">
            <div className="field-row">
              <label className="field"><span>Nombre o negocio</span>
                <input id="qt-name" value={a.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Ej: Ferretería López" />
              </label>
              {leads.length > 0 && (
                <label className="field"><span>Viene de una consulta <em>(opcional)</em></span>
                  <select id="qt-lead" value={leadId} onChange={(e) => pickLead(e.target.value)}>
                    <option value="">— Ninguna —</option>
                    {leads.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.service}</option>)}
                  </select>
                </label>
              )}
            </div>
            <Chips value={a.clientType} options={CLIENT_TYPES} onChange={(v) => set('clientType', v)} />
          </Q>

          <Q n={next()} title="¿Qué quiere lograr?">
            <Chips value={a.projectType} options={PROJECT_TYPES.map((t) => ({ id: t.id, label: t.ask, hint: t.label }))} onChange={(v) => set('projectType', v)} />
          </Q>

          {(type.includedPages > 0 || type.includedModules > 0) && (
            <Q n={next()} title="¿Qué tan grande es?">
              <div className="field-row">
                {type.includedPages > 0 && (
                  <div className="field"><span>¿Cuántas secciones o páginas?</span>
                    <Stepper id="qt-pages" value={a.pages} min={1} onChange={(n) => set('pages', n)} />
                    <small>Incluye {type.includedPages}. Cada una extra suma horas.</small>
                  </div>
                )}
                {type.includedModules > 0 && (
                  <div className="field"><span>{a.projectType === 'dashboard' ? '¿De cuántos lugares salen sus números?' : '¿Cuántas cosas distintas quiere organizar?'}</span>
                    <Stepper id="qt-modules" value={a.modules} min={1} onChange={(n) => set('modules', n)} />
                    <small>{a.projectType === 'dashboard' ? 'Ej: publicidad en Instagram, Google, ventas del local.' : 'Ej: clientes, turnos, stock, cobros.'} Incluye {type.includedModules}.</small>
                  </div>
                )}
              </div>
            </Q>
          )}

          <Q n={next()} title="¿Qué tiene que poder hacer?">
            <Toggles value={a.features} options={FEATURES.filter((f) => !f.skipFor?.includes(a.projectType))} onChange={(v) => set('features', v)} />
          </Q>

          <Q n={next()} title="¿Tiene que conectarse con algo que ya usa?">
            <Toggles value={a.integrations} options={INTEGRATIONS} onChange={(v) => set('integrations', v)} />
          </Q>

          <Q n={next()} title="Lo que ya tiene">
            <div className="q-sub"><span>Logo y estilo</span>
              <Chips value={a.design} options={Object.entries(OPTIONS.DESIGN).map(([id, o]) => ({ id: id as Answers['design'], label: o.label }))} onChange={(v) => set('design', v)} />
            </div>
            <div className="q-sub"><span>Textos y fotos</span>
              <Chips value={a.content} options={Object.entries(OPTIONS.CONTENT).map(([id, o]) => ({ id: id as Answers['content'], label: o.label }))} onChange={(v) => set('content', v)} />
            </div>
            <div className="q-sub"><span>Información que ya tiene (clientes, productos…)</span>
              <Chips value={a.migration} options={Object.entries(OPTIONS.MIGRATION).map(([id, o]) => ({ id: id as Answers['migration'], label: o.label }))} onChange={(v) => set('migration', v)} />
            </div>
          </Q>

          <Q n={next()} title="Tiempos">
            <div className="q-sub"><span>¿Para cuándo lo necesita?</span>
              <Chips value={a.urgency} options={Object.entries(URGENCY).map(([id, o]) => ({ id: id as Answers['urgency'], label: o.label }))} onChange={(v) => set('urgency', v)} />
            </div>
            <div className="q-sub"><span>¿Qué tan claro lo tiene él?</span>
              <Chips value={a.clarity} options={Object.entries(CLARITY).map(([id, o]) => ({ id: id as Answers['clarity'], label: o.label }))} onChange={(v) => set('clarity', v)} />
            </div>
            <Toggles value={a.support ? ['s'] : []} options={[{ id: 's', label: 'Va a querer que yo lo mantenga después' }]} onChange={(v) => set('support', v.length > 0)} />
          </Q>

        </form>

        {/* ---------- Resultado ---------- */}
        <aside className="quoter-result" aria-live="polite">
          <div className="qr-card">
            <p className="eyebrow"><span className="dot" /> Rango sugerido</p>
            <div className="qr-prices">
              <div className="qr-price floor"><span>Piso</span><b>{usd(q.floor)}</b><small>No bajes de acá</small></div>
              <div className="qr-price target"><span>Recomendado</span><b>{usd(q.target)}</b><small>Precio justo</small></div>
              <div className="qr-price high"><span>Techo</span><b>{usd(q.high)}</b><small>Si el cliente valora mucho</small></div>
            </div>
            <div className="qr-bar" aria-hidden="true">
              <span className="qr-bar-fill" />
              <i className="qr-mark target" style={{ left: pos(q.target) }} />
              {price !== q.target && <i className="qr-mark mine" style={{ left: pos(price) }} />}
            </div>
            <dl className="qr-facts">
              <div><dt>Horas estimadas</dt><dd className="mono">{q.hours[0]}–{q.hours[1]} h</dd></div>
              <div><dt>Plazo a {s.hours_per_week} h/semana</dt><dd className="mono">{q.weeks[0] === q.weeks[1] ? q.weeks[0] : `${q.weeks[0]}–${q.weeks[1]}`} sem.</dd></div>
              <div><dt>Te queda por hora</dt><dd className="mono">{usd(price / Math.max(1, q.hoursMid))}</dd></div>
              {q.monthly && <div><dt>Mantenimiento</dt><dd className="mono">{usd(q.monthly)}/mes</dd></div>}
            </dl>

            <label className="field">
              <span>Precio que vas a pasar</span>
              <input id="qt-final" type="number" min={0} step={10} placeholder={String(q.target)} value={final} onChange={(e) => setFinal(e.target.value === '' ? '' : Number(e.target.value))} />
              {typeof final === 'number' && final > 0 && final < q.floor && <small className="warn">Está por debajo del piso: estarías cobrando menos de {usd(s.floor_rate)} la hora.</small>}
            </label>

            {q.warnings.length > 0 && <ul className="qr-warnings">{q.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}

            <details className="qr-detail">
              <summary>Ver de dónde salen las horas <ChevronDown size={16} /></summary>
              <table>
                <tbody>
                  {q.lines.map((l) => (
                    <tr key={l.label}><td>{l.label}</td><td className="mono">{Math.round(l.hours[0])}–{Math.round(l.hours[1])} h</td></tr>
                  ))}
                  <tr className="total"><td>Total</td><td className="mono">{q.hours[0]}–{q.hours[1]} h</td></tr>
                </tbody>
              </table>
            </details>
          </div>

          <div className="qr-card">
            <div className="qr-head"><h3>Propuesta para el cliente</h3>
              <button type="button" className="btn btn-ghost sm" onClick={copy}>{copied ? <><Check size={14} /> Copiada</> : <><Copy size={14} /> Copiar</>}</button>
            </div>
            <pre className="qr-text">{text}</pre>
          </div>

          <div className="qr-actions">
            <button type="button" className="btn btn-hot" onClick={saveQuote} disabled={!dbReady}><Save size={16} /> {editingId ? 'Actualizar cotización' : 'Guardar cotización'}</button>
            <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={16} /> Nueva</button>
          </div>
          {msg && <p className="muted qr-msg" role="status">{msg}</p>}
        </aside>
      </div>

      {/* ---------- Tarifas ---------- */}
      <section className="qr-settings">
        <button type="button" className="link" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
          <Settings2 size={16} /> Mis tarifas y supuestos
        </button>
        {showSettings && (
          <div className="form qr-settings-form">
            <p className="muted">Referencia en Uruguay: un freelance cobra entre USD 25 y 45 la hora según experiencia. Empezá abajo para ganar clientes y subí a medida que sumes proyectos al portafolio.</p>
            <div className="settings-grid">
              {([
                ['floor_rate', 'Piso (USD/hora)', 'Lo mínimo que aceptás por tu hora'],
                ['target_rate', 'Objetivo (USD/hora)', 'Lo que querés ganar normalmente'],
                ['high_rate', 'Alto (USD/hora)', 'Para clientes que valoran mucho'],
                ['min_project', 'Mínimo por proyecto (USD)', 'Ningún trabajo por menos de esto'],
                ['hours_per_week', 'Horas por semana disponibles', 'Para calcular el plazo'],
                ['overhead_pct', 'Reuniones y gestión (%)', 'Charlas, mails, coordinación'],
                ['qa_pct', 'Pruebas y ajustes (%)', 'Probar, corregir, publicar'],
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
            {calib > 1.1 ? ' Estás subestimando: subí el % de gestión o las horas base.' : calib < 0.9 ? ' Estás sobreestimando: podés ser más competitivo.' : ' Tus estimaciones van bien.'}
            {realRate.length > 0 && ` Ganaste en promedio ${usd(realRate.reduce((acc, x) => acc + Number(x.final_price) / Number(x.actual_hours), 0) / realRate.length)} por hora real.`}
          </p>
        )}
        {saved.length === 0 ? (
          <p className="muted">Todavía no guardaste cotizaciones. Cuando cierres un proyecto, cargá las horas reales: así el cotizador te muestra si estás estimando bien.</p>
        ) : (
          <ul className="admin-list quotes-list">
            {saved.map((x) => (
              <li key={x.id}>
                <div className="admin-list-main">
                  <b>{x.client_name}</b>
                  <span className="muted">{PROJECT_TYPES.find((t) => t.id === x.project_type)?.label} · {new Date(x.created_at).toLocaleDateString('es-UY')} · {Math.round(x.hours_min)}–{Math.round(x.hours_max)} h</span>
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

