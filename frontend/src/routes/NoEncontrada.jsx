import { Link } from "react-router-dom";
import { useSesion } from "../context/SesionContext";
import { AZUL_CLARO, AZUL_MEDIO, GRAD_AZUL, VIDRIO } from "../lib/theme";

// Ruta inexistente (*): pantalla simple con enlace de vuelta, dentro o fuera
// de sesión.
export default function NoEncontrada() {
  const { usuario } = useSesion();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 text-slate-800">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-24 -top-28 h-120 w-120 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${AZUL_CLARO}55, transparent 70%)` }}
        />
        <div
          className="absolute -right-32 top-1/3 h-136 w-136 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_MEDIO}44, transparent 70%)` }}
        />
      </div>

      <div className={`max-w-sm rounded-3xl p-8 text-center ${VIDRIO} bg-white/85`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0F5C8C]">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Esta página no existe</h1>
        <p className="mt-2 text-sm text-slate-600">
          Revisa la dirección o vuelve a un lugar conocido.
        </p>
        <Link
          to={usuario ? "/panel/inicio" : "/"}
          className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition hover:-translate-y-0.5"
          style={{ backgroundImage: GRAD_AZUL }}
        >
          {usuario ? "Ir al panel" : "Ir al inicio"}
        </Link>
      </div>
    </div>
  );
}
