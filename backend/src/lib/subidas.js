// Subida de archivos (PDF, JPG o PNG, máx. 10 MB) a una carpeta de uploads/,
// con nombre aleatorio. Misma política para todas las rutas que reciben
// constancias, evidencias o minutas.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_UPLOADS = path.join(__dirname, "..", "..", "uploads");

export const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };
export const TAMANO_MAXIMO = 10 * 1024 * 1024;

// `carpeta` es el subdirectorio de uploads/ (se crea si no existe). Devuelve el
// middleware de multer, la ruta absoluta de un archivo guardado y cómo
// borrarlo (sin fallar si ya no está).
export function crearSubida(carpeta) {
  const dir = path.join(DIR_UPLOADS, carpeta);
  fs.mkdirSync(dir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: dir,
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

  return {
    upload,
    rutaDe: (nombreArchivo) => path.join(dir, nombreArchivo),
    borrar: (nombreArchivo) => {
      if (nombreArchivo) fs.unlink(path.join(dir, nombreArchivo), () => {});
    },
  };
}
