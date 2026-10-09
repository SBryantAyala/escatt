// Íconos de línea para el catálogo ICONOS_ACADEMIA (lib/academias.js), mismo
// estilo de trazo que components/iconos.jsx. El Secretario Ejecutivo elige
// uno por academia; se pintan en la franja de color de la tarjeta y la ficha.

const COMUN = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export function IconoCodigo({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
    </svg>
  );
}

export function IconoChip({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2" />
    </svg>
  );
}

export function IconoRed({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 12 6.5 17.5M12 12l5.5 5.5" />
    </svg>
  );
}

export function IconoMatraz({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M10 3h4M10.5 3v6.5L5.8 18a1.5 1.5 0 0 0 1.3 2.2h9.8a1.5 1.5 0 0 0 1.3-2.2l-4.7-8.5V3" />
      <path d="M8 15h8" />
    </svg>
  );
}

export function IconoBirrete({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M12 5 2 9.5 12 14l10-4.5L12 5Z" />
      <path d="M6 11.7V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.3" />
      <path d="M20 10v5" />
    </svg>
  );
}

export function IconoLibro({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 0-2 1.5Z" />
      <path d="M20 5.5A2 2 0 0 0 18 4h-5v16h5a2 2 0 0 1 2 1.5Z" />
    </svg>
  );
}

export function IconoEngrane({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3M3 12h2.5M18.5 12H21" />
    </svg>
  );
}

export function IconoGrafica({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export const ICONO_ACADEMIA_COMPONENTE = {
  codigo: IconoCodigo,
  chip: IconoChip,
  red: IconoRed,
  matraz: IconoMatraz,
  birrete: IconoBirrete,
  libro: IconoLibro,
  engrane: IconoEngrane,
  grafica: IconoGrafica,
};
