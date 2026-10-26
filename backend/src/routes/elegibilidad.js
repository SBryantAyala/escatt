import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import multer from "multer";

import { pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_STAFF, tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

// HU-12 (alumno sube evidencia) y HU-13 (Secretario Ejecutivo valida).
// Requisitos del Art. 6 del Documento Rector: niveles I y II completos, al
// menos 10 UA del nivel III y protocolo aprobado. Este módulo no valida eso
// automáticamente (no hay integración con SAES); el alumno sube evidencia y
// una persona de la CATT decide.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_EVIDENCIAS = path.join(__dirname, "..", "..", "uploads", "elegibilidad");
fs.mkdirSync(DIR_EVIDENCIAS, { recursive: true });

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB
const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR_EVIDENCIAS,
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

const SELECT_CON_ALUMNO = `
  SELECT e.id, e.periodo, e.estado, e.motivo, e.validado_en, e.creado_en,
         (e.evidencia_url IS NOT NULL) AS tiene_evidencia,
         e.alumno_id,
         a.boleta, a.carrera,
         u.nombre, u.apellido_paterno, u.apellido_materno,
         vp.nombre AS validado_por_nombre, vp.apellido_paterno AS validado_por_apellido,
         (pb.boleta IS NOT NULL) AS en_padron, pb.nombre AS nombre_padron,
         (SELECT count(*)::int FROM padron_boletas) AS padron_total
  FROM elegibilidad e
  JOIN alumnos a    ON a.usuario_id = e.alumno_id
  LEFT JOIN padron_boletas pb ON pb.boleta = a.boleta
  JOIN usuarios u   ON u.id = e.alumno_id
  LEFT JOIN usuarios vp ON vp.id = e.validado_por
`;

function estadoPadron(fila) {
  if (fila.padron_total === 0) return { estado: "sin_padron", nombre: null };
  if (fila.en_padron) return { estado: "coincide", nombre: fila.nombre_padron };
  return { estado: "no_coincide", nombre: null };
}

function serializar(fila) {
  return {
    id: fila.id,
    periodo: fila.periodo,
    estado: fila.estado,
    motivo: fila.motivo,
    validado_en: fila.validado_en,
    creado_en: fila.creado_en,
    tiene_evidencia: fila.tiene_evidencia,
    padron: estadoPadron(fila),
    validado_por: fila.validado_por_nombre
      ? `${fila.validado_por_nombre} ${fila.validado_por_apellido}`.trim()
      : null,
    alumno: {
      id: fila.alumno_id,
      nombre: [fila.nombre, fila.apellido_paterno, fila.apellido_materno].filter(Boolean).join(" "),
      boleta: fila.boleta,
      carrera: fila.carrera,
    },
  };
}

function borrarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  fs.unlink(path.join(DIR_EVIDENCIAS, nombreArchivo), () => {});
}

// GET /api/elegibilidad/mi -> historial propio del alumno (HU-12).
router.get(
  "/mi",
  requiereRol("alumno"),
  ruta(async (req, res) => {
    const { rows } = await pool.query(
      `${SELECT_CON_ALUMNO} WHERE e.alumno_id = $1 ORDER BY e.periodo DESC`,
      [req.usuario.id],
    );
    res.json(rows.map(serializar));
  }),
);

