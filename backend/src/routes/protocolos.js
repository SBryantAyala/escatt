import { Router } from "express";

import { pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto } from "../lib/auth.js";
import { ruta } from "../lib/ruta.js";

// Módulo 2. Por ahora solo la consulta de HU-25: el director ve los
// protocolos que dirige y su estado. Es de solo lectura a propósito: el
// director no edita el protocolo directamente.
const router = Router();
router.use(autenticar, exigeCambioResuelto);

// Observaciones de los sinodales por protocolo (HU-25, criterio 2: "si
// aplica"). Pendiente (HU-21): todavía no existen las evaluaciones de los
// sinodales, así que nunca hay observaciones. Cuando exista esa tabla, esta
// es la ÚNICA función que falta completar: debe devolver un Map de
// protocolo_id -> [{ sinodal, observaciones }] y la ruta y la pantalla ya
// las muestran.
async function observacionesPorProtocolo(_client, _protocoloIds) {
  return new Map();
}

// GET /api/protocolos/dirigidos -> protocolos donde la persona autenticada
// es director (uno de los dos), con su alumno, su estado y, si aplica, las
// observaciones. Solo cuentas con perfil de docente (HU-25).
//
// No recibe parámetros: el filtro sale siempre de la sesión, así que nadie
// puede pedir los protocolos de otro director.
router.get(
  "/dirigidos",
  ruta(async (req, res) => {
    if (!req.usuario.perfiles?.includes("docente")) {
      return res.status(403).json({ error: "Solo el personal docente puede consultar protocolos que dirige" });
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.titulo, p.estado, p.creado_en,
              a.boleta, a.carrera,
              u.nombre, u.apellido_paterno, u.apellido_materno,
              (SELECT json_agg(
                        json_build_object(
                          'id', d.docente_id,
                          'nombre', concat_ws(' ', du.nombre, du.apellido_paterno, du.apellido_materno))
                        ORDER BY du.apellido_paterno, du.nombre)
                 FROM protocolo_directores d
                 JOIN usuarios du ON du.id = d.docente_id
                WHERE d.protocolo_id = p.id) AS directores
         FROM protocolo_directores pd
         JOIN protocolos p ON p.id = pd.protocolo_id
         JOIN alumnos a    ON a.usuario_id = p.alumno_id
         JOIN usuarios u   ON u.id = p.alumno_id
        WHERE pd.docente_id = $1
        ORDER BY p.creado_en DESC, p.id DESC`,
      [req.usuario.id],
    );

    const observaciones = await observacionesPorProtocolo(
      pool,
      rows.map((r) => r.id),
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        estado: r.estado,
        creado_en: r.creado_en,
        alumno: {
          nombre: [r.nombre, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(" "),
          boleta: r.boleta,
          carrera: r.carrera,
        },
        directores: r.directores ?? [],
        observaciones: observaciones.get(r.id) ?? [],
      })),
    );
  }),
);

export default router;
