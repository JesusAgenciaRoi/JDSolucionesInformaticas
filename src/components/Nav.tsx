import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../lib/theme';

const LINKS = [
  { href: '/#servicios', label: 'Servicios' },
  { href: '/#proyectos', label: 'Proyectos' },
  { href: '/#proceso', label: 'Cómo trabajo' },
  { href: '/#contacto', label: 'Contacto' },
];

export function Nav() {
  const { toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-brand" aria-label="JD Soluciones, inicio">
          <Logo />
        </Link>
        <nav className="nav-links" aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" type="button" onClick={toggle} aria-label="Cambiar entre modo claro y oscuro">
            <Sun className="only-dark" size={18} />
            <Moon className="only-light" size={18} />
          </button>
          <a className="btn btn-hot nav-cta" href="/#contacto">Contame tu proyecto</a>
          <button className="icon-btn nav-burger" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menú">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <nav className="nav-sheet" aria-label="Secciones (móvil)">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
      </nav>
    </header>
  );
}
