// Pantalla mínima mientras se restaura la sesión (consulta a /api/auth/yo).
// La usan las guardas de rutas (RequiereSesion, RequiereInvitado) para no
// mostrar nada hasta saber si hay usuario o no.
export default function CargandoPantalla() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
      <span className="animate-pulse text-sm">Cargando…</span>
    </div>
  );
}
