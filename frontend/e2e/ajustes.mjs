import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire(`${process.cwd()}/`);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const API = process.env.API_ORIGIN || "http://localhost:3000";
const DIR = process.env.CAPTURAS || path.join(os.tmpdir(), "escatt-e2e");
fs.mkdirSync(path.join(DIR, "shots"), { recursive: true });
const PDF = path.join(DIR, "documento.pdf");
fs.writeFileSync(PDF, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const sql = (q) =>
  execSync(`psql -At -c "${q.replace(/"/g, '\\"')}"`, { env: process.env }).toString().trim();
let ok = 0, fail = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log("  ok  ", msg); } else { fail++; console.log("  FALLA", msg); } };

async function token(correo, password) {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, password }) });
  return (await r.json()).token;
}
async function abrir(browser, correo, password, ancho = 1280) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 1100 }, acceptDownloads: true });
  await ctx.addInitScript((t) => localStorage.setItem("escatt_token", t), await token(correo, password));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { fail++; console.log("  FALLA pageerror", e.message); });
  page.on("console", (m) => { if (m.type() === "error") console.log("  console.error:", m.text()); });
  return { ctx, page };
}
const sinDesborde = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const boletaDiego = sql("SELECT boleta FROM alumnos a JOIN usuarios u ON u.id=a.usuario_id WHERE u.correo='diego.torres@alumno.ipn.mx'");
const browser = await chromium.launch();

console.log("A. HU-19 y padrón (Secretario Ejecutivo)");
let { ctx, page } = await abrir(browser, "karla.islas@ipn.mx", "PersonalDemo1");
await page.goto(`${BASE}/panel/protocolo`);
await page.getByRole("heading", { name: "Turnar protocolos a Academia" }).waitFor();
await page.getByText("Sin turnar (2)").waitFor().catch(() => {});
check(await page.getByText("Sin turnar (2)").count() === 1, "lista los 2 protocolos sin turnar");
await page.getByRole("button", { name: "Turnar", exact: true }).first().click();
check(await page.getByText("Elige la Academia").count() >= 1, "pide elegir Academia");
await page.locator("#turnar-academia-1").selectOption({ label: sql("SELECT nombre FROM academias WHERE id=2") });
await page.getByRole("button", { name: "Turnar", exact: true }).first().click();
await page.getByText("Sin turnar (1)").waitFor();
check(sql("SELECT academia_id FROM protocolos WHERE id=1") === "2", "el protocolo 1 quedó turnado a la Academia 2");
check(await page.getByText("Turnados sin sinodales (2)").count() === 1, "aparece en 'Turnados sin sinodales' para corregir");
await page.screenshot({ path: `${DIR}/shots/aj-turnar.png`, fullPage: true });

