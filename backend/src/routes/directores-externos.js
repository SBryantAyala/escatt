import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import multer from "multer";

import { pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_GESTION, ROLES_STAFF, tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

const router = Router();
router.use(autenticar, exigeCambioResuelto);

const ROLES_CONSULTA = ["admin_sistema", ...ROLES_STAFF];
const MAX_NOMBRE = 200;
const MAX_INSTITUCION = 200;
const MAX_CORREO = 200;
const MAX_CEDULA = 30;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENTOS = { cedula: "cedula_archivo", curriculum: "curriculum_archivo" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_DOCUMENTOS = path.join(__dirname, "..", "..", "uploads", "directores-externos");
fs.mkdirSync(DIR_DOCUMENTOS, { recursive: true });

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

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

function borrarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  fs.unlink(path.join(DIR_DOCUMENTOS, nombreArchivo), () => {});
}

function serializar(r, completo) {
  const base = { id: r.id, nombre: r.nombre, institucion: r.institucion };
  if (!completo) return base;
  return { ...base, correo: r.correo, cedula_numero: r.cedula_numero, creado_en: r.creado_en };
}

router.post(
  "/",
  requiereRol("alumno", ...ROLES_GESTION),
  upload.fields([
    { name: "cedula", maxCount: 1 },
    { name: "curriculum", maxCount: 1 },
  ]),
  ruta(async (req, res) => {
    const cedula = req.files?.cedula?.[0];
    const curriculum = req.files?.curriculum?.[0];
    const rechazar = (status, error) => {
      borrarArchivo(cedula?.filename);
      borrarArchivo(curriculum?.filename);
      return res.status(status).json({ error });
    };

    const nombre = texto(req.body.nombre);
    const institucion = texto(req.body.institucion);
    const correo = texto(req.body.correo);
    const cedulaNumero = texto(req.body.cedula_numero);

    if (!nombre || nombre.length > MAX_NOMBRE) {
      return rechazar(400, `El nombre es obligatorio (máx. ${MAX_NOMBRE} caracteres)`);
    }
    if (!institucion || institucion.length > MAX_INSTITUCION) {
      return rechazar(400, `La institución es obligatoria (máx. ${MAX_INSTITUCION} caracteres)`);
    }
    if (!correo || correo.length > MAX_CORREO || !CORREO_VALIDO.test(correo)) {
      return rechazar(400, "El correo es obligatorio y debe ser válido");
    }
    if (!cedulaNumero || cedulaNumero.length > MAX_CEDULA) {
      return rechazar(400, `El número de cédula es obligatorio (máx. ${MAX_CEDULA} caracteres)`);
    }
    if (!cedula) {
      return rechazar(400, "Adjunta la copia de la cédula profesional (PDF, JPG o PNG)");
    }
    if (!curriculum) {
      return rechazar(400, "Adjunta el mini currículum (PDF, JPG o PNG)");
    }

    let fila;
    try {
      const { rows } = await pool.query(
        `INSERT INTO directores_externos
           (nombre, institucion, correo, cedula_numero, cedula_archivo, curriculum_archivo, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, nombre, institucion, correo, cedula_numero, creado_en`,
        [nombre, institucion, correo, cedulaNumero, cedula.filename, curriculum.filename, req.usuario.id],
      );
      fila = rows[0];
    } catch (err) {
      if (err.code === "23505") {
        return rechazar(409, "Ese director externo ya está registrado; elígelo de la lista");
      }
      borrarArchivo(cedula.filename);
      borrarArchivo(curriculum.filename);
      throw err;
    }

    await registrarBitacora(pool, req.usuario.id, "registrar_director_externo", "directores_externos", fila.id, {
      institucion,
    });
    res.status(201).json(serializar(fila, true));
  }),
);

router.get(
  "/",
  requiereRol("alumno", ...ROLES_CONSULTA),
  ruta(async (req, res) => {
    const completo = tieneRol(req.usuario, ...ROLES_CONSULTA);
    const { rows } = await pool.query(
      `SELECT id, nombre, institucion, correo, cedula_numero, creado_en
         FROM directores_externos ORDER BY nombre, id`,
    );
    res.json(rows.map((r) => serializar(r, completo)));
  }),
);

router.get(
  "/:id/:documento(cedula|curriculum)",
  ruta(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    }
    const columna = DOCUMENTOS[req.params.documento];
    const { rows } = await pool.query(
      `SELECT registrado_por, ${columna} AS archivo FROM directores_externos WHERE id = $1`,
      [id],
    );
    const fila = rows[0];
    if (!fila) return res.status(404).json({ error: "No existe ese director externo" });
    if (fila.registrado_por !== req.usuario.id && !tieneRol(req.usuario, ...ROLES_CONSULTA)) {
      return res.status(403).json({ error: "No tienes permiso para ver este documento" });
    }
    res.download(
      path.join(DIR_DOCUMENTOS, fila.archivo),
      `${req.params.documento}-director-externo-${id}${path.extname(fila.archivo)}`,
    );
  }),
);

export default router;
