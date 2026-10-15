import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import multer from "multer";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { aplicarDictamen } from "../lib/dictamen.js";
import { ROLES_STAFF, tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

// Módulo 2: protocolos de TT.
//   HU-18  el alumno registra su protocolo (POST /, GET /mio)
//   HU-19  el Secretario Ejecutivo lo turna a una Academia (PATCH /:id/academia)
//   HU-20  el Presidente de esa Academia asigna 3 sinodales (PUT /:id/sinodales)
//   HU-21  cada sinodal entrega su evaluación (GET /por-evaluar, POST /:id/evaluacion)
//   HU-25  el director consulta los protocolos que dirige (GET /dirigidos)
// El contrato completo (formas de request/response) está en docs/api-protocolos.md.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

// Personal que consulta cualquier protocolo (HU-20: "el Secretario Ejecutivo
// y el administrador consultan la asignación de cualquier Academia").
const ROLES_CONSULTA = ["admin_sistema", ...ROLES_STAFF];

// Estados en los que el alumno ya tiene un protocolo vivo y no puede
// registrar otro. Uno "no_aprobado" se corrige y reenvía (HU-23).
const ESTADOS_VIGENTES = ["registrado", "en_evaluacion", "aprobado"];

const SINODALES_POR_PROTOCOLO = 3;
const MAX_DIRECTORES = 2;
const MAX_TITULO = 300;
const MAX_RESUMEN = 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_VISTOS_BUENOS = path.join(__dirname, "..", "..", "uploads", "protocolos");
fs.mkdirSync(DIR_VISTOS_BUENOS, { recursive: true });

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR_VISTOS_BUENOS,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT_PERMITIDA[file.mimetype]}`),
  }),
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (_req, file, cb) => {
    if (!EXT_PERMITIDA[file.mimetype]) {
      const err = new Error("Formato no permitido; solo PDF, JPG o PNG");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const texto = (v) => (typeof v === "string" ? v.trim() : "");

function idDeParams(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function borrarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  fs.unlink(path.join(DIR_VISTOS_BUENOS, nombreArchivo), () => {});
}

// Lista de ids enteros positivos sin repetir. Acepta un arreglo JSON (body
// JSON) o, en multipart, el campo repetido, "[1,2]" o "1,2". null si algún
// valor no es un id válido.
function listaDeIds(valor) {
  let crudo = valor;
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
  const ids = crudo.map((v) => Number(typeof v === "string" ? v.trim() : v));
  if (!ids.every((n) => Number.isInteger(n) && n > 0)) return null;
  return [...new Set(ids)];
}

// Ficha de protocolo: lo mismo para la lista y para el detalle, así el
// frontend puede reemplazar una fila con la respuesta de cualquier escritura.
const SQL_DIRECTORES = `(SELECT json_agg(x.director ORDER BY x.es_externo, x.orden_a, x.orden_b)
     FROM (
       SELECT json_build_object(
                'id', d.docente_id,
                'externo_id', NULL::int,
                'externo', false,
                'nombre', concat_ws(' ', du.nombre, du.apellido_paterno, du.apellido_materno)) AS director,
              false AS es_externo, du.apellido_paterno AS orden_a, du.nombre AS orden_b
         FROM protocolo_directores d
         JOIN usuarios du ON du.id = d.docente_id
        WHERE d.protocolo_id = p.id
       UNION ALL
       SELECT json_build_object(
                'id', NULL::int,
                'externo_id', e.id,
                'externo', true,
                'nombre', e.nombre,
                'institucion', e.institucion) AS director,
              true AS es_externo, e.nombre AS orden_a, e.nombre AS orden_b
         FROM protocolo_directores d
         JOIN directores_externos e ON e.id = d.externo_id
        WHERE d.protocolo_id = p.id
     ) x)`;

const SELECT_FICHA = `
  SELECT p.id, p.titulo, p.resumen, p.periodo, p.estado, p.creado_en,
         (p.visto_bueno_archivo IS NOT NULL) AS tiene_visto_bueno,
         p.academia_asignada_en,
         p.alumno_id, a.boleta, a.carrera,
         au.nombre, au.apellido_paterno, au.apellido_materno,
         ac.id AS academia_id, ac.nombre AS academia_nombre,
         ac.color AS academia_color, ac.icono AS academia_icono,
         ac.presidente_id AS academia_presidente_id,
         ${SQL_DIRECTORES} AS directores,
         (SELECT json_agg(
                   json_build_object(
                     'id', s.docente_id,
                     'nombre', concat_ws(' ', su.nombre, su.apellido_paterno, su.apellido_materno),
                     'evaluo', s.dictamen IS NOT NULL)
                   ORDER BY su.apellido_paterno, su.nombre)
            FROM protocolo_sinodales s
            JOIN usuarios su ON su.id = s.docente_id
           WHERE s.protocolo_id = p.id) AS sinodales
  FROM protocolos p
  JOIN alumnos a   ON a.usuario_id = p.alumno_id
  JOIN usuarios au ON au.id = p.alumno_id
  LEFT JOIN academias ac ON ac.id = p.academia_id
