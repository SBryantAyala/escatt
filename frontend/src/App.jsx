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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="flex items-center gap-3 px-6 py-4">
        <NexusLogo size={40} />
        <span className="text-sm text-slate-500">
          Desarrollado por <span className="font-medium text-slate-700">Nexus Solutions</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <NexusLogo size={88} className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">ESCATT</h1>
          <p className="mt-2 text-slate-600">
            Sistema de gestión de usuarios de la CATT — alumnos con protocolo
            de Trabajo Terminal, sinodales y personal de coordinación.
          </p>

          <button
            type="button"
            onClick={() => setPage("listado")}
            className="mt-8 inline-flex items-center justify-center rounded-full px-6 py-3
                       font-semibold text-slate-900 bg-[#FDD40A] hover:brightness-95
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
