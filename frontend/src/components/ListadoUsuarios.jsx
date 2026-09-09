import { useCallback, useEffect, useState } from "react";
import { eliminarUsuario, listarUsuarios, revocarAcceso } from "../api/usuarios.js";
import { usuariosMock } from "../data/usuariosMock.js";

function formatFecha(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor.replace(" ", "T"));
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
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

function ConfirmDialog({ accion, onCancelar, onConfirmar, procesando }) {
  if (!accion) return null;

  const esEliminar = accion.tipo === "eliminar";
  const titulo = esEliminar ? "Eliminar usuario" : "Revocar acceso";
  const mensaje = esEliminar
    ? `Esta acción borra a "${accion.usuario.nombre}" de forma permanente. No se puede deshacer.`
    : `"${accion.usuario.nombre}" perderá acceso al sistema hasta que se le vuelva a dar de alta.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-2 text-sm text-slate-600">{mensaje}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
              esEliminar ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {procesando ? "Procesando…" : esEliminar ? "Eliminar" : "Revocar acceso"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListadoUsuarios() {
  const [usuarios, setUsuarios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [usandoMock, setUsandoMock] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [accionPendiente, setAccionPendiente] = useState(null); // { tipo: 'revocar'|'eliminar', usuario }
  const [procesando, setProcesando] = useState(false);
  const [avisoFila, setAvisoFila] = useState(null); // { id, tipo: 'ok'|'error', mensaje }

  const cargarUsuarios = useCallback(() => {
    setCargando(true);
    setErrorCarga(null);
    listarUsuarios()
      .then((data) => {
        setUsuarios(Array.isArray(data) ? data : []);
        setUsandoMock(false);
      })
      .catch((e) => {
        // El backend de /api/usuarios aún no está publicado en main (lo
        // agrega Bryan). Mientras tanto se usan datos simulados para poder
        // construir y probar la pantalla sin bloquearse.
        setUsuarios(usuariosMock);
        setUsandoMock(true);
        setErrorCarga(e.message);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  function pedirConfirmacion(tipo, usuario) {
    setAccionPendiente({ tipo, usuario });
  }

  function cancelarAccion() {
    if (procesando) return;
    setAccionPendiente(null);
  }

  function confirmarAccion() {
    if (!accionPendiente) return;
    const { tipo, usuario } = accionPendiente;
    setProcesando(true);

    const ejecutar = usandoMock
      ? Promise.resolve()
      : tipo === "eliminar"
        ? eliminarUsuario(usuario.id)
        : revocarAcceso(usuario.id);

    ejecutar
      .then(() => {
        setUsuarios((actuales) =>
          tipo === "eliminar"
            ? actuales.filter((u) => u.id !== usuario.id)
            : actuales.map((u) => (u.id === usuario.id ? { ...u, activo: 0 } : u)),
        );
        setAvisoFila({
          id: usuario.id,
          tipo: "ok",
          mensaje: tipo === "eliminar" ? "Usuario eliminado." : "Acceso revocado.",
        });
      })
      .catch((e) => {
        setAvisoFila({ id: usuario.id, tipo: "error", mensaje: e.message });
      })
      .finally(() => {
        setProcesando(false);
        setAccionPendiente(null);
      });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <main className="mx-auto w-full max-w-4xl rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuarios — CATT</h1>
            <p className="mt-1 text-sm text-slate-500">
              Listado de usuarios, revocar acceso y eliminar cuentas.
            </p>
          </div>
          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={cargando}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {cargando ? "Cargando…" : "Actualizar"}
          </button>
        </div>

        {usandoMock && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Backend de /api/usuarios aún no disponible ({errorCarga}). Mostrando
            datos simulados para poder construir y probar la pantalla.
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          {cargando && !usuarios && (
            <p className="p-4 text-sm text-slate-400">Consultando /api/usuarios…</p>
          )}

          {usuarios && usuarios.length === 0 && (
            <p className="p-4 text-sm text-slate-400">No hay usuarios registrados.</p>
          )}

          {usuarios && usuarios.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Nombre</th>
                  <th className="py-2 pr-4 font-medium">Correo</th>
                  <th className="py-2 pr-4 font-medium">Rol</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Alta</th>
                  <th className="py-2 pl-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-700">{usuario.nombre}</td>
                    <td className="py-3 pr-4 text-slate-500">{usuario.correo}</td>
                    <td className="py-3 pr-4 text-slate-500">{usuario.rol}</td>
                    <td className="py-3 pr-4">
                      <EstadoBadge activo={usuario.activo} />
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{formatFecha(usuario.creado_en)}</td>
                    <td className="py-3 pl-4">
                      <div className="flex justify-end gap-2">
                        {!!usuario.activo && (
                          <button
                            type="button"
                            onClick={() => pedirConfirmacion("revocar", usuario)}
                            className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Revocar acceso
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => pedirConfirmacion("eliminar", usuario)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                      {avisoFila?.id === usuario.id && (
                        <p
                          className={`mt-1 text-right text-xs ${
                            avisoFila.tipo === "ok" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {avisoFila.mensaje}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <ConfirmDialog
        accion={accionPendiente}
        onCancelar={cancelarAccion}
        onConfirmar={confirmarAccion}
        procesando={procesando}
      />
    </div>
  );
}
