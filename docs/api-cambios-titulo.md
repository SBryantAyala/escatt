# API de cambio de título

Vive en `backend/src/routes/cambios-titulo.js` y cuelga de
`/api/cambios-titulo`. Todas las rutas requieren
`Authorization: Bearer <token>`. Los errores son siempre
`{ "error": "texto legible" }` (400 datos inválidos, 403 sin permiso, 404 no
existe, 409 regla de negocio).

Base normativa: el Documento Rector pone en la CATT el dictamen de los cambios
a los protocolos (Art. 7 III) y prohíbe cambiar el título del TT una vez
aprobado el protocolo (Art. 44).

## Flujo

1. Los sinodales o directores observan el título (o no aprueban el protocolo).
   El alumno decide cambiarlo y solicita el cambio con el **formato firmado**
   (obligatorio) y, si quiere, el **protocolo corregido** (opcional).
2. El Secretario Ejecutivo o el Auxiliar de la CATT aprueba o rechaza.
3. Al **aprobar**:
   - el protocolo toma el título nuevo;
   - **la evaluación se reinicia**: los dictámenes y observaciones de los
     sinodales se archivan (`protocolo_evaluaciones_historial`) y cada sinodal
     queda otra vez sin evaluar. Los sinodales y la Academia se conservan;
   - si el protocolo estaba `no_aprobado`, vuelve a `en_evaluacion`; si estaba
     `registrado` o `en_evaluacion`, conserva su estado.
4. Al **rechazar**, el protocolo no cambia y el alumno puede enviar otra
   solicitud.
5. Si los sinodales **aprueban el protocolo** mientras hay una solicitud
   pendiente, esta se cierra sola como `rechazada` (después de la aprobación el
   título ya no cambia, Art. 44), con `resuelta_por` en `null` y el motivo en
   `observaciones_resolucion`.

Reglas:

- Un protocolo lo desarrolla un **equipo** (ver `docs/api-protocolos.md`). Solo
  el **responsable** del equipo puede pedir el cambio (`403` para los demás
  integrantes); todos los integrantes ven las solicitudes y su resultado.
- Aplica al protocolo **más reciente del que el alumno es responsable** y que
  está `registrado`, `en_evaluacion` o `no_aprobado`. Si no tiene ninguno así,
  se responde según su protocolo más reciente: `403` si es compañero, `409` si
  está `aprobado`.
- Una sola solicitud pendiente por protocolo.
- No hay ventana de calendario (depende del Calendario de Actividades, HU-27).
- Quien dirige o es sinodal del protocolo no puede resolver la solicitud
  (`403`), aunque tenga rol de CATT.
- Un protocolo `no_aprobado` que vuelve a evaluación cumple lo mismo que al
  registrarse: cada integrante con cuenta activa, `elegible` en el periodo del
  protocolo y sin otro protocolo vigente (`409`). Se avisa al solicitar, con un
  mensaje sin detalles, y se valida otra vez al aprobar con las filas del
  equipo bloqueadas, igual que el registro, para que nadie del equipo se
  registre en otro protocolo al mismo tiempo.

## Esquema

```
solicitudes_cambio_titulo
  id, protocolo_id, solicitante_id,
  titulo_anterior, titulo_propuesto, motivo,
  constancia_archivo, protocolo_archivo (NULL),
  estado ('pendiente' | 'aprobada' | 'rechazada'),
  resuelta_por, resuelta_en, observaciones_resolucion, creado_en

protocolo_evaluaciones_historial
  id, protocolo_id, docente_id, dictamen, observaciones, evaluado_en,
  titulo (el título que se evaluó), solicitud_id, archivada_en
```

Los documentos se guardan en `backend/uploads/cambios-titulo/`.

## Forma de una solicitud

```json
{
  "id": 4,
  "estado": "pendiente",
  "titulo_anterior": "…",
  "titulo_propuesto": "…",
  "motivo": "…",
  "tiene_protocolo": false,
  "creado_en": "2026-10-14T20:27:55.552Z",
  "resuelta_en": null,
  "resuelta_por": null,
  "observaciones_resolucion": null,
  "protocolo": { "id": 3, "titulo": "…", "estado": "registrado" },
  "alumno": { "id": 8, "nombre": "…", "boleta": "…", "carrera": "ISC" },
  "integrantes": [
    { "id": 8, "nombre": "…", "boleta": "…", "carrera": "ISC", "es_responsable": true },
    { "id": 9, "nombre": "…", "boleta": "…", "carrera": "ISC", "es_responsable": false }
  ]
}
```

`protocolo.titulo` es el título **actual**: mientras la solicitud está
pendiente o rechazada es igual a `titulo_anterior`; tras aprobarla, a
`titulo_propuesto`.

