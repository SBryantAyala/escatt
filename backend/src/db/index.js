import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(here, "..", "..");

const configured = process.env.DB_PATH || "./escatt.db";
const dbPath = isAbsolute(configured) ? configured : join(backendRoot, configured);

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Esquema acordado en equipo (ver 02-Requerimientos-y-Entregas/Plan-de-Proyecto-Sprint1.md, sección 6).
// Una sola tabla "usuarios" para los 3 tipos (alumno/sinodal/personal); los campos
// específicos de un tipo simplemente quedan NULL para los otros tipos.
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    correo           TEXT    NOT NULL UNIQUE,
    tipo             TEXT    NOT NULL CHECK (tipo IN ('alumno', 'sinodal', 'personal')),

    -- Específicos de alumno
    boleta           TEXT,
    carrera          TEXT,
    protocolo_tt     TEXT,

    -- Específicos de sinodal y personal
    numero_empleado  TEXT,

    -- Específico de sinodal
    especialidad     TEXT,

    -- Específico de personal (coordinador CATT)
    cargo            TEXT,

    activo           INTEGER NOT NULL DEFAULT 1,
    creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log(`[db] SQLite lista en ${dbPath}`);
