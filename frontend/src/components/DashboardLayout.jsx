import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { nombreCompleto } from "../lib/nombre";
import { IconoCerrar, IconoCuenta, IconoInicio, IconoMenu, IconoSalir } from "./iconos";
import useDialogoAccesible from "./ui/useDialogoAccesible";

const TONOS_NAVEGACION = {
  inicio: "bg-sky-300/10 text-sky-200",
  usuarios: "bg-teal-300/10 text-teal-200",
  "mi-academia": "bg-teal-300/10 text-teal-200",
  academias: "bg-violet-300/10 text-violet-200",
  protocolo: "bg-amber-300/10 text-amber-200",
  "trabajo-terminal": "bg-pink-300/10 text-pink-200",
  presentaciones: "bg-cyan-300/10 text-cyan-200",
};

const claseOpcionCuenta = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-[#1878B6] focus-visible:outline-2 focus-visible:outline-[#1878B6]";
const claseIconoCuenta = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";

// Navegacion filtrada por rol desde Panel; las acciones de cuenta viven en el topbar.
export default function DashboardLayout({ usuario, etiquetaRol, navegacion, breadcrumb, onCerrarSesion, children }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState(null);
  const botonPerfilRef = useRef(null);
  const perfilRef = useRef(null);
  const cerrarMenuRef = useRef(null);
  const location = useLocation();
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const drawerRef = useDialogoAccesible(menuAbierto, cerrarMenu, {
    enfocarAlAbrir: () => cerrarMenuRef.current,
  });

  useEffect(() => {
    setMenuAbierto(false);
    setPerfilAbierto(false);
  }, [location.pathname, location.search]);

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

  useEffect(() => {
    const escritorio = window.matchMedia("(min-width: 1024px)");
    const alCambiar = (e) => { if (e.matches) setMenuAbierto(false); };
    escritorio.addEventListener("change", alCambiar);
    return () => escritorio.removeEventListener("change", alCambiar);
  }, []);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflowAnterior; };
  }, [menuAbierto]);

  const nombre = nombreCompleto(usuario) || "Usuario";
  const nombreCorto = [usuario.nombre?.trim(), usuario.apellido_paterno?.trim()]
    .filter(Boolean).join(" ") || nombre;
  const iniciales = [usuario.nombre, usuario.apellido_paterno]
    .map((parte) => (parte ?? "").trim()[0]).filter(Boolean).join("").toUpperCase() || "U";

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

  const sidebar = (
    <div className="dashboard-sidebar flex h-full flex-col overflow-hidden rounded-[24px] bg-[#102D4B] text-white shadow-xl shadow-[#102D4B]/15">
      <div className="flex min-h-24 items-center justify-between border-b border-white/10 px-6 py-5">
        <Link to="/" aria-label="ESCATT, ir al inicio" className="dashboard-marca rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
          <span className="text-2xl font-bold text-white transition-colors hover:text-sky-300">ESCATT</span>
          <span className="mt-1 block text-xs font-medium text-sky-200/65">ESCOM · CATT</span>
        </Link>
        <button type="button" ref={cerrarMenuRef} onClick={cerrarMenu} className="flex h-11 w-11 items-center justify-center rounded-full text-sky-100 transition hover:bg-white/10 hover:text-white lg:hidden" aria-label="Cerrar menú">
          <IconoCerrar />
        </button>
      </div>
      <nav aria-label="Navegación del panel" className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5">
        {navegacion.map((grupo) => (
          <div key={grupo.categoria}>
            <p className="px-3 pb-2 text-xs font-semibold text-sky-200/60">{grupo.categoria}</p>
            <ul className="space-y-2">
              {grupo.items.map((item) => {
                const Icono = item.icono;
                return (
                  <li key={item.clave}>
                    <NavLink to={item.ruta} className={({ isActive }) => `dashboard-nav group flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${isActive ? "border-sky-300/25 bg-[#1878B6] text-white shadow-md shadow-black/10" : "border-transparent text-sky-50/85 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"}`}>
                      {({ isActive }) => (
                        <>
                          <span className={`dashboard-nav-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-white/20 text-white" : TONOS_NAVEGACION[item.clave] ?? "bg-sky-300/10 text-sky-200"}`}><Icono className="h-5 w-5" /></span>
                          <span className="min-w-0 flex-1 leading-snug"><span className="block">{item.etiqueta}</span>{item.proximamente && <span className={`mt-0.5 block text-[11px] font-medium ${isActive ? "text-sky-100" : "text-sky-200/55"}`}>Próximamente</span>}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="dashboard-layout relative min-h-screen bg-white text-slate-800">
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-72 lg:block">{sidebar}</aside>
      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Cerrar menú" onClick={cerrarMenu} tabIndex={-1} className="absolute inset-0 h-full w-full bg-slate-900/40 backdrop-blur-sm" />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menú de navegación" className="dashboard-drawer absolute inset-y-3 left-3 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[24px] shadow-2xl">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-78" inert={menuAbierto || undefined}>
        <header className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => { setPerfilAbierto(false); setMenuAbierto(true); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden" aria-label="Abrir menú" aria-expanded={menuAbierto}>
            <IconoMenu />
          </button>
          <nav aria-label="Ruta" className="flex min-w-0 items-center gap-2 text-sm">
            <Link to="/panel/inicio" className="hidden rounded-md font-medium text-slate-500 transition hover:text-blue-700 sm:block">Panel</Link>
            <span className="hidden text-slate-300 sm:block" aria-hidden="true">/</span>
            <span aria-current="page" className="min-w-0 break-words font-semibold text-slate-800">{breadcrumb}</span>
          </nav>
          <div ref={perfilRef} className="relative ml-auto shrink-0">
            <button type="button" ref={botonPerfilRef} onClick={() => setPerfilAbierto((abierto) => !abierto)} aria-expanded={perfilAbierto} aria-controls="dashboard-perfil" aria-label={`Opciones de cuenta de ${nombreCorto}`} className={`flex min-h-13 items-center gap-3 rounded-2xl border py-1.5 pl-1.5 pr-3 text-right outline-none transition focus-visible:ring-4 focus-visible:ring-sky-100 sm:pl-3 ${perfilAbierto ? "border-sky-200 bg-sky-50/70" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}>
              <span className="hidden max-w-56 sm:block">
                <span className="block truncate text-sm font-bold text-slate-800">{nombreCorto}</span>
                <span className="mt-0.5 block max-w-56 truncate text-xs font-medium text-[#1878B6]">{etiquetaRol}</span>
              </span>
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1878B6] text-sm font-bold text-white ring-4 ring-sky-50">{iniciales}</span>
              <span aria-hidden="true" className={`dashboard-perfil-chevron h-2 w-2 shrink-0 rotate-45 border-b-2 border-r-2 border-slate-400 ${perfilAbierto ? "!rotate-[225deg]" : ""}`} />
            </button>
            {perfilAbierto && (
              <div id="dashboard-perfil" className="dashboard-perfil absolute right-0 top-full mt-3 max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[20px] border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-[#1878B6]">{iniciales}</span>
                  <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{nombre}</p><p className="mt-1 break-words text-xs text-slate-500">{etiquetaRol}</p></div>
                </div>
                <div className="p-2">
                  <Link to="/panel/mi-cuenta" onClick={() => setPerfilAbierto(false)} className={claseOpcionCuenta}><span className={`${claseIconoCuenta} bg-sky-50 text-[#1878B6]`}><IconoCuenta className="h-4 w-4" /></span><span>Mi perfil</span></Link>
                  <Link to="/" onClick={() => setPerfilAbierto(false)} className={claseOpcionCuenta}><span className={`${claseIconoCuenta} bg-sky-50 text-[#1878B6]`}><IconoInicio className="h-4 w-4" /></span><span>Volver al inicio</span></Link>
                  <div className="my-2 border-t border-slate-100" />
                  <button type="button" onClick={salir} disabled={cerrandoSesion} className={`${claseOpcionCuenta} !text-rose-700 hover:!bg-rose-50 disabled:opacity-60`}><span className={`${claseIconoCuenta} bg-rose-50 text-rose-700`}><IconoSalir className="h-4 w-4" /></span><span>{cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}</span></button>
                  {errorSesion && <p role="alert" className="px-3 py-2 text-sm text-rose-700">{errorSesion}</p>}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
