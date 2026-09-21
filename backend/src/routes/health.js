import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// GET /api/health -> comprueba que la API responde y que PostgreSQL está accesible.
router.get("/health", async (_req, res) => {
  const { rows } = await pool.query("SELECT 1 AS ok");
  res.json({
    status: "ok",
    db: rows[0]?.ok === 1 ? "conectada" : "error",
    hora: new Date().toISOString(),
  });
});

export default router;
