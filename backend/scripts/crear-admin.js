// Crea (o promueve) al administrador del sistema. Es la única forma de crear
// el primer administrador: nadie puede darse ese rol desde la aplicación.
//
// Uso (desde la carpeta backend/):
//   node scripts/crear-admin.js <correo> "<contraseña>" "<nombre>" ["<apellido paterno>"] ["<apellido materno>"]
//
// Si el correo ya existe, solo le agrega el rol admin_sistema y le asigna la
// contraseña indicada.

import { enTransaccion, pool } from "../src/db/index.js";
import { asignarRol, guardarPassword, passwordValido, registrarBitacora } from "../src/lib/usuarios.js";

function salir(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const [correoArg, password, nombre, paterno = "", materno = ""] = process.argv.slice(2);
const correo = (correoArg || "").trim().toLowerCase();

if (!correo || !password || !nombre) {
  salir('Uso: node scripts/crear-admin.js <correo> "<contraseña>" "<nombre>" ["<ap. paterno>"] ["<ap. materno>"]');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) salir("el correo no tiene un formato válido");
if (!passwordValido(password)) {
  salir("la contraseña debe tener al menos 9 caracteres e incluir al menos una letra y un número");
}

const id = await enTransaccion(async (client) => {
  const { rows } = await client.query(
    `INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo, estado)
     VALUES ($1, $2, $3, $4, 'activa')
     ON CONFLICT (correo) DO UPDATE SET estado = 'activa'
     RETURNING id`,
    [nombre, paterno, materno, correo],
  );
  const nuevoId = rows[0].id;
  await asignarRol(client, nuevoId, "admin_sistema");
  await guardarPassword(client, nuevoId, password);
  await registrarBitacora(client, null, "crear_admin", "usuarios", nuevoId, { via: "script" });
  return nuevoId;
});

console.log(`Listo: ${correo} (id ${id}) es administrador del sistema.`);
await pool.end();
