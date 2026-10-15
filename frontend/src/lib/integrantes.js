// Un protocolo lo desarrolla un equipo de uno o más alumnos. La API manda
// `integrantes` (el responsable primero) y, por compatibilidad, `alumno` con el
// responsable.
export function integrantesDe(protocolo) {
  if (protocolo?.integrantes?.length) return protocolo.integrantes;
  return protocolo?.alumno ? [{ ...protocolo.alumno, es_responsable: true }] : [];
}

// Todos los nombres del equipo en una línea.
export const nombresIntegrantes = (protocolo) =>
  integrantesDe(protocolo)
    .map((i) => i.nombre)
    .join(", ");

// Línea de resumen: un alumno → "Nombre · boleta"; un equipo → todos los
// nombres (sin recortar ninguno). `campos` elige qué dato extra se muestra
// cuando es un solo alumno.
export function resumenIntegrantes(protocolo, campos = ["boleta", "carrera"]) {
  const equipo = integrantesDe(protocolo);
  if (equipo.length !== 1) return nombresIntegrantes(protocolo);
  const [solo] = equipo;
  return [solo.nombre, ...campos.map((c) => solo[c])].filter(Boolean).join(" · ");
}
