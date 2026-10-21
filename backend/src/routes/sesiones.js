import path from "node:path";

import { Router } from "express";

import { enTransaccion, pool } from "../db/index.js";
import { autenticar, exigeCambioResuelto, requiereRol } from "../lib/auth.js";
import { ROLES_GESTION, ROLES_STAFF } from "../lib/roles.js";
import { ruta } from "../lib/ruta.js";
import { crearSubida } from "../lib/subidas.js";
import { nombreCompletoDe, registrarBitacora } from "../lib/usuarios.js";

const router = Router();
router.use(autenticar, exigeCambioResuelto);

const ROLES_LECTURA = ["admin_sistema", ...ROLES_STAFF, "presidente_academia"];
const TIPOS = ["ordinaria", "extraordinaria"];
const ESTADOS_SESION = ["convocada", "realizada", "cancelada"];
const ESTADOS_ACUERDO = ["pendiente", "en_proceso", "cumplido", "cancelado"];
const ESTADOS_ABIERTOS = ["pendiente", "en_proceso"];
const MAX_LUGAR = 200;
const MAX_PRESIDIDA = 200;
const MAX_ORDEN = 5000;
const MAX_NOMBRE = 200;
const MAX_CARGO = 200;
const MAX_ACUERDO = 5000;
const MAX_RESPONSABLE = 200;
const MAX_OBSERVACIONES = 2000;
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

const minutas = crearSubida("sesiones");

const texto = (v) => (typeof v === "string" ? v.trim() : "");

function idPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function fechaHoraValida(valor) {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Día "AAAA-MM-DD" que exista en el calendario. new Date() no basta: convierte
// 2026-02-30 en 2 de marzo en lugar de rechazarlo.
function fechaDeDia(valor) {
  if (valor == null || valor === "") return { valor: null };
  const error = { error: "fecha_compromiso debe ser un día válido con el formato AAAA-MM-DD" };
  if (typeof valor !== "string" || !FECHA_VALIDA.test(valor)) return error;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  if (f.getUTCFullYear() !== anio || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia) return error;
  return { valor };
}

function diaISO(fecha) {
  if (!fecha) return null;
  const f = new Date(fecha);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

// Presidentes y expresidentes inmediatos de las academias activas, con cuenta
// activa. Cada persona aparece una sola vez: si tiene varios cargos (p. ej.
// expresidente de una academia y presidente de otra) van juntos en `cargo`.
async function integrantesAutomaticos(client = pool) {
  const { rows } = await client.query(
    `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, c.cargo
       FROM (SELECT ac.presidente_id AS usuario_id, 0 AS orden, ac.nombre AS academia,
                    'Presidente de Academia · ' || ac.nombre AS cargo
               FROM academias ac WHERE ac.activa AND ac.presidente_id IS NOT NULL
             UNION ALL
             SELECT ac.expresidente_id, 1, ac.nombre, 'Expresidente de Academia · ' || ac.nombre
               FROM academias ac WHERE ac.activa AND ac.expresidente_id IS NOT NULL) c
       JOIN usuarios u ON u.id = c.usuario_id AND u.estado = 'activa'
      ORDER BY c.academia, c.orden`,
  );
  const porUsuario = new Map();
  for (const r of rows) {
    const previo = porUsuario.get(r.id);
    if (previo) previo.cargo += ` y ${r.cargo}`;
    else porUsuario.set(r.id, { usuario_id: r.id, nombre: nombreCompletoDe(r), cargo: r.cargo });
  }
  return [...porUsuario.values()];
}

const SELECT_RESUMEN = `
  SELECT s.id, s.tipo, s.fecha_hora, s.lugar, s.estado,
         (s.minuta_archivo IS NOT NULL) AS tiene_minuta,
         COALESCE(a.total, 0) AS total_asistentes, COALESCE(a.asistieron, 0) AS asistieron,
         COALESCE(c.total, 0) AS total_acuerdos, COALESCE(c.abiertos, 0) AS acuerdos_abiertos
    FROM sesiones_catt s
    LEFT JOIN (SELECT sesion_id, count(*)::int AS total, (count(*) FILTER (WHERE asistio))::int AS asistieron
                 FROM sesion_asistentes GROUP BY sesion_id) a ON a.sesion_id = s.id
    LEFT JOIN (SELECT sesion_id, count(*)::int AS total,
                      (count(*) FILTER (WHERE estado = ANY($1)))::int AS abiertos
                 FROM acuerdos_catt GROUP BY sesion_id) c ON c.sesion_id = s.id
`;

function serializarResumen(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    fecha_hora: r.fecha_hora,
    lugar: r.lugar,
    estado: r.estado,
    tiene_minuta: r.tiene_minuta,
    total_asistentes: r.total_asistentes,
    asistieron: r.asistieron,
    total_acuerdos: r.total_acuerdos,
    acuerdos_abiertos: r.acuerdos_abiertos,
  };
}

function serializarAcuerdo(r) {
  return {
    id: r.id,
    numero: r.numero,
    descripcion: r.descripcion,
    responsable: r.responsable,
    fecha_compromiso: diaISO(r.fecha_compromiso),
    estado: r.estado,
    observaciones: r.observaciones,
    cumplido_en: r.cumplido_en,
    protocolo: r.protocolo_id ? { id: r.protocolo_id, titulo: r.protocolo_titulo } : null,
  };
}

async function obtenerDetalle(id, client = pool) {
  const { rows } = await client.query(
    `SELECT s.id, s.tipo, s.fecha_hora, s.lugar, s.estado, s.orden_del_dia, s.presidida_por,
            (s.minuta_archivo IS NOT NULL) AS tiene_minuta, s.creado_en, s.creada_por,
            u.nombre AS c_nombre, u.apellido_paterno AS c_ap, u.apellido_materno AS c_am
       FROM sesiones_catt s
       LEFT JOIN usuarios u ON u.id = s.creada_por
      WHERE s.id = $1`,
    [id],
  );
  const s = rows[0];
  if (!s) return null;

  const { rows: asistentes } = await client.query(
    `SELECT id, usuario_id, nombre, cargo, asistio
       FROM sesion_asistentes WHERE sesion_id = $1 ORDER BY (usuario_id IS NULL), cargo, nombre, id`,
    [id],
  );
  const { rows: acuerdos } = await client.query(
    `SELECT c.*, p.titulo AS protocolo_titulo
       FROM acuerdos_catt c
       LEFT JOIN protocolos p ON p.id = c.protocolo_id
      WHERE c.sesion_id = $1 ORDER BY c.numero`,
    [id],
  );

  return {
    id: s.id,
    tipo: s.tipo,
    fecha_hora: s.fecha_hora,
    lugar: s.lugar,
    estado: s.estado,
    orden_del_dia: s.orden_del_dia,
    presidida_por: s.presidida_por,
    tiene_minuta: s.tiene_minuta,
    creado_en: s.creado_en,
    creada_por: s.creada_por
      ? { id: s.creada_por, nombre: nombreCompletoDe({ nombre: s.c_nombre, apellido_paterno: s.c_ap, apellido_materno: s.c_am }) }
      : null,
    asistentes: asistentes.map((a) => ({
      id: a.id,
      usuario_id: a.usuario_id,
      nombre: a.nombre,
      cargo: a.cargo,
      asistio: a.asistio,
    })),
    acuerdos: acuerdos.map(serializarAcuerdo),
  };
}

// Bloquea la sesión hasta el commit y la devuelve (o null si no existe).
async function sesionAbierta(client, id) {
  const { rows } = await client.query(
    "SELECT estado, fecha_hora, minuta_archivo FROM sesiones_catt WHERE id = $1 FOR UPDATE",
    [id],
  );
  return rows[0] ?? null;
}

function rechazoDeSesion(sesion) {
  if (!sesion) return { status: 404, error: "No existe esa sesión" };
  if (sesion.estado === "cancelada") {
    return { status: 409, error: "La sesión está cancelada y ya no se puede modificar" };
  }
  return null;
}

router.get(
  "/",
  requiereRol(...ROLES_LECTURA),
  ruta(async (req, res) => {
    const estado = texto(req.query.estado);
    if (estado && !ESTADOS_SESION.includes(estado)) {
      return void res.status(400).json({ error: `estado inválido: usa ${ESTADOS_SESION.join(", ")}` });
    }
    const { rows } = await pool.query(
      `${SELECT_RESUMEN} ${estado ? "WHERE s.estado = $2" : ""} ORDER BY s.fecha_hora DESC, s.id DESC`,
      estado ? [ESTADOS_ABIERTOS, estado] : [ESTADOS_ABIERTOS],
    );
    res.json(rows.map(serializarResumen));
  }),
);

router.get(
  "/integrantes",
  requiereRol(...ROLES_LECTURA),
  ruta(async (_req, res) => {
    res.json(await integrantesAutomaticos());
  }),
);

router.get(
  "/acuerdos",
  requiereRol(...ROLES_LECTURA),
  ruta(async (req, res) => {
    const estado = texto(req.query.estado);
    if (estado && estado !== "abiertos" && !ESTADOS_ACUERDO.includes(estado)) {
      return void res
        .status(400)
        .json({ error: `estado inválido: usa abiertos, ${ESTADOS_ACUERDO.join(", ")}` });
    }
    const filtro = estado === "abiertos" ? ESTADOS_ABIERTOS : estado ? [estado] : ESTADOS_ACUERDO;
    const { rows } = await pool.query(
      `SELECT c.*, p.titulo AS protocolo_titulo,
              s.fecha_hora AS sesion_fecha_hora, s.tipo AS sesion_tipo
         FROM acuerdos_catt c
         JOIN sesiones_catt s ON s.id = c.sesion_id
         LEFT JOIN protocolos p ON p.id = c.protocolo_id
        WHERE c.estado = ANY($1) AND s.estado <> 'cancelada'
        ORDER BY s.fecha_hora DESC, c.numero`,
      [filtro],
    );
    res.json(
      rows.map((r) => ({
        ...serializarAcuerdo(r),
        sesion: { id: r.sesion_id, tipo: r.sesion_tipo, fecha_hora: r.sesion_fecha_hora },
      })),
    );
  }),
);

router.post(
  "/",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const tipo = texto(req.body?.tipo) || "ordinaria";
    const fecha = fechaHoraValida(req.body?.fecha_hora);
    const lugar = texto(req.body?.lugar);
    const orden = texto(req.body?.orden_del_dia);
    if (!TIPOS.includes(tipo)) return void res.status(400).json({ error: `tipo inválido: usa ${TIPOS.join(", ")}` });
    if (!fecha) return void res.status(400).json({ error: "fecha_hora es obligatoria y debe ser una fecha válida" });
    if (lugar.length > MAX_LUGAR) return void res.status(400).json({ error: `El lugar admite máx. ${MAX_LUGAR} caracteres` });
    if (orden.length > MAX_ORDEN) return void res.status(400).json({ error: `El orden del día admite máx. ${MAX_ORDEN} caracteres` });

    const id = await enTransaccion(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sesiones_catt (tipo, fecha_hora, lugar, orden_del_dia, creada_por)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tipo, fecha, lugar || null, orden || null, req.usuario.id],
      );
      const sesionId = rows[0].id;

      const automaticos = await integrantesAutomaticos(client);
      const { rows: fijos } = await client.query(
        `SELECT nombre, cargo FROM sesion_asistentes
          WHERE usuario_id IS NULL
            AND sesion_id = (SELECT id FROM sesiones_catt
                              WHERE estado <> 'cancelada' AND id <> $1
                              ORDER BY fecha_hora DESC, id DESC LIMIT 1)
          ORDER BY id`,
        [sesionId],
      );
      const roster = [...fijos.map((f) => ({ usuario_id: null, ...f })), ...automaticos];
      await client.query(
        `INSERT INTO sesion_asistentes (sesion_id, usuario_id, nombre, cargo)
         SELECT $1, u, n, c FROM unnest($2::int[], $3::text[], $4::text[]) WITH ORDINALITY AS r(u, n, c, o)
         ORDER BY o`,
        [sesionId, roster.map((a) => a.usuario_id), roster.map((a) => a.nombre), roster.map((a) => a.cargo)],
      );

      await registrarBitacora(client, req.usuario.id, "crear_sesion", "sesiones_catt", sesionId, {
        tipo,
        fecha_hora: fecha.toISOString(),
        integrantes: roster.length,
      });
      return sesionId;
    });

    res.status(201).json(await obtenerDetalle(id));
  }),
);

