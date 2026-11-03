import pg from "pg";

const SEC = process.env.SECCIONES || "ABCD";
const BASE = process.env.API_URL || "http://localhost:3000/api";
const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "escatt",
  password: process.env.PGPASSWORD || "escatt_dev",
  database: process.env.PGDATABASE || "escatt",
});
let ok = 0;
let fallos = 0;
function verificar(d, c, det = "") {
  if (c) ok += 1;
  else {
    fallos += 1;
    console.log(`  FALLA: ${d} ${det}`);
  }
}
const q = async (sql, p) => (await pool.query(sql, p)).rows;
async function login(correo, password) {
  const r = await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, password }) });
  const j = await r.json();
  if (!j.token) throw new Error(`login ${correo}: ${JSON.stringify(j)}`);
  return j.token;
}
async function llamar(metodo, ruta, token, cuerpo) {
  const o = { method: metodo, headers: {} };
  if (token) o.headers.Authorization = `Bearer ${token}`;
  if (cuerpo instanceof FormData) o.body = cuerpo;
  else if (cuerpo !== undefined) {
    o.headers["Content-Type"] = "application/json";
    o.body = JSON.stringify(cuerpo);
  }
  const r = await fetch(`${BASE}${ruta}`, o);
  const tipo = r.headers.get("content-type") || "";
  const datos = tipo.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, datos };
}
const idDe = async (correo) => (await q("SELECT id FROM usuarios WHERE correo = $1", [correo]))[0].id;
const csv = (texto, nombre = "padron.csv") => {
  const f = new FormData();
  f.append("archivo", new File([Buffer.from(texto)], nombre, { type: "text/csv" }));
  return f;
};
const pdf = () => new File([Buffer.from("%PDF-1.4 x")], "carta.pdf", { type: "application/pdf" });

const tEjec = await login("karla.islas@ipn.mx", "PersonalDemo1");
const tAux = await login("martin.rangel@ipn.mx", "PersonalDemo1");
const tCons = await login("rosamaria.beltran@ipn.mx", "PersonalDemo1");
const tSandra = await login("sandra.diaz@ipn.mx", "DocenteDemo1");
const tDiego = await login("diego.torres@alumno.ipn.mx", "AlumnoDemo1");

console.log("A. HU-7: revocar con aviso");
if (SEC.includes("A")) {
  const adriana = await idDe("adriana.peralta@ipn.mx");
  let r = await llamar("GET", `/usuarios/${adriana}/asignaciones`, tEjec);
  verificar("lista las asignaciones (200)", r.status === 200, JSON.stringify(r.datos));
  const roles = r.datos.asignaciones.map((a) => `${a.rol}:${a.protocolo_id}`).sort();
  verificar("director del 2 y sinodal del 4", roles.join() === "director:2,sinodal:4", roles.join());
  verificar("trae descripción legible", r.datos.asignaciones.every((a) => /«.+»/.test(a.descripcion)));
  verificar("sinodal ya evaluó", r.datos.asignaciones.find((a) => a.rol === "sinodal").pendiente === false);
  r = await llamar("GET", `/usuarios/${adriana}/asignaciones`, tCons);
  verificar("consulta no ve asignaciones (403)", r.status === 403);
  r = await llamar("GET", `/usuarios/${adriana}/asignaciones`, tDiego);
  verificar("alumno no ve asignaciones (403)", r.status === 403);
  const libre = await idDe("hector.zuniga@ipn.mx");
  r = await llamar("GET", `/usuarios/${await idDe("diego.torres@alumno.ipn.mx")}/asignaciones`, tEjec);
  verificar("un alumno no tiene asignaciones", r.status === 200 && r.datos.asignaciones.length === 0);
  verificar("un docente sin protocolos vigentes: lista vacía o solo no vigentes", Array.isArray((await llamar("GET", `/usuarios/${libre}/asignaciones`, tEjec)).datos.asignaciones));
  r = await llamar("PATCH", `/usuarios/${adriana}/revocar`, tEjec);
  verificar("revocar a un docente con asignaciones vigentes ya no da 409 (200)", r.status === 200, JSON.stringify(r.datos));
  verificar("queda revocada", r.datos.estado === "revocada");
  const [bit] = await q("SELECT detalle FROM bitacora WHERE accion = 'revocar_cuenta' AND entidad_id = $1 ORDER BY id DESC LIMIT 1", [adriana]);
  verificar("la bitácora anota las asignaciones afectadas", JSON.parse(JSON.stringify(bit.detalle)).asignaciones_afectadas === 2, JSON.stringify(bit));
  r = await llamar("PATCH", `/usuarios/${adriana}/reactivar`, tEjec);
  verificar("reactivar", r.status === 200 && r.datos.estado === "activa");
}

