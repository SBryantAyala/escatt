// Bloque gris animado para estados de carga. `motion-safe:` hace que la
// animación respete prefers-reduced-motion (sin esa preferencia, el bloque
// queda estático pero igual visible).
export default function Esqueleto({ className = "", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg bg-slate-200/70 motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}
