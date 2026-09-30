import pg from "pg";
import "dotenv/config";

import { ROLES } from "../lib/roles.js";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "escatt",
  password: process.env.PGPASSWORD || "escatt_dev",
  database: process.env.PGDATABASE || "escatt",
});

// Ejecuta una consulta con parámetros nombrados (@nombre) en vez de los
// posicionales ($1, $2...) que usa `pg` de por sí. Acepta un `client` opcional
// para usarse dentro de una transacción.
export async function queryNamed(sql, params = {}, client = pool) {
  const values = [];
  const text = sql.replace(/@(\w+)/g, (_coincide, nombre) => {
    if (!(nombre in params)) {
      throw new Error(`Falta el parámetro "${nombre}" para la consulta`);
    }
    values.push(params[nombre] ?? null);
    return `$${values.length}`;
  });
  return client.query(text, values);
}

// Ejecuta `fn(client)` dentro de BEGIN/COMMIT; si algo falla hace ROLLBACK.
export async function enTransaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Esquema (Sprint 3): usuarios con tablas de perfil + roles múltiples.
// Ver el diagrama ER y el diccionario de datos del Módulo de Usuarios.
//
//   usuarios       datos comunes de cualquier persona
//   alumnos        perfil de alumno (1:0..1 con usuarios)
//   empleados      número de empleado (1:0..1 con usuarios)
//   docentes       perfil de docente (1:0..1 con empleados)
//   personal_catt  perfil de personal CATT (1:0..1 con empleados)
//   roles          catálogo de roles globales
//   usuario_roles  roles de cada usuario (N:M)
//   academias      catálogo de academias
//   elegibilidad   requisitos para TT por alumno y periodo
//   bitacora       historial de acciones sensibles
//   credenciales   contraseña (scrypt) de cada usuario
//   sesiones       tokens Bearer activos
// ---------------------------------------------------------------------------

