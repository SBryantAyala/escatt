// Etiqueta y variante de color (componente Etiqueta) de cada estado de un
// protocolo. Fuente única para las vistas del docente y su Inicio.
export const ESTADOS_PROTOCOLO = {
  registrado: { etiqueta: "Registrado", variante: "info" },
  en_evaluacion: { etiqueta: "En evaluación", variante: "alerta" },
  aprobado: { etiqueta: "Aprobado", variante: "exito" },
  no_aprobado: { etiqueta: "No aprobado", variante: "peligro" },
};

export const estadoDe = (clave) => ESTADOS_PROTOCOLO[clave] ?? { etiqueta: clave, variante: "neutro" };
