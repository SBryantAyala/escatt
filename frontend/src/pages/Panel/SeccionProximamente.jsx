import { IconoFlujo } from "../../components/iconos";
import { GRAD_AZUL, VIDRIO } from "../../lib/theme";

// Placeholder DENTRO del layout del panel (no una página aparte): se usa
// tanto para secciones aún sin implementar como para "Acceso denegado"
// (RequiereRol).
export default function SeccionProximamente({ titulo, descripcion }) {
  return (
    <div className={`rounded-3xl p-8 text-center ${VIDRIO} bg-white/80`}>
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: GRAD_AZUL }}
      >
        <IconoFlujo className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-800">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{descripcion}</p>
    </div>
  );
}
