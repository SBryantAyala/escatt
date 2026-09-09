// Datos simulados usados SOLO como respaldo local mientras el backend real
// de /api/usuarios (a cargo de Bryan) no esté publicado en main.
// En cuanto el endpoint real responda, ListadoUsuarios deja de usar este
// archivo automáticamente — no requiere ningún cambio de código.
export const usuariosMock = [
  { id: 1, nombre: "Ana Torres", correo: "ana.torres@ipn.mx", rol: "sinodal", activo: 1, creado_en: "2026-08-01 10:15:00" },
  { id: 2, nombre: "Luis Ramírez", correo: "luis.ramirez@ipn.mx", rol: "sustentante", activo: 1, creado_en: "2026-08-03 09:40:00" },
  { id: 3, nombre: "Marta Gómez", correo: "marta.gomez@ipn.mx", rol: "usuario", activo: 0, creado_en: "2026-07-28 16:05:00" },
  { id: 4, nombre: "Diego Salinas", correo: "diego.salinas@ipn.mx", rol: "sinodal", activo: 1, creado_en: "2026-08-05 11:22:00" },
];
