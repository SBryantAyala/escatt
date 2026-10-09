// Encabezado reutilizable para pantallas de "ficha" (detalle de un registro):
// título, subtítulo, etiquetas y una zona de acciones a la derecha. `figura`
// es un slot opcional para un avatar/ícono antes del texto.
export default function EncabezadoFicha({ figura, titulo, subtitulo, etiquetas, acciones }) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 p-6 sm:p-8">
      {figura}
      <div className="min-w-0 flex-1">
        {etiquetas && <div className="flex flex-wrap items-center gap-2">{etiquetas}</div>}
        <h1 className="mt-1.5 truncate text-xl font-bold text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="shrink-0">{acciones}</div>}
    </div>
  );
}
