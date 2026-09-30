// Pobla la base con usuarios de prueba para la demo: al menos una persona por
// cada rol del sistema, con perfiles y roles del modelo nuevo.
//
// Uso (desde la carpeta backend/):
//   node scripts/seed-demo-usuarios.js
//
// Es idempotente: si un correo ya existe (por ejemplo, un usuario migrado del
// esquema anterior), completa su perfil y deja sus roles como se definen aquí.
// La contraseña de demo se vuelve a asignar en cada corrida.
//
// Las credenciales se escriben en scripts/credenciales-demo.txt (en .gitignore).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enTransaccion, pool } from "../src/db/index.js";
import { asignarRol, guardarPassword } from "../src/lib/usuarios.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Misma contraseña por grupo para recordarla fácil en la demo.
// Cumple la regla: ≥9 caracteres, al menos una letra y un número.
const PASSWORDS = {
  admin: "AdminDemo1",
  alumno: "AlumnoDemo1",
  docente: "DocenteDemo1",
  personal: "PersonalDemo1",
};

const ADMIN = {
  nombre: "Administrador",
  apellido_paterno: "del Sistema",
  apellido_materno: "ESCATT",
  correo: "admin.escatt@ipn.mx",
  telefono: null,
};

const ALUMNOS = [
  { nombre: "Alejandra Fernanda", apellido_paterno: "Reyes", apellido_materno: "Cabrera", correo: "alejandra.reyes@alumno.ipn.mx", telefono: "5512348765", boleta: "2021630187", carrera: "ISC", plan_estudios: "2020" },
  { nombre: "Diego Emiliano", apellido_paterno: "Torres", apellido_materno: "Villanueva", correo: "diego.torres@alumno.ipn.mx", telefono: "5523419087", boleta: "2020630452", carrera: "IIA", plan_estudios: "2020" },
  { nombre: "María José", apellido_paterno: "Cornejo", apellido_materno: "Ibarra", correo: "mariajose.cornejo@alumno.ipn.mx", telefono: "5534567821", boleta: "2022630078", carrera: "LCD", plan_estudios: "2020" },
  { nombre: "Sebastián Iker", apellido_paterno: "Domínguez", apellido_materno: "Palacios", correo: "sebastian.dominguez@alumno.ipn.mx", telefono: "5545678932", boleta: "2019630341", carrera: "ISC", plan_estudios: "2009" },
  { nombre: "Ximena Itzel", apellido_paterno: "Bautista", apellido_materno: "Cervantes", correo: "ximena.bautista@alumno.ipn.mx", telefono: "5556789043", boleta: "2021630269", carrera: "LCD", plan_estudios: "2020" },
  { nombre: "Luis Fernando", apellido_paterno: "Aguilar", apellido_materno: "Zamudio", correo: "luisfernando.aguilar@alumno.ipn.mx", telefono: "5567890154", boleta: "2020630193", carrera: "IIA", plan_estudios: "2020" },
  { nombre: "Camila Abigail", apellido_paterno: "Rosales", apellido_materno: "Montaño", correo: "camila.rosales@alumno.ipn.mx", telefono: "5578901265", boleta: "2022630510", carrera: "ISC", plan_estudios: "2020" },
  { nombre: "Jonathan Uriel", apellido_paterno: "Salazar", apellido_materno: "Nava", correo: "jonathan.salazar@alumno.ipn.mx", telefono: "5589012376", boleta: "2021630074", carrera: "ISC", plan_estudios: "2020" },
  { nombre: "Valeria Guadalupe", apellido_paterno: "Escamilla", apellido_materno: "Cortés", correo: "valeria.escamilla@alumno.ipn.mx", telefono: "5590123487", boleta: "2019630288", carrera: "LCD", plan_estudios: "2009" },
  { nombre: "Emmanuel Rodrigo", apellido_paterno: "Barrera", apellido_materno: "Solís", correo: "emmanuel.barrera@alumno.ipn.mx", telefono: "5501234598", boleta: "2020630156", carrera: "IIA", plan_estudios: "2020" },
];

