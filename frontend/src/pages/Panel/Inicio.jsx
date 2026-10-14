import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSesion } from "../../context/SesionContext";
import { IconoCuenta, IconoDocumento, IconoSalir, IconoUsuarios } from "../../components/iconos";
import BienvenidaPanel from "../../components/ui/BienvenidaPanel";
import Esqueleto from "../../components/ui/Esqueleto";
import { api } from "../../lib/api";
import { etiquetaRolPrincipal, rolPrincipal } from "../../lib/roles";
import { ADMIN_Y_CATT, etiquetaDe, navegacionPara } from "../../routes/secciones";
import InicioAlumno from "./InicioAlumno";
import InicioDocente from "./InicioDocente";

const DESCRIPCION_SECCION = {
  usuarios: "Alumnos, docentes y personal CATT",
  "mi-academia": "Docentes e información de tu academia",
  academias: "Academias y presidencias de la ESCOM",
  protocolo: "Registro y revisión de propuestas",
  "trabajo-terminal": "Seguimiento de Trabajo Terminal I y II",
  presentaciones: "Calendario y jurados de presentación",
};

const TONOS_ACCESO = {
  usuarios: "bg-[#0F766E] text-white",
  "mi-academia": "bg-[#0F766E] text-white",
  academias: "bg-[#6D28D9] text-white",
  protocolo: "bg-[#C2410C] text-white",
  "trabajo-terminal": "bg-[#BE185D] text-white",
  presentaciones: "bg-[#1D4ED8] text-white",
};

function TarjetaEstadistica({ etiqueta, valor, total, descripcion, Icono, fondo }) {
  const porcentaje = total ? Math.round(valor / total * 100) : 0;
  return (
    <div title={descripcion} className={`inicio-estadistica flex min-h-28 min-w-0 flex-col rounded-[20px] border border-white/10 p-3 text-white shadow-md sm:p-4 ${fondo}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:h-9 sm:w-9"><Icono className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-2xl font-bold tabular-nums leading-none text-white">{valor}</p><h3 className="mt-1.5 text-xs font-semibold leading-snug text-white">{etiqueta}</h3></div>
      </div>
      <div className="mt-auto flex items-center gap-3 pt-3"><div aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"><div className="inicio-estadistica-avance h-full rounded-full bg-white" style={{ width: `${porcentaje}%` }} /></div><span className="text-xs font-semibold tabular-nums text-white">{porcentaje}%</span></div>
    </div>
  );
}

export default function PanelInicio() {
  const { usuario } = useSesion();
  const esPersonal = usuario.roles?.some((r) => ADMIN_Y_CATT.includes(r));
  const esSoloAlumno = rolPrincipal(usuario) === "alumno";
  const [usuarios, setUsuarios] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [reintentos, setReintentos] = useState(0);

  useEffect(() => {
    if (!esPersonal) return undefined;
    let vivo = true;
    setUsuarios(null);
    setErrorCarga(null);
    api("/api/usuarios")
      .then((datos) => { if (vivo) setUsuarios(Array.isArray(datos) ? datos : []); })
      .catch((e) => { if (vivo) setErrorCarga(e.message); });
    return () => { vivo = false; };
  }, [esPersonal, reintentos]);

  // navegacionPara(...) es barato de recalcular aunque no se use (rama
  // alumno); se deja antes del return para no llamar useMemo condicionalmente.
  const accesos = useMemo(() => navegacionPara(usuario.roles ?? [])
    .flatMap((g) => g.items).filter((item) => item.clave !== "inicio")
    .map((item) => ({ ...item, etiqueta: etiquetaDe(item, usuario) })), [usuario.roles, usuario.academia]);

  if (esSoloAlumno) return <InicioAlumno usuario={usuario} />;
  if (["docente", "presidente_academia"].includes(rolPrincipal(usuario))) {
    return <InicioDocente usuario={usuario} />;
  }

  const total = usuarios?.length ?? 0;
  const activos = usuarios?.filter((u) => u.activo).length ?? 0;
  const pendientes = usuarios?.filter((u) => u.activo && u.debe_cambiar_password).length ?? 0;
  const estadisticas = [
    { etiqueta: "Usuarios registrados", valor: total, descripcion: "Total del padrón disponible", Icono: IconoUsuarios, fondo: "bg-[#1D4ED8]" },
    { etiqueta: "Acceso activo", valor: activos, descripcion: "Cuentas habilitadas", Icono: IconoCuenta, fondo: "bg-[#0F766E]" },
    { etiqueta: "Acceso revocado", valor: total - activos, descripcion: "Cuentas deshabilitadas", Icono: IconoSalir, fondo: "bg-[#BE185D]" },
    { etiqueta: "Contraseña temporal", valor: pendientes, descripcion: "Cambio de contraseña pendiente", Icono: IconoDocumento, fondo: "bg-[#C2410C]" },
  ];

  return (
    <div className="panel-inicio min-w-0 space-y-5 lg:space-y-4">
      <BienvenidaPanel
        etiqueta={etiquetaRolPrincipal(usuario)}
        nombre={usuario.nombre}
        descripcion={esPersonal ? "Administración académica y seguimiento de Trabajo Terminal." : "Tu espacio de seguimiento académico en ESCATT."}
      />

      {esPersonal && (
        <section aria-labelledby="inicio-resumen">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="inicio-resumen" className="text-base font-bold text-[#102D4B]">Resumen de usuarios</h2>
            <span className="text-xs text-slate-500">Padrón disponible para tu rol</span>
          </div>
          {errorCarga ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              <p>No se pudo cargar el resumen de usuarios.</p>
              <button type="button" onClick={() => setReintentos((n) => n + 1)} className="min-h-11 rounded-full border border-rose-200 bg-white px-4 font-semibold transition hover:bg-rose-100">Reintentar</button>
            </div>
          ) : usuarios === null ? (
            <div role="status" aria-label="Cargando resumen de usuarios" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} className="h-28 w-full !rounded-[20px]" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{estadisticas.map((dato) => <TarjetaEstadistica key={dato.etiqueta} {...dato} total={total} />)}</div>
          )}
        </section>
      )}

      {accesos.length > 0 && (
        <section aria-labelledby="inicio-accesos">
          <h2 id="inicio-accesos" className="mb-3 text-base font-bold text-[#102D4B]">Accesos rápidos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accesos.map((item) => {
              const Icono = item.icono;
              return (
                <Link key={item.clave} to={item.ruta} className={`inicio-acceso group flex min-h-28 min-w-0 flex-col rounded-[20px] border border-white/10 p-4 shadow-md outline-none hover:border-white/40 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:ring-offset-2 ${TONOS_ACCESO[item.clave] ?? "bg-[#1D4ED8] text-white"}`}>
                  <div className="flex items-center gap-3">
                    <span className="inicio-acceso-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25"><Icono className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1"><h3 className="text-sm font-bold leading-snug text-white">{item.etiqueta}</h3>{item.proximamente && <span className="mt-0.5 block text-[11px] font-medium text-white">Próximamente</span>}</div>
                    <span aria-hidden="true" className="inicio-acceso-flecha inline-flex shrink-0 items-center justify-center"><span className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2" /></span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white">{DESCRIPCION_SECCION[item.clave] ?? "Abrir sección"}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
