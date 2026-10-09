import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICONO_ACADEMIA_COMPONENTE } from "../../components/iconosAcademia";
import { useAviso } from "../../components/ui/Avisos";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import Pestanas, { usePestanaUrl } from "../../components/ui/Pestanas";
import TablaDatos from "../../components/ui/TablaDatos";
import ZonaPeligro from "../../components/ui/ZonaPeligro";
import { api } from "../../lib/api";
import { colorDe } from "../../lib/academias";
import { tieneRol } from "../../lib/roles";
import { VIDRIO } from "../../lib/theme";
import DialogoAgregarDocente from "./DialogoAgregarDocente";
import DialogoMoverDocentes from "./DialogoMoverDocentes";
import DialogoPresidente from "./DialogoPresidente";
import SelectorColorIcono from "./SelectorColorIcono";

// Ficha de una academia: encabezado de color + presidente, pestañas
// Integrantes / Configuración. Se usa tanto en /panel/academias/:id (personal
// CATT y admin) como en /panel/mi-academia (el Presidente, en solo lectura:
// no tiene catt_ejecutivo, así que `puedeAdministrar` ya sale en falso y
// ningún botón de acción se pinta).
const CONFIG_PELIGRO = {
  desactivar: {
    nivel: "escribir",
    titulo: "Desactivar academia",
    descripcion: (nombre) =>
      `"${nombre}" dejará de ofrecerse al dar de alta o mover docentes. Los que ya la tienen la conservan.`,
    etiquetaConfirmar: "Desactivar academia",
    colorConfirmar: "bg-red-600 hover:bg-red-700",
  },
  "desactivar-bloqueada": {
    nivel: "bloqueado",
    titulo: "Desactivar academia",
  },
  reactivar: {
    nivel: "simple",
    titulo: "Reactivar academia",
    descripcion: (nombre) => `"${nombre}" vuelve a estar disponible para dar de alta o mover docentes.`,
    etiquetaConfirmar: "Reactivar academia",
  },
};

