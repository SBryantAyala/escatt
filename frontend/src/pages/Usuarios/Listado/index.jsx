import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { nombreCompleto } from "../../../lib/nombre";
import { AZUL_CLARO, AZUL_MEDIO, GRAD_AZUL, VIDRIO } from "../../../lib/theme";
import ChipsRol from "../../../components/ChipsRol";
import { esCuentaDePersonal, ROLES_CATT, ROLES_GESTION, tieneRol } from "../../../lib/roles";

// Pantalla: Listado de usuarios (HU-3): consulta + búsqueda por pestaña.
// Consume GET /api/usuarios. Cada fila es clickeable y lleva al Detalle del
// usuario; las acciones de revocar/reactivar/eliminar viven ahora en Detalle
// (pages/Usuarios/Detalle), no aquí.
//
// Se usa de dos formas:
//   - Suelta (con su propio marco de pantalla completa), pasando `onVolver`.
//   - Embebida como la sección "Usuarios" del panel (pages/Panel), pasando
//     `embebido` — entonces sólo renderiza la tarjeta, sin marco ni fondo.
// La paleta, la clase VIDRIO y el cliente `api()` se importan de src/lib.

// Tres pestañas, una por PERFIL (tabla de perfil en la base):
//   Alumnos        -> perfil alumno
//   Docentes       -> perfil docente (incluye presidentes de academia)
//   Personal CATT  -> perfil personal_catt o rol admin/CATT
// Una persona con dos perfiles (p. ej. docente comisionado a la CATT) aparece
// en ambas pestañas. Los roles se muestran como chips en cada fila.
const PESTANAS = [
  {
    id: "alumnos",
    perfil: "alumno",
    titulo: "Alumnos",
    etiquetaAlta: "Registrar alumno",
    identificador: { label: "Boleta", campo: "boleta" },
    extra: { label: "Carrera / plan", valor: (u) => `${u.carrera ?? "—"} · ${u.plan_estudios ?? "—"}` },
    pertenece: (u) => u.perfiles?.includes("alumno"),
    // Quién da de alta en esta pestaña (el backend valida igual).
    altaPor: ROLES_GESTION,
  },
  {
    id: "docentes",
    perfil: "docente",
    titulo: "Docentes",
    etiquetaAlta: "Registrar docente",
    identificador: { label: "Núm. empleado", campo: "numero_empleado" },
    extra: { label: "Academia", valor: (u) => u.academia ?? "—" },
    pertenece: (u) => u.perfiles?.includes("docente"),
    altaPor: ROLES_GESTION,
  },
  {
    id: "personal",
    perfil: "personal_catt",
    titulo: "Personal CATT",
    etiquetaAlta: "Registrar personal CATT",
    identificador: { label: "Núm. empleado", campo: "numero_empleado" },
    extra: { label: "Cargo", valor: (u) => u.cargo ?? "—" },
    pertenece: esCuentaDePersonal,
    altaPor: ["admin_sistema"],
  },
];

const FILTROS_ESTADO = [
  { id: "todos", etiqueta: "Todos" },
  { id: "activa", etiqueta: "Activos" },
  { id: "revocada", etiqueta: "Revocados" },
];

// Sin acentos y en minúsculas, para que buscar "jose" también encuentre "José".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function EstadoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
      Acceso revocado
    </span>
  );
}

