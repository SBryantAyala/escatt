import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

// GET /api/health -> comprueba que la API responde y que SQLite está accesible.
router.get("/health", (_req, res) => {
  const row = db.prepare("SELECT 1 AS ok").get();
  res.json({
    status: "ok",
    db: row?.ok === 1 ? "conectada" : "error",
    hora: new Date().toISOString(),
  });
});

export default router;
