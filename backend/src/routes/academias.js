import { Router } from "express";

import { enTransaccion, pool } from "../db/index.js";
import { CLAVES_COLOR_ACADEMIA, ICONOS_ACADEMIA, colorValido, iconoValido } from "../lib/academias.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { asignarRol, nombreCompletoDe, quitarRol, registrarBitacora } from "../lib/usuarios.js";

// Academias: el Secretario Ejecutivo es su dueño (alta, edición, presidente,
// integrantes). El resto del personal CATT y el administrador consultan; el
// Presidente de cada academia consulta la suya. Hay un solo presidente por
// academia (academias.presidente_id, UNIQUE) — ver la migración en db/index.js
// para el invariante que se mantiene con el rol presidente_academia.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const ROLES_CONSULTA = ["catt_ejecutivo", "catt_auxiliar", "catt_consulta", "admin_sistema"];

const texto = (v) => (typeof v === "string" ? v.trim() : "");

function idDeParams(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function inicialesDe(u) {
  const i1 = (u.nombre || "").trim().charAt(0);
  const i2 = (u.apellido_paterno || "").trim().charAt(0);
  return `${i1}${i2}`.toUpperCase() || "—";
}

// Ficha completa de una academia: datos + presidente + integrantes (el
// presidente primero, luego alfabético). Se reutiliza como respuesta de
// GET /:id y de toda escritura que afecte la academia (POST, PUT, presidente,
// docentes), para que el frontend siempre pueda reemplazar su estado con la
// respuesta tal cual.
async function resumenPersona(id) {
  if (id == null) return null;
  const { rows } = await pool.query(
    "SELECT id, nombre, apellido_paterno, apellido_materno FROM usuarios WHERE id = $1",
    [id],
  );
  const u = rows[0];
  return u ? { id: u.id, nombre_completo: nombreCompletoDe(u), iniciales: inicialesDe(u) } : null;
}

async function obtenerFichaAcademia(id) {
  const { rows } = await pool.query(
    `SELECT ac.id, ac.nombre, ac.departamento, ac.activa, ac.color, ac.icono, ac.presidente_id, ac.expresidente_id,
            (SELECT count(*)::int FROM docentes d WHERE d.academia_id = ac.id) AS total_docentes
     FROM academias ac WHERE ac.id = $1`,
    [id],
  );
  const fila = rows[0];
  if (!fila) return null;

  let presidente = null;
  if (fila.presidente_id != null) {
    const { rows: pr } = await pool.query(
      "SELECT id, nombre, apellido_paterno, apellido_materno FROM usuarios WHERE id = $1",
      [fila.presidente_id],
    );
    if (pr[0]) presidente = { id: pr[0].id, nombre_completo: nombreCompletoDe(pr[0]), iniciales: inicialesDe(pr[0]) };
  }

  const { rows: docentesRows } = await pool.query(
    `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo,
            u.estado, u.debe_cambiar_password, e.numero_empleado
     FROM docentes d
     JOIN usuarios u ON u.id = d.usuario_id
     JOIN empleados e ON e.usuario_id = d.usuario_id
     WHERE d.academia_id = $1`,
    [id],
  );
  const integrantes = docentesRows
    .map((u) => ({
      id: u.id,
      nombre_completo: nombreCompletoDe(u),
      correo: u.correo,
      numero_empleado: u.numero_empleado,
      activo: u.estado === "activa",
      debe_cambiar_password: u.debe_cambiar_password,
      es_presidente: u.id === fila.presidente_id,
    }))
    .sort(
      (a, b) =>
        Number(b.es_presidente) - Number(a.es_presidente) ||
        a.nombre_completo.localeCompare(b.nombre_completo, "es", { sensitivity: "base" }),
    );

  return {
    academia: {
      id: fila.id,
      nombre: fila.nombre,
      departamento: fila.departamento,
      activa: fila.activa,
      color: fila.color,
      icono: fila.icono,
      total_docentes: fila.total_docentes,
    },
    presidente,
    expresidente: await resumenPersona(fila.expresidente_id),
    integrantes,
  };
}

// GET /api/academias -> activas, con color/ícono/presidente/total de docentes.
// ?todas=1 incluye inactivas (solo Secretario Ejecutivo).
router.get(
  "/",
  ruta(async (req, res) => {
    const todas = req.query.todas === "1" && tieneRol(req.usuario, "catt_ejecutivo");
    const { rows } = await pool.query(
      `SELECT ac.id, ac.nombre, ac.departamento, ac.activa, ac.color, ac.icono, ac.presidente_id,
              ac.expresidente_id,
              pu.nombre AS p_nombre, pu.apellido_paterno AS p_apellido_paterno,
              pu.apellido_materno AS p_apellido_materno,
              eu.nombre AS e_nombre, eu.apellido_paterno AS e_apellido_paterno,
              eu.apellido_materno AS e_apellido_materno,
              (SELECT count(*)::int FROM docentes d WHERE d.academia_id = ac.id) AS total_docentes
       FROM academias ac
       LEFT JOIN usuarios pu ON pu.id = ac.presidente_id
       LEFT JOIN usuarios eu ON eu.id = ac.expresidente_id
       ${todas ? "" : "WHERE ac.activa"}
       ORDER BY ac.activa DESC, ac.nombre`,
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        departamento: r.departamento,
        activa: r.activa,
        color: r.color,
        icono: r.icono,
        total_docentes: r.total_docentes,
        presidente: r.presidente_id
          ? {
              id: r.presidente_id,
              nombre_completo: nombreCompletoDe({
                nombre: r.p_nombre,
                apellido_paterno: r.p_apellido_paterno,
                apellido_materno: r.p_apellido_materno,
              }),
              iniciales: inicialesDe({ nombre: r.p_nombre, apellido_paterno: r.p_apellido_paterno }),
            }
          : null,
        expresidente: r.expresidente_id
          ? {
              id: r.expresidente_id,
              nombre_completo: nombreCompletoDe({
                nombre: r.e_nombre,
                apellido_paterno: r.e_apellido_paterno,
                apellido_materno: r.e_apellido_materno,
              }),
              iniciales: inicialesDe({ nombre: r.e_nombre, apellido_paterno: r.e_apellido_paterno }),
            }
          : null,
      })),
    );
  }),
);

