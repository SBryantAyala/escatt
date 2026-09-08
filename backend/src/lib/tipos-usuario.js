// Listas compartidas sobre los tipos de usuario y sus campos específicos.
// Se usan tanto en routes/usuarios.js (CRUD del padrón) como en routes/auth.js
// (registro), para no duplicar la definición en dos lugares.

export const TIPOS_VALIDOS = ["alumno", "sinodal", "personal"];

// Campos que solo aplican a cierto tipo de usuario. Para los demás tipos
// se guardan como NULL (ver esquema en ../db/index.js).
export const CAMPOS_POR_TIPO = {
  alumno: ["boleta", "carrera", "protocolo_tt"],
  sinodal: ["numero_empleado", "especialidad"],
  personal: ["numero_empleado", "cargo"],
};
