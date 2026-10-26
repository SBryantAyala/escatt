# Padrón de boletas

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
`coincide`, `no_coincide` o `sin_padron` (no hay padrón cargado).