// GET /api/academias/:id -> ficha completa. Personal CATT, admin, o el
// Presidente de ESA academia; cualquier otro, 403.
router.get(
  "/:id",
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });

    const ficha = await obtenerFichaAcademia(id);
    if (!ficha) return void res.status(404).json({ error: "No existe esa academia" });

    const esPresidenteDeEsta = ficha.presidente?.id === req.usuario.id;
    if (!tieneRol(req.usuario, ...ROLES_CONSULTA) && !esPresidenteDeEsta) {
      return void res.status(403).json({ error: "No tienes permiso para ver esta academia" });
    }
    res.json(ficha);
  }),
);

// POST /api/academias -> alta (solo Secretario Ejecutivo).
router.post(
  "/",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const nombre = texto(req.body?.nombre);
    const color = texto(req.body?.color);
    const icono = texto(req.body?.icono);
    if (!nombre) return void res.status(400).json({ error: "Escribe el nombre de la academia" });
    if (!colorValido(color)) {
      return void res.status(400).json({ error: `color inválido: usa uno de ${CLAVES_COLOR_ACADEMIA.join(", ")}` });
    }
    if (!iconoValido(icono)) {
      return void res.status(400).json({ error: `icono inválido: usa uno de ${ICONOS_ACADEMIA.join(", ")}` });
    }

    try {
      const { rows } = await pool.query(
        "INSERT INTO academias (nombre, departamento, color, icono) VALUES ($1, $2, $3, $4) RETURNING id",
        [nombre, texto(req.body?.departamento) || null, color, icono],
      );
      await registrarBitacora(pool, req.usuario.id, "alta_academia", "academias", rows[0].id);
      res.status(201).json(await obtenerFichaAcademia(rows[0].id));
    } catch (err) {
      if (err.code === "23505") {
        return void res.status(409).json({ error: "Ya existe una academia con ese nombre" });
      }
      throw err;
    }
  }),
);

