import { useEffect, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";

const ESTADOS = {
  registrado: {
    etiqueta: "Registrado",
    variante: "info",
    titulo: "Tu protocolo está registrado",
    texto: "La CATT lo turnará a una Academia para que se asignen los sinodales.",
  },
  en_evaluacion: {
    etiqueta: "En evaluación",
    variante: "alerta",
    titulo: "Tu protocolo está en evaluación",
    texto: "Los sinodales lo están evaluando. Aquí verás el dictamen cuando haya uno.",
  },
  aprobado: {
    etiqueta: "Aprobado",
    variante: "exito",
    titulo: "Tu protocolo fue aprobado",
    texto: "Los 3 sinodales lo aprobaron. Puedes continuar con tu Trabajo Terminal.",
  },
  no_aprobado: {
    etiqueta: "No aprobado",
    variante: "peligro",
    titulo: "Tu protocolo no fue aprobado",
    texto: "Un sinodal lo evaluó como no aprobado. Revisa las observaciones.",
  },
};

const DICTAMEN = {
  aprobado: "Aprobado",
  no_aprobado: "No aprobado",
};

export default function MiProtocolo() {
  const [protocolos, setProtocolos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    api("/api/protocolos/mio")
      .then((data) => setProtocolos(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message));
  }, []);

  if (errorCarga) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        No se pudo cargar tu protocolo. {errorCarga}
      </p>
    );
  }
  if (!protocolos) return <Esqueleto className="h-32 w-full" />;
  if (protocolos.length === 0) return null;

  const actual = protocolos[0];
  const estado = ESTADOS[actual.estado] ?? { etiqueta: actual.estado, variante: "neutro", titulo: actual.titulo, texto: "" };
  const evaluaron = actual.sinodales.filter((s) => s.evaluo).length;

  return (
    <section aria-labelledby="mi-protocolo" className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 id="mi-protocolo" className="text-2xl font-bold text-slate-900">
            Mi protocolo
          </h2>
          <p className="mt-1 text-sm text-slate-500">Estado y dictamen de tu protocolo de Trabajo Terminal</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{actual.titulo}</p>
            <p className="mt-1 text-xs text-slate-500">
              {actual.academia ? actual.academia.nombre : "Aún sin Academia asignada"}
              {actual.directores.length > 0 ? ` · Director: ${actual.directores.map((d) => d.nombre).join(" · ")}` : ""}
            </p>
          </div>
          <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-800">{estado.titulo}</p>
        <p className="mt-1 text-sm text-slate-600">{estado.texto}</p>

        {actual.estado === "en_evaluacion" && actual.sinodales.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {evaluaron} de {actual.sinodales.length} sinodales han entregado su evaluación
          </p>
        )}

        {actual.observaciones.length > 0 && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observaciones de los sinodales
            </p>
            <ul className="mt-2 space-y-2">
              {actual.observaciones.map((o, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-semibold">{o.sinodal}</span>
                  <span className="text-slate-500"> ({DICTAMEN[o.dictamen] ?? o.dictamen}): </span>
                  {o.observaciones}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
