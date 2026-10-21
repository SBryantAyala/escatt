import { useCallback, useEffect, useRef, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";

const ESTADOS_VIGENTES = ["registrado", "en_evaluacion", "aprobado"];

const ESTADOS = {
  pendiente: { etiqueta: "En revisión", variante: "alerta" },
  aprobada: { etiqueta: "Aprobada", variante: "exito" },
  rechazada: { etiqueta: "Rechazada", variante: "peligro" },
};

const MAX_MOTIVO = 2000;

const claseInput =
  "min-h-13 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:font-normal placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const claseLabel = "mb-2 block text-sm font-semibold text-slate-800";

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function CambioDirector({ actor }) {
  const aviso = useAviso();
  const [protocolo, setProtocolo] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [candidatos, setCandidatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [saliente, setSaliente] = useState("");
  const [propuesto, setPropuesto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const archivoRef = useRef(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    Promise.all([
      api("/api/protocolos/mio"),
      api("/api/cambios-director/mias"),
      api("/api/protocolos/candidatos-director"),
    ])
      .then(([protocolos, mias, docentes]) => {
        const vigente = (Array.isArray(protocolos) ? protocolos : []).find((p) =>
          ESTADOS_VIGENTES.includes(p.estado),
        );
        setProtocolo(vigente ?? null);
        setSolicitudes(Array.isArray(mias) ? mias : []);
        setCandidatos(Array.isArray(docentes) ? docentes : []);
        if (vigente?.directores.length === 1) setSaliente(String(vigente.directores[0].id));
      })
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Esqueleto className="h-40 w-full" />;
  if (errorCarga) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        No se pudo cargar el cambio de director. {errorCarga}
      </p>
    );
  }
  if (!protocolo) return null;

  // /mias trae las solicitudes de todos los equipos en los que ha estado el
  // alumno; solo cuenta la del protocolo vigente.
  const pendiente = solicitudes.find((s) => s.estado === "pendiente" && s.protocolo.id === protocolo.id);
  const soyResponsable = protocolo.alumno.id === actor?.id;
  const excluidos = new Set([...protocolo.directores, ...protocolo.sinodales].map((p) => p.id));
  const opciones = candidatos.filter((c) => !excluidos.has(c.id));

  async function enviar(e) {
    e.preventDefault();
    const archivo = archivoRef.current?.files?.[0];
    if (!saliente) return aviso.error("Elige el director que se va a sustituir");
    if (!propuesto) return aviso.error("Elige al director propuesto");
    if (!motivo.trim()) return aviso.error("Explica el motivo del cambio");
    if (!archivo) return aviso.error("Adjunta la constancia firmada del acuerdo (PDF, JPG o PNG)");

    const datos = new FormData();
    datos.append("director_saliente_id", saliente);
    datos.append("director_propuesto_id", propuesto);
    datos.append("motivo", motivo.trim());
    datos.append("constancia", archivo);

    setEnviando(true);
    try {
      await api("/api/cambios-director", { method: "POST", body: datos });
      aviso.exito("Solicitud enviada. La CATT la revisará.");
      setPropuesto("");
      setMotivo("");
      if (archivoRef.current) archivoRef.current.value = "";
      cargar();
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function verConstancia(s) {
    descargarArchivo(`/api/cambios-director/${s.id}/constancia`, `constancia-cambio-director-${s.id}`).catch((e) =>
      aviso.error(e.message),
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cambio de director</h2>
          <p className="mt-1 text-sm text-slate-500">Solicita sustituir a uno de los directores de tu protocolo</p>
        </div>
      </div>

      {pendiente ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {soyResponsable ? "Tu solicitud" : "La solicitud de tu equipo"} para sustituir a {pendiente.director_saliente.nombre} por {pendiente.director_propuesto.nombre}{" "}
          está en revisión. No se puede enviar otra hasta que la CATT la resuelva.
        </p>
      ) : !soyResponsable ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Solo el responsable del equipo ({protocolo.alumno.nombre}) puede solicitar el cambio de director.
        </p>
      ) : (
        <form
          onSubmit={enviar}
          noValidate
          className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${enviando ? "opacity-70" : ""}`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={claseLabel}>Director a sustituir</span>
              <select
                value={saliente}
                onChange={(e) => setSaliente(e.target.value)}
                disabled={enviando}
                className={claseInput}
              >
                <option value="">Elige un director</option>
                {protocolo.directores.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={claseLabel}>Director propuesto</span>
              <select
                value={propuesto}
                onChange={(e) => setPropuesto(e.target.value)}
                disabled={enviando}
                className={claseInput}
              >
                <option value="">Elige un docente</option>
                {opciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {c.academia}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className={claseLabel}>Motivo del cambio</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={MAX_MOTIVO}
              disabled={enviando}
              className={claseInput}
            />
          </label>

          <label className="mt-4 block min-w-0">
            <span className={claseLabel}>Constancia firmada del acuerdo (PDF, JPG o PNG, máx. 10 MB)</span>
            <input
              ref={archivoRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={enviando}
              className={`${claseInput} px-3 py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700`}
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="mt-5 min-h-11 rounded-full bg-[#1878B6] px-6 text-sm font-semibold text-white transition hover:bg-[#0F5C8C] disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </button>
        </form>
      )}

      {solicitudes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-bold text-slate-800">Mis solicitudes de cambio</h3>
          <ul className="mt-3 space-y-3">
            {solicitudes.map((s) => {
              const estado = ESTADOS[s.estado];
              return (
                <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {s.director_saliente.nombre} → {s.director_propuesto.nombre}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Enviada el {formatearFecha(s.creado_en)}
                        {s.resuelta_en && ` · Resuelta el ${formatearFecha(s.resuelta_en)}`}
                      </p>
                    </div>
                    <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{s.motivo}</p>
                  {s.observaciones_resolucion && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-semibold">Respuesta de la CATT: </span>
                      {s.observaciones_resolucion}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => verConstancia(s)}
                    className="mt-3 min-h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver constancia
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
