import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CloudOff, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { progress, visibleSections, type BriefAnswers } from '../lib/brief';
import { BriefForm } from '../components/BriefForm';
import { Logo } from '../components/Logo';
import { BRAND } from '../lib/brand';

type State = 'loading' | 'notfound' | 'intro' | 'form' | 'done';

export default function BriefPage() {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>('loading');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [sending, setSending] = useState(false);
  const dirty = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => visibleSections(answers), [answers]);
  const prog = progress(answers);
  const last = step >= sections.length - 1;

  useEffect(() => {
    document.title = 'Cuestionario · JD Soluciones';
    if (!supabase) { setState('notfound'); return; }
    supabase.rpc('get_brief', { p_token: token }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) { setState('notfound'); return; }
      setName(row.client_name ?? '');
      setAnswers((row.answers as BriefAnswers) ?? {});
      setState(row.status === 'respondido' ? 'done' : 'intro');
    });
  }, [token]);

  // Guardado automático mientras completa
  useEffect(() => {
    if (state !== 'form' || !dirty.current) return;
    setSaving('saving');
    const t = setTimeout(async () => {
      const { error } = await supabase!.rpc('save_brief', { p_token: token, p_answers: answers, p_submit: false });
      setSaving(error ? 'error' : 'saved');
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, state, token]);

  // Si una respuesta oculta secciones, que el paso no quede fuera de rango
  useEffect(() => { if (step > sections.length - 1) setStep(Math.max(0, sections.length - 1)); }, [sections.length, step]);

  const change = (next: BriefAnswers) => { dirty.current = true; setAnswers(next); };
  const go = (n: number) => { setStep(n); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const submit = async () => {
    setSending(true);
    const { error } = await supabase!.rpc('save_brief', { p_token: token, p_answers: answers, p_submit: true });
    setSending(false);
    if (error) setSaving('error');
    else { setState('done'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const first = name.split(' ')[0];

  return (
    <div className="brief" ref={top}>
      <header className="brief-bar">
        <Logo compact />
        {state === 'form' && (
          <span className={`brief-save mono ${saving}`} role="status">
            {saving === 'saving' && 'Guardando…'}
            {saving === 'saved' && <><Check size={14} /> Guardado</>}
            {saving === 'error' && <><CloudOff size={14} /> No se pudo guardar, se reintenta al seguir</>}
          </span>
        )}
      </header>

      <main className="brief-main">
        {state === 'loading' && <p className="muted">Cargando…</p>}

        {state === 'notfound' && (
          <div className="brief-card">
            <h1>No encontramos este cuestionario</h1>
            <p className="lead">Puede que el enlace esté incompleto. Escríbenos a <span className="mono select">{BRAND.email}</span> y te mandamos uno nuevo.</p>
          </div>
        )}

        {state === 'intro' && (
          <div className="brief-card brief-intro">
            <p className="eyebrow"><span className="dot" /> Cuestionario del proyecto</p>
            <h1>{first ? `Hola ${first}, cuéntanos tu idea` : 'Cuéntanos tu idea'}</h1>
            <p className="lead"><b>Objetivo:</b> conocer tu idea, entender qué necesitas y preparar una propuesta económica adaptada a tu negocio.</p>
            <p>No necesitas tener conocimientos de informática ni saber exactamente cómo debería funcionar todo. Lo importante es que nos expliques qué quieres conseguir, cómo trabajas actualmente y qué te gustaría mejorar.</p>
            <p>Si alguna pregunta no la tienes clara, puedes dejarla sin responder. Te ayudaremos a definirla durante la conversación.</p>
            <ul className="brief-perks">
              <li>Las preguntas se adaptan a lo que vas respondiendo.</li>
              <li>Se guarda solo: puedes dejarlo y seguir después con el mismo enlace.</li>
              <li>Lleva entre 10 y 20 minutos.</li>
            </ul>
            <button className="btn btn-hot btn-lg" onClick={() => setState('form')}>
              {Object.keys(answers).length ? 'Seguir completando' : 'Empezar'} <ArrowRight size={18} />
            </button>
          </div>
        )}

        {state === 'form' && sections[step] && (
          <>
            <div className="brief-progress" aria-label={`Paso ${step + 1} de ${sections.length}`}>
              <div className="brief-steps">
                {sections.map((s, i) => (
                  <button key={s.id} type="button" className={`brief-step${i === step ? ' on' : ''}${i < step ? ' done' : ''}`} onClick={() => go(i)} aria-label={`Ir a ${s.title}`} title={s.title} />
                ))}
              </div>
              <span className="mono muted">{step + 1}/{sections.length} · {prog.pct}% respondido</span>
            </div>

            <div className="brief-card" key={sections[step].id}>
              <BriefForm sections={[sections[step]]} answers={answers} onChange={change} />
            </div>

            <nav className="brief-nav">
              <button className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Anterior</button>
              {last ? (
                <button className="btn btn-hot btn-lg" onClick={submit} disabled={sending}>{sending ? 'Enviando…' : <>Enviar respuestas <Send size={17} /></>}</button>
              ) : (
                <button className="btn btn-hot" onClick={() => go(step + 1)}>Siguiente <ArrowRight size={16} /></button>
              )}
            </nav>
          </>
        )}

        {state === 'done' && (
          <div className="brief-card brief-done">
            <span className="form-done-icon"><Check size={28} /></span>
            <h1>¡Gracias{first ? `, ${first}` : ''}!</h1>
            <p className="lead">Con esta información podremos analizar tus necesidades, aclarar los puntos pendientes y preparar una propuesta con el alcance, los plazos y el presupuesto estimado.</p>
            <p className="muted">Te vamos a escribir a la brevedad. Si tienes archivos o fotos para compartir, envíalos a <span className="mono select">{BRAND.email}</span>.</p>
          </div>
        )}
      </main>
    </div>
  );
}
