import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import multer from "multer";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_STAFF, tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

// Cambio de título del protocolo (Documento Rector, Art. 7 III): el alumno
// pide cambiar el título tras las observaciones de sus sinodales/directores;
// la CATT valida con el formato firmado. Al aprobar, la evaluación vuelve a
// empezar. El contrato está en docs/api-cambios-titulo.md.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const ROLES_CONSULTA = ["admin_sistema", ...ROLES_STAFF];
const ROLES_RESUELVEN = ["catt_ejecutivo", "catt_auxiliar"];
// Con dictamen "aprobado" el título ya no se puede cambiar (Art. 44).
const ESTADOS_CAMBIABLES = ["registrado", "en_evaluacion", "no_aprobado"];
const ESTADOS_VIGENTES = ["registrado", "en_evaluacion", "aprobado"];
const ESTADOS_SOLICITUD = ["pendiente", "aprobada", "rechazada"];
const DECISIONES = ["aprobada", "rechazada"];
const MAX_TITULO = 300;
const MAX_MOTIVO = 2000;
const MAX_OBSERVACIONES = 2000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_DOCUMENTOS = path.join(__dirname, "..", "..", "uploads", "cambios-titulo");
fs.mkdirSync(DIR_DOCUMENTOS, { recursive: true });

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };
const DOCUMENTOS = { constancia: "constancia_archivo", protocolo: "protocolo_archivo" };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR_DOCUMENTOS,
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

