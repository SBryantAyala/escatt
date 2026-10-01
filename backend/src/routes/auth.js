import { Router } from "express";

import { ruta } from "../lib/ruta.js";
import { pool, enTransaccion } from "../db/index.js";
import {
  autenticar,
  cerrarSesionesDe,
  crearSesion,
  tokenDelHeader,
} from "../lib/auth.js";
import { CARRERAS_VALIDAS, PLANES_VALIDOS } from "../lib/roles.js";
import {
  asignarRol,
  derivar,
  guardarPassword,
  obtenerUsuario,
  obtenerUsuarioPorCorreo,
  passwordCoincide,
  passwordValido,
  registrarBitacora,
} from "../lib/usuarios.js";

const router = Router();

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMINIO_ALUMNO = "@alumno.ipn.mx";
const PG_UNIQUE_VIOLATION = "23505";
const MENSAJE_PASSWORD =
  "La contraseña debe tener al menos 9 caracteres e incluir al menos una letra y un número";

const texto = (v) => (typeof v === "string" ? v.trim() : "");

// POST /api/auth/registro (HU-2)
// El registro público SOLO crea alumnos: el rol nunca se lee del body.
router.post("/registro", ruta(async (req, res) => {
  const cuerpo = req.body ?? {};
  const nombre = texto(cuerpo.nombre);
  const apellidoPaterno = texto(cuerpo.apellidoPaterno);
  const apellidoMaterno = texto(cuerpo.apellidoMaterno);
  const correo = texto(cuerpo.correo).toLowerCase();
  const password = typeof cuerpo.password === "string" ? cuerpo.password : "";
  const boleta = texto(cuerpo.boleta);
  const carrera = texto(cuerpo.carrera);
  const planEstudios = texto(cuerpo.planEstudios);

  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!apellidoPaterno) faltantes.push("apellidoPaterno");
  if (!apellidoMaterno) faltantes.push("apellidoMaterno");
  if (!correo) faltantes.push("correo");
  if (!password) faltantes.push("password");
  if (!boleta) faltantes.push("boleta");
  if (!carrera) faltantes.push("carrera");
  if (!planEstudios) faltantes.push("planEstudios");
  if (faltantes.length > 0) {
    return res.status(400).json({ error: `Faltan campos obligatorios: ${faltantes.join(", ")}` });
  }

  if (!CORREO_RE.test(correo) || !correo.endsWith(DOMINIO_ALUMNO)) {
    return res
      .status(400)
      .json({ error: `Usa tu correo institucional de alumno (${DOMINIO_ALUMNO})` });
  }
  if (!passwordValido(password)) return res.status(400).json({ error: MENSAJE_PASSWORD });
  if (!/^\d{10}$/.test(boleta)) {
    return res.status(400).json({ error: "La boleta debe tener 10 dígitos" });
  }
  if (!CARRERAS_VALIDAS.includes(carrera)) {
    return res
      .status(400)
      .json({ error: `carrera inválida: debe ser una de ${CARRERAS_VALIDAS.join(", ")}` });
  }
  if (!PLANES_VALIDOS.includes(planEstudios)) {
    return res
      .status(400)
      .json({ error: `plan de estudios inválido: debe ser ${PLANES_VALIDOS.join(" o ")}` });
  }

  try {
    const usuarioId = await enTransaccion(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nombre, apellidoPaterno, apellidoMaterno, correo],
      );
      const id = rows[0].id;
      await client.query(
        "INSERT INTO alumnos (usuario_id, boleta, carrera, plan_estudios) VALUES ($1, $2, $3, $4)",
        [id, boleta, carrera, planEstudios],
      );
      await asignarRol(client, id, "alumno");
      await guardarPassword(client, id, password);
      await registrarBitacora(client, id, "registro_alumno", "usuarios", id, null);
      return id;
    });

    const token = await crearSesion(usuarioId);
    return res.status(201).json({ usuario: await obtenerUsuario(usuarioId), token });
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      const campo = String(err.constraint || "").includes("boleta") ? "boleta" : "correo";
      return res.status(409).json({
        error:
          campo === "boleta"
            ? `Ya existe una cuenta con la boleta ${boleta}`
            : `Ya existe una cuenta con el correo ${correo}`,
      });
    }
    throw err;
  }
}));

