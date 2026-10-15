import { useEffect, useRef } from 'react';

type Pt = { x: number; y: number; vx: number; vy: number; label: string | null; phase: number };

const LABELS = ['Web', 'App', 'API', 'Dashboard', 'Supabase', 'Mercado Pago', 'Ads', 'Node', 'Python'];

/**
 * Red de nodos que se mueve sola y reacciona al puntero.
 * Los colores salen de las variables CSS --net-* del tema, así cambia con claro/oscuro.
 */
export function NetworkCanvas({ density = 1, labels = true, className = '' }: { density?: number; labels?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const host = cv.parentElement as HTMLElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, raf = 0, visible = true;
    let pts: Pt[] = [];
    const mouse = { x: -9999, y: -9999 };
    const col = { line: '76,111,255', node: '#4c6fff', hot: '#6ee7f9', label: '#e6ebff', glow: 1 };

    const readColors = () => {
      const s = getComputedStyle(cv);
      col.line = s.getPropertyValue('--net-line').trim() || col.line;
      col.node = s.getPropertyValue('--net-node').trim() || col.node;
      col.hot = s.getPropertyValue('--net-hot').trim() || col.hot;
      col.label = s.getPropertyValue('--net-label').trim() || col.label;
      col.glow = parseFloat(s.getPropertyValue('--net-glow')) || 0;
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      const d = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = W * d; cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.round(Math.min(90, Math.max(18, (W * H) / 16000)) * density);
      pts = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        label: labels && i < LABELS.length && W > 520 ? LABELS[i] : null,
        phase: Math.random() * 6.28,
      }));
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const link = Math.min(140, Math.max(90, W / 10));
      for (const p of pts) {
        if (!reduce) { p.x += p.vx; p.y += p.vy; }
        if (p.x < 4 || p.x > W - 4) p.vx *= -1;
        if (p.y < 4 || p.y > H - 4) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dd = Math.hypot(dx, dy);
        if (!reduce && dd < 110 && dd > 0) { p.x += (dx / dd) * 1.3; p.y += (dy / dd) * 1.3; }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `rgba(${col.line},${(1 - d / link) * 0.42})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (mouse.x > -9999) {
        ctx.strokeStyle = col.hot;
        for (const p of pts) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (d < 170) {
            ctx.globalAlpha = (1 - d / 170) * 0.85;
            ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      for (const p of pts) {
        const pulse = reduce ? 0 : Math.sin(t / 650 + p.phase) * 1.2;
        if (col.glow) { ctx.shadowColor = p.label ? col.hot : col.node; ctx.shadowBlur = (p.label ? 16 : 8) * col.glow; }
        ctx.fillStyle = p.label ? col.hot : col.node;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.label ? 5 + pulse : 2.6, 0, 6.29); ctx.fill();
        ctx.shadowBlur = 0;
        if (p.label) {
          ctx.fillStyle = col.label;
          ctx.font = '600 12px Manrope, system-ui, sans-serif';
          ctx.fillText(p.label, p.x + 10, p.y + 4);
        }
      }
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    };

    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (reduce) start();
    };
    const onLeave = () => { mouse.x = mouse.y = -9999; if (reduce) start(); };
    const onTheme = () => { readColors(); if (reduce) start(); };
    const mq = matchMedia('(prefers-color-scheme: dark)');

    readColors();
    resize();
    start();

    const ro = new ResizeObserver(() => { resize(); if (reduce) start(); });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start(); else cancelAnimationFrame(raf);
    });
    io.observe(host);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    window.addEventListener('jd-theme', onTheme);
    mq.addEventListener('change', onTheme);
    const onVis = () => { visible = !document.hidden; if (visible) start(); else cancelAnimationFrame(raf); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('jd-theme', onTheme);
      mq.removeEventListener('change', onTheme);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [density, labels]);

  return <canvas ref={ref} className={`net-canvas ${className}`} aria-hidden="true" />;
}
