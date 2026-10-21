# API de sesiones y acuerdos de la CATT

Vive en `backend/src/routes/sesiones.js` y cuelga de `/api/sesiones`. Todas las
rutas requieren `Authorization: Bearer <token>`. Los errores son siempre
`{ "error": "texto legible" }` (400 datos inválidos, 403 sin permiso, 404 no
existe, 409 regla de negocio).

Fuente: Documento Rector de TT, Art. 8 (integrantes de la CATT), Art. 10
fracciones III y IV (el Secretario Ejecutivo convoca y elabora las minutas) y
Art. 11 (los Presidentes de Academia comunican los acuerdos a su Academia).

## Quién puede qué

| Acción | Roles |
|---|---|
| Consultar sesiones, asistentes, acuerdos y minuta | `catt_ejecutivo`, `catt_auxiliar`, `catt_consulta`, `admin_sistema`, `presidente_academia` |
| Crear y editar sesiones, asistencia, acuerdos, minuta | `catt_ejecutivo`, `catt_auxiliar` |

Alumnos y docentes sin cargo reciben `403`.

## Flujo de una sesión

1. El personal CATT **convoca**: `POST /api/sesiones` con fecha, tipo, lugar y
   orden del día. El sistema arma la lista de integrantes.
2. Durante o después de la reunión se marca quién asistió
   (`PUT /:id/asistencia`) y se capturan los acuerdos
   (`POST /:id/acuerdos`).
3. La sesión se cierra con `PATCH /:id { "estado": "realizada" }` (exige al
   menos un asistente presente) o se cancela con `"cancelada"`.
4. Con la sesión `realizada` se sube la minuta firmada (`POST /:id/minuta`).
5. Los acuerdos tienen seguimiento propio: `pendiente` → `en_proceso` →
   `cumplido` (o `cancelado`). Los Presidentes de Academia los consultan con
   `GET /api/sesiones/acuerdos?estado=abiertos`.

Una sesión `cancelada` ya no se modifica en nada. Una `realizada` ya no cambia
de tipo, fecha ni estado, pero sí admite acuerdos, más asistentes, orden del
día, lugar y la minuta.

## Integrantes de la sesión

Al crear la sesión se guarda una **copia** de sus integrantes, para que el
acta no cambie si después cambia un presidente:

- Los **Presidentes de Academia** de las academias activas (cargo
  `Presidente de Academia · <academia>`), con su `usuario_id`.
- Los **expresidentes inmediatos** de esas academias (Art. 8 VI; cargo
  `Expresidente de Academia · <academia>`), con su `usuario_id`.
- Solo personas con cuenta `activa`, y **una vez cada una**: si alguien tiene
  dos cargos (p. ej. expresidente de una academia y presidente de otra), sus
  cargos van juntos en `cargo`, separados por " y ".
- Los integrantes sin cuenta (Director, Subdirector Académico, Jefes de
  Departamento, etc.) **se heredan de la última sesión no cancelada**. Se
  agregan a mano con `POST /:id/asistentes`; `usuario_id` es `null`.

`GET /api/sesiones/integrantes` devuelve la parte automática (presidentes y
expresidentes) tal como se copiaría hoy.

### Expresidente de academia

`academias.expresidente_id` se llena solo:

- `PUT /api/academias/:id/presidente` con otro docente: el presidente anterior
  queda como expresidente.
- `DELETE /api/academias/:id/presidente`: el presidente quitado queda como
  expresidente.
- Asignar presidente a una academia sin presidente no borra al expresidente,
  salvo que se asigne a esa misma persona (entonces se limpia).

`PUT /api/academias/:id/expresidente { "docente_id": 12 | null }` (solo
`catt_ejecutivo`) lo corrige a mano; sirve para las academias que cambiaron de
presidente antes de que existiera el campo. `409` si es el presidente actual,
`400` si el docente no existe, no pertenece a esa academia o no tiene la
cuenta activa (las mismas reglas que el presidente). `GET /api/academias` y `GET /api/academias/:id`
traen `expresidente` (`{ id, nombre_completo, iniciales }` o `null`).

## Esquema

```
sesiones_catt
  id, tipo ('ordinaria' | 'extraordinaria'), fecha_hora, lugar,
  estado ('convocada' | 'realizada' | 'cancelada'),
  orden_del_dia, presidida_por, minuta_archivo,
  creada_por, creado_en, actualizado_en

sesion_asistentes
  id, sesion_id, usuario_id (NULL si no tiene cuenta), nombre, cargo, asistio

acuerdos_catt
  id, sesion_id, numero (consecutivo por sesión), descripcion, responsable,
  fecha_compromiso, estado ('pendiente' | 'en_proceso' | 'cumplido' | 'cancelado'),
  observaciones, protocolo_id (NULL), cumplido_en, creado_en, actualizado_en
```

Las minutas se guardan en `backend/uploads/sesiones/` (PDF, JPG o PNG, máx.
10 MB).

## Formas de respuesta

Resumen (listado):

```json
{
  "id": 3, "tipo": "ordinaria", "fecha_hora": "2026-11-02T16:00:00.000Z",
  "lugar": "Sala de juntas", "estado": "realizada", "tiene_minuta": true,
  "total_asistentes": 15, "asistieron": 6,
  "total_acuerdos": 2, "acuerdos_abiertos": 1
}
```

Detalle (`GET /:id` y la respuesta de **toda** escritura, para que el frontend
reemplace su estado tal cual):

