// Badge de estado reutilizable. Mismos tonos que ya se usaban sueltos en
// Listado/Detalle/Academias (EstadoBadge, ActivoBadge), ahora en un solo lugar.
const VARIANTES = {
  exito: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  alerta: "bg-amber-50 text-amber-700 ring-amber-200",
  peligro: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-[#4FB3E8]/15 text-[#0F5C8C] ring-[#4FB3E8]/30",
  neutro: "bg-slate-100 text-slate-500 ring-slate-200",
};

export default function Etiqueta({ variante = "neutro", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
        VARIANTES[variante] ?? VARIANTES.neutro
      } ${className}`}
    >
      {children}
    </span>
  );
}