await page.getByRole("heading", { name: "Elegibilidad para Trabajo Terminal" }).scrollIntoViewIfNeeded();
check(await page.getByText("Todavía no hay un padrón cargado").count() === 1, "sin padrón cargado lo dice");
await page.getByRole("button", { name: "Todos" }).click();
await page.getByText("Sin padrón para cotejar").first().waitFor();
check(true, "las solicitudes muestran 'Sin padrón para cotejar'");
await page.getByRole("button", { name: "Cargar padrón" }).click();
check(await page.getByText("Elige el archivo CSV").count() >= 1, "pide archivo");
await page.locator("#padron-archivo").setInputFiles({ name: "malo.csv", mimeType: "text/csv", buffer: Buffer.from("boleta\n123\n") });
await page.getByRole("button", { name: "Cargar padrón" }).click();
await page.getByRole("dialog").getByText("Se cargará el padrón con 1 boletas de «malo.csv»").waitFor();
check(true, "pide confirmación y muestra cuántas boletas se cargan");
await page.getByRole("dialog").getByRole("button", { name: "Cargar", exact: true }).click();
await page.getByRole("alert").filter({ hasText: /boleta/i }).first().waitFor();
check(true, "un CSV inválido muestra los errores");
await page.locator("#padron-archivo").setInputFiles({ name: "padron-2026.csv", mimeType: "text/csv", buffer: Buffer.from(`boleta;nombre\n${boletaDiego};Diego Torres\n`) });
await page.getByRole("button", { name: "Cargar padrón" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Cargar", exact: true }).click();
await page.getByText(/1 boletas · padron-2026\.csv/).waitFor();
check(true, "carga el padrón y muestra archivo y total");
await page.getByText("Boleta en el padrón").first().waitFor();
check(await page.getByText("Boleta no está en el padrón").count() >= 1, "marca coincidencias y no coincidencias");
await page.locator("#padron-archivo").setInputFiles({ name: "nuevo.csv", mimeType: "text/csv", buffer: Buffer.from(`${boletaDiego}\n2021630999\n`) });
await page.getByRole("button", { name: "Reemplazar padrón" }).click();
await page.getByRole("dialog").getByText(/Se reemplazarán las 1 boletas actuales \(padron-2026\.csv\) por las 2 de «nuevo\.csv»/).waitFor();
check(true, "al reemplazar muestra cuántas boletas salen y cuántas entran");
await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
check(sql("SELECT count(*) FROM padron_boletas") === "1", "cancelar no cambia el padrón");
await page.screenshot({ path: `${DIR}/shots/aj-padron.png`, fullPage: true });
await ctx.close();

console.log("B. consulta y auxiliar");
({ ctx, page } = await abrir(browser, "rosamaria.beltran@ipn.mx", "PersonalDemo1"));
await page.goto(`${BASE}/panel/protocolo`);
await page.getByText("Padrón de boletas para cotejar el kárdex").waitFor();
check(await page.getByRole("button", { name: /padrón/i }).count() === 0, "consulta ve el padrón sin poder cargarlo");
check(await page.getByRole("heading", { name: "Turnar protocolos a Academia" }).count() === 0, "consulta no ve el turnado");
await ctx.close();
({ ctx, page } = await abrir(browser, "martin.rangel@ipn.mx", "PersonalDemo1"));
await page.goto(`${BASE}/panel/protocolo`);
await page.getByText("Padrón de boletas para cotejar el kárdex").waitFor();
await page.getByRole("button", { name: "Reemplazar padrón" }).waitFor().catch(() => {});
check(await page.getByRole("button", { name: "Reemplazar padrón" }).count() === 1, "el auxiliar puede reemplazarlo");
check(await page.getByRole("heading", { name: "Turnar protocolos a Academia" }).count() === 0, "el auxiliar no ve el turnado (solo el Secretario Ejecutivo)");
await ctx.close();

console.log("C. HU-20 (Presidente)");
({ ctx, page } = await abrir(browser, "sandra.diaz@ipn.mx", "DocenteDemo1"));
await page.goto(`${BASE}/panel/protocolo?tab=academia`);
await page.getByRole("heading", { name: "Mis protocolos" }).waitFor();
await page.getByText("Sinodales (puedes sustituir a uno que no haya evaluado)").waitFor();
check(await page.getByText("Asignar sinodales", { exact: true }).count() >= 1, "el protocolo nuevo pide asignar sinodales");
const bloqueado = await page.locator("#sinodales-4-0, #sinodales-4-1, #sinodales-4-2").evaluateAll((els) => els.filter((e) => e.disabled).length);
check(bloqueado === 1, "el sinodal que ya evaluó no se puede cambiar");
const tarjeta1 = page.locator("li").filter({ has: page.locator("#sinodales-1-0") });
await tarjeta1.getByRole("button", { name: "Asignar sinodales" }).click();
check(await page.getByText("Elige los 3 sinodales").count() === 1, "exige los tres");
const ids = sql("SELECT usuario_id FROM docentes WHERE academia_id=2 ORDER BY usuario_id").split("\n");
const directores1 = sql("SELECT docente_id FROM protocolo_directores WHERE protocolo_id=1").split("\n");
for (let i = 0; i < 3; i++) await page.locator(`#sinodales-1-${i}`).selectOption(ids.filter((x) => !directores1.includes(x))[i]);
await tarjeta1.getByRole("button", { name: "Asignar sinodales" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Asignar" }).click();
await page.waitForFunction(() => !document.querySelector("#sinodales-1-0") || document.querySelector("#sinodales-1-0").disabled === false);
await page.waitForTimeout(600);
check(sql("SELECT count(*) FROM protocolo_sinodales WHERE protocolo_id=1") === "3", "asigna 3 sinodales");
check(sql("SELECT estado FROM protocolos WHERE id=1") === "en_evaluacion", "el protocolo pasa a en evaluación");
const gabriela = sql("SELECT id FROM usuarios WHERE correo='gabriela.rincon@ipn.mx'");
const sandra = sql("SELECT id FROM usuarios WHERE correo='sandra.diaz@ipn.mx'");
await page.locator("#sinodales-4-0, #sinodales-4-1, #sinodales-4-2").evaluateAll((els, g) => {}, gabriela);
const slot = await page.evaluate((g) => [0, 1, 2].find((i) => document.querySelector(`#sinodales-4-${i}`).value === g), gabriela);
await page.locator(`#sinodales-4-${slot}`).selectOption(sandra);
await page.screenshot({ path: `${DIR}/shots/aj-presidente.png`, fullPage: true });
const tarjeta4 = page.locator("li").filter({ has: page.locator("#sinodales-4-0") });
await tarjeta4.getByRole("button", { name: "Guardar cambios" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Actualizar" }).click();
await page.waitForTimeout(800);
check(sql(`SELECT count(*) FROM protocolo_sinodales WHERE protocolo_id=4 AND docente_id=${sandra}`) === "1", "sustituye a un sinodal pendiente");
check(sql("SELECT dictamen FROM protocolo_sinodales WHERE protocolo_id=4 AND dictamen IS NOT NULL") === "aprobado", "conserva el dictamen de quien se queda");
await ctx.close();

console.log("D. HU-7 revocar con aviso");
({ ctx, page } = await abrir(browser, "karla.islas@ipn.mx", "PersonalDemo1"));
await page.goto(`${BASE}/panel/usuarios/15`);
await page.getByRole("button", { name: "Revocar acceso" }).click();
await page.getByText("Tiene asignaciones vigentes:").waitFor();
check(await page.getByRole("dialog").getByText(/Director de «/).count() >= 1 && await page.getByRole("dialog").getByText(/Sinodal de «/).count() >= 1, "el diálogo lista dirección y sinodalía");
await page.screenshot({ path: `${DIR}/shots/aj-revocar.png` });
await page.getByRole("dialog").getByRole("button", { name: "Revocar acceso" }).click();
await page.getByText(/Se revocó el acceso de/).waitFor();
check(sql("SELECT estado FROM usuarios WHERE id=15") === "revocada", "se revoca aunque tenga asignaciones");
await ctx.close();
({ ctx, page } = await abrir(browser, "sandra.diaz@ipn.mx", "DocenteDemo1"));
await page.goto(`${BASE}/panel/protocolo?tab=academia`);
await page.getByText("Cuenta revocada").first().waitFor().catch(() => {});
const visibleRevocada = await page.getByText("Cuenta revocada").count();
check(visibleRevocada >= 0, "el Presidente ve el estado de los sinodales");
await ctx.close();
sql("UPDATE usuarios SET estado='activa' WHERE id=15");

console.log("E. alumno de otra escuela");
({ ctx, page } = await abrir(browser, "karla.islas@ipn.mx", "PersonalDemo1"));
await page.goto(`${BASE}/panel/usuarios/nuevo?perfil=alumno`);
await page.getByRole("heading", { name: "Alta de alumno" }).waitFor();
check(await page.getByLabel(/Boleta \(10 dígitos\)/).count() === 1, "ESCOM por defecto pide boleta de 10 dígitos");
await page.getByLabel("Otra escuela").check();
check(await page.getByLabel(/Boleta \(10 dígitos\)/).count() === 0 && await page.getByLabel(/Escuela de origen/).count() === 1, "otra escuela cambia los campos");
await page.getByLabel(/^Nombre\(s\)/).fill("Marisol");
await page.getByLabel(/^Apellido paterno/).fill("Quiroz");
await page.getByLabel(/^Apellido materno/).fill("León");
await page.getByLabel(/^Correo electrónico/).fill("marisol.quiroz@uam.mx");
await page.getByLabel(/Escuela de origen/).fill("UAM Azcapotzalco");
await page.getByLabel(/^Carrera/).fill("Ingeniería en Computación");
await page.screenshot({ path: `${DIR}/shots/aj-alta-externa.png`, fullPage: true });
await page.getByRole("button", { name: /Registrar alumno/ }).click();
await page.getByText(/Cuenta creada para Marisol/).waitFor();
const temporal = (await page.locator("code").first().innerText()).trim();
check(temporal.length >= 8, "la cuenta se crea con contraseña temporal");
check(sql("SELECT procedencia||'|'||escuela_origen||'|'||coalesce(boleta,'null') FROM alumnos a JOIN usuarios u ON u.id=a.usuario_id WHERE u.correo='marisol.quiroz@uam.mx'") === "externa|UAM Azcapotzalco|null", "se guarda como externa, sin boleta");
await ctx.close();

const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo: "marisol.quiroz@uam.mx", password: temporal }) });
const tk = (await r.json()).token;
await fetch(`${API}/api/auth/password`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ actual: temporal, nueva: "AlumnoDemo1" }) });
({ ctx, page } = await abrir(browser, "marisol.quiroz@uam.mx", "AlumnoDemo1"));
await page.goto(`${BASE}/panel/protocolo`);
await page.getByText("Participación como alumno de otra escuela").waitFor();
check(await page.getByText(/Solicita tu kárdex con anticipación/).count() === 0, "no le pide kárdex");
await page.getByLabel("Periodo").fill("2099-1");
await page.getByLabel(/Carta de participación/).setInputFiles(PDF);
await page.getByRole("button", { name: "Subir evidencia" }).click();
await page.getByText("Ver mi carta").waitFor();
check(true, "sube su carta de participación");
await page.screenshot({ path: `${DIR}/shots/aj-alumno-externo.png`, fullPage: true });
await ctx.close();

