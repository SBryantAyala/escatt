// Script para poblar la base de datos con usuarios de prueba para la demo/exposición.
// Inserta directamente en `usuarios` y `credenciales` (mismo hash scrypt + salt que
// usa routes/auth.js), sin pasar por la API ni por el formulario de Alta -- por eso
// no depende de si ya se implementó la Opción A de credenciales administrativas.
//
// Uso (desde la carpeta backend/):
//   node scripts/seed-demo-usuarios.js
//
// Es idempotente: si un correo ya existe, se omite ese usuario y se sigue con los
// demás (puedes correrlo varias veces sin que truene).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/db/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Misma contraseña para todos los usuarios de un mismo tipo, para que sea fácil
// recordar cuál usar en vivo durante la exposición. Cumple la regla existente
// (≥9 caracteres, al menos una letra y un número).
const PASSWORDS = {
  alumno: "AlumnoDemo1",
  sinodal: "SinodalDemo1",
  personal: "PersonalDemo1",
};

function derivar(password, salt) {
  return crypto.scryptSync(password, salt, 64);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = derivar(password, salt).toString("hex");
  return { salt, hash };
}

const ALUMNOS = [
  { nombre: "Alejandra Fernanda", apellido_paterno: "Reyes", apellido_materno: "Cabrera", correo: "alejandra.reyes@alumno.ipn.mx", telefono: "5512348765", boleta: "2021630187", carrera: "ISC" },
  { nombre: "Diego Emiliano", apellido_paterno: "Torres", apellido_materno: "Villanueva", correo: "diego.torres@alumno.ipn.mx", telefono: "5523419087", boleta: "2020630452", carrera: "IIA" },
  { nombre: "María José", apellido_paterno: "Cornejo", apellido_materno: "Ibarra", correo: "mariajose.cornejo@alumno.ipn.mx", telefono: "5534567821", boleta: "2022630078", carrera: "LCD" },
  { nombre: "Sebastián Iker", apellido_paterno: "Domínguez", apellido_materno: "Palacios", correo: "sebastian.dominguez@alumno.ipn.mx", telefono: "5545678932", boleta: "2019630341", carrera: "ISC" },
  { nombre: "Ximena Itzel", apellido_paterno: "Bautista", apellido_materno: "Cervantes", correo: "ximena.bautista@alumno.ipn.mx", telefono: "5556789043", boleta: "2021630269", carrera: "LCD" },
  { nombre: "Luis Fernando", apellido_paterno: "Aguilar", apellido_materno: "Zamudio", correo: "luisfernando.aguilar@alumno.ipn.mx", telefono: "5567890154", boleta: "2020630193", carrera: "IIA" },
  { nombre: "Camila Abigail", apellido_paterno: "Rosales", apellido_materno: "Montaño", correo: "camila.rosales@alumno.ipn.mx", telefono: "5578901265", boleta: "2022630510", carrera: "ISC" },
  { nombre: "Jonathan Uriel", apellido_paterno: "Salazar", apellido_materno: "Nava", correo: "jonathan.salazar@alumno.ipn.mx", telefono: "5589012376", boleta: "2021630074", carrera: "ISC" },
  { nombre: "Valeria Guadalupe", apellido_paterno: "Escamilla", apellido_materno: "Cortés", correo: "valeria.escamilla@alumno.ipn.mx", telefono: "5590123487", boleta: "2019630288", carrera: "LCD" },
  { nombre: "Emmanuel Rodrigo", apellido_paterno: "Barrera", apellido_materno: "Solís", correo: "emmanuel.barrera@alumno.ipn.mx", telefono: "5501234598", boleta: "2020630156", carrera: "IIA" },
];

