import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getProject, type Project } from '../lib/projects';
import { NetworkCanvas } from '../components/NetworkCanvas';
import { useReveal } from '../lib/useReveal';

/** Convierte el texto del proyecto en bloques: "## " subtítulo, "- " lista, resto párrafos. */
function Body({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) { blocks.push(<ul key={`ul${blocks.length}`}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>); list = []; }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith('## ')) blocks.push(<h2 key={blocks.length}>{line.slice(3)}</h2>);
    else blocks.push(<p key={blocks.length}>{line}</p>);
  }
  flush();
  return <div className="prose reveal">{blocks}</div>;
}

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const [p, setP] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    setP(undefined);
    getProject(slug).then(setP).catch(() => setP(null));
    window.scrollTo(0, 0);
  }, [slug]);
  useEffect(() => { if (p) document.title = `${p.title} · JD Soluciones`; }, [p]);
  useReveal([p]);

  if (p === undefined) return <div className="page-loading container" aria-busy="true">Cargando proyecto…</div>;
  if (p === null)
    return (
      <section className="container notfound">
        <h1>No encontré ese proyecto</h1>
        <Link className="btn btn-ghost" to="/#proyectos"><ArrowLeft size={16} /> Ver todos los proyectos</Link>
      </section>
    );

  return (
    <article className="case">
      <header className="case-hero">
        <NetworkCanvas density={0.6} labels={false} />
        <div className="hero-fade" aria-hidden="true" />
        <div className="container case-hero-inner">
          <Link className="back-link" to="/#proyectos"><ArrowLeft size={16} /> Proyectos</Link>
          <p className="eyebrow"><span className="dot" /> {p.client}{p.year ? ` · ${p.year}` : ''}</p>
          <h1>{p.title}</h1>
          <p className="lead">{p.summary}</p>
          <div className="tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          {p.url && (
            <a className="btn btn-hot" href={p.url} target="_blank" rel="noreferrer">
              Ver el proyecto en vivo <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      </header>

      <div className="container case-content">
        {p.cover_url && (
          <figure className="case-cover reveal" data-slug={p.slug}>
            <img src={p.cover_url} alt={`Imagen de ${p.title}`} />
          </figure>
        )}
        <Body text={p.body} />
        {p.gallery.length > 0 && (
          <div className="gallery">
            {p.gallery.map((src, i) => (
              <figure key={src} className="reveal" style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
                <img src={src} alt={`${p.title}, captura ${i + 1}`} loading="lazy" />
              </figure>
            ))}
          </div>
        )}
        <aside className="case-cta reveal">
          <h2>¿Querés algo así para tu negocio?</h2>
          <Link className="btn btn-hot btn-lg" to="/#contacto">Contame tu proyecto</Link>
        </aside>
      </div>
    </article>
  );
}
