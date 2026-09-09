const BASE_URL = "/api/usuarios";

async function parseJsonOrThrow(response) {
  if (!response.ok) {
    let detalle = "";
    try {
      const body = await response.json();
      detalle = body?.error || body?.mensaje || "";
    } catch {
      // La respuesta no trae cuerpo JSON; se ignora y se usa el status.
    }
    throw new Error(detalle || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// GET /api/usuarios -> lista de usuarios
export function listarUsuarios() {
  return fetch(BASE_URL).then(parseJsonOrThrow);
}

// PATCH /api/usuarios/:id/revocar -> revoca el acceso de un usuario
export function revocarAcceso(id) {
  return fetch(`${BASE_URL}/${id}/revocar`, { method: "PATCH" }).then(parseJsonOrThrow);
}

// DELETE /api/usuarios/:id -> elimina un usuario
export function eliminarUsuario(id) {
  return fetch(`${BASE_URL}/${id}`, { method: "DELETE" }).then(parseJsonOrThrow);
}
