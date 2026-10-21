import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import multer from "multer";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ESTADOS_VIGENTES, protocoloVigenteDe, sqlIntegrantes } from "../lib/equipo.js";
import { ROLES_STAFF, tieneRol } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { registrarBitacora } from "../lib/usuarios.js";

const router = Router();
router.use(autenticar, exigeCambioResuelto);

const ROLES_CONSULTA = ["admin_sistema", ...ROLES_STAFF];
const ROLES_RESUELVEN = ["catt_ejecutivo", "catt_auxiliar"];
const ESTADOS_SOLICITUD = ["pendiente", "aprobada", "rechazada"];
const DECISIONES = ["aprobada", "rechazada"];
const MAX_MOTIVO = 2000;
const MAX_OBSERVACIONES = 2000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_CONSTANCIAS = path.join(__dirname, "..", "..", "uploads", "cambios-director");
fs.mkdirSync(DIR_CONSTANCIAS, { recursive: true });

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXT_PERMITIDA = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR_CONSTANCIAS,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT_PERMITIDA[file.mimetype]}`),
  }),
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (_req, file, cb) => {
    if (!EXT_PERMITIDA[file.mimetype]) {
      const err = new Error("Formato no permitido; solo PDF, JPG o PNG");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const texto = (v) => (typeof v === "string" ? v.trim() : "");

function entero(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function borrarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  fs.unlink(path.join(DIR_CONSTANCIAS, nombreArchivo), () => {});
}

const SELECT_SOLICITUD = `
  SELECT s.id, s.protocolo_id, s.estado, s.motivo, s.creado_en, s.resuelta_en,
         s.observaciones_resolucion, s.solicitante_id,
         p.titulo AS protocolo_titulo, p.estado AS protocolo_estado,
         a.boleta, a.carrera,
         concat_ws(' ', au.nombre, au.apellido_paterno, au.apellido_materno) AS alumno_nombre,
         s.director_saliente_id,
         concat_ws(' ', su.nombre, su.apellido_paterno, su.apellido_materno) AS saliente_nombre,
         s.director_propuesto_id,
         concat_ws(' ', pu.nombre, pu.apellido_paterno, pu.apellido_materno) AS propuesto_nombre,
         concat_ws(' ', ru.nombre, ru.apellido_paterno, ru.apellido_materno) AS resuelta_por_nombre,
         ${sqlIntegrantes("p")}
    FROM solicitudes_cambio_director s
    JOIN protocolos p ON p.id = s.protocolo_id
    JOIN alumnos a    ON a.usuario_id = p.alumno_id
    JOIN usuarios au  ON au.id = p.alumno_id
    JOIN usuarios su  ON su.id = s.director_saliente_id
    JOIN usuarios pu  ON pu.id = s.director_propuesto_id
    LEFT JOIN usuarios ru ON ru.id = s.resuelta_por
