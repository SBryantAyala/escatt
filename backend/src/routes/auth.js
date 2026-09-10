import { Router } from "express";
import crypto from "node:crypto";

import { db } from "../db/index.js";

const router = Router();

const DIAS_SESION = 7;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Las 3 carreras reales de ESCOM.
const CARRERAS_VALIDAS = ["ISC", "IIA", "LCD"];

// --- Helpers de contraseña (scrypt + comparación en tiempo constante) ---

function derivar(password, salt) {
  return crypto.scryptSync(password, salt, 64);
}

function passwordCoincide(password, saltHex, hashHexGuardado) {
  const calculado = derivar(password, saltHex);
  const guardado = Buffer.from(hashHexGuardado, "hex");
  // timingSafeEqual exige longitudes iguales; si no lo son ya no coincide.
  if (calculado.length !== guardado.length) return false;
  return crypto.timingSafeEqual(calculado, guardado);
}

function passwordValido(p) {
  return (
    typeof p === "string" && p.length >= 9 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p)
  );
}

// --- Helpers de sesión ---

function ahoraSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function crearSesion(usuarioId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000);
  const expiraEn = expira.toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    "INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?, ?, ?)",
  ).run(token, usuarioId, expiraEn);
  return token;
}

function tokenDelHeader(req) {
  const cabecera = req.get("authorization") || "";
  const m = cabecera.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function serializarUsuario(fila) {
  if (!fila) return fila;
  // La tabla `usuarios` no tiene columna de password, así que ya viene "sin password".
  return { ...fila, activo: fila.activo === 1 };
}

function usuarioPorId(id) {
  return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
}

// Devuelve el usuario de un token válido; null si no hay token, no existe la
// sesión o ya expiró (en ese último caso además borra la sesión vencida).
function usuarioDeToken(token) {
  if (!token) return null;
  const sesion = db.prepare("SELECT * FROM sesiones WHERE token = ?").get(token);
  if (!sesion) return null;
  if (sesion.expira_en <= ahoraSql()) {
    db.prepare("DELETE FROM sesiones WHERE token = ?").run(token);
    return null;
  }
  return usuarioPorId(sesion.usuario_id) || null;
}

// POST /api/auth/registro
// El registro público SOLO crea alumnos. El `tipo` NUNCA se lee del body: nadie
// puede auto-asignarse una cuenta de sinodal/personal desde aquí (esas se dan de
// alta por la vía administrativa + scripts/asignar-credenciales.js).
router.post("/registro", (req, res) => {
  const cuerpo = req.body ?? {};
  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const apellidoPaterno =
    typeof cuerpo.apellidoPaterno === "string" ? cuerpo.apellidoPaterno.trim() : "";
  const apellidoMaterno =
    typeof cuerpo.apellidoMaterno === "string" ? cuerpo.apellidoMaterno.trim() : "";
  const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim() : "";
  const password = typeof cuerpo.password === "string" ? cuerpo.password : "";
  const boleta = typeof cuerpo.boleta === "string" ? cuerpo.boleta.trim() : "";
  const carrera = typeof cuerpo.carrera === "string" ? cuerpo.carrera.trim() : "";

  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!apellidoPaterno) faltantes.push("apellidoPaterno");
  if (!apellidoMaterno) faltantes.push("apellidoMaterno");
  if (!correo) faltantes.push("correo");
  if (!password) faltantes.push("password");
  if (!boleta) faltantes.push("boleta");
  if (!carrera) faltantes.push("carrera");
  if (faltantes.length > 0) {
    return res
      .status(400)
      .json({ error: `Faltan campos obligatorios: ${faltantes.join(", ")}` });
  }

  if (!CORREO_RE.test(correo)) {
    return res.status(400).json({ error: "El correo no tiene un formato válido" });
  }

  if (!passwordValido(password)) {
    return res.status(400).json({
      error:
        "La contraseña debe tener al menos 9 caracteres e incluir al menos una letra y un número",
    });
  }

  if (!CARRERAS_VALIDAS.includes(carrera)) {
    return res.status(400).json({
      error: `carrera inválida: debe ser una de ${CARRERAS_VALIDAS.join(", ")}`,
    });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = derivar(password, salt).toString("hex");

  try {
    const registrar = db.transaction(() => {
      // Nombre de pila y apellidos van en columnas separadas. Solo alumno:
      // boleta y carrera; el resto de campos específicos van NULL.
      const info = db
        .prepare(
          `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, tipo, boleta, carrera)
           VALUES (@nombre, @apellidoPaterno, @apellidoMaterno, @correo, 'alumno', @boleta, @carrera)`,
        )
        .run({ nombre, apellidoPaterno, apellidoMaterno, correo, boleta, carrera });

      const usuarioId = Number(info.lastInsertRowid);
      db.prepare(
        "INSERT INTO credenciales (usuario_id, password_hash, password_salt) VALUES (?, ?, ?)",
      ).run(usuarioId, passwordHash, salt);
      return usuarioId;
    });

    const usuarioId = registrar();
    const token = crearSesion(usuarioId);
    return res
      .status(201)
      .json({ usuario: serializarUsuario(usuarioPorId(usuarioId)), token });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: `Ya existe un usuario con el correo ${correo}` });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const cuerpo = req.body ?? {};
  const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim() : "";
  const password = typeof cuerpo.password === "string" ? cuerpo.password : "";

  // Mismo mensaje para todos los casos de fallo: no revelamos si falló el correo
  // o la contraseña.
  const GENERICO = "Correo o contraseña incorrectos";

  const usuario = correo
    ? db.prepare("SELECT * FROM usuarios WHERE correo = ?").get(correo)
    : null;
  const cred = usuario
    ? db.prepare("SELECT * FROM credenciales WHERE usuario_id = ?").get(usuario.id)
    : null;

  if (!usuario || !cred || !password) {
    // Gastamos un scrypt igualmente para no dar una pista por tiempo de respuesta.
    if (password) derivar(password, "0".repeat(32));
    return res.status(401).json({ error: GENERICO });
  }

  if (!passwordCoincide(password, cred.password_salt, cred.password_hash)) {
    return res.status(401).json({ error: GENERICO });
  }

  const token = crearSesion(usuario.id);
  return res.json({ usuario: serializarUsuario(usuario), token });
});

// GET /api/auth/yo
router.get("/yo", (req, res) => {
  const token = tokenDelHeader(req);
  if (!token) {
    return res.status(401).json({ error: "Falta el token de sesión" });
  }

  const usuario = usuarioDeToken(token);
  if (!usuario) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  return res.json({ usuario: serializarUsuario(usuario) });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const token = tokenDelHeader(req);
  if (token) {
    db.prepare("DELETE FROM sesiones WHERE token = ?").run(token);
  }
  // Aunque no hubiera token o sesión, el resultado neto ya es "sin sesión".
  return res.json({ ok: true });
});

export default router;