// PUT /api/academias/:id -> edita nombre, departamento, color, ícono o activa.
router.put(
  "/:id",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });

    const cambios = {};
    if (req.body?.nombre !== undefined) cambios.nombre = texto(req.body.nombre);
    if (req.body?.departamento !== undefined) cambios.departamento = texto(req.body.departamento) || null;
    if (req.body?.color !== undefined) {
      if (!colorValido(req.body.color)) {
        return void res
          .status(400)
          .json({ error: `color inválido: usa uno de ${CLAVES_COLOR_ACADEMIA.join(", ")}` });
      }
      cambios.color = req.body.color;
    }
    if (req.body?.icono !== undefined) {
      if (!iconoValido(req.body.icono)) {
        return void res
          .status(400)
          .json({ error: `icono inválido: usa uno de ${ICONOS_ACADEMIA.join(", ")}` });
      }
      cambios.icono = req.body.icono;
    }
    if (req.body?.activa !== undefined) cambios.activa = Boolean(req.body.activa);
    if (cambios.nombre === "") return void res.status(400).json({ error: "El nombre no puede quedar vacío" });

    if (cambios.activa === false) {
      const { rows } = await pool.query("SELECT count(*)::int AS n FROM docentes WHERE academia_id = $1", [id]);
      if (rows[0].n > 0) {
        return void res.status(409).json({
          error: "Tiene docentes asignados; muévelos a otra academia antes de desactivarla.",
          total_docentes: rows[0].n,
        });
      }
    }

    const columnas = Object.keys(cambios);
    if (columnas.length === 0) return void res.status(400).json({ error: "Nada que actualizar" });

    try {
      const { rows } = await pool.query(
        `UPDATE academias SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(", ")}
         WHERE id = $${columnas.length + 1} RETURNING id`,
        [...columnas.map((c) => cambios[c]), id],
      );
      if (!rows[0]) return void res.status(404).json({ error: "No existe esa academia" });
      await registrarBitacora(pool, req.usuario.id, "editar_academia", "academias", id, cambios);
      res.json(await obtenerFichaAcademia(id));
    } catch (err) {
      if (err.code === "23505") {
        return void res.status(409).json({ error: "Ya existe una academia con ese nombre" });
      }
      throw err;
    }
  }),
);

// PUT /api/academias/:id/presidente { docente_id } -> cambia (o asigna) el
// presidente. Quita el rol al anterior, lo asigna al nuevo.
router.put(
  "/:id/presidente",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const docenteId = Number(req.body?.docente_id);
    if (!Number.isInteger(docenteId) || docenteId <= 0) {
      return void res.status(400).json({ error: "docente_id debe ser un número entero positivo" });
    }

    const { rows: acRows } = await pool.query(
      "SELECT presidente_id, expresidente_id FROM academias WHERE id = $1",
      [id],
    );
    if (!acRows[0]) return void res.status(404).json({ error: "No existe esa academia" });

    const { rows: docRows } = await pool.query(
      `SELECT d.usuario_id, d.academia_id, u.estado FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id WHERE d.usuario_id = $1`,
      [docenteId],
    );
    const docente = docRows[0];
    if (!docente || docente.academia_id !== id || docente.estado !== "activa") {
      return void res
        .status(400)
        .json({ error: "Ese docente no pertenece a esta academia o no está activo" });
    }

    const anterior = acRows[0].presidente_id;
    let expresidente = acRows[0].expresidente_id;
    if (anterior != null && anterior !== docenteId) expresidente = anterior;
    else if (expresidente === docenteId) expresidente = null;
    await enTransaccion(async (client) => {
      if (anterior) await quitarRol(client, anterior, "presidente_academia");
      await client.query("UPDATE academias SET presidente_id = $1, expresidente_id = $2 WHERE id = $3", [
        docenteId,
        expresidente,
        id,
      ]);
      await asignarRol(client, docenteId, "presidente_academia", req.usuario.id);
      await registrarBitacora(client, req.usuario.id, "cambiar_presidente", "academias", id, {
        anterior,
        nuevo: docenteId,
        expresidente,
      });
    });

    res.json(await obtenerFichaAcademia(id));
  }),
);

