import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { nombreCompleto } from "../lib/nombre";
import { IconoCuenta, IconoInicio, IconoSalir } from "./iconos";

const TONOS_NAV = {
  inicio: "bg-sky-100 text-[#1878B6]",
  protocolo: "bg-amber-100 text-amber-700",
  "trabajo-terminal": "bg-pink-100 text-pink-700",
  presentaciones: "bg-cyan-100 text-cyan-700",
};

const claseOpcionCuenta =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-[#1878B6] focus-visible:outline-2 focus-visible:outline-[#1878B6]";
const claseIconoCuenta = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";

// Shell del panel para alumnos: topbar simple, sin sidebar. Pensado para
// alguien con muy pocas secciones (Inicio, Protocolo, Mi cuenta) a quien un
// dashboard tipo "administrador" le queda grande. PanelLayout decide cuándo
// usar este shell en vez de DashboardLayout (ver pages/Panel/index.jsx).
export default function PanelAlumnoLayout({ usuario, navegacion, onCerrarSesion, children }) {
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState(null);
  const botonPerfilRef = useRef(null);
  const perfilRef = useRef(null);

  useEffect(() => {
    if (!perfilAbierto) return undefined;
    function alPresionar(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPerfilAbierto(false);
        botonPerfilRef.current?.focus();
      }
    }
    function alSalir(e) {
      if (!perfilRef.current?.contains(e.target)) setPerfilAbierto(false);
    }
    document.addEventListener("keydown", alPresionar);
    document.addEventListener("pointerdown", alSalir);
    document.addEventListener("focusin", alSalir);
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.removeEventListener("pointerdown", alSalir);
      document.removeEventListener("focusin", alSalir);
    };
  }, [perfilAbierto]);

  const nombre = nombreCompleto(usuario) || "Alumno";
  const nombreCorto = [usuario.nombre?.trim(), usuario.apellido_paterno?.trim()].filter(Boolean).join(" ") || nombre;
  const iniciales =
    [usuario.nombre, usuario.apellido_paterno]
      .map((parte) => (parte ?? "").trim()[0])
      .filter(Boolean)
      .join("")
      .toUpperCase() || "A";

  const items = navegacion.flatMap((grupo) => grupo.items);

  async function salir() {
    setCerrandoSesion(true);
    setErrorSesion(null);
    try {
      await onCerrarSesion();
    } catch {
      setErrorSesion("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      setCerrandoSesion(false);
    }
  }

  return (
    <div className="panel-alumno min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 shadow-[0_1px_0_0_rgba(15,23,42,0.03)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" aria-label="ESCATT, ir al inicio" className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1878B6] text-sm font-black text-white">E</span>
            <span className="hidden text-lg font-bold leading-none text-[#102D4B] sm:block">ESCATT</span>
          </Link>

          <nav aria-label="Navegación" className="flex min-w-0 items-center justify-center gap-1.5 overflow-x-auto">
            {items.map((item) => {
              const Icono = item.icono;
              return (
                <NavLink
                  key={item.clave}
                  to={item.ruta}
                  className={({ isActive }) =>
                    `panel-alumno-nav flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300 sm:px-4 ${
                      isActive ? "bg-[#1878B6] text-white shadow-sm shadow-[#1878B6]/30" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-white/20 text-white" : TONOS_NAV[item.clave] ?? "bg-slate-100 text-slate-500"}`}>
                        <Icono className="h-3.5 w-3.5" />
                      </span>
                      <span className="hidden sm:inline">{item.etiqueta}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div ref={perfilRef} className="relative justify-self-end">
            <button
              type="button"
              ref={botonPerfilRef}
              onClick={() => setPerfilAbierto((abierto) => !abierto)}
              aria-expanded={perfilAbierto}
              aria-controls="panel-alumno-perfil"
              aria-label={`Opciones de cuenta de ${nombreCorto}`}
              className={`flex min-h-12 items-center gap-2.5 rounded-2xl border py-1.5 pl-1.5 pr-2.5 outline-none transition focus-visible:ring-4 focus-visible:ring-sky-100 ${
                perfilAbierto ? "border-sky-200 bg-sky-50/70" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1878B6] text-sm font-bold text-white ring-4 ring-sky-50">
                {iniciales}
              </span>
              <span className="hidden max-w-56 text-left leading-tight sm:block">
                <span className="block truncate text-sm font-bold text-slate-800">{nombreCorto}</span>
                <span className="block text-xs font-medium text-[#1878B6]">Alumno</span>
              </span>
              <span aria-hidden="true" className={`hidden h-2 w-2 shrink-0 rotate-45 border-b-2 border-r-2 border-slate-400 transition-transform sm:block ${perfilAbierto ? "-rotate-[135deg]" : ""}`} />
            </button>
            {perfilAbierto && (
              <div
                id="panel-alumno-perfil"
                className="absolute right-0 top-full mt-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-[#1878B6]">
                    {iniciales}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-800">{nombre}</p>
                    <p className="mt-1 text-xs text-slate-500">Alumno · {usuario.boleta ?? "sin boleta"}</p>
                  </div>
                </div>
                <div className="p-2">
                  <Link to="/panel/mi-cuenta" onClick={() => setPerfilAbierto(false)} className={claseOpcionCuenta}>
                    <span className={`${claseIconoCuenta} bg-sky-50 text-[#1878B6]`}><IconoCuenta className="h-4 w-4" /></span>
                    <span>Mi perfil</span>
                  </Link>
                  <Link to="/" onClick={() => setPerfilAbierto(false)} className={claseOpcionCuenta}>
                    <span className={`${claseIconoCuenta} bg-sky-50 text-[#1878B6]`}><IconoInicio className="h-4 w-4" /></span>
                    <span>Volver al inicio</span>
                  </Link>
                  <div className="my-2 border-t border-slate-100" />
                  <button type="button" onClick={salir} disabled={cerrandoSesion} className={`${claseOpcionCuenta} !text-rose-700 hover:!bg-rose-50 disabled:opacity-60`}>
                    <span className={`${claseIconoCuenta} bg-rose-50 text-rose-700`}><IconoSalir className="h-4 w-4" /></span>
                    <span>{cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}</span>
                  </button>
                  {errorSesion && <p role="alert" className="px-3 py-2 text-sm text-rose-700">{errorSesion}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