// Fila clickeable: toda la <tr> lleva al detalle del usuario (antes había un
// botón "Ver"). Accesible por teclado (role="button" + Enter/Espacio). Las
// acciones de revocar/reactivar/eliminar ya no viven aquí, sino en Detalle.
function FilaUsuario({ usuario, pestana, onVerDetalle }) {
  const abrir = () => onVerDetalle?.(usuario);
  const alPresionar = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={alPresionar}
      aria-label={`Ver detalle de ${nombreCompleto(usuario)}`}
      className="cursor-pointer border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-[#4FB3E8]/10 focus:bg-[#4FB3E8]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4FB3E8]/50"
    >
      <td className="py-3 pl-4 pr-4">
        <p className="font-medium text-slate-700">{nombreCompleto(usuario)}</p>
        <p className="text-xs text-slate-400">{usuario.correo}</p>
      </td>
      <td className="py-3 pr-4 text-slate-500">{usuario[pestana.identificador.campo] || "—"}</td>
      <td className="py-3 pr-4 text-slate-500">{pestana.extra.valor(usuario)}</td>
      <td className="py-3 pr-4">
        <ChipsRol roles={usuario.roles} />
      </td>
      <td className="py-3 pr-4">
        <EstadoBadge activo={usuario.activo} />
        {usuario.debe_cambiar_password && (
          <p className="mt-1 text-[11px] text-amber-600">Contraseña temporal</p>
        )}
      </td>
    </tr>
  );
}

