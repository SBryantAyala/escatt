export const ESTADOS_SESION = {
  convocada: { etiqueta: "Convocada", variante: "info" },
  realizada: { etiqueta: "Realizada", variante: "exito" },
  cancelada: { etiqueta: "Cancelada", variante: "neutro" },
};

export const ESTADOS_ACUERDO = {
  pendiente: { etiqueta: "Pendiente", variante: "alerta" },
  en_proceso: { etiqueta: "En proceso", variante: "info" },
  cumplido: { etiqueta: "Cumplido", variante: "exito" },
  cancelado: { etiqueta: "Cancelado", variante: "neutro" },
};

export const TIPOS_SESION = { ordinaria: "Ordinaria", extraordinaria: "Extraordinaria" };

export function formatearFechaHora(iso) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
}

export function formatearFechaCorta(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export function formatearDia(dia) {
  if (!dia) return null;
  const [anio, mes, d] = dia.split("-").map(Number);
  return new Date(anio, mes - 1, d).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

function hoyISO() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

export function estaVencido(acuerdo) {
  return (
    ["pendiente", "en_proceso"].includes(acuerdo.estado) &&
    Boolean(acuerdo.fecha_compromiso) &&
    acuerdo.fecha_compromiso < hoyISO()
  );
}

export function valorParaInputFechaHora(iso) {
  const f = new Date(iso);
  const dos = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}
