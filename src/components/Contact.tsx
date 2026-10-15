import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, Send } from 'lucide-react';
import { BRAND, whatsappUrl } from '../lib/brand';
import { sendLead, SERVICE_OPTIONS, type LeadInput } from '../lib/leads';

const EMPTY: LeadInput = { name: '', email: '', phone: '', service: SERVICE_OPTIONS[0], message: '' };

export function Contact() {
  const [f, setF] = useState<LeadInput>(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'fallback'>('idle');
  const [copied, setCopied] = useState(false);
  const wa = whatsappUrl();

  const set = (k: keyof LeadInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const mailto = `mailto:${BRAND.email}?subject=${encodeURIComponent(`Consulta: ${f.service}`)}&body=${encodeURIComponent(
    `Hola, soy ${f.name}.\n\n${f.message}\n\nMi correo: ${f.email}${f.phone ? `\nMi teléfono: ${f.phone}` : ''}`,
  )}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    const ok = await sendLead(f).catch(() => false);
    if (ok) { setState('sent'); setF(EMPTY); }
    else setState('fallback');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(BRAND.email); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* el correo queda visible para copiar a mano */ }
  };

  return (
    <section className="section contact" id="contacto">
      <div className="container contact-grid">
        <div className="contact-copy reveal">
          <p className="eyebrow"><span className="dot" /> Contacto</p>
          <h2>Contame tu proyecto</h2>
          <p className="lead">Escribime qué necesitás, aunque sea una idea suelta. Te respondo con una propuesta o con las preguntas para armarla.</p>
          <div className="contact-ways">
            <div className="contact-way">
              <Mail size={18} />
              <span className="mono select">{BRAND.email}</span>
              <button type="button" className="icon-btn sm" onClick={copy} aria-label="Copiar correo">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {wa && (
              <a className="contact-way" href={wa} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> <span>Escribime por WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        <form className="form reveal" onSubmit={submit} style={{ ['--d' as string]: '120ms' }}>
          {state === 'sent' ? (
            <div className="form-done" role="status">
              <span className="form-done-icon"><Check size={26} /></span>
              <h3>¡Recibí tu consulta!</h3>
              <p>Te escribo a la brevedad al correo que dejaste.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setState('idle')}>Enviar otra consulta</button>
            </div>
          ) : (
            <>
              <div className="field-row">
                <label className="field">
                  <span>Nombre</span>
                  <input id="lead-name" required value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} />
                </label>
                <label className="field">
                  <span>Correo</span>
                  <input id="lead-email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" maxLength={200} />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Teléfono <em>(opcional)</em></span>
                  <input id="lead-phone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} />
                </label>
                <label className="field">
                  <span>¿Qué necesitás?</span>
                  <select id="lead-service" value={f.service} onChange={set('service')}>
                    {SERVICE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Contame un poco</span>
                <textarea id="lead-message" required rows={5} value={f.message} onChange={set('message')} maxLength={4000}
                  placeholder="Ej: tengo una ferretería y quiero que mis clientes puedan ver el catálogo y pedir por WhatsApp." />
              </label>
              {state === 'fallback' && (
                <p className="form-note" role="alert">
                  No pude guardar tu consulta desde acá. Mandámela por correo con este botón, ya va con tu mensaje: <a href={mailto}>enviar por correo</a>.
                </p>
              )}
              <button className="btn btn-hot btn-lg" type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? 'Enviando…' : <>Enviar consulta <Send size={17} /></>}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