```json
{
  "id": 3, "tipo": "ordinaria", "fecha_hora": "…", "lugar": "Sala B",
  "estado": "realizada", "orden_del_dia": "…", "presidida_por": "Subdirector Académico",
  "tiene_minuta": true, "creado_en": "…",
  "creada_por": { "id": 40, "nombre": "…" },
  "asistentes": [
    { "id": 51, "usuario_id": 30, "nombre": "…", "cargo": "Presidente de Academia · …", "asistio": true },
    { "id": 60, "usuario_id": null, "nombre": "…", "cargo": "Directora (Presidente de la CATT)", "asistio": false }
  ],
  "acuerdos": [
    {
      "id": 7, "numero": 1, "descripcion": "…", "responsable": "Secretario Ejecutivo",
      "fecha_compromiso": "2026-11-15", "estado": "pendiente", "observaciones": null,
      "cumplido_en": null, "protocolo": { "id": 4, "titulo": "…" }
    }
  ]
}
```

`protocolo` es `null` si el acuerdo no se refiere a uno. `fecha_compromiso` es
una fecha `AAAA-MM-DD` sin hora.

## Rutas

### `GET /api/sesiones?estado=convocada|realizada|cancelada`
Resúmenes, la más reciente primero.

### `GET /api/sesiones/integrantes`
Presidentes y expresidentes de academias activas:
`[{ "usuario_id": 30, "nombre": "…", "cargo": "…" }]`.

### `GET /api/sesiones/acuerdos?estado=abiertos|pendiente|en_proceso|cumplido|cancelado`
Acuerdos de todas las sesiones no canceladas, de la sesión más reciente a la
más antigua. `abiertos` = `pendiente` + `en_proceso`. Sin `estado`, todos.
Cada acuerdo agrega `sesion: { id, tipo, fecha_hora }`.

### `POST /api/sesiones`
Body JSON:

| Campo | Obligatorio | Notas |
|---|---|---|
| `fecha_hora` | sí | fecha y hora válidas (ISO 8601); puede ser pasada, para capturar sesiones ya ocurridas |
| `tipo` | no | `ordinaria` (por omisión) o `extraordinaria` |
| `lugar` | no | máx. 200 |
| `orden_del_dia` | no | máx. 5000 |

`201` con el detalle (ya con los integrantes copiados).

### `GET /api/sesiones/:id`
Detalle.

### `PATCH /api/sesiones/:id`
Body JSON con cualquiera de: `tipo`, `fecha_hora`, `lugar`, `orden_del_dia`,
`presidida_por` (máx. 200), `estado` (`realizada` o `cancelada`). `lugar`,
`orden_del_dia` y `presidida_por` aceptan `null` para vaciarlos.

- `409` si la sesión está cancelada.
- `409` si está realizada y se intenta cambiar `tipo`, `fecha_hora` o `estado`.
- `409` al marcarla `realizada` sin ningún asistente presente.

### `PUT /api/sesiones/:id/asistencia`
Body `{ "asistieron": [51, 52, …] }` (ids de `asistentes`): esos quedan
presentes y todos los demás ausentes. `400` si algún id no es de la sesión;
`409` si está cancelada, o si está realizada y la lista queda vacía.

### `POST /api/sesiones/:id/asistentes`
Body `{ "nombre": "…", "cargo": "…" }` (máx. 200 cada uno). Agrega a un
integrante sin cuenta, ausente por omisión. `201` con el detalle. `409` si la
sesión está cancelada.

### `DELETE /api/sesiones/:id/asistentes/:asistenteId`
Quita a un integrante. Solo mientras la sesión está `convocada` (`409` si no).

### `POST /api/sesiones/:id/acuerdos`
Body JSON:

| Campo | Obligatorio | Notas |
|---|---|---|
| `descripcion` | sí | máx. 5000 |
| `responsable` | no | texto libre, máx. 200 |
| `fecha_compromiso` | no | `AAAA-MM-DD`, un día que exista (`2026-02-30` es `400`) |
| `observaciones` | no | máx. 2000 |
| `protocolo_id` | no | protocolo al que se refiere; `400` si no existe |
| `estado` | no | `pendiente` (por omisión); `400` si es `cumplido` |

El `numero` es consecutivo dentro de la sesión. `201` con el detalle. `409` si
la sesión está cancelada, o si está `convocada` y todavía no llega su
`fecha_hora` (los acuerdos se capturan durante la sesión o después).

### `PATCH /api/sesiones/:id/acuerdos/:acuerdoId`
Cualquiera de los campos anteriores. Al pasar a `cumplido` se guarda
`cumplido_en`; al pasar a cualquier otro estado se limpia. No hay borrado: un
acuerdo equivocado se marca `cancelado`. `404` si el acuerdo no es de esa
sesión.

### `POST /api/sesiones/:id/minuta`
**multipart/form-data**, campo `minuta` (PDF/JPG/PNG, máx. 10 MB). Solo con la
sesión `realizada` (`409`). Si ya había una minuta, la reemplaza y borra el
archivo anterior. `201` con el detalle.

### `GET /api/sesiones/:id/minuta`
Descarga la minuta (usa `descargarArchivo()` de `lib/api.js`). `404` si no hay,
o si el archivo ya no está en el servidor.

## Bitácora

Entidad `sesiones_catt`: `crear_sesion`, `editar_sesion`, `cerrar_sesion`,
`cancelar_sesion`, `registrar_asistencia`, `agregar_asistente`,
`quitar_asistente`, `crear_acuerdo`, `actualizar_acuerdo`, `subir_minuta`.
Entidad `academias`: `definir_expresidente`; `cambiar_presidente` ahora
incluye `expresidente` en el detalle.

## Pendiente

- Enviar la convocatoria por correo (Art. 10 III): el sistema no tiene correo
  saliente; hoy solo registra la sesión.
- El expresidente es un docente sin rol propio: aparece en la lista de
  integrantes pero no inicia sesión con permisos de consulta.
- El Director y el Subdirector Académico no tienen cuenta; se capturan como
  integrantes sin cuenta.
