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

// Esquema mínimo inicial. Cada quien lo va ampliando desde su rama feature/*.
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT    NOT NULL,
    correo     TEXT    NOT NULL UNIQUE,
    rol        TEXT    NOT NULL DEFAULT 'usuario',
    activo     INTEGER NOT NULL DEFAULT 1,
    creado_en  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log(`[db] SQLite lista en ${dbPath}`);
