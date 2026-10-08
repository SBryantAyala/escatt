import { Router } from "express";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, cerrarSesionesDe, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import {
  CARRERAS_VALIDAS,
  PLANES_VALIDOS,
  ROLES_CATT,
  ROLES_GESTION,
  ROLES_STAFF,
  esCuentaDePersonal,
  puedeGestionar,
  puedeVer,
  tieneRol,
} from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import {
  asignacionesVigentes,
  asignarRol,
  generarPasswordTemporal,
  guardarPassword,
  listarUsuarios,
  motivosHistorial,
  obtenerUsuario,
  quitarRol,
  registrarBitacora,
} from "../lib/usuarios.js";

// Padrón de usuarios. Todas las rutas exigen sesión y permisos por rol
// (ver la matriz de permisos del documento del Módulo de Usuarios).
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const PG_UNIQUE_VIOLATION = "23505";
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (v) => (typeof v === "string" ? v.trim() : "");
const opcional = (v) => texto(v) || null;
const tiene = (obj, campo) => Object.prototype.hasOwnProperty.call(obj ?? {}, campo);

function idDeParams(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Traduce una violación de UNIQUE a un mensaje entendible.
function mensajeDuplicado(err) {
  const c = String(err.constraint || "");
  if (c.includes("boleta")) return "Ya existe un alumno con esa boleta";
  if (c.includes("numero_empleado")) return "Ya existe un empleado con ese número de empleado";
  if (c.includes("correo")) return "Ya existe un usuario con ese correo";
  return "El registro ya existe";
}

// Carga el usuario objetivo de :id y valida que el actor pueda verlo.
async function cargarObjetivo(req, res) {
  const id = idDeParams(req);
  if (!id) {
    res.status(400).json({ error: "El id debe ser un número entero positivo" });
    return null;
  }
  const objetivo = await obtenerUsuario(id);
  if (!objetivo) {
    res.status(404).json({ error: `No existe un usuario con id ${id}` });
    return null;
  }
  if (!puedeVer(req.usuario, objetivo)) {
    res.status(403).json({ error: "No tienes permiso para ver este usuario" });
    return null;
  }
  return objetivo;
}

function exigirGestion(req, res, objetivo) {
  if (req.usuario.id === objetivo.id) {
    res.status(403).json({ error: "No puedes realizar esta acción sobre tu propia cuenta" });
    return false;
  }
  if (!puedeGestionar(req.usuario, objetivo)) {
    res.status(403).json({
      error: esCuentaDePersonal(objetivo)
        ? "Solo el administrador del sistema gestiona las cuentas del personal CATT"
        : "Tu rol no tiene permiso para modificar este usuario",
    });
    return false;
  }
  return true;
}

async function academiaValida(id, client = pool) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return false;
  const { rows } = await client.query("SELECT activa FROM academias WHERE id = $1", [n]);
  return rows.length > 0 && rows[0].activa;
}

// GET /api/usuarios -> padrón.
//   Personal CATT (ejecutivo, auxiliar, consulta): todos.
//   Administrador del sistema: personal CATT, administradores y docentes.
//   Presidente de Academia (HU-11): solo los docentes de su academia.
// El filtro real lo hace puedeVer(); requiereRol solo deja pasar a estos roles.
router.get(
  "/",
  requiereRol("admin_sistema", ...ROLES_STAFF, "presidente_academia"),
  ruta(async (req, res) => {
    const todos = await listarUsuarios();
    res.json(todos.filter((u) => puedeVer(req.usuario, u)));
  }),
);

// GET /api/usuarios/:id -> ficha. El propio usuario, el personal CATT o el admin.
router.get(
  "/:id",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (objetivo) res.json(objetivo);
  }),
);

