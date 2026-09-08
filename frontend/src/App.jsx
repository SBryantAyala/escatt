import { useState } from "react";
import NexusLogo from "./components/NexusLogo";
import ListadoPage from "./pages/Listado";

// Navegación mínima sin librerías externas: Sprint 1 solo necesita
// Landing -> Listado. Cuando Edgar/Joshua/Eduardo terminen sus pantallas,
// esto se puede reemplazar por react-router si el equipo lo prefiere.
//
// Paleta de ESCATT: azul institucional tipo ESCOM/CATT (#1878B6 -> #4FB3E8),
// no el amarillo de Nexus Solutions (ese queda solo en su logo/crédito).
export default function App() {
  const [page, setPage] = useState("landing");

  if (page === "listado") {
    return <ListadoPage onVolver={() => setPage("landing")} />;
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-800 flex flex-col overflow-hidden">
      {/* Efectos de fondo: blobs suaves en el azul de ESCATT, no de Nexus */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#4FB3E8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-[#1878B6]/15 blur-3xl" />

      <header className="relative flex items-center gap-3 px-6 py-4">
        <NexusLogo size={32} />
        <span className="text-xs text-slate-400">
          Desarrollado por <span className="font-medium text-slate-500">Nexus Solutions</span>
        </span>
      </header>

      <main className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 w-20 h-20 rounded-3xl flex items-center justify-center
                       shadow-lg shadow-[#1878B6]/25"
            style={{ background: "linear-gradient(135deg, #1878B6 0%, #4FB3E8 100%)" }}
          >
            {/* Documento con check: protocolos de Trabajo Terminal revisados/gestionados */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 5.5 3.5H6Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
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
            className="text-4xl font-bold tracking-tight"
            style={{
              backgroundImage: "linear-gradient(135deg, #0F5C8C 0%, #1878B6 60%, #4FB3E8 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ESCATT
          </h1>
          <p className="mt-2 text-slate-600">
            Sistema de gestión de usuarios de la CATT — alumnos con protocolo
            de Trabajo Terminal, sinodales y personal de coordinación.
          </p>

          <button
            type="button"
            onClick={() => setPage("listado")}
            className="mt-8 inline-flex items-center justify-center rounded-full px-6 py-3
                       font-semibold text-white shadow-lg shadow-[#1878B6]/30
                       transition hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #1878B6 0%, #0F5C8C 100%)" }}
          >
            Ver listado de usuarios
          </button>
        </div>
      </main>

      <footer className="relative px-6 py-4 text-center text-xs text-slate-400">
        ESCATT — Escuela Superior de Cómputo, IPN · Desarrollado por Nexus Solutions
      </footer>
    </div>
  );
}
