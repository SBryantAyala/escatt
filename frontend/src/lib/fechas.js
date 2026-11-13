// Fecha en formato corto para México, p. ej. «3 nov 2026».
export function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}