const DOCENTES = [
  { nombre: "Roberto Carlos", apellido_paterno: "Mendoza", apellido_materno: "Villagómez", correo: "roberto.mendoza@ipn.mx", telefono: "5511223344", numero_empleado: "481027", academia: "Academia de Ingeniería de Software" },
  { nombre: "Patricia Elena", apellido_paterno: "Guzmán", apellido_materno: "Rentería", correo: "patricia.guzman@ipn.mx", telefono: "5522334455", numero_empleado: "452198", academia: "Academia de Ciencias de la Computación" },
  { nombre: "Francisco Javier", apellido_paterno: "Cabañas", apellido_materno: "Ortiz", correo: "francisco.cabanas@ipn.mx", telefono: "5533445566", numero_empleado: "493765", academia: "Academia de Sistemas Distribuidos" },
  { nombre: "Adriana Lucía", apellido_paterno: "Peralta", apellido_materno: "Nieves", correo: "adriana.peralta@ipn.mx", telefono: "5544556677", numero_empleado: "471340", academia: "Academia de Ciencias de la Computación" },
  { nombre: "Héctor Manuel", apellido_paterno: "Zúñiga", apellido_materno: "Cordero", correo: "hector.zuniga@ipn.mx", telefono: "5555667788", numero_empleado: "468952", academia: "Academia de Sistemas Distribuidos" },
  { nombre: "Gabriela Montserrat", apellido_paterno: "Rincón", apellido_materno: "Aviña", correo: "gabriela.rincon@ipn.mx", telefono: "5566778899", numero_empleado: "459817", academia: "Academia de Ciencias de la Computación" },
  { nombre: "Arturo Iván", apellido_paterno: "Delgado", apellido_materno: "Marroquín", correo: "arturo.delgado@ipn.mx", telefono: "5577889900", numero_empleado: "476204", academia: "Academia de Sistemas Distribuidos" },
  { nombre: "Claudia Berenice", apellido_paterno: "Espinoza", apellido_materno: "Tovar", correo: "claudia.espinoza@ipn.mx", telefono: "5588990011", numero_empleado: "483561", academia: "Academia de Ingeniería de Software" },
  { nombre: "Miguel Ángel", apellido_paterno: "Casarrubias", apellido_materno: "León", correo: "miguel.casarrubias@ipn.mx", telefono: "5599001122", numero_empleado: "462738", academia: "Academia de Sistemas Distribuidos" },
  { nombre: "Norma Alicia", apellido_paterno: "Guerrero", apellido_materno: "Bátiz", correo: "norma.guerrero@ipn.mx", telefono: "5500112233", numero_empleado: "470195", academia: "Academia de Ingeniería de Software" },
];

const PERSONAL = [
  { nombre: "Rosa María", apellido_paterno: "Beltrán", apellido_materno: "Ochoa", correo: "rosamaria.beltran@ipn.mx", telefono: "5512309876", numero_empleado: "512340", cargo: "Presidencia de la CATT" },
  { nombre: "Jorge Alberto", apellido_paterno: "Nájera", apellido_materno: "Solano", correo: "jorge.najera@ipn.mx", telefono: "5523408765", numero_empleado: "508721", cargo: "Secretaría Técnica" },
  { nombre: "Karla Verónica", apellido_paterno: "Islas", apellido_materno: "Bermúdez", correo: "karla.islas@ipn.mx", telefono: "5534507654", numero_empleado: "519654", cargo: "Secretaría Ejecutiva / Coordinación Operativa" },
  { nombre: "Iván Alejandro", apellido_paterno: "Fuentes", apellido_materno: "Marín", correo: "ivan.fuentes@ipn.mx", telefono: "5545606543", numero_empleado: "503287", cargo: "Vocal Académico" },
  { nombre: "Lorena Guadalupe", apellido_paterno: "Chávez", apellido_materno: "Piña", correo: "lorena.chavez@ipn.mx", telefono: "5556705432", numero_empleado: "527493", cargo: "Vocal Académico" },
  { nombre: "Martín Ezequiel", apellido_paterno: "Rangel", apellido_materno: "Cuevas", correo: "martin.rangel@ipn.mx", telefono: "5567804321", numero_empleado: "511068", cargo: "Personal Administrativo" },
  { nombre: "Daniela Carolina", apellido_paterno: "Osorio", apellido_materno: "Landa", correo: "daniela.osorio@ipn.mx", telefono: "5578903210", numero_empleado: "524815", cargo: "Personal Administrativo" },
  { nombre: "Ricardo Emilio", apellido_paterno: "Botello", apellido_materno: "Sáenz", correo: "ricardo.botello@ipn.mx", telefono: "5589002109", numero_empleado: "509372", cargo: "Personal Administrativo" },
  { nombre: "Fernanda Sarahí", apellido_paterno: "Quiroz", apellido_materno: "Almanza", correo: "fernanda.quiroz@ipn.mx", telefono: "5590101098", numero_empleado: "518604", cargo: "Personal Administrativo" },
  { nombre: "Oscar Iván", apellido_paterno: "Malpica", apellido_materno: "Serrano", correo: "oscar.malpica@ipn.mx", telefono: "5501200987", numero_empleado: "502951", cargo: "Personal Administrativo" },
];