`;

function serializar(r) {
  return {
    id: r.id,
    estado: r.estado,
    motivo: r.motivo,
    creado_en: r.creado_en,
    resuelta_en: r.resuelta_en,
    resuelta_por: r.resuelta_por_nombre || null,
    observaciones_resolucion: r.observaciones_resolucion,
    protocolo: { id: r.protocolo_id, titulo: r.protocolo_titulo, estado: r.protocolo_estado },
    alumno: { id: r.solicitante_id, nombre: r.alumno_nombre, boleta: r.boleta, carrera: r.carrera },
    integrantes: r.integrantes ?? [],
    director_saliente: { id: r.director_saliente_id, nombre: r.saliente_nombre },
    director_propuesto: { id: r.director_propuesto_id, nombre: r.propuesto_nombre },
  };
}

async function obtenerSolicitud(id, client = pool) {
  const { rows } = await client.query(`${SELECT_SOLICITUD} WHERE s.id = $1`, [id]);
  return rows[0] ?? null;
}

async function validarDirectorPropuesto(client, protocoloId, propuestoId) {
  const { rows: docente } = await client.query(
    `SELECT 1 FROM docentes d JOIN usuarios u ON u.id = d.usuario_id
      WHERE d.usuario_id = $1 AND u.estado = 'activa'`,
    [propuestoId],
  );
  if (!docente[0]) return "El director propuesto debe ser un docente con cuenta activa";

  const { rows: yaDirige } = await client.query(
    "SELECT 1 FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = $2",
    [protocoloId, propuestoId],
  );
  if (yaDirige[0]) return "El director propuesto ya dirige este protocolo";

  const { rows: esSinodal } = await client.query(
    "SELECT 1 FROM protocolo_sinodales WHERE protocolo_id = $1 AND docente_id = $2",
    [protocoloId, propuestoId],
  );
  if (esSinodal[0]) return "El director propuesto es sinodal de este protocolo";

  return null;
}

router.post(
  "/",
  requiereRol("alumno"),
  upload.single("constancia"),
  ruta(async (req, res) => {
    const rechazar = (status, error) => {
      if (req.file) borrarArchivo(req.file.filename);
      return res.status(status).json({ error });
    };

    const salienteId = entero(req.body.director_saliente_id);
    const propuestoId = entero(req.body.director_propuesto_id);
    const motivo = texto(req.body.motivo);
    if (!salienteId) return rechazar(400, "Elige el director que se va a sustituir");
    if (!propuestoId) return rechazar(400, "Elige al director propuesto");
    if (salienteId === propuestoId) {
      return rechazar(400, "El director propuesto debe ser distinto del actual");
    }
    if (!motivo || motivo.length > MAX_MOTIVO) {
      return rechazar(400, `El motivo es obligatorio (máx. ${MAX_MOTIVO} caracteres)`);
    }
    if (!req.file) {
      return rechazar(400, "Adjunta la constancia firmada del acuerdo de cambio (PDF, JPG o PNG)");
    }

    let nuevoId;
    try {
      const resultado = await enTransaccion(async (client) => {
        const prot = await protocoloVigenteDe(client, req.usuario.id, { bloquear: true });
        if (!prot) return { status: 409, error: "No tienes un protocolo vigente para solicitar el cambio" };
        if (prot.alumno_id !== req.usuario.id) {
          return { status: 403, error: "Solo el responsable del equipo puede solicitar el cambio de director" };
        }
        const protocoloId = prot.id;

        const { rows: dirige } = await client.query(
          "SELECT 1 FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = $2",
          [protocoloId, salienteId],
        );
        if (!dirige[0]) return { status: 400, error: "Ese docente no es director de tu protocolo" };

        const { rows: pendiente } = await client.query(
          "SELECT 1 FROM solicitudes_cambio_director WHERE protocolo_id = $1 AND estado = 'pendiente'",
          [protocoloId],
        );
        if (pendiente[0]) {
          return { status: 409, error: "Ya tienes una solicitud de cambio de director pendiente" };
        }

        const invalido = await validarDirectorPropuesto(client, protocoloId, propuestoId);
        if (invalido) return { status: 400, error: invalido };

        const { rows } = await client.query(
          `INSERT INTO solicitudes_cambio_director
             (protocolo_id, solicitante_id, director_saliente_id, director_propuesto_id, motivo, constancia_archivo)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [protocoloId, req.usuario.id, salienteId, propuestoId, motivo, req.file.filename],
        );
        await registrarBitacora(client, req.usuario.id, "solicitar_cambio_director", "solicitudes_cambio_director", rows[0].id, {
          protocolo_id: protocoloId,
          director_saliente_id: salienteId,
          director_propuesto_id: propuestoId,
        });
        return { id: rows[0].id };
      });
      if (resultado.error) return rechazar(resultado.status, resultado.error);
      nuevoId = resultado.id;
    } catch (err) {
      borrarArchivo(req.file.filename);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Ya tienes una solicitud de cambio de director pendiente" });
      }
      throw err;
    }

    res.status(201).json(serializar(await obtenerSolicitud(nuevoId)));
  }),
);

router.get(
  "/mias",
  requiereRol("alumno"),
  ruta(async (req, res) => {
    const { rows } = await pool.query(
      `${SELECT_SOLICITUD}
        WHERE EXISTS (SELECT 1 FROM protocolo_integrantes mi WHERE mi.protocolo_id = s.protocolo_id AND mi.alumno_id = $1)
        ORDER BY s.creado_en DESC, s.id DESC`,
      [req.usuario.id],
    );
    res.json(rows.map(serializar));
  }),
);

router.get(
  "/",
  requiereRol(...ROLES_CONSULTA),
  ruta(async (req, res) => {
    const estado = texto(req.query.estado);
    const valores = [];
    let where = "";
    if (estado) {
      if (!ESTADOS_SOLICITUD.includes(estado)) {
        return res.status(400).json({ error: `estado inválido: usa ${ESTADOS_SOLICITUD.join(", ")}` });
      }
      valores.push(estado);
      where = "WHERE s.estado = $1";
    }
    const { rows } = await pool.query(
      `${SELECT_SOLICITUD} ${where}
        ORDER BY (s.estado <> 'pendiente'),
                 CASE WHEN s.estado = 'pendiente' THEN s.creado_en END ASC,
                 s.resuelta_en DESC NULLS LAST, s.id DESC`,
      valores,
    );
    res.json(rows.map(serializar));
  }),
);

