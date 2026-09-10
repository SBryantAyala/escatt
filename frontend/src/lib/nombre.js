// El nombre de un usuario vive en 3 columnas (nombre + apellido_paterno +
// apellido_materno). Este helper las une en una sola cadena legible, tolerando
// campos vacíos (p. ej. usuarios antiguos migrados sin apellido materno).
export function nombreCompleto(usuario) {
  if (!usuario) return "";
  return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno]
    .map((parte) => (parte ?? "").trim())
    .filter(Boolean)
    .join(" ");
}
