/** Marca: la barra de la J sigue hasta la D y las une; nodos en las uniones. Colores desde los tokens del tema. */
export function LogoMark({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg className={`logo-mark${animated ? ' is-animated' : ''}`} viewBox="0 0 80 64" width={size * 1.25} height={size} aria-hidden="true">
      <path
        className="logo-stroke"
        d="M8 10H44M26 10V42Q26 54 14 54Q8 54 6 49M44 10V54H52Q70 54 70 32Q70 10 52 10H44"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <circle className="logo-node" cx="8" cy="10" r="5.5" />
      <circle className="logo-node" cx="26" cy="10" r="5.5" />
      <circle className="logo-node" cx="44" cy="10" r="5.5" />
      <circle className="logo-node" cx="44" cy="54" r="5.5" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={compact ? 30 : 36} />
      <span className="logo-word">
        <b>JD Soluciones</b>
        {!compact && <span>informáticas</span>}
      </span>
    </span>
  );
}