// Roles extra de algunos docentes (además de "docente").
const ROLES_EXTRA_DOCENTE = {
  "roberto.mendoza@ipn.mx": ["presidente_academia"],
  "patricia.guzman@ipn.mx": ["presidente_academia"],
  // Docente comisionado a la CATT: tiene perfil docente Y personal_catt.
  "miguel.casarrubias@ipn.mx": ["catt_ejecutivo"],
};

// Rol CATT de cada integrante del personal.
const ROL_PERSONAL = {
  "rosamaria.beltran@ipn.mx": "catt_consulta",
  "jorge.najera@ipn.mx": "catt_ejecutivo",
  "karla.islas@ipn.mx": "catt_ejecutivo",
  "ivan.fuentes@ipn.mx": "catt_consulta",
  "lorena.chavez@ipn.mx": "catt_consulta",
};

async function academiaId(client, nombre) {
  const { rows } = await client.query("SELECT id FROM academias WHERE nombre = $1", [nombre]);
  if (rows[0]) return rows[0].id;
  const nueva = await client.query(
    "INSERT INTO academias (nombre) VALUES ($1) RETURNING id",
    [nombre],
  );
  return nueva.rows[0].id;
}

// Crea o actualiza la fila de usuarios y devuelve su id.
async function upsertUsuario(client, p) {
  const { rows } = await client.query(
    `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, telefono, estado)
     VALUES ($1, $2, $3, $4, $5, 'activa')
     ON CONFLICT (correo) DO UPDATE SET
       nombre = EXCLUDED.nombre,
       apellido_paterno = EXCLUDED.apellido_paterno,
       apellido_materno = EXCLUDED.apellido_materno,
       telefono = EXCLUDED.telefono,
       estado = 'activa',
       debe_cambiar_password = FALSE
     RETURNING id`,
    [p.nombre, p.apellido_paterno, p.apellido_materno, p.correo, p.telefono ?? null],
  );
  return rows[0].id;
}

async function dejarRoles(client, id, roles) {
  await client.query("DELETE FROM usuario_roles WHERE usuario_id = $1", [id]);
  for (const rol of roles) await asignarRol(client, id, rol);
}

async function empleado(client, id, numero) {
  await client.query(
    `INSERT INTO empleados (usuario_id, numero_empleado) VALUES ($1, $2)
     ON CONFLICT (usuario_id) DO UPDATE SET numero_empleado = EXCLUDED.numero_empleado`,
    [id, numero],
  );
}

async function personalCatt(client, id, cargo) {
  await client.query(
    `INSERT INTO personal_catt (usuario_id, cargo) VALUES ($1, $2)
     ON CONFLICT (usuario_id) DO UPDATE SET cargo = EXCLUDED.cargo`,
    [id, cargo ?? null],
  );
}

