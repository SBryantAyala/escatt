# API de protocolos (Módulo 2)

Contrato del backend de HU-18, HU-19, HU-20 y HU-21, y el esquema sobre el
que se construyen HU-22, HU-24 y HU-25. Todo vive en
`backend/src/routes/protocolos.js` y cuelga de `/api/protocolos`.

Todas las rutas requieren `Authorization: Bearer <token>`. Los errores son
siempre `{ "error": "texto legible" }` con el código HTTP correspondiente
(400 datos inválidos, 403 sin permiso, 404 no existe, 409 regla de negocio).

## Datos de prueba

```bash
cd backend
node scripts/seed-demo-usuarios.js
node scripts/seed-demo-protocolos.js
```

| Quién | Correo | Contraseña | Para probar |
|---|---|---|---|
| Alumno elegible sin protocolo | `jonathan.salazar@alumno.ipn.mx` | `AlumnoDemo1` | HU-18 (registrar) |
| Secretario Ejecutivo | `karla.islas@ipn.mx` | `PersonalDemo1` | HU-19 (turnar) |
| Presidente de Ing. de Software | `roberto.mendoza@ipn.mx` | `DocenteDemo1` | HU-20 (sinodales) |
| Presidenta de Ciencias de la Computación | `patricia.guzman@ipn.mx` | `DocenteDemo1` | HU-20 |
| Sinodal con una evaluación pendiente | `gabriela.rincon@ipn.mx` | `DocenteDemo1` | HU-21 (evaluar) |
| Sinodal que ya evaluó (aprobó uno, rechazó otro) | `hector.zuniga@ipn.mx` | `DocenteDemo1` | HU-21 (consulta) |
| Director (y Consulta CATT) | `francisco.cabanas@ipn.mx` / `rosamaria.beltran@ipn.mx` | `DocenteDemo1` / `PersonalDemo1` | HU-25 / consulta |

El seed deja un protocolo en cada estado: dos `registrado` sin Academia, uno
`registrado` turnado a Ing. de Software sin sinodales, uno `en_evaluacion`
(un sinodal ya evaluó), uno `aprobado` y uno `no_aprobado` con observaciones.

## Ficha de protocolo

Todas las rutas (salvo `/dirigidos` y `/candidatos-director`) responden con
esta forma, o un arreglo de ella. Después de cualquier escritura, el frontend
puede reemplazar la fila con la respuesta tal cual.

```json
{
  "id": 7,
  "titulo": "Mi TT",
  "resumen": "Objetivo…",
  "periodo": "2026-2",
  "estado": "registrado",
  "creado_en": "2026-10-14T19:54:25.918Z",
  "tiene_visto_bueno": true,
  "alumno": { "id": 12, "nombre": "Jonathan Uriel Salazar Nava", "boleta": "2021630074", "carrera": "ISC" },
  "directores": [{ "id": 30, "nombre": "Francisco Javier Cabañas Ortiz" }],
  "academia": { "id": 2, "nombre": "Academia de Ingeniería de Software", "color": "…", "icono": "…" },
  "academia_asignada_en": "2026-10-14T19:55:01.000Z",
  "sinodales": [{ "id": 28, "nombre": "Claudia Berenice Espinoza Tovar", "evaluo": false }]
}
```

- `estado`: `registrado` → `en_evaluacion` → `aprobado` | `no_aprobado`.
- `academia` es `null` hasta que se turna (HU-19).
- `sinodales` es `[]` hasta que el Presidente los asigna (HU-20).

## HU-18 — Registrar protocolo (alumno)

### `GET /api/protocolos/candidatos-director`
Solo alumnos. Docentes activos para el selector de director(es).
```json
[{ "id": 30, "nombre": "Francisco Javier Cabañas Ortiz", "academia_id": 3, "academia": "Academia de Sistemas Distribuidos" }]
```

### `POST /api/protocolos`
Solo alumnos. **multipart/form-data** (con `api()` de `lib/api.js`, pasa un `FormData`):

| Campo | Obligatorio | Notas |
|---|---|---|
| `titulo` | sí | máx. 300 caracteres |
| `resumen` | sí | resumen/objetivo, máx. 5000 |
| `directores` | sí | 1 o 2 ids de docente: campo repetido, `"[1,2]"` o `"1,2"` |
| `visto_bueno` | sí | constancia del visto bueno, PDF/JPG/PNG, máx. 10 MB |

`201` con la ficha. Errores:
- `409` si la elegibilidad del periodo más reciente del alumno no es `elegible`.
- `409` si ya tiene un protocolo `registrado`, `en_evaluacion` o `aprobado`.
- `400` si faltan campos, hay 0 o más de 2 directores, o algún director no es docente activo.

> Pendiente (HU-27): validar la ventana de registro con el Calendario de la CATT.

### `GET /api/protocolos/mio`
Solo alumnos. Sus protocolos, el más reciente primero (para ver el estado).

## HU-19 — Turnar a Academia (Secretario Ejecutivo)

### `GET /api/protocolos?academia=sin_asignar`
Lista para la pantalla de HU-19. Filtros (combinables):
- `academia`: `sin_asignar` o un id de academia.
- `estado`: `registrado`, `en_evaluacion`, `aprobado`, `no_aprobado`.

Quién puede: personal CATT y admin (todos los protocolos). Un Presidente de
Academia solo recibe los de **su** academia (ignora `academia`). Cualquier
otro, `403`. Orden: el más antiguo primero (cola de trabajo).

