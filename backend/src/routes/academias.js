import { Router } from "express";

import { pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

// Catálogo de academias. Cualquier usuario con sesión lo consulta; solo el
// Secretario Ejecutivo lo administra.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

const texto = (v) => (typeof v === "string" ? v.trim() : "");

// GET /api/academias -> activas. ?todas=1 incluye inactivas (solo Secretario Ejecutivo).
router.get(
  "/",
  ruta(async (req, res) => {
    const todas = req.query.todas === "1" && tieneRol(req.usuario, "catt_ejecutivo");
    const { rows } = await pool.query(
      `SELECT id, nombre, departamento, activa FROM academias
       ${todas ? "" : "WHERE activa"} ORDER BY nombre`,
    );
    res.json(rows);
  }),
);

// POST /api/academias -> alta.
router.post(
  "/",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const nombre = texto(req.body?.nombre);
    if (!nombre) return void res.status(400).json({ error: "Escribe el nombre de la academia" });
    try {
      const { rows } = await pool.query(
        "INSERT INTO academias (nombre, departamento) VALUES ($1, $2) RETURNING *",
        [nombre, texto(req.body?.departamento) || null],
      );
      await registrarBitacora(pool, req.usuario.id, "alta_academia", "academias", rows[0].id);
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === "23505") {
        return void res.status(409).json({ error: "Ya existe una academia con ese nombre" });
      }
      throw err;
    }
  }),
);

// PUT /api/academias/:id -> edita nombre, departamento o activa.
router.put(
  "/:id",
  requiereRol("catt_ejecutivo"),
  ruta(async (req, res) => {
    const id = Number(req.params.id);
    const cambios = {};
    if (req.body?.nombre !== undefined) cambios.nombre = texto(req.body.nombre);
    if (req.body?.departamento !== undefined) cambios.departamento = texto(req.body.departamento) || null;
    if (req.body?.activa !== undefined) cambios.activa = Boolean(req.body.activa);
    if (cambios.nombre === "") return void res.status(400).json({ error: "El nombre no puede quedar vacío" });
    const columnas = Object.keys(cambios);
    if (columnas.length === 0) return void res.status(400).json({ error: "Nada que actualizar" });

    const { rows } = await pool.query(
      `UPDATE academias SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(", ")}
       WHERE id = $${columnas.length + 1} RETURNING *`,
      [...columnas.map((c) => cambios[c]), id],
    );
    if (!rows[0]) return void res.status(404).json({ error: "No existe esa academia" });
    await registrarBitacora(pool, req.usuario.id, "editar_academia", "academias", id, cambios);
    res.json(rows[0]);
  }),
);

export default router;
