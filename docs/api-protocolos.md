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
| Presidenta de Ing. de Software | `mriverad@ipn.mx` | `DocenteDemo1` | HU-20 (sinodales) |
| Presidenta de Ciencias de la Computación | `sandra.diaz@ipn.mx` | `DocenteDemo1` | HU-20 |
| Sinodal con una evaluación pendiente | `gabriela.rincon@ipn.mx` | `DocenteDemo1` | HU-21 (evaluar) |
| Sinodal que ya evaluó (aprobó uno, rechazó otro) | `hector.zuniga@ipn.mx` | `DocenteDemo1` | HU-21 (consulta) |
| Director (y Consulta CATT) | `francisco.cabanas@ipn.mx` / `rosamaria.beltran@ipn.mx` | `DocenteDemo1` / `PersonalDemo1` | HU-25 / consulta |

El seed deja un protocolo en cada estado: dos `registrado` sin Academia, uno
`registrado` turnado a Ing. de Software sin sinodales, uno `en_evaluacion`
(un sinodal ya evaluó), uno `aprobado` y uno `no_aprobado` con observaciones.

## Ficha de protocolo

Todas las rutas (salvo `/candidatos-director` y `/companeros/validar`) responden con
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
  "integrantes": [
    { "id": 12, "nombre": "Jonathan Uriel Salazar Nava", "boleta": "2021630074", "carrera": "ISC", "es_responsable": true },
    { "id": 15, "nombre": "Emmanuel Rodrigo Barrera Solís", "boleta": "2020630156", "carrera": "IIA", "es_responsable": false }
  ],
  "directores": [
    { "id": 30, "externo_id": null, "externo": false, "nombre": "Francisco Javier Cabañas Ortiz" },
    { "id": null, "externo_id": 5, "externo": true, "nombre": "Mariana Soto Reyes", "institucion": "UNAM" }
  ],
  "academia": { "id": 2, "nombre": "Academia de Ingeniería de Software", "color": "…", "icono": "…" },
  "academia_asignada_en": "2026-10-14T19:55:01.000Z",
  "sinodales": [{ "id": 28, "nombre": "Claudia Berenice Espinoza Tovar", "evaluo": false }]
}
```

- `estado`: `registrado` → `en_evaluacion` → `aprobado` | `no_aprobado`.
- **Equipo:** el TT lo desarrolla uno o más alumnos (Art. 4: "preferentemente en
  equipo"). `integrantes` los lista a todos, con el **responsable primero**; las
  pantallas deben mostrar a todos, no solo a `alumno`. `alumno` es el
  responsable (quien registra el protocolo y envía las solicitudes de cambio)
  y se conserva por compatibilidad. Un protocolo individual tiene un solo
  integrante.
- `academia` es `null` hasta que se turna (HU-19).
- `sinodales` es `[]` hasta que el Presidente los asigna (HU-20).
- `directores` mezcla docentes y directores externos (ver "Directores
  externos"). En un docente `id` es su id de usuario y `externo` es `false`;
  en un externo `id` es `null`, `externo` es `true` y su identificador es
  `externo_id`. Para saber si alguien es director de la persona en sesión
  compara `id` solo cuando `externo` sea `false`.

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
| `directores_externos` | no | 1 id de `directores_externos` como máximo, mismo formato |
| `visto_bueno` | sí | constancia del visto bueno, PDF/JPG/PNG, máx. 10 MB |
| `integrantes` | no | correos de los compañeros de equipo: campo repetido, `"[\"a@…\"]"` o `"a@…,b@…"`. Quien registra es el responsable y no se incluye |

Nota (Art. 35 y 49 del Documento Rector): entre `directores` y
`directores_externos` suman 1 o 2, y al menos uno es docente de ESCOM; un
externo solo puede ir como segundo director. Un externo se registra antes con
`POST /api/directores-externos`, o se elige uno ya registrado.

`201` con la ficha. Errores:
- `409` si la elegibilidad del periodo más reciente del alumno no es `elegible`.
- `409` si ya tiene (o forma parte de) un protocolo `registrado`, `en_evaluacion` o `aprobado`.
- `400` si faltan campos, el total entre `directores` y `directores_externos` no es 1 o 2, no hay ningún docente, hay más de un externo, algún docente no está activo o el externo no existe.
- Compañeros: `400` si hay más de `MAX_INTEGRANTES` alumnos contando al responsable (hoy 4, constante en `lib/equipo.js`; el cliente aún no confirma el máximo), un correo inválido, repetido o propio, o sin cuenta de alumno activa; `409` si algún compañero no tiene elegibilidad vigente (`elegible`, como el responsable) o ya está en un protocolo vigente. Se revisa otra vez dentro de la transacción.

> Pendiente (HU-27): validar la ventana de registro con el Calendario de la CATT.

### `POST /api/protocolos/companeros/validar`
Solo alumnos. Body JSON `{ "correo": "…" }`. Comprueba, antes de registrar, que
el compañero puede entrar al equipo (mismas reglas de arriba) y responde
`{ "correo", "nombre", "carrera" }` para confirmarlo en pantalla (sin boleta).
`400`/`409` con el motivo si no puede.

### `GET /api/protocolos/mio`
Solo alumnos. Los protocolos de los que es integrante (responsable o
compañero), el más reciente primero (para ver el estado).

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
sinodal (solo `evaluo: true/false`). Solo el propio sinodal ve la suya; el
alumno y los directores las ven con el dictamen final (ver HU-22).

## HU-22 — Dictamen final

Sin ruta propia: se calcula al guardar cada evaluación (HU-21).

- `no_aprobado` en cuanto un sinodal evalúa `no_aprobado`, sin esperar a los otros dos.
- `aprobado` solo cuando los 3 sinodales evaluaron `aprobado`.
- Registra `dictamen_protocolo` en la bitácora (sin usuario: lo calcula el sistema).
- `GET /api/protocolos/mio` (alumno) y `GET /api/protocolos/dirigidos` (director)
  traen `observaciones`: `[{ sinodal, dictamen, observaciones, evaluado_en }]`,
  una por sinodal que dejó texto. Es `[]` mientras el protocolo siga
  `en_evaluacion`, para no exponer evaluaciones parciales.

## Directores externos

Un director que no es docente de ESCOM no tiene cuenta (Art. 49 del Documento
Rector). Se registra una sola vez, con su currículum y copia de su cédula
profesional de nivel superior; los externos recurrentes ya registrados se
eligen sin volver a entregar documentos. Se elige al registrar el protocolo
(`directores_externos`) o al pedir un cambio de director (ver
`api-cambios-director.md`), y nunca va solo: el protocolo siempre conserva al
menos un director docente de ESCOM. Un externo no inicia sesión: no aparece en
`GET /api/protocolos/dirigidos` ni en ninguna vista de docente.

### `POST /api/directores-externos`
Alumnos, `catt_ejecutivo` y `catt_auxiliar`. **multipart/form-data**:

| Campo | Obligatorio | Notas |
|---|---|---|
| `nombre` | sí | máx. 200 caracteres |
| `institucion` | sí | máx. 200 caracteres |
| `correo` | sí | correo válido |
| `cedula_numero` | sí | máx. 30 caracteres |
| `cedula` | sí | copia de la cédula, PDF/JPG/PNG, máx. 10 MB |
| `curriculum` | sí | mini currículum, PDF/JPG/PNG, máx. 10 MB |

`201` con
```json
{ "id": 5, "nombre": "Mariana Soto Reyes", "institucion": "UNAM", "correo": "msoto@unam.mx",
  "cedula_numero": "12345678", "creado_en": "2026-10-15T16:40:00.000Z" }
