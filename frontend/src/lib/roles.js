// Roles y perfiles del sistema (espejo de backend/src/lib/roles.js).
//
// La UI solo usa esto para decidir qué mostrar: ocultar un botón NO es
// seguridad, el backend valida cada petición por su cuenta.

export const ETIQUETA_ROL = {
  admin_sistema: "Administrador del sistema",
  catt_ejecutivo: "Secretario Ejecutivo CATT",
  catt_auxiliar: "Auxiliar CATT",
  catt_consulta: "Consulta / Directivo",
  docente: "Docente",
  presidente_academia: "Presidente de Academia",
  alumno: "Alumno",
};

// Orden de "importancia" para elegir la etiqueta principal de una persona
// que tiene varios roles (p. ej. docente + presidente de academia).
const PRIORIDAD = [
  "admin_sistema",
  "catt_ejecutivo",
  "catt_auxiliar",
  "catt_consulta",
  "presidente_academia",
  "docente",
  "alumno",
];

export const ROLES_CATT = ["catt_ejecutivo", "catt_auxiliar", "catt_consulta"];
export const ROLES_GESTION = ["catt_ejecutivo", "catt_auxiliar"];

export const CARRERAS = [
  { valor: "ISC", etiqueta: "ISC — Ingeniería en Sistemas Computacionales" },
  { valor: "IIA", etiqueta: "IIA — Ingeniería en Inteligencia Artificial" },
  { valor: "LCD", etiqueta: "LCD — Licenciatura en Ciencia de Datos" },
];
export const PLANES = ["2009", "2020"];

export const DOMINIO_ALUMNO = "@alumno.ipn.mx";

export function tieneRol(usuario, ...roles) {
  return Boolean(usuario?.roles?.some((r) => roles.includes(r)));
}

export function rolPrincipal(usuario) {
  return PRIORIDAD.find((r) => usuario?.roles?.includes(r)) ?? null;
}

export function etiquetaRolPrincipal(usuario) {
  return ETIQUETA_ROL[rolPrincipal(usuario)] ?? "Usuario";
}

export function esCuentaDePersonal(usuario) {
  return (
    Boolean(usuario?.perfiles?.includes("personal_catt")) ||
    tieneRol(usuario, "admin_sistema", ...ROLES_CATT)
  );
}

// Mismas reglas que puedeGestionar() del backend.
export function puedeGestionar(actor, objetivo) {
  if (!actor || !objetivo || actor.id === objetivo.id) return false;
  if (esCuentaDePersonal(objetivo)) return tieneRol(actor, "admin_sistema");
  return tieneRol(actor, ...ROLES_GESTION);
}
