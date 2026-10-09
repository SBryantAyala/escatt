import { useEffect, useRef, useState } from "react";
import useDialogoAccesible from "../../components/ui/useDialogoAccesible";
import Etiqueta from "../../components/ui/Etiqueta";
import { api } from "../../lib/api";
import { colorDe } from "../../lib/academias";
import { nombreCompleto } from "../../lib/nombre";
import { GRAD_AZUL } from "../../lib/theme";

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Agregar a esta academia uno o más docentes que hoy están en OTRA academia.
// Selección múltiple; cada fila muestra su academia actual como etiqueta de
// color, para que quede claro de dónde se los está quitando.
export default function DialogoAgregarDocente({ abierto, academiaActualId, onCerrar, onAgregar, procesando }) {
  const [todos, setTodos] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const inputRef = useRef(null);
  const contenedorRef = useDialogoAccesible(abierto, onCerrar, {
    enfocarAlAbrir: () => inputRef.current,
  });

  useEffect(() => {
    if (!abierto) return;
    setBusqueda("");
    setSeleccionados([]);
    api("/api/usuarios")
      .then((datos) =>
        setTodos(datos.filter((u) => u.perfiles?.includes("docente") && u.academia_id !== academiaActualId)),
      )
      .catch(() => setTodos([]));
  }, [abierto, academiaActualId]);

  if (!abierto) return null;

  const consulta = normalizar(busqueda.trim());
  const filtrados = (todos ?? []).filter(
    (u) => !consulta || normalizar(nombreCompleto(u)).includes(consulta) || normalizar(u.correo).includes(consulta),
  );

  function alternar(id) {
    setSeleccionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-agregar-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialogo-agregar-titulo" className="text-lg font-semibold text-slate-900">
          Agregar docente existente
        </h2>
        <input
          ref={inputRef}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar docente"
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
        />

        {!todos ? (
          <p className="mt-4 text-sm text-slate-400">Cargando docentes…</p>
        ) : filtrados.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No hay docentes de otras academias que coincidan.</p>
        ) : (
          <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {filtrados.map((u) => {
              const color = colorDe(u.academia_color);
              return (
                <li key={u.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(u.id)}
                      onChange={() => alternar(u.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{nombreCompleto(u)}</span>
                    <Etiqueta style={{ backgroundColor: color.claro, color: color.hex }}>{u.academia}</Etiqueta>
                  </label>
                </li>
              );
            })}
          </ul>
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
            disabled={seleccionados.length === 0 || procesando}
            onClick={() => onAgregar(seleccionados)}
            style={{ background: GRAD_AZUL }}
            className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-[#1878B6]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando ? "Agregando…" : `Agregar (${seleccionados.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