// POST /api/elegibilidad (multipart: periodo + evidencia) -> sube/reemplaza
// evidencia para un periodo (HU-12).
router.post(
  "/",
  requiereRol("alumno"),
  upload.single("evidencia"),
  ruta(async (req, res) => {
    const periodo = texto(req.body.periodo);
    if (!periodo || periodo.length > 20) {
      if (req.file) borrarArchivo(req.file.filename);
      return res.status(400).json({ error: "periodo es obligatorio (máx. 20 caracteres)" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Debes adjuntar tu kárdex o boleta (PDF, JPG o PNG)" });
    }

    const { rows: existentes } = await pool.query(
      "SELECT id, estado, evidencia_url FROM elegibilidad WHERE alumno_id = $1 AND periodo = $2",
      [req.usuario.id, periodo],
    );
    const existente = existentes[0];

    if (existente && existente.estado !== "pendiente") {
      borrarArchivo(req.file.filename);
      return res.status(409).json({
        error: `Ya se validó tu elegibilidad para el periodo ${periodo}. Sube tu evidencia para un periodo posterior.`,
      });
    }

    let id;
    if (existente) {
      id = existente.id;
      await pool.query("UPDATE elegibilidad SET evidencia_url = $1 WHERE id = $2", [
        req.file.filename,
        id,
      ]);
      borrarArchivo(existente.evidencia_url);
    } else {
      const { rows } = await pool.query(
        `INSERT INTO elegibilidad (alumno_id, periodo, evidencia_url)
         VALUES ($1, $2, $3) RETURNING id`,
        [req.usuario.id, periodo, req.file.filename],
      );
      id = rows[0].id;
    }

    await registrarBitacora(pool, req.usuario.id, "subir_evidencia_tt", "elegibilidad", id, { periodo });

    const { rows } = await pool.query(`${SELECT_CON_ALUMNO} WHERE e.id = $1`, [id]);
    res.status(existente ? 200 : 201).json(serializar(rows[0]));
  }),
);

// GET /api/elegibilidad?estado=pendiente -> lista para la CATT (HU-13).
// Por default solo "pendiente" (lo que pide la historia); ?estado=todos
// trae las tres.
router.get(
  "/",
  requiereRol("admin_sistema", ...ROLES_STAFF),
  ruta(async (req, res) => {
    const estado = texto(req.query.estado) || "pendiente";
    const validos = ["pendiente", "elegible", "no_elegible"];
    if (estado !== "todos" && !validos.includes(estado)) {
      return res.status(400).json({ error: `estado inválido: usa ${[...validos, "todos"].join(", ")}` });
    }
    const where = estado === "todos" ? "" : "WHERE e.estado = $1";
    const { rows } = await pool.query(
      `${SELECT_CON_ALUMNO} ${where} ORDER BY e.creado_en ASC`,
      estado === "todos" ? [] : [estado],
    );
    res.json(rows.map(serializar));
  }),
);

// PATCH /api/elegibilidad/:id { estado, motivo? } -> valida (HU-13). Solo el
// Secretario Ejecutivo: es quien asigna sinodales y decide si el protocolo
// sigue adelante.
router.patch(
  "/:id",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    }
    const estado = texto(req.body.estado);
    if (!["elegible", "no_elegible"].includes(estado)) {
      return res.status(400).json({ error: "estado debe ser elegible o no_elegible" });
    }
    const motivo = texto(req.body.motivo) || null;
    if (estado === "no_elegible" && !motivo) {
      return res.status(400).json({ error: "El motivo es obligatorio para marcar no elegible" });
    }

    const { rows: previas } = await pool.query("SELECT periodo FROM elegibilidad WHERE id = $1", [id]);
    if (previas.length === 0) {
      return res.status(404).json({ error: `No existe elegibilidad con id ${id}` });
    }

    await pool.query(
      `UPDATE elegibilidad
       SET estado = $1, motivo = $2, validado_por = $3, validado_en = now()
       WHERE id = $4`,
      [estado, motivo, req.usuario.id, id],
    );
    await registrarBitacora(pool, req.usuario.id, "validar_elegibilidad", "elegibilidad", id, {
      estado,
      periodo: previas[0].periodo,
    });

    const { rows } = await pool.query(`${SELECT_CON_ALUMNO} WHERE e.id = $1`, [id]);
    res.json(serializar(rows[0]));
  }),
);

// GET /api/elegibilidad/:id/evidencia -> descarga protegida del archivo.
// Solo el propio alumno o personal CATT/admin (mismos roles que listan).
router.get(
  "/:id/evidencia",
  ruta(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    }
    const { rows } = await pool.query(
      "SELECT alumno_id, periodo, evidencia_url FROM elegibilidad WHERE id = $1",
      [id],
    );
    const fila = rows[0];
    if (!fila || !fila.evidencia_url) {
      return res.status(404).json({ error: "No hay evidencia para ese registro" });
    }
    const esDueno = req.usuario.id === fila.alumno_id;
    if (!esDueno && !tieneRol(req.usuario, "admin_sistema", ...ROLES_STAFF)) {
      return res.status(403).json({ error: "No tienes permiso para ver esta evidencia" });
    }
    const ext = path.extname(fila.evidencia_url);
    res.download(
      path.join(DIR_EVIDENCIAS, fila.evidencia_url),
      `evidencia-${fila.periodo}${ext}`,
    );
  }),
);

export default router;