router.get(
  "/:id",
  requiereRol(...ROLES_LECTURA),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const detalle = await obtenerDetalle(id);
    if (!detalle) return void res.status(404).json({ error: "No existe esa sesión" });
    res.json(detalle);
  }),
);

router.patch(
  "/:id",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const cuerpo = req.body ?? {};

    const cambios = {};
    if (cuerpo.tipo !== undefined) {
      const tipo = texto(cuerpo.tipo);
      if (!TIPOS.includes(tipo)) return void res.status(400).json({ error: `tipo inválido: usa ${TIPOS.join(", ")}` });
      cambios.tipo = tipo;
    }
    if (cuerpo.fecha_hora !== undefined) {
      const fecha = fechaHoraValida(cuerpo.fecha_hora);
      if (!fecha) return void res.status(400).json({ error: "fecha_hora debe ser una fecha válida" });
      cambios.fecha_hora = fecha;
    }
    for (const [campo, max] of [
      ["lugar", MAX_LUGAR],
      ["presidida_por", MAX_PRESIDIDA],
      ["orden_del_dia", MAX_ORDEN],
    ]) {
      if (cuerpo[campo] === undefined) continue;
      const valor = cuerpo[campo] === null ? "" : texto(cuerpo[campo]);
      if (valor.length > max) return void res.status(400).json({ error: `${campo} admite máx. ${max} caracteres` });
      cambios[campo] = valor || null;
    }
    let nuevoEstado = null;
    if (cuerpo.estado !== undefined) {
      nuevoEstado = texto(cuerpo.estado);
      if (!["realizada", "cancelada"].includes(nuevoEstado)) {
        return void res.status(400).json({ error: "estado solo puede cambiar a realizada o cancelada" });
      }
    }
    if (Object.keys(cambios).length === 0 && !nuevoEstado) {
      return void res.status(400).json({ error: "No hay nada que cambiar" });
    }

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      const rechazo = rechazoDeSesion(sesion);
      if (rechazo) return rechazo;
      if (sesion.estado === "realizada" && (cambios.tipo || cambios.fecha_hora)) {
        return { status: 409, error: "Una sesión realizada ya no puede cambiar de tipo ni de fecha" };
      }
      if (nuevoEstado && sesion.estado === "realizada") {
        return { status: 409, error: "Una sesión realizada ya no puede cambiar de estado" };
      }
      if (nuevoEstado === "realizada") {
        const { rows: presentes } = await client.query(
          "SELECT count(*)::int AS n FROM sesion_asistentes WHERE sesion_id = $1 AND asistio",
          [id],
        );
        if (presentes[0].n === 0) {
          return { status: 409, error: "Registra la asistencia antes de marcar la sesión como realizada" };
        }
      }

      const asignaciones = Object.entries(cambios);
      if (nuevoEstado) asignaciones.push(["estado", nuevoEstado]);
      const sets = asignaciones.map(([c], i) => `${c} = $${i + 1}`).join(", ");
      await client.query(
        `UPDATE sesiones_catt SET ${sets}, actualizado_en = now() WHERE id = $${asignaciones.length + 1}`,
        [...asignaciones.map(([, v]) => v), id],
      );
      await registrarBitacora(
        client,
        req.usuario.id,
        nuevoEstado ? `${nuevoEstado === "realizada" ? "cerrar" : "cancelar"}_sesion` : "editar_sesion",
        "sesiones_catt",
        id,
        Object.fromEntries(asignaciones.map(([c, v]) => [c, v instanceof Date ? v.toISOString() : v])),
      );
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.json(await obtenerDetalle(id));
  }),
);

