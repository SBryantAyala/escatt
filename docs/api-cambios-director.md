# API de cambio de director (HU-24)

Vive en `backend/src/routes/cambios-director.js` y cuelga de
`/api/cambios-director`. Todas las rutas requieren
`Authorization: Bearer <token>`. Los errores son siempre
`{ "error": "texto legible" }` (400 datos inválidos, 403 sin permiso, 404 no
existe, 409 regla de negocio).

## Flujo

1. El alumno solicita sustituir a uno de los directores de su protocolo vigente
   (`registrado`, `en_evaluacion` o `aprobado`) por otro docente, con el motivo
   y la constancia firmada del acuerdo.
2. El Secretario Ejecutivo o el Auxiliar de la CATT aprueba o rechaza.
3. Al aprobar, el director saliente se reemplaza por el propuesto en
   `protocolo_directores`. Al rechazar, los directores no cambian.

Solo puede haber una solicitud pendiente por protocolo; tras resolverla se
puede enviar otra.

## Esquema

```
solicitudes_cambio_director
  id, protocolo_id, solicitante_id,
  director_saliente_id, director_propuesto_id,
  motivo, constancia_archivo,
  estado ('pendiente' | 'aprobada' | 'rechazada'),
  resuelta_por, resuelta_en, observaciones_resolucion, creado_en
```

Las constancias se guardan en `backend/uploads/cambios-director/`.

## Forma de una solicitud

```json
{
  "id": 4,
  "estado": "pendiente",
  "motivo": "…",
  "creado_en": "2026-10-14T20:27:55.552Z",
  "resuelta_en": null,
  "resuelta_por": null,
  "observaciones_resolucion": null,
  "protocolo": { "id": 3, "titulo": "…", "estado": "registrado" },
  "alumno": { "id": 8, "nombre": "…", "boleta": "…", "carrera": "ISC" },
  "director_saliente": { "id": 30, "nombre": "…" },
  "director_propuesto": { "id": 28, "nombre": "…" }
}
```

## Rutas

### `POST /api/cambios-director`
Solo alumnos. **multipart/form-data**:

| Campo | Obligatorio | Notas |
|---|---|---|
| `director_saliente_id` | sí | debe dirigir el protocolo del alumno |
| `director_propuesto_id` | sí | docente activo que no dirija ya el protocolo ni sea su sinodal |
| `motivo` | sí | máx. 2000 caracteres |
| `constancia` | sí | PDF/JPG/PNG, máx. 10 MB |

`201` con la solicitud. El protocolo se toma de la sesión: el alumno vigente
más reciente. Errores: `400` datos o director inválido, `409` sin protocolo
vigente o ya hay una solicitud pendiente.

El selector del formulario usa `GET /api/protocolos/candidatos-director`.

### `GET /api/cambios-director/mias`
Solo alumnos. Sus solicitudes, la más reciente primero.

### `GET /api/cambios-director?estado=pendiente|aprobada|rechazada`
Personal CATT (Ejecutivo, Auxiliar, Consulta) y administrador. Primero las
pendientes (la más antigua primero), luego las resueltas (la más reciente
primero).

### `GET /api/cambios-director/:id/constancia`
Descarga la constancia. La ven el alumno que la envió, el personal CATT y el
administrador. Usa `descargarArchivo()` de `lib/api.js`.

### `PATCH /api/cambios-director/:id`
Solo `catt_ejecutivo` y `catt_auxiliar`. Body JSON
`{ "decision": "aprobada" | "rechazada", "observaciones": "…" }` → solicitud.

- `observaciones` es obligatoria al rechazar (máx. 2000).
- `409` si la solicitud ya fue resuelta.
- Al aprobar se vuelve a validar dentro de la transacción: el protocolo sigue
  vigente, el saliente sigue siendo director y el propuesto sigue siendo un
  docente activo que no dirige ni evalúa el protocolo (`409` si algo cambió).
- `403` si quien resuelve es el director saliente o el propuesto.

## Bitácora

Entidad `solicitudes_cambio_director`: `solicitar_cambio_director`,
`aprobar_cambio_director`, `rechazar_cambio_director`.

## Efecto en otras rutas

- `GET /api/protocolos/dirigidos` y la ficha del protocolo ya reflejan el
  cambio: el director anterior deja de verlo y el nuevo lo ve.
- Un docente que aparece en una solicitud no se puede eliminar (solo
  revocar), igual que con protocolos y evaluaciones.
