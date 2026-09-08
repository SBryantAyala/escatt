import { useEffect, useState } from "react";
import NexusLogo from "./components/NexusLogo";
import ListadoPage from "./pages/Listado";

// Navegación mínima sin librerías externas: Sprint 1 solo necesita
// Landing -> Listado (useState, sin react-router).
//
// Paleta DOMINANTE de ESCATT: azul institucional #1878B6 -> #4FB3E8.
// El amarillo #FDD40A es identidad de Nexus Solutions y aparece ÚNICAMENTE
// en su logo y en su crédito de texto, nunca como color de una sección.
const AZUL_MEDIO = "#1878B6";
const AZUL_CLARO = "#4FB3E8";
const AZUL_OSCURO = "#0F5C8C";

const GRAD_AZUL = `linear-gradient(135deg, ${AZUL_MEDIO} 0%, ${AZUL_CLARO} 100%)`;

// Clases reutilizables para el efecto "vidrio esmerilado".
const VIDRIO =
  "border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-[#1878B6]/10";

const ETAPAS = [
  { titulo: "Protocolo", texto: "El alumno registra su propuesta de Trabajo Terminal." },
  {
    titulo: "Trabajo Terminal I",
    texto: "Inicia el desarrollo del proyecto con su sinodal asignado.",
  },
  {
    titulo: "Trabajo Terminal II",
    texto: "Entrega el reporte técnico y avanza a la recta final.",
  },
  {
    titulo: "Presentación final",
    texto: "El alumno presenta y es evaluado por el jurado de sinodales.",
  },
];

const TIPOS = [
  {
    rol: "Alumno",
    texto:
      "Registra su Protocolo de Trabajo Terminal y avanza por las etapas TT-I y TT-II hasta su presentación final.",
  },
  {
    rol: "Sinodal",
    texto: "Asesora el desarrollo del trabajo y evalúa al alumno en cada presentación.",
  },
  {
    rol: "Personal CATT",
    texto:
      "Administra registros, calendarios y aprueba modificaciones a lo largo de todo el proceso.",
  },
];

// Íconos minimalistas (1-2 trazos) para el grid de operaciones.
const OPERACIONES = [
  {
    etiqueta: "Listar",
    icono: (
      <>
        <path d="M8 7h11M8 12h11M8 17h11" />
        <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  { etiqueta: "Dar de alta", icono: <path d="M12 5v14M5 12h14" /> },
  {
    etiqueta: "Consultar",
    icono: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.3-4.3" />
      </>
    ),
  },
  {
    etiqueta: "Modificar",
    icono: (
      <>
        <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z" />
        <path d="M14 6l3 3" />
      </>
    ),
  },
  {
    etiqueta: "Revocar acceso",
    icono: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 7l10 10" />
      </>
    ),
  },
  {
    etiqueta: "Eliminar",
    icono: (
      <>
        <path d="M5 7h14M10 7V5h4v2" />
        <path d="M8 7l1 12h6l1-12" />
      </>
    ),
  },
];

const CHIPS = ["React + Node.js + SQLite", "100% local", "Sin dependencias externas"];

// Insignia de co-marca: aquí es donde vive el amarillo de Nexus, sobre fondo
// oscuro para que el #FDD40A sea legible.
function InsigniaNexus({ logo = 20, texto = "text-xs" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5">
      <NexusLogo size={logo} />
      <span className={`${texto} font-semibold text-[#FDD40A]`}>Nexus Solutions</span>
    </span>
  );
}

