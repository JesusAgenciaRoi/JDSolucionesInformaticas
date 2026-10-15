import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { NetworkCanvas } from './NetworkCanvas';

const WORDS = ['páginas web', 'apps a medida', 'dashboards', 'integraciones', 'soporte técnico'];

/** Palabra que se borra y se vuelve a escribir, como en una terminal. */
function TypedWord() {
  const [i, setI] = useState(0);
  const [text, setText] = useState(WORDS[0]);
  const [phase, setPhase] = useState<'hold' | 'erase' | 'type'>('hold');

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = setInterval(() => setI((n) => { const next = (n + 1) % WORDS.length; setText(WORDS[next]); return next; }), 2600);
      return () => clearInterval(id);
    }
    let t: number;
    if (phase === 'hold') t = window.setTimeout(() => setPhase('erase'), 2000);
    else if (phase === 'erase') {
      if (text.length) t = window.setTimeout(() => setText((s) => s.slice(0, -1)), 35);
      else { setI((n) => (n + 1) % WORDS.length); setPhase('type'); }
    } else {
      const target = WORDS[i];
      if (text.length < target.length) t = window.setTimeout(() => setText(target.slice(0, text.length + 1)), 55 + Math.random() * 40);
      else setPhase('hold');
    }
    return () => clearTimeout(t);
  }, [phase, text, i]);

  return (
    <span className="typed" aria-hidden="true">
      {text}
      <span className="typed-caret" />
    </span>
  );
}

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <NetworkCanvas />
      <div className="hero-fade" aria-hidden="true" />
      <div className="container hero-inner">
        <p className="eyebrow hero-in" style={{ ['--d' as string]: '0ms' }}>
          <span className="dot" /> Desarrollo de software · Uruguay
        </p>
        <h1 className="hero-title hero-in" style={{ ['--d' as string]: '120ms' }}>
          Conecto tu negocio con la tecnología que necesita.
        </h1>
        <p className="hero-sub hero-in" style={{ ['--d' as string]: '240ms' }}>
          <span className="sr-only">Hago páginas web, apps a medida, dashboards, integraciones y soporte.</span>
          <span aria-hidden="true">Hago </span>
          <TypedWord />
          <br aria-hidden="true" />
          <span className="hero-sub-rest">Software claro y rápido, pensado para que tu negocio venda y trabaje mejor.</span>
        </p>
        <div className="hero-ctas hero-in" style={{ ['--d' as string]: '360ms' }}>
          <a className="btn btn-hot btn-lg" href="#contacto">
            Contame tu proyecto <ArrowRight size={18} />
          </a>
          <a className="btn btn-ghost btn-lg" href="#proyectos">Ver proyectos</a>
        </div>
      </div>
      <a className="hero-scroll" href="#servicios" aria-label="Bajar a servicios">
        <ArrowDown size={18} />
      </a>
    </section>
  );
}
