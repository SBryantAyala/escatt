# Revocar a un docente con asignaciones (HU-7)

Los errores son siempre `{ "error": "texto legible" }`. Todas las rutas
requieren `Authorization: Bearer <token>`.

Revocar **ya no se bloquea** por tener protocolos: la cuenta se revoca y el
sistema avisa qué queda pendiente.

### `GET /api/usuarios/:id/asignaciones`
Secretario Ejecutivo, Auxiliar o administrador. Responde
`{ "asignaciones": [{ "rol": "director" | "sinodal", "protocolo_id", "titulo", "estado", "pendiente", "descripcion" }] }`.
Cuenta director de protocolos `registrado`, `en_evaluacion` o `aprobado` y
sinodal de `registrado` o `en_evaluacion` (`pendiente`: aún no entrega su
evaluación).

### `PATCH /api/usuarios/:id/revocar`
Siempre procede. La bitácora anota `asignaciones_afectadas`. Un sinodal
revocado se sustituye con `PUT /api/protocolos/:id/sinodales`; un director,
con una solicitud de cambio de director del alumno.
