import "dotenv/config";
import express from "express";
import cors from "cors";

import { pool } from "./db/index.js";
import healthRouter from "./routes/health.js";
import usuariosRouter from "./routes/usuarios.js";
import authRouter from "./routes/auth.js";
import academiasRouter from "./routes/academias.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ servicio: "ESCATT API", ok: true });
});

// Todas las rutas de la API cuelgan de /api
app.use("/api", healthRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/auth", authRouter);
app.use("/api/academias", academiasRouter);

// Punto único para registrar las rutas de cada pantalla.
// Cada integrante agrega aquí SU router desde su rama feature/*:
//   import otroRouter from "./routes/otro.js";
//   app.use("/api/otro", otroRouter);

// Ruta no encontrada dentro de /api -> JSON en vez del HTML de Express.
app.use("/api", (_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Manejador de errores: cualquier excepción no controlada responde JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" });
  }
  console.error("[api] error:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, async () => {
  console.log(`[api] ESCATT escuchando en http://localhost:${port}`);
  const { rows } = await pool.query(
    "SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'",
  );
  console.log(`[api] tablas: ${rows[0].n}`);
});
