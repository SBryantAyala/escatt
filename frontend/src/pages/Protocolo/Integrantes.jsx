import Etiqueta from "../../components/ui/Etiqueta";
import { integrantesDe } from "../../lib/integrantes";

// Alumnos del equipo de un protocolo. Con uno solo se ve igual que antes (una
// línea); con varios, una línea por integrante y el responsable marcado.
export default function Integrantes({ protocolo, conBoleta = true, className = "" }) {
  const equipo = integrantesDe(protocolo);
  if (equipo.length === 0) return null;
  const varios = equipo.length > 1;

  return (
    <ul className={`space-y-1 text-sm text-slate-600 ${className}`} aria-label={varios ? "Integrantes del equipo" : undefined}>
      {equipo.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span>
            {[i.nombre, conBoleta ? i.boleta : null, i.carrera].filter(Boolean).join(" · ")}
          </span>
          {varios && i.es_responsable && <Etiqueta variante="info">Responsable</Etiqueta>}
        </li>
      ))}
    </ul>
  );
}