const SINODALES = [
  { nombre: "Roberto Carlos", apellido_paterno: "Mendoza", apellido_materno: "Villagómez", correo: "roberto.mendoza@ipn.mx", telefono: "5511223344", numero_empleado: "481027", especialidad: "Ingeniería de Software" },
  { nombre: "Patricia Elena", apellido_paterno: "Guzmán", apellido_materno: "Rentería", correo: "patricia.guzman@ipn.mx", telefono: "5522334455", numero_empleado: "452198", especialidad: "Inteligencia Artificial" },
  { nombre: "Francisco Javier", apellido_paterno: "Cabañas", apellido_materno: "Ortiz", correo: "francisco.cabanas@ipn.mx", telefono: "5533445566", numero_empleado: "493765", especialidad: "Redes y Telecomunicaciones" },
  { nombre: "Adriana Lucía", apellido_paterno: "Peralta", apellido_materno: "Nieves", correo: "adriana.peralta@ipn.mx", telefono: "5544556677", numero_empleado: "471340", especialidad: "Bases de Datos" },
  { nombre: "Héctor Manuel", apellido_paterno: "Zúñiga", apellido_materno: "Cordero", correo: "hector.zuniga@ipn.mx", telefono: "5555667788", numero_empleado: "468952", especialidad: "Ciberseguridad" },
  { nombre: "Gabriela Montserrat", apellido_paterno: "Rincón", apellido_materno: "Aviña", correo: "gabriela.rincon@ipn.mx", telefono: "5566778899", numero_empleado: "459817", especialidad: "Ciencia de Datos" },
  { nombre: "Arturo Iván", apellido_paterno: "Delgado", apellido_materno: "Marroquín", correo: "arturo.delgado@ipn.mx", telefono: "5577889900", numero_empleado: "476204", especialidad: "Sistemas Embebidos" },
  { nombre: "Claudia Berenice", apellido_paterno: "Espinoza", apellido_materno: "Tovar", correo: "claudia.espinoza@ipn.mx", telefono: "5588990011", numero_empleado: "483561", especialidad: "Arquitectura de Software" },
  { nombre: "Miguel Ángel", apellido_paterno: "Casarrubias", apellido_materno: "León", correo: "miguel.casarrubias@ipn.mx", telefono: "5599001122", numero_empleado: "462738", especialidad: "Sistemas Distribuidos" },
  { nombre: "Norma Alicia", apellido_paterno: "Guerrero", apellido_materno: "Bátiz", correo: "norma.guerrero@ipn.mx", telefono: "5500112233", numero_empleado: "470195", especialidad: "Desarrollo Web y Móvil" },
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

const insertUsuario = db.prepare(`
  INSERT INTO usuarios
    (nombre, apellido_paterno, apellido_materno, correo, telefono, tipo,
     boleta, carrera, protocolo_tt, numero_empleado, especialidad, cargo)
  VALUES
    (@nombre, @apellido_paterno, @apellido_materno, @correo, @telefono, @tipo,
     @boleta, @carrera, @protocolo_tt, @numero_empleado, @especialidad, @cargo)
`);

const insertCredencial = db.prepare(`
  INSERT INTO credenciales (usuario_id, password_hash, password_salt)
  VALUES (?, ?, ?)
`);

const buscarPorCorreo = db.prepare("SELECT id FROM usuarios WHERE correo = ?");

function sembrar(tipo, lista) {
  const password = PASSWORDS[tipo];
  const filasCredenciales = [];

  for (const persona of lista) {
    const yaExiste = buscarPorCorreo.get(persona.correo);
    if (yaExiste) {
      console.log(`- [omitido] ${persona.correo} ya existe (id ${yaExiste.id})`);
      continue;
    }

    const datos = {
      nombre: persona.nombre,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      correo: persona.correo,
      telefono: persona.telefono ?? null,
      tipo,
      boleta: persona.boleta ?? null,
      carrera: persona.carrera ?? null,
      protocolo_tt: null,
      numero_empleado: persona.numero_empleado ?? null,
      especialidad: persona.especialidad ?? null,
      cargo: persona.cargo ?? null,
    };

    const info = insertUsuario.run(datos);
    const usuarioId = Number(info.lastInsertRowid);

    const { salt, hash } = hashPassword(password);
    insertCredencial.run(usuarioId, hash, salt);

    console.log(`+ [creado] ${tipo.padEnd(8)} ${persona.nombre} ${persona.apellido_paterno} <${persona.correo}>`);

    filasCredenciales.push({
      tipo,
      nombre: `${persona.nombre} ${persona.apellido_paterno} ${persona.apellido_materno}`,
      correo: persona.correo,
      password,
      identificador: persona.boleta ? `Boleta: ${persona.boleta}` : `Núm. empleado: ${persona.numero_empleado}`,
    });
  }

  return filasCredenciales;
}

console.log("Sembrando usuarios de prueba...\n");

const todas = [
  ...sembrar("alumno", ALUMNOS),
  ...sembrar("sinodal", SINODALES),
  ...sembrar("personal", PERSONAL),
];

// Genera el archivo de credenciales, agrupado por tipo, con formato de tabla simple.
function tabla(filas) {
  let out = "";
  for (const f of filas) {
    out += `  ${f.nombre.padEnd(38)} ${f.correo.padEnd(32)} ${f.password.padEnd(16)} ${f.identificador}\n`;
  }
  return out;
}

const porTipo = {
  alumno: todas.filter((f) => f.tipo === "alumno"),
  sinodal: todas.filter((f) => f.tipo === "sinodal"),
  personal: todas.filter((f) => f.tipo === "personal"),
};

const contenido = `ESCATT — Credenciales de usuarios de prueba (demo / exposición)
Generado: ${new Date().toLocaleString("es-MX")}

Nota: estos usuarios y contraseñas son SOLO para la demo local. No subir este
archivo al repositorio (ya está en .gitignore) ni compartirlo fuera del equipo.

=== ALUMNOS (contraseña: ${PASSWORDS.alumno}) ===
${tabla(porTipo.alumno)}
=== SINODALES (contraseña: ${PASSWORDS.sinodal}) ===
${tabla(porTipo.sinodal)}
=== PERSONAL CATT (contraseña: ${PASSWORDS.personal}) ===
${tabla(porTipo.personal)}
Inicia sesión en /login con el correo y la contraseña de su tipo.
`;

const rutaSalida = path.join(__dirname, "credenciales-demo.txt");
fs.writeFileSync(rutaSalida, contenido, "utf8");

console.log(`\nListo. ${todas.length} usuarios nuevos creados (los ya existentes se omitieron).`);
console.log(`Credenciales guardadas en: ${rutaSalida}`);
