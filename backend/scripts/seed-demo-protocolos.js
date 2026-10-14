// Siembra protocolos de demostración, uno en cada punto del flujo del
// Módulo 2, para probar las pantallas sin pasar por todo el proceso:
//
//   - registrado, sin Academia       -> HU-19 (el Secretario Ejecutivo turna)
//   - registrado, turnado sin sinodales -> HU-20 (el Presidente asigna)
//   - en_evaluacion con 3 sinodales  -> HU-21/HU-22
//   - aprobado / no_aprobado         -> HU-22 (dictamen) y HU-25 (director)
//
// También deja un alumno elegible y SIN protocolo para probar el registro
// (HU-18): jonathan.salazar@alumno.ipn.mx.
//
// Requiere haber corrido antes seed-demo-usuarios.js (usa sus alumnos,
// docentes y presidentes de academia).
//
// Uso (desde la carpeta backend/):
//   node scripts/seed-demo-protocolos.js
//
// Es idempotente: un protocolo con el mismo alumno y título no se duplica;
// sí se vuelven a dejar estado, Academia, directores y sinodales como se
// definen aquí. Los protocolos sembrados no tienen constancia de visto bueno.

import { enTransaccion, pool } from "../src/db/index.js";

const PERIODO = "2026-2";

const ACADEMIA_IS = "Academia de Ingeniería de Software"; // preside mriverad
const ACADEMIA_CC = "Academia de Ciencias de la Computación"; // preside sandra.diaz
const ACADEMIA_SD = "Academia de Sistemas Distribuidos"; // preside bcruzt

const PROTOCOLOS = [
  {
    alumno: "alejandra.reyes@alumno.ipn.mx",
    titulo: "Plataforma web para el seguimiento de trabajos terminales",
    resumen: "Sistema web para registrar y dar seguimiento a los protocolos y trabajos terminales de la ESCOM.",
    estado: "registrado",
    academia: null,
    directores: ["roberto.mendoza@ipn.mx", "patricia.guzman@ipn.mx"],
    sinodales: [],
  },
  {
    alumno: "ximena.bautista@alumno.ipn.mx",
    titulo: "Tablero de indicadores de deserción escolar",
    resumen: "Modelo predictivo y tablero de visualización para detectar alumnos en riesgo de abandono.",
    estado: "registrado",
    academia: null,
    directores: ["adriana.peralta@ipn.mx"],
    sinodales: [],
  },
  {
    alumno: "camila.rosales@alumno.ipn.mx",
    titulo: "Aplicación móvil para la gestión de laboratorios",
    resumen: "App para reservar equipos y espacios de laboratorio, con control de inventario.",
    estado: "registrado",
    academia: ACADEMIA_IS,
    directores: ["francisco.cabanas@ipn.mx"],
    sinodales: [],
  },
  {
    alumno: "diego.torres@alumno.ipn.mx",
    titulo: "Clasificación de imágenes médicas con redes convolucionales",
    resumen: "Comparación de arquitecturas CNN para detectar neumonía en radiografías de tórax.",
    estado: "en_evaluacion",
    academia: ACADEMIA_CC,
    directores: ["roberto.mendoza@ipn.mx"],
    sinodales: [
      { correo: "patricia.guzman@ipn.mx" },
      { correo: "adriana.peralta@ipn.mx", dictamen: "aprobado" },
      { correo: "gabriela.rincon@ipn.mx" },
    ],
  },
  {
    alumno: "mariajose.cornejo@alumno.ipn.mx",
    titulo: "Análisis de series de tiempo para consumo energético",
    resumen: "Pronóstico del consumo eléctrico de edificios escolares con modelos ARIMA y LSTM.",
    estado: "aprobado",
    academia: ACADEMIA_SD,
    directores: ["patricia.guzman@ipn.mx"],
    sinodales: [
      { correo: "hector.zuniga@ipn.mx", dictamen: "aprobado" },
      { correo: "arturo.delgado@ipn.mx", dictamen: "aprobado" },
      { correo: "miguel.casarrubias@ipn.mx", dictamen: "aprobado" },
    ],
  },
  {
    alumno: "sebastian.dominguez@alumno.ipn.mx",
    titulo: "Sistema distribuido de monitoreo de sensores",
    resumen: "Arquitectura publicador/suscriptor para recolectar lecturas de sensores IoT en tiempo real.",
    estado: "no_aprobado",
    academia: ACADEMIA_SD,
    directores: ["francisco.cabanas@ipn.mx"],
    sinodales: [
      {
        correo: "hector.zuniga@ipn.mx",
        dictamen: "no_aprobado",
        observaciones: "El alcance no está acotado y falta justificar la elección del broker de mensajes.",
      },
      { correo: "arturo.delgado@ipn.mx" },
      { correo: "miguel.casarrubias@ipn.mx" },
    ],
  },
];