export default function ListadoPage({
  actor,
  onVolver,
  embebido = false,
  onVerDetalle,
  onDarDeAlta,
}) {
  // El administrador del sistema no ve alumnos (el backend tampoco se los
  // manda) y empieza en Personal CATT, que es lo que administra.
  const soloAdmin = tieneRol(actor, "admin_sistema") && !tieneRol(actor, ...ROLES_CATT);
  // HU-11: el Presidente de Academia (sin ser personal CATT ni admin) solo ve
  // a los docentes de su academia, en solo lectura. El backend ya le manda
  // únicamente esos; aquí se reduce la pantalla a la pestaña Docentes.
  const soloPresidente =
    tieneRol(actor, "presidente_academia") && !tieneRol(actor, "admin_sistema", ...ROLES_CATT);
  const pestanas = useMemo(() => {
    if (soloPresidente) return [PESTANAS.find((p) => p.id === "docentes")];
    if (soloAdmin) return ["personal", "docentes"].map((id) => PESTANAS.find((p) => p.id === id));
    return PESTANAS;
  }, [soloAdmin, soloPresidente]);
  const [usuarios, setUsuarios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [tabActiva, setTabActiva] = useState(pestanas[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const cargarUsuarios = useCallback(() => {
    setCargando(true);
    setErrorCarga(null);
    api("/api/usuarios")
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  function cambiarTab(id) {
    setTabActiva(id);
    setBusqueda(""); // cada pestaña empieza sin filtro de búsqueda
  }

  // Conteo por pestaña (sobre el total, no sobre lo filtrado).
  const conteosPorPestana = useMemo(
    () =>
      Object.fromEntries(
        pestanas.map((p) => [p.id, (usuarios ?? []).filter((u) => p.pertenece(u)).length]),
      ),
    [usuarios, pestanas],
  );

  const pestanaActiva = pestanas.find((p) => p.id === tabActiva) ?? pestanas[0];
  const tituloTabActiva = pestanaActiva.titulo;
  const puedeDarDeAlta = tieneRol(actor, ...pestanaActiva.altaPor);

  const usuariosDeLaTab = useMemo(() => {
    let lista = (usuarios ?? []).filter((u) => pestanaActiva.pertenece(u));
    if (filtroEstado !== "todos") lista = lista.filter((u) => u.estado === filtroEstado);
    // Alfabético por nombre; las cuentas revocadas van al final del listado.
    lista = [...lista].sort(
      (a, b) =>
        (a.estado === "revocada") - (b.estado === "revocada") ||
        nombreCompleto(a).localeCompare(nombreCompleto(b), "es", { sensitivity: "base" }),
    );
    const consulta = normalizar(busqueda.trim());
    if (!consulta) return lista;
    return lista.filter(
      (u) =>
        normalizar(nombreCompleto(u)).includes(consulta) ||
        normalizar(u.correo).includes(consulta) ||
        normalizar(u[pestanaActiva.identificador.campo]).includes(consulta),
    );
  }, [usuarios, pestanaActiva, busqueda, filtroEstado]);

  const panel = (
    <div className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              {/* Embebido en el dashboard: el breadcrumb y el sidebar ya dan
                  este contexto (Panel / Usuarios), así que aquí no se repite
                  el eyebrow ni el título — solo cuando esta pantalla se
                  renderiza sola (embebido=false) los necesita. */}
              {!embebido && (
                <>
                  <span className="inline-flex items-center rounded-full bg-[#4FB3E8]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0F5C8C]">
                    Panel · Listado de usuarios
                  </span>
                  <h1 className="mt-3 text-2xl font-bold text-slate-800 sm:text-3xl">Usuarios — CATT</h1>
                </>
              )}
              <p className={`text-sm text-slate-600 ${embebido ? "" : "mt-1"}`}>
                {soloPresidente
                  ? `Docentes de ${actor.academia ?? "tu academia"}. Selecciona una fila para ver su ficha (solo consulta).`
                  : "Selecciona una fila para ver y editar el detalle del usuario."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={cargarUsuarios}
                disabled={cargando}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cargando ? "Cargando…" : "Actualizar"}
              </button>
              {onDarDeAlta && puedeDarDeAlta && (
                <button
                  type="button"
                  onClick={() => onDarDeAlta(pestanaActiva.perfil)}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5"
                  style={{ background: GRAD_AZUL }}
                >
                  {pestanaActiva?.etiquetaAlta ?? "Registrar usuario"}
                </button>
              )}
            </div>
          </div>

          {errorCarga && !usuarios && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              No se pudo cargar el listado ({errorCarga}). ¿Corriste el backend en el puerto 3000?
            </p>
          )}

          {cargando && !usuarios && (
            <p className="mt-6 p-4 text-sm text-slate-400">Consultando /api/usuarios…</p>
          )}

          {usuarios && (
            <>
              {/* Pestañas */}
              <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {pestanas.map(({ id, titulo }) => {
                  const activa = id === tabActiva;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => cambiarTab(id)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        activa
                          ? "text-white shadow-md shadow-[#1878B6]/30"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      style={activa ? { background: GRAD_AZUL } : undefined}
                    >
                      {titulo} <span className={activa ? "text-white/80" : "text-slate-400"}>({conteosPorPestana[id]})</span>
                    </button>
                  );
                })}
              </div>

              {/* Búsqueda + filtro de estado */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={`Buscar en ${tituloTabActiva.toLowerCase()} por nombre, correo o ${pestanaActiva.identificador.label.toLowerCase()}…`}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
                />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  aria-label="Filtrar por estado de la cuenta"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
                >
                  {FILTROS_ESTADO.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl bg-white/60">
                {usuariosDeLaTab.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">
                    {busqueda.trim()
                      ? "No hay resultados para tu búsqueda."
                      : `No hay ${tituloTabActiva.toLowerCase()} registrados.`}
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-2 pl-4 pr-4 font-medium">Nombre</th>
                        <th className="py-2 pr-4 font-medium">{pestanaActiva.identificador.label}</th>
                        <th className="py-2 pr-4 font-medium">{pestanaActiva.extra.label}</th>
                        <th className="py-2 pr-4 font-medium">Roles</th>
                        <th className="py-2 pr-4 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosDeLaTab.map((usuario) => (
                        <FilaUsuario
                          key={usuario.id}
                          usuario={usuario}
                          pestana={pestanaActiva}
                          onVerDetalle={onVerDetalle}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
    </div>
  );

  // Embebida en el panel: sólo la tarjeta, sin marco de pantalla.
  if (embebido) {
    return panel;
  }

  // Suelta: marco de pantalla completa con fondo de marca y botón "Volver".
  return (
    <div className="relative min-h-screen bg-white text-slate-800">
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

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12">
        {onVolver && (
          <button
            type="button"
            onClick={onVolver}
            className="mb-4 self-start rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Volver
          </button>
        )}
        {panel}
      </div>
    </div>
  );
}
