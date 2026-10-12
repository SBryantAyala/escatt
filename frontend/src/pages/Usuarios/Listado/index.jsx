import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChipsRol from "../../../components/ChipsRol";
import Esqueleto from "../../../components/ui/Esqueleto";
import Etiqueta from "../../../components/ui/Etiqueta";
import Pestanas, { usePestanaUrl } from "../../../components/ui/Pestanas";
import TablaDatos from "../../../components/ui/TablaDatos";
import { IconoAltaUsuario, IconoUsuarios } from "../../../components/iconos";
import { api } from "../../../lib/api";
import { nombreCompleto } from "../../../lib/nombre";
import { CARRERAS, esCuentaDePersonal, ROLES_CATT, ROLES_GESTION, tieneRol } from "../../../lib/roles";

// Pantalla: Listado de usuarios (HU-3): consulta + búsqueda por pestaña.
// Consume GET /api/usuarios. Cada fila es clickeable y lleva al Detalle del
// usuario (/panel/usuarios/:id); las acciones de revocar/reactivar/eliminar
// viven en Detalle, no aquí.
//
// Se usa embebida en el panel para dos rutas (/panel/usuarios y
// /panel/mi-academia), siempre dentro de PanelLayout — ya no tiene una
// variante de pantalla completa.

// Tres pestañas, una por PERFIL (tabla de perfil en la base):
//   Alumnos        -> perfil alumno
//   Docentes       -> perfil docente (incluye presidentes de academia)
//   Personal CATT  -> perfil personal_catt o rol admin/CATT
// Una persona con dos perfiles (p. ej. docente comisionado a la CATT) aparece
// en ambas pestañas. Las columnas se adaptan a la información de cada perfil.
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
  { id: "temporal", etiqueta: "Contraseña temporal" },
];

const TONOS_CARRERA = {
  ISC: "bg-blue-100 text-blue-700 ring-blue-200",
  IIA: "bg-violet-100 text-violet-700 ring-violet-200",
  LCD: "bg-teal-100 text-teal-700 ring-teal-200",
};

function FiltroSelect({ label, children, ...props }) {
  return <label className="relative block min-w-0"><span className="sr-only">{label}</span><select {...props} className="min-h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100">{children}</select><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center"><span className="-mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-blue-700" /></span></label>;
}

