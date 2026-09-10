// Identidad visual compartida de ESCATT.
//
// Paleta DOMINANTE: azul institucional #1878B6 -> #4FB3E8. El amarillo #FDD40A
// es identidad de Nexus Solutions (ver components/NexusLogo) y aparece ÚNICAMENTE
// en su logo y su crédito, nunca como color de una sección.
//
// Estos valores estaban duplicados entre App.jsx y pages/Listado; ahora viven
// aquí y se importan desde ambos lados.

export const AZUL_MEDIO = "#1878B6";
export const AZUL_CLARO = "#4FB3E8";
export const AZUL_OSCURO = "#0F5C8C";

export const GRAD_AZUL = `linear-gradient(135deg, ${AZUL_MEDIO} 0%, ${AZUL_CLARO} 100%)`;

// Clases reutilizables para el efecto "vidrio esmerilado".
export const VIDRIO =
  "border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-[#1878B6]/10";