const SQL_USUARIOS = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id                    SERIAL      PRIMARY KEY,
    nombre                TEXT        NOT NULL,
    apellido_paterno      TEXT        NOT NULL DEFAULT '',
    apellido_materno      TEXT        NOT NULL DEFAULT '',
    correo                TEXT        NOT NULL UNIQUE,
    telefono              TEXT,
    estado                TEXT        NOT NULL DEFAULT 'activa'
                          CHECK (estado IN ('pendiente_verificacion', 'activa', 'revocada')),
    debe_cambiar_password BOOLEAN     NOT NULL DEFAULT FALSE,
    creado_por            INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const SQL_RESTO = `
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

  CREATE TABLE IF NOT EXISTS roles (
    id     SERIAL PRIMARY KEY,
    clave  TEXT   NOT NULL UNIQUE,
    nombre TEXT   NOT NULL
  );

  CREATE TABLE IF NOT EXISTS academias (
    id           SERIAL  PRIMARY KEY,
    nombre       TEXT    NOT NULL UNIQUE,
    departamento TEXT,
    activa       BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS alumnos (
    usuario_id    INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    boleta        TEXT    NOT NULL UNIQUE,
    carrera       TEXT    NOT NULL CHECK (carrera IN ('ISC', 'IIA', 'LCD')),
    plan_estudios TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS empleados (
    usuario_id      INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_empleado TEXT    NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS docentes (
    usuario_id         INTEGER PRIMARY KEY REFERENCES empleados(usuario_id) ON DELETE CASCADE,
    academia_id        INTEGER NOT NULL REFERENCES academias(id),
    cedula_profesional TEXT,
    extension          TEXT
  );

  CREATE TABLE IF NOT EXISTS personal_catt (
    usuario_id INTEGER PRIMARY KEY REFERENCES empleados(usuario_id) ON DELETE CASCADE,
    cargo      TEXT
  );

  CREATE TABLE IF NOT EXISTS usuario_roles (
    usuario_id   INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id       INTEGER     NOT NULL REFERENCES roles(id),
    asignado_por INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    asignado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, rol_id)
  );

  CREATE TABLE IF NOT EXISTS elegibilidad (
    id            SERIAL      PRIMARY KEY,
    alumno_id     INTEGER     NOT NULL REFERENCES alumnos(usuario_id) ON DELETE CASCADE,
    periodo       TEXT        NOT NULL,
    estado        TEXT        NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'elegible', 'no_elegible')),
    motivo        TEXT,
    evidencia_url TEXT,
    validado_por  INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    validado_en   TIMESTAMPTZ,
    UNIQUE (alumno_id, periodo)
  );

  CREATE TABLE IF NOT EXISTS bitacora (
    id         SERIAL      PRIMARY KEY,
    usuario_id INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    accion     TEXT        NOT NULL,
    entidad    TEXT        NOT NULL,
    entidad_id INTEGER,
    detalle    JSONB,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

// Academias de ejemplo para desarrollo. La lista oficial de ESCOM no está
// publicada; el Secretario Ejecutivo administra el catálogo desde el sistema.
const ACADEMIAS_EJEMPLO = [
  ["Academia de Ciencias de la Computación", "Ciencias e Ingeniería de la Computación"],
  ["Academia de Ingeniería de Software", "Ingeniería en Sistemas Computacionales"],
  ["Academia de Sistemas Distribuidos", "Ingeniería en Sistemas Computacionales"],
  ["Academia de Ciencias Básicas", "Formación Básica"],
  ["Academia de Trabajo Terminal", "Formación Integral e Institucional"],
];

const ACADEMIA_SIN_ASIGNAR = "Sin academia asignada";

async function columnaExiste(client, tabla, columna) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tabla, columna],
  );
  return rows.length > 0;
}

async function sembrarCatalogos(client) {
  for (const { clave, nombre } of ROLES) {
    await client.query(
      `INSERT INTO roles (clave, nombre) VALUES ($1, $2)
       ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre`,
      [clave, nombre],
    );
  }

  const { rows } = await client.query("SELECT count(*)::int AS n FROM academias");
  if (rows[0].n === 0) {
    for (const [nombre, departamento] of ACADEMIAS_EJEMPLO) {
      await client.query("INSERT INTO academias (nombre, departamento) VALUES ($1, $2)", [
        nombre,
        departamento,
      ]);
    }
  }
}

// Migra una base con el esquema anterior (una sola tabla `usuarios` con
// columna `tipo`) al esquema de perfiles + roles, conservando los ids para
// que credenciales y sesiones sigan funcionando.
//   alumno   -> alumnos + rol alumno
//   sinodal  -> empleados + docentes + rol docente
//   personal -> empleados + personal_catt + rol catt_auxiliar
// (el administrador promueve a mano a catt_ejecutivo a quien corresponda).
async function migrarEsquemaAnterior(client) {
  console.log("[db] Esquema anterior detectado: migrando a perfiles + roles…");

  await client.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('pendiente_verificacion', 'activa', 'revocada')),
      ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
  `);

  if (await columnaExiste(client, "usuarios", "activo")) {
    await client.query(
      "UPDATE usuarios SET estado = CASE WHEN activo THEN 'activa' ELSE 'revocada' END",
    );
  }

  // Academia comodín (inactiva) para los sinodales migrados, que no tenían
  // academia. El Secretario Ejecutivo la corrige desde el Detalle.
  const { rows: acad } = await client.query(
    `INSERT INTO academias (nombre, departamento, activa) VALUES ($1, NULL, FALSE)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id`,
    [ACADEMIA_SIN_ASIGNAR],
  );
  const academiaComodin = acad[0].id;

  // Alumnos. La carrera podía venir como clave o como nombre completo.
  await client.query(`
    INSERT INTO alumnos (usuario_id, boleta, carrera, plan_estudios)
    SELECT id,
           COALESCE(NULLIF(trim(boleta), ''), 'PENDIENTE-' || id),
           CASE
             WHEN carrera IN ('ISC', 'IIA', 'LCD') THEN carrera
             WHEN carrera ILIKE '%inteligencia%' THEN 'IIA'
             WHEN carrera ILIKE '%datos%' THEN 'LCD'
             ELSE 'ISC'
           END,
           '2020'
    FROM usuarios WHERE tipo = 'alumno'
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    INSERT INTO empleados (usuario_id, numero_empleado)
    SELECT id, COALESCE(NULLIF(trim(numero_empleado), ''), 'PENDIENTE-' || id)
    FROM usuarios WHERE tipo IN ('sinodal', 'personal')
    ON CONFLICT DO NOTHING;
  `);

  await client.query(
    `INSERT INTO docentes (usuario_id, academia_id)
     SELECT id, $1 FROM usuarios WHERE tipo = 'sinodal'
     ON CONFLICT DO NOTHING`,
    [academiaComodin],
  );

  await client.query(`
    INSERT INTO personal_catt (usuario_id, cargo)
    SELECT id, NULLIF(trim(cargo), '') FROM usuarios WHERE tipo = 'personal'
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    INSERT INTO usuario_roles (usuario_id, rol_id)
    SELECT u.id, r.id
    FROM usuarios u
    JOIN roles r ON r.clave = CASE u.tipo
      WHEN 'alumno' THEN 'alumno'
      WHEN 'sinodal' THEN 'docente'
      WHEN 'personal' THEN 'catt_auxiliar'
    END
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    ALTER TABLE usuarios
      DROP COLUMN IF EXISTS tipo,
      DROP COLUMN IF EXISTS boleta,
      DROP COLUMN IF EXISTS carrera,
      DROP COLUMN IF EXISTS protocolo_tt,
      DROP COLUMN IF EXISTS numero_empleado,
      DROP COLUMN IF EXISTS especialidad,
      DROP COLUMN IF EXISTS cargo,
      DROP COLUMN IF EXISTS activo;
  `);

  await client.query(
    `INSERT INTO bitacora (usuario_id, accion, entidad, detalle)
     VALUES (NULL, 'migracion_esquema', 'usuarios', '{"de": "tipo", "a": "perfiles_y_roles"}')`,
  );

  console.log("[db] Migración terminada.");
}

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const esquemaAnterior = await columnaExiste(client, "usuarios", "tipo");
    await client.query(SQL_USUARIOS);
    await client.query(SQL_RESTO);
    await sembrarCatalogos(client);
    if (esquemaAnterior) await migrarEsquemaAnterior(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM usuario_roles ur
     JOIN roles r ON r.id = ur.rol_id WHERE r.clave = 'admin_sistema'`,
  );
  if (rows[0].n === 0) {
    console.warn(
      "[db] Aviso: no hay ningún administrador del sistema. Créalo con:\n" +
        '     node scripts/crear-admin.js <correo> "<contraseña>" "<nombre>"',
    );
  }

  console.log(
    `[db] PostgreSQL lista (${process.env.PGDATABASE || "escatt"}@${process.env.PGHOST || "localhost"}:${process.env.PGPORT || 5432})`,
  );
}

// Node (ESM) espera este top-level await antes de que otros módulos que
// importan `pool` sigan, así que el esquema ya existe cuando se usan las rutas.
await initDb();
