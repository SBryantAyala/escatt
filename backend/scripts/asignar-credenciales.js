// Asigna una contraseña a un usuario existente desde la terminal del servidor.
// Útil en desarrollo; en la aplicación el camino normal es "Restablecer
// contraseña" desde la ficha del usuario (genera una temporal).
//
// Uso (desde la carpeta backend/):
//   node scripts/asignar-credenciales.js correo@ejemplo.com "unaContraseña9" [--temporal]
//
// Con --temporal, el usuario deberá cambiarla al iniciar sesión.

import { enTransaccion, pool } from "../src/db/index.js";
import { guardarPassword, passwordValido } from "../src/lib/usuarios.js";

function salir(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const temporal = args.includes("--temporal");
const [correo, password] = args.filter((a) => a !== "--temporal");

if (!correo || !password) {
  salir('Uso: node scripts/asignar-credenciales.js <correo> "<password>" [--temporal]');
}
if (!passwordValido(password)) {
  salir("la contraseña debe tener al menos 9 caracteres e incluir al menos una letra y un número");
}

const { rows } = await pool.query(
  "SELECT id, nombre FROM usuarios WHERE lower(correo) = lower($1)",
  [correo],
);
const usuario = rows[0];
if (!usuario) salir(`no existe un usuario con el correo ${correo}`);

await enTransaccion(async (client) => {
  await guardarPassword(client, usuario.id, password);
  await client.query("UPDATE usuarios SET debe_cambiar_password = $1 WHERE id = $2", [
    temporal,
    usuario.id,
  ]);
  await client.query("DELETE FROM sesiones WHERE usuario_id = $1", [usuario.id]);
});

console.log(
  `Contraseña asignada a ${usuario.nombre} <${correo}>${temporal ? " (temporal: deberá cambiarla)" : ""}.`,
);
await pool.end();
