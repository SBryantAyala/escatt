import { useCallback, useEffect, useState } from "react";
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

const CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#4FB3E8] focus:outline-none focus:ring-2 focus:ring-[#4FB3E8]/30";

function EstadoBadge({ activa }) {
  return activa ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
      Inactiva
    </span>
  );
}

// Activas primero y, dentro de cada grupo, por nombre (sin distinguir acentos
// ni mayúsculas). Las desactivadas quedan al final de la lista.
function porActivaYNombre(a, b) {
  if (a.activa !== b.activa) return a.activa ? -1 : 1;
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}

export default function AcademiasPage({ actor }) {
  const puedeAdministrar = tieneRol(actor, "catt_ejecutivo");

  const [academias, setAcademias] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [nueva, setNueva] = useState({ nombre: "", departamento: "" });
  const [editando, setEditando] = useState(null); // { id, nombre, departamento }
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  // El Secretario Ejecutivo ve también las inactivas (?todas=1); los demás solo
  // las activas.
  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const datos = await api(puedeAdministrar ? "/api/academias?todas=1" : "/api/academias");
      setAcademias(Array.isArray(datos) ? [...datos].sort(porActivaYNombre) : []);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }, [puedeAdministrar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Corre una escritura, recarga la lista y deja el mensaje de resultado.
  // Devuelve true si salió bien.
  async function ejecutar(accion, mensajeOk) {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      await cargar();
      setAviso(mensajeOk);
      return true;
    } catch (e) {
      setError(e.message);
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
        api(`/api/academias/${editando.id}`, {
          method: "PUT",
          body: { nombre: editando.nombre, departamento: editando.departamento },
        }),
      "Cambios guardados.",
    );
    if (ok) setEditando(null);
  }

  const alternar = (academia) =>
    ejecutar(
      () =>
        api(`/api/academias/${academia.id}`, {
          method: "PUT",
          body: { activa: !academia.activa },
        }),
      academia.activa ? "Academia desactivada." : "Academia activada.",
    );

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
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {aviso && !error && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {aviso}
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
            className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
        <p className="mt-6 p-4 text-sm text-slate-400">Consultando /api/academias…</p>
      )}

      {academias && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white/60">
          {academias.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No hay academias registradas.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pl-4 pr-4 font-medium">Nombre</th>
                  <th className="py-2 pr-4 font-medium">Departamento</th>
                  {puedeAdministrar && <th className="py-2 pr-4 font-medium">Estado</th>}
                  {puedeAdministrar && (
                    <th className="py-2 pr-4 text-right font-medium">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {academias.map((a) =>
                  editando?.id === a.id ? (
                    <tr key={a.id} className="border-b border-slate-100 align-top last:border-0">
                      <td colSpan={4} className="p-4">
                        <form
                          onSubmit={guardarEdicion}
                          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
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
                              onChange={(e) =>
                                setEditando({ ...editando, departamento: e.target.value })
                              }
                              className={`mt-1 ${CAMPO}`}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={guardando || !editando.nombre.trim()}
                            className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 disabled:opacity-50"
                            style={{ background: GRAD_AZUL }}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditando(null)}
                            disabled={guardando}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-100 align-top last:border-0 ${
                        a.activa ? "" : "text-slate-400"
                      }`}
                    >
                      <td className="py-3 pl-4 pr-4 font-medium text-slate-700">
                        <span className={a.activa ? "" : "text-slate-400"}>{a.nombre}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{a.departamento || "—"}</td>
                      {puedeAdministrar && (
                        <td className="py-3 pr-4">
                          <EstadoBadge activa={a.activa} />
                        </td>
                      )}
                      {puedeAdministrar && (
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditando({
                                  id: a.id,
                                  nombre: a.nombre,
                                  departamento: a.departamento ?? "",
                                })
                              }
                              disabled={guardando}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => alternar(a)}
                              disabled={guardando}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {a.activa ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
