// Catálogo de roles globales y perfiles del sistema.
// Fuente: documento "ESCATT — Módulo de Usuarios: roles, permisos y reglas".
//
// - Un ROL dice qué puede hacer una persona (una persona puede tener varios).
// - Un PERFIL guarda los datos propios de un tipo de persona:
//     alumnos, docentes y personal_catt (docentes y personal_catt cuelgan de
//     empleados, que guarda el número de empleado una sola vez).

export const ROLES = [
  { clave: "admin_sistema", nombre: "Administrador del sistema" },
  { clave: "catt_ejecutivo", nombre: "Secretario Ejecutivo CATT" },
  { clave: "catt_auxiliar", nombre: "Auxiliar CATT" },
  { clave: "catt_consulta", nombre: "Consulta / Directivo" },
  { clave: "docente", nombre: "Docente" },
  { clave: "presidente_academia", nombre: "Presidente de Academia" },
  { clave: "alumno", nombre: "Alumno" },
];

export const CLAVES_ROL = ROLES.map((r) => r.clave);

// Roles del personal de la CATT (requieren el perfil personal_catt).
export const ROLES_CATT = ["catt_ejecutivo", "catt_auxiliar", "catt_consulta"];

// Personal que puede consultar el padrón completo.
export const ROLES_STAFF = ROLES_CATT;

// Personal que da de alta y edita alumnos y docentes.
export const ROLES_GESTION = ["catt_ejecutivo", "catt_auxiliar"];

export const PERFILES = ["alumno", "docente", "personal_catt"];

export const CARRERAS_VALIDAS = ["ISC", "IIA", "LCD"];
export const PLANES_VALIDOS = ["2009", "2020"];

export const ESTADOS_CUENTA = ["pendiente_verificacion", "activa", "revocada"];

export function tieneRol(usuario, ...roles) {
  return Boolean(usuario?.roles?.some((r) => roles.includes(r)));
}

// ¿El usuario objetivo es "personal"? (perfil personal_catt o algún rol de
// administración). A estas cuentas solo las gestiona el administrador del
// sistema: la CATT no se da privilegios a sí misma.
export function esCuentaDePersonal(usuario) {
  return (
    Boolean(usuario?.perfiles?.includes("personal_catt")) ||
    tieneRol(usuario, "admin_sistema", ...ROLES_CATT)
  );
}

// ¿`actor` es Presidente de la academia a la que pertenece el docente
// `objetivo`? (HU-11) Solo aplica a docentes con academia asignada.
export function esPresidenteDe(actor, objetivo) {
  return (
    tieneRol(actor, "presidente_academia") &&
    Boolean(objetivo?.perfiles?.includes("docente")) &&
    actor.academia_id != null &&
    actor.academia_id === objetivo.academia_id
  );
}

// ¿`actor` puede ver la ficha de `objetivo`?
export function puedeVer(actor, objetivo) {
  if (!actor || !objetivo) return false;
  if (actor.id === objetivo.id) return true;
  if (tieneRol(actor, ...ROLES_STAFF)) return true;
  // El Presidente de Academia ve (solo lectura) a los docentes de su academia.
  if (esPresidenteDe(actor, objetivo)) return true;
  // El admin ve al personal y a los docentes (a un docente se le puede
  // asignar un rol de la CATT), pero no a los alumnos.
  if (tieneRol(actor, "admin_sistema")) {
    return esCuentaDePersonal(objetivo) || Boolean(objetivo.perfiles?.includes("docente"));
  }
  return false;
}

// ¿`actor` puede editar, revocar o restablecer la contraseña de `objetivo`?
export function puedeGestionar(actor, objetivo) {
  if (!actor || !objetivo || actor.id === objetivo.id) return false;
  if (esCuentaDePersonal(objetivo)) return tieneRol(actor, "admin_sistema");
  return tieneRol(actor, ...ROLES_GESTION);
}
