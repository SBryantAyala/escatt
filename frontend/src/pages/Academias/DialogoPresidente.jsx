import { useEffect, useRef, useState } from "react";
import useDialogoAccesible from "../../components/ui/useDialogoAccesible";
import { AZUL_MEDIO } from "../../lib/theme";

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Elegir (o cambiar) presidente: lista con búsqueda de los docentes activos
// de la academia (radio) y un paso de confirmación antes de guardar. El
// enlace "Dejar sin presidente" no vive aquí: delega a `onPedirQuitar`, que
// en la ficha abre el DialogoConfirmacion compartido (nivel "simple").
export default function DialogoPresidente({
  abierto,
  candidatos,
  presidenteActual,
  onCerrar,
  onConfirmar,
  onPedirQuitar,
  procesando,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [elegidoId, setElegidoId] = useState(null);
  const [paso, setPaso] = useState("elegir"); // "elegir" | "confirmar"
  const inputRef = useRef(null);
  const contenedorRef = useDialogoAccesible(abierto, onCerrar, {
    enfocarAlAbrir: () => inputRef.current,
  });

  useEffect(() => {
    if (!abierto) return;
    setBusqueda("");
    setElegidoId(null);
    setPaso("elegir");
  }, [abierto]);

  if (!abierto) return null;

  const filtrados = candidatos.filter((c) => normalizar(c.nombre_completo).includes(normalizar(busqueda)));
  const elegido = candidatos.find((c) => c.id === elegidoId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-presidente-titulo"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {paso === "elegir" ? (
          <>
            <h2 id="dialogo-presidente-titulo" className="text-lg font-semibold text-slate-900">
              {presidenteActual ? "Cambiar presidente" : "Asignar presidente"}
            </h2>
            <input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar docente…"
              aria-label="Buscar docente"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
            />
            {filtrados.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No hay docentes activos que coincidan.</p>
            ) : (
              <ul role="radiogroup" aria-label="Elegir presidente" className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                {filtrados.map((c) => (
                  <li key={c.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                      <input
                        type="radio"
                        name="presidente-elegido"
                        checked={elegidoId === c.id}
                        onChange={() => setElegidoId(c.id)}
                      />
                      <span className="text-sm text-slate-700">{c.nombre_completo}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCerrar}
                className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!elegido}
                onClick={() => setPaso("confirmar")}
                style={{ backgroundColor: AZUL_MEDIO }}
                className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-[#1878B6]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Confirmar presidente</h2>
            <p className="mt-2 text-sm text-slate-600">
              {presidenteActual
                ? `"${elegido.nombre_completo}" será el nuevo presidente; "${presidenteActual.nombre_completo}" deja de serlo.`
                : `"${elegido.nombre_completo}" será el nuevo presidente de la academia.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaso("elegir")}
                disabled={procesando}
                className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => onConfirmar(elegido.id)}
                disabled={procesando}
                style={{ backgroundColor: AZUL_MEDIO }}
                className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-[#1878B6]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesando ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </>
        )}

        {presidenteActual && paso === "elegir" && (
          <button
            type="button"
            onClick={onPedirQuitar}
            className="mt-4 min-h-11 text-sm font-medium text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline"
          >
            Dejar sin presidente
          </button>
        )}
      </div>
    </div>
  );
}