const filas = [];
const anotar = (grupo, p, roles, identificador) =>
  filas.push({
    grupo,
    nombre: `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno}`,
    correo: p.correo,
    password: PASSWORDS[grupo],
    roles: roles.join(", "),
    identificador,
  });

console.log("Sembrando usuarios de prueba...\n");

await enTransaccion(async (client) => {
  // Administrador del sistema
  const idAdmin = await upsertUsuario(client, ADMIN);
  await dejarRoles(client, idAdmin, ["admin_sistema"]);
  await guardarPassword(client, idAdmin, PASSWORDS.admin);
  anotar("admin", ADMIN, ["admin_sistema"], "-");

  for (const a of ALUMNOS) {
    const id = await upsertUsuario(client, a);
    await client.query(
      `INSERT INTO alumnos (usuario_id, boleta, carrera, plan_estudios) VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE SET
         boleta = EXCLUDED.boleta, carrera = EXCLUDED.carrera, plan_estudios = EXCLUDED.plan_estudios`,
      [id, a.boleta, a.carrera, a.plan_estudios],
    );
    await dejarRoles(client, id, ["alumno"]);
    await guardarPassword(client, id, PASSWORDS.alumno);
    anotar("alumno", a, ["alumno"], `Boleta: ${a.boleta}`);
  }

  for (const d of DOCENTES) {
    const id = await upsertUsuario(client, d);
    await empleado(client, id, d.numero_empleado);
    await client.query(
      `INSERT INTO docentes (usuario_id, academia_id) VALUES ($1, $2)
       ON CONFLICT (usuario_id) DO UPDATE SET academia_id = EXCLUDED.academia_id`,
      [id, await academiaId(client, d.academia)],
    );
    const extra = ROLES_EXTRA_DOCENTE[d.correo] ?? [];
    if (extra.some((r) => r.startsWith("catt_"))) {
      await personalCatt(client, id, "Docente comisionado a la CATT");
    }
    const roles = ["docente", ...extra];
    await dejarRoles(client, id, roles);
    await guardarPassword(client, id, PASSWORDS.docente);
    anotar("docente", d, roles, `Núm. empleado: ${d.numero_empleado} · ${d.academia}`);
  }

  for (const p of PERSONAL) {
    const id = await upsertUsuario(client, p);
    await empleado(client, id, p.numero_empleado);
    await personalCatt(client, id, p.cargo);
    const roles = [ROL_PERSONAL[p.correo] ?? "catt_auxiliar"];
    await dejarRoles(client, id, roles);
    await guardarPassword(client, id, PASSWORDS.personal);
    anotar("personal", p, roles, `Núm. empleado: ${p.numero_empleado} · ${p.cargo}`);
  }
});

function tabla(grupo) {
  return filas
    .filter((f) => f.grupo === grupo)
    .map(
      (f) =>
        `  ${f.nombre.padEnd(38)} ${f.correo.padEnd(36)} ${f.roles.padEnd(32)} ${f.identificador}`,
    )
    .join("\n");
}

const contenido = `ESCATT — Credenciales de usuarios de prueba (demo / exposición)
Generado: ${new Date().toLocaleString("es-MX")}

Nota: estos usuarios y contraseñas son SOLO para la demo local. No subir este
archivo al repositorio (ya está en .gitignore) ni compartirlo fuera del equipo.

=== ADMINISTRADOR DEL SISTEMA (contraseña: ${PASSWORDS.admin}) ===
${tabla("admin")}

=== ALUMNOS (contraseña: ${PASSWORDS.alumno}) ===
${tabla("alumno")}

=== DOCENTES (contraseña: ${PASSWORDS.docente}) ===
${tabla("docente")}

=== PERSONAL CATT (contraseña: ${PASSWORDS.personal}) ===
${tabla("personal")}

Inicia sesión con el correo y la contraseña de su grupo.
`;

const rutaSalida = path.join(__dirname, "credenciales-demo.txt");
fs.writeFileSync(rutaSalida, contenido, "utf8");

console.log(`Listo. ${filas.length} usuarios sembrados o actualizados.`);
console.log(`Credenciales guardadas en: ${rutaSalida}`);

await pool.end();