console.log("B. reemplazo de sinodal por renuncia");
if (SEC.includes("B")) {
  const adriana = await idDe("adriana.peralta@ipn.mx");
  const patricia = await idDe("patricia.guzman@ipn.mx");
  const gabriela = await idDe("gabriela.rincon@ipn.mx");
  await q("UPDATE docentes SET academia_id = 2 WHERE usuario_id = 14");
  const candidatos = (
    await q(
      `SELECT d.usuario_id FROM docentes d JOIN usuarios u ON u.id = d.usuario_id
        WHERE d.academia_id = 2 AND u.estado = 'activa' AND d.usuario_id NOT IN ($1, $2, $3, 12)
        ORDER BY 1`,
      [adriana, patricia, gabriela],
    )
  ).map((x) => x.usuario_id);
  verificar("hay candidatos en la academia", candidatos.length >= 2, String(candidatos.length));
  const [nuevo1, nuevo2] = candidatos;

  let r = await llamar("PUT", "/protocolos/4/sinodales", tSandra, { sinodales: [patricia, adriana, nuevo1] });
  verificar("sustituye a un sinodal pendiente (200)", r.status === 200, JSON.stringify(r.datos));
  const sin = await q("SELECT docente_id, dictamen FROM protocolo_sinodales WHERE protocolo_id = 4 ORDER BY docente_id");
  verificar("quedan 3", sin.length === 3);
  verificar("conserva el dictamen de quien se quedó", sin.find((s) => s.docente_id === adriana)?.dictamen === "aprobado");
  verificar("el nuevo entra sin dictamen", sin.find((s) => s.docente_id === nuevo1)?.dictamen === null);
  verificar("sale el sustituido", !sin.some((s) => s.docente_id === gabriela));
  verificar("el protocolo sigue en evaluación", (await q("SELECT estado FROM protocolos WHERE id = 4"))[0].estado === "en_evaluacion");
  verificar("la ficha marca a los sinodales activos", r.datos.sinodales.every((s) => s.activo === true));

  r = await llamar("PUT", "/protocolos/4/sinodales", tSandra, { sinodales: [patricia, nuevo2, nuevo1] });
  verificar("no sustituye a quien ya evaluó y sigue activo (409)", r.status === 409, JSON.stringify(r.datos));
  verificar("el mensaje nombra al sinodal", /Peralta|Adriana/i.test(r.datos.error ?? ""), r.datos.error);
  const intactos = await q("SELECT docente_id FROM protocolo_sinodales WHERE protocolo_id = 4 ORDER BY docente_id");
  verificar("y no cambió nada", intactos.map((s) => s.docente_id).join() === sin.map((s) => s.docente_id).join());

  await q("UPDATE usuarios SET estado = 'revocada' WHERE id = $1", [adriana]);

  r = await llamar("GET", "/protocolos/4", tSandra);
  verificar("la ficha marca al sinodal inactivo", r.datos.sinodales.find((s) => s.id === adriana)?.activo === false, JSON.stringify(r.datos.sinodales));

  r = await llamar("PUT", "/protocolos/4/sinodales", tSandra, { sinodales: [patricia, nuevo2, nuevo1] });
  verificar("sustituye a quien renunció aunque ya hubiera evaluado (200)", r.status === 200, JSON.stringify(r.datos));
  const [h] = await q("SELECT dictamen, titulo FROM protocolo_evaluaciones_historial WHERE protocolo_id = 4 AND docente_id = $1", [adriana]);
  verificar("su evaluación queda archivada", h?.dictamen === "aprobado", JSON.stringify(h));
  const sin2 = await q("SELECT docente_id FROM protocolo_sinodales WHERE protocolo_id = 4 ORDER BY docente_id");
  verificar("los 3 sinodales son los nuevos", sin2.map((s) => s.docente_id).sort().join() === [patricia, nuevo1, nuevo2].sort().join());
  const [bit2] = await q("SELECT accion FROM bitacora WHERE entidad = 'protocolos' AND entidad_id = 4 ORDER BY id DESC LIMIT 1");
  verificar("bitácora reemplazar_sinodales", bit2.accion === "reemplazar_sinodales", bit2.accion);

  r = await llamar("PUT", "/protocolos/4/sinodales", tSandra, { sinodales: [patricia, nuevo2, adriana] });
  verificar("no se puede asignar a un docente revocado (400)", r.status === 400, JSON.stringify(r.datos));
  await q("UPDATE usuarios SET estado = 'activa' WHERE id = $1", [adriana]);

  r = await llamar("PUT", "/protocolos/3/sinodales", tSandra, { sinodales: [patricia, nuevo1, nuevo2] });
  verificar("sigue protegido: otra academia (403)", r.status === 403);
  await q("UPDATE docentes SET academia_id = 8 WHERE usuario_id = 14");
}