// POST /api/usuarios -> alta (HU-4 y HU-6).
//   perfil "alumno" o "docente": Secretario Ejecutivo o Auxiliar CATT.
//   perfil "personal_catt": solo el administrador del sistema, con rol_catt.
// La cuenta nace con contraseña temporal; se devuelve UNA sola vez.
router.post(
  "/",
  ruta(async (req, res) => {
    const c = req.body ?? {};
    const perfil = texto(c.perfil);

    if (!["alumno", "docente", "personal_catt"].includes(perfil)) {
      return res
        .status(400)
        .json({ error: 'perfil inválido: debe ser "alumno", "docente" o "personal_catt"' });
    }
    if (perfil === "personal_catt" && !tieneRol(req.usuario, "admin_sistema")) {
      return res
        .status(403)
        .json({ error: "Solo el administrador del sistema da de alta al personal CATT" });
    }
    if (perfil !== "personal_catt" && !tieneRol(req.usuario, ...ROLES_GESTION)) {
      return res.status(403).json({ error: "Tu rol no tiene permiso para dar de alta usuarios" });
    }

    const datos = {
      nombre: texto(c.nombre),
      apellido_paterno: texto(c.apellido_paterno),
      apellido_materno: texto(c.apellido_materno),
      correo: texto(c.correo).toLowerCase(),
      telefono: opcional(c.telefono),
    };

    const faltantes = ["nombre", "apellido_paterno", "apellido_materno", "correo"].filter(
      (k) => !datos[k],
    );
    if (perfil === "alumno") {
      for (const k of ["boleta", "carrera", "plan_estudios"]) if (!texto(c[k])) faltantes.push(k);
    } else {
      if (!texto(c.numero_empleado)) faltantes.push("numero_empleado");
      if (perfil === "docente" && !c.academia_id) faltantes.push("academia_id");
      if (perfil === "personal_catt" && !texto(c.rol_catt)) faltantes.push("rol_catt");
    }
    if (faltantes.length > 0) {
      return res.status(400).json({ error: `Faltan campos obligatorios: ${faltantes.join(", ")}` });
    }

    if (!CORREO_RE.test(datos.correo)) {
      return res.status(400).json({ error: "El correo no tiene un formato válido" });
    }
    if (perfil === "alumno") {
      if (!/^\d{10}$/.test(texto(c.boleta))) {
        return res.status(400).json({ error: "La boleta debe tener 10 dígitos" });
      }
      if (!CARRERAS_VALIDAS.includes(texto(c.carrera))) {
        return res.status(400).json({ error: `carrera inválida: ${CARRERAS_VALIDAS.join(", ")}` });
      }
      if (!PLANES_VALIDOS.includes(texto(c.plan_estudios))) {
        return res
          .status(400)
          .json({ error: `plan de estudios inválido: ${PLANES_VALIDOS.join(" o ")}` });
      }
    }
    if (perfil === "docente" && !(await academiaValida(c.academia_id))) {
      return res.status(400).json({ error: "Selecciona una academia válida" });
    }
    if (perfil === "personal_catt" && !ROLES_CATT.includes(texto(c.rol_catt))) {
      return res.status(400).json({ error: `rol_catt inválido: ${ROLES_CATT.join(", ")}` });
    }

    const passwordTemporal = generarPasswordTemporal();

    try {
      const id = await enTransaccion(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO usuarios
             (nombre, apellido_paterno, apellido_materno, correo, telefono,
              debe_cambiar_password, creado_por)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6)
           RETURNING id`,
          [
            datos.nombre,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.correo,
            datos.telefono,
            req.usuario.id,
          ],
        );
        const nuevoId = rows[0].id;

        if (perfil === "alumno") {
          await client.query(
            `INSERT INTO alumnos (usuario_id, boleta, carrera, plan_estudios)
             VALUES ($1, $2, $3, $4)`,
            [nuevoId, texto(c.boleta), texto(c.carrera), texto(c.plan_estudios)],
          );
          await asignarRol(client, nuevoId, "alumno", req.usuario.id);
        } else {
          await client.query(
            "INSERT INTO empleados (usuario_id, numero_empleado) VALUES ($1, $2)",
            [nuevoId, texto(c.numero_empleado)],
          );
          if (perfil === "docente") {
            await client.query(
              `INSERT INTO docentes (usuario_id, academia_id, cedula_profesional, extension)
               VALUES ($1, $2, $3, $4)`,
              [nuevoId, Number(c.academia_id), opcional(c.cedula_profesional), opcional(c.extension)],
            );
            await asignarRol(client, nuevoId, "docente", req.usuario.id);
          } else {
            await client.query("INSERT INTO personal_catt (usuario_id, cargo) VALUES ($1, $2)", [
              nuevoId,
              opcional(c.cargo),
            ]);
            await asignarRol(client, nuevoId, texto(c.rol_catt), req.usuario.id);
          }
        }

        await guardarPassword(client, nuevoId, passwordTemporal);
        await registrarBitacora(client, req.usuario.id, `alta_${perfil}`, "usuarios", nuevoId, {
          correo: datos.correo,
        });
        return nuevoId;
      });

      return res
        .status(201)
        .json({ usuario: await obtenerUsuario(id), password_temporal: passwordTemporal });
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        return res.status(409).json({ error: mensajeDuplicado(err) });
      }
      throw err;
    }
  }),
);

// PUT /api/usuarios/:id -> edita datos comunes y los del perfil que tenga.
// El rol y el estado NO se cambian aquí (hay rutas propias para eso).
router.put(
  "/:id",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo || !exigirGestion(req, res, objetivo)) return undefined;

    const c = req.body ?? {};
    const comunes = {};
    for (const k of ["nombre", "apellido_paterno", "apellido_materno", "correo"]) {
      if (!tiene(c, k)) continue;
      if (!texto(c[k])) return res.status(400).json({ error: `${k} no puede quedar vacío` });
      comunes[k] = k === "correo" ? texto(c[k]).toLowerCase() : texto(c[k]);
    }
    if (comunes.correo && !CORREO_RE.test(comunes.correo)) {
      return res.status(400).json({ error: "El correo no tiene un formato válido" });
    }
    if (tiene(c, "telefono")) comunes.telefono = opcional(c.telefono);

    const alumno = {};
    if (objetivo.perfiles.includes("alumno")) {
      if (tiene(c, "boleta")) {
        if (!/^\d{10}$/.test(texto(c.boleta))) {
          return res.status(400).json({ error: "La boleta debe tener 10 dígitos" });
        }
        alumno.boleta = texto(c.boleta);
      }
      if (tiene(c, "carrera")) {
        if (!CARRERAS_VALIDAS.includes(texto(c.carrera))) {
          return res.status(400).json({ error: `carrera inválida: ${CARRERAS_VALIDAS.join(", ")}` });
        }
        alumno.carrera = texto(c.carrera);
      }
      if (tiene(c, "plan_estudios")) {
        if (!PLANES_VALIDOS.includes(texto(c.plan_estudios))) {
          return res
            .status(400)
            .json({ error: `plan de estudios inválido: ${PLANES_VALIDOS.join(" o ")}` });
        }
        alumno.plan_estudios = texto(c.plan_estudios);
      }
    }

    const empleado = {};
    if (objetivo.numero_empleado != null && tiene(c, "numero_empleado")) {
      if (!texto(c.numero_empleado)) {
        return res.status(400).json({ error: "numero_empleado no puede quedar vacío" });
      }
      empleado.numero_empleado = texto(c.numero_empleado);
    }

    const docente = {};
    if (objetivo.perfiles.includes("docente")) {
      if (tiene(c, "academia_id")) {
        if (!(await academiaValida(c.academia_id))) {
          return res.status(400).json({ error: "Selecciona una academia válida" });
        }
        docente.academia_id = Number(c.academia_id);
      }
      if (tiene(c, "cedula_profesional")) docente.cedula_profesional = opcional(c.cedula_profesional);
      if (tiene(c, "extension")) docente.extension = opcional(c.extension);
    }

    const personal = {};
    if (objetivo.perfiles.includes("personal_catt") && tiene(c, "cargo")) {
      personal.cargo = opcional(c.cargo);
    }

    const bloques = [
      ["usuarios", "id", comunes],
      ["alumnos", "usuario_id", alumno],
      ["empleados", "usuario_id", empleado],
      ["docentes", "usuario_id", docente],
      ["personal_catt", "usuario_id", personal],
    ].filter(([, , cambios]) => Object.keys(cambios).length > 0);

    if (bloques.length === 0) {
      return res.status(400).json({ error: "No se envió ningún campo modificable" });
    }

    try {
      await enTransaccion(async (client) => {
        for (const [tabla, llave, cambios] of bloques) {
          const columnas = Object.keys(cambios);
          const asignaciones = columnas.map((col, i) => `${col} = $${i + 1}`).join(", ");
          await client.query(
            `UPDATE ${tabla} SET ${asignaciones} WHERE ${llave} = $${columnas.length + 1}`,
            [...columnas.map((col) => cambios[col]), objetivo.id],
          );
        }
        await registrarBitacora(client, req.usuario.id, "editar_usuario", "usuarios", objetivo.id, {
          campos: bloques.flatMap(([, , cambios]) => Object.keys(cambios)),
        });
      });
      return res.json(await obtenerUsuario(objetivo.id));
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION) {
        return res.status(409).json({ error: mensajeDuplicado(err) });
      }
      throw err;
    }
  }),
);

async function cambiarEstado(req, res, estado, accion) {
  const objetivo = await cargarObjetivo(req, res);
  if (!objetivo || !exigirGestion(req, res, objetivo)) return;

  if (estado === "revocada" && objetivo.roles.includes("catt_ejecutivo")) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM usuario_roles ur
       JOIN roles r ON r.id = ur.rol_id
       JOIN usuarios u ON u.id = ur.usuario_id
       WHERE r.clave = 'catt_ejecutivo' AND u.estado = 'activa' AND u.id <> $1`,
      [objetivo.id],
    );
    if (rows[0].n === 0) {
      res.status(409).json({ error: "Debe quedar al menos un Secretario Ejecutivo activo" });
      return;
    }
  }
  // HU-7: un docente con asignaciones vigentes (director, sinodal, seguimiento
  // o titular) no se puede revocar: 409 con la lista. Hoy la lista siempre
  // sale vacía porque el Módulo 2 aún no existe (ver asignacionesVigentes).
  if (estado === "revocada" && objetivo.perfiles.includes("docente")) {
    const asignaciones = await asignacionesVigentes(pool, objetivo.id);
    if (asignaciones.length > 0) {
      res.status(409).json({
        error: "No se puede revocar: el docente tiene asignaciones vigentes",
        asignaciones,
      });
      return;
    }
  }

  await enTransaccion(async (client) => {
    await client.query("UPDATE usuarios SET estado = $1 WHERE id = $2", [estado, objetivo.id]);
    if (estado === "revocada") await cerrarSesionesDe(objetivo.id, client);
    await registrarBitacora(client, req.usuario.id, accion, "usuarios", objetivo.id);
  });
  res.json(await obtenerUsuario(objetivo.id));
}

// PATCH /api/usuarios/:id/revocar y /reactivar -> baja lógica reversible.
router.patch(
  "/:id/revocar",
  ruta((req, res) => cambiarEstado(req, res, "revocada", "revocar_cuenta")),
);
router.patch(
  "/:id/reactivar",
  ruta((req, res) => cambiarEstado(req, res, "activa", "reactivar_cuenta")),
);

// POST /api/usuarios/:id/reset-password -> nueva contraseña temporal.
router.post(
  "/:id/reset-password",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo || !exigirGestion(req, res, objetivo)) return;

    const passwordTemporal = generarPasswordTemporal();
    await enTransaccion(async (client) => {
      await guardarPassword(client, objetivo.id, passwordTemporal);
      await client.query("UPDATE usuarios SET debe_cambiar_password = TRUE WHERE id = $1", [
        objetivo.id,
      ]);
      await cerrarSesionesDe(objetivo.id, client);
      await registrarBitacora(client, req.usuario.id, "reset_password", "usuarios", objetivo.id);
    });
    res.json({ usuario: await obtenerUsuario(objetivo.id), password_temporal: passwordTemporal });
  }),
);

