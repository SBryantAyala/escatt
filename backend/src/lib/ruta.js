// Express 4 no atrapa los errores de handlers async: si una consulta falla,
// la petición se queda colgada. `ruta(fn)` pasa cualquier error a next() para
// que lo responda el manejador de errores de src/index.js.
export const ruta = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