```
`400` si falta algo o el archivo no es válido. `409` si ya existe un externo con ese
correo: se elige de la lista en lugar de registrarlo otra vez.

### `GET /api/directores-externos`
El catálogo completo, por nombre. Es el selector de `directores_externos`.
Los alumnos reciben solo `id`, `nombre` e `institucion`; el personal CATT y el
admin reciben la misma forma que el `201`.

### `GET /api/directores-externos/:id/cedula` y `/curriculum`
Descargan el archivo. Los ve quien lo registró, el personal CATT y el
administrador; otros, `403`. Usa `descargarArchivo()` de `lib/api.js`.

Bitácora: `registrar_director_externo` (entidad `directores_externos`).

## Consulta común

### `GET /api/protocolos/:id`
Ficha. La ven: personal CATT y admin, los alumnos del equipo, sus directores,
sus sinodales y el Presidente de la academia a la que se turnó. Otros, `403`.

### `GET /api/protocolos/:id/visto-bueno`
Descarga la constancia (mismos permisos). Usa `descargarArchivo()` de `lib/api.js`.

### `GET /api/protocolos/dirigidos` (HU-25)
Protocolos donde la persona es director. Cada uno trae `alumno` (el
responsable) e `integrantes` (todo el equipo).

## Esquema (para HU-21, HU-22, HU-24)

```
protocolos            id, alumno_id, titulo, resumen, periodo, visto_bueno_archivo,
                      academia_id, academia_asignada_por, academia_asignada_en,
                      estado, creado_en
protocolo_directores  id, protocolo_id, docente_id (NULL), externo_id (NULL)
                      -- 1 o 2 por protocolo; exactamente uno de docente_id / externo_id
                      -- únicos (protocolo_id, docente_id) y (protocolo_id, externo_id)
directores_externos   id, nombre, institucion, correo, cedula_numero,
                      cedula_archivo, curriculum_archivo, registrado_por, creado_en
protocolo_integrantes (protocolo_id, alumno_id), es_responsable, agregado_en
                      -- un único responsable por protocolo (índice parcial);
                      -- protocolos.alumno_id es ese responsable y siempre tiene su fila
protocolo_sinodales   (protocolo_id, docente_id), asignado_por, asignado_en,
                      dictamen ('aprobado'|'no_aprobado'|NULL), observaciones, evaluado_en
```

Usa estas tablas y nombres tal cual; no crees tablas paralelas de protocolos,
directores o sinodales.

- **HU-22 (dictamen):** `alRegistrarEvaluacion()` llama a `aplicarDictamen()`
  (`lib/dictamen.js`) dentro de la transacción de cada evaluación: `no_aprobado`
  en cuanto una fila tenga `no_aprobado`, `aprobado` cuando las 3 tengan
  `aprobado`, y registra `dictamen_protocolo` en la bitácora. Las observaciones
  salen por `observacionesPorProtocolo()` en `GET /api/protocolos/mio` y
  `/dirigidos` (campo `observaciones`), solo con dictamen final.
- **HU-24 (cambio de director):** los directores vigentes están en
  `protocolo_directores`; al aprobarse la solicitud se reemplazan ahí. La
  solicitud en sí va en una tabla nueva (sugerencia: `solicitudes_cambio_director`
  con `protocolo_id`, `director_propuesto_id`, `motivo`, `estado`, …).
  Registra cada acción en la bitácora con `registrarBitacora()`.

Acciones de bitácora que ya existen: `registrar_protocolo`,
`turnar_protocolo_academia`, `asignar_sinodales`, `evaluar_protocolo`,
`dictamen_protocolo` (entidad `protocolos`).
