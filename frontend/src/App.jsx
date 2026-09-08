import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
      <main className="w-full max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-8">
        <h1 className="text-2xl font-bold tracking-tight">ESCATT</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esqueleto base — frontend React + Vite + Tailwind.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-700">Estado del backend</p>
          {health && (
            <ul className="mt-2 space-y-1 font-mono text-xs text-slate-600">
              <li>status: {health.status}</li>
              <li>db: {health.db}</li>
              <li>hora: {health.hora}</li>
            </ul>
          )}
          {error && (
            <p className="mt-2 font-mono text-xs text-red-600">
              Sin conexión con la API ({error}). ¿Corriste el backend en el puerto 3000?
            </p>
          )}
          {!health && !error && (
            <p className="mt-2 text-xs text-slate-400">Consultando /api/health…</p>
          )}
        </div>
      </main>
    </div>
  );
}
