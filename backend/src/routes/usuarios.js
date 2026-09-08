import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

const TIPOS_VALIDOS = ["alumno", "sinodal", "personal"];

// Campos que solo aplican a cierto tipo de usuario. Para los demás tipos
// se guardan como NULL (ver esquema en ../db/index.js).
const CAMPOS_POR_TIPO = {
  alumno: ["boleta", "carrera", "protocolo_tt"],
  sinodal: ["numero_empleado", "especialidad"],
  personal: ["numero_empleado", "cargo"],
};

// Todas las columnas específicas de tipo, en conjunto.
const CAMPOS_ESPECIFICOS = [
  "boleta",
  "carrera",
  "protocolo_tt",
  "numero_empleado",
  "especialidad",
  "cargo",
];

// Columnas que se pueden tocar desde PUT /usuarios/:id.
const CAMPOS_EDITABLES = ["nombre", "correo", "tipo", ...CAMPOS_ESPECIFICOS, "activo"];

// Convierte la fila de SQLite (activo llega como 1/0) al formato que consume el front.
function serializar(fila) {
  if (!fila) return fila;
  return { ...fila, activo: fila.activo === 1 };
}

function buscarPorId(id) {
  return db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
}

// Devuelve el id como entero positivo, o null si el parámetro no es válido.
function idDeParams(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/usuarios -> arreglo con todos los usuarios.
router.get("/", (_req, res) => {
  const filas = db.prepare("SELECT * FROM usuarios ORDER BY id").all();
  res.json(filas.map(serializar));
});

// GET /api/usuarios/:id -> el usuario, o 404 si no existe.
router.get("/:id", (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  res.json(serializar(usuario));
});

// POST /api/usuarios -> crea un usuario. 201 con el creado, o 400/409 según el error.
router.post("/", (req, res) => {
  const cuerpo = req.body ?? {};
  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim() : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo.trim() : "";

  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!correo) faltantes.push("correo");
  if (!tipo) faltantes.push("tipo");
  if (faltantes.length > 0) {
    return res
      .status(400)
      .json({ error: `Faltan campos obligatorios: ${faltantes.join(", ")}` });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      error: `tipo inválido: "${tipo}". Debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`,
    });
  }

  // Solo se guardan los campos específicos que aplican al tipo; el resto queda NULL.
  const especificos = {
    boleta: null,
    carrera: null,
    protocolo_tt: null,
    numero_empleado: null,
    especialidad: null,
    cargo: null,
  };
  for (const campo of CAMPOS_POR_TIPO[tipo]) {
    const valor = cuerpo[campo];
    especificos[campo] = valor === undefined || valor === "" ? null : valor;
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO usuarios
           (nombre, correo, tipo, boleta, carrera, protocolo_tt, numero_empleado, especialidad, cargo)
         VALUES
           (@nombre, @correo, @tipo, @boleta, @carrera, @protocolo_tt, @numero_empleado, @especialidad, @cargo)`,
      )
      .run({ nombre, correo, tipo, ...especificos });

    res.status(201).json(serializar(buscarPorId(info.lastInsertRowid)));
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: `Ya existe un usuario con el correo ${correo}` });
    }
    if (err.code === "SQLITE_CONSTRAINT_CHECK") {
      return res.status(400).json({ error: `tipo inválido: "${tipo}"` });
    }
    throw err;
  }
});

// PUT /api/usuarios/:id -> modifica los campos enviados. 200 con el actualizado, o 404.
router.put("/:id", (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  const cuerpo = req.body ?? {};
  const cambios = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (Object.prototype.hasOwnProperty.call(cuerpo, campo)) {
      cambios[campo] = cuerpo[campo];
    }
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({
      error: `No se envió ningún campo modificable. Campos válidos: ${CAMPOS_EDITABLES.join(", ")}`,
    });
  }

  if ("nombre" in cambios) {
    if (typeof cambios.nombre !== "string" || cambios.nombre.trim() === "") {
      return res.status(400).json({ error: "nombre no puede quedar vacío" });
    }
    cambios.nombre = cambios.nombre.trim();
  }

  if ("correo" in cambios) {
    if (typeof cambios.correo !== "string" || cambios.correo.trim() === "") {
      return res.status(400).json({ error: "correo no puede quedar vacío" });
    }
    cambios.correo = cambios.correo.trim();
  }

  if ("tipo" in cambios) {
    if (!TIPOS_VALIDOS.includes(cambios.tipo)) {
      return res.status(400).json({
        error: `tipo inválido: "${cambios.tipo}". Debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`,
      });
    }

    // Si cambia el tipo, los campos específicos del tipo anterior ya no
    // aplican: se limpian a NULL salvo que el propio request ya haya
    // mandado un valor nuevo para ese campo (entonces se respeta ese valor).
    const camposDelNuevoTipo = CAMPOS_POR_TIPO[cambios.tipo];
    for (const campo of CAMPOS_ESPECIFICOS) {
      if (!camposDelNuevoTipo.includes(campo) && !(campo in cambios)) {
        cambios[campo] = null;
      }
    }
  }

  if ("activo" in cambios) {
    cambios.activo = cambios.activo ? 1 : 0;
  }

  const asignaciones = Object.keys(cambios)
    .map((campo) => `${campo} = @${campo}`)
    .join(", ");

  try {
    db.prepare(`UPDATE usuarios SET ${asignaciones} WHERE id = @id`).run({ ...cambios, id });
    res.json(serializar(buscarPorId(id)));
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: `Ya existe un usuario con el correo ${cambios.correo}` });
    }
    if (err.code === "SQLITE_CONSTRAINT_CHECK") {
      return res.status(400).json({ error: `tipo inválido: "${cambios.tipo}"` });
    }
    throw err;
  }
});

// PATCH /api/usuarios/:id/revocar -> deja el usuario con activo:false. 200, o 404.
router.patch("/:id/revocar", (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  db.prepare("UPDATE usuarios SET activo = 0 WHERE id = ?").run(id);
  res.json(serializar(buscarPorId(id)));
});

// DELETE /api/usuarios/:id -> borra el registro de verdad. 200 de confirmación, o 404.
router.delete("/:id", (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
  res.json({ eliminado: true, id });
});

export default router;
