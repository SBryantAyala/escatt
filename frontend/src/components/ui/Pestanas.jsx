import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { GRAD_AZUL } from "../../lib/theme";

// Hook: lee/escribe la pestaña activa en ?tab= (o el parámetro que se indique)
// de la URL. Si el valor en la URL no es uno de los ids válidos, cae al
// primero de la lista.
export function usePestanaUrl(pestanas, { param = "tab" } = {}) {
  const [params, setParams] = useSearchParams();
  const ids = pestanas.map((p) => p.id);
  const desdeUrl = params.get(param);
  const activa = ids.includes(desdeUrl) ? desdeUrl : ids[0];

  const cambiar = useCallback(
    (id) => {
      setParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos);
          siguientes.set(param, id);
          return siguientes;
        },
        { replace: true },
      );
    },
    [param, setParams],
  );

  return [activa, cambiar];
}

// Tablist accesible: role="tablist"/"tab", navegable con flechas (Home/End
// también), sincronizable con la URL vía usePestanaUrl. Es controlado: quien
// lo usa decide qué pasa al cambiar de pestaña.
export default function Pestanas({ pestanas, activa, onCambiar, idBase = "pestana" }) {
  const indiceActivo = pestanas.findIndex((p) => p.id === activa);

  function alTeclado(e) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let siguiente = indiceActivo;
    if (e.key === "ArrowLeft") siguiente = (indiceActivo - 1 + pestanas.length) % pestanas.length;
    if (e.key === "ArrowRight") siguiente = (indiceActivo + 1) % pestanas.length;
    if (e.key === "Home") siguiente = 0;
    if (e.key === "End") siguiente = pestanas.length - 1;
    const destino = pestanas[siguiente];
    onCambiar(destino.id);
    document.getElementById(`${idBase}-tab-${destino.id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Pestañas"
      onKeyDown={alTeclado}
      className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
    >
      {pestanas.map((p) => {
        const esActiva = p.id === activa;
        return (
          <button
            key={p.id}
            id={`${idBase}-tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={esActiva}
            aria-controls={`${idBase}-panel-${p.id}`}
            tabIndex={esActiva ? 0 : -1}
            onClick={() => onCambiar(p.id)}
            className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              esActiva
                ? "text-white shadow-md shadow-[#1878B6]/30"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            style={esActiva ? { background: GRAD_AZUL } : undefined}
          >
            {p.etiqueta}
            {p.contador != null && (
              <span className={esActiva ? "ml-1 text-white/80" : "ml-1 text-slate-400"}>
                ({p.contador})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
