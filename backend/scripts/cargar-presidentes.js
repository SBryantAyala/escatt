// Carga a los presidentes de academia desde un archivo local y los asigna
// como presidentes en el sistema.
//
// Los datos (nombres y correos reales) NO se suben a git: viven en
// scripts/presidentes.local.json, que está en .gitignore. Formato:
//
//   [
//     {
//       "academia": "Academia de Ciencias Básicas",
//       "nombre": "Nombre(s)",
//       "apellido_paterno": "Apellido",
//       "apellido_materno": "Apellido",
//       "correo": "usuario@ipn.mx",
//       "extension": "52027"
//     }
//   ]
//
// Uso (desde la carpeta backend/):
//   node scripts/cargar-presidentes.js [ruta/al/archivo.json]
//
// Por cada fila:
//   - Si no hay correo, la salta (el correo es obligatorio en usuarios).
//   - Si el correo no existe, crea la cuenta como docente de esa academia,
//     sin contraseña y con número de empleado "PENDIENTE-<id>". Se le asigna
//     contraseña con asignar-credenciales.js o "Restablecer contraseña".
//   - Si ya existe, la usa tal cual; si es docente de OTRA academia, la salta
//     (un presidente debe pertenecer a su academia).
//   - Lo deja como presidente: quita el rol al anterior, actualiza
//     academias.presidente_id y asigna el rol, igual que
//     PUT /api/academias/:id/presidente. Queda en la bitácora.
//
// Es idempotente: correrlo dos veces deja el mismo resultado.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { enTransaccion, pool } from "../src/db/index.js";
import { asignarRol, quitarRol, registrarBitacora } from "../src/lib/usuarios.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const archivo = process.argv[2] ?? path.join(__dirname, "presidentes.local.json");

if (!fs.existsSync(archivo)) {
  console.error(`Error: no existe ${archivo}. Ver el formato al inicio de este script.`);
  process.exit(1);
}

const filas = JSON.parse(fs.readFileSync(archivo, "utf8"));
const texto = (v) => (typeof v === "string" ? v.trim() : "");

const resumen = { asignados: [], saltados: [] };

for (const f of filas) {
  const academia = texto(f.academia);
  const correo = texto(f.correo).toLowerCase();
  const nombreCompleto = [f.nombre, f.apellido_paterno, f.apellido_materno].map(texto).filter(Boolean).join(" ");

  if (!correo) {
    resumen.saltados.push(`${academia}: ${nombreCompleto} (falta su correo)`);
    continue;
  }

  const resultado = await enTransaccion(async (client) => {
    const { rows: ac } = await client.query("SELECT id, presidente_id FROM academias WHERE nombre = $1", [academia]);
    if (!ac[0]) return `${academia}: no existe esa academia en el catálogo`;
    const academiaId = ac[0].id;

    let { rows: us } = await client.query(
      `SELECT u.id, d.academia_id, (d.usuario_id IS NOT NULL) AS es_docente
         FROM usuarios u LEFT JOIN docentes d ON d.usuario_id = u.id
        WHERE lower(u.correo) = $1`,
      [correo],
    );
    let usuarioId = us[0]?.id;

    if (us[0]?.es_docente && us[0].academia_id !== academiaId) {
      return `${academia}: ${correo} ya es docente de otra academia; cámbialo de academia desde su ficha`;
    }

    if (!usuarioId) {
      const { rows } = await client.query(
        `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [texto(f.nombre), texto(f.apellido_paterno), texto(f.apellido_materno), correo],
      );
      usuarioId = rows[0].id;
      await registrarBitacora(client, null, "alta_docente", "usuarios", usuarioId, { origen: "cargar-presidentes" });
    }

    if (!us[0]?.es_docente) {
      await client.query(
        `INSERT INTO empleados (usuario_id, numero_empleado) VALUES ($1, $2)
         ON CONFLICT (usuario_id) DO NOTHING`,
        [usuarioId, `PENDIENTE-${usuarioId}`],
      );
      await client.query(
        "INSERT INTO docentes (usuario_id, academia_id, extension) VALUES ($1, $2, $3)",
        [usuarioId, academiaId, texto(f.extension) || null],
      );
      await asignarRol(client, usuarioId, "docente");
    }

    const anterior = ac[0].presidente_id;
    if (anterior !== usuarioId) {
      if (anterior) await quitarRol(client, anterior, "presidente_academia");
      await client.query("UPDATE academias SET presidente_id = $1 WHERE id = $2", [usuarioId, academiaId]);
      await registrarBitacora(client, null, "cambiar_presidente", "academias", academiaId, {
        anterior,
        nuevo: usuarioId,
        origen: "cargar-presidentes",
      });
    }
    await asignarRol(client, usuarioId, "presidente_academia");
    return null;
  });

  if (resultado) resumen.saltados.push(resultado);
  else resumen.asignados.push(`${academia}: ${nombreCompleto} <${correo}>`);
}

console.log(`Presidentes asignados (${resumen.asignados.length}):`);
for (const a of resumen.asignados) console.log(`  ✓ ${a}`);
if (resumen.saltados.length > 0) {
  console.log(`\nSin asignar (${resumen.saltados.length}):`);
  for (const s of resumen.saltados) console.log(`  · ${s}`);
}
console.log("\nLas cuentas nuevas no tienen contraseña: usa asignar-credenciales.js o \"Restablecer contraseña\".");
await pool.end();