// Sin acentos y en minúsculas, para que buscar "jose" también encuentre "José".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ListadoPage({ actor }) {
  const navigate = useNavigate();
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
  const [tabUrl, cambiarTabUrl] = usePestanaUrl(pestanas);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCarrera, setFiltroCarrera] = useState("");

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

  // Cada pestaña empieza sin filtro de búsqueda.
  function cambiarTab(id) {
    cambiarTabUrl(id);
    setBusqueda("");
    setFiltroEstado("todos");
    setFiltroCarrera("");
  }

  // Conteo por pestaña (sobre el total, no sobre lo filtrado).
  const conteosPorPestana = useMemo(
    () =>
      Object.fromEntries(
        pestanas.map((p) => [p.id, (usuarios ?? []).filter((u) => p.pertenece(u)).length]),
      ),
    [usuarios, pestanas],
  );

  const pestanaActiva = pestanas.find((p) => p.id === tabUrl) ?? pestanas[0];
  const tituloTabActiva = pestanaActiva.titulo;
  const puedeDarDeAlta = tieneRol(actor, ...pestanaActiva.altaPor);
  const usuariosDelPerfil = useMemo(() => (usuarios ?? []).filter((u) => pestanaActiva.pertenece(u)), [usuarios, pestanaActiva]);

  const usuariosDeLaTab = useMemo(() => {
    let lista = usuariosDelPerfil;
    if (filtroEstado === "temporal") lista = lista.filter((u) => u.activo && u.debe_cambiar_password);
    else if (filtroEstado !== "todos") lista = lista.filter((u) => u.estado === filtroEstado);
    if (pestanaActiva.id === "alumnos" && filtroCarrera) lista = lista.filter((u) => u.carrera === filtroCarrera);
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
  }, [usuariosDelPerfil, pestanaActiva, busqueda, filtroEstado, filtroCarrera]);

  const columnas = useMemo(
    () => [
      {
        clave: "nombre",
        titulo: pestanaActiva.id === "alumnos" ? "Alumno" : "Usuario",
        ordenable: true,
        valorOrden: nombreCompleto,
        render: (u) => (
          <div className="flex min-w-[240px] items-center gap-3">
            <span aria-hidden="true" className={`usuario-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset transition-transform duration-200 ${u.activo ? TONOS_CARRERA[u.carrera] ?? "bg-blue-100 text-blue-700 ring-blue-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{[u.nombre?.trim()[0], u.apellido_paterno?.trim()[0]].filter(Boolean).join("").toUpperCase() || "U"}</span>
            <div className="min-w-0"><p className="text-sm font-semibold leading-relaxed text-slate-800">{nombreCompleto(u)}</p><p className="mt-1 break-all text-sm text-slate-500">{u.correo}</p></div>
          </div>
        ),
      },
      {
        clave: "identificador",
        titulo: pestanaActiva.identificador.label,
        ordenable: true,
        valorOrden: (u) => u[pestanaActiva.identificador.campo],
        render: (u) => <span className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-800">{u[pestanaActiva.identificador.campo] || "—"}</span>,
      },
      {
        clave: "extra",
        titulo: pestanaActiva.id === "alumnos" ? "Carrera" : pestanaActiva.extra.label,
        ordenable: true,
        valorOrden: (u) => pestanaActiva.id === "alumnos" ? u.carrera : pestanaActiva.extra.valor(u),
        render: (u) => pestanaActiva.id === "alumnos" ? <span title={CARRERAS.find((c) => c.valor === u.carrera)?.etiqueta} className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${TONOS_CARRERA[u.carrera] ?? "bg-slate-100 text-slate-500"}`}>{u.carrera || "—"}</span> : <span className="text-sm font-medium leading-relaxed text-slate-700">{pestanaActiva.extra.valor(u)}</span>,
      },
      ...(pestanaActiva.id === "alumnos" ? [{ clave: "plan", titulo: "Plan", ordenable: true, valorOrden: (u) => u.plan_estudios, render: (u) => <span className="text-sm font-medium text-slate-700">{u.plan_estudios || "—"}</span> }] : pestanaActiva.id === "docentes" ? [{ clave: "contacto", titulo: "Contacto", render: (u) => <div className="text-sm text-slate-700"><p className="whitespace-nowrap">{u.telefono || "Sin teléfono"}</p>{u.extension && <p className="mt-1 text-slate-500">Ext. {u.extension}</p>}</div> }] : [{ clave: "roles", titulo: "Responsabilidad", render: (u) => <ChipsRol roles={u.roles} /> }]),
      {
        clave: "estado",
        titulo: "Acceso",
        render: (u) => (
          <>
            <Etiqueta variante={u.activo ? "exito" : "peligro"} className="gap-1.5 whitespace-nowrap !px-3 !py-1.5 !text-sm !font-semibold">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${u.activo ? "bg-emerald-500" : "bg-rose-500"}`} />{u.activo ? "Activo" : "Revocado"}
            </Etiqueta>
            {u.activo && u.debe_cambiar_password && (
              <p className="mt-2 text-xs font-medium text-orange-700">Contraseña temporal</p>
            )}
          </>
        ),
      },
      { clave: "abrir", titulo: <span className="sr-only">Ficha</span>, render: () => <span aria-hidden="true" className="usuario-ficha inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition"><span className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2" /></span> },
    ],
    [pestanaActiva],
  );

  const idPestanas = `listado-usuarios-${soloPresidente ? "mi-academia" : "usuarios"}`;

  return (
    <div className="usuarios-listado min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]"><IconoUsuarios className="h-6 w-6" /></span><div><h2 className="text-2xl font-bold text-slate-900">{soloPresidente ? "Mi academia" : "Usuarios"}</h2><p className="mt-1 text-sm text-slate-500">{soloPresidente ? actor.academia ?? "Docentes de tu academia" : "Padrón de alumnos, docentes y personal CATT"}</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={cargando}
            aria-label="Actualizar listado de usuarios"
            title="Actualizar listado"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            <span aria-hidden="true" className={`text-2xl leading-none ${cargando ? "motion-safe:animate-spin" : ""}`}>&#8635;</span>
          </button>
          {puedeDarDeAlta && (
            <button
              type="button"
              onClick={() => navigate(`/panel/usuarios/nuevo?perfil=${pestanaActiva.perfil}`)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1878B6] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#0F5C8C] hover:shadow-lg"
            >
              <IconoAltaUsuario className="h-4 w-4" />{pestanaActiva?.etiquetaAlta ?? "Registrar usuario"}
            </button>
          )}
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo actualizar el listado. {errorCarga}
        </p>
      )}

      {cargando && !usuarios && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Esqueleto key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {usuarios && (
        <>
          <div className="mt-6">
            <Pestanas
              idBase={idPestanas}
              pestanas={pestanas.map((p) => ({
                id: p.id,
                etiqueta: p.titulo,
                contador: conteosPorPestana[p.id],
              }))}
              activa={tabUrl}
              onCambiar={cambiarTab}
            />
          </div>

          <div
            role="tabpanel"
            id={`${idPestanas}-panel-${tabUrl}`}
            aria-labelledby={`${idPestanas}-tab-${tabUrl}`}
            className="mt-4 min-w-0"
            aria-busy={cargando}
          >
            <TablaDatos
              key={tabUrl}
              paginacion
              columnas={columnas}
              filas={usuariosDeLaTab}
              getId={(u) => u.id}
              onAbrirFila={(u) => navigate(`/panel/usuarios/${u.id}`)}
              busqueda={
                <label className="tabla-busqueda relative block w-full min-w-0"><span className="sr-only">Buscar en {tituloTabActiva.toLowerCase()}</span><input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={`Nombre, correo o ${pestanaActiva.identificador.label.toLowerCase()}`}
                  className="min-h-12 w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                /></label>
              }
              filtros={
                <div className="flex shrink-0 flex-wrap gap-2">
                {pestanaActiva.id === "alumnos" && <FiltroSelect label="Filtrar por carrera" value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)}><option value="">Todas las carreras</option>{CARRERAS.map((c) => <option key={c.valor} value={c.valor}>{c.valor}</option>)}</FiltroSelect>}
                <FiltroSelect label="Filtrar por acceso"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  {FILTROS_ESTADO.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.etiqueta}
                    </option>
                  ))}
                </FiltroSelect>
                </div>
              }
              mensajeVacio={
                busqueda.trim() || filtroEstado !== "todos" || filtroCarrera
                  ? "No hay usuarios que coincidan con estos filtros."
                  : `No hay ${tituloTabActiva.toLowerCase()} registrados.`
              }
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p aria-live="polite">{usuariosDeLaTab.length} de {usuariosDelPerfil.length} {tituloTabActiva.toLowerCase()}</p>{(busqueda || filtroEstado !== "todos" || filtroCarrera) && <button type="button" onClick={() => { setBusqueda(""); setFiltroEstado("todos"); setFiltroCarrera(""); }} className="min-h-9 rounded-full px-3 font-semibold text-sky-700 transition hover:bg-sky-50">Limpiar filtros</button>}</div>
          </div>
        </>
      )}
    </div>
  );
}