// Alumnos elegibles en el periodo de la demo: todos los que tienen protocolo
// (la elegibilidad es requisito para registrarlo) más uno sin protocolo.
const ELEGIBLES = [...PROTOCOLOS.map((p) => p.alumno), "jonathan.salazar@alumno.ipn.mx"];

async function idPorCorreo(client, correo) {
  const { rows } = await client.query("SELECT id FROM usuarios WHERE lower(correo) = lower($1)", [correo]);
  if (!rows[0]) throw new Error(`No existe el usuario ${correo}. Corre antes seed-demo-usuarios.js`);
  return rows[0].id;
}

async function idAcademia(client, nombre) {
  if (!nombre) return null;
  const { rows } = await client.query("SELECT id FROM academias WHERE nombre = $1", [nombre]);
  if (!rows[0]) throw new Error(`No existe la academia ${nombre}. Corre antes seed-demo-usuarios.js`);
  return rows[0].id;
}

await enTransaccion(async (client) => {
  for (const correo of ELEGIBLES) {
    await client.query(
      `INSERT INTO elegibilidad (alumno_id, periodo, estado, validado_en)
       VALUES ($1, $2, 'elegible', now())
       ON CONFLICT (alumno_id, periodo) DO UPDATE SET estado = 'elegible', motivo = NULL`,
      [await idPorCorreo(client, correo), PERIODO],
    );
  }

  for (const p of PROTOCOLOS) {
    const alumnoId = await idPorCorreo(client, p.alumno);
    const academiaId = await idAcademia(client, p.academia);
    const existente = await client.query(
      "SELECT id FROM protocolos WHERE alumno_id = $1 AND titulo = $2",
      [alumnoId, p.titulo],
    );
    let id = existente.rows[0]?.id;
    if (id) {
      await client.query(
        `UPDATE protocolos
            SET estado = $1, resumen = $2, periodo = $3, academia_id = $4,
                academia_asignada_en = CASE WHEN $4::int IS NULL THEN NULL ELSE now() END
          WHERE id = $5`,
        [p.estado, p.resumen, PERIODO, academiaId, id],
      );
    } else {
      const nuevo = await client.query(
        `INSERT INTO protocolos (alumno_id, titulo, resumen, periodo, estado, academia_id, academia_asignada_en)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6::int IS NULL THEN NULL ELSE now() END)
         RETURNING id`,
        [alumnoId, p.titulo, p.resumen, PERIODO, p.estado, academiaId],
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

    await client.query("DELETE FROM protocolo_sinodales WHERE protocolo_id = $1", [id]);
    for (const s of p.sinodales) {
      await client.query(
        `INSERT INTO protocolo_sinodales (protocolo_id, docente_id, dictamen, observaciones, evaluado_en)
         VALUES ($1, $2, $3, $4, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END)`,
        [id, await idPorCorreo(client, s.correo), s.dictamen ?? null, s.observaciones ?? null],
      );
    }
  }
});

console.log(`Listo. ${PROTOCOLOS.length} protocolos y ${ELEGIBLES.length} alumnos elegibles sembrados o actualizados.`);
await pool.end();
