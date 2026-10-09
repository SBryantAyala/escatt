import assert from "node:assert/strict";
import test from "node:test";
import { AVISOS_ESCOLARES, calendarioAviso, estadoAviso, fechaMexico, ordenarAvisos } from "./avisosEscolares.js";

test("el día se calcula en Ciudad de México, incluso cerca de medianoche UTC", () => {
  assert.equal(fechaMexico(new Date("2026-10-10T03:00:00Z")), "2026-10-09");
  assert.equal(fechaMexico(new Date("2026-10-10T07:00:00Z")), "2026-10-10");
});

test("un periodo incluye su primer y último día y finaliza al día siguiente", () => {
  const aviso = AVISOS_ESCOLARES[0];
  assert.equal(estadoAviso(aviso, "2026-10-07").etiqueta, "Mañana");
  assert.equal(estadoAviso(aviso, "2026-10-08").etiqueta, "En periodo");
  assert.equal(estadoAviso(aviso, "2026-10-14").etiqueta, "En periodo");
  assert.equal(estadoAviso(aviso, "2026-10-15").etiqueta, "Finalizado");
});

test("la prioridad cambia según la fecha y deja los avisos vencidos al final", () => {
  const octubre = ordenarAvisos(AVISOS_ESCOLARES, "2026-10-09");
  assert.equal(octubre[0].id, "sinodales-2027-2");
  const noviembre = ordenarAvisos(AVISOS_ESCOLARES, "2026-11-18");
  assert.equal(noviembre[0].id, "presentaciones-ttii-27-1");
  assert.equal(estadoAviso(noviembre.at(-1), "2026-11-18").etiqueta, "Finalizado");
});

test("no se inventan fechas ni calendarios para avisos pendientes o recursos", () => {
  const aviso = AVISOS_ESCOLARES.find((item) => item.pendiente);
  assert.equal(estadoAviso(aviso, "2026-10-09").etiqueta, "Por publicar");
  assert.equal(calendarioAviso(aviso), null);
  assert.equal(calendarioAviso(AVISOS_ESCOLARES.at(-1)), null);
});

test("el calendario conserva el rango inclusivo con DTEND exclusivo", () => {
  const aviso = AVISOS_ESCOLARES.find((item) => item.id === "presentaciones-ttii-27-1");
  const ics = calendarioAviso(aviso, new Date("2026-10-09T12:00:00Z"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261117\r\n"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261202\r\n"));
  assert.ok(ics.includes("TRIGGER:-P1D\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("un evento de un día termina al día siguiente", () => {
  const aviso = AVISOS_ESCOLARES.find((item) => item.id === "calendario-presentaciones-27-1");
  const ics = calendarioAviso(aviso);
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261022\r\n"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261023\r\n"));
});

test("iCalendar escapa caracteres reservados y respeta 75 bytes por línea", () => {
  const aviso = { ...AVISOS_ESCOLARES[0], titulo: "Evaluación, revisión; final\\TT", resumen: "Texto de revisión áéíóú ".repeat(20) + "\nSegunda línea" };
  const ics = calendarioAviso(aviso);
  assert.ok(ics.includes("Evaluación\\, revisión\\; final\\\\TT"));
  for (const linea of ics.split("\r\n")) assert.ok(Buffer.byteLength(linea, "utf8") <= 75);
  const sinPliegues = ics.replace(/\r\n /g, "");
  assert.ok(sinPliegues.includes("\\nSegunda línea"));
  assert.ok(!/(?<!\r)\n/.test(ics));
});