Para el selector de academias usa `GET /api/academias` (solo devuelve activas).

### `PATCH /api/protocolos/:id/academia`
Solo `catt_ejecutivo`. Body JSON `{ "academia_id": 2 }` → ficha.
- Sirve para turnar y para corregir, **mientras** el protocolo esté
  `registrado` y sin sinodales; si no, `409`.
- `404` si la academia no existe; `409` si está inactiva.
- La base rechaza que un protocolo salga de `registrado` sin Academia
  (restricción `protocolos_academia_antes_de_evaluar`).

## HU-20 — Asignar sinodales (Presidente de Academia)

### `GET /api/protocolos`
Para el Presidente: los protocolos turnados a su academia. Los pendientes de
sinodales son los de `estado: "registrado"` (o `sinodales.length === 0`).

Candidatos a sinodal: `GET /api/academias/:id` → `integrantes` (el
Presidente ya tiene acceso a su academia). Filtra los `activo: false` y a
los directores del protocolo.

### `PUT /api/protocolos/:id/sinodales`
Body JSON `{ "sinodales": [28, 31, 14] }` → ficha con `estado: "en_evaluacion"`.
- Solo el Presidente de la academia a la que se turnó el protocolo (`403`).
- Exactamente 3 ids distintos (`400`).
- Cada uno debe ser docente activo de esa academia y no ser director del protocolo (`400`).
- Reemplaza la terna completa; se puede corregir mientras ningún sinodal haya
  evaluado. Después, o si el protocolo ya tiene dictamen, `409`.

## HU-21 — Evaluar protocolo (sinodal)

### `GET /api/protocolos/por-evaluar`
Solo cuentas con perfil de docente. Protocolos donde la persona es sinodal,
primero los pendientes. Cada elemento es la ficha más `mi_evaluacion`:

```json
{ "...ficha": "…", "mi_evaluacion": null }
{ "...ficha": "…", "mi_evaluacion": { "dictamen": "no_aprobado", "observaciones": "…", "evaluado_en": "…" } }
```

`null` = todavía no la entrega. Se puede evaluar si `mi_evaluacion` es `null`
**y** `estado` es `en_evaluacion`.

### `POST /api/protocolos/:id/evaluacion`
Body JSON `{ "dictamen": "aprobado" | "no_aprobado", "observaciones": "…" }`
→ `201` con la ficha y `mi_evaluacion`.
- `observaciones` es obligatoria si es `no_aprobado` (máx. 5000), opcional si es `aprobado` (`400`).
- Solo un sinodal asignado a ese protocolo (`403`).
- Una vez entregada no se puede modificar (`409`).
- Solo mientras el protocolo esté `en_evaluacion` (`409`).

> Pendiente (HU-27): validar el plazo de entrega con el Calendario de la CATT.

La ficha común **no** expone el dictamen ni las observaciones de cada
sinodal (solo `evaluo: true/false`). Solo el propio sinodal ve la suya.

## Consulta común

### `GET /api/protocolos/:id`
Ficha. La ven: personal CATT y admin, el alumno dueño, sus directores, sus
sinodales y el Presidente de la academia a la que se turnó. Otros, `403`.

### `GET /api/protocolos/:id/visto-bueno`
Descarga la constancia (mismos permisos). Usa `descargarArchivo()` de `lib/api.js`.

### `GET /api/protocolos/dirigidos` (HU-25, sin cambios)
Protocolos donde la persona es director.

## Esquema (para HU-21, HU-22, HU-24)

```
protocolos            id, alumno_id, titulo, resumen, periodo, visto_bueno_archivo,
                      academia_id, academia_asignada_por, academia_asignada_en,
                      estado, creado_en
protocolo_directores  (protocolo_id, docente_id)                 -- 1 o 2
protocolo_sinodales   (protocolo_id, docente_id), asignado_por, asignado_en,
                      dictamen ('aprobado'|'no_aprobado'|NULL), observaciones, evaluado_en
```

Usa estas tablas y nombres tal cual; no crees tablas paralelas de protocolos,
directores o sinodales.

- **HU-22 (dictamen):** HU-21 ya guarda la evaluación de cada sinodal en su
  fila de `protocolo_sinodales` (`dictamen`, `observaciones`, `evaluado_en`;
  `NULL` = no ha evaluado). Faltan dos funciones en `routes/protocolos.js`,
  que ya se llaman desde las rutas:
  - `alRegistrarEvaluacion(client, protocoloId)`: corre dentro de la
    transacción, después de cada evaluación. Escribe el dictamen final en
    `protocolos.estado`: `no_aprobado` en cuanto una fila tenga `no_aprobado`,
    y `aprobado` cuando las 3 tengan `aprobado`.
  - `observacionesPorProtocolo()`: para que alumno y director vean las
    observaciones (ya la usa `/dirigidos`).
- **HU-24 (cambio de director):** los directores vigentes están en
  `protocolo_directores`; al aprobarse la solicitud se reemplazan ahí. La
  solicitud en sí va en una tabla nueva (sugerencia: `solicitudes_cambio_director`
  con `protocolo_id`, `director_propuesto_id`, `motivo`, `estado`, …).
  Registra cada acción en la bitácora con `registrarBitacora()`.

Acciones de bitácora que ya existen: `registrar_protocolo`,
`turnar_protocolo_academia`, `asignar_sinodales`, `evaluar_protocolo`
(entidad `protocolos`).
