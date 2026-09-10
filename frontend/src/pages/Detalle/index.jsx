import { VIDRIO } from "../../lib/theme";

// Pantalla: Detalle
// Responsable: (ver Notion / Plan-de-Proyecto-Sprint1.md, seccion 7)
// Consume la API bajo /api/usuarios segun el contrato acordado.
//
// Ya está enganchada como ruta interna del panel (pages/Panel, sección
// "detalle", oculta del sidebar). La idea es que se llegue a ella desde una
// fila del listado; hoy sigue siendo un placeholder.

export default function DetallePage() {
  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <h1 className="text-xl font-bold text-slate-800">Detalle de usuario</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pantalla pendiente de implementar. Mostrará la ficha de un usuario de{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/api/usuarios</code>.
      </p>
    </div>
  );
}
