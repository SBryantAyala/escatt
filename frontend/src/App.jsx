import { useState } from "react";
import NexusLogo from "./components/NexusLogo";
import ListadoPage from "./pages/Listado";

// Navegación mínima sin librerías externas: Sprint 1 solo necesita
// Landing -> Listado. Cuando Edgar/Joshua/Eduardo terminen sus pantallas,
// esto se puede reemplazar por react-router si el equipo lo prefiere.
export default function App() {
  const [page, setPage] = useState("landing");

  if (page === "listado") {
    return <ListadoPage onVolver={() => setPage("landing")} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      {/* La identidad de ESCATT (el software) es azul/profesional; el amarillo
          de Nexus Solutions queda reservado solo a su logo y a su crédito
          como consultora, no como color del producto. */}
      <header className="flex items-center gap-3 px-6 py-4">
        <NexusLogo size={32} />
        <span className="text-xs text-slate-400">
          Desarrollado por <span className="font-medium text-slate-500">Nexus Solutions</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-blue-800 flex items-center justify-center shadow-sm">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3.2" stroke="white" strokeWidth="1.6" />
              <path
                d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="17" cy="9" r="2.4" stroke="white" strokeWidth="1.5" opacity="0.85" />
              <path
                d="M14.8 19c.2-2.3 1.9-4 4.2-4 1.6 0 3 .8 3.8 2"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-blue-900">ESCATT</h1>
          <p className="mt-2 text-slate-600">
            Sistema de gestión de usuarios de la CATT — alumnos con protocolo
            de Trabajo Terminal, sinodales y personal de coordinación.
          </p>

          <button
            type="button"
            onClick={() => setPage("listado")}
            className="mt-8 inline-flex items-center justify-center rounded-full px-6 py-3
                       font-semibold text-white bg-blue-800 hover:bg-blue-900
                       transition shadow-sm"
          >
            Ver listado de usuarios
          </button>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-400">
        ESCATT — Escuela Superior de Cómputo, IPN · Desarrollado por Nexus Solutions
      </footer>
    </div>
  );
}