// Reglas para asignar o quitar un rol. Devuelve un mensaje de error o null.
function validarCambioDeRol(actor, objetivo, rol) {
  if (actor.id === objetivo.id) return "No puedes cambiar tus propios roles";
  if (rol === "presidente_academia") {
    if (!tieneRol(actor, "catt_ejecutivo")) {
      return "Solo el Secretario Ejecutivo asigna Presidentes de Academia";
    }
    if (!objetivo.perfiles.includes("docente")) {
      return "Presidente de Academia solo se asigna a docentes";
    }
    return null;
  }
  if (ROLES_CATT.includes(rol) || rol === "admin_sistema") {
    if (!tieneRol(actor, "admin_sistema")) {
      return "Solo el administrador del sistema asigna roles del personal CATT";
    }
    if (ROLES_CATT.includes(rol) && objetivo.numero_empleado == null) {
      return "Los roles de la CATT requieren número de empleado";
    }
    return null;
  }
  return "Ese rol depende del perfil de la persona y no se asigna aquí";
}

// POST /api/usuarios/:id/roles  { rol } -> asigna un rol.
router.post(
  "/:id/roles",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo) return;
    const rol = texto(req.body?.rol);
    const error = validarCambioDeRol(req.usuario, objetivo, rol);
    if (error) return void res.status(403).json({ error });

    await enTransaccion(async (client) => {
      if (ROLES_CATT.includes(rol) && !objetivo.perfiles.includes("personal_catt")) {
        await client.query(
          "INSERT INTO personal_catt (usuario_id) VALUES ($1) ON CONFLICT DO NOTHING",
          [objetivo.id],
        );
      }
      await asignarRol(client, objetivo.id, rol, req.usuario.id);
      await registrarBitacora(client, req.usuario.id, "asignar_rol", "usuarios", objetivo.id, { rol });
    });
    res.json(await obtenerUsuario(objetivo.id));
  }),
);

