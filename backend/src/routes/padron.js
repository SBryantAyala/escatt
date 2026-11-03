import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_GESTION, ROLES_STAFF } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

const router = Router();
router.use(autenticar, exigeCambioResuelto);

const MAX_FILAS = 100000;
const MAX_ERRORES = 10;
const BOLETA_RE = /^\d{10}$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(csv|txt)$/i.test(file.originalname)) {
      const err = new Error("El padrón debe ser un archivo CSV");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function dividirLinea(linea, separador) {
  const celdas = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === separador && !entreComillas) {
      celdas.push(actual.trim());
      actual = "";
    } else {
      actual += c;
    }
  }
  celdas.push(actual.trim());
  return celdas;
}

export function leerPadron(contenido) {
  const lineas = contenido
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((texto, i) => ({ texto, numero: i + 1 }))
    .filter((l) => l.texto.trim() !== "");
  if (lineas.length === 0) return { error: "El archivo está vacío" };

  const primera = lineas[0].texto;
  const separador = [",", ";", "\t"]
    .map((s) => ({ s, n: primera.split(s).length }))
    .sort((a, b) => b.n - a.n)[0].s;

  let columnas = { boleta: 0, nombre: 1, carrera: 2 };
  let filas = lineas;
  const encabezado = dividirLinea(primera, separador).map(sinAcentos);
  if (!BOLETA_RE.test(encabezado[0] ?? "")) {
    const indice = (nombre) => encabezado.findIndex((h) => h === nombre);
    if (indice("boleta") === -1) {
      return { error: 'La primera fila debe ser el encabezado con una columna "boleta"' };
    }
    columnas = { boleta: indice("boleta"), nombre: indice("nombre"), carrera: indice("carrera") };
    filas = lineas.slice(1);
  }
  if (filas.length === 0) return { error: "El archivo no tiene boletas" };
  if (filas.length > MAX_FILAS) return { error: `El padrón puede tener hasta ${MAX_FILAS} boletas` };

  const registros = new Map();
  const errores = [];
  for (const { texto, numero } of filas) {
    const celdas = dividirLinea(texto, separador);
    const boleta = celdas[columnas.boleta] ?? "";
    if (!BOLETA_RE.test(boleta)) {
      errores.push(`Línea ${numero}: la boleta "${boleta}" no tiene 10 dígitos`);
    } else if (registros.has(boleta)) {
      errores.push(`Línea ${numero}: la boleta ${boleta} está repetida`);
    } else {
      registros.set(boleta, {
        boleta,
        nombre: (columnas.nombre >= 0 ? celdas[columnas.nombre] : "") || null,
        carrera: (columnas.carrera >= 0 ? celdas[columnas.carrera] : "") || null,
      });
    }
    if (errores.length >= MAX_ERRORES) break;
  }
  if (errores.length > 0) return { error: "El archivo tiene errores y no se cargó", errores };
  return { registros: [...registros.values()] };
}

router.get(
  "/",
  requiereRol("admin_sistema", ...ROLES_STAFF),
  ruta(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT c.archivo, c.total, c.cargado_en,
              concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS cargado_por
         FROM padron_cargas c LEFT JOIN usuarios u ON u.id = c.cargado_por
        ORDER BY c.id DESC LIMIT 1`,
    );
    if (!rows[0]) return res.json({ cargado: false, total: 0, archivo: null, cargado_en: null, cargado_por: null });
    res.json({ cargado: true, ...rows[0] });
  }),
);

router.post(
  "/",
  requiereRol(...ROLES_GESTION),
  upload.single("archivo"),
  ruta(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Adjunta el padrón en formato CSV" });
    const resultado = leerPadron(req.file.buffer.toString("utf8"));
    if (resultado.error) {
      return res.status(400).json({ error: resultado.error, ...(resultado.errores ? { errores: resultado.errores } : {}) });
    }
    const { registros } = resultado;
    const archivo = path.basename(req.file.originalname).slice(0, 200);

    await enTransaccion(async (client) => {
      await client.query("DELETE FROM padron_boletas");
      for (let i = 0; i < registros.length; i += 5000) {
        const lote = registros.slice(i, i + 5000);
        await client.query(
          `INSERT INTO padron_boletas (boleta, nombre, carrera)
           SELECT * FROM unnest($1::text[], $2::text[], $3::text[])`,
          [lote.map((r) => r.boleta), lote.map((r) => r.nombre), lote.map((r) => r.carrera)],
        );
      }
      const { rows } = await client.query(
        "INSERT INTO padron_cargas (archivo, total, cargado_por) VALUES ($1, $2, $3) RETURNING id",
        [archivo, registros.length, req.usuario.id],
      );
      await registrarBitacora(client, req.usuario.id, "cargar_padron_boletas", "padron_cargas", rows[0].id, {
        archivo,
        total: registros.length,
      });
    });

    const { rows } = await pool.query(
      `SELECT c.archivo, c.total, c.cargado_en,
              concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS cargado_por
         FROM padron_cargas c LEFT JOIN usuarios u ON u.id = c.cargado_por
        ORDER BY c.id DESC LIMIT 1`,
    );
    res.status(201).json({ cargado: true, ...rows[0] });
  }),
);

export default router;