`;

function serializarFicha(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    resumen: r.resumen,
    periodo: r.periodo,
    estado: r.estado,
    creado_en: r.creado_en,
    tiene_visto_bueno: r.tiene_visto_bueno,
    alumno: {
      id: r.alumno_id,
      nombre: [r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(" "),
      boleta: r.boleta,
      carrera: r.carrera,
    },
    directores: r.directores ?? [],
    academia: r.academia_id
      ? { id: r.academia_id, nombre: r.academia_nombre, color: r.academia_color, icono: r.academia_icono }
      : null,
    academia_asignada_en: r.academia_asignada_en,
    sinodales: r.sinodales ?? [],
  };
}

async function obtenerFila(id, client = pool) {
  const { rows } = await client.query(`${SELECT_FICHA} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

// ¿Quién puede ver un protocolo? Personal CATT/admin, el alumno dueño, sus
// directores, sus sinodales y el Presidente de la Academia a la que se turnó.
function puedeVerProtocolo(usuario, fila) {
  if (tieneRol(usuario, ...ROLES_CONSULTA)) return true;
  if (usuario.id === fila.alumno_id) return true;
  if (fila.academia_presidente_id === usuario.id) return true;
  return [...(fila.directores ?? []), ...(fila.sinodales ?? [])].some((p) => p.id === usuario.id);
}

