import { useEffect, useRef, useState } from "react";
import { GRAD_AZUL } from "../../lib/theme";

const SELECTOR_FOCOSABLES =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Diálogo de confirmación con tres niveles:
//   "simple"    confirmar o cancelar.
//   "escribir"  el botón se habilita solo al escribir `textoEsperado` tal cual.
//   "bloqueado" no permite confirmar; muestra `motivoBloqueo` y solo deja cerrar.
// Foco atrapado dentro del diálogo, Escape cierra, y al cerrar el foco vuelve
// al elemento que lo abrió (normalmente el botón que lo disparó).
export default function DialogoConfirmacion({
  abierto,
  nivel = "simple",
  titulo,
  descripcion,
  etiquetaConfirmar = "Confirmar",
  textoEsperado,
  motivoBloqueo,
  cargando = false,
  colorConfirmar,
  onConfirmar,
  onCancelar,
}) {
  const contenedorRef = useRef(null);
  const elementoPrevioRef = useRef(null);
  const inputRef = useRef(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (abierto) {
      elementoPrevioRef.current = document.activeElement;
      setTexto("");
      const foco =
        nivel === "escribir" ? inputRef.current : contenedorRef.current?.querySelector("button");
      foco?.focus();
    } else {
      elementoPrevioRef.current?.focus?.();
    }
  }, [abierto, nivel]);

  useEffect(() => {
    if (!abierto) return undefined;

    function alTeclado(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelar?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focosables = contenedorRef.current?.querySelectorAll(SELECTOR_FOCOSABLES);
      if (!focosables || focosables.length === 0) return;
      const primero = focosables[0];
      const ultimo = focosables[focosables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  const puedeConfirmar =
    nivel === "bloqueado" ? false : nivel === "escribir" ? texto === textoEsperado : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancelar}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialogo-confirmacion-titulo" className="text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        {descripcion && <p className="mt-2 text-sm text-slate-600">{descripcion}</p>}

        {nivel === "escribir" && (
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Escribe «{textoEsperado}» para confirmar
            </span>
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
            />
          </label>
        )}

        {nivel === "bloqueado" && motivoBloqueo && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{motivoBloqueo}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {nivel === "bloqueado" ? "Cerrar" : "Cancelar"}
          </button>
          {nivel !== "bloqueado" && (
            <button
              type="button"
              onClick={onConfirmar}
              disabled={cargando || !puedeConfirmar}
              style={colorConfirmar ? undefined : { background: GRAD_AZUL }}
              className={`min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                colorConfirmar ?? "shadow-md shadow-[#1878B6]/30"
              }`}
            >
              {cargando ? "Procesando…" : etiquetaConfirmar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