router.get(
  "/:id/constancia",
  ruta(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const { rows } = await pool.query(
      `SELECT constancia_archivo,
              EXISTS (SELECT 1 FROM protocolo_integrantes mi
                       WHERE mi.protocolo_id = s.protocolo_id AND mi.alumno_id = $2) AS del_equipo
         FROM solicitudes_cambio_director s WHERE s.id = $1`,
      [id, req.usuario.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "No existe esa solicitud" });
    if (!rows[0].del_equipo && !tieneRol(req.usuario, ...ROLES_CONSULTA)) {
      return res.status(403).json({ error: "No tienes permiso para ver esta solicitud" });
    }
    const archivo = rows[0].constancia_archivo;
    res.download(path.join(DIR_CONSTANCIAS, archivo), `constancia-cambio-director-${id}${path.extname(archivo)}`);
  }),
);

router.patch(
  "/:id",
  requiereRol(...ROLES_RESUELVEN),
  ruta(async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const decision = texto(req.body?.decision);
    const observaciones = texto(req.body?.observaciones) || null;
    if (!DECISIONES.includes(decision)) {
      return res.status(400).json({ error: "decision debe ser aprobada o rechazada" });
    }
    if (decision === "rechazada" && !observaciones) {
      return res.status(400).json({ error: "Escribe el motivo del rechazo" });
    }
    if (observaciones && observaciones.length > MAX_OBSERVACIONES) {
      return res.status(400).json({ error: `Las observaciones no pueden pasar de ${MAX_OBSERVACIONES} caracteres` });
    }

    const resultado = await enTransaccion(async (client) => {
      const { rows: sol } = await client.query(
        `SELECT protocolo_id, estado, director_saliente_id, director_propuesto_id
           FROM solicitudes_cambio_director WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const s = sol[0];
      if (!s) return { status: 404, error: "No existe esa solicitud" };
      if (s.estado !== "pendiente") return { status: 409, error: "Esta solicitud ya fue resuelta" };
      if (req.usuario.id === s.director_saliente_id || req.usuario.id === s.director_propuesto_id) {
        return { status: 403, error: "No puedes resolver una solicitud en la que participas como director" };
      }

      if (decision === "aprobada") {
        const { rows: prot } = await client.query(
          "SELECT estado FROM protocolos WHERE id = $1 FOR UPDATE",
          [s.protocolo_id],
        );
        if (!ESTADOS_VIGENTES.includes(prot[0]?.estado)) {
          return { status: 409, error: "El protocolo ya no está vigente; no se puede aprobar el cambio" };
        }
        const { rows: dirige } = await client.query(
          "SELECT 1 FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = $2",
          [s.protocolo_id, s.director_saliente_id],
        );
        if (!dirige[0]) {
          return { status: 409, error: "El director a sustituir ya no dirige este protocolo" };
        }
        const invalido = await validarDirectorPropuesto(client, s.protocolo_id, s.director_propuesto_id);
        if (invalido) return { status: 409, error: invalido };

        await client.query(
          "DELETE FROM protocolo_directores WHERE protocolo_id = $1 AND docente_id = $2",
          [s.protocolo_id, s.director_saliente_id],
        );
        await client.query(
          "INSERT INTO protocolo_directores (protocolo_id, docente_id) VALUES ($1, $2)",
          [s.protocolo_id, s.director_propuesto_id],
        );
      }

      await client.query(
        `UPDATE solicitudes_cambio_director
            SET estado = $1, resuelta_por = $2, resuelta_en = now(), observaciones_resolucion = $3
          WHERE id = $4`,
        [decision, req.usuario.id, observaciones, id],
      );
      await registrarBitacora(
        client,
        req.usuario.id,
        decision === "aprobada" ? "aprobar_cambio_director" : "rechazar_cambio_director",
        "solicitudes_cambio_director",
        id,
        {
          protocolo_id: s.protocolo_id,
          director_saliente_id: s.director_saliente_id,
          director_propuesto_id: s.director_propuesto_id,
        },
      );
      return null;
    });
    if (resultado) return res.status(resultado.status).json({ error: resultado.error });

    res.json(serializar(await obtenerSolicitud(id)));
  }),
);

export default router;