router.put(
  "/:id/asistencia",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const lista = req.body?.asistieron;
    if (!Array.isArray(lista) || lista.some((x) => !idPositivo(x))) {
      return void res.status(400).json({ error: "asistieron debe ser un arreglo de ids de asistente" });
    }
    const ids = [...new Set(lista.map(Number))];

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      const rechazo = rechazoDeSesion(sesion);
      if (rechazo) return rechazo;
      const { rows: validos } = await client.query(
        "SELECT id FROM sesion_asistentes WHERE sesion_id = $1 AND id = ANY($2)",
        [id, ids],
      );
      if (validos.length !== ids.length) {
        return { status: 400, error: "Alguno de los asistentes no pertenece a esta sesión" };
      }
      if (sesion.estado === "realizada" && ids.length === 0) {
        return { status: 409, error: "Una sesión realizada debe conservar al menos un asistente presente" };
      }
      await client.query("UPDATE sesion_asistentes SET asistio = (id = ANY($2)) WHERE sesion_id = $1", [id, ids]);
      await registrarBitacora(client, req.usuario.id, "registrar_asistencia", "sesiones_catt", id, {
        asistieron: ids.length,
      });
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.json(await obtenerDetalle(id));
  }),
);

router.post(
  "/:id/asistentes",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const nombre = texto(req.body?.nombre);
    const cargo = texto(req.body?.cargo);
    if (!nombre || nombre.length > MAX_NOMBRE) {
      return void res.status(400).json({ error: `El nombre es obligatorio (máx. ${MAX_NOMBRE} caracteres)` });
    }
    if (!cargo || cargo.length > MAX_CARGO) {
      return void res.status(400).json({ error: `El cargo es obligatorio (máx. ${MAX_CARGO} caracteres)` });
    }

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      const rechazo = rechazoDeSesion(sesion);
      if (rechazo) return rechazo;
      const { rows } = await client.query(
        "INSERT INTO sesion_asistentes (sesion_id, nombre, cargo) VALUES ($1, $2, $3) RETURNING id",
        [id, nombre, cargo],
      );
      await registrarBitacora(client, req.usuario.id, "agregar_asistente", "sesiones_catt", id, {
        asistente: rows[0].id,
        nombre,
        cargo,
      });
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.status(201).json(await obtenerDetalle(id));
  }),
);

