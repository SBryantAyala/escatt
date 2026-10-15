import pg from "pg";
import "dotenv/config";

import { CLAVES_COLOR_ACADEMIA, ICONOS_ACADEMIA } from "../lib/academias.js";
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
//   protocolos            protocolos de TT (Módulo 2)
//   protocolo_directores  1 o 2 directores por protocolo
//   protocolo_sinodales   3 sinodales por protocolo + su evaluación
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
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (alumno_id, periodo)
  );

  -- Módulo 2: protocolos de TT.
  --   registrado    -> lo registró el alumno (HU-18); falta Academia/sinodales
  --   en_evaluacion -> ya tiene Academia (HU-19) y sus 3 sinodales (HU-20)
  --   aprobado / no_aprobado -> dictamen (HU-22)
  -- Las columnas que no están en el CREATE original (resumen, periodo,
  -- academia…) también se agregan con ALTER en migrarProtocolos(), para las
  -- bases que ya tenían la tabla provisional de HU-25.
  CREATE TABLE IF NOT EXISTS protocolos (
    id                   SERIAL      PRIMARY KEY,
    alumno_id            INTEGER     NOT NULL REFERENCES alumnos(usuario_id),
    titulo               TEXT        NOT NULL,
    resumen              TEXT        NOT NULL DEFAULT '',
    periodo              TEXT,
    visto_bueno_archivo  TEXT,
    academia_id          INTEGER     REFERENCES academias(id),
    academia_asignada_por INTEGER    REFERENCES usuarios(id) ON DELETE SET NULL,
    academia_asignada_en TIMESTAMPTZ,
    estado               TEXT        NOT NULL DEFAULT 'registrado'
                         CHECK (estado IN ('registrado', 'en_evaluacion', 'aprobado', 'no_aprobado')),
    creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Uno o dos directores por protocolo (el límite lo valida el registro, HU-18).
  CREATE TABLE IF NOT EXISTS protocolo_directores (
    protocolo_id INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    docente_id   INTEGER NOT NULL REFERENCES docentes(usuario_id),
    PRIMARY KEY (protocolo_id, docente_id)
  );

  -- La llave primaria empieza por protocolo_id; HU-25 busca por docente.
  CREATE INDEX IF NOT EXISTS protocolo_directores_docente_idx
    ON protocolo_directores (docente_id);

  -- Exactamente 3 sinodales por protocolo (lo valida HU-20 al asignar).
  -- dictamen/observaciones/evaluado_en son la evaluación de cada sinodal
  -- (HU-21); el dictamen final del protocolo se calcula a partir de estas
  -- tres filas (HU-22). NULL en dictamen = todavía no evalúa.
  CREATE TABLE IF NOT EXISTS protocolo_sinodales (
    protocolo_id  INTEGER     NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    docente_id    INTEGER     NOT NULL REFERENCES docentes(usuario_id),
    asignado_por  INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    asignado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    dictamen      TEXT        CHECK (dictamen IN ('aprobado', 'no_aprobado')),
    observaciones TEXT,
    evaluado_en   TIMESTAMPTZ,
    PRIMARY KEY (protocolo_id, docente_id)
  );

  CREATE INDEX IF NOT EXISTS protocolo_sinodales_docente_idx
    ON protocolo_sinodales (docente_id);

  CREATE TABLE IF NOT EXISTS solicitudes_cambio_director (
    id                       SERIAL      PRIMARY KEY,
    protocolo_id             INTEGER     NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
    solicitante_id           INTEGER     NOT NULL REFERENCES usuarios(id),
    director_saliente_id     INTEGER     NOT NULL REFERENCES docentes(usuario_id),
    director_propuesto_id    INTEGER     NOT NULL REFERENCES docentes(usuario_id),
    motivo                   TEXT        NOT NULL,
    constancia_archivo       TEXT        NOT NULL,
    estado                   TEXT        NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    resuelta_por             INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
    resuelta_en              TIMESTAMPTZ,
    observaciones_resolucion TEXT,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (director_saliente_id <> director_propuesto_id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_cambio_director_pendiente_uq
    ON solicitudes_cambio_director (protocolo_id) WHERE estado = 'pendiente';

  CREATE INDEX IF NOT EXISTS solicitudes_cambio_director_estado_idx
    ON solicitudes_cambio_director (estado, creado_en);

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

// Catálogo oficial de academias de ESCOM (hoja "Jefes y Presidentes de
// Academia" de la CATT). Se siembra una sola vez; después el Secretario
// Ejecutivo lo administra desde el sistema. El departamento solo se conoce
// para las cinco academias que ya existían en el catálogo de ejemplo.
const ACADEMIAS_OFICIALES = [
  ["Academia de Ciencias Básicas", "Formación Básica"],
  ["Academia de Ciencias de la Computación", "Ciencias e Ingeniería de la Computación"],
  ["Academia de Fundamentos de Sistemas Electrónicos", null],
  ["Academia de Inteligencia Artificial", null],
  ["Academia de Ciencia de Datos", null],
  ["Academia de Ingeniería de Software", "Ingeniería en Sistemas Computacionales"],
  ["Academia de Sistemas Digitales", null],
  ["Academia de Sistemas Distribuidos", "Ingeniería en Sistemas Computacionales"],
  ["Academia de Proyectos Estratégicos y Toma de Decisiones", null],
  ["Academia de Ciencias Sociales", null],
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

  // Una sola vez por base: en una nueva siembra las 11; en una que ya tenía
  // el catálogo de ejemplo agrega las que faltan sin tocar las existentes.
  // La marca en la bitácora evita volver a crear una academia que el
  // Secretario Ejecutivo haya renombrado después.
  const { rows } = await client.query(
    "SELECT 1 FROM bitacora WHERE accion = 'migracion_catalogo_academias' LIMIT 1",
  );
  if (rows.length > 0) return;

  const agregadas = [];
  for (const [nombre, departamento] of ACADEMIAS_OFICIALES) {
    const { rowCount } = await client.query(
      `INSERT INTO academias (nombre, departamento) VALUES ($1, $2)
       ON CONFLICT (nombre) DO NOTHING`,
      [nombre, departamento],
    );
    if (rowCount > 0) agregadas.push(nombre);
  }
  await client.query(
    `INSERT INTO bitacora (usuario_id, accion, entidad, detalle)
     VALUES (NULL, 'migracion_catalogo_academias', 'academias', $1)`,
    [JSON.stringify({ agregadas })],
  );
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

// Academias: columnas de presidencia y de personalización (color/ícono),
// agregadas después del esquema original. Van en ALTER (no en el CREATE TABLE
// de arriba) porque presidente_id referencia a `docentes`, que se crea
// después que `academias` en este mismo archivo.
//
// Invariante que esta función mantiene: un usuario tiene el rol
// presidente_academia SI Y SOLO SI es el presidente_id de alguna academia Y
// su docentes.academia_id es esa misma academia. Es idempotente: solo toca
// columnas/filas que todavía estén en NULL o que violen el invariante.
async function migrarAcademiasPresidenteColorIcono(client) {
  await client.query(`
    ALTER TABLE academias
      ADD COLUMN IF NOT EXISTS presidente_id INTEGER UNIQUE REFERENCES docentes(usuario_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS color TEXT,
      ADD COLUMN IF NOT EXISTS icono TEXT;
  `);

  // Color e ícono por orden de id, reciclando los catálogos si hay más
  // academias que colores/íconos. Solo se tocan las que todavía no tienen.
  const { rows: sinEstilo } = await client.query(
    "SELECT id FROM academias WHERE color IS NULL OR icono IS NULL ORDER BY id",
  );
  for (let i = 0; i < sinEstilo.length; i += 1) {
    const color = CLAVES_COLOR_ACADEMIA[i % CLAVES_COLOR_ACADEMIA.length];
    const icono = ICONOS_ACADEMIA[i % ICONOS_ACADEMIA.length];
    await client.query(
      "UPDATE academias SET color = COALESCE(color, $1), icono = COALESCE(icono, $2) WHERE id = $3",
      [color, icono, sinEstilo[i].id],
    );
  }

  // Relleno inicial de presidente_id (solo si es NULL): el docente de menor
  // id con rol presidente_academia en esa academia.
  const { rows: academiasSinPresidente } = await client.query(
    "SELECT id FROM academias WHERE presidente_id IS NULL ORDER BY id",
  );
  for (const { id: academiaId } of academiasSinPresidente) {
    const { rows: candidatos } = await client.query(
      `SELECT d.usuario_id FROM docentes d
       JOIN usuario_roles ur ON ur.usuario_id = d.usuario_id
       JOIN roles r ON r.id = ur.rol_id AND r.clave = 'presidente_academia'
       WHERE d.academia_id = $1
       ORDER BY d.usuario_id
       LIMIT 1`,
      [academiaId],
    );
    if (candidatos.length === 0) continue;
    await client.query("UPDATE academias SET presidente_id = $1 WHERE id = $2", [
      candidatos[0].usuario_id,
      academiaId,
    ]);
  }

  // A cualquier docente que conserve el rol presidente_academia sin ser el
  // presidente_id de SU academia actual (duplicados del relleno anterior, o
  // alguien cuyo rol quedó huérfano) se le quita el rol y se deja constancia.
  const { rows: sobrantes } = await client.query(`
    SELECT ur.usuario_id FROM usuario_roles ur
    JOIN roles r ON r.id = ur.rol_id AND r.clave = 'presidente_academia'
    JOIN docentes d ON d.usuario_id = ur.usuario_id
    LEFT JOIN academias ac ON ac.presidente_id = ur.usuario_id AND ac.id = d.academia_id
    WHERE ac.id IS NULL
  `);
  for (const { usuario_id } of sobrantes) {
    await client.query(
      `DELETE FROM usuario_roles
       WHERE usuario_id = $1 AND rol_id = (SELECT id FROM roles WHERE clave = 'presidente_academia')`,
      [usuario_id],
    );
    await client.query(
      `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle)
       VALUES (NULL, 'ajuste_presidente_migracion', 'usuarios', $1, $2)`,
      [usuario_id, JSON.stringify({ motivo: "rol_presidente_sin_academia_valida" })],
    );
  }
}

// Protocolos: completa la tabla provisional de HU-25 con lo que piden
// HU-18/HU-19 y agrega la regla de HU-19 en la propia base: un protocolo no
// sale de "registrado" sin Academia asignada. Idempotente.
async function migrarProtocolos(client) {
  await client.query(`
    ALTER TABLE protocolos
      ADD COLUMN IF NOT EXISTS resumen TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS periodo TEXT,
      ADD COLUMN IF NOT EXISTS visto_bueno_archivo TEXT,
      ADD COLUMN IF NOT EXISTS academia_id INTEGER REFERENCES academias(id),
      ADD COLUMN IF NOT EXISTS academia_asignada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS academia_asignada_en TIMESTAMPTZ;
  `);
  await client.query("CREATE INDEX IF NOT EXISTS protocolos_academia_idx ON protocolos (academia_id)");
  await client.query("CREATE INDEX IF NOT EXISTS protocolos_alumno_idx ON protocolos (alumno_id)");

  const { rows } = await client.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'protocolos_academia_antes_de_evaluar'",
  );
  if (rows.length === 0) {
    // NOT VALID: no revisa filas viejas (p. ej. las sembradas para HU-25
    // antes de que existiera academia_id), pero sí toda escritura nueva.
    await client.query(`
      ALTER TABLE protocolos ADD CONSTRAINT protocolos_academia_antes_de_evaluar
        CHECK (estado = 'registrado' OR academia_id IS NOT NULL) NOT VALID
    `);
  }
}

async function agregarCheck(client, tabla, nombre, expresion) {
  const { rows } = await client.query("SELECT 1 FROM pg_constraint WHERE conname = $1", [nombre]);
  if (rows.length === 0) {
    await client.query(`ALTER TABLE ${tabla} ADD CONSTRAINT ${nombre} CHECK (${expresion})`);
  }
}

async function migrarDirectoresExternos(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS directores_externos (
      id                 SERIAL      PRIMARY KEY,
      nombre             TEXT        NOT NULL,
      institucion        TEXT        NOT NULL,
      correo             TEXT        NOT NULL,
      cedula_numero      TEXT        NOT NULL,
      cedula_archivo     TEXT        NOT NULL,
      curriculum_archivo TEXT        NOT NULL,
      registrado_por     INTEGER     REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS directores_externos_correo_uq ON directores_externos (lower(correo))",
  );

  await client.query(`
    ALTER TABLE protocolo_directores
      ADD COLUMN IF NOT EXISTS id SERIAL,
      ADD COLUMN IF NOT EXISTS externo_id INTEGER REFERENCES directores_externos(id)
  `);
  const { rows: pkViejo } = await client.query(`
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'protocolo_directores'::regclass AND contype = 'p' AND array_length(conkey, 1) = 2
  `);
  if (pkViejo.length > 0) {
    await client.query(`ALTER TABLE protocolo_directores DROP CONSTRAINT "${pkViejo[0].conname}"`);
    await client.query("ALTER TABLE protocolo_directores ADD PRIMARY KEY (id)");
  }
  await client.query("ALTER TABLE protocolo_directores ALTER COLUMN docente_id DROP NOT NULL");
  await agregarCheck(
    client,
    "protocolo_directores",
    "protocolo_directores_uno_solo",
    "(docente_id IS NOT NULL) <> (externo_id IS NOT NULL)",
  );
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS protocolo_directores_docente_uq
      ON protocolo_directores (protocolo_id, docente_id) WHERE docente_id IS NOT NULL
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS protocolo_directores_externo_uq
      ON protocolo_directores (protocolo_id, externo_id) WHERE externo_id IS NOT NULL
  `);
  await client.query(
    "CREATE INDEX IF NOT EXISTS protocolo_directores_externo_idx ON protocolo_directores (externo_id)",
  );

  await client.query(`
    ALTER TABLE solicitudes_cambio_director
      ADD COLUMN IF NOT EXISTS director_saliente_externo_id INTEGER REFERENCES directores_externos(id),
      ADD COLUMN IF NOT EXISTS director_propuesto_externo_id INTEGER REFERENCES directores_externos(id),
      ALTER COLUMN director_saliente_id DROP NOT NULL,
      ALTER COLUMN director_propuesto_id DROP NOT NULL
  `);
  await agregarCheck(
    client,
    "solicitudes_cambio_director",
    "solicitudes_cambio_director_saliente_uno",
    "(director_saliente_id IS NOT NULL) <> (director_saliente_externo_id IS NOT NULL)",
  );
  await agregarCheck(
    client,
    "solicitudes_cambio_director",
    "solicitudes_cambio_director_propuesto_uno",
    "(director_propuesto_id IS NOT NULL) <> (director_propuesto_externo_id IS NOT NULL)",
  );
  await agregarCheck(
    client,
    "solicitudes_cambio_director",
    "solicitudes_cambio_director_externos_distintos",
    "director_saliente_externo_id IS NULL OR director_propuesto_externo_id IS NULL OR director_saliente_externo_id <> director_propuesto_externo_id",
  );
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
    await migrarAcademiasPresidenteColorIcono(client);
    await migrarProtocolos(client);
    await migrarDirectoresExternos(client);
    // creado_en se agregó después del CREATE TABLE original de elegibilidad.
    await client.query(
      "ALTER TABLE elegibilidad ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT now()",
    );
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
