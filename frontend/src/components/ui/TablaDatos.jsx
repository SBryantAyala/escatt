import { useMemo, useState } from "react";

const FILAS_POR_PAGINA = 25;

// Tabla de datos genérica y accesible.
//
// Regla importante: la fila SOLO abre con clic o Enter (role="button" +
// tabIndex=0 en el <tr>); no se renderizan botones de acción dentro de las
// filas — eso vive fuera de la tabla (p. ej. un panel debajo al seleccionar).
// El único control dentro de una fila es el checkbox de selección, cuando se
// pide `seleccion`.
//
// columnas: [{ clave, titulo, render?(fila), ordenable?, valorOrden?(fila) }]
// busqueda / filtros: slots opcionales (nodos) que se pintan arriba de la tabla.
// seleccion: { seleccionados: id[], onCambiar(ids), acciones? } — si se pasa,
//   aparece checkbox por fila + "seleccionar todos" + barra de acciones.
// paginacion: boolean, 25 filas por página.
export default function TablaDatos({
  columnas,
  filas,
  getId,
  onAbrirFila,
  busqueda,
  filtros,
  seleccion,
  paginacion = false,
  mensajeVacio = "No hay datos para mostrar.",
}) {
  const [orden, setOrden] = useState(null); // { clave, direccion: "asc" | "desc" }
  const [pagina, setPagina] = useState(1);

  const filasOrdenadas = useMemo(() => {
    if (!orden) return filas;
    const columna = columnas.find((c) => c.clave === orden.clave);
    if (!columna) return filas;
    const obtenerValor = columna.valorOrden ?? ((f) => f[columna.clave]);
    const factor = orden.direccion === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => {
      const va = obtenerValor(a);
      const vb = obtenerValor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (
        factor * String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" })
      );
    });
  }, [filas, orden, columnas]);

  const totalPaginas = paginacion
    ? Math.max(1, Math.ceil(filasOrdenadas.length / FILAS_POR_PAGINA))
    : 1;
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = paginacion
    ? filasOrdenadas.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA)
    : filasOrdenadas;

  function alternarOrden(columna) {
    if (!columna.ordenable) return;
    setOrden((actual) => {
      if (!actual || actual.clave !== columna.clave) return { clave: columna.clave, direccion: "asc" };
      if (actual.direccion === "asc") return { clave: columna.clave, direccion: "desc" };
      return null;
    });
  }

  function ariaSortDe(columna) {
    if (!columna.ordenable) return undefined;
    if (!orden || orden.clave !== columna.clave) return "none";
    return orden.direccion === "asc" ? "ascending" : "descending";
  }

  const seleccionActiva = Boolean(seleccion);
  const idsPagina = filasPagina.map(getId);
  const todosSeleccionados =
    seleccionActiva && idsPagina.length > 0 && idsPagina.every((id) => seleccion.seleccionados.includes(id));
  const algunoSeleccionado =
    seleccionActiva && !todosSeleccionados && idsPagina.some((id) => seleccion.seleccionados.includes(id));

  function alternarTodos() {
    if (todosSeleccionados) {
      seleccion.onCambiar(seleccion.seleccionados.filter((id) => !idsPagina.includes(id)));
    } else {
      seleccion.onCambiar([...new Set([...seleccion.seleccionados, ...idsPagina])]);
    }
  }

  function alternarUno(id) {
    if (seleccion.seleccionados.includes(id)) {
      seleccion.onCambiar(seleccion.seleccionados.filter((x) => x !== id));
    } else {
      seleccion.onCambiar([...seleccion.seleccionados, id]);
    }
  }

  function abrir(fila) {
    onAbrirFila?.(fila);
  }

  function alPresionarFila(e, fila) {
    // Si el foco está en el checkbox de la fila (no en el <tr> mismo), Enter
    // no debe abrir la fila.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      abrir(fila);
    }
  }

  return (
    <div>
      {(busqueda || filtros) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          {busqueda}
          {filtros}
        </div>
      )}

      {seleccionActiva && seleccion.seleccionados.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#4FB3E8]/10 px-4 py-2.5 text-sm text-[#0F5C8C]">
          <span className="font-semibold">{seleccion.seleccionados.length} seleccionados</span>
          {seleccion.acciones && <div className="flex flex-wrap gap-2">{seleccion.acciones}</div>}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white/60">
        {filasPagina.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">{mensajeVacio}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                {seleccionActiva && (
                  <th className="w-10 py-2 pl-4 pr-2">
                    <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <span className="sr-only">Seleccionar todos</span>
                      <input
                        type="checkbox"
                        checked={todosSeleccionados}
                        ref={(el) => {
                          if (el) el.indeterminate = algunoSeleccionado;
                        }}
                        onChange={alternarTodos}
                      />
                    </label>
                  </th>
                )}
                {columnas.map((columna) => (
                  <th
                    key={columna.clave}
                    aria-sort={ariaSortDe(columna)}
                    className="py-2 pr-4 font-medium first:pl-4"
                  >
                    {columna.ordenable ? (
                      <button
                        type="button"
                        onClick={() => alternarOrden(columna)}
                        className="flex min-h-11 items-center gap-1 text-left"
                      >
                        {columna.titulo}
                        <span aria-hidden="true" className="text-slate-300">
                          {orden?.clave === columna.clave ? (orden.direccion === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      columna.titulo
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasPagina.map((fila) => {
                const id = getId(fila);
                return (
                  <tr
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrir(fila)}
                    onKeyDown={(e) => alPresionarFila(e, fila)}
                    className="cursor-pointer border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-[#4FB3E8]/10 focus:bg-[#4FB3E8]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4FB3E8]/50"
                  >
                    {seleccionActiva && (
                      <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                        <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                          <span className="sr-only">Seleccionar fila</span>
                          <input
                            type="checkbox"
                            checked={seleccion.seleccionados.includes(id)}
                            onChange={() => alternarUno(id)}
                          />
                        </label>
                      </td>
                    )}
                    {columnas.map((columna) => (
                      <td key={columna.clave} className="py-3 pr-4 first:pl-4">
                        {columna.render ? columna.render(fila) : fila[columna.clave]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {paginacion && totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaSegura === 1}
            className="min-h-11 rounded-full border border-slate-200 px-4 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {paginaSegura} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaSegura === totalPaginas}
            className="min-h-11 rounded-full border border-slate-200 px-4 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