Al **personal CATT y al administrador** (`GET /api/cambios-titulo` y la
respuesta de `PATCH`) se les agregan dos arreglos; el alumno no los recibe:

```json
"evaluaciones_actuales": [
  { "sinodal": "…", "dictamen": "no_aprobado", "observaciones": "…", "evaluado_en": "…" }
],
"evaluaciones_previas": [
  { "solicitud_id": 2, "titulo": "título que se evaluó", "sinodal": "…",
    "dictamen": "aprobado", "observaciones": null, "evaluado_en": "…", "archivada_en": "…" }
]
```

`evaluaciones_actuales` es lo que hay hoy en el protocolo (lo que suele motivar
el cambio); `evaluaciones_previas` es lo archivado en reinicios anteriores,
agrupable por `solicitud_id`/`titulo`.

## Rutas

### `POST /api/cambios-titulo`
Solo el alumno responsable del equipo. **multipart/form-data**:

| Campo | Obligatorio | Notas |
|---|---|---|
| `titulo_propuesto` | sí | máx. 300 caracteres; los espacios repetidos se colapsan. Debe diferir del actual (sin contar mayúsculas, acentos ni espacios) |
| `motivo` | sí | máx. 2000 caracteres |
| `constancia` | sí | formato de cambio de título firmado; PDF/JPG/PNG, máx. 10 MB |
| `protocolo` | no | protocolo corregido con el título nuevo; mismos formatos |

`201` con la solicitud. El protocolo se toma de la sesión (ver "Reglas").
Errores: `400` datos inválidos o título igual al actual; `403` el alumno no es
el responsable; `409` sin protocolo, protocolo aprobado, ya hay una solicitud
pendiente o el equipo no podría volver a evaluación.

### `GET /api/cambios-titulo/mias`
Solo alumnos. Las solicitudes de los protocolos de su equipo (las envíe él o
un compañero), la más reciente primero.

### `GET /api/cambios-titulo?estado=pendiente|aprobada|rechazada`
Personal CATT (Ejecutivo, Auxiliar, Consulta) y administrador. Primero las
pendientes (la más antigua primero), luego las resueltas (la más reciente
primero). Trae **todas** las pendientes y solo las **100 resueltas más
recientes** (`MAX_RESUELTAS`). Incluye `evaluaciones_actuales` y
`evaluaciones_previas`.

### `GET /api/cambios-titulo/:id/constancia` y `/:id/protocolo`
Descarga el formato firmado / el protocolo corregido. Los ven los integrantes
del equipo, el personal CATT y el administrador. El **protocolo corregido**
también lo ven los sinodales, los directores docentes y el Presidente de la
academia del protocolo, porque es lo que se vuelve a evaluar. `404` si la
solicitud no incluye protocolo corregido o el archivo ya no está en el
servidor. Usa `descargarArchivo()` de `lib/api.js`.

### `PATCH /api/cambios-titulo/:id`
Solo `catt_ejecutivo` y `catt_auxiliar`. Body JSON
`{ "decision": "aprobada" | "rechazada", "observaciones": "…" }` → solicitud
(con evaluaciones, como en el listado).

- `observaciones` es obligatoria al rechazar (máx. 2000).
- `409` si la solicitud ya fue resuelta.
- Al aprobar se vuelve a validar dentro de la transacción: `409` si el
  protocolo ya fue aprobado, ya no admite el cambio o (si estaba
  `no_aprobado`) algún integrante no cumple para volver a evaluación; el
  mensaje dice quién y por qué. Rechazar siempre es posible.
- `403` si quien resuelve dirige o es sinodal del protocolo.

## Bitácora

Entidad `solicitudes_cambio_titulo`: `solicitar_cambio_titulo`,
`aprobar_cambio_titulo` (detalle: título anterior y nuevo, estado anterior y
nuevo, evaluaciones archivadas) y `rechazar_cambio_titulo` (con
`automatica: true` y sin usuario cuando se cerró sola al aprobarse el
protocolo).

## Efecto en otras rutas

- `GET /api/protocolos/*` muestra el título nuevo y, si el protocolo regresó a
  evaluación, los sinodales con `evaluo: false`. La ficha trae
  `protocolo_corregido_solicitud_id`: la solicitud aprobada más reciente que
  trae protocolo corregido (o `null`); la vista del sinodal la usa para
  "Ver protocolo corregido".
- Los sinodales vuelven a poder entregar su evaluación
  (`POST /api/protocolos/:id/evaluacion`).
- Un alumno o docente con solicitudes o evaluaciones archivadas no se puede
  eliminar (solo revocar), igual que con protocolos y evaluaciones.
- El alumno ya no ve en `GET /api/protocolos/mio` las observaciones del
  dictamen anterior (se archivaron); solo el personal CATT las consulta en
  `evaluaciones_previas`.
