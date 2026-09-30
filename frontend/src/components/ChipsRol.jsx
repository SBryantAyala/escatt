import { ETIQUETA_ROL } from "../lib/roles";

// Chips con los roles de una persona (una persona puede tener varios).
export default function ChipsRol({ roles = [], className = "" }) {
  if (!roles.length) return <span className="text-xs text-slate-400">Sin rol</span>;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {roles.map((rol) => (
        <span
          key={rol}
          className="inline-flex items-center rounded-full bg-[#4FB3E8]/15 px-2 py-0.5 text-[11px] font-semibold text-[#0F5C8C]"
        >
          {ETIQUETA_ROL[rol] ?? rol}
        </span>
      ))}
    </span>
  );
}
