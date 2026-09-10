import { VIDRIO } from "../../lib/theme";

// Pantalla: Alta
// Responsable: (ver Notion / Plan-de-Proyecto-Sprint1.md, seccion 7)
// Consume la API bajo /api/usuarios segun el contrato acordado.
//
// Ya está enganchada como la sección "Alta" del panel (pages/Panel). Sigue
// siendo un placeholder: cuando se implemente, aparecerá aquí sin tocar el
// layout ni la navegación.

export default function AltaPage() {
  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <h1 className="text-xl font-bold text-slate-800">Alta de usuario</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pantalla pendiente de implementar. Registrará participantes contra{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/api/usuarios</code>.
      </p>
    </div>
  );
}
