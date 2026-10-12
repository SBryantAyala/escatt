import { Router } from "express";

import { pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_STAFF } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";

// HU-15: consultar la bitácora de acciones. Es de solo lectura; cada alta,
// baja, edición o cambio de rol ya se registra aquí desde usuarios.js,
// academias.js y auth.js vía registrarBitacora().
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const LIMITE_DEFECTO = 200;
const LIMITE_MAXIMO = 500;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const texto = (v) => (typeof v === "string" ? v.trim() : "");

// FECHA_RE solo valida la forma (AAAA-MM-DD); esto valida que sea una fecha
// de calendario real, para no dejar pasar algo como "2026-13-99" a Postgres.
function fechaValida(v) {
  if (!FECHA_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// GET /api/bitacora?desde=&hasta=&accion=&q=&usuario_id=&limite=
//   Ve quién hizo cada alta, baja o cambio de rol: el Secretario Ejecutivo,
//   el resto del personal CATT y el administrador del sistema.
router.get(
  "/",
  requiereRol("admin_sistema", ...ROLES_STAFF),
  ruta(async (req, res) => {
    const condiciones = [];
    const valores = [];

    const desde = texto(req.query.desde);
    if (desde) {
      if (!fechaValida(desde)) {
        return res.status(400).json({ error: "desde debe ser una fecha válida en formato AAAA-MM-DD" });
      }
      valores.push(desde);
      condiciones.push(`b.creado_en >= $${valores.length}::date`);
    }

    const hasta = texto(req.query.hasta);
    if (hasta) {
      if (!fechaValida(hasta)) {
        return res.status(400).json({ error: "hasta debe ser una fecha válida en formato AAAA-MM-DD" });
      }
      valores.push(hasta);
      condiciones.push(`b.creado_en < ($${valores.length}::date + interval '1 day')`);
    }

    const accion = texto(req.query.accion);
    if (accion) {
      valores.push(accion);
      condiciones.push(`b.accion = $${valores.length}`);
    }

    // Búsqueda libre por el nombre de quien hizo la acción (HU-15: filtro
    // por usuario). Separado de usuario_id, que filtra por id exacto.
    const q = texto(req.query.q);
    if (q) {
      valores.push(`%${q}%`);
      condiciones.push(
        `(u.nombre || ' ' || u.apellido_paterno || ' ' || u.apellido_materno) ILIKE $${valores.length}`,
      );
    }

    const usuarioId = Number(req.query.usuario_id);
    if (req.query.usuario_id !== undefined) {
      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ error: "usuario_id debe ser un número entero positivo" });
      }
      valores.push(usuarioId);
      condiciones.push(`b.usuario_id = $${valores.length}`);
    }

    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(req.query.limite) || LIMITE_DEFECTO));
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT b.id, b.accion, b.entidad, b.entidad_id, b.detalle, b.creado_en, b.usuario_id,
              u.nombre, u.apellido_paterno, u.apellido_materno
       FROM bitacora b
       LEFT JOIN usuarios u ON u.id = b.usuario_id
       ${where}
       ORDER BY b.creado_en DESC
       LIMIT $${valores.length + 1}`,
      [...valores, limite],
    );

    res.json(
      rows.map((f) => ({
        id: f.id,
        accion: f.accion,
        entidad: f.entidad,
        entidad_id: f.entidad_id,
        detalle: f.detalle,
        creado_en: f.creado_en,
        usuario_id: f.usuario_id,
        usuario: f.usuario_id
          ? [f.nombre, f.apellido_paterno, f.apellido_materno].filter(Boolean).join(" ")
          : "Sistema",
      })),
    );
  }),
);

export default router;