// POST /api/auth/login
router.post("/login", ruta(async (req, res) => {
  const cuerpo = req.body ?? {};
  const correo = texto(cuerpo.correo);
  const password = typeof cuerpo.password === "string" ? cuerpo.password : "";
  const GENERICO = "Correo o contraseña incorrectos";

  const usuario = correo ? await obtenerUsuarioPorCorreo(correo) : null;
  const cred = usuario
    ? (await pool.query("SELECT * FROM credenciales WHERE usuario_id = $1", [usuario.id])).rows[0]
    : null;

  if (!usuario || !cred || !password) {
    // Se gasta un scrypt igual para no dar pistas por tiempo de respuesta.
    if (password) derivar(password, "0".repeat(32));
    return res.status(401).json({ error: GENERICO });
  }
  if (!passwordCoincide(password, cred.password_salt, cred.password_hash)) {
    return res.status(401).json({ error: GENERICO });
  }
  // Solo después de validar la contraseña se revela que la cuenta está revocada.
  if (usuario.estado === "revocada") {
    return res
      .status(403)
      .json({ error: "Tu acceso fue revocado. Comunícate con la CATT para reactivarlo." });
  }

  const token = await crearSesion(usuario.id);
  return res.json({ usuario, token });
}));

// GET /api/auth/yo
router.get("/yo", autenticar, (req, res) => res.json({ usuario: req.usuario }));

// POST /api/auth/logout
router.post("/logout", ruta(async (req, res) => {
  const token = tokenDelHeader(req);
  if (token) await pool.query("DELETE FROM sesiones WHERE token = $1", [token]);
  return res.json({ ok: true });
}));

// PUT /api/auth/password (HU-5) -> cambia la contraseña propia.
// Es la única ruta disponible mientras la contraseña sea temporal.
router.put("/password", autenticar, ruta(async (req, res) => {
  const actual = typeof req.body?.actual === "string" ? req.body.actual : "";
  const nueva = typeof req.body?.nueva === "string" ? req.body.nueva : "";

  if (!actual || !nueva) {
    return res.status(400).json({ error: "Escribe tu contraseña actual y la nueva" });
  }
  const { rows } = await pool.query("SELECT * FROM credenciales WHERE usuario_id = $1", [
    req.usuario.id,
  ]);
  const cred = rows[0];
  if (!cred || !passwordCoincide(actual, cred.password_salt, cred.password_hash)) {
    return res.status(400).json({ error: "La contraseña actual no es correcta" });
  }
  if (!passwordValido(nueva)) return res.status(400).json({ error: MENSAJE_PASSWORD });
  if (nueva === actual) {
    return res.status(400).json({ error: "La nueva contraseña debe ser distinta de la actual" });
  }

  await enTransaccion(async (client) => {
    await guardarPassword(client, req.usuario.id, nueva);
    await client.query("UPDATE usuarios SET debe_cambiar_password = FALSE WHERE id = $1", [
      req.usuario.id,
    ]);
    // Cierra las demás sesiones abiertas; la actual sigue viva.
    await cerrarSesionesDe(req.usuario.id, client, req.token);
    await registrarBitacora(client, req.usuario.id, "cambio_password", "usuarios", req.usuario.id);
  });

  return res.json({ usuario: await obtenerUsuario(req.usuario.id) });
}));

// PATCH /api/auth/perfil -> el usuario edita solo sus datos de contacto.
router.patch("/perfil", autenticar, ruta(async (req, res) => {
  const cuerpo = req.body ?? {};
  const tieneTelefono = Object.prototype.hasOwnProperty.call(cuerpo, "telefono");
  const tieneExtension = Object.prototype.hasOwnProperty.call(cuerpo, "extension");

  if (!tieneTelefono && !tieneExtension) {
    return res.status(400).json({ error: "Solo puedes editar teléfono y extensión" });
  }
  if (tieneExtension && !req.usuario.perfiles.includes("docente")) {
    return res.status(400).json({ error: "La extensión solo aplica a docentes" });
  }

  await enTransaccion(async (client) => {
    if (tieneTelefono) {
      await client.query("UPDATE usuarios SET telefono = $1 WHERE id = $2", [
        texto(cuerpo.telefono) || null,
        req.usuario.id,
      ]);
    }
    if (tieneExtension) {
      await client.query("UPDATE docentes SET extension = $1 WHERE usuario_id = $2", [
        texto(cuerpo.extension) || null,
        req.usuario.id,
      ]);
    }
  });

  return res.json({ usuario: await obtenerUsuario(req.usuario.id) });
}));

export default router;
