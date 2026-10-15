import { useEffect, useRef } from 'react';

const STEPS = [
  { title: 'Charlamos', text: 'Me contás qué hace tu negocio y qué problema querés resolver. Si hace falta, nos juntamos o hacemos una videollamada.' },
  { title: 'Te propongo', text: 'Te paso una propuesta clara: qué voy a hacer, cuánto cuesta y en cuánto tiempo, sin letra chica.' },
  { title: 'Desarrollo', text: 'Construyo por etapas y te muestro avances que podés probar. Ajustamos sobre la marcha.' },
  { title: 'Lanzamos', text: 'Publico todo, te enseño a usarlo y quedo disponible para soporte y mejoras.' },
];

/** Pasos del trabajo conectados por una línea que se completa al hacer scroll. */
export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.style.setProperty('--progress', '1'); return; }
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.1)));
      el.style.setProperty('--progress', p.toFixed(3));
      el.querySelectorAll<HTMLElement>('.step').forEach((s, i) => s.classList.toggle('is-on', p >= (i + 0.35) / STEPS.length));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="section section-alt" id="proceso">
      <div className="container">
        <header className="section-head reveal">
          <p className="eyebrow"><span className="dot" /> Cómo trabajo</p>
          <h2>De la idea a funcionando, en cuatro pasos</h2>
        </header>
        <div className="steps" ref={ref}>
          <div className="steps-line" aria-hidden="true"><span /></div>
          {STEPS.map((s, i) => (
            <article key={s.title} className="step">
              <span className="step-node mono" aria-hidden="true">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