// Academia que preside el usuario (o null). academias.presidente_id es la
// fuente de verdad; el rol presidente_academia se mantiene en sincronía.
async function academiaPresidida(usuarioId, client = pool) {
  const { rows } = await client.query("SELECT id FROM academias WHERE presidente_id = $1", [usuarioId]);
  return rows[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// HU-25: protocolos que dirijo
// ---------------------------------------------------------------------------

async function observacionesPorProtocolo(client, protocoloIds) {
  const mapa = new Map();
  if (protocoloIds.length === 0) return mapa;
  const { rows } = await client.query(
    `SELECT s.protocolo_id, s.dictamen, s.observaciones, s.evaluado_en,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS sinodal
       FROM protocolo_sinodales s
       JOIN protocolos p ON p.id = s.protocolo_id
       JOIN usuarios u ON u.id = s.docente_id
      WHERE s.protocolo_id = ANY($1)
        AND p.estado IN ('aprobado', 'no_aprobado')
        AND s.dictamen IS NOT NULL
        AND nullif(btrim(s.observaciones), '') IS NOT NULL
      ORDER BY s.evaluado_en, s.docente_id`,
    [protocoloIds],
  );
  for (const r of rows) {
    if (!mapa.has(r.protocolo_id)) mapa.set(r.protocolo_id, []);
    mapa.get(r.protocolo_id).push({
      sinodal: r.sinodal,
      dictamen: r.dictamen,
      observaciones: r.observaciones,
      evaluado_en: r.evaluado_en,
    });
  }
  return mapa;
}

// GET /api/protocolos/dirigidos -> protocolos donde la persona autenticada
// es director (uno de los dos), con su alumno, su estado y, si aplica, las
// observaciones. Solo cuentas con perfil de docente (HU-25).
//
// No recibe parámetros: el filtro sale siempre de la sesión, así que nadie
// puede pedir los protocolos de otro director.
router.get(
  "/dirigidos",
  ruta(async (req, res) => {
    if (!req.usuario.perfiles?.includes("docente")) {
      return res.status(403).json({ error: "Solo el personal docente puede consultar protocolos que dirige" });
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.titulo, p.estado, p.creado_en,
              a.boleta, a.carrera,
              u.nombre, u.apellido_paterno, u.apellido_materno,
              ${SQL_DIRECTORES} AS directores
         FROM protocolo_directores pd
         JOIN protocolos p ON p.id = pd.protocolo_id
         JOIN alumnos a    ON a.usuario_id = p.alumno_id
         JOIN usuarios u   ON u.id = p.alumno_id
        WHERE pd.docente_id = $1
        ORDER BY p.creado_en DESC, p.id DESC`,
      [req.usuario.id],
    );

    const observaciones = await observacionesPorProtocolo(
      pool,
      rows.map((r) => r.id),
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        estado: r.estado,
        creado_en: r.creado_en,
        alumno: {
          nombre: [r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(" "),
          boleta: r.boleta,
          carrera: r.carrera,
        },
        directores: r.directores ?? [],
        observaciones: observaciones.get(r.id) ?? [],
      })),
    );
  }),
);

// ---------------------------------------------------------------------------
// HU-21: el sinodal evalúa
// ---------------------------------------------------------------------------

const DICTAMENES = ["aprobado", "no_aprobado"];
const MAX_OBSERVACIONES = 5000;

async function alRegistrarEvaluacion(client, protocoloId) {
  await aplicarDictamen(client, protocoloId);
}

// GET /api/protocolos/por-evaluar -> protocolos donde la persona es sinodal,
// con SU evaluación (null si no la ha entregado). Primero los pendientes.
// Solo cuentas con perfil de docente; el filtro sale de la sesión.
router.get(
  "/por-evaluar",
  ruta(async (req, res) => {
    if (!req.usuario.perfiles?.includes("docente")) {
      return res.status(403).json({ error: "Solo el personal docente puede evaluar protocolos" });
    }
    const { rows } = await pool.query(
      `${SELECT_FICHA}
         JOIN protocolo_sinodales ms ON ms.protocolo_id = p.id AND ms.docente_id = $1
        ORDER BY (ms.dictamen IS NOT NULL), p.creado_en ASC, p.id ASC`,
      [req.usuario.id],
    );
    // SELECT_FICHA no trae la evaluación propia; se consulta aparte para no
    // exponer la de los otros sinodales en la ficha común.
    const { rows: propias } = await pool.query(
      `SELECT protocolo_id, dictamen, observaciones, evaluado_en
         FROM protocolo_sinodales WHERE docente_id = $1`,
      [req.usuario.id],
    );
    const porProtocolo = new Map(propias.map((e) => [e.protocolo_id, e]));
    res.json(
      rows.map((r) => {
        const e = porProtocolo.get(r.id);
        return {
          ...serializarFicha(r),
          mi_evaluacion: e?.dictamen
            ? { dictamen: e.dictamen, observaciones: e.observaciones, evaluado_en: e.evaluado_en }
            : null,
        };
      }),
    );
  }),
);

// POST /api/protocolos/:id/evaluacion { dictamen, observaciones? } -> el
// sinodal entrega su evaluación (HU-21). Observaciones obligatorias si es
// "no_aprobado". Una vez entregada no se puede modificar.
//
// Pendiente (HU-27): el plazo de entrega sale del Calendario de Actividades
// de la CATT, que todavía no existe. Cuando exista, se valida aquí.
router.post(
  "/:id/evaluacion",
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const dictamen = texto(req.body?.dictamen);
    const observaciones = texto(req.body?.observaciones) || null;
    if (!DICTAMENES.includes(dictamen)) {
      return res.status(400).json({ error: "dictamen debe ser aprobado o no_aprobado" });
    }
    if (dictamen === "no_aprobado" && !observaciones) {
      return res.status(400).json({ error: "Escribe tus observaciones para marcar el protocolo como no aprobado" });
    }
    if (observaciones && observaciones.length > MAX_OBSERVACIONES) {
      return res.status(400).json({ error: `Las observaciones no pueden pasar de ${MAX_OBSERVACIONES} caracteres` });
    }

    const resultado = await enTransaccion(async (client) => {
      const { rows: prot } = await client.query("SELECT estado FROM protocolos WHERE id = $1 FOR UPDATE", [id]);
      if (!prot[0]) return { status: 404, error: "No existe ese protocolo" };

      const { rows: asignado } = await client.query(
        "SELECT dictamen FROM protocolo_sinodales WHERE protocolo_id = $1 AND docente_id = $2",
        [id, req.usuario.id],
      );
      if (!asignado[0]) return { status: 403, error: "Solo puedes evaluar protocolos donde eres sinodal" };
      if (asignado[0].dictamen) {
        return { status: 409, error: "Ya entregaste tu evaluación de este protocolo; no se puede modificar" };
      }
      if (prot[0].estado !== "en_evaluacion") {
        return { status: 409, error: "Este protocolo ya no está en evaluación" };
      }

      await client.query(
        `UPDATE protocolo_sinodales
            SET dictamen = $1, observaciones = $2, evaluado_en = now()
          WHERE protocolo_id = $3 AND docente_id = $4`,
        [dictamen, observaciones, id, req.usuario.id],
      );
      await registrarBitacora(client, req.usuario.id, "evaluar_protocolo", "protocolos", id, { dictamen });
      await alRegistrarEvaluacion(client, id);
      return null;
    });
    if (resultado) return res.status(resultado.status).json({ error: resultado.error });

    const ficha = serializarFicha(await obtenerFila(id));
    const { rows } = await pool.query(
      "SELECT dictamen, observaciones, evaluado_en FROM protocolo_sinodales WHERE protocolo_id = $1 AND docente_id = $2",
      [id, req.usuario.id],
    );
    res.status(201).json({ ...ficha, mi_evaluacion: rows[0] });
  }),
);

// ---------------------------------------------------------------------------
// HU-18: registrar protocolo
// ---------------------------------------------------------------------------

// GET /api/protocolos/mio -> protocolos propios del alumno, el más reciente
// primero, para que vea su estado (HU-18, criterio 4).
router.get(
  "/mio",
  requiereRol("alumno"),
  ruta(async (req, res) => {
    const { rows } = await pool.query(
      `${SELECT_FICHA} WHERE p.alumno_id = $1 ORDER BY p.creado_en DESC, p.id DESC`,
      [req.usuario.id],
    );
    const observaciones = await observacionesPorProtocolo(
      pool,
      rows.map((r) => r.id),
    );
    res.json(rows.map((r) => ({ ...serializarFicha(r), observaciones: observaciones.get(r.id) ?? [] })));
  }),
);

// GET /api/protocolos/candidatos-director -> docentes activos que el alumno
// puede elegir como director en el formulario de registro. El alumno no
// tiene acceso a /api/usuarios, por eso este catálogo reducido.
router.get(
  "/candidatos-director",
  requiereRol("alumno"),
  ruta(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre,
              ac.id AS academia_id, ac.nombre AS academia
         FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id
         JOIN academias ac ON ac.id = d.academia_id
        WHERE u.estado = 'activa'
        ORDER BY u.apellido_paterno, u.nombre`,
    );
    res.json(rows);
  }),
);

// POST /api/protocolos (multipart: titulo, resumen, directores, visto_bueno)
// -> registra el protocolo del alumno en estado "registrado" (HU-18).
//
// Pendiente (HU-27): la ventana de registro (semana hábil posterior a la
// primera evaluación ordinaria) depende del Calendario de Actividades de la
// CATT, que todavía no existe. Cuando exista, se valida aquí.
router.post(
  "/",
  requiereRol("alumno"),
  upload.single("visto_bueno"),
  ruta(async (req, res) => {
    const rechazar = (status, error) => {
      if (req.file) borrarArchivo(req.file.filename);
      return res.status(status).json({ error });
    };

    const titulo = texto(req.body.titulo);
    const resumen = texto(req.body.resumen);
    if (!titulo || titulo.length > MAX_TITULO) {
      return rechazar(400, `El título es obligatorio (máx. ${MAX_TITULO} caracteres)`);
    }
    if (!resumen || resumen.length > MAX_RESUMEN) {
      return rechazar(400, `El resumen/objetivo es obligatorio (máx. ${MAX_RESUMEN} caracteres)`);
    }
    const directores = listaDeIds(req.body.directores);
    if (!directores) {
      return rechazar(400, "Elige uno o dos directores distintos");
    }
    const externos = req.body.directores_externos === undefined ? [] : listaDeIds(req.body.directores_externos);
    if (!externos) {
      return rechazar(400, "directores_externos debe ser una lista de ids válidos");
    }
    if (directores.length < 1) {
      return rechazar(400, "Elige al menos un director docente de ESCOM");
    }
    if (externos.length > 1 || directores.length + externos.length > MAX_DIRECTORES) {
      return rechazar(400, "Elige uno o dos directores distintos; solo uno puede ser externo");
    }
    if (!req.file) {
      return rechazar(400, "Adjunta la constancia del visto bueno de tu director (PDF, JPG o PNG)");
    }

    // Elegibilidad vigente = el registro del periodo más reciente del alumno.
    const { rows: eleg } = await pool.query(
      "SELECT periodo, estado FROM elegibilidad WHERE alumno_id = $1 ORDER BY periodo DESC LIMIT 1",
      [req.usuario.id],
    );
    if (eleg[0]?.estado !== "elegible") {
      return rechazar(
        409,
        "Para registrar tu protocolo, la CATT debe haber validado tu elegibilidad para TT en el periodo actual",
      );
    }

    const { rows: vigentes } = await pool.query(
      "SELECT id, estado FROM protocolos WHERE alumno_id = $1 AND estado = ANY($2)",
      [req.usuario.id, ESTADOS_VIGENTES],
    );
    if (vigentes.length > 0) {
      return rechazar(409, "Ya tienes un protocolo registrado; no puedes registrar otro");
    }

    const { rows: docentes } = await pool.query(
      `SELECT u.id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id
        WHERE d.usuario_id = ANY($1) AND u.estado = 'activa'`,
      [directores],
    );
    if (docentes.length !== directores.length) {
      return rechazar(400, "Cada director debe ser un docente con cuenta activa");
    }

    if (externos.length > 0) {
      const { rows: encontrados } = await pool.query(
        "SELECT id FROM directores_externos WHERE id = ANY($1)",
        [externos],
      );
      if (encontrados.length !== externos.length) {
        return rechazar(400, "El director externo elegido no existe");
      }
    }

    let id;
    try {
      id = await enTransaccion(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO protocolos (alumno_id, titulo, resumen, periodo, visto_bueno_archivo)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [req.usuario.id, titulo, resumen, eleg[0].periodo, req.file.filename],
        );
        const nuevoId = rows[0].id;
        for (const docenteId of directores) {
          await client.query(
            "INSERT INTO protocolo_directores (protocolo_id, docente_id) VALUES ($1, $2)",
            [nuevoId, docenteId],
          );
        }
        for (const externoId of externos) {
          await client.query(
            "INSERT INTO protocolo_directores (protocolo_id, externo_id) VALUES ($1, $2)",
            [nuevoId, externoId],
          );
        }
        await registrarBitacora(client, req.usuario.id, "registrar_protocolo", "protocolos", nuevoId, {
          periodo: eleg[0].periodo,
          directores,
          directores_externos: externos,
        });
        return nuevoId;
      });
    } catch (err) {
      borrarArchivo(req.file.filename);
      throw err;
    }

    res.status(201).json(serializarFicha(await obtenerFila(id)));
  }),
);

