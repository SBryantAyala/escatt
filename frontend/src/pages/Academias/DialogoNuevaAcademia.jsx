import { useEffect, useRef, useState } from "react";
import useDialogoAccesible from "../../components/ui/useDialogoAccesible";
import { CLAVES_COLOR_ACADEMIA, ICONOS_ACADEMIA } from "../../lib/academias";
import { AZUL_MEDIO } from "../../lib/theme";
import SelectorColorIcono from "./SelectorColorIcono";

// Diálogo para dar de alta una academia: nombre, departamento, color e
// ícono (con vista previa en vivo).
export default function DialogoNuevaAcademia({ abierto, onCerrar, onCrear, creando }) {
  const [nombre, setNombre] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [color, setColor] = useState(CLAVES_COLOR_ACADEMIA[0]);
  const [icono, setIcono] = useState(ICONOS_ACADEMIA[0]);
  const inputRef = useRef(null);
  const contenedorRef = useDialogoAccesible(abierto, onCerrar, {
    enfocarAlAbrir: () => inputRef.current,
  });

  useEffect(() => {
    if (!abierto) return;
    setNombre("");
    setDepartamento("");
    setColor(CLAVES_COLOR_ACADEMIA[0]);
    setIcono(ICONOS_ACADEMIA[0]);
  }, [abierto]);

  if (!abierto) return null;

  function enviar(e) {
    e.preventDefault();
    if (!nombre.trim() || creando) return;
    onCrear({ nombre: nombre.trim(), departamento: departamento.trim(), color, icono });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCerrar}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-nueva-academia-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialogo-nueva-academia-titulo" className="text-lg font-semibold text-slate-900">
          Nueva academia
        </h2>
        <form onSubmit={enviar} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nombre
            </span>
            <input
              ref={inputRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Departamento (opcional)
            </span>
            <input
              type="text"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
            />
          </label>

          <SelectorColorIcono
            nombre={nombre}
            color={color}
            icono={icono}
            onCambiarColor={setColor}
            onCambiarIcono={setIcono}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={creando}
              className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creando || !nombre.trim()}
              style={{ backgroundColor: AZUL_MEDIO }}
              className="min-h-11 rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-[#1878B6]/30 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creando ? "Creando…" : "Crear academia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