router.delete(
  "/:id/asistentes/:asistenteId",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    const asistenteId = idPositivo(req.params.asistenteId);
    if (!id || !asistenteId) return void res.status(400).json({ error: "Los ids deben ser números enteros positivos" });

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      if (!sesion) return { status: 404, error: "No existe esa sesión" };
      if (sesion.estado !== "convocada") {
        return { status: 409, error: "Solo se puede quitar a un integrante mientras la sesión está convocada" };
      }
      const { rows } = await client.query(
        "DELETE FROM sesion_asistentes WHERE id = $1 AND sesion_id = $2 RETURNING nombre, cargo",
        [asistenteId, id],
      );
      if (!rows[0]) return { status: 404, error: "No existe ese asistente en la sesión" };
      await registrarBitacora(client, req.usuario.id, "quitar_asistente", "sesiones_catt", id, rows[0]);
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.json(await obtenerDetalle(id));
  }),
);

async function validarAcuerdo(cuerpo, parcial) {
  const datos = {};
  if (!parcial || cuerpo.descripcion !== undefined) {
    const descripcion = texto(cuerpo.descripcion);
    if (!descripcion || descripcion.length > MAX_ACUERDO) {
      return { error: `La descripción es obligatoria (máx. ${MAX_ACUERDO} caracteres)` };
    }
    datos.descripcion = descripcion;
  }
  if (cuerpo.responsable !== undefined) {
    const responsable = cuerpo.responsable === null ? "" : texto(cuerpo.responsable);
    if (responsable.length > MAX_RESPONSABLE) return { error: `El responsable admite máx. ${MAX_RESPONSABLE} caracteres` };
    datos.responsable = responsable || null;
  }
  if (cuerpo.fecha_compromiso !== undefined) {
    const { valor, error } = fechaDeDia(cuerpo.fecha_compromiso);
    if (error) return { error };
    datos.fecha_compromiso = valor;
  }
  if (cuerpo.observaciones !== undefined) {
    const obs = cuerpo.observaciones === null ? "" : texto(cuerpo.observaciones);
    if (obs.length > MAX_OBSERVACIONES) return { error: `Las observaciones admiten máx. ${MAX_OBSERVACIONES} caracteres` };
    datos.observaciones = obs || null;
  }
  if (cuerpo.estado !== undefined) {
    const estado = texto(cuerpo.estado);
    if (!ESTADOS_ACUERDO.includes(estado)) return { error: `estado inválido: usa ${ESTADOS_ACUERDO.join(", ")}` };
    datos.estado = estado;
  }
  if (cuerpo.protocolo_id !== undefined) {
    if (cuerpo.protocolo_id === null) datos.protocolo_id = null;
    else {
      const protocoloId = idPositivo(cuerpo.protocolo_id);
      if (!protocoloId) return { error: "protocolo_id debe ser un número entero positivo o null" };
      const { rows } = await pool.query("SELECT 1 FROM protocolos WHERE id = $1", [protocoloId]);
      if (!rows[0]) return { error: "No existe ese protocolo" };
      datos.protocolo_id = protocoloId;
    }
  }
  return { datos };
}

