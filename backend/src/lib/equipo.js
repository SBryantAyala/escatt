// Equipo de un protocolo de TT: el responsable (protocolos.alumno_id) y los
// compañeros que agregó, todos en protocolo_integrantes.

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
              'es_responsable', i.es_responsable)
            ORDER BY i.es_responsable DESC, i.agregado_en, i.alumno_id)
     FROM protocolo_integrantes i
     JOIN alumnos ia  ON ia.usuario_id = i.alumno_id
     JOIN usuarios iu ON iu.id = i.alumno_id
    WHERE i.protocolo_id = ${alias}.id) AS integrantes`;

export const esIntegrante = (usuarioId, integrantes) => (integrantes ?? []).some((i) => i.id === usuarioId);

// Protocolo vigente más reciente del que la persona es integrante (o null).
// `alumno_id` es el responsable.
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

// Lista de correos desde un campo multipart repetido, "a@x,b@x" o un arreglo
// JSON. null si algún valor no parece un correo.
export function listaDeCorreos(valor) {
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
  const correos = crudo.map((c) => (typeof c === "string" ? c.trim().toLowerCase() : ""));
  if (!correos.every((c) => CORREO_VALIDO.test(c))) return null;
  return [...new Set(correos)];
}

// Valida a un compañero para el equipo y devuelve { alumno } o { status, error }.
// Debe ser un alumno con cuenta activa, con elegibilidad vigente (la del
// periodo más reciente, como el responsable) y sin otro protocolo vigente.
export async function validarCompanero(client, correo) {
  const { rows } = await client.query(
    `SELECT u.id, concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre,
            a.boleta, a.carrera
       FROM usuarios u JOIN alumnos a ON a.usuario_id = u.id
      WHERE lower(u.correo) = lower($1) AND u.estado = 'activa'`,
    [correo],
  );
  const alumno = rows[0];
  if (!alumno) {
    return { status: 400, error: `No hay una cuenta de alumno activa con el correo ${correo}` };
  }

  const { rows: eleg } = await client.query(
    "SELECT estado FROM elegibilidad WHERE alumno_id = $1 ORDER BY periodo DESC LIMIT 1",
    [alumno.id],
  );
  if (eleg[0]?.estado !== "elegible") {
    return { status: 409, error: `${alumno.nombre} no tiene la elegibilidad para TT validada por la CATT` };
  }

  if (await protocoloVigenteDe(client, alumno.id)) {
    return { status: 409, error: `${alumno.nombre} ya forma parte de un protocolo vigente` };
  }
  return { alumno };
}