// ---------------------------------------------------------------------------
// Consulta (HU-19 lista para turnar, HU-20 lista del Presidente)
// ---------------------------------------------------------------------------

// GET /api/protocolos?academia=sin_asignar|<id>&estado=<estado>
//   - Personal CATT y admin: todos; filtran por academia y estado.
//     HU-19 usa ?academia=sin_asignar.
//   - Presidente de Academia: solo los turnados a SU academia (el filtro
//     academia se ignora).
//   - Cualquier otro: 403.
router.get(
  "/",
  ruta(async (req, res) => {
    const condiciones = [];
    const valores = [];

    if (tieneRol(req.usuario, ...ROLES_CONSULTA)) {
      const academia = texto(req.query.academia);
      if (academia === "sin_asignar") {
        condiciones.push("p.academia_id IS NULL");
      } else if (academia) {
        const academiaId = Number(academia);
        if (!Number.isInteger(academiaId) || academiaId <= 0) {
          return res.status(400).json({ error: "academia debe ser un id o sin_asignar" });
        }
        valores.push(academiaId);
        condiciones.push(`p.academia_id = $${valores.length}`);
      }
    } else {
      const academiaId = tieneRol(req.usuario, "presidente_academia")
        ? await academiaPresidida(req.usuario.id)
        : null;
      if (!academiaId) {
        return res.status(403).json({ error: "No tienes permiso para consultar protocolos" });
      }
      valores.push(academiaId);
      condiciones.push(`p.academia_id = $${valores.length}`);
    }

    const estado = texto(req.query.estado);
    if (estado) {
      const validos = ["registrado", "en_evaluacion", "aprobado", "no_aprobado"];
      if (!validos.includes(estado)) {
        return res.status(400).json({ error: `estado inválido: usa ${validos.join(", ")}` });
      }
      valores.push(estado);
      condiciones.push(`p.estado = $${valores.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const { rows } = await pool.query(`${SELECT_FICHA} ${where} ORDER BY p.creado_en ASC, p.id ASC`, valores);
    res.json(rows.map(serializarFicha));
  }),
);

// GET /api/protocolos/:id -> ficha (ver puedeVerProtocolo).
router.get(
  "/:id",
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const fila = await obtenerFila(id);
    if (!fila) return res.status(404).json({ error: "No existe ese protocolo" });
    if (!puedeVerProtocolo(req.usuario, fila)) {
      return res.status(403).json({ error: "No tienes permiso para ver este protocolo" });
    }
    res.json(serializarFicha(fila));
  }),
);

// GET /api/protocolos/:id/visto-bueno -> descarga protegida de la constancia.
router.get(
  "/:id/visto-bueno",
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const fila = await obtenerFila(id);
    if (!fila) return res.status(404).json({ error: "No existe ese protocolo" });
    if (!puedeVerProtocolo(req.usuario, fila)) {
      return res.status(403).json({ error: "No tienes permiso para ver este protocolo" });
    }
    const { rows } = await pool.query("SELECT visto_bueno_archivo FROM protocolos WHERE id = $1", [id]);
    const archivo = rows[0]?.visto_bueno_archivo;
    if (!archivo) return res.status(404).json({ error: "Este protocolo no tiene constancia de visto bueno" });
    res.download(path.join(DIR_VISTOS_BUENOS, archivo), `visto-bueno-protocolo-${id}${path.extname(archivo)}`);
  }),
);

// ---------------------------------------------------------------------------
// HU-19: turnar a Academia
// ---------------------------------------------------------------------------

// PATCH /api/protocolos/:id/academia { academia_id } -> el Secretario
// Ejecutivo turna (o corrige) la Academia. Solo mientras el protocolo siga
// "registrado" y sin sinodales: después ya la está evaluando esa Academia.
router.patch(
  "/:id/academia",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const academiaId = Number(req.body?.academia_id);
    if (!Number.isInteger(academiaId) || academiaId <= 0) {
      return res.status(400).json({ error: "academia_id es obligatorio" });
    }

    const resultado = await enTransaccion(async (client) => {
      const { rows: prot } = await client.query(
        `SELECT p.estado, p.academia_id,
                (SELECT count(*)::int FROM protocolo_sinodales s WHERE s.protocolo_id = p.id) AS sinodales
           FROM protocolos p WHERE p.id = $1 FOR UPDATE`,
        [id],
      );
      if (!prot[0]) return { status: 404, error: "No existe ese protocolo" };
      if (prot[0].estado !== "registrado" || prot[0].sinodales > 0) {
        return { status: 409, error: "La Academia ya no se puede cambiar: el protocolo ya tiene sinodales asignados" };
      }

      const { rows: acad } = await client.query("SELECT activa FROM academias WHERE id = $1", [academiaId]);
      if (!acad[0]) return { status: 404, error: "No existe esa academia" };
      if (!acad[0].activa) return { status: 409, error: "Esa academia está inactiva" };

      await client.query(
        `UPDATE protocolos
            SET academia_id = $1, academia_asignada_por = $2, academia_asignada_en = now()
          WHERE id = $3`,
        [academiaId, req.usuario.id, id],
      );
      await registrarBitacora(client, req.usuario.id, "turnar_protocolo_academia", "protocolos", id, {
        academia_id: academiaId,
        academia_anterior: prot[0].academia_id,
      });
      return null;
    });
    if (resultado) return res.status(resultado.status).json({ error: resultado.error });

    res.json(serializarFicha(await obtenerFila(id)));
  }),
);

// ---------------------------------------------------------------------------
// HU-20: asignar sinodales
// ---------------------------------------------------------------------------

// PUT /api/protocolos/:id/sinodales { sinodales: [id, id, id] } -> el
// Presidente de la Academia a la que se turnó asigna (o reemplaza) los 3
// sinodales y el protocolo pasa a "en_evaluacion". Se pueden reemplazar
// mientras ningún sinodal haya entregado su evaluación. Los candidatos son
// los integrantes de GET /api/academias/:id.
router.put(
  "/:id/sinodales",
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const sinodales = listaDeIds(req.body?.sinodales);
    if (!sinodales || sinodales.length !== SINODALES_POR_PROTOCOLO) {
      return res.status(400).json({ error: `Elige exactamente ${SINODALES_POR_PROTOCOLO} sinodales distintos` });
    }

    const resultado = await enTransaccion(async (client) => {
      const { rows: prot } = await client.query(
        `SELECT p.estado, p.academia_id, ac.presidente_id
           FROM protocolos p LEFT JOIN academias ac ON ac.id = p.academia_id
          WHERE p.id = $1 FOR UPDATE OF p`,
        [id],
      );
      const p = prot[0];
      if (!p) return { status: 404, error: "No existe ese protocolo" };
      if (p.presidente_id !== req.usuario.id || !tieneRol(req.usuario, "presidente_academia")) {
        return { status: 403, error: "Solo el Presidente de la Academia a la que se turnó puede asignar sinodales" };
      }
      if (!["registrado", "en_evaluacion"].includes(p.estado)) {
        return { status: 409, error: "El protocolo ya tiene dictamen; no se pueden cambiar los sinodales" };
      }

      const { rows: evaluados } = await client.query(
        "SELECT 1 FROM protocolo_sinodales WHERE protocolo_id = $1 AND dictamen IS NOT NULL LIMIT 1",
        [id],
      );
      if (evaluados.length > 0) {
        return { status: 409, error: "Un sinodal ya entregó su evaluación; no se pueden cambiar los sinodales" };
      }

      const { rows: miembros } = await client.query(
        `SELECT d.usuario_id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id
          WHERE d.usuario_id = ANY($1) AND d.academia_id = $2 AND u.estado = 'activa'`,
        [sinodales, p.academia_id],
      );
      if (miembros.length !== sinodales.length) {
        return { status: 400, error: "Cada sinodal debe ser un docente activo de esta Academia" };
      }

      const { rows: directores } = await client.query(
        "SELECT 1 FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = ANY($2) LIMIT 1",
        [id, sinodales],
      );
      if (directores.length > 0) {
        return { status: 400, error: "Un director del protocolo no puede ser su sinodal" };
      }

      await client.query("DELETE FROM protocolo_sinodales WHERE protocolo_id = $1", [id]);
      for (const docenteId of sinodales) {
        await client.query(
          "INSERT INTO protocolo_sinodales (protocolo_id, docente_id, asignado_por) VALUES ($1, $2, $3)",
          [id, docenteId, req.usuario.id],
        );
      }
      await client.query("UPDATE protocolos SET estado = 'en_evaluacion' WHERE id = $1", [id]);
      await registrarBitacora(client, req.usuario.id, "asignar_sinodales", "protocolos", id, { sinodales });
      return null;
    });
    if (resultado) return res.status(resultado.status).json({ error: resultado.error });

    res.json(serializarFicha(await obtenerFila(id)));
  }),
);

export default router;