// DELETE /api/usuarios/:id/roles/:rol -> quita un rol.
router.delete(
  "/:id/roles/:rol",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo) return;
    const rol = texto(req.params.rol);
    const error = validarCambioDeRol(req.usuario, objetivo, rol);
    if (error) return void res.status(403).json({ error });

    if (rol === "catt_ejecutivo") {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM usuario_roles ur
         JOIN roles r ON r.id = ur.rol_id
         JOIN usuarios u ON u.id = ur.usuario_id
         WHERE r.clave = 'catt_ejecutivo' AND u.estado = 'activa' AND u.id <> $1`,
        [objetivo.id],
      );
      if (rows[0].n === 0) {
        return void res
          .status(409)
          .json({ error: "Debe quedar al menos un Secretario Ejecutivo activo" });
      }
    }

    await enTransaccion(async (client) => {
      await quitarRol(client, objetivo.id, rol);
      await registrarBitacora(client, req.usuario.id, "quitar_rol", "usuarios", objetivo.id, { rol });
    });
    res.json(await obtenerUsuario(objetivo.id));
  }),
);

// GET /api/usuarios/:id/historial -> ¿la cuenta se puede eliminar? Mismos
// permisos que ver la ficha.
router.get(
  "/:id/historial",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo) return;
    const motivos = await motivosHistorial(pool, objetivo.id);
    res.json({ puede_eliminar: motivos.length === 0, motivos });
  }),
);

// ¿Hay otra cuenta activa con ese rol además de `usuarioId`?
async function quedaOtroActivoConRol(client, rol, usuarioId) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM usuario_roles ur
     JOIN roles r ON r.id = ur.rol_id
     JOIN usuarios u ON u.id = ur.usuario_id
     WHERE r.clave = $1 AND u.estado = 'activa' AND u.id <> $2`,
    [rol, usuarioId],
  );
  return rows[0].n > 0;
}

