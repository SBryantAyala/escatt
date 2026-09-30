// Acceso a datos de usuarios con sus perfiles y roles.
//
// La API devuelve cada usuario "aplanado" para que el frontend no tenga que
// armar joins: datos comunes + campos del perfil que tenga + arreglo de roles.
//
//   {
//     id, nombre, apellido_paterno, apellido_materno, correo, telefono,
//     estado, activo, debe_cambiar_password, creado_por, creado_en,
//     roles:    ["docente", "catt_ejecutivo", ...],
//     perfiles: ["docente", "personal_catt", ...],
//     boleta, carrera, plan_estudios,                    // perfil alumno
//     numero_empleado,                                   // empleados
//     academia_id, academia, cedula_profesional, extension, // perfil docente
//     cargo                                              // perfil personal_catt
//   }

import crypto from "node:crypto";
import { pool } from "../db/index.js";

const SELECT_USUARIO = `
  SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo, u.telefono,
         u.estado, u.debe_cambiar_password, u.creado_por, u.creado_en,
         a.boleta, a.carrera, a.plan_estudios,
         e.numero_empleado,
         d.academia_id, ac.nombre AS academia, d.cedula_profesional, d.extension,
         p.cargo,
         (a.usuario_id IS NOT NULL) AS es_alumno,
         (d.usuario_id IS NOT NULL) AS es_docente,
         (p.usuario_id IS NOT NULL) AS es_personal,
         COALESCE(
           array_agg(r.clave ORDER BY r.id) FILTER (WHERE r.clave IS NOT NULL),
           '{}'
         ) AS roles
  FROM usuarios u
  LEFT JOIN alumnos a        ON a.usuario_id = u.id
  LEFT JOIN empleados e      ON e.usuario_id = u.id
  LEFT JOIN docentes d       ON d.usuario_id = u.id
  LEFT JOIN academias ac     ON ac.id = d.academia_id
  LEFT JOIN personal_catt p  ON p.usuario_id = u.id
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r          ON r.id = ur.rol_id
`;

const GROUP_BY = `
  GROUP BY u.id, a.usuario_id, e.usuario_id, d.usuario_id, ac.id, p.usuario_id
`;

function serializar(fila) {
  if (!fila) return null;
  const { es_alumno, es_docente, es_personal, ...resto } = fila;
  const perfiles = [];
  if (es_alumno) perfiles.push("alumno");
  if (es_docente) perfiles.push("docente");
  if (es_personal) perfiles.push("personal_catt");
  return { ...resto, activo: fila.estado === "activa", perfiles };
}

export async function obtenerUsuario(id, client = pool) {
  const { rows } = await client.query(`${SELECT_USUARIO} WHERE u.id = $1 ${GROUP_BY}`, [id]);
  return serializar(rows[0]);
}

export async function obtenerUsuarioPorCorreo(correo, client = pool) {
  const { rows } = await client.query(
    `${SELECT_USUARIO} WHERE lower(u.correo) = lower($1) ${GROUP_BY}`,
    [correo],
  );
  return serializar(rows[0]);
}

export async function listarUsuarios(client = pool) {
  const { rows } = await client.query(`${SELECT_USUARIO} ${GROUP_BY} ORDER BY u.id`);
  return rows.map(serializar);
}

export async function asignarRol(client, usuarioId, clave, asignadoPor = null) {
  await client.query(
    `INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por)
     SELECT $1, id, $3 FROM roles WHERE clave = $2
     ON CONFLICT DO NOTHING`,
    [usuarioId, clave, asignadoPor],
  );
}

export async function quitarRol(client, usuarioId, clave) {
  await client.query(
    `DELETE FROM usuario_roles
     WHERE usuario_id = $1 AND rol_id = (SELECT id FROM roles WHERE clave = $2)`,
    [usuarioId, clave],
  );
}

export async function registrarBitacora(client, actorId, accion, entidad, entidadId, detalle) {
  await client.query(
    `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId ?? null, accion, entidad, entidadId ?? null, detalle ? JSON.stringify(detalle) : null],
  );
}

// --- Contraseñas (scrypt + comparación en tiempo constante) ----------------

export function derivar(password, salt) {
  return crypto.scryptSync(password, salt, 64);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = derivar(password, salt).toString("hex");
  return { salt, hash };
}

export function passwordCoincide(password, saltHex, hashHexGuardado) {
  const calculado = derivar(password, saltHex);
  const guardado = Buffer.from(hashHexGuardado, "hex");
  if (calculado.length !== guardado.length) return false;
  return crypto.timingSafeEqual(calculado, guardado);
}

export function passwordValido(p) {
  return typeof p === "string" && p.length >= 9 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);
}

// Contraseña temporal legible que cumple las reglas (≥9, letras y números).
export function generarPasswordTemporal() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digitos = "23456789";
  let parte = "";
  for (let i = 0; i < 6; i += 1) parte += letras[crypto.randomInt(letras.length)];
  let numeros = "";
  for (let i = 0; i < 4; i += 1) numeros += digitos[crypto.randomInt(digitos.length)];
  return `${parte}${numeros}`;
}

export async function guardarPassword(client, usuarioId, password) {
  const { salt, hash } = hashPassword(password);
  await client.query(
    `INSERT INTO credenciales (usuario_id, password_hash, password_salt)
     VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       password_salt = EXCLUDED.password_salt`,
    [usuarioId, hash, salt],
  );
}
