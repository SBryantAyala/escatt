// Script TEMPORAL para asignar contraseña a un usuario de tipo sinodal o personal.
//
// Contexto: el registro público (POST /api/auth/registro) solo crea alumnos —
// nadie debe poder auto-asignarse una cuenta de staff desde un formulario
// público. Mientras no exista el panel administrativo real que dé de alta y
// asigne credenciales a sinodales/personal (pendiente anotado en
// 00-Contexto-Proyecto/CONTEXTO-PROYECTO.md), este script es el mecanismo
// provisional. NO es un endpoint HTTP: solo se corre desde la terminal del
// servidor.
//
// Flujo:
//   1. El usuario (sinodal/personal) ya se creó por la vía administrativa
//      existente: POST /api/usuarios.
//   2. Este script le asigna contraseña para que pueda hacer login normal.
//
// Uso:
//   node scripts/asignar-credenciales.js correo@ejemplo.com "unaContraseña9"

import crypto from "node:crypto";
import "dotenv/config";

import { db } from "../src/db/index.js";

function salir(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const [correo, password] = process.argv.slice(2);

if (!correo || !password) {
  salir(
    'faltan argumentos. Uso: node scripts/asignar-credenciales.js <correo> "<password>"',
  );
}

if (password.length < 9 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
  salir(
    "la contraseña debe tener al menos 9 caracteres e incluir al menos una letra y un número",
  );
}

const usuario = db
  .prepare("SELECT id, nombre, tipo FROM usuarios WHERE correo = ?")
  .get(correo);

if (!usuario) {
  salir(
    `no existe ningún usuario con el correo "${correo}". ` +
      "Créalo primero por la vía administrativa (POST /api/usuarios) y vuelve a correr este script.",
  );
}

const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");

// Inserta la fila de credenciales, o la reemplaza si el usuario ya tenía una.
db.prepare(
  `INSERT INTO credenciales (usuario_id, password_hash, password_salt)
   VALUES (@id, @hash, @salt)
   ON CONFLICT(usuario_id) DO UPDATE SET
     password_hash = excluded.password_hash,
     password_salt = excluded.password_salt`,
).run({ id: usuario.id, hash: passwordHash, salt });

console.log(
  `Credenciales asignadas a "${usuario.nombre}" (tipo: ${usuario.tipo}, correo: ${correo}).`,
);
console.log("Ya puede iniciar sesión con POST /api/auth/login.");
