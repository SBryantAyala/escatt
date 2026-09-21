import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "escatt",
  password: process.env.PGPASSWORD || "escatt_dev",
  database: process.env.PGDATABASE || "escatt",
});

// Ejecuta una consulta con parámetros nombrados (@nombre) en vez de los
// posicionales ($1, $2...) que usa `pg` de por sí. Mantiene la misma
// legibilidad que teníamos con los parámetros nombrados de better-sqlite3,
// sobre todo en el UPDATE dinámico de routes/usuarios.js.
export async function queryNamed(sql, params = {}) {
  const values = [];
  const text = sql.replace(/@(\w+)/g, (_coincide, nombre) => {
    if (!(nombre in params)) {
      throw new Error(`Falta el parámetro "${nombre}" para la consulta`);
    }
    values.push(params[nombre] ?? null);
    return `$${values.length}`;
  });
  return pool.query(text, values);
}

// Esquema acordado en equipo (ver 02-Requerimientos-y-Entregas/Plan-de-Proyecto-Sprint1.md,
// sección 6). Una sola tabla "usuarios" para los 3 tipos (alumno/sinodal/personal); los
// campos específicos de un tipo simplemente quedan NULL para los otros tipos.
//
// A diferencia de la versión con SQLite, aquí no hace falta la lógica de
// ALTER TABLE + migración de datos legacy: al cambiar de motor arrancamos con
// un esquema Postgres limpio desde cero (los usuarios de prueba se
// regeneran con scripts/seed-demo-usuarios.js).
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id               SERIAL      PRIMARY KEY,
      nombre           TEXT        NOT NULL,
      apellido_paterno TEXT        NOT NULL DEFAULT '',
      apellido_materno TEXT        NOT NULL DEFAULT '',
      correo           TEXT        NOT NULL UNIQUE,
      telefono         TEXT,
      tipo             TEXT        NOT NULL CHECK (tipo IN ('alumno', 'sinodal', 'personal')),

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

      activo           BOOLEAN     NOT NULL DEFAULT TRUE,
      creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Autenticación (Sprint 2). No modifica la tabla `usuarios`:
  //   - credenciales: hash/salt de la contraseña, 1 fila por usuario.
  //   - sesiones: tokens Bearer activos con su fecha de expiración.
  // Postgres siempre valida llaves foráneas (no existe el PRAGMA foreign_keys
  // que había que prender a mano en SQLite).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credenciales (
      usuario_id     INTEGER     PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      password_hash  TEXT        NOT NULL,
      password_salt  TEXT        NOT NULL,
      creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sesiones (
      token      TEXT        PRIMARY KEY,
      usuario_id INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
      expira_en  TIMESTAMPTZ NOT NULL
    );
  `);

  console.log(
    `[db] PostgreSQL lista (${process.env.PGDATABASE || "escatt"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || 5432})`,
  );
}

// Node (ESM, "type": "module" en package.json) espera este top-level await
// antes de que cualquier otro módulo que importe `pool` siga ejecutándose,
// así que el esquema ya existe cuando index.js/routes/*.js empiezan a usarlo.
await initDb();