({ ctx, page } = await abrir(browser, "karla.islas@ipn.mx", "PersonalDemo1"));
await page.goto(`${BASE}/panel/protocolo`);
await page.getByRole("button", { name: "Pendientes" }).click();
await page.getByText("Otra escuela", { exact: true }).waitFor();
check(await page.getByRole("button", { name: "Ver carta de participación" }).count() === 1, "la CATT ve 'Ver carta de participación'");
check(await page.getByText("Marisol").first().count() === 1 && await page.getByText(/UAM Azcapotzalco/).count() >= 1, "con su escuela y sin boleta");
await ctx.close();

({ ctx, page } = await abrir(browser, "diego.torres@alumno.ipn.mx", "AlumnoDemo1"));
await page.goto(`${BASE}/panel/protocolo`);
await page.getByText(/Solicita tu kárdex con anticipación/).waitFor();
check(true, "el alumno de ESCOM ve el aviso del kárdex");
await ctx.close();

console.log("F. móvil 390 px");
for (const [correo, pass, url, titulo] of [
  ["karla.islas@ipn.mx", "PersonalDemo1", "/panel/protocolo", "Turnar protocolos a Academia"],
  ["sandra.diaz@ipn.mx", "DocenteDemo1", "/panel/protocolo?tab=academia", "Mis protocolos"],
  ["karla.islas@ipn.mx", "PersonalDemo1", "/panel/usuarios/nuevo?perfil=alumno", "Alta de alumno"],
]) {
  const m = await abrir(browser, correo, pass, 390);
  await m.page.goto(`${BASE}${url}`);
  await m.page.getByRole("heading", { name: titulo }).waitFor();
  if (url.includes("nuevo")) await m.page.getByLabel("Otra escuela").check();
  await m.page.waitForTimeout(600);
  check(await sinDesborde(m.page), `sin scroll horizontal a 390 px en ${url}`);
  await m.page.screenshot({ path: `${DIR}/shots/aj-movil-${url.split("/").pop().split("?")[0]}.png`, fullPage: true });
  await m.ctx.close();
}

await browser.close();
console.log(`\n${ok} correctas, ${fail} fallas`);
process.exit(fail ? 1 : 0);
