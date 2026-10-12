import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import TablaDatos from "../../components/ui/TablaDatos";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";

// Pantalla: Bitácora de acciones (HU-15): consulta de quién hizo cada alta,
// baja, edición o cambio de rol. Solo lectura; consume GET /api/bitacora.
// Visible para Secretario Ejecutivo, resto del personal CATT y el
// administrador del sistema (lo mismo que ya exige el backend).

// Etiquetas legibles para las acciones que ya escribe registrarBitacora()
// en usuarios.js, academias.js y auth.js. Si aparece una acción nueva que no
// está aquí, se muestra tal cual llega (en vez de romper la pantalla).
const ETIQUETAS_ACCION = {
  registro_alumno: "Registro de alumno",
  alta_alumno: "Alta de alumno",
  alta_docente: "Alta de docente",
  alta_personal_catt: "Alta de personal CATT",
  editar_usuario: "Edición de datos",
  revocar_cuenta: "Revocar cuenta",
  reactivar_cuenta: "Reactivar cuenta",
  eliminar_usuario: "Eliminar cuenta",
  reset_password: "Restablecer contraseña",
  cambio_password: "Cambio de contraseña",
  asignar_rol: "Asignar rol",
  quitar_rol: "Quitar rol",
  alta_academia: "Alta de academia",
  editar_academia: "Edición de academia",
  cambiar_presidente: "Cambiar presidente",
  quitar_presidente: "Quitar presidente",
  mover_docentes: "Mover integrantes",
  migracion_esquema: "Migración de esquema",
};

const ENTIDAD_ETIQUETA = { usuarios: "Usuario", academias: "Academia" };

function etiquetaAccion(accion) {
  return ETIQUETAS_ACCION[accion] ?? accion;
}

function formatearDetalle(detalle) {
  if (!detalle || typeof detalle !== "object") return null;
  const partes = Object.entries(detalle)
    .filter(([, valor]) => valor !== null && valor !== undefined)
    .map(([campo, valor]) => `${campo}: ${typeof valor === "object" ? JSON.stringify(valor) : valor}`);
  return partes.length ? partes.join(" · ") : null;
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const DIACRITICOS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(DIACRITICOS_RE, "")
    .toLowerCase();
}

function FiltroSelect({ label, children, ...props }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        {...props}
        className="min-h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
        <span className="-mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-blue-700" />
      </span>
    </label>
  );
}

