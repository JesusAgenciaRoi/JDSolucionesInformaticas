const STACK = ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Supabase', 'PostgreSQL', 'Docker', 'Cloudflare', 'Mercado Pago', 'APIs de Meta Ads', 'APIs de TikTok', 'Google Ads', 'Notificaciones push'];

/** Cinta con las tecnologías que uso, en movimiento continuo. */
export function Marquee() {
  const row = STACK.map((t) => (
    <span key={t} className="marquee-item">
      <i aria-hidden="true" />{t}
    </span>
  ));
  return (
    <div className="marquee" aria-label={`Tecnologías: ${STACK.join(', ')}`}>
      <div className="marquee-track" aria-hidden="true">
        {row}
        {row}
      </div>
    </div>
  );
}
