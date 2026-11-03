# Padrón de boletas y alumnos de otras escuelas

Los errores son siempre `{ "error": "texto legible" }`. Todas las rutas
requieren `Authorization: Bearer <token>`.

## Padrón de boletas (cotejo del kárdex)

La CATT carga un CSV con las boletas vigentes para cotejar a quien sube su
kárdex, sin consultar el SAES. El cotejo es **informativo**: no bloquea ni
cambia la validación de elegibilidad, que sigue siendo del Secretario Ejecutivo.

### `GET /api/padron`
Administrador y personal CATT. Responde
`{ "cargado": true, "total": 1200, "archivo": "padron.csv", "cargado_en": "…", "cargado_por": "Nombre" }`
(`cargado: false` y `total: 0` si no hay padrón).

### `POST /api/padron`
Secretario Ejecutivo o Auxiliar (`403` para el resto). `multipart/form-data`
con el campo `archivo` (`.csv` o `.txt`, hasta 8 MB). Responde `201` con el
mismo objeto que el `GET`.
- Separador `,`, `;` o tabulador, con o sin BOM.
- Con encabezado debe haber columna `boleta`; `nombre` y `carrera` son
  opcionales. Sin encabezado, la primera columna es la boleta.
- Cada boleta tiene 10 dígitos y no se repite. Si hay errores se responde `400`
  con `{ "error": "…", "errores": ["línea 3: …"] }` (hasta 10) y no se carga nada.
- Reemplaza el padrón completo dentro de una transacción. Máximo 100 000 filas.
- Bitácora: `cargar_padron_boletas`.

### Cotejo en `GET /api/elegibilidad`
Cada solicitud trae `padron: { estado, nombre }` con `estado` igual a
`coincide`, `no_coincide`, `sin_padron` (no hay padrón cargado) o `no_aplica`
(alumno de otra escuela), y `tipo_evidencia`: `kardex` o `carta`.

## Alumnos de otras escuelas

Los da de alta la CATT; no se autorregistran. Participan con una **carta de
participación** en lugar de kárdex y pueden formar equipo con alumnos de ESCOM.

### `POST /api/usuarios` con `perfil: "alumno"` y `procedencia: "externa"`
Campos: `escuela_origen` (obligatoria, hasta 200), `carrera` (texto libre,
obligatoria, hasta 120), `boleta` (opcional, hasta 30, formato libre), más los
datos personales. El correo puede ser de cualquier dominio. No llevan plan de
estudios. `procedencia` omitida equivale a `"escom"` y mantiene las reglas
anteriores (boleta de 10 dígitos, carrera y plan del catálogo).

`PUT /api/usuarios/:id` permite editar `escuela_origen`, `carrera` y `boleta`
de un alumno externo.

### Efectos
- `GET /api/usuarios` y la sesión traen `procedencia` y `escuela_origen`.
- `POST /api/elegibilidad` pide la carta (`400` con el mensaje «carta de
  participación» si falta el archivo).
- En protocolos, equipos y cambios, la carrera de un alumno externo se muestra
  como `carrera · escuela de origen`.
- Esquema: `alumnos.procedencia` (`escom` | `externa`), `alumnos.escuela_origen`;
  `boleta` y `plan_estudios` admiten `NULL`; la boleta es única solo entre
  alumnos de ESCOM. Tablas `padron_boletas` y `padron_cargas`.
