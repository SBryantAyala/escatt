// Catálogos fijos de personalización de academias (espejo de
// backend/src/lib/academias.js). Los SVG de cada ícono viven en
// components/iconosAcademia.jsx; aquí solo los datos.
//
// Los hex se eligieron para que el texto blanco encima cumpla contraste AA
// (4.5:1); `claro` es el tono de fondo para las iniciales del presidente
// sobre blanco.
export const COLORES_ACADEMIA = {
  azul: { nombre: "Azul", hex: "#1D4ED8", claro: "#DBEAFE" },
  morado: { nombre: "Morado", hex: "#6D28D9", claro: "#EDE9FE" },
  verde_azulado: { nombre: "Verde azulado", hex: "#0F766E", claro: "#CCFBF1" },
  naranja: { nombre: "Naranja", hex: "#C2410C", claro: "#FFEDD5" },
  rosa: { nombre: "Rosa", hex: "#BE185D", claro: "#FCE7F3" },
  verde: { nombre: "Verde", hex: "#15803D", claro: "#DCFCE7" },
  indigo: { nombre: "Índigo", hex: "#4338CA", claro: "#E0E7FF" },
  rojo_vino: { nombre: "Rojo vino", hex: "#9F1239", claro: "#FFE4E6" },
};

export const CLAVES_COLOR_ACADEMIA = Object.keys(COLORES_ACADEMIA);

export const ICONOS_ACADEMIA = [
  "codigo",
  "chip",
  "red",
  "matraz",
  "birrete",
  "libro",
  "engrane",
  "grafica",
];

export const ETIQUETA_ICONO_ACADEMIA = {
  codigo: "Código",
  chip: "Chip",
  red: "Red",
  matraz: "Matraz",
  birrete: "Birrete",
  libro: "Libro",
  engrane: "Engrane",
  grafica: "Gráfica",
};

// Color por defecto si llega uno fuera de catálogo (no debería pasar: el
// backend valida antes de guardar).
export function colorDe(clave) {
  return COLORES_ACADEMIA[clave] ?? COLORES_ACADEMIA[CLAVES_COLOR_ACADEMIA[0]];
}
