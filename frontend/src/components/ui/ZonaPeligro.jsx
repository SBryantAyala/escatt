// Contenedor separado y siempre al final para acciones sensibles (revocar,
// eliminar, etc.). Solo da el marco + título + descripción; las acciones las
// decide quien lo usa.
export default function ZonaPeligro({ titulo = "Zona de peligro", descripcion, children }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/70 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">{titulo}</h2>
      {descripcion && <p className="mt-1 text-sm text-red-700/80">{descripcion}</p>}
      <div className="mt-4 flex flex-wrap gap-3">{children}</div>
    </div>
  );
}
