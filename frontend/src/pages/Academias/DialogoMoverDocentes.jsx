import { useEffect, useState } from "react";
import useDialogoAccesible from "../../components/ui/useDialogoAccesible";
import { api } from "../../lib/api";
import { colorDe } from "../../lib/academias";
import { AZUL_MEDIO } from "../../lib/theme";

// Mover la selección de integrantes a otra academia: mini-tarjetas de color
// (solo activas, sin la actual) como destino. Si la selección incluye al
// presidente de su academia actual, la acción queda deshabilitada con una
// explicación — primero hay que resolver esa presidencia desde su ficha.
export default function DialogoMoverDocentes({ abierto, docentes, academiaActualId, onCerrar, onMover, procesando }) {
  const [academias, setAcademias] = useState(null);
  const [destinoId, setDestinoId] = useState(null);
  const contenedorRef = useDialogoAccesible(abierto, onCerrar);

  useEffect(() => {
    if (!abierto) return;
    setDestinoId(null);
    api("/api/academias?todas=1")
      .then(setAcademias)
      .catch(() => setAcademias([]));
  }, [abierto]);

  if (!abierto) return null;

  const incluyePresidente = docentes.some((d) => d.es_presidente);
  const opciones = (academias ?? []).filter((a) => a.activa && a.id !== academiaActualId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-mover-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialogo-mover-titulo" className="text-lg font-semibold text-slate-900">
          Mover a otra academia
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {docentes.length} {docentes.length === 1 ? "docente seleccionado" : "docentes seleccionados"}.
        </p>

        {incluyePresidente && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            La selección incluye al presidente de su academia actual. Primero cambia o quita esa
            presidencia desde la ficha de esa academia.
          </p>
        )}

        {!academias ? (
          <p className="mt-4 text-sm text-slate-400">Cargando academias…</p>
        ) : opciones.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No hay otra academia activa disponible.</p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Academia destino"
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {opciones.map((a) => {
              const color = colorDe(a.color);
              const seleccionada = destinoId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={seleccionada}
                  disabled={incluyePresidente}
                  onClick={() => setDestinoId(a.id)}
                  className={`min-h-16 rounded-2xl p-3 text-left text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    seleccionada ? "ring-2 ring-offset-2 ring-slate-900" : ""
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  <span className="block text-sm font-semibold">{a.nombre}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={incluyePresidente || !destinoId || procesando}
            onClick={() => onMover(destinoId)}
            style={{ backgroundColor: AZUL_MEDIO }}
            className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-[#1878B6]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando ? "Moviendo…" : "Mover"}
          </button>
        </div>
      </div>
    </div>
  );
}