// PUT /api/academias/:id/expresidente { docente_id | null } -> corrige a mano
// el expresidente inmediato (Art. 8 VI del Documento Rector). Se actualiza
// solo al cambiar o quitar al presidente; esta ruta sirve para capturar el de
// las academias que ya tenían un cambio de presidente antes de existir el campo.
router.put(
  "/:id/expresidente",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const docenteId = req.body?.docente_id == null ? null : Number(req.body.docente_id);
    if (docenteId !== null && (!Number.isInteger(docenteId) || docenteId <= 0)) {
      return void res.status(400).json({ error: "docente_id debe ser un número entero positivo o null" });
    }

    const { rows: acRows } = await pool.query(
      "SELECT presidente_id, expresidente_id FROM academias WHERE id = $1",
      [id],
    );
    if (!acRows[0]) return void res.status(404).json({ error: "No existe esa academia" });

    if (docenteId !== null) {
      // Como en el presidente: docente de esta academia y con cuenta activa.
      // El expresidente se convoca a cada sesión nueva de la CATT.
      const { rows: docRows } = await pool.query(
        `SELECT d.academia_id, u.estado FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id WHERE d.usuario_id = $1`,
        [docenteId],
      );
      const docente = docRows[0];
      if (!docente || docente.academia_id !== id || docente.estado !== "activa") {
        return void res.status(400).json({ error: "Ese docente no pertenece a esta academia o no está activo" });
      }
      if (docenteId === acRows[0].presidente_id) {
        return void res.status(409).json({ error: "El presidente actual no puede ser el expresidente" });
      }
    }

    await enTransaccion(async (client) => {
      await client.query("UPDATE academias SET expresidente_id = $1 WHERE id = $2", [docenteId, id]);
      await registrarBitacora(client, req.usuario.id, "definir_expresidente", "academias", id, {
        anterior: acRows[0].expresidente_id,
        nuevo: docenteId,
      });
    });

    res.json(await obtenerFichaAcademia(id));
  }),
);

// DELETE /api/academias/:id/presidente -> deja la academia sin presidente.
router.delete(
  "/:id/presidente",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });

    const { rows: acRows } = await pool.query("SELECT presidente_id FROM academias WHERE id = $1", [id]);
    if (!acRows[0]) return void res.status(404).json({ error: "No existe esa academia" });
    const anterior = acRows[0].presidente_id;

    if (anterior) {
      await enTransaccion(async (client) => {
        await quitarRol(client, anterior, "presidente_academia");
        await client.query("UPDATE academias SET presidente_id = NULL, expresidente_id = $1 WHERE id = $2", [
          anterior,
          id,
        ]);
        await registrarBitacora(client, req.usuario.id, "quitar_presidente", "academias", id, { anterior });
      });
    }

    res.json(await obtenerFichaAcademia(id));
  }),
);

// POST /api/academias/:id/docentes { docente_ids } -> mueve docentes a esta
// academia (debe estar activa). Si alguno es presidente de su academia
// actual, 409: primero hay que cambiarlo o quitarlo allá.
router.post(
  "/:id/docentes",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = idDeParams(req);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });

    const ids = Array.isArray(req.body?.docente_ids)
      ? [...new Set(req.body.docente_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
    if (ids.length === 0) {
      return void res.status(400).json({ error: "docente_ids debe ser un arreglo con al menos un id" });
    }

    const { rows: acRows } = await pool.query("SELECT id, nombre, activa FROM academias WHERE id = $1", [id]);
    const destino = acRows[0];
    if (!destino) return void res.status(404).json({ error: "No existe esa academia" });
    if (!destino.activa) return void res.status(400).json({ error: "La academia destino debe estar activa" });

    const { rows: docRows } = await pool.query(
      `SELECT d.usuario_id, u.nombre, u.apellido_paterno, u.apellido_materno,
              ac.id AS academia_actual_id, ac.nombre AS academia_actual, ac.presidente_id
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       JOIN academias ac ON ac.id = d.academia_id
       WHERE d.usuario_id = ANY($1::int[])`,
      [ids],
    );
    if (docRows.length !== ids.length) {
      return void res.status(400).json({ error: "Alguno de los docentes no existe" });
    }

    const presidenteEnMovimiento = docRows.find((d) => d.presidente_id === d.usuario_id);
    if (presidenteEnMovimiento) {
      return void res.status(409).json({
        error: `${nombreCompletoDe(presidenteEnMovimiento)} es presidente de ${presidenteEnMovimiento.academia_actual}; primero cambia o quita al presidente de esa academia.`,
        docente: nombreCompletoDe(presidenteEnMovimiento),
        academia: presidenteEnMovimiento.academia_actual,
      });
    }

    await enTransaccion(async (client) => {
      await client.query("UPDATE docentes SET academia_id = $1 WHERE usuario_id = ANY($2::int[])", [id, ids]);
      await registrarBitacora(client, req.usuario.id, "mover_docentes", "academias", id, {
        docente_ids: ids,
        academia_destino: destino.nombre,
      });
    });

    res.json(await obtenerFichaAcademia(id));
  }),
);

export default router;