function entero(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Para comparar títulos sin que cuenten mayúsculas, acentos ni espacios de más.
function normalizar(t) {
  return t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function borrarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  fs.unlink(path.join(DIR_DOCUMENTOS, nombreArchivo), () => {});
}

const SELECT_SOLICITUD = `
  SELECT s.id, s.protocolo_id, s.estado, s.titulo_anterior, s.titulo_propuesto, s.motivo,
         s.creado_en, s.resuelta_en, s.observaciones_resolucion, s.solicitante_id,
         (s.protocolo_archivo IS NOT NULL) AS tiene_protocolo,
         p.titulo AS protocolo_titulo, p.estado AS protocolo_estado,
         a.boleta, a.carrera,
         concat_ws(' ', au.nombre, au.apellido_paterno, au.apellido_materno) AS alumno_nombre,
         concat_ws(' ', ru.nombre, ru.apellido_paterno, ru.apellido_materno) AS resuelta_por_nombre
    FROM solicitudes_cambio_titulo s
    JOIN protocolos p ON p.id = s.protocolo_id
    JOIN alumnos a    ON a.usuario_id = p.alumno_id
    JOIN usuarios au  ON au.id = p.alumno_id
    LEFT JOIN usuarios ru ON ru.id = s.resuelta_por
`;

function serializar(r, evaluaciones) {
  const base = {
    id: r.id,
    estado: r.estado,
    titulo_anterior: r.titulo_anterior,
    titulo_propuesto: r.titulo_propuesto,
    motivo: r.motivo,
    tiene_protocolo: r.tiene_protocolo,
    creado_en: r.creado_en,
    resuelta_en: r.resuelta_en,
    resuelta_por: r.resuelta_por_nombre || null,
    observaciones_resolucion: r.observaciones_resolucion,
    protocolo: { id: r.protocolo_id, titulo: r.protocolo_titulo, estado: r.protocolo_estado },
    alumno: { id: r.solicitante_id, nombre: r.alumno_nombre, boleta: r.boleta, carrera: r.carrera },
  };
  return evaluaciones ? { ...base, ...evaluaciones } : base;
}

// Evaluaciones que solo ve el personal CATT: las que están vigentes en el
// protocolo (lo que motiva el cambio) y las que se archivaron en reinicios
// anteriores.
async function evaluacionesDe(client, protocoloIds) {
  const actuales = new Map();
  const previas = new Map();
  if (protocoloIds.length === 0) return { actuales, previas };

  const { rows: vigentes } = await client.query(
    `SELECT s.protocolo_id, s.dictamen, s.observaciones, s.evaluado_en,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS sinodal
       FROM protocolo_sinodales s JOIN usuarios u ON u.id = s.docente_id
      WHERE s.protocolo_id = ANY($1) AND s.dictamen IS NOT NULL
      ORDER BY s.evaluado_en, s.docente_id`,
    [protocoloIds],
  );
  for (const r of vigentes) {
    if (!actuales.has(r.protocolo_id)) actuales.set(r.protocolo_id, []);
    actuales.get(r.protocolo_id).push({
      sinodal: r.sinodal,
      dictamen: r.dictamen,
      observaciones: r.observaciones,
      evaluado_en: r.evaluado_en,
    });
  }

  const { rows: archivadas } = await client.query(
    `SELECT h.protocolo_id, h.solicitud_id, h.titulo, h.dictamen, h.observaciones,
            h.evaluado_en, h.archivada_en,
            concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS sinodal
       FROM protocolo_evaluaciones_historial h JOIN usuarios u ON u.id = h.docente_id
      WHERE h.protocolo_id = ANY($1)
      ORDER BY h.archivada_en, h.evaluado_en, h.id`,
    [protocoloIds],
  );
  for (const r of archivadas) {
    if (!previas.has(r.protocolo_id)) previas.set(r.protocolo_id, []);
    previas.get(r.protocolo_id).push({
      solicitud_id: r.solicitud_id,
      titulo: r.titulo,
      sinodal: r.sinodal,
      dictamen: r.dictamen,
      observaciones: r.observaciones,
      evaluado_en: r.evaluado_en,
      archivada_en: r.archivada_en,
    });
  }
  return { actuales, previas };
}

async function serializarParaPersonal(client, filas) {
  const { actuales, previas } = await evaluacionesDe(
    client,
    [...new Set(filas.map((f) => f.protocolo_id))],
  );
  return filas.map((f) =>
    serializar(f, {
      evaluaciones_actuales: actuales.get(f.protocolo_id) ?? [],
      evaluaciones_previas: previas.get(f.protocolo_id) ?? [],
    }),
  );
}

async function obtenerSolicitud(id, client = pool) {
  const { rows } = await client.query(`${SELECT_SOLICITUD} WHERE s.id = $1`, [id]);
  return rows[0] ?? null;
}

router.post(
  "/",
  requiereRol("alumno"),
  upload.fields([
    { name: "constancia", maxCount: 1 },
    { name: "protocolo", maxCount: 1 },
  ]),
  ruta(async (req, res) => {
    const constancia = req.files?.constancia?.[0];
    const protocoloDoc = req.files?.protocolo?.[0];
    const rechazar = (status, error) => {
      borrarArchivo(constancia?.filename);
      borrarArchivo(protocoloDoc?.filename);
      return res.status(status).json({ error });
    };

    const tituloPropuesto = texto(req.body.titulo_propuesto).replace(/\s+/g, " ");
    const motivo = texto(req.body.motivo);
    if (!tituloPropuesto || tituloPropuesto.length > MAX_TITULO) {
      return rechazar(400, `El nuevo título es obligatorio (máx. ${MAX_TITULO} caracteres)`);
    }
    if (!motivo || motivo.length > MAX_MOTIVO) {
      return rechazar(400, `El motivo es obligatorio (máx. ${MAX_MOTIVO} caracteres)`);
    }
    if (!constancia) {
      return rechazar(400, "Adjunta el formato de cambio de título firmado (PDF, JPG o PNG)");
    }

    let resultado;
    try {
      resultado = await enTransaccion(async (client) => {
        const { rows: prot } = await client.query(
          `SELECT id, titulo, estado FROM protocolos
            WHERE alumno_id = $1
            ORDER BY creado_en DESC, id DESC LIMIT 1 FOR UPDATE`,
          [req.usuario.id],
        );
        const p = prot[0];
        if (!p) return { status: 409, error: "No tienes un protocolo registrado" };
        if (p.estado === "aprobado") {
          return {
            status: 409,
            error: "Tu protocolo ya está aprobado; después de la aprobación el título ya no se puede cambiar",
          };
        }
        if (!ESTADOS_CAMBIABLES.includes(p.estado)) {
          return { status: 409, error: "Tu protocolo no admite cambio de título" };
        }
        if (normalizar(p.titulo) === normalizar(tituloPropuesto)) {
          return { status: 400, error: "El nuevo título es igual al actual" };
        }

        const { rows: pendiente } = await client.query(
          "SELECT 1 FROM solicitudes_cambio_titulo WHERE protocolo_id = $1 AND estado = 'pendiente'",
          [p.id],
        );
        if (pendiente[0]) {
          return { status: 409, error: "Ya tienes una solicitud de cambio de título pendiente" };
        }

        const { rows } = await client.query(
          `INSERT INTO solicitudes_cambio_titulo
             (protocolo_id, solicitante_id, titulo_anterior, titulo_propuesto, motivo,
              constancia_archivo, protocolo_archivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [p.id, req.usuario.id, p.titulo, tituloPropuesto, motivo, constancia.filename, protocoloDoc?.filename ?? null],
        );
        await registrarBitacora(client, req.usuario.id, "solicitar_cambio_titulo", "solicitudes_cambio_titulo", rows[0].id, {
          protocolo_id: p.id,
        });
        return { id: rows[0].id };
      });
    } catch (err) {
      borrarArchivo(constancia.filename);
      borrarArchivo(protocoloDoc?.filename);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Ya tienes una solicitud de cambio de título pendiente" });
      }
      throw err;
    }
    if (resultado.error) return rechazar(resultado.status, resultado.error);

    res.status(201).json(serializar(await obtenerSolicitud(resultado.id)));
  }),
);

router.get(
  "/mias",
  requiereRol("alumno"),
  ruta(async (req, res) => {
    const { rows } = await pool.query(
      `${SELECT_SOLICITUD} WHERE s.solicitante_id = $1 ORDER BY s.creado_en DESC, s.id DESC`,
      [req.usuario.id],
    );
    res.json(rows.map((r) => serializar(r)));
  }),
);

router.get(
  "/",
  requiereRol(...ROLES_CONSULTA),
  ruta(async (req, res) => {
    const estado = texto(req.query.estado);
    const valores = [];
    let where = "";
    if (estado) {
      if (!ESTADOS_SOLICITUD.includes(estado)) {
        return res.status(400).json({ error: `estado inválido: usa ${ESTADOS_SOLICITUD.join(", ")}` });
      }
      valores.push(estado);
      where = "WHERE s.estado = $1";
    }
    const { rows } = await pool.query(
      `${SELECT_SOLICITUD} ${where}
        ORDER BY (s.estado <> 'pendiente'),
                 CASE WHEN s.estado = 'pendiente' THEN s.creado_en END ASC,
                 s.resuelta_en DESC NULLS LAST, s.id DESC`,
      valores,
    );
    res.json(await serializarParaPersonal(pool, rows));
  }),
);

router.get(
  "/:id/:documento(constancia|protocolo)",
  ruta(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const columna = DOCUMENTOS[req.params.documento];
    const { rows } = await pool.query(
      `SELECT solicitante_id, ${columna} AS archivo FROM solicitudes_cambio_titulo WHERE id = $1`,
      [id],
    );
    if (!rows[0]) return res.status(404).json({ error: "No existe esa solicitud" });
    if (rows[0].solicitante_id !== req.usuario.id && !tieneRol(req.usuario, ...ROLES_CONSULTA)) {
      return res.status(403).json({ error: "No tienes permiso para ver esta solicitud" });
    }
    const archivo = rows[0].archivo;
    if (!archivo) return res.status(404).json({ error: "La solicitud no incluye ese documento" });
    res.download(
      path.join(DIR_DOCUMENTOS, archivo),
      `${req.params.documento}-cambio-titulo-${id}${path.extname(archivo)}`,
    );
  }),
);

router.patch(
  "/:id",
  requiereRol(...ROLES_RESUELVEN),
  ruta(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const decision = texto(req.body?.decision);
    const observaciones = texto(req.body?.observaciones) || null;
    if (!DECISIONES.includes(decision)) {
      return res.status(400).json({ error: "decision debe ser aprobada o rechazada" });
    }
    if (decision === "rechazada" && !observaciones) {
      return res.status(400).json({ error: "Escribe el motivo del rechazo" });
    }
    if (observaciones && observaciones.length > MAX_OBSERVACIONES) {
      return res.status(400).json({ error: `Las observaciones no pueden pasar de ${MAX_OBSERVACIONES} caracteres` });
    }

    const resultado = await enTransaccion(async (client) => {
      const { rows: sol } = await client.query(
        `SELECT protocolo_id, estado, titulo_propuesto
           FROM solicitudes_cambio_titulo WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const s = sol[0];
      if (!s) return { status: 404, error: "No existe esa solicitud" };
      if (s.estado !== "pendiente") return { status: 409, error: "Esta solicitud ya fue resuelta" };

      const { rows: participa } = await client.query(
        `SELECT 1 FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = $2
         UNION ALL
         SELECT 1 FROM protocolo_sinodales WHERE protocolo_id = $1 AND docente_id = $2`,
        [s.protocolo_id, req.usuario.id],
      );
      if (participa[0]) {
        return { status: 403, error: "No puedes resolver una solicitud de un protocolo en el que participas" };
      }

      let detalle = { protocolo_id: s.protocolo_id };
      if (decision === "aprobada") {
        const { rows: prot } = await client.query(
          "SELECT alumno_id, titulo, estado FROM protocolos WHERE id = $1 FOR UPDATE",
          [s.protocolo_id],
        );
        const p = prot[0];
        if (!p) return { status: 409, error: "El protocolo ya no existe" };
        if (p.estado === "aprobado") {
          return { status: 409, error: "El protocolo ya fue aprobado; el título ya no se puede cambiar" };
        }
        if (!ESTADOS_CAMBIABLES.includes(p.estado)) {
          return { status: 409, error: "El protocolo ya no admite cambio de título" };
        }
        if (p.estado === "no_aprobado") {
          // El protocolo vuelve a evaluación: el alumno no puede tener otro vivo.
          const { rows: otro } = await client.query(
            "SELECT 1 FROM protocolos WHERE alumno_id = $1 AND id <> $2 AND estado = ANY($3)",
            [p.alumno_id, s.protocolo_id, ESTADOS_VIGENTES],
          );
          if (otro[0]) {
            return { status: 409, error: "El alumno ya tiene otro protocolo vigente; este no puede volver a evaluación" };
          }
        }

        // La evaluación empieza de nuevo: lo evaluado se archiva y los
        // sinodales (si ya los hay) conservan su lugar, sin dictamen.
        const { rowCount: archivadas } = await client.query(
          `INSERT INTO protocolo_evaluaciones_historial
             (protocolo_id, docente_id, dictamen, observaciones, evaluado_en, titulo, solicitud_id)
           SELECT protocolo_id, docente_id, dictamen, observaciones, evaluado_en, $2, $3
             FROM protocolo_sinodales
            WHERE protocolo_id = $1 AND dictamen IS NOT NULL`,
          [s.protocolo_id, p.titulo, id],
        );
        await client.query(
          `UPDATE protocolo_sinodales
              SET dictamen = NULL, observaciones = NULL, evaluado_en = NULL
            WHERE protocolo_id = $1`,
          [s.protocolo_id],
        );
        const estadoNuevo = p.estado === "no_aprobado" ? "en_evaluacion" : p.estado;
        await client.query("UPDATE protocolos SET titulo = $1, estado = $2 WHERE id = $3", [
          s.titulo_propuesto,
          estadoNuevo,
          s.protocolo_id,
        ]);
        detalle = {
          ...detalle,
          titulo_anterior: p.titulo,
          titulo_nuevo: s.titulo_propuesto,
          estado_anterior: p.estado,
          estado_nuevo: estadoNuevo,
          evaluaciones_archivadas: archivadas,
        };
      }

      await client.query(
        `UPDATE solicitudes_cambio_titulo
            SET estado = $1, resuelta_por = $2, resuelta_en = now(), observaciones_resolucion = $3
          WHERE id = $4`,
        [decision, req.usuario.id, observaciones, id],
      );
      await registrarBitacora(
        client,
        req.usuario.id,
        decision === "aprobada" ? "aprobar_cambio_titulo" : "rechazar_cambio_titulo",
        "solicitudes_cambio_titulo",
        id,
        detalle,
      );
      return null;
    });
    if (resultado) return res.status(resultado.status).json({ error: resultado.error });

    const [fila] = await serializarParaPersonal(pool, [await obtenerSolicitud(id)]);
    res.json(fila);
  }),
);

export default router;