console.log("C. padrón de boletas");
if (SEC.includes("C")) {
  const boletaDiego = (await q("SELECT boleta FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE u.correo = 'diego.torres@alumno.ipn.mx'"))[0].boleta;
  const boletaCamila = (await q("SELECT boleta FROM alumnos a JOIN usuarios u ON u.id = a.usuario_id WHERE u.correo = 'camila.rosales@alumno.ipn.mx'"))[0].boleta;
  await q("DELETE FROM padron_boletas");
  await q("DELETE FROM padron_cargas");

  let r = await llamar("GET", "/padron", tEjec);
  verificar("sin padrón cargado", r.status === 200 && r.datos.cargado === false);
  r = await llamar("GET", "/padron", tDiego);
  verificar("alumno no consulta el padrón (403)", r.status === 403);
  r = await llamar("POST", "/padron", tCons, csv(`boleta\n${boletaDiego}\n`));
  verificar("consulta no carga (403)", r.status === 403);
  r = await llamar("POST", "/padron", tDiego, csv(`boleta\n${boletaDiego}\n`));
  verificar("alumno no carga (403)", r.status === 403);
  r = await llamar("POST", "/padron", tEjec, new FormData());
  verificar("sin archivo (400)", r.status === 400);
  const mal = new FormData();
  mal.append("archivo", new File([Buffer.from("x")], "padron.pdf", { type: "application/pdf" }));
  r = await llamar("POST", "/padron", tEjec, mal);
  verificar("solo CSV (400)", r.status === 400, JSON.stringify(r.datos));
  r = await llamar("POST", "/padron", tEjec, csv(`boleta,nombre\n123\n${boletaDiego},A\n${boletaDiego},B\n`));
  verificar("boletas inválidas y repetidas (400 con detalle)", r.status === 400 && r.datos.errores?.length === 2, JSON.stringify(r.datos));
  r = await llamar("POST", "/padron", tEjec, csv(`nombre,carrera\nA,ISC\n`));
  verificar("sin columna boleta (400)", r.status === 400);
  verificar("nada se cargó con errores", (await q("SELECT count(*)::int n FROM padron_boletas"))[0].n === 0);

  r = await llamar("POST", "/padron", tAux, csv(`﻿Boleta;Nombre;Carrera\n${boletaDiego};Diego Torres;ISC\n2021630999;Otra Persona;IIA\n`, "kardex-2026.csv"));
  verificar("el auxiliar carga con ; y BOM (201)", r.status === 201 && r.datos.total === 2, JSON.stringify(r.datos));
  verificar("registra archivo y quién", r.datos.archivo === "kardex-2026.csv" && /Rangel/.test(r.datos.cargado_por ?? ""), JSON.stringify(r.datos));

  await q("DELETE FROM elegibilidad WHERE periodo = '2099-1'");
  for (const c of ["diego.torres", "camila.rosales"]) {
    await q("INSERT INTO elegibilidad (alumno_id, periodo, evidencia_url) SELECT id, '2099-1', 'x.pdf' FROM usuarios WHERE correo = $1", [`${c}@alumno.ipn.mx`]);
  }
  r = await llamar("GET", "/elegibilidad?estado=pendiente", tEjec);
  const porBoleta = Object.fromEntries(r.datos.filter((x) => x.periodo === "2099-1").map((x) => [x.alumno.boleta, x]));
  verificar("coincide con el padrón", porBoleta[boletaDiego]?.padron.estado === "coincide" && porBoleta[boletaDiego].padron.nombre === "Diego Torres", JSON.stringify(porBoleta[boletaDiego]?.padron));
  verificar("no coincide", porBoleta[boletaCamila]?.padron.estado === "no_coincide", JSON.stringify(porBoleta[boletaCamila]?.padron));

  r = await llamar("POST", "/padron", tEjec, csv(`${boletaCamila}\n`));
  verificar("sin encabezado: la primera columna es la boleta (201)", r.status === 201 && r.datos.total === 1, JSON.stringify(r.datos));
  r = await llamar("GET", "/elegibilidad?estado=pendiente", tEjec);
  const f2 = Object.fromEntries(r.datos.filter((x) => x.periodo === "2099-1").map((x) => [x.alumno.boleta, x]));
  verificar("cargar un padrón nuevo reemplaza al anterior", f2[boletaCamila]?.padron.estado === "coincide" && f2[boletaDiego]?.padron.estado === "no_coincide");
  r = await llamar("GET", "/padron", tCons);
  verificar("consulta ve el estado del padrón", r.status === 200 && r.datos.total === 1 && r.datos.cargado === true);
  await q("DELETE FROM padron_boletas");
  await q("DELETE FROM padron_cargas");
  r = await llamar("GET", "/elegibilidad?estado=pendiente", tEjec);
  verificar("sin padrón: sin_padron", r.datos.filter((x) => x.periodo === "2099-1").every((x) => x.padron.estado === "sin_padron"));
  await q("DELETE FROM elegibilidad WHERE periodo = '2099-1'");
}

