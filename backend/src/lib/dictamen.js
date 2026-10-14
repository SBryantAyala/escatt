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
  return { estado: final, cambio: true };
}
