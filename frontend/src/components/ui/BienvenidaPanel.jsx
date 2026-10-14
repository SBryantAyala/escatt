// Encabezado de bienvenida de los inicios del panel: etiqueta de rol, saludo,
// una línea de contexto y la fecha de hoy (hora de la Ciudad de México). Lo
// comparten el Inicio del personal, el del alumno y el del docente.

const ZONA = "America/Mexico_City";

export default function BienvenidaPanel({ etiqueta, nombre, descripcion }) {
  const hoy = new Date();
  const opciones = { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", opciones).formatToParts(hoy).map(({ type, value }) => [type, value]),
  );

  return (
    <header className="inicio-bienvenida relative flex min-h-36 flex-wrap items-center justify-between gap-x-6 gap-y-4 overflow-hidden rounded-[24px] border border-white/15 p-5 text-white sm:px-7">
      <div className="relative z-10 min-w-0 flex-1 basis-64">
        <p className="mb-3 inline-flex max-w-full rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
          <span className="truncate">{etiqueta}</span>
        </p>
        <h1 className="text-2xl font-bold leading-tight text-white">
          <span className="font-normal text-sky-100">Hola,</span> {nombre}
        </h1>
        {descripcion && <p className="mt-2 max-w-lg text-sm leading-relaxed text-sky-100">{descripcion}</p>}
      </div>
      <time
        dateTime={hoy.toLocaleDateString("en-CA", { timeZone: ZONA })}
        aria-label={hoy.toLocaleDateString("es-MX", opciones)}
        className="relative z-10 flex shrink-0 items-center gap-3 text-white sm:border-l sm:border-white/25 sm:pl-6"
      >
        <span className="text-4xl font-semibold tabular-nums leading-none">{partes.day}</span>
        <span className="text-xs leading-relaxed">
          <span className="block font-semibold capitalize">{partes.weekday}</span>
          <span className="block capitalize text-sky-100">
            {partes.month} {partes.year}
          </span>
        </span>
      </time>
    </header>
  );
}
