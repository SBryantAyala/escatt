import { ICONO_ACADEMIA_COMPONENTE } from "../../components/iconosAcademia";
import {
  CLAVES_COLOR_ACADEMIA,
  COLORES_ACADEMIA,
  ETIQUETA_ICONO_ACADEMIA,
  ICONOS_ACADEMIA,
  colorDe,
} from "../../lib/academias";

// Selector de color + ícono con vista previa en vivo de la tarjeta, usado
// tanto en "Nueva academia" como en Configuración de la ficha. Muestras de
// color clicables (radio, aria-label con el nombre) y una cuadrícula de
// íconos, igual de accesibles.
export default function SelectorColorIcono({ nombre, color, icono, onCambiarColor, onCambiarIcono }) {
  const colorActual = colorDe(color);
  const IconoActual = ICONO_ACADEMIA_COMPONENTE[icono] ?? ICONO_ACADEMIA_COMPONENTE.codigo;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Color</p>
        <div role="radiogroup" aria-label="Color de la academia" className="flex flex-wrap gap-2">
          {CLAVES_COLOR_ACADEMIA.map((clave) => {
            const c = COLORES_ACADEMIA[clave];
            const seleccionado = clave === color;
            return (
              <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                aria-label={c.nombre}
                onClick={() => onCambiarColor(clave)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 ${
                  seleccionado ? "ring-2 ring-offset-2 ring-slate-900" : ""
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {seleccionado && (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ícono</p>
        <div role="radiogroup" aria-label="Ícono de la academia" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ICONOS_ACADEMIA.map((clave) => {
            const Icono = ICONO_ACADEMIA_COMPONENTE[clave];
            const seleccionado = clave === icono;
            return (
              <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                aria-label={ETIQUETA_ICONO_ACADEMIA[clave]}
                onClick={() => onCambiarIcono(clave)}
                className={`flex min-h-11 items-center justify-center rounded-xl border p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 ${
                  seleccionado
                    ? "border-slate-900 bg-slate-100 text-slate-900"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icono className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa</p>
        <div className="w-48 overflow-hidden rounded-[20px] shadow-md">
          <div className="flex items-center gap-3 px-4 py-5" style={{ backgroundColor: colorActual.hex }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/25">
              <IconoActual className="h-5 w-5 text-white" />
            </span>
            <span className="truncate text-sm font-bold text-white">{nombre || "Nombre de la academia"}</span>
          </div>
          <div className="bg-white p-3">
            <p className="text-xs text-slate-400">Así se verá la tarjeta.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