console.log("D. alumnos de otras escuelas");
if (SEC.includes("D")) {
  {
    const lista = await llamar("GET", "/elegibilidad?estado=todos", tEjec);
    verificar("los alumnos de ESCOM siguen con kárdex", lista.datos.every((x) => x.alumno.procedencia === "escom" && x.tipo_evidencia === "kardex"));
  }
  await q("DELETE FROM usuarios WHERE correo = 'luisa.externa@uam.mx'");
  const base = { perfil: "alumno", procedencia: "externa", nombre: "Luisa", apellido_paterno: "Externa", apellido_materno: "Prueba", correo: "luisa.externa@uam.mx", escuela_origen: "UAM Azcapotzalco", carrera: "Ing. en Computación" };
  let r = await llamar("POST", "/usuarios", tCons, base);
  verificar("consulta no da de alta (403)", r.status === 403);
  r = await llamar("POST", "/usuarios", tDiego, base);
  verificar("alumno no da de alta (403)", r.status === 403);
  r = await llamar("POST", "/usuarios", tEjec, { ...base, escuela_origen: "" });
  verificar("exige escuela de origen (400)", r.status === 400, JSON.stringify(r.datos));
  r = await llamar("POST", "/usuarios", tEjec, { ...base, procedencia: "otra" });
  verificar("procedencia inválida (400)", r.status === 400);
  r = await llamar("POST", "/usuarios", tAux, base);
  verificar("el auxiliar da de alta sin boleta ni plan (201)", r.status === 201, JSON.stringify(r.datos));
  const u = r.datos.usuario;
  verificar("la ficha trae procedencia y escuela", u.procedencia === "externa" && u.escuela_origen === "UAM Azcapotzalco" && u.carrera === "Ing. en Computación" && u.boleta === null, JSON.stringify(u));
  verificar("con rol alumno", u.roles.includes("alumno") && u.perfiles.includes("alumno"));
  r = await llamar("POST", "/usuarios", tEjec, { ...base, nombre: "Otro", correo: "otro.externo@uam.mx", boleta: "A-123" });
  verificar("acepta boleta de su escuela con cualquier formato (201)", r.status === 201 && r.datos.usuario.boleta === "A-123", JSON.stringify(r.datos));
  await q("DELETE FROM usuarios WHERE correo = 'otro.externo@uam.mx'");
  r = await llamar("POST", "/usuarios", tEjec, { perfil: "alumno", nombre: "E", apellido_paterno: "S", apellido_materno: "C", correo: "escom.sinplan@alumno.ipn.mx", boleta: "2021630000", carrera: "ISC" });
  verificar("un alumno de ESCOM sigue exigiendo plan de estudios (400)", r.status === 400, JSON.stringify(r.datos));
  r = await llamar("POST", "/usuarios", tEjec, { perfil: "alumno", nombre: "E", apellido_paterno: "S", apellido_materno: "C", correo: "escom.carrera@alumno.ipn.mx", boleta: "2021630000", carrera: "Medicina", plan_estudios: "2020" });
  verificar("y sigue validando la carrera (400)", r.status === 400);

  r = await llamar("PUT", `/usuarios/${u.id}`, tEjec, { escuela_origen: "UNAM FES Acatlán", carrera: "Matemáticas Aplicadas y Computación", boleta: "B-77" });
  verificar("edita escuela, carrera y boleta de su escuela (200)", r.status === 200 && r.datos.escuela_origen === "UNAM FES Acatlán" && r.datos.boleta === "B-77", JSON.stringify(r.datos));
  r = await llamar("PUT", `/usuarios/${u.id}`, tEjec, { escuela_origen: "" });
  verificar("no deja vacía la escuela (400)", r.status === 400);

  const tTemp = await login("luisa.externa@uam.mx", r.datos?.password_temporal ?? "x").catch(() => null);
  const reset = await llamar("POST", `/usuarios/${u.id}/reset-password`, tEjec);
  const temporal = reset.datos.password_temporal;
  const tLuisa = await login("luisa.externa@uam.mx", temporal);
  r = await llamar("PUT", "/auth/password", tLuisa, { actual: temporal, nueva: "AlumnoDemo1" });
  verificar("entra con su contraseña temporal y la cambia", r.status === 200, JSON.stringify(r.datos));
  verificar("la sesión trae su procedencia", r.datos.usuario.procedencia === "externa");

  r = await llamar("POST", "/elegibilidad", tLuisa, (() => { const f = new FormData(); f.append("periodo", "2099-2"); return f; })());
  verificar("sin archivo pide carta de participación (400)", r.status === 400 && /carta de participación/.test(r.datos.error), JSON.stringify(r.datos));
  r = await llamar("POST", "/elegibilidad", tLuisa, (() => { const f = new FormData(); f.append("periodo", "2099-2"); f.append("evidencia", pdf()); return f; })());
  verificar("sube su carta (201)", r.status === 201, JSON.stringify(r.datos));
  verificar("tipo carta, sin cotejo de padrón", r.datos.tipo_evidencia === "carta" && r.datos.padron.estado === "no_aplica", JSON.stringify(r.datos));
  verificar("la carrera muestra la escuela", /UNAM FES Acatlán/.test(r.datos.alumno.carrera) && r.datos.alumno.boleta === "B-77", JSON.stringify(r.datos.alumno));
  const idEleg = r.datos.id;

  await llamar("PUT", "/auth/password", tDiego, { actual: "AlumnoDemo1", nueva: "AlumnoDemo1" });
  r = await llamar("PATCH", `/elegibilidad/${idEleg}`, tEjec, { estado: "elegible" });
  verificar("la CATT la valida (200)", r.status === 200 && r.datos.estado === "elegible");
  await q("UPDATE elegibilidad SET periodo = (SELECT periodo FROM elegibilidad WHERE alumno_id = (SELECT id FROM usuarios WHERE correo = 'jonathan.salazar@alumno.ipn.mx') ORDER BY periodo DESC LIMIT 1) WHERE id = $1", [idEleg]);

  const tJon = await login("jonathan.salazar@alumno.ipn.mx", "AlumnoDemo1");
  r = await llamar("POST", "/protocolos/companeros/validar", tJon, { correo: "luisa.externa@uam.mx" });
  verificar("un alumno de ESCOM la puede agregar a su equipo (200)", r.status === 200, JSON.stringify(r.datos));
  verificar("se muestra con su escuela", /UNAM FES Acatlán/.test(r.datos.carrera), JSON.stringify(r.datos));
  await q("DELETE FROM protocolos WHERE alumno_id = (SELECT id FROM usuarios WHERE correo = 'jonathan.salazar@alumno.ipn.mx')");
  const f = new FormData();
  f.append("titulo", "TT con alumna de otra escuela");
  f.append("resumen", "Objetivo");
  f.append("directores", String(12));
  f.append("integrantes", "luisa.externa@uam.mx");
  f.append("visto_bueno", pdf());
  r = await llamar("POST", "/protocolos", tJon, f);
  verificar("registra un equipo mixto ESCOM + otra escuela (201)", r.status === 201, JSON.stringify(r.datos));
  verificar("la ficha lista a ambos con su procedencia", r.datos.integrantes?.length === 2 && r.datos.integrantes.some((i) => /UNAM FES Acatlán/.test(i.carrera)), JSON.stringify(r.datos.integrantes));
  r = await llamar("GET", "/protocolos/mio", tLuisa);
  verificar("la alumna externa ve su protocolo", r.status === 200 && r.datos[0]?.titulo === "TT con alumna de otra escuela", JSON.stringify(r.datos));

  r = await llamar("GET", `/usuarios/${u.id}/historial`, tEjec);
  verificar("con protocolo ya no se puede eliminar", r.datos.puede_eliminar === false);
  await q("DELETE FROM protocolos WHERE alumno_id = (SELECT id FROM usuarios WHERE correo = 'jonathan.salazar@alumno.ipn.mx')");
  await q("DELETE FROM usuarios WHERE correo = 'luisa.externa@uam.mx'");

  r = await llamar("POST", "/auth/registro", null, { nombre: "X", apellido_paterno: "Y", apellido_materno: "Z", correo: "x.y@otra.edu", password: "AlumnoDemo1", boleta: "2021630001", carrera: "ISC", plan_estudios: "2020" });
  verificar("el autorregistro sigue siendo solo para @alumno.ipn.mx", r.status === 400 || r.status === 403, `${r.status} ${JSON.stringify(r.datos)}`);
}

await pool.end();
console.log(`\n${ok} verificaciones correctas, ${fallos} fallas`);
process.exit(fallos ? 1 : 0);
