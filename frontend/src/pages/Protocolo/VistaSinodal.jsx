import { useEffect, useState } from "react";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";
import { estadoDe } from "./estados";
import Integrantes from "./Integrantes";

// Pantalla: protocolos que evalúo como sinodal (HU-21). Consume
// GET /api/protocolos/por-evaluar (ya filtra por la sesión y trae primero los
// pendientes) y POST /api/protocolos/:id/evaluacion. Una evaluación entregada
// no se puede modificar, por eso se confirma antes de enviarla.
//
// `encabezado={false}` la deja sin título cuando vive dentro de las pestañas
// de "Mis protocolos" (VistaDocente); `onCargado` le avisa la lista actual.

const DICTAMENES = {
  aprobado: { etiqueta: "Aprobado", variante: "exito" },
  no_aprobado: { etiqueta: "No aprobado", variante: "peligro" },
};

const MAX_OBSERVACIONES = 5000;

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

function FormularioEvaluacion({ protocolo, onEntregada }) {
  const aviso = useAviso();
  const [dictamen, setDictamen] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const idBase = `evaluacion-${protocolo.id}`;
  const obligatorias = dictamen === "no_aprobado";

  function revisar(e) {
    e.preventDefault();
    if (!dictamen) return setError("Elige si el protocolo se aprueba o no.");
    if (obligatorias && !observaciones.trim()) {
      return setError("Escribe tus observaciones para marcar el protocolo como no aprobado.");
    }
    setError(null);
    setConfirmando(true);
  }

  async function entregar() {
    setEnviando(true);
    try {
      const actualizado = await api(`/api/protocolos/${protocolo.id}/evaluacion`, {
        method: "POST",
        body: { dictamen, observaciones: observaciones.trim() || undefined },
      });
      aviso.exito("Evaluación entregada.");
      setConfirmando(false);
      onEntregada(actualizado);
    } catch (err) {
      setConfirmando(false);
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={revisar} noValidate className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Tu evaluación</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(DICTAMENES).map(([valor, { etiqueta }]) => (
            <label
              key={valor}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                dictamen === valor
                  ? valor === "aprobado"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-red-300 bg-red-50 text-red-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name={`${idBase}-dictamen`}
                value={valor}
                checked={dictamen === valor}
                onChange={() => setDictamen(valor)}
                className="h-4 w-4 accent-[#1878B6]"
              />
              {etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={`${idBase}-observaciones`} className="mt-4 block text-sm font-semibold text-slate-800">
        Observaciones {obligatorias ? "(obligatorias)" : "(opcionales)"}
      </label>
      <textarea
        id={`${idBase}-observaciones`}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        rows={3}
        maxLength={MAX_OBSERVACIONES}
        aria-invalid={Boolean(error && obligatorias && !observaciones.trim())}
        aria-describedby={error ? `${idBase}-error` : undefined}
        placeholder={obligatorias ? "Explica qué debe corregir el alumno" : "Comentarios para el alumno y su director"}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1878B6] focus:ring-4 focus:ring-[#4FB3E8]/30"
      />

      {error && (
        <p id={`${idBase}-error`} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="min-h-11 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white transition hover:bg-[#0F5C8C]"
        >
          Entregar evaluación
        </button>
        <p className="text-xs text-slate-500">Una vez entregada no podrás modificarla.</p>
      </div>

      <DialogoConfirmacion
        abierto={confirmando}
        titulo="¿Entregar tu evaluación?"
        descripcion={`Vas a marcar «${protocolo.titulo}» como ${DICTAMENES[dictamen]?.etiqueta.toLowerCase()}. Después no podrás modificarla.`}
        etiquetaConfirmar="Entregar"
        cargando={enviando}
        onConfirmar={entregar}
        onCancelar={() => setConfirmando(false)}
      />
    </form>
  );
}

export default function VistaSinodal({ encabezado = true, onCargado }) {
  const aviso = useAviso();
  const [protocolos, setProtocolos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    api("/api/protocolos/por-evaluar")
      .then((data) => setProtocolos(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message));
  }, []);

  useEffect(() => {
    if (protocolos) onCargado?.(protocolos);
  }, [protocolos, onCargado]);

  function reemplazar(actualizado) {
    setProtocolos((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)));
  }

  function verVistoBueno(p) {
    descargarArchivo(`/api/protocolos/${p.id}/visto-bueno`, `visto-bueno-protocolo-${p.id}`).catch((e) =>
      aviso.error(e.message),
    );
  }

  const pendientes = protocolos?.filter((p) => !p.mi_evaluacion && p.estado === "en_evaluacion").length ?? 0;

  return (
    <div className="min-w-0">
      {encabezado && (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
            <IconoDocumento className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Protocolos que evalúo</h2>
            <p className="mt-1 text-sm text-slate-500">
              {protocolos && pendientes > 0
                ? `Tienes ${pendientes} ${pendientes === 1 ? "evaluación pendiente" : "evaluaciones pendientes"}`
                : "Protocolos donde eres sinodal"}
            </p>
          </div>
        </div>
      )}

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar tus protocolos por evaluar. {errorCarga}
        </p>
      )}

      {!protocolos && !errorCarga && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {protocolos && protocolos.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No tienes protocolos asignados como sinodal. Cuando el Presidente de tu academia te asigne uno, aparecerá
          aquí para que lo evalúes.
        </p>
      )}

      {protocolos && protocolos.length > 0 && (
        <ul className="mt-6 space-y-3">
          {protocolos.map((p) => {
            const estado = estadoDe(p.estado);
            const mia = p.mi_evaluacion;
            return (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{p.titulo}</p>
                    <Integrantes protocolo={p} className="mt-1" />
                    <p className="mt-1 text-xs text-slate-500">
                      {p.academia?.nombre ?? "Sin academia"} · Registrado el {formatearFecha(p.creado_en)}
                      {p.directores.length > 0 &&
                        ` · ${p.directores.length > 1 ? "Directores" : "Director"}: ${p.directores
                          .map((d) => d.nombre)
                          .join(" · ")}`}
                    </p>
                  </div>
                  <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                </div>

                {p.resumen && (
                  <details className="mt-3 text-sm text-slate-700">
                    <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-[#1878B6]">
                      Ver resumen
                    </summary>
                    <p className="whitespace-pre-line">{p.resumen}</p>
                  </details>
                )}

                {p.tiene_visto_bueno && (
                  <button
                    type="button"
                    onClick={() => verVistoBueno(p)}
                    className="mt-2 min-h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver visto bueno del director
                  </button>
                )}

                {mia && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">Tu evaluación:</span>
                      <Etiqueta variante={DICTAMENES[mia.dictamen].variante}>
                        {DICTAMENES[mia.dictamen].etiqueta}
                      </Etiqueta>
                      <span className="text-xs text-slate-500">Entregada el {formatearFecha(mia.evaluado_en)}</span>
                    </div>
                    {mia.observaciones && (
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{mia.observaciones}</p>
                    )}
                  </div>
                )}

                {!mia && p.estado === "en_evaluacion" && (
                  <FormularioEvaluacion protocolo={p} onEntregada={reemplazar} />
                )}

                {!mia && p.estado !== "en_evaluacion" && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    Este protocolo ya tiene dictamen; ya no es necesario que lo evalúes.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
