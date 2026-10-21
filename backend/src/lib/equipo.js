// Equipo de un protocolo de TT: el responsable (protocolos.alumno_id) y los
// compañeros que agregó, todos en protocolo_integrantes. El responsable es
// siempre protocolos.alumno_id; `es_responsable` se calcula de ahí al leer.

// Máximo de alumnos por equipo, responsable incluido. El cliente todavía no
// confirma el valor: es el único lugar que hay que cambiar.
export const MAX_INTEGRANTES = 4;

export const ESTADOS_VIGENTES = ["registrado", "en_evaluacion", "aprobado"];

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Columna `integrantes` de una consulta que tenga la tabla protocolos con el
// alias dado: arreglo JSON con el responsable primero.
export const sqlIntegrantes = (alias = "p") => `
  (SELECT json_agg(
            json_build_object(
              'id', i.alumno_id,
              'nombre', concat_ws(' ', iu.nombre, iu.apellido_paterno, iu.apellido_materno),
              'boleta', ia.boleta,
              'carrera', ia.carrera,
              'es_responsable', i.alumno_id = ${alias}.alumno_id)
            ORDER BY i.alumno_id = ${alias}.alumno_id DESC, i.agregado_en, i.alumno_id)
     FROM protocolo_integrantes i
     JOIN alumnos ia  ON ia.usuario_id = i.alumno_id
     JOIN usuarios iu ON iu.id = i.alumno_id
    WHERE i.protocolo_id = ${alias}.id) AS integrantes`;

export const esIntegrante = (usuarioId, integrantes) => (integrantes ?? []).some((i) => i.id === usuarioId);

// Protocolo vigente más reciente del que la persona es integrante (o null).
// `alumno_id` es el responsable.
//
// Uno "no_aprobado" no cuenta: el equipo puede registrar otro. Cuando exista
// el reenvío de un protocolo corregido (HU-23), ese endpoint debe comprobar
// con esta función que ningún integrante tenga ya otro protocolo vigente.
export async function protocoloVigenteDe(client, usuarioId, { bloquear = false } = {}) {
  const { rows } = await client.query(
    `SELECT p.id, p.alumno_id, p.titulo, p.estado
       FROM protocolos p
       JOIN protocolo_integrantes i ON i.protocolo_id = p.id AND i.alumno_id = $1
      WHERE p.estado = ANY($2)
      ORDER BY p.creado_en DESC, p.id DESC
      LIMIT 1${bloquear ? " FOR UPDATE OF p" : ""}`,
    [usuarioId, ESTADOS_VIGENTES],
  );
  return rows[0] ?? null;
}

// Lista desde un campo multipart repetido, "a,b" o un arreglo JSON, sin
// repetidos. `normalizar` convierte cada valor y devuelve null si no es
// válido; la lista entera es null si algún valor no lo es.
export function parsearLista(valor, normalizar) {
  let crudo = valor;
  if (crudo === undefined || crudo === null || crudo === "") return [];
  if (typeof crudo === "string") {
    const t = crudo.trim();
    if (t.startsWith("[")) {
      try {
        crudo = JSON.parse(t);
      } catch {
        return null;
      }
    } else {
      crudo = t ? t.split(",") : [];
    }
  }
  if (!Array.isArray(crudo)) return null;
  const valores = crudo.map((v) => normalizar(typeof v === "string" ? v.trim() : v));
  if (valores.some((v) => v === null)) return null;
  return [...new Set(valores)];
}

export const listaDeCorreos = (valor) =>
  parsearLista(valor, (v) => (typeof v === "string" && CORREO_VALIDO.test(v) ? v.toLowerCase() : null));

// Mismo mensaje para cualquier motivo: quien registra no debe enterarse de la
// elegibilidad ni de los protocolos de otro alumno.
const noSePuedeAgregar = (correo, periodo) =>
  `No se puede agregar a ${correo} al equipo: debe ser un alumno con cuenta activa, ` +
  `con elegibilidad para TT validada en el periodo ${periodo} y sin otro protocolo vigente`;

// Valida a los compañeros del equipo para el periodo del protocolo y devuelve
// { companeros } o { status, error }. Cada uno debe ser un alumno con cuenta
// activa, elegible en ese periodo y sin otro protocolo vigente.
//
// Con `bloquear` (dentro de la transacción del registro, después de bloquear
// sus filas de alumnos) deja bloqueadas sus filas de usuarios y elegibilidad
// hasta el commit, para que nadie desactive su cuenta ni cambie su
// elegibilidad mientras tanto. Sin `bloquear` sirve para validar antes.
export async function validarEquipo(client, correos, { periodo, bloquear = false }) {
  if (correos.length === 0) return { companeros: [] };
  const { rows } = await client.query(
    `SELECT u.id, lower(u.correo) AS correo,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre,
            a.boleta, a.carrera
       FROM usuarios u
       JOIN alumnos a      ON a.usuario_id = u.id
       JOIN elegibilidad e ON e.alumno_id = u.id AND e.periodo = $2 AND e.estado = 'elegible'
      WHERE lower(u.correo) = ANY($1) AND u.estado = 'activa'
      ORDER BY u.id${bloquear ? " FOR SHARE OF u, e" : ""}`,
    [correos, periodo],
  );
  const porCorreo = new Map(rows.map((r) => [r.correo, r]));
  const faltante = correos.find((c) => !porCorreo.has(c));
  if (faltante) return { status: 409, error: noSePuedeAgregar(faltante, periodo) };

  const { rows: ocupados } = await client.query(
    `SELECT DISTINCT i.alumno_id
       FROM protocolo_integrantes i JOIN protocolos p ON p.id = i.protocolo_id
      WHERE i.alumno_id = ANY($1) AND p.estado = ANY($2)`,
    [rows.map((r) => r.id), ESTADOS_VIGENTES],
  );
  const ocupado = rows.find((r) => ocupados.some((o) => o.alumno_id === r.id));
  if (ocupado) return { status: 409, error: noSePuedeAgregar(ocupado.correo, periodo) };

  return { companeros: correos.map((c) => porCorreo.get(c)) };
}

// Periodo en el que el alumno puede registrar protocolo: el de su registro de
// elegibilidad más reciente, si es "elegible". null si no puede.
export async function periodoElegibleDe(client, alumnoId) {
  const { rows } = await client.query(
    "SELECT periodo, estado FROM elegibilidad WHERE alumno_id = $1 ORDER BY periodo DESC LIMIT 1",
    [alumnoId],
  );
  return rows[0]?.estado === "elegible" ? rows[0].periodo : null;
}
