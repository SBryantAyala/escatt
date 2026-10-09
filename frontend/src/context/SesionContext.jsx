import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY } from "../lib/api";

// Fuente única del usuario en sesión. Antes vivía en un useState de App.jsx y
// se pasaba por props a todo lo demás; ahora cualquier componente lo lee con
// useSesion() sin depender de dónde esté montado en el árbol de rutas.
const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al cargar: si hay token guardado, validarlo contra el backend y restaurar
  // el usuario. Si ya no sirve, se borra en silencio.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCargando(false);
      return undefined;
    }
    let vivo = true;
    api("/api/auth/yo")
      .then((datos) => {
        if (vivo) setUsuario(datos.usuario);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // El resultado neto que nos importa (no hay sesión local) se logra igual.
    }
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  }, []);

  return (
    <SesionContext.Provider value={{ usuario, setUsuario, cerrarSesion, cargando }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return contexto;
}
