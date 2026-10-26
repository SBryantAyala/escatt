// Cliente HTTP mínimo compartido por toda la app.
//
// Estaba duplicado entre App.jsx y pages/Listado; ahora se importa desde
// ambos lados. Adjunta el token Bearer si existe y normaliza los errores para
// poder mostrarlos en la UI (nunca un alert).

export const API_BASE = import.meta.env.VITE_API_URL ?? "";
export const TOKEN_KEY = "escatt_token";

export async function api(ruta, { method = "GET", body } = {}) {
  const esFormData = body instanceof FormData;
  const headers = esFormData ? {} : { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}${ruta}`, {
    method,
    headers,
    // FormData (subida de archivos, p. ej. evidencia de elegibilidad TT) se
    // manda tal cual: el navegador pone su propio Content-Type con boundary.
    body: esFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let datos = null;
  try {
    datos = await resp.json();
  } catch {
    datos = null;
  }
  if (!resp.ok) {
    const error = new Error(datos?.error || `Error ${resp.status}`);
    error.status = resp.status;
    // Cuerpo completo de la respuesta: algunos errores traen más que un texto
    // (p. ej. el 400 de cargar el padrón trae la lista de `errores`).
    error.datos = datos;
    throw error;
  }
  return datos;
}

// Nombre de archivo sugerido por el backend en Content-Disposition
// (res.download en Express lo manda como attachment; filename="...").
function nombreDesdeDisposition(resp) {
  const valor = resp.headers.get("Content-Disposition") || "";
  const coincidencia = /filename="?([^";]+)"?/.exec(valor);
  return coincidencia?.[1];
}

// Descarga un archivo protegido (requiere el token Bearer, por eso no se usa
// un <a href> normal) y lo guarda con el nombre indicado. Usado por la
// evidencia de elegibilidad TT (HU-12/HU-13).
export async function descargarArchivo(ruta, nombreSugerido) {
  const headers = {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}${ruta}`, { headers });
  if (!resp.ok) {
    let datos = null;
    try {
      datos = await resp.json();
    } catch {
      datos = null;
    }
    throw new Error(datos?.error || `Error ${resp.status}`);
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreDesdeDisposition(resp) || nombreSugerido || "archivo";
  enlace.click();
  URL.revokeObjectURL(url);
}
