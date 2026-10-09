import { createContext, useCallback, useContext, useRef, useState } from "react";

// Proveedor de avisos (toasts) + hook useAviso(). Reemplaza los mensajes de
// éxito/error fijos que vivían sueltos en cada pantalla (Academias, Mi cuenta,
// Cambiar contraseña, Detalle). Se cierran solos a los 5s; si traen
// `deshacer`, muestran ese botón. aria-live="polite" para que un lector de
// pantalla los anuncie sin interrumpir lo que esté leyendo.
const AvisoContext = createContext(null);

let contadorAviso = 0;

export function AvisoProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const temporizadores = useRef({});

  const cerrar = useCallback((id) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id));
    clearTimeout(temporizadores.current[id]);
    delete temporizadores.current[id];
  }, []);

  const mostrar = useCallback(
    (tipo, texto, opciones = {}) => {
      const id = ++contadorAviso;
      setAvisos((lista) => [...lista, { id, tipo, texto, deshacer: opciones.deshacer }]);
      temporizadores.current[id] = setTimeout(() => cerrar(id), 5000);
      return id;
    },
    [cerrar],
  );

  const aviso = {
    exito: (texto, opciones) => mostrar("exito", texto, opciones),
    error: (texto, opciones) => mostrar("error", texto, opciones),
  };

  return (
    <AvisoContext.Provider value={aviso}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm shadow-lg ring-1 ${
              a.tipo === "error"
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            <span className="flex-1 py-1">{a.texto}</span>
            {a.deshacer && (
              <button
                type="button"
                onClick={() => {
                  a.deshacer();
                  cerrar(a.id);
                }}
                className="flex min-h-11 shrink-0 items-center px-1 font-semibold underline underline-offset-2 hover:no-underline"
              >
                Deshacer
              </button>
            )}
            <button
              type="button"
              onClick={() => cerrar(a.id)}
              aria-label="Cerrar aviso"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-base leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AvisoContext.Provider>
  );
}

export function useAviso() {
  const contexto = useContext(AvisoContext);
  if (!contexto) throw new Error("useAviso debe usarse dentro de AvisoProvider");
  return contexto;
}