function FiltroFecha({ label, ...props }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        {...props}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

export default function BitacoraPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [accionFiltro, setAccionFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // desde/hasta se mandan al backend (reduce lo que trae de la base); acción
  // y la búsqueda por nombre se filtran en el cliente sobre lo ya traído.
  const cargarBitacora = useCallback(() => {
    setCargando(true);
    setErrorCarga(null);
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const query = params.toString();
    api(`/api/bitacora${query ? `?${query}` : ""}`)
      .then((data) => setRegistros(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, [desde, hasta]);

  useEffect(() => {
    cargarBitacora();
  }, [cargarBitacora]);

  const acciones = useMemo(
    () => [...new Set((registros ?? []).map((r) => r.accion))].sort((a, b) => etiquetaAccion(a).localeCompare(etiquetaAccion(b), "es")),
    [registros],
  );

  const registrosFiltrados = useMemo(() => {
    let lista = registros ?? [];
    if (accionFiltro) lista = lista.filter((r) => r.accion === accionFiltro);
    const consulta = normalizar(busqueda.trim());
    if (consulta) lista = lista.filter((r) => normalizar(r.usuario).includes(consulta));
    return lista;
  }, [registros, accionFiltro, busqueda]);

  const columnas = useMemo(
    () => [
      {
        clave: "creado_en",
        titulo: "Cuándo",
        ordenable: true,
        render: (r) => <span className="whitespace-nowrap text-sm font-medium text-slate-800">{formatearFecha(r.creado_en)}</span>,
      },
      {
        clave: "usuario",
        titulo: "Quién",
        ordenable: true,
        render: (r) => (
          <div className="flex min-w-[200px] items-center gap-3">
            <span
              aria-hidden="true"
              className="usuario-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200 transition-transform duration-200"
            >
              {r.usuario === "Sistema" ? "S" : r.usuario?.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="text-sm font-semibold text-slate-800">{r.usuario}</span>
          </div>
        ),
      },
      {
        clave: "accion",
        titulo: "Qué hizo",
        ordenable: true,
        valorOrden: (r) => etiquetaAccion(r.accion),
        render: (r) => (
          <Etiqueta variante="info" className="whitespace-nowrap">
            {etiquetaAccion(r.accion)}
          </Etiqueta>
        ),
      },
      {
        clave: "registro",
        titulo: "Registro afectado",
        render: (r) =>
          r.entidad_id ? (
            <span className="text-sm text-slate-700">
              {ENTIDAD_ETIQUETA[r.entidad] ?? r.entidad} #{r.entidad_id}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        clave: "detalle",
        titulo: "Detalle",
        render: (r) => <span className="text-xs text-slate-500">{formatearDetalle(r.detalle) ?? "—"}</span>,
      },
      {
        clave: "abrir",
        titulo: <span className="sr-only">Ficha</span>,
        render: (r) =>
          r.entidad_id ? (
            <span
              aria-hidden="true"
              className="usuario-ficha inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition"
            >
              <span className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2" />
            </span>
          ) : null,
      },
    ],
    [],
  );

  function abrirRegistro(r) {
    if (!r.entidad_id) return;
    if (r.entidad === "usuarios") navigate(`/panel/usuarios/${r.entidad_id}`);
    else if (r.entidad === "academias") navigate(`/panel/academias/${r.entidad_id}`);
  }

  const hayFiltros = Boolean(busqueda || accionFiltro || desde || hasta);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
            <IconoDocumento className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bitácora</h2>
            <p className="mt-1 text-sm text-slate-500">Quién hizo cada alta, baja o cambio en el sistema</p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargarBitacora}
          disabled={cargando}
          aria-label="Actualizar bitácora"
          title="Actualizar"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
        >
          <span aria-hidden="true" className={`text-2xl leading-none ${cargando ? "motion-safe:animate-spin" : ""}`}>&#8635;</span>
        </button>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar la bitácora. {errorCarga}
        </p>
      )}

      {cargando && !registros && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Esqueleto key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {registros && (
        <div className="mt-6 min-w-0" aria-busy={cargando}>
          <TablaDatos
            paginacion
            columnas={columnas}
            filas={registrosFiltrados}
            getId={(r) => r.id}
            onAbrirFila={abrirRegistro}
            busqueda={
              <label className="tabla-busqueda relative block w-full min-w-0">
                <span className="sr-only">Buscar por quién hizo la acción</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre de quien hizo la acción"
                  className="min-h-12 w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            }
            filtros={
              <div className="flex shrink-0 flex-wrap gap-2">
                <FiltroFecha label="Desde" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
                <FiltroFecha label="Hasta" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
                <FiltroSelect label="Filtrar por acción" value={accionFiltro} onChange={(e) => setAccionFiltro(e.target.value)}>
                  <option value="">Todas las acciones</option>
                  {acciones.map((a) => (
                    <option key={a} value={a}>
                      {etiquetaAccion(a)}
                    </option>
                  ))}
                </FiltroSelect>
              </div>
            }
            mensajeVacio={hayFiltros ? "No hay registros que coincidan con estos filtros." : "Todavía no hay acciones registradas."}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p aria-live="polite">
              {registrosFiltrados.length} de {registros.length} registros
            </p>
            {hayFiltros && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setAccionFiltro("");
                  setDesde("");
                  setHasta("");
                }}
                className="min-h-9 rounded-full px-3 font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
