import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChipsRol from "../../../components/ChipsRol";
import Esqueleto from "../../../components/ui/Esqueleto";
import Etiqueta from "../../../components/ui/Etiqueta";
import Pestanas, { usePestanaUrl } from "../../../components/ui/Pestanas";
import TablaDatos from "../../../components/ui/TablaDatos";
import { api } from "../../../lib/api";
import { nombreCompleto } from "../../../lib/nombre";
import { esCuentaDePersonal, ROLES_CATT, ROLES_GESTION, tieneRol } from "../../../lib/roles";
import { GRAD_AZUL, VIDRIO } from "../../../lib/theme";

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

  const columnas = useMemo(
    () => [
      {
        clave: "nombre",
        titulo: "Nombre",
        render: (u) => (
          <>
            <p className="font-medium text-slate-700">{nombreCompleto(u)}</p>
            <p className="text-xs text-slate-400">{u.correo}</p>
          </>
        ),
      },
      {
        clave: "identificador",
        titulo: pestanaActiva.identificador.label,
        render: (u) => u[pestanaActiva.identificador.campo] || "—",
      },
      {
        clave: "extra",
        titulo: pestanaActiva.extra.label,
        render: (u) => pestanaActiva.extra.valor(u),
      },
      { clave: "roles", titulo: "Roles", render: (u) => <ChipsRol roles={u.roles} /> },
      {
        clave: "estado",
        titulo: "Estado",
        render: (u) => (
          <>
            <Etiqueta variante={u.activo ? "exito" : "neutro"}>
              {u.activo ? "Activo" : "Acceso revocado"}
            </Etiqueta>
            {u.debe_cambiar_password && (
              <p className="mt-1 text-[11px] text-amber-600">Contraseña temporal</p>
            )}
          </>
        ),
      },
    ],
    [pestanaActiva],
  );

  const idPestanas = `listado-usuarios-${soloPresidente ? "mi-academia" : "usuarios"}`;

  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm text-slate-600">
          {soloPresidente
            ? `Docentes de ${actor.academia ?? "tu academia"}. Selecciona una fila para ver su ficha (solo consulta).`
            : "Selecciona una fila para ver y editar el detalle del usuario."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={cargando}
            className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cargando ? "Cargando…" : "Actualizar"}
          </button>
          {puedeDarDeAlta && (
            <button
              type="button"
              onClick={() => navigate(`/panel/usuarios/nuevo?perfil=${pestanaActiva.perfil}`)}
              className="min-h-11 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5"
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
            className="mt-4"
          >
            <TablaDatos
              columnas={columnas}
              filas={usuariosDeLaTab}
              getId={(u) => u.id}
              onAbrirFila={(u) => navigate(`/panel/usuarios/${u.id}`)}
              busqueda={
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={`Buscar en ${tituloTabActiva.toLowerCase()} por nombre, correo o ${pestanaActiva.identificador.label.toLowerCase()}…`}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
                />
              }
              filtros={
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  aria-label="Filtrar por estado de la cuenta"
                  className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30"
                >
                  {FILTROS_ESTADO.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.etiqueta}
                    </option>
                  ))}
                </select>
              }
              mensajeVacio={
                busqueda.trim()
                  ? "No hay resultados para tu búsqueda."
                  : `No hay ${tituloTabActiva.toLowerCase()} registrados.`
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