// DELETE /api/usuarios/:id -> borrado real, solo para cuentas sin historial
// (altas duplicadas o hechas por error). Lo normal es la baja lógica con
// /revocar. Mismos permisos que editar.
router.delete(
  "/:id",
  ruta(async (req, res) => {
    const objetivo = await cargarObjetivo(req, res);
    if (!objetivo || !exigirGestion(req, res, objetivo)) return;

    // Devuelve el cuerpo del 409, o null si se eliminó.
    const conflicto = await enTransaccion(async (client) => {
      const motivos = await motivosHistorial(client, objetivo.id);
      if (motivos.length > 0) {
        return { error: "Esta cuenta tiene historial; usa Revocar acceso.", motivos };
      }
      if (
        objetivo.roles.includes("catt_ejecutivo") &&
        !(await quedaOtroActivoConRol(client, "catt_ejecutivo", objetivo.id))
      ) {
        return { error: "Debe quedar al menos un Secretario Ejecutivo activo" };
      }
      if (
        objetivo.roles.includes("admin_sistema") &&
        !(await quedaOtroActivoConRol(client, "admin_sistema", objetivo.id))
      ) {
        return { error: "Debe quedar al menos un administrador del sistema activo" };
      }

      // La bitácora guarda una copia de los datos básicos: después del
      // borrado ya no hay fila de usuarios a la cual consultar.
      await registrarBitacora(client, req.usuario.id, "eliminar_usuario", "usuarios", objetivo.id, {
        nombre_completo: [objetivo.nombre, objetivo.apellido_paterno, objetivo.apellido_materno]
          .filter(Boolean)
          .join(" "),
        correo: objetivo.correo,
        perfiles: objetivo.perfiles,
        roles: objetivo.roles,
        boleta: objetivo.boleta,
        numero_empleado: objetivo.numero_empleado,
      });
      // Credenciales, sesiones, perfiles y roles caen en cascada.
      await client.query("DELETE FROM usuarios WHERE id = $1", [objetivo.id]);
      return null;
    });

    if (conflicto) return void res.status(409).json(conflicto);
    res.json({ eliminado: true, id: objetivo.id });
  }),
);

export default router;
