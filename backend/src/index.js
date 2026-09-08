import "dotenv/config";
import express from "express";
import cors from "cors";

import { db } from "./db/index.js";
import healthRouter from "./routes/health.js";
import usuariosRouter from "./routes/usuarios.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ servicio: "ESCATT API", ok: true });
});

// Todas las rutas de la API cuelgan de /api
app.use("/api", healthRouter);
app.use("/api/usuarios", usuariosRouter);

// Punto único para registrar las rutas de cada pantalla.
// Cada integrante agrega aquí SU router desde su rama feature/*:
//   import otroRouter from "./routes/otro.js";
//   app.use("/api/otro", otroRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[api] ESCATT escuchando en http://localhost:${port}`);
  console.log(`[api] tablas: ${db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n}`);
});
