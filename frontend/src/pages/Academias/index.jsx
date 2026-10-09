import { useCallback, useEffect, useState } from "react";
import { useAviso } from "../../components/ui/Avisos";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import TablaDatos from "../../components/ui/TablaDatos";
import { api } from "../../lib/api";
import { tieneRol } from "../../lib/roles";
import { GRAD_AZUL, VIDRIO } from "../../lib/theme";

// Pantalla: Catálogo de academias (HU-10).
// Consume GET / POST / PUT /api/academias.
//
// Todos los roles con acceso a esta sección pueden consultar la lista; solo el
// Secretario Ejecutivo da de alta, edita y desactiva (el backend valida igual,
// ocultar los botones no es seguridad). Desactivar NO borra: la academia deja
// de ofrecerse al dar de alta o editar docentes, pero los docentes que ya la
// tienen la conservan.
//
// Las filas de la tabla ya no llevan botones de acción (editar/activar): al
// seleccionar una fila, esas acciones aparecen en un panel debajo de la tabla
// — mientras se construye la ficha propia de la academia en otra tarea.

const CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30";

// Activas primero y, dentro de cada grupo, por nombre (sin distinguir acentos
// ni mayúsculas). Las desactivadas quedan al final de la lista.
function porActivaYNombre(a, b) {
  if (a.activa !== b.activa) return a.activa ? -1 : 1;
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}

export default function AcademiasPage({ actor }) {
  const aviso = useAviso();
  const puedeAdministrar = tieneRol(actor, "catt_ejecutivo");

  const [academias, setAcademias] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [nueva, setNueva] = useState({ nombre: "", departamento: "" });
  const [seleccionada, setSeleccionada] = useState(null);
  const [editando, setEditando] = useState(null); // { nombre, departamento } mientras se edita la seleccionada
  const [guardando, setGuardando] = useState(false);

  // El Secretario Ejecutivo ve también las inactivas (?todas=1); los demás solo
  // las activas.
  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const datos = await api(puedeAdministrar ? "/api/academias?todas=1" : "/api/academias");
      const ordenadas = Array.isArray(datos) ? [...datos].sort(porActivaYNombre) : [];
      setAcademias(ordenadas);
      setSeleccionada((actual) => (actual ? ordenadas.find((a) => a.id === actual.id) ?? null : actual));
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }, [puedeAdministrar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Corre una escritura, recarga la lista y avisa el resultado.
  async function ejecutar(accion, mensajeOk) {
    setGuardando(true);
    try {
      await accion();
      await cargar();
      aviso.exito(mensajeOk);
      return true;
    } catch (e) {
      aviso.error(e.message);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function crear(e) {
    e.preventDefault();
    const ok = await ejecutar(
      () =>
        api("/api/academias", {
          method: "POST",
          body: { nombre: nueva.nombre, departamento: nueva.departamento },
        }),
      "Academia creada.",
    );
    if (ok) setNueva({ nombre: "", departamento: "" });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    const ok = await ejecutar(
      () =>
        api(`/api/academias/${seleccionada.id}`, {
          method: "PUT",
          body: { nombre: editando.nombre, departamento: editando.departamento },
        }),
      "Cambios guardados.",
    );
    if (ok) setEditando(null);
  }

  const alternar = (academia) =>
    ejecutar(
      () => api(`/api/academias/${academia.id}`, { method: "PUT", body: { activa: !academia.activa } }),
      academia.activa ? "Academia desactivada." : "Academia activada.",
    );

  function seleccionar(academia) {
    setSeleccionada(academia);
    setEditando(null);
  }

  const columnas = [
    {
      clave: "nombre",
      titulo: "Nombre",
      render: (a) => <span className={a.activa ? "" : "text-slate-400"}>{a.nombre}</span>,
    },
    { clave: "departamento", titulo: "Departamento", render: (a) => a.departamento || "—" },
    ...(puedeAdministrar
      ? [
          {
            clave: "estado",
            titulo: "Estado",
            render: (a) => (
              <Etiqueta variante={a.activa ? "exito" : "neutro"}>{a.activa ? "Activa" : "Inactiva"}</Etiqueta>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm text-slate-600">
          {puedeAdministrar
            ? "Administra las academias que se asignan a los docentes. Desactivar una la quita de las opciones del alta, sin afectar a los docentes que ya pertenecen a ella."
            : "Catálogo de academias."}
        </p>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {cargando ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {!puedeAdministrar && (
        <p
          role="note"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
        >
          Solo el Secretario Ejecutivo puede modificar este catálogo.
        </p>
      )}

      {puedeAdministrar && (
        <form
          onSubmit={crear}
          className="mt-6 grid gap-3 rounded-2xl bg-white/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Nombre
            <input
              type="text"
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
              placeholder="Academia de…"
              className={`mt-1 ${CAMPO}`}
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Departamento (opcional)
            <input
              type="text"
              value={nueva.departamento}
              onChange={(e) => setNueva({ ...nueva, departamento: e.target.value })}
              className={`mt-1 ${CAMPO}`}
            />
          </label>
          <button
            type="submit"
            disabled={guardando || !nueva.nombre.trim()}
            className="min-h-11 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ background: GRAD_AZUL }}
          >
            Agregar academia
          </button>
        </form>
      )}

      {errorCarga && !academias && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar el catálogo ({errorCarga}).
        </p>
      )}

      {cargando && !academias && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Esqueleto key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {academias && (
        <div className="mt-4">
          <TablaDatos
            columnas={columnas}
            filas={academias}
            getId={(a) => a.id}
            onAbrirFila={seleccionar}
            mensajeVacio="No hay academias registradas."
          />
        </div>
      )}

      {seleccionada && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Academia seleccionada
              </p>
              {editando ? (
                <form
                  onSubmit={guardarEdicion}
                  className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
                >
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Nombre
                    <input
                      type="text"
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      className={`mt-1 ${CAMPO}`}
                    />
                  </label>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Departamento
                    <input
                      type="text"
                      value={editando.departamento}
                      onChange={(e) => setEditando({ ...editando, departamento: e.target.value })}
                      className={`mt-1 ${CAMPO}`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={guardando || !editando.nombre.trim()}
                    className="min-h-11 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 disabled:opacity-50"
                    style={{ background: GRAD_AZUL }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    disabled={guardando}
                    className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="mt-1 truncate text-lg font-bold text-slate-800">
                    {seleccionada.nombre}
                  </h3>
                  <p className="text-sm text-slate-500">{seleccionada.departamento || "Sin departamento"}</p>
                  {puedeAdministrar && (
                    <Etiqueta variante={seleccionada.activa ? "exito" : "neutro"} className="mt-2">
                      {seleccionada.activa ? "Activa" : "Inactiva"}
                    </Etiqueta>
                  )}
                </>
              )}
            </div>
            {puedeAdministrar && !editando && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditando({ nombre: seleccionada.nombre, departamento: seleccionada.departamento ?? "" })
                  }
                  disabled={guardando}
                  className="min-h-11 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => alternar(seleccionada)}
                  disabled={guardando}
                  className="min-h-11 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {seleccionada.activa ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => setSeleccionada(null)}
                  className="min-h-11 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
