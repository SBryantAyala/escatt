// Cliente HTTP mínimo compartido por toda la app.
//
// Estaba duplicado entre App.jsx y pages/Listado; ahora se importa desde
// ambos lados. Adjunta el token Bearer si existe y normaliza los errores para
// poder mostrarlos en la UI (nunca un alert).

export const API_BASE = import.meta.env.VITE_API_URL ?? "";
export const TOKEN_KEY = "escatt_token";

export async function api(ruta, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let datos = null;
  try {
    datos = await resp.json();
  } catch {
    datos = null;
  }
  if (!resp.ok) {
    throw new Error(datos?.error || `Error ${resp.status}`);
  }
  return datos;
}
