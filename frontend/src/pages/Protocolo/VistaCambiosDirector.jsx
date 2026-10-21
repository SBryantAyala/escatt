import { useCallback, useEffect, useState } from "react";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";
import { nombreDirector } from "../../lib/directores";
import { tieneRol } from "../../lib/roles";
import Integrantes from "./Integrantes";
import { claseBotonSecundario } from "./estilos";

const ESTADOS = {
  pendiente: { etiqueta: "Pendiente", variante: "alerta" },
  aprobada: { etiqueta: "Aprobada", variante: "exito" },
  rechazada: { etiqueta: "Rechazada", variante: "peligro" },
};

const MAX_OBSERVACIONES = 2000;

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

function DetalleExterno({ director, etiqueta }) {
  const aviso = useAviso();

  function descargar(documento) {
    descargarArchivo(
      `/api/directores-externos/${director.externo_id}/${documento}`,
      `${documento}-director-externo-${director.externo_id}`,
    ).catch((e) => aviso.error(e.message));
  }

  return (
    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta} · director externo</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{director.nombre}</p>
      <p className="text-sm text-slate-600">
        {director.institucion}
        {director.correo && ` · ${director.correo}`}
        {director.cedula_numero && ` · Cédula ${director.cedula_numero}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => descargar("cedula")}
          className={`${claseBotonSecundario} bg-white`}
        >
          Ver cédula
        </button>
        <button
          type="button"
          onClick={() => descargar("curriculum")}
          className={`${claseBotonSecundario} bg-white`}
        >
          Ver currículum
        </button>
      </div>
    </div>
  );
}

function Solicitud({ solicitud, puedeResolver, onResuelta, onDesactualizada }) {
  const aviso = useAviso();
  const [rechazando, setRechazando] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [aprobando, setAprobando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const estado = ESTADOS[solicitud.estado];

  async function resolver(decision) {
    if (decision === "rechazada" && !observaciones.trim()) {
      return aviso.error("Escribe el motivo del rechazo");
    }
    setEnviando(true);
    try {
      const actualizada = await api(`/api/cambios-director/${solicitud.id}`, {
        method: "PATCH",
        body: { decision, observaciones: observaciones.trim() || undefined },
      });
      aviso.exito(decision === "aprobada" ? "Cambio de director aprobado." : "Solicitud rechazada.");
      setAprobando(false);
      setRechazando(false);
      onResuelta(actualizada);
    } catch (err) {
      setAprobando(false);
      aviso.error(err.message);
      // 409: otra persona de la CATT la resolvió primero (o cambió el
      // protocolo). Se recarga la lista para mostrar el estado real.
      if (err.status === 409) {
        setRechazando(false);
        onDesactualizada();
      }
    } finally {
      setEnviando(false);
    }
  }

  function verConstancia() {
    descargarArchivo(`/api/cambios-director/${solicitud.id}/constancia`, `constancia-cambio-director-${solicitud.id}`).catch(
      (e) => aviso.error(e.message),
    );
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{solicitud.protocolo.titulo}</p>
          <Integrantes protocolo={solicitud} className="mt-1" />
          <p className="mt-1 text-sm text-slate-700">
            {nombreDirector(solicitud.director_saliente)} → {nombreDirector(solicitud.director_propuesto)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Enviada el {formatearFecha(solicitud.creado_en)}
            {solicitud.resuelta_en &&
              ` · Resuelta el ${formatearFecha(solicitud.resuelta_en)}${solicitud.resuelta_por ? ` por ${solicitud.resuelta_por}` : ""}`}
          </p>
        </div>
        <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
      </div>

      {solicitud.director_saliente.externo && <DetalleExterno director={solicitud.director_saliente} etiqueta="Saliente" />}
      {solicitud.director_propuesto.externo && (
        <DetalleExterno director={solicitud.director_propuesto} etiqueta="Propuesto" />
      )}

      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{solicitud.motivo}</p>
      {solicitud.observaciones_resolucion && (
        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{solicitud.observaciones_resolucion}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={verConstancia}
          className={claseBotonSecundario}
        >
          Ver constancia
        </button>
        {puedeResolver && solicitud.estado === "pendiente" && !rechazando && (
          <>
            <button
              type="button"
              onClick={() => setAprobando(true)}
              className="min-h-10 rounded-full bg-[#1878B6] px-4 text-sm font-semibold text-white transition hover:bg-[#0F5C8C]"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setRechazando(true)}
              className="min-h-10 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Rechazar
            </button>
          </>
        )}
      </div>

      {rechazando && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label htmlFor={`rechazo-${solicitud.id}`} className="block text-sm font-semibold text-slate-800">
            Motivo del rechazo
          </label>
          <textarea
            id={`rechazo-${solicitud.id}`}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            maxLength={MAX_OBSERVACIONES}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1878B6] focus:ring-4 focus:ring-[#4FB3E8]/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => resolver("rechazada")}
              className="min-h-10 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Confirmar rechazo
            </button>
            <button
              type="button"
              onClick={() => setRechazando(false)}
              className="min-h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={aprobando}
        titulo="¿Aprobar el cambio de director?"
        descripcion={`${nombreDirector(solicitud.director_propuesto)} sustituirá a ${nombreDirector(solicitud.director_saliente)} como director de «${solicitud.protocolo.titulo}».`}
        etiquetaConfirmar="Aprobar"
        cargando={enviando}
        onConfirmar={() => resolver("aprobada")}
        onCancelar={() => setAprobando(false)}
      />
    </li>
  );
}

export default function VistaCambiosDirector({ actor }) {
  const [solicitudes, setSolicitudes] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const puedeResolver = tieneRol(actor, "catt_ejecutivo", "catt_auxiliar");

  const cargar = useCallback(() => {
    api("/api/cambios-director")
      .then((data) => setSolicitudes(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function reemplazar(actualizada) {
    setSolicitudes((lista) => lista.map((s) => (s.id === actualizada.id ? actualizada : s)));
  }

  const pendientes = solicitudes?.filter((s) => s.estado === "pendiente").length ?? 0;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cambios de director</h2>
          <p className="mt-1 text-sm text-slate-500">
            {solicitudes && pendientes > 0
              ? `${pendientes} ${pendientes === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`
              : "Solicitudes de los alumnos"}
          </p>
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar las solicitudes. {errorCarga}
        </p>
      )}

      {!solicitudes && !errorCarga && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {solicitudes && solicitudes.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">No hay solicitudes de cambio de director.</p>
      )}

      {solicitudes && solicitudes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {solicitudes.map((s) => (
            <Solicitud
              key={s.id}
              solicitud={s}
              puedeResolver={puedeResolver}
              onResuelta={reemplazar}
              onDesactualizada={cargar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
