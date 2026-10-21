import { registrarBitacora } from "./usuarios.js";

export const SINODALES_REQUERIDOS = 3;

export function dictamenFinal(dictamenes) {
  if (dictamenes.some((d) => d === "no_aprobado")) return "no_aprobado";
  if (dictamenes.length === SINODALES_REQUERIDOS && dictamenes.every((d) => d === "aprobado")) {
    return "aprobado";
  }
  return null;
}

export async function aplicarDictamen(client, protocoloId) {
  const { rows: prot } = await client.query(
    "SELECT estado FROM protocolos WHERE id = $1 FOR UPDATE",
    [protocoloId],
  );
  if (!prot[0]) return { estado: null, cambio: false };
  if (prot[0].estado !== "en_evaluacion") return { estado: prot[0].estado, cambio: false };

  const { rows } = await client.query(
    `SELECT docente_id, dictamen FROM protocolo_sinodales
      WHERE protocolo_id = $1 ORDER BY docente_id`,
    [protocoloId],
  );
  const final = dictamenFinal(rows.map((r) => r.dictamen));
  if (!final) return { estado: prot[0].estado, cambio: false };

  await client.query("UPDATE protocolos SET estado = $1 WHERE id = $2", [final, protocoloId]);
  await registrarBitacora(client, null, "dictamen_protocolo", "protocolos", protocoloId, {
    dictamen: final,
    sinodales: rows.map((r) => ({ docente_id: r.docente_id, dictamen: r.dictamen })),
  });

  // Con el protocolo aprobado el título ya no puede cambiar (Art. 44): una
  // solicitud de cambio de título que siguiera pendiente se cierra sola, así
  // no queda "en revisión" sin que la CATT pueda aprobarla.
  if (final === "aprobado") {
    const { rows: cerradas } = await client.query(
      `UPDATE solicitudes_cambio_titulo
          SET estado = 'rechazada', resuelta_en = now(), observaciones_resolucion = $2
        WHERE protocolo_id = $1 AND estado = 'pendiente'
        RETURNING id`,
      [
        protocoloId,
        "Se cerró sola: el protocolo fue aprobado antes de resolverla y después de la aprobación el título ya no se puede cambiar (Art. 44).",
      ],
    );
    for (const c of cerradas) {
      await registrarBitacora(client, null, "rechazar_cambio_titulo", "solicitudes_cambio_titulo", c.id, {
        protocolo_id: protocoloId,
        automatica: true,
      });
    }
  }
  return { estado: final, cambio: true };
}