function ModalAcceso({ onCerrar, onIrListado }) {
  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Acceso en construcción"
      onClick={onCerrar}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 text-center ${VIDRIO} bg-white/90`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ backgroundImage: GRAD_AZUL }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="white" strokeWidth="1.6" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="white" strokeWidth="1.6" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso en construcción</h3>
        <p className="mt-2 text-sm text-slate-600">
          El inicio de sesión llega en un sprint futuro. Por ahora puedes entrar directo al
          listado.
        </p>
        <button
          type="button"
          onClick={onIrListado}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5
                     font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                     hover:-translate-y-0.5 hover:shadow-xl"
          style={{ backgroundImage: GRAD_AZUL }}
        >
          Ver listado de usuarios
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-3 block w-full text-xs text-slate-400 transition hover:text-slate-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function CarruselEtapas() {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return undefined;
    const id = setInterval(() => {
      setActivo((i) => (i + 1) % ETAPAS.length);
    }, 5500);
    return () => clearInterval(id);
  }, [pausado]);

  return (
    <div
      className="mt-10"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activo * 100}%)` }}
        >
          {ETAPAS.map((etapa, i) => (
            <div key={etapa.titulo} className="w-full shrink-0 px-1">
              <div
                className={`flex min-h-[168px] flex-col justify-center rounded-3xl p-7 transition-opacity duration-500 ${VIDRIO} ${
                  i === activo ? "opacity-100" : "opacity-50"
                }`}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: AZUL_MEDIO }}
                >
                  Etapa {i + 1} de {ETAPAS.length}
                </span>
                <h4 className="mt-2 text-xl font-bold text-slate-800">{etapa.titulo}</h4>
                <p className="mt-1.5 text-slate-600">{etapa.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {ETAPAS.map((etapa, i) => (
          <button
            key={etapa.titulo}
            type="button"
            aria-label={`Ver etapa ${i + 1}: ${etapa.titulo}`}
            aria-current={i === activo}
            onClick={() => setActivo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activo ? "w-8" : "w-2 bg-slate-300 hover:bg-slate-400"
            }`}
            style={i === activo ? { backgroundImage: GRAD_AZUL } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const alHacerScroll = () => setScrolled(window.scrollY > 8);
    alHacerScroll();
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => window.removeEventListener("scroll", alHacerScroll);
  }, []);

  if (page === "listado") {
    return <ListadoPage onVolver={() => setPage("landing")} />;
  }

  const irAListado = () => {
    setModalAbierto(false);
    setPage("listado");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Fondo: blobs azules grandes, desenfocados y en movimiento lento */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="escatt-blob-1 absolute -left-24 -top-28 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${AZUL_CLARO}55, transparent 70%)` }}
        />
        <div
          className="escatt-blob-2 absolute -right-32 top-1/3 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_MEDIO}44, transparent 70%)` }}
        />
        <div
          className="escatt-blob-3 absolute bottom-[-12rem] left-1/4 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_CLARO}3d, transparent 70%)` }}
        />
      </div>

      {/* TOPBAR */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled
            ? "border-b border-white/50 bg-white/70 shadow-sm backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <a href="#inicio" className="text-lg font-bold" style={{ color: AZUL_MEDIO }}>
            ESCATT
          </a>

          <nav className="ml-3 hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#inicio" className="transition hover:text-slate-900">
              Inicio
            </a>
            <a href="#catt" className="transition hover:text-slate-900">
              ¿Qué es la CATT?
            </a>
            <a href="#operaciones" className="transition hover:text-slate-900">
              Operaciones
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 transition
                         hover:text-slate-900 sm:text-sm"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-md
                         shadow-[#1878B6]/30 transition hover:-translate-y-0.5 hover:shadow-lg sm:px-4 sm:text-sm"
              style={{ backgroundImage: GRAD_AZUL }}
            >
              Registrarse
            </button>
            <span className="hidden lg:inline-flex">
              <InsigniaNexus logo={18} texto="text-[11px]" />
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          id="inicio"
          className="mx-auto flex min-h-[88vh] max-w-3xl scroll-mt-24 flex-col items-center
                     justify-center px-4 pb-16 pt-28 text-center"
        >
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg shadow-[#1878B6]/25"
            style={{ background: GRAD_AZUL }}
          >
            {/* Documento con check: protocolos de Trabajo Terminal gestionados */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 5.5 3.5H6Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 3.5V7a1 1 0 0 0 1 1h3.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8.2 13.6l2.3 2.3 5-5"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1
            className="text-5xl font-bold tracking-tight sm:text-6xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${AZUL_OSCURO} 0%, ${AZUL_MEDIO} 60%, ${AZUL_CLARO} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ESCATT
          </h1>

          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Administra a los participantes del proceso de titulación de la CATT — alumnos con
            protocolo de Trabajo Terminal, sinodales y personal de coordinación.
          </p>

          <button
            type="button"
            onClick={() => setPage("listado")}
            className="mt-8 inline-flex items-center justify-center rounded-full px-7 py-3
                       font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                       hover:-translate-y-0.5 hover:shadow-xl"
            style={{ background: GRAD_AZUL }}
          >
            Ver listado de usuarios
          </button>
        </section>

        {/* ¿QUÉ ES LA CATT? */}
        <section id="catt" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-20">
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">¿Qué es la CATT?</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            La Comisión Académica de Trabajos Terminales (CATT) administra el proceso de
            titulación curricular de ESCOM: desde el registro del Protocolo, pasando por Trabajo
            Terminal I y II, hasta la presentación final ante sinodales. ESCATT digitaliza el
            registro y seguimiento de quienes participan en ese proceso.
          </p>
          <CarruselEtapas />
        </section>

        {/* TARJETAS DE TIPOS DE USUARIO */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {TIPOS.map((tipo) => (
              <div
                key={tipo.rol}
                className={`rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${VIDRIO}`}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{ backgroundImage: GRAD_AZUL }}
                >
                  {tipo.rol[0]}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{tipo.rol}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tipo.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GRID DE OPERACIONES */}
        <section id="operaciones" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Operaciones</h2>
          <p className="mt-3 text-slate-600">
            Todo lo que ESCATT permite hacer sobre el padrón de participantes.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {OPERACIONES.map((op) => (
              <div
                key={op.etiqueta}
                className={`flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition
                           duration-300 hover:-translate-y-1 hover:shadow-lg ${VIDRIO}`}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: AZUL_MEDIO }}
                  aria-hidden="true"
                >
                  {op.icono}
                </svg>
                <span className="text-sm font-semibold text-slate-700">{op.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CHIPS DE STACK */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex flex-wrap justify-center gap-3">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#1878B6]/20 bg-[#4FB3E8]/10 px-4 py-1.5
                           text-sm font-medium text-[#0F5C8C]"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/50 bg-white/50 px-4 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-500 sm:flex-row sm:justify-between sm:text-left">
          <p>
            ESCATT — Escuela Superior de Cómputo, IPN · Desarrollado por Bryan, Edgar, Joshua y
            Eduardo — Nexus Solutions
          </p>
          <InsigniaNexus />
        </div>
      </footer>

      {modalAbierto && (
        <ModalAcceso onCerrar={() => setModalAbierto(false)} onIrListado={irAListado} />
      )}
    </div>
  );
}
