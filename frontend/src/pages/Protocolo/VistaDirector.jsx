import { useEffect, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";

// Pantalla: protocolos que dirijo y su estado (HU-25). Solo lectura: el
// director da seguimiento, no edita el protocolo. Consume
// GET /api/protocolos/dirigidos, que ya filtra por la sesión.

const ESTADOS = {
  registrado: { etiqueta: "Registrado", variante: "info" },
  en_evaluacion: { etiqueta: "En evaluación", variante: "alerta" },
  aprobado: { etiqueta: "Aprobado", variante: "exito" },
  no_aprobado: { etiqueta: "No aprobado", variante: "peligro" },
};

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function VistaDirector() {
  const [protocolos, setProtocolos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    api("/api/protocolos/dirigidos")
      .then((data) => setProtocolos(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message));
  }, []);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Protocolos que dirijo</h2>
          <p className="mt-1 text-sm text-slate-500">Consulta de solo lectura del estado de cada protocolo</p>
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar tus protocolos. {errorCarga}
        </p>
      )}

      {!protocolos && !errorCarga && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Esqueleto key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {protocolos && protocolos.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">Todavía no diriges ningún protocolo.</p>
      )}

      {protocolos && protocolos.length > 0 && (
        <ul className="mt-6 space-y-3">
          {protocolos.map((p) => {
            const estado = ESTADOS[p.estado] ?? { etiqueta: p.estado, variante: "neutro" };
            const otros = p.directores.length > 1 ? p.directores.map((d) => d.nombre).join(" · ") : null;
            return (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{p.titulo}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {p.alumno.nombre} · {p.alumno.boleta} · {p.alumno.carrera}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Registrado el {formatearFecha(p.creado_en)}
                      {otros ? ` · Directores: ${otros}` : ""}
                    </p>
                  </div>
                  <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                </div>

                {p.observaciones.length > 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Observaciones de los sinodales
                    </p>
                    <ul className="mt-2 space-y-2">
                      {p.observaciones.map((o, i) => (
                        <li key={i} className="text-sm text-slate-700">
                          {o.sinodal && <span className="font-semibold">{o.sinodal}: </span>}
                          {o.observaciones}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
