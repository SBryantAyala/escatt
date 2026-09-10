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
    apellido_paterno TEXT    NOT NULL DEFAULT '',
    apellido_materno TEXT    NOT NULL DEFAULT '',
    correo           TEXT    NOT NULL UNIQUE,
    telefono         TEXT,
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

// Migraciones aditivas: SQLite no soporta "ADD COLUMN IF NOT EXISTS", así que se
// consulta el esquema actual antes de cada ALTER (las bases ya creadas no
// tendrían estas columnas).
const columnasUsuarios = db
  .prepare("SELECT name FROM pragma_table_info('usuarios')")
  .all()
  .map((c) => c.name);

// Teléfono (opcional, aplica a los 3 tipos).
if (!columnasUsuarios.includes("telefono")) {
  db.exec("ALTER TABLE usuarios ADD COLUMN telefono TEXT");
}

// Nombre separado en pila + apellido paterno + apellido materno.
if (!columnasUsuarios.includes("apellido_paterno")) {
  db.exec("ALTER TABLE usuarios ADD COLUMN apellido_paterno TEXT NOT NULL DEFAULT ''");
}
if (!columnasUsuarios.includes("apellido_materno")) {
  db.exec("ALTER TABLE usuarios ADD COLUMN apellido_materno TEXT NOT NULL DEFAULT ''");

  // Reparte los nombres que ya estaban guardados como una sola cadena: por
  // convención en México, los 2 últimos tokens son los apellidos (o solo el
  // paterno si hay 2 tokens). Es una heurística única para no perder datos.
  const porRepartir = db
    .prepare(
      "SELECT id, nombre FROM usuarios WHERE apellido_paterno = '' AND instr(trim(nombre), ' ') > 0",
    )
    .all();
  const repartir = db.prepare(
    "UPDATE usuarios SET nombre = @nombre, apellido_paterno = @ap, apellido_materno = @am WHERE id = @id",
  );
  for (const fila of porRepartir) {
    const partes = fila.nombre.trim().split(/\s+/);
    let am = "";
    let ap = "";
    if (partes.length >= 3) {
      am = partes.pop();
      ap = partes.pop();
    } else {
      ap = partes.pop();
    }
    repartir.run({ id: fila.id, nombre: partes.join(" "), ap, am });
  }
}

// Autenticación (aditivo, Sprint 2). No modifica la tabla `usuarios`:
//   - credenciales: hash/salt de la contraseña, 1 fila por usuario.
//   - sesiones: tokens Bearer activos con su fecha de expiración.
// Ambas se ligan por usuario_id con ON DELETE CASCADE (foreign_keys ya está ON).
db.exec(`
  CREATE TABLE IF NOT EXISTS credenciales (
    usuario_id     INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    password_hash  TEXT NOT NULL,
    password_salt  TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sesiones (
    token      TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    expira_en  TEXT NOT NULL
  );
`);

console.log(`[db] SQLite lista en ${dbPath}`);
