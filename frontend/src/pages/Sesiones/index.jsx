import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import Pestanas, { usePestanaUrl } from "../../components/ui/Pestanas";
import { useAviso } from "../../components/ui/Avisos";
import { IconoCalendario } from "../../components/iconos";
import { api } from "../../lib/api";
import { ROLES_GESTION, tieneRol } from "../../lib/roles";
import { claseBotonPrimario, claseBotonSecundario, claseInput, claseLabel, claseTarjeta } from "./estilos";
import {
  ESTADOS_ACUERDO,
  ESTADOS_SESION,
  TIPOS_SESION,
  estaVencido,
  formatearDia,
  formatearFechaHora,
} from "./formato";

const PESTANAS = [
  { id: "sesiones", etiqueta: "Sesiones" },
  { id: "acuerdos", etiqueta: "Acuerdos abiertos" },
];

function FormularioConvocatoria({ onCancelar }) {
  const aviso = useAviso();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState("ordinaria");
  const [fechaHora, setFechaHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [orden, setOrden] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!fechaHora) return aviso.error("Indica la fecha y la hora de la sesión");
    setEnviando(true);
    try {
      const creada = await api("/api/sesiones", {
        method: "POST",
        body: {
          tipo,
          fecha_hora: new Date(fechaHora).toISOString(),
          lugar: lugar.trim() || undefined,
          orden_del_dia: orden.trim() || undefined,
        },
      });
      aviso.exito("Sesión creada con la lista de integrantes.");
      navigate(`/panel/sesiones/${creada.id}`);
    } catch (err) {
      aviso.error(err.message);
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label="Convocar sesión"
      className={`mt-6 ${claseTarjeta} ${enviando ? "opacity-70" : ""}`}
    >
      <h2 className="text-base font-bold text-slate-800">Convocar sesión</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={claseLabel}>Fecha y hora</span>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            disabled={enviando}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={enviando} className={claseInput}>
            {Object.entries(TIPOS_SESION).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block">
        <span className={claseLabel}>Lugar</span>
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          maxLength={200}
          disabled={enviando}
          className={claseInput}
        />
      </label>
      <label className="mt-4 block">
        <span className={claseLabel}>Orden del día</span>
        <textarea
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          rows={4}
          maxLength={5000}
          disabled={enviando}
          className={claseInput}
        />
      </label>
      <p className="mt-3 text-xs text-slate-500">
        Al crearla se copian los Presidentes de Academia, los expresidentes inmediatos y los integrantes que agregaste
        en la sesión anterior.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={claseBotonPrimario}>
          {enviando ? "Creando…" : "Crear sesión"}
        </button>
        <button type="button" onClick={onCancelar} disabled={enviando} className={claseBotonSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ListaSesiones({ sesiones }) {
  if (sesiones.length === 0) return <p className="mt-6 text-sm text-slate-400">Todavía no hay sesiones registradas.</p>;
  return (
    <ul className="mt-6 space-y-3">
      {sesiones.map((s) => {
        const estado = ESTADOS_SESION[s.estado];
        return (
          <li key={s.id}>
            <Link
              to={`/panel/sesiones/${s.id}`}
              className={`block ${claseTarjeta} transition hover:border-blue-300 hover:shadow-sm`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    Sesión {TIPOS_SESION[s.tipo].toLowerCase()} · {formatearFechaHora(s.fecha_hora)}
                  </p>
                  {s.lugar && <p className="mt-1 text-sm text-slate-600">{s.lugar}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {s.estado === "realizada"
                      ? `${s.asistieron} de ${s.total_asistentes} integrantes presentes`
                      : `${s.total_asistentes} integrantes convocados`}
                    {` · ${s.total_acuerdos} ${s.total_acuerdos === 1 ? "acuerdo" : "acuerdos"}`}
                    {s.acuerdos_abiertos > 0 && ` (${s.acuerdos_abiertos} abiertos)`}
                    {s.tiene_minuta && " · con minuta"}
                  </p>
                </div>
                <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const FILTROS_ACUERDO = [
  { valor: "abiertos", etiqueta: "Abiertos" },
  { valor: "cumplido", etiqueta: "Cumplidos" },
  { valor: "cancelado", etiqueta: "Cancelados" },
  { valor: "", etiqueta: "Todos" },
];

function ListaAcuerdos() {
  const [filtro, setFiltro] = useState("abiertos");
  const [acuerdos, setAcuerdos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    let vivo = true;
    api(`/api/sesiones/acuerdos${filtro ? `?estado=${filtro}` : ""}`)
      .then((datos) => {
        if (vivo) setAcuerdos(Array.isArray(datos) ? datos : []);
      })
      .catch((e) => {
        if (vivo) setErrorCarga(e.message);
      });
    return () => {
      vivo = false;
    };
  }, [filtro]);

  function cambiarFiltro(valor) {
    setAcuerdos(null);
    setErrorCarga(null);
    setFiltro(valor);
  }

  return (
    <div className="mt-6">
      <label className="block max-w-xs">
        <span className={claseLabel}>Mostrar</span>
        <select value={filtro} onChange={(e) => cambiarFiltro(e.target.value)} className={claseInput}>
          {FILTROS_ACUERDO.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.etiqueta}
            </option>
          ))}
        </select>
      </label>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar los acuerdos. {errorCarga}
        </p>
      )}
      {!acuerdos && !errorCarga && <Esqueleto className="mt-4 h-24 w-full" />}
      {acuerdos && acuerdos.length === 0 && <p className="mt-4 text-sm text-slate-400">No hay acuerdos en este filtro.</p>}
      {acuerdos && acuerdos.length > 0 && (
        <ul className="mt-4 space-y-3">
          {acuerdos.map((a) => {
            const estado = ESTADOS_ACUERDO[a.estado];
            return (
              <li key={a.id} className={claseTarjeta}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 whitespace-pre-line text-sm text-slate-800">
                    <span className="font-semibold">Acuerdo {a.numero}. </span>
                    {a.descripcion}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {estaVencido(a) && <Etiqueta variante="peligro">Vencido</Etiqueta>}
                    <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  <Link to={`/panel/sesiones/${a.sesion.id}`} className="font-semibold text-[#1878B6] hover:underline">
                    Sesión del {formatearFechaHora(a.sesion.fecha_hora)}
                  </Link>
                  {a.responsable && ` · Responsable: ${a.responsable}`}
                  {a.fecha_compromiso && ` · Compromiso: ${formatearDia(a.fecha_compromiso)}`}
                  {a.protocolo && ` · Protocolo: ${a.protocolo.titulo}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function SesionesPage({ actor }) {
  const puedeGestionar = tieneRol(actor, ...ROLES_GESTION);
  const [activa, cambiar] = usePestanaUrl(PESTANAS);
  const [sesiones, setSesiones] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [convocando, setConvocando] = useState(false);

  const cargar = useCallback(() => {
    api("/api/sesiones")
      .then((datos) => setSesiones(Array.isArray(datos) ? datos : []))
      .catch((e) => setErrorCarga(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
            <IconoCalendario className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sesiones de la CATT</h1>
            <p className="mt-1 text-sm text-slate-500">Convocatorias, asistencia, acuerdos y minutas</p>
          </div>
        </div>
        {puedeGestionar && !convocando && (
          <button type="button" onClick={() => setConvocando(true)} className={claseBotonPrimario}>
            Convocar sesión
          </button>
        )}
      </div>

      {convocando && <FormularioConvocatoria onCancelar={() => setConvocando(false)} />}

      <div className="mt-6">
        <Pestanas pestanas={PESTANAS} activa={activa} onCambiar={cambiar} idBase="sesiones" />
        <div role="tabpanel" id={`sesiones-panel-${activa}`} aria-labelledby={`sesiones-tab-${activa}`}>
          {activa === "sesiones" && (
            <>
              {errorCarga && (
                <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  No se pudieron cargar las sesiones. {errorCarga}
                </p>
              )}
              {!sesiones && !errorCarga && <Esqueleto className="mt-6 h-24 w-full" />}
              {sesiones && <ListaSesiones sesiones={sesiones} />}
            </>
          )}
          {activa === "acuerdos" && <ListaAcuerdos />}
        </div>
      </div>
    </div>
  );
}
