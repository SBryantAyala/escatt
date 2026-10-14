// Siembra protocolos de demostración para probar HU-25 (el director consulta
// los protocolos que dirige). Provisional, igual que las tablas de
// protocolos: se ajusta o se elimina cuando llegue el registro de HU-18.
//
// Requiere haber corrido antes seed-demo-usuarios.js (usa sus alumnos y
// docentes).
//
// Uso (desde la carpeta backend/):
//   node scripts/seed-demo-protocolos.js
//
// Es idempotente: un protocolo con el mismo alumno y título no se duplica;
// sí se vuelve a dejar el estado y los directores como se definen aquí.

import { enTransaccion, pool } from "../src/db/index.js";

const PROTOCOLOS = [
  {
    alumno: "alejandra.reyes@alumno.ipn.mx",
    titulo: "Plataforma web para el seguimiento de trabajos terminales",
    estado: "registrado",
    directores: ["roberto.mendoza@ipn.mx", "patricia.guzman@ipn.mx"],
  },
  {
    alumno: "diego.torres@alumno.ipn.mx",
    titulo: "Clasificación de imágenes médicas con redes convolucionales",
    estado: "en_evaluacion",
    directores: ["roberto.mendoza@ipn.mx"],
  },
  {
    alumno: "mariajose.cornejo@alumno.ipn.mx",
    titulo: "Análisis de series de tiempo para consumo energético",
    estado: "aprobado",
    directores: ["patricia.guzman@ipn.mx"],
  },
  {
    alumno: "sebastian.dominguez@alumno.ipn.mx",
    titulo: "Sistema distribuido de monitoreo de sensores",
    estado: "no_aprobado",
    directores: ["francisco.cabanas@ipn.mx"],
  },
];

async function idPorCorreo(client, correo) {
  const { rows } = await client.query("SELECT id FROM usuarios WHERE lower(correo) = lower($1)", [correo]);
  if (!rows[0]) throw new Error(`No existe el usuario ${correo}. Corre antes seed-demo-usuarios.js`);
  return rows[0].id;
}

await enTransaccion(async (client) => {
  for (const p of PROTOCOLOS) {
    const alumnoId = await idPorCorreo(client, p.alumno);
    const existente = await client.query(
      "SELECT id FROM protocolos WHERE alumno_id = $1 AND titulo = $2",
      [alumnoId, p.titulo],
    );
    let id = existente.rows[0]?.id;
    if (id) {
      await client.query("UPDATE protocolos SET estado = $1 WHERE id = $2", [p.estado, id]);
    } else {
      const nuevo = await client.query(
        "INSERT INTO protocolos (alumno_id, titulo, estado) VALUES ($1, $2, $3) RETURNING id",
        [alumnoId, p.titulo, p.estado],
      );
      id = nuevo.rows[0].id;
    }
    await client.query("DELETE FROM protocolo_directores WHERE protocolo_id = $1", [id]);
    for (const correo of p.directores) {
      await client.query(
        "INSERT INTO protocolo_directores (protocolo_id, docente_id) VALUES ($1, $2)",
        [id, await idPorCorreo(client, correo)],
      );
    }
  }
});

console.log(`Listo. ${PROTOCOLOS.length} protocolos sembrados o actualizados.`);
await pool.end();
