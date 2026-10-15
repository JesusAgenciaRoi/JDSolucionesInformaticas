import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { listProjects, SEED_PROJECTS, type Project } from '../lib/projects';
import { useReveal } from '../lib/useReveal';

/** Tarjeta que se inclina siguiendo al puntero. */
function TiltCard({ p, i }: { p: Project; i: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <Link
      ref={ref}
      to={`/proyectos/${p.slug}`}
      className={`project reveal${p.featured ? ' is-featured' : ''}`}
      style={{ ['--d' as string]: `${i * 90}ms` }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <div className="project-cover" data-slug={p.slug}>
        {p.cover_url ? <img src={p.cover_url} alt="" loading="lazy" /> : <span className="project-initial">{p.title.slice(0, 1)}</span>}
      </div>
      <div className="project-body">
        <div className="project-meta">
          <span>{p.client}</span>
          {p.year && <span className="mono">{p.year}</span>}
        </div>
        <h3>{p.title} <ArrowUpRight size={20} className="project-arrow" /></h3>
        <p>{p.summary}</p>
        <div className="tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
      </div>
    </Link>
  );
}

export function Work() {
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects(SEED_PROJECTS));
  }, []);
  useReveal([projects.length]);

  return (
    <section className="section" id="proyectos">
      <div className="container">
        <header className="section-head reveal">
          <p className="eyebrow"><span className="dot" /> Proyectos</p>
          <h2>Trabajo hecho y funcionando</h2>
          <p className="lead">Cada proyecto es a medida. Acá está lo que ya está en manos de clientes reales.</p>
        </header>
        <div className="projects">
          {projects.map((p, i) => <TiltCard key={p.id} p={p} i={i} />)}
          <a href="#contacto" className={`project project-next reveal${projects.filter((x) => !x.featured).length % 2 === 0 ? ' is-wide' : ''}`} style={{ ['--d' as string]: `${projects.length * 90}ms` }}>
            <div className="project-next-inner">
              <span className="project-next-icon"><Plus size={26} /></span>
              <h3>Tu proyecto puede ser el próximo</h3>
              <p>Contame qué necesitás y te digo cómo lo resolvería, sin compromiso.</p>
              <span className="link">Escribime <ArrowUpRight size={16} /></span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
