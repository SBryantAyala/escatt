import { useEffect, useRef, useState } from "react";
import { AZUL_CLARO, AZUL_MEDIO, GRAD_AZUL } from "../lib/theme";
import { IconoCerrar, IconoInicio, IconoMenu, IconoSalir } from "./iconos";

// Layout reutilizable del panel administrativo: sidebar fija a la izquierda +
// topbar con breadcrumb y tarjeta de usuario + área de contenido.
//
// Es puramente presentacional: no sabe qué secciones existen. Quien lo usa
// (pages/Panel) le pasa la navegación ya filtrada por rol y decide qué
// renderizar en `children`. En móvil la sidebar colapsa a un drawer con
// botón hamburguesa.
//
// Props:
//   usuario         objeto de sesión (se usa nombre + iniciales)
//   etiquetaRol     "Alumno" | "Sinodal" | "Personal CATT"
//   navegacion      [{ categoria, items: [{ clave, etiqueta, icono, proximamente }] }]
//   seccionActiva   clave de la sección seleccionada
//   onSeleccionar   (clave) => void
//   breadcrumb      etiqueta de la sección actual (texto)
//   onCerrarSesion  cerrar sesión (viene de App)
//   onVolverInicio  volver a la landing (viene de App)
//   children        contenido de la sección activa
export default function DashboardLayout({
  usuario,
  etiquetaRol,
  navegacion,
  seccionActiva,
  onSeleccionar,
  breadcrumb,
  onCerrarSesion,
  onVolverInicio,
  children,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenuRef = useRef(null);
  const cerrarMenuRef = useRef(null);
  const primerRenderRef = useRef(true);

  // El drawer móvil se cierra al cambiar de sección o al presionar Escape.
  useEffect(() => {
    setMenuAbierto(false);
  }, [seccionActiva]);

  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, []);

  // Mueve el foco DENTRO del drawer al abrirlo y lo regresa al botón que lo
  // abrió al cerrarlo (nunca en el primer render, para no robar el foco al
  // cargar la página). El resto del contenido queda `inert` mientras el
  // drawer está abierto, así Tab no se puede "escapar" hacia el header/main
  // de atrás — ver el atributo inert más abajo.
  useEffect(() => {
    if (primerRenderRef.current) {
      primerRenderRef.current = false;
      return;
    }
    if (menuAbierto) {
      cerrarMenuRef.current?.focus();
    } else {
      botonMenuRef.current?.focus();
    }
  }, [menuAbierto]);

  const iniciales =
    (usuario.nombre ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "U";

  // El contenido de la sidebar se reutiliza tal cual en el drawer móvil.
  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <span className="text-lg font-bold text-white">ESCATT</span>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Panel CATT</p>
        </div>
        <button
          type="button"
          ref={cerrarMenuRef}
          onClick={() => setMenuAbierto(false)}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <IconoCerrar />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {navegacion.map((grupo) => (
          <div key={grupo.categoria}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              {grupo.categoria}
            </p>
            <ul className="space-y-1">
              {grupo.items.map((item) => {
                const activo = item.clave === seccionActiva;
                const Icono = item.icono;
                return (
                  <li key={item.clave}>
                    <button
                      type="button"
                      onClick={() => onSeleccionar(item.clave)}
                      aria-current={activo ? "page" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        activo
                          ? "text-white shadow-md shadow-[#1878B6]/30"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                      style={activo ? { backgroundImage: GRAD_AZUL } : undefined}
                    >
                      <Icono className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.etiqueta}</span>
                      {item.proximamente && (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            activo ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                          }`}
                        >
                          Pronto
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onVolverInicio}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <IconoInicio className="h-5 w-5 shrink-0" />
          Volver al inicio
        </button>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <IconoSalir className="h-5 w-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-white text-slate-800">
      {/* Fondo de marca: mismos blobs azules animados que el resto del sitio */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="escatt-blob-1 absolute -left-24 -top-28 h-120 w-120 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${AZUL_CLARO}55, transparent 70%)` }}
        />
        <div
          className="escatt-blob-2 absolute -right-32 top-1/3 h-136 w-136 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_MEDIO}44, transparent 70%)` }}
        />
      </div>

      {/* Sidebar fija en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Drawer en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
            className="absolute inset-0 h-full w-full bg-slate-900/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 left-0 w-72 max-w-[80%] shadow-2xl"
          >
            {sidebar}
          </div>
        </div>
      )}

      {/* Mientras el drawer móvil está abierto, el resto del contenido queda
          inert: no es enfocable ni visible para lectores de pantalla, así
          Tab no puede "escapar" del drawer hacia el header/main de atrás. */}
      <div className="lg:pl-64" inert={menuAbierto || undefined}>
        {/* Topbar: breadcrumb + tarjeta de usuario */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/60 bg-white/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            ref={botonMenuRef}
            onClick={() => setMenuAbierto(true)}
            className="-ml-1 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <IconoMenu />
          </button>

          <nav aria-label="Ruta" className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Panel</span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-slate-700">{breadcrumb}</span>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-800">{usuario.nombre}</p>
              <p className="text-xs leading-tight text-[#0F5C8C]">{etiquetaRol}</p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundImage: GRAD_AZUL }}
              aria-label={`${usuario.nombre} — ${etiquetaRol}`}
            >
              <span aria-hidden="true">{iniciales}</span>
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
