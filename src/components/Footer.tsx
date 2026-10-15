import { Logo } from './Logo';
import { BRAND } from '../lib/brand';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Logo />
        <p className="footer-text">Webs, apps a medida, dashboards, integraciones y soporte, desde {BRAND.city}.</p>
        <p className="footer-small mono">
          <span className="select">{BRAND.email}</span> · © {new Date().getFullYear()} {BRAND.full}
        </p>
      </div>
    </footer>
  );
}
