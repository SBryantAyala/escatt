import { useCallback, useEffect, useRef, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";

const ESTADOS = {
  pendiente: { etiqueta: "En revisión", variante: "alerta" },
  aprobada: { etiqueta: "Aprobada", variante: "exito" },
  rechazada: { etiqueta: "Rechazada", variante: "peligro" },
};

// Estados en los que el título se puede cambiar (como en el backend).
const ESTADOS_CAMBIABLES = ["registrado", "en_evaluacion", "no_aprobado"];
const MAX_TITULO = 300;
const MAX_MOTIVO = 2000;

const claseInput =
  "min-h-13 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:font-normal placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const claseArchivo = `${claseInput} px-3 py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700`;
const claseLabel = "mb-2 block text-sm font-semibold text-slate-800";
const claseBotonSecundario =
  "min-h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

// Qué le pasa a la evaluación si la CATT aprueba el cambio, según el estado.
const AVISO_REINICIO = {
  registrado: "Tu protocolo todavía no se evalúa: solo cambiará el título.",
  en_evaluacion:
    "Si la CATT lo aprueba, la evaluación vuelve a empezar: los dictámenes que ya hayan entregado tus sinodales se archivan y cada uno evalúa de nuevo.",
  no_aprobado:
    "Si la CATT lo aprueba, tu protocolo vuelve a evaluación con los mismos sinodales, que lo evalúan de nuevo con el título nuevo.",
};

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function CambioTitulo({ actor }) {
  const aviso = useAviso();
  const [protocolo, setProtocolo] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const constanciaRef = useRef(null);
  const protocoloRef = useRef(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    Promise.all([api("/api/protocolos/mio"), api("/api/cambios-titulo/mias")])
      .then(([protocolos, mias]) => {
        // Igual que el backend: el más reciente del que es responsable y que
        // admite el cambio; si no hay, el más reciente (/mio ya viene así).
        const lista = Array.isArray(protocolos) ? protocolos : [];
        const propio = lista.find((p) => p.alumno.id === actor?.id && ESTADOS_CAMBIABLES.includes(p.estado));
        setProtocolo(propio ?? lista[0] ?? null);
        setSolicitudes(Array.isArray(mias) ? mias : []);
      })
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, [actor?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Esqueleto className="h-40 w-full" />;
  if (errorCarga) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        No se pudo cargar el cambio de título. {errorCarga}
      </p>
    );
  }
  if (!protocolo) return null;

  // /mias trae las solicitudes de todos los equipos en los que ha estado el
  // alumno; solo cuenta la de su protocolo actual.
  const pendiente = solicitudes.find((s) => s.estado === "pendiente" && s.protocolo.id === protocolo.id);
  const soyResponsable = protocolo.alumno.id === actor?.id;
  const puedeSolicitar = protocolo.estado !== "aprobado";
  // Con el protocolo aprobado el título ya no cambia (Art. 44); solo se
  // muestra la sección si hay historial que consultar.
  if (!puedeSolicitar && solicitudes.length === 0) return null;

  async function enviar(e) {
    e.preventDefault();
    const constancia = constanciaRef.current?.files?.[0];
    const corregido = protocoloRef.current?.files?.[0];
    if (!titulo.trim()) return aviso.error("Escribe el nuevo título");
    if (!motivo.trim()) return aviso.error("Explica el motivo del cambio");
    if (!constancia) return aviso.error("Adjunta el formato de cambio de título firmado (PDF, JPG o PNG)");

    const datos = new FormData();
    datos.append("titulo_propuesto", titulo.trim());
    datos.append("motivo", motivo.trim());
    datos.append("constancia", constancia);
    if (corregido) datos.append("protocolo", corregido);

    setEnviando(true);
    try {
      await api("/api/cambios-titulo", { method: "POST", body: datos });
      aviso.exito("Solicitud enviada. La CATT la revisará.");
      setTitulo("");
      setMotivo("");
      if (constanciaRef.current) constanciaRef.current.value = "";
      if (protocoloRef.current) protocoloRef.current.value = "";
      cargar();
    } catch (err) {
      aviso.error(err.message);
      if (err.status === 409) cargar();
    } finally {
      setEnviando(false);
    }
  }

  function descargar(s, documento) {
    descargarArchivo(`/api/cambios-titulo/${s.id}/${documento}`, `${documento}-cambio-titulo-${s.id}`).catch((e) =>
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
          <h2 className="text-2xl font-bold text-slate-900">Cambio de título</h2>
          <p className="mt-1 text-sm text-slate-500">
            Si tus sinodales o directores observaron el título, solicita cambiarlo y presentarlo de nuevo
          </p>
        </div>
      </div>

      {pendiente ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {soyResponsable ? "Tu solicitud" : "La solicitud de tu equipo"} para cambiar el título a «{pendiente.titulo_propuesto}» está en revisión. No puedes enviar otra
          hasta que la CATT la resuelva.
        </p>
      ) : (
        puedeSolicitar &&
        !soyResponsable && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Solo el responsable del equipo ({protocolo.alumno.nombre}) puede solicitar el cambio de título. Aquí verás
            el resultado.
          </p>
        )
      )}
      {!pendiente && puedeSolicitar && soyResponsable && (
          <form
            onSubmit={enviar}
            noValidate
            className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${enviando ? "opacity-70" : ""}`}
          >
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Título actual: </span>
              {protocolo.titulo}
            </p>
            <p className="mt-2 text-sm text-slate-500">{AVISO_REINICIO[protocolo.estado]}</p>

            <label className="mt-4 block">
              <span className={claseLabel}>Nuevo título</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={MAX_TITULO}
                disabled={enviando}
                className={claseInput}
              />
            </label>

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

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className={claseLabel}>Formato de cambio de título firmado (PDF, JPG o PNG, máx. 10 MB)</span>
                <input
                  ref={constanciaRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={enviando}
                  className={claseArchivo}
                />
              </label>
              <label className="block min-w-0">
                <span className={claseLabel}>Protocolo corregido, opcional (PDF, JPG o PNG)</span>
                <input
                  ref={protocoloRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={enviando}
                  className={claseArchivo}
                />
              </label>
            </div>

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
          <h3 className="text-base font-bold text-slate-800">Mis solicitudes de cambio de título</h3>
          <ul className="mt-3 space-y-3">
            {solicitudes.map((s) => {
              const estado = ESTADOS[s.estado];
              return (
                <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500 line-through">{s.titulo_anterior}</p>
                      <p className="font-semibold text-slate-800">{s.titulo_propuesto}</p>
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => descargar(s, "constancia")} className={claseBotonSecundario}>
                      Ver formato firmado
                    </button>
                    {s.tiene_protocolo && (
                      <button type="button" onClick={() => descargar(s, "protocolo")} className={claseBotonSecundario}>
                        Ver protocolo corregido
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
