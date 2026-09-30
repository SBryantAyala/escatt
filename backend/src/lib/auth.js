// Middlewares de autenticación y autorización por rol.
//
//   router.get("/", autenticar, requiereRol("catt_ejecutivo", "catt_auxiliar"), handler)
//
// `autenticar` valida el token Bearer y deja el usuario completo (con roles y
// perfiles) en req.usuario. `requiereRol` responde 403 si el usuario no tiene
// ninguno de los roles indicados. Ocultar un botón en el frontend no basta:
// cada endpoint valida aquí.

import crypto from "node:crypto";
import { pool } from "../db/index.js";
import { obtenerUsuario } from "./usuarios.js";
import { tieneRol } from "./roles.js";

export const DIAS_SESION = 7;

export function tokenDelHeader(req) {
  const cabecera = req.get("authorization") || "";
  const m = cabecera.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function crearSesion(usuarioId, client = pool) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiraEn = new Date(Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000);
  await client.query("INSERT INTO sesiones (token, usuario_id, expira_en) VALUES ($1, $2, $3)", [
    token,
    usuarioId,
    expiraEn,
  ]);
  return token;
}

export async function cerrarSesionesDe(usuarioId, client = pool, exceptoToken = null) {
  await client.query("DELETE FROM sesiones WHERE usuario_id = $1 AND token IS DISTINCT FROM $2", [
    usuarioId,
    exceptoToken,
  ]);
}

// Devuelve el usuario de un token válido y activo; null en cualquier otro caso.
export async function usuarioDeToken(token) {
  if (!token) return null;
  const { rows } = await pool.query("SELECT * FROM sesiones WHERE token = $1", [token]);
  const sesion = rows[0];
  if (!sesion) return null;
  if (new Date(sesion.expira_en) <= new Date()) {
    await pool.query("DELETE FROM sesiones WHERE token = $1", [token]);
    return null;
  }
  const usuario = await obtenerUsuario(sesion.usuario_id);
  if (!usuario || usuario.estado === "revocada") {
    await pool.query("DELETE FROM sesiones WHERE token = $1", [token]);
    return null;
  }
  return usuario;
}

export async function autenticar(req, res, next) {
  try {
    const token = tokenDelHeader(req);
    if (!token) return res.status(401).json({ error: "Falta el token de sesión" });
    const usuario = await usuarioDeToken(token);
    if (!usuario) return res.status(401).json({ error: "Sesión inválida o expirada" });
    req.usuario = usuario;
    req.token = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

// Bloquea todo excepto el cambio de contraseña mientras el usuario tenga una
// contraseña temporal. Se usa después de `autenticar`.
export function exigeCambioResuelto(req, res, next) {
  if (req.usuario?.debe_cambiar_password) {
    return res.status(403).json({
      error: "Debes cambiar tu contraseña temporal antes de continuar",
      codigo: "debe_cambiar_password",
    });
  }
  return next();
}

export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!tieneRol(req.usuario, ...roles)) {
      return res.status(403).json({ error: "Tu rol no tiene permiso para esta acción" });
    }
    return next();
  };
}
