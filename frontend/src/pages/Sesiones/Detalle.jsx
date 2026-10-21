import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoCalendario } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";
import { ROLES_GESTION, tieneRol } from "../../lib/roles";
import {
  claseArchivo,
  claseBotonPrimario,
  claseBotonSecundario,
  claseInput,
  claseLabel,
  claseTarjeta,
} from "./estilos";
import {
  ESTADOS_ACUERDO,
  ESTADOS_SESION,
  TIPOS_SESION,
  estaVencido,
  formatearDia,
  formatearFechaCorta,
  formatearFechaHora,
  valorParaInputFechaHora,
} from "./formato";

function DatosSesion({ sesion, editable, guardando, onGuardar }) {
  const [tipo, setTipo] = useState(sesion.tipo);
  const [fechaHora, setFechaHora] = useState(valorParaInputFechaHora(sesion.fecha_hora));
  const [lugar, setLugar] = useState(sesion.lugar ?? "");
  const [presidida, setPresidida] = useState(sesion.presidida_por ?? "");
  const [orden, setOrden] = useState(sesion.orden_del_dia ?? "");
  const realizada = sesion.estado === "realizada";

  function enviar(e) {
    e.preventDefault();
    const cambios = { lugar: lugar.trim() || null, presidida_por: presidida.trim() || null, orden_del_dia: orden.trim() || null };
    if (!realizada) {
      cambios.tipo = tipo;
      if (fechaHora) cambios.fecha_hora = new Date(fechaHora).toISOString();
    }
    onGuardar(cambios);
  }

  if (!editable) {
    return (
      <section className={claseTarjeta} aria-labelledby="datos-sesion">
        <h2 id="datos-sesion" className="text-base font-bold text-slate-800">
          Datos de la sesión
        </h2>
        <dl className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            <dt className="font-semibold">Lugar</dt>
            <dd>{sesion.lugar ?? "Sin lugar registrado"}</dd>
          </div>
          {sesion.presidida_por && (
            <div>
              <dt className="font-semibold">Presidió</dt>
              <dd>{sesion.presidida_por}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">Orden del día</dt>
            <dd className="whitespace-pre-line">{sesion.orden_del_dia ?? "Sin orden del día registrado"}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className={`${claseTarjeta} ${guardando ? "opacity-70" : ""}`} aria-labelledby="datos-sesion">
      <h2 id="datos-sesion" className="text-base font-bold text-slate-800">
        Datos de la sesión
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={claseLabel}>Fecha y hora</span>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            disabled={guardando || realizada}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={guardando || realizada}
            className={claseInput}
          >
            {Object.entries(TIPOS_SESION).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Lugar</span>
          <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={200} disabled={guardando} className={claseInput} />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Presidió la sesión</span>
          <input
            type="text"
            value={presidida}
            onChange={(e) => setPresidida(e.target.value)}
            maxLength={200}
            placeholder="Ej. Subdirector Académico"
            disabled={guardando}
            className={claseInput}
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className={claseLabel}>Orden del día</span>
        <textarea value={orden} onChange={(e) => setOrden(e.target.value)} rows={4} maxLength={5000} disabled={guardando} className={claseInput} />
      </label>
      <button type="submit" disabled={guardando} className={`mt-4 ${claseBotonPrimario}`}>
        Guardar datos
      </button>
    </form>
  );
}

function Asistencia({ sesion, puedeGestionar, ocupado, onGuardar, onAgregar, onQuitar }) {
  const [presentes, setPresentes] = useState(() => new Set(sesion.asistentes.filter((a) => a.asistio).map((a) => a.id)));
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  // true mientras haya casillas marcadas sin guardar: otras acciones (agregar
  // un invitado, registrar un acuerdo) también traen la sesión de nuevo y no
  // deben borrar lo que el usuario lleva marcado.
  const sucio = useRef(false);
  const editable = puedeGestionar && sesion.estado !== "cancelada";

  useEffect(() => {
    const guardados = new Set(sesion.asistentes.filter((a) => a.asistio).map((a) => a.id));
    setPresentes((previos) => {
      if (!sucio.current) return guardados;
      const vigentes = new Set(sesion.asistentes.map((a) => a.id));
      const siguientes = new Set([...previos].filter((id) => vigentes.has(id)));
      if (siguientes.size === guardados.size && [...siguientes].every((id) => guardados.has(id))) sucio.current = false;
      return siguientes;
    });
  }, [sesion.asistentes]);

  const sinGuardar = sesion.asistentes.some((a) => a.asistio !== presentes.has(a.id));

  function alternar(id) {
    sucio.current = true;
    setPresentes((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  }

  async function agregar(e) {
    e.preventDefault();
    const agregado = await onAgregar(nombre.trim(), cargo.trim());
    if (agregado) {
      setNombre("");
      setCargo("");
    }
  }

  const guardados = sesion.asistentes.filter((a) => a.asistio).length;

  return (
    <section className={claseTarjeta} aria-labelledby="asistencia-sesion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="asistencia-sesion" className="text-base font-bold text-slate-800">
          Integrantes y asistencia
        </h2>
        <span className="text-sm text-slate-500">
          {guardados} de {sesion.asistentes.length} presentes
        </span>
      </div>

      <ul className="mt-3 divide-y divide-slate-100">
        {sesion.asistentes.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2">
            {editable ? (
              <input
                type="checkbox"
                id={`asistente-${a.id}`}
                checked={presentes.has(a.id)}
                onChange={() => alternar(a.id)}
                disabled={ocupado}
                className="h-5 w-5 shrink-0 rounded border-slate-300 accent-[#1878B6]"
              />
            ) : (
              <span
                aria-label={a.asistio ? "Presente" : "Ausente"}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  a.asistio ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                }`}
              >
                {a.asistio ? "✓" : "–"}
              </span>
            )}
            <label htmlFor={`asistente-${a.id}`} className="min-w-0 flex-1 text-sm text-slate-800">
              <span className="font-semibold">{a.nombre}</span>
              <span className="block text-xs text-slate-500">{a.cargo}</span>
            </label>
            {editable && sesion.estado === "convocada" && (
              <button
                type="button"
                onClick={() => onQuitar(a)}
                disabled={ocupado}
                aria-label={`Quitar a ${a.nombre}`}
                className="min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <>
          <button type="button" onClick={() => onGuardar([...presentes])} disabled={ocupado} className={`mt-3 ${claseBotonPrimario}`}>
            Guardar asistencia
          </button>
          {sinGuardar && <p className="mt-2 text-xs font-semibold text-amber-700">Hay cambios de asistencia sin guardar.</p>}

          <form onSubmit={agregar} noValidate className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">Agregar integrante o invitado</p>
            <p className="mt-1 text-xs text-slate-500">
              Para quien no tiene cuenta: Director, Subdirector Académico, Jefes de Departamento. Se conserva para las
              siguientes sesiones.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className={claseLabel}>Nombre</span>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} disabled={ocupado} className={claseInput} />
              </label>
              <label className="block min-w-0">
                <span className={claseLabel}>Cargo</span>
                <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={200} disabled={ocupado} className={claseInput} />
              </label>
            </div>
            <button type="submit" disabled={ocupado} className={`mt-3 ${claseBotonSecundario}`}>
              Agregar
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function Acuerdos({ sesion, puedeGestionar, ocupado, protocolos, onCrear, onCambiar }) {
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [compromiso, setCompromiso] = useState("");
  const [protocoloId, setProtocoloId] = useState("");
  const editable = puedeGestionar && sesion.estado !== "cancelada";
  // Los acuerdos se registran durante la sesión o después, no antes.
  const yaEmpezo = sesion.estado === "realizada" || new Date(sesion.fecha_hora) <= new Date();

  async function crear(e) {
    e.preventDefault();
    const creado = await onCrear({
      descripcion: descripcion.trim(),
      responsable: responsable.trim() || undefined,
      fecha_compromiso: compromiso || undefined,
      protocolo_id: protocoloId ? Number(protocoloId) : undefined,
    });
    if (creado) {
      setDescripcion("");
      setResponsable("");
      setCompromiso("");
      setProtocoloId("");
    }
  }

  return (
    <section className={claseTarjeta} aria-labelledby="acuerdos-sesion">
      <h2 id="acuerdos-sesion" className="text-base font-bold text-slate-800">
        Acuerdos
      </h2>

      {sesion.acuerdos.length === 0 && <p className="mt-3 text-sm text-slate-400">Todavía no hay acuerdos en esta sesión.</p>}

      <ul className="mt-3 space-y-3">
        {sesion.acuerdos.map((a) => {
          const estado = ESTADOS_ACUERDO[a.estado];
          return (
            <li key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 whitespace-pre-line text-sm text-slate-800">
                  <span className="font-semibold">Acuerdo {a.numero}. </span>
                  {a.descripcion}
                </p>
                <div className="flex flex-wrap gap-2">
                  {estaVencido(a) && <Etiqueta variante="peligro">Vencido</Etiqueta>}
                  {!editable && <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {a.responsable ? `Responsable: ${a.responsable}` : "Sin responsable"}
                {a.fecha_compromiso && ` · Compromiso: ${formatearDia(a.fecha_compromiso)}`}
                {a.protocolo && ` · Protocolo: ${a.protocolo.titulo}`}
                {a.cumplido_en && ` · Cumplido el ${formatearFechaCorta(a.cumplido_en)}`}
              </p>
              {a.observaciones && <p className="mt-1 text-xs text-slate-600">{a.observaciones}</p>}
              {editable && (
                <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-700">Estado</span>
                  <select
                    value={a.estado}
                    onChange={(e) => onCambiar(a.id, { estado: e.target.value })}
                    disabled={ocupado}
                    aria-label={`Estado del acuerdo ${a.numero}`}
                    className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    {Object.entries(ESTADOS_ACUERDO).map(([valor, e]) => (
                      <option key={valor} value={valor}>
                        {e.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      {editable && !yaEmpezo && (
        <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
          Podrás registrar acuerdos a partir de la fecha y hora de la sesión.
        </p>
      )}

      {editable && yaEmpezo && (
        <form onSubmit={crear} noValidate className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-800">Registrar acuerdo</p>
          <label className="mt-3 block">
            <span className={claseLabel}>Descripción</span>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={5000} disabled={ocupado} className={claseInput} />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={claseLabel}>Responsable</span>
              <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} maxLength={200} disabled={ocupado} className={claseInput} />
            </label>
            <label className="block min-w-0">
              <span className={claseLabel}>Fecha compromiso</span>
              <input type="date" value={compromiso} onChange={(e) => setCompromiso(e.target.value)} disabled={ocupado} className={claseInput} />
            </label>
          </div>
          <label className="mt-4 block min-w-0">
            <span className={claseLabel}>Protocolo relacionado (opcional)</span>
            <select value={protocoloId} onChange={(e) => setProtocoloId(e.target.value)} disabled={ocupado} className={claseInput}>
              <option value="">Ninguno</option>
              {protocolos.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} · {p.titulo}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={ocupado} className={`mt-4 ${claseBotonSecundario}`}>
            Agregar acuerdo
          </button>
        </form>
      )}
    </section>
  );
}

function Minuta({ sesion, puedeGestionar, ocupado, onSubir }) {
  const aviso = useAviso();
  const archivoRef = useRef(null);

  function ver() {
    descargarArchivo(`/api/sesiones/${sesion.id}/minuta`, `minuta-sesion-${sesion.id}`).catch((e) => aviso.error(e.message));
  }

  async function subir(e) {
    e.preventDefault();
    const archivo = archivoRef.current?.files?.[0];
    if (!archivo) return aviso.error("Adjunta la minuta firmada (PDF, JPG o PNG)");
    const subida = await onSubir(archivo);
    if (subida && archivoRef.current) archivoRef.current.value = "";
  }

  if (sesion.estado !== "realizada") return null;

  return (
    <section className={claseTarjeta} aria-labelledby="minuta-sesion">
      <h2 id="minuta-sesion" className="text-base font-bold text-slate-800">
        Minuta
      </h2>
      {sesion.tiene_minuta ? (
        <button type="button" onClick={ver} className={`mt-3 ${claseBotonSecundario}`}>
          Ver minuta
        </button>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Todavía no se sube la minuta firmada.</p>
      )}
      {puedeGestionar && (
        <form onSubmit={subir} noValidate className="mt-4">
          <label className="block min-w-0">
            <span className={claseLabel}>
              {sesion.tiene_minuta ? "Reemplazar minuta" : "Subir minuta"} (PDF, JPG o PNG, máx. 10 MB)
            </span>
            <input ref={archivoRef} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={ocupado} className={claseArchivo} />
          </label>
          <button type="submit" disabled={ocupado} className={`mt-3 ${claseBotonSecundario}`}>
            {sesion.tiene_minuta ? "Reemplazar" : "Subir"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function SesionDetalle({ actor, sesionId }) {
  const aviso = useAviso();
  const puedeGestionar = tieneRol(actor, ...ROLES_GESTION);
  const [sesion, setSesion] = useState(null);
  const [protocolos, setProtocolos] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(null);

  const cargar = useCallback(() => {
    api(`/api/sesiones/${sesionId}`)
      .then(setSesion)
      .catch((e) => setErrorCarga(e.message));
  }, [sesionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!puedeGestionar) return;
    api("/api/protocolos")
      .then((datos) => setProtocolos(Array.isArray(datos) ? datos : []))
      .catch(() => setProtocolos([]));
  }, [puedeGestionar]);

  async function ejecutar(peticion, exito) {
    setOcupado(true);
    try {
      const actualizada = await peticion();
      setSesion(actualizada);
      if (exito) aviso.exito(exito);
      return true;
    } catch (err) {
      aviso.error(err.message);
      if (err.status === 409) cargar();
      return false;
    } finally {
      setOcupado(false);
      setConfirmando(null);
    }
  }

  const base = `/api/sesiones/${sesionId}`;

  if (errorCarga) {
    return (
      <div className="min-w-0">
        <Link to="/panel/sesiones" className="text-sm font-semibold text-[#1878B6] hover:underline">
          ← Sesiones
        </Link>
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar la sesión. {errorCarga}
        </p>
      </div>
    );
  }
  if (!sesion) return <Esqueleto className="h-40 w-full" />;

  const estado = ESTADOS_SESION[sesion.estado];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <Link to="/panel/sesiones" className="text-sm font-semibold text-[#1878B6] hover:underline">
          ← Sesiones
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
              <IconoCalendario className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sesión {TIPOS_SESION[sesion.tipo].toLowerCase()}</h1>
              <p className="mt-1 text-sm text-slate-500">{formatearFechaHora(sesion.fecha_hora)}</p>
            </div>
          </div>
          <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
        </div>
        {puedeGestionar && sesion.estado === "convocada" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirmando("realizada")} disabled={ocupado} className={claseBotonPrimario}>
              Marcar como realizada
            </button>
            <button
              type="button"
              onClick={() => setConfirmando("cancelada")}
              disabled={ocupado}
              className="min-h-11 rounded-full border border-red-200 px-6 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Cancelar sesión
            </button>
          </div>
        )}
        {sesion.estado === "cancelada" && <p className="mt-4 text-sm text-slate-500">Esta sesión fue cancelada y ya no se puede modificar.</p>}
      </div>

      <DatosSesion
        key={`${sesion.id}-${sesion.estado}`}
        sesion={sesion}
        editable={puedeGestionar && sesion.estado !== "cancelada"}
        guardando={ocupado}
        onGuardar={(cambios) => ejecutar(() => api(base, { method: "PATCH", body: cambios }), "Datos guardados.")}
      />

      <Asistencia
        sesion={sesion}
        puedeGestionar={puedeGestionar}
        ocupado={ocupado}
        onGuardar={(ids) => ejecutar(() => api(`${base}/asistencia`, { method: "PUT", body: { asistieron: ids } }), "Asistencia guardada.")}
        onAgregar={(nombre, cargo) => {
          if (!nombre || !cargo) {
            aviso.error("Escribe el nombre y el cargo del integrante");
            return Promise.resolve(false);
          }
          return ejecutar(() => api(`${base}/asistentes`, { method: "POST", body: { nombre, cargo } }), "Integrante agregado.");
        }}
        onQuitar={(asistente) =>
          ejecutar(() => api(`${base}/asistentes/${asistente.id}`, { method: "DELETE" }), `${asistente.nombre} ya no figura en la sesión.`)
        }
      />

      <Acuerdos
        sesion={sesion}
        puedeGestionar={puedeGestionar}
        ocupado={ocupado}
        protocolos={protocolos}
        onCrear={(datos) => {
          if (!datos.descripcion) {
            aviso.error("Escribe la descripción del acuerdo");
            return Promise.resolve(false);
          }
          return ejecutar(() => api(`${base}/acuerdos`, { method: "POST", body: datos }), "Acuerdo registrado.");
        }}
        onCambiar={(acuerdoId, cambios) =>
          ejecutar(() => api(`${base}/acuerdos/${acuerdoId}`, { method: "PATCH", body: cambios }), "Acuerdo actualizado.")
        }
      />

      <Minuta
        sesion={sesion}
        puedeGestionar={puedeGestionar}
        ocupado={ocupado}
        onSubir={(archivo) => {
          const datos = new FormData();
          datos.append("minuta", archivo);
          return ejecutar(() => api(`${base}/minuta`, { method: "POST", body: datos }), "Minuta guardada.");
        }}
      />

      <DialogoConfirmacion
        abierto={confirmando === "realizada"}
        titulo="¿Marcar la sesión como realizada?"
        descripcion="Ya no podrás cambiar su fecha ni su tipo. Necesitas haber registrado al menos un asistente presente."
        etiquetaConfirmar="Marcar como realizada"
        cargando={ocupado}
        onConfirmar={() => ejecutar(() => api(base, { method: "PATCH", body: { estado: "realizada" } }), "Sesión marcada como realizada.")}
        onCancelar={() => setConfirmando(null)}
      />
      <DialogoConfirmacion
        abierto={confirmando === "cancelada"}
        titulo="¿Cancelar la sesión?"
        descripcion="Una sesión cancelada ya no se puede modificar ni recibe acuerdos."
        etiquetaConfirmar="Cancelar sesión"
        cargando={ocupado}
        onConfirmar={() => ejecutar(() => api(base, { method: "PATCH", body: { estado: "cancelada" } }), "Sesión cancelada.")}
        onCancelar={() => setConfirmando(null)}
      />
    </div>
  );
}
