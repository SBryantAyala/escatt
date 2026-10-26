# Pruebas de los ajustes de la entrevista

No hay CI: las pruebas se corren a mano contra una base de pruebas con los datos demo.
Ambas suites **modifican los datos**; reinicia la base entre corridas.

## Base y API de prueba

```bash
createdb -U escatt escatt_pruebas            # o CREATE DATABASE desde psql
cd backend
cp .env.example .env                         # PGDATABASE=escatt_pruebas
npm install
npm run dev                                  # API en http://localhost:3000
node scripts/seed-demo-usuarios.js
node scripts/seed-demo-protocolos.js
```

Para reiniciar: `dropdb escatt_pruebas && createdb escatt_pruebas`, reiniciar la API
(crea las tablas) y volver a correr los dos seeds.

## Integración del backend (74 verificaciones)

```bash
cd backend
node pruebas/ajustes.mjs                     # todas las secciones
SECCIONES=A node pruebas/ajustes.mjs         # solo una o varias (p. ej. AB)
```

Usa `API_URL` (por defecto `http://localhost:3000/api`) y las variables `PG*` de
`backend/.env.example`. Cada sección corresponde a una rama:

| Sección | Qué prueba | Rama |
|---|---|---|
| A | HU-7: asignaciones y revocar sin bloqueo | `feature/hu7-revocar-docente` |
| B | Reemplazo de sinodal | `feature/sinodales` |
| C | Padrón de boletas y cotejo | `feature/padron-karded` |
| D | Alumnos de otras escuelas | `feature/alumnos-externos` (sobre la anterior) |

## Interfaz con Playwright (39 verificaciones)

Necesita las cuatro ramas integradas, la API y Vite levantados, y `psql` con las
variables `PG*` apuntando a la misma base.

```bash
cd frontend
npm run dev                                  # http://localhost:5173
npm install --no-save playwright
npx playwright install chromium
PGHOST=localhost PGUSER=escatt PGPASSWORD=escatt_dev PGDATABASE=escatt_pruebas node e2e/ajustes.mjs
```

Variables opcionales: `BASE_URL`, `API_ORIGIN` y `CAPTURAS` (carpeta de capturas; por
defecto una carpeta temporal). Incluye una verificación a 390 px sin scroll horizontal.
