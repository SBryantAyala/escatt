// Íconos de línea propios (sin librería), 24x24, trazo en currentColor.
// Se usan en el sidebar del panel, los accesos rápidos y el topbar.

const COMUN = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

export function IconoInicio({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function IconoUsuarios({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 19v-1a4 4 0 0 0-3-3.85" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconoAltaUsuario({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="8.5" cy="7" r="3" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function IconoDocumento({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconoFlujo({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <rect x="3" y="4" width="7" height="6" rx="1.5" />
      <rect x="14" y="14" width="7" height="6" rx="1.5" />
      <path d="M6.5 10v3a4 4 0 0 0 4 4h3" />
    </svg>
  );
}

export function IconoPresentacion({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M3 4h18" />
      <path d="M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4" />
      <path d="M12 16v4M9 20h6" />
    </svg>
  );
}

export function IconoSalir({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconoMenu({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function IconoCerrar({ className = "h-5 w-5" }) {
  return (
    <svg {...COMUN} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