router.post(
  "/:id/acuerdos",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const { datos, error } = await validarAcuerdo(req.body ?? {}, false);
    if (error) return void res.status(400).json({ error });
    if (datos.estado === "cumplido") return void res.status(400).json({ error: "Un acuerdo nuevo no puede nacer cumplido" });

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      const rechazo = rechazoDeSesion(sesion);
      if (rechazo) return rechazo;
      // Se capturan durante la sesión o después, nunca antes de que empiece.
      if (sesion.estado === "convocada" && new Date(sesion.fecha_hora) > new Date()) {
        return { status: 409, error: "Los acuerdos se registran a partir de la fecha y hora de la sesión" };
      }
      const { rows: num } = await client.query(
        "SELECT COALESCE(max(numero), 0) + 1 AS n FROM acuerdos_catt WHERE sesion_id = $1",
        [id],
      );
      const campos = ["sesion_id", "numero", ...Object.keys(datos)];
      const valores = [id, num[0].n, ...Object.values(datos)];
      const { rows } = await client.query(
        `INSERT INTO acuerdos_catt (${campos.join(", ")})
         VALUES (${campos.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id, numero`,
        valores,
      );
      await registrarBitacora(client, req.usuario.id, "crear_acuerdo", "sesiones_catt", id, {
        acuerdo: rows[0].id,
        numero: rows[0].numero,
      });
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.status(201).json(await obtenerDetalle(id));
  }),
);