export default function AcademiaFicha({ actor, academiaId }) {
  const navigate = useNavigate();
  const aviso = useAviso();
  const puedeAdministrar = tieneRol(actor, "catt_ejecutivo");

  const [ficha, setFicha] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [seleccionados, setSeleccionados] = useState([]);
  const [dialogoPresidenteAbierto, setDialogoPresidenteAbierto] = useState(false);
  const [procesandoPresidente, setProcesandoPresidente] = useState(false);
  const [confirmarQuitarPresidente, setConfirmarQuitarPresidente] = useState(false);
  const [procesandoQuitarPresidente, setProcesandoQuitarPresidente] = useState(false);
  const [dialogoMoverAbierto, setDialogoMoverAbierto] = useState(false);
  const [procesandoMover, setProcesandoMover] = useState(false);
  const [dialogoAgregarAbierto, setDialogoAgregarAbierto] = useState(false);
  const [procesandoAgregar, setProcesandoAgregar] = useState(false);

  const [formConfig, setFormConfig] = useState(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [accionPeligro, setAccionPeligro] = useState(null);
  const [procesandoPeligro, setProcesandoPeligro] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const datos = await api(`/api/academias/${academiaId}`);
      setFicha(datos);
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }, [academiaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!ficha) return;
    setFormConfig({
      nombre: ficha.academia.nombre,
      departamento: ficha.academia.departamento ?? "",
      color: ficha.academia.color,
      icono: ficha.academia.icono,
    });
    setSeleccionados((s) => s.filter((id) => ficha.integrantes.some((i) => i.id === id)));
  }, [ficha]);

  const pestanas = puedeAdministrar
    ? [
        { id: "integrantes", etiqueta: "Integrantes", contador: ficha?.integrantes.length ?? 0 },
        { id: "configuracion", etiqueta: "Configuración" },
      ]
    : [{ id: "integrantes", etiqueta: "Integrantes", contador: ficha?.integrantes.length ?? 0 }];
  const [tabActiva, cambiarTab] = usePestanaUrl(pestanas);

  if (cargando) {
    return (
      <div className={`overflow-hidden rounded-3xl ${VIDRIO} bg-white/85`}>
        <Esqueleto className="h-32 w-full rounded-none" />
        <div className="space-y-3 p-6 sm:p-8">
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (errorCarga || !ficha) {
    return (
      <div className={`rounded-3xl p-8 text-center ${VIDRIO} bg-white/85`}>
        <p className="text-base font-medium text-slate-900">{errorCarga || "No se pudo cargar la academia."}</p>
      </div>
    );
  }

  const { academia, presidente, integrantes } = ficha;
  const color = colorDe(academia.color);
  const Icono = ICONO_ACADEMIA_COMPONENTE[academia.icono] ?? ICONO_ACADEMIA_COMPONENTE.codigo;
  const candidatosPresidente = integrantes.filter((i) => i.activo);
  const seleccionadosObjetos = integrantes.filter((i) => seleccionados.includes(i.id));

  function alPedirDesactivar() {
    setAccionPeligro(academia.total_docentes > 0 ? "desactivar-bloqueada" : "desactivar");
  }

  async function confirmarPresidente(docenteId) {
    setProcesandoPresidente(true);
    try {
      const respuesta = await api(`/api/academias/${academiaId}/presidente`, {
        method: "PUT",
        body: { docente_id: docenteId },
      });
      setFicha(respuesta);
      setDialogoPresidenteAbierto(false);
      aviso.exito("Presidente actualizado.");
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setProcesandoPresidente(false);
    }
  }

  async function quitarPresidente() {
    setProcesandoQuitarPresidente(true);
    try {
      const respuesta = await api(`/api/academias/${academiaId}/presidente`, { method: "DELETE" });
      setFicha(respuesta);
      setConfirmarQuitarPresidente(false);
      aviso.exito("La academia quedó sin presidente.");
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setProcesandoQuitarPresidente(false);
    }
  }

  async function moverDocentes(destinoId) {
    setProcesandoMover(true);
    try {
      const cuantos = seleccionados.length;
      const respuesta = await api(`/api/academias/${destinoId}/docentes`, {
        method: "POST",
        body: { docente_ids: seleccionados },
      });
      setDialogoMoverAbierto(false);
      setSeleccionados([]);
      aviso.exito(`Se movieron ${cuantos} docente(s) a ${respuesta.academia.nombre}.`);
      cargar();
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setProcesandoMover(false);
    }
  }

  async function agregarDocentes(ids) {
    setProcesandoAgregar(true);
    try {
      const respuesta = await api(`/api/academias/${academiaId}/docentes`, {
        method: "POST",
        body: { docente_ids: ids },
      });
      setFicha(respuesta);
      setDialogoAgregarAbierto(false);
      aviso.exito(`Se agregaron ${ids.length} docente(s).`);
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setProcesandoAgregar(false);
    }
  }

  async function guardarConfig(e) {
    e.preventDefault();
    const cambios = {};
    if (formConfig.nombre !== academia.nombre) cambios.nombre = formConfig.nombre;
    if (formConfig.departamento !== (academia.departamento ?? "")) cambios.departamento = formConfig.departamento;
    if (formConfig.color !== academia.color) cambios.color = formConfig.color;
    if (formConfig.icono !== academia.icono) cambios.icono = formConfig.icono;
    if (Object.keys(cambios).length === 0) return;

    setGuardandoConfig(true);
    try {
      const respuesta = await api(`/api/academias/${academiaId}`, { method: "PUT", body: cambios });
      setFicha(respuesta);
      aviso.exito("Cambios guardados.");
    } catch (e) {
      aviso.error(e.message);
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function confirmarAccionPeligro() {
    if (!accionPeligro || accionPeligro === "desactivar-bloqueada") return;
    setProcesandoPeligro(true);
    try {
      const activa = accionPeligro === "reactivar";
      const respuesta = await api(`/api/academias/${academiaId}`, { method: "PUT", body: { activa } });
      setFicha(respuesta);
      setAccionPeligro(null);
      aviso.exito(activa ? "Academia reactivada." : "Academia desactivada.");
    } catch (e) {
      aviso.error(e.message);
      setAccionPeligro(null);
    } finally {
      setProcesandoPeligro(false);
    }
  }

  const columnasIntegrantes = [
    {
      clave: "docente",
      titulo: "Docente",
      render: (i) => (
        <>
          <p className="font-medium text-slate-700">{i.nombre_completo}</p>
          <p className="text-xs text-slate-400">{i.correo}</p>
        </>
      ),
    },
    {
      clave: "puesto",
      titulo: "Puesto",
      render: (i) =>
        i.es_presidente ? (
          <Etiqueta style={{ backgroundColor: color.claro, color: color.hex }}>Presidente</Etiqueta>
        ) : (
          <Etiqueta variante="neutro">Docente</Etiqueta>
        ),
    },
    { clave: "numero_empleado", titulo: "Núm. empleado", render: (i) => i.numero_empleado || "—" },
    {
      clave: "estado",
      titulo: "Estado",
      render: (i) => (
        <>
          <Etiqueta variante={i.activo ? "exito" : "neutro"}>{i.activo ? "Activo" : "Revocado"}</Etiqueta>
          {i.debe_cambiar_password && <p className="mt-1 text-[11px] text-amber-600">Contraseña temporal</p>}
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className={`overflow-hidden rounded-3xl ${VIDRIO} bg-white/85`}>
        {/* Encabezado: franja de color + ícono + nombre, y la tarjeta del presidente */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-6 py-7 sm:px-8"
          style={{ backgroundColor: color.hex }}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/25">
              <Icono className="h-7 w-7 text-white" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{academia.nombre}</h1>
                <Etiqueta
                  style={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    color: "#ffffff",
                  }}
                >
                  {academia.activa ? "Activa" : "Inactiva"}
                </Etiqueta>
                {!puedeAdministrar && (
                  <Etiqueta style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "#ffffff" }}>
                    Solo lectura
                  </Etiqueta>
                )}
              </div>
              <p className="mt-1 text-sm text-white/85">
                {academia.departamento || "Sin departamento"} · {academia.total_docentes} docentes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3">
            {presidente ? (
              <>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold"
                  style={{ color: color.hex }}
                  aria-hidden="true"
                >
                  {presidente.iniciales}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/70">Presidente</p>
                  <p className="truncate text-sm font-semibold text-white">{presidente.nombre_completo}</p>
                </div>
              </>
            ) : (
              <span className="text-sm font-medium text-white">Sin presidente asignado</span>
            )}
            {puedeAdministrar && (
              <button
                type="button"
                onClick={() => setDialogoPresidenteAbierto(true)}
                className="min-h-11 shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                style={{ color: color.hex }}
              >
                {presidente ? "Cambiar presidente" : "Asignar presidente"}
              </button>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="px-6 pt-5 sm:px-8">
          {pestanas.length > 1 && (
            <Pestanas pestanas={pestanas} activa={tabActiva} onCambiar={cambiarTab} idBase="academia" />
          )}
        </div>

        <div
          role="tabpanel"
          id={`academia-panel-${tabActiva}`}
          aria-labelledby={pestanas.length > 1 ? `academia-tab-${tabActiva}` : undefined}
          className="p-6 sm:p-8"
        >
          {tabActiva === "configuracion" && puedeAdministrar ? (
            <div className="space-y-6">
              <form onSubmit={guardarConfig} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </span>
                  <input
                    type="text"
                    value={formConfig?.nombre ?? ""}
                    onChange={(e) => setFormConfig((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Departamento
                  </span>
                  <input
                    type="text"
                    value={formConfig?.departamento ?? ""}
                    onChange={(e) => setFormConfig((f) => ({ ...f, departamento: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40"
                  />
                </label>

                <SelectorColorIcono
                  nombre={formConfig?.nombre}
                  color={formConfig?.color}
                  icono={formConfig?.icono}
                  onCambiarColor={(color) => setFormConfig((f) => ({ ...f, color }))}
                  onCambiarIcono={(icono) => setFormConfig((f) => ({ ...f, icono }))}
                />

                <button
                  type="submit"
                  disabled={guardandoConfig}
                  className="min-h-11 rounded-full bg-[#1878B6] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoConfig ? "Guardando…" : "Guardar"}
                </button>
              </form>

              <ZonaPeligro>
                {academia.activa ? (
                  <button
                    type="button"
                    onClick={alPedirDesactivar}
                    className="min-h-11 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    Desactivar academia
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAccionPeligro("reactivar")}
                    className="min-h-11 rounded-lg border border-[#1878B6]/40 bg-white px-3 py-1.5 text-sm font-medium text-[#0F5C8C] transition hover:bg-[#4FB3E8]/10"
                  >
                    Reactivar academia
                  </button>
                )}
              </ZonaPeligro>
            </div>
          ) : (
            <div>
              {puedeAdministrar && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDialogoAgregarAbierto(true)}
                    className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Agregar docente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/panel/usuarios/nuevo?perfil=docente&academia=${academiaId}`)}
                    className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Registrar docente nuevo
                  </button>
                </div>
              )}
              <TablaDatos
                columnas={columnasIntegrantes}
                filas={integrantes}
                getId={(i) => i.id}
                onAbrirFila={(i) => navigate(`/panel/usuarios/${i.id}`)}
                mensajeVacio="Esta academia todavía no tiene docentes."
                seleccion={
                  puedeAdministrar
                    ? {
                        seleccionados,
                        onCambiar: setSeleccionados,
                        acciones: (
                          <button
                            type="button"
                            onClick={() => setDialogoMoverAbierto(true)}
                            className="min-h-11 rounded-full bg-[#1878B6] px-3 py-1 text-xs font-semibold text-white"
                          >
                            Mover a otra academia…
                          </button>
                        ),
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      <DialogoPresidente
        abierto={dialogoPresidenteAbierto}
        candidatos={candidatosPresidente}
        presidenteActual={presidente}
        onCerrar={() => setDialogoPresidenteAbierto(false)}
        onConfirmar={confirmarPresidente}
        onPedirQuitar={() => {
          setDialogoPresidenteAbierto(false);
          setConfirmarQuitarPresidente(true);
        }}
        procesando={procesandoPresidente}
      />

      <DialogoConfirmacion
        abierto={confirmarQuitarPresidente}
        nivel="simple"
        titulo="Dejar sin presidente"
        descripcion={`"${presidente?.nombre_completo}" deja de ser presidente de ${academia.nombre}.`}
        etiquetaConfirmar="Dejar sin presidente"
        colorConfirmar="bg-amber-600 hover:bg-amber-700"
        cargando={procesandoQuitarPresidente}
        onConfirmar={quitarPresidente}
        onCancelar={() => !procesandoQuitarPresidente && setConfirmarQuitarPresidente(false)}
      />

      <DialogoMoverDocentes
        abierto={dialogoMoverAbierto}
        docentes={seleccionadosObjetos}
        academiaActualId={academiaId}
        onCerrar={() => !procesandoMover && setDialogoMoverAbierto(false)}
        onMover={moverDocentes}
        procesando={procesandoMover}
      />

      <DialogoAgregarDocente
        abierto={dialogoAgregarAbierto}
        academiaActualId={academiaId}
        onCerrar={() => !procesandoAgregar && setDialogoAgregarAbierto(false)}
        onAgregar={agregarDocentes}
        procesando={procesandoAgregar}
      />

      <DialogoConfirmacion
        abierto={Boolean(accionPeligro)}
        nivel={CONFIG_PELIGRO[accionPeligro]?.nivel ?? "simple"}
        titulo={CONFIG_PELIGRO[accionPeligro]?.titulo}
        descripcion={CONFIG_PELIGRO[accionPeligro]?.descripcion?.(academia.nombre)}
        etiquetaConfirmar={CONFIG_PELIGRO[accionPeligro]?.etiquetaConfirmar}
        colorConfirmar={CONFIG_PELIGRO[accionPeligro]?.colorConfirmar}
        textoEsperado={academia.nombre}
        motivoBloqueo={
          accionPeligro === "desactivar-bloqueada"
            ? `Tiene ${academia.total_docentes} docentes. Muévelos a otra academia antes de desactivarla.`
            : undefined
        }
        cargando={procesandoPeligro}
        onConfirmar={confirmarAccionPeligro}
        onCancelar={() => !procesandoPeligro && setAccionPeligro(null)}
      />
    </div>
  );
}
