// Logo de Nexus Solutions: "N" en flechas angulares (estilo </> de código),
// negro sobre amarillo #FDD40A, siempre en círculo.
// Ver 00-Contexto-Proyecto/CONTEXTO-PROYECTO.md, sección 6 (Identidad visual).

export default function NexusLogo({ size = 56, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Nexus Solutions"
    >
      <circle cx="50" cy="50" r="48" fill="#FDD40A" />
      <polyline
        points="42,28 26,50 42,72"
        fill="none"
        stroke="#111111"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="58,28 74,50 58,72"
        fill="none"
        stroke="#111111"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="34" y1="72" x2="66" y2="28"
        stroke="#111111"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
