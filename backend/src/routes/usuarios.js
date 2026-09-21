import { Router } from "express";
import { pool, queryNamed } from "../db/index.js";
import { TIPOS_VALIDOS, CAMPOS_POR_TIPO } from "../lib/tipos-usuario.js";

const router = Router();

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
const CAMPOS_EDITABLES = [
  "nombre",
  "apellido_paterno",
  "apellido_materno",
  "correo",
  "telefono",
  "tipo",
  ...CAMPOS_ESPECIFICOS,
  "activo",
];

// Campos de nombre obligatorios y no vacíos (comparten la misma validación).
const CAMPOS_NOMBRE = ["nombre", "apellido_paterno", "apellido_materno"];

// Códigos de error de Postgres que reemplazan a los de SQLite:
//   23505 = unique_violation  (antes err.code === "SQLITE_CONSTRAINT_UNIQUE")
//   23514 = check_violation   (antes err.code === "SQLITE_CONSTRAINT_CHECK")
const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";

async function buscarPorId(id) {
  const { rows } = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// Devuelve el id como entero positivo, o null si el parámetro no es válido.
function idDeParams(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/usuarios -> arreglo con todos los usuarios.
router.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM usuarios ORDER BY id");
  res.json(rows);
});

// GET /api/usuarios/:id -> el usuario, o 404 si no existe.
router.get("/:id", async (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = await buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  res.json(usuario);
});

// POST /api/usuarios -> crea un usuario. 201 con el creado, o 400/409 según el error.
router.post("/", async (req, res) => {
  const cuerpo = req.body ?? {};
  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const apellidoPaterno =
    typeof cuerpo.apellido_paterno === "string" ? cuerpo.apellido_paterno.trim() : "";
  const apellidoMaterno =
    typeof cuerpo.apellido_materno === "string" ? cuerpo.apellido_materno.trim() : "";
  const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim() : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo.trim() : "";
  // Teléfono opcional (aplica a los 3 tipos): si viene vacío o no viene, null.
  const telefonoRaw = typeof cuerpo.telefono === "string" ? cuerpo.telefono.trim() : "";
  const telefono = telefonoRaw === "" ? null : telefonoRaw;

  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!apellidoPaterno) faltantes.push("apellido_paterno");
  if (!apellidoMaterno) faltantes.push("apellido_materno");
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
    const { rows } = await queryNamed(
      `INSERT INTO usuarios
         (nombre, apellido_paterno, apellido_materno, correo, telefono, tipo,
          boleta, carrera, protocolo_tt, numero_empleado, especialidad, cargo)
       VALUES
         (@nombre, @apellidoPaterno, @apellidoMaterno, @correo, @telefono, @tipo,
          @boleta, @carrera, @protocolo_tt, @numero_empleado, @especialidad, @cargo)
       RETURNING *`,
      { nombre, apellidoPaterno, apellidoMaterno, correo, telefono, tipo, ...especificos },
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return res
        .status(409)
        .json({ error: `Ya existe un usuario con el correo ${correo}` });
    }
    if (err.code === PG_CHECK_VIOLATION) {
      return res.status(400).json({ error: `tipo inválido: "${tipo}"` });
    }
    throw err;
  }
});

// PUT /api/usuarios/:id -> modifica los campos enviados. 200 con el actualizado, o 404.
router.put("/:id", async (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = await buscarPorId(id);
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

  for (const campo of CAMPOS_NOMBRE) {
    if (!(campo in cambios)) continue;
    if (typeof cambios[campo] !== "string" || cambios[campo].trim() === "") {
      return res.status(400).json({ error: `${campo} no puede quedar vacío` });
    }
    cambios[campo] = cambios[campo].trim();
  }

  if ("correo" in cambios) {
    if (typeof cambios.correo !== "string" || cambios.correo.trim() === "") {
      return res.status(400).json({ error: "correo no puede quedar vacío" });
    }
    cambios.correo = cambios.correo.trim();
  }

  // Teléfono es opcional: si llega vacío se guarda como null.
  if ("telefono" in cambios) {
    cambios.telefono =
      typeof cambios.telefono === "string" && cambios.telefono.trim() !== ""
        ? cambios.telefono.trim()
        : null;
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
    cambios.activo = Boolean(cambios.activo);
  }

  const asignaciones = Object.keys(cambios)
    .map((campo) => `${campo} = @${campo}`)
    .join(", ");

  try {
    await queryNamed(`UPDATE usuarios SET ${asignaciones} WHERE id = @id`, { ...cambios, id });
    res.json(await buscarPorId(id));
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return res
        .status(409)
        .json({ error: `Ya existe un usuario con el correo ${cambios.correo}` });
    }
    if (err.code === PG_CHECK_VIOLATION) {
      return res.status(400).json({ error: `tipo inválido: "${cambios.tipo}"` });
    }
    throw err;
  }
});

// PATCH /api/usuarios/:id/revocar -> deja el usuario con activo:false. 200, o 404.
router.patch("/:id/revocar", async (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = await buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  await pool.query("UPDATE usuarios SET activo = FALSE WHERE id = $1", [id]);
  res.json(await buscarPorId(id));
});

// DELETE /api/usuarios/:id -> borra el registro de verdad. 200 de confirmación, o 404.
router.delete("/:id", async (req, res) => {
  const id = idDeParams(req);
  if (!id) {
    return res.status(400).json({ error: "El id debe ser un número entero positivo" });
  }

  const usuario = await buscarPorId(id);
  if (!usuario) {
    return res.status(404).json({ error: `No existe un usuario con id ${id}` });
  }

  await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
  res.json({ eliminado: true, id });
});

export default router;