router.patch(
  "/:id/acuerdos/:acuerdoId",
  requiereRol(...ROLES_GESTION),
  ruta(async (req, res) => {
    const id = idPositivo(req.params.id);
    const acuerdoId = idPositivo(req.params.acuerdoId);
    if (!id || !acuerdoId) return void res.status(400).json({ error: "Los ids deben ser números enteros positivos" });
    const { datos, error } = await validarAcuerdo(req.body ?? {}, true);
    if (error) return void res.status(400).json({ error });
    if (Object.keys(datos).length === 0) return void res.status(400).json({ error: "No hay nada que cambiar" });

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      const rechazo = rechazoDeSesion(sesion);
      if (rechazo) return rechazo;
      const { rows: previos } = await client.query(
        "SELECT estado FROM acuerdos_catt WHERE id = $1 AND sesion_id = $2 FOR UPDATE",
        [acuerdoId, id],
      );
      if (!previos[0]) return { status: 404, error: "No existe ese acuerdo en la sesión" };

      const asignaciones = Object.entries(datos);
      if (datos.estado === "cumplido" && previos[0].estado !== "cumplido") asignaciones.push(["cumplido_en", new Date()]);
      else if (datos.estado && datos.estado !== "cumplido") asignaciones.push(["cumplido_en", null]);
      const sets = asignaciones.map(([c], i) => `${c} = $${i + 1}`).join(", ");
      await client.query(
        `UPDATE acuerdos_catt SET ${sets}, actualizado_en = now()
          WHERE id = $${asignaciones.length + 1} AND sesion_id = $${asignaciones.length + 2}`,
        [...asignaciones.map(([, v]) => v), acuerdoId, id],
      );
      await registrarBitacora(client, req.usuario.id, "actualizar_acuerdo", "sesiones_catt", id, {
        acuerdo: acuerdoId,
        ...datos,
      });
      return { ok: true };
    });

    if (!resultado.ok) return void res.status(resultado.status).json({ error: resultado.error });
    res.json(await obtenerDetalle(id));
  }),
);

router.post(
  "/:id/minuta",
  requiereRol(...ROLES_GESTION),
  minutas.upload.single("minuta"),
  ruta(async (req, res) => {
    const archivo = req.file;
    const rechazar = (status, error) => {
      minutas.borrar(archivo?.filename);
      return res.status(status).json({ error });
    };
    const id = idPositivo(req.params.id);
    if (!id) return rechazar(400, "El id debe ser un número entero positivo");
    if (!archivo) return rechazar(400, "Adjunta la minuta firmada (PDF, JPG o PNG)");

    const resultado = await enTransaccion(async (client) => {
      const sesion = await sesionAbierta(client, id);
      if (!sesion) return { status: 404, error: "No existe esa sesión" };
      if (sesion.estado !== "realizada") {
        return { status: 409, error: "La minuta solo se sube cuando la sesión ya fue realizada" };
      }
      await client.query("UPDATE sesiones_catt SET minuta_archivo = $1, actualizado_en = now() WHERE id = $2", [
        archivo.filename,
        id,
      ]);
      await registrarBitacora(client, req.usuario.id, "subir_minuta", "sesiones_catt", id, null);
      return { ok: true, previa: sesion.minuta_archivo };
    });

    if (!resultado.ok) return rechazar(resultado.status, resultado.error);
    minutas.borrar(resultado.previa);
    res.status(201).json(await obtenerDetalle(id));
  }),
);

router.get(
  "/:id/minuta",
  requiereRol(...ROLES_LECTURA),
  ruta(async (req, res, next) => {
    const id = idPositivo(req.params.id);
    if (!id) return void res.status(400).json({ error: "El id debe ser un número entero positivo" });
    const { rows } = await pool.query("SELECT minuta_archivo FROM sesiones_catt WHERE id = $1", [id]);
    if (!rows[0]) return void res.status(404).json({ error: "No existe esa sesión" });
    if (!rows[0].minuta_archivo) return void res.status(404).json({ error: "Esa sesión no tiene minuta" });
    res.download(
      minutas.rutaDe(rows[0].minuta_archivo),
      `minuta-sesion-${id}${path.extname(rows[0].minuta_archivo)}`,
      (err) => {
        // Sin el callback, el error (p. ej. el archivo ya no está en disco)
        // llega al manejador global con la ruta absoluta en el mensaje.
        if (!err) return;
        if (res.headersSent) return void res.end();
        if (err.code === "ENOENT") return void res.status(404).json({ error: "El archivo de la minuta ya no está disponible" });
        next(err);
      },
    );
  }),
);

export default router;
