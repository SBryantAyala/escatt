# ESCATT — Código

Este repositorio contiene **únicamente el código** del proyecto ESCATT.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS (v4, compilado localmente)
- **Base de datos:** SQLite (`better-sqlite3`)

## Estructura

```
01-Codigo/
├── backend/            # API Express + acceso a SQLite
│   └── src/
│       ├── index.js    # arranque del servidor y registro de rutas
│       ├── db/          # conexión SQLite y esquema
│       └── routes/      # un archivo de rutas por recurso (health, usuarios, …)
└── frontend/           # App React (Vite + Tailwind)
    └── src/
        ├── main.jsx
        ├── App.jsx      # pantalla base: muestra el estado del backend
        └── index.css    # @import "tailwindcss";
```

## Requisitos

- Node.js **20 o superior** (probado con Node 25)
- npm

## Cómo correrlo en local

Abrí **dos terminales**.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:3000  (GET /api/health)
```

La base `escatt.db` se crea sola la primera vez, dentro de `backend/`. No se sube a git.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Vite hace proxy de `/api` al backend en el puerto 3000, así que no hay líos de CORS
en desarrollo. Si el backend está corriendo, la pantalla base muestra
`status: ok` y `db: conectada`.

## Flujo de trabajo (Git)

- `main` — rama estable e integradora. **Protegida**: solo se actualiza vía Pull Request aprobado.
- Cada integrante trabaja en su rama y abre PR a `main`:

  | Rama | Pantalla |
  |------|----------|
  | `feature/listado-revocar-eliminar` | listado / revocar / eliminar |
  | `feature/alta-usuario`             | alta de usuario |
  | `feature/consultar-modificar`      | consultar / modificar |

- Antes de empezar a trabajar y seguido: `git fetch origin && git merge origin/main`.
- Cada quien registra **su** router en `backend/src/index.js` y crea **su** archivo
  en `backend/src/routes/`, para no chocar con los demás.

## Documentación del proyecto

Contexto, requerimientos, entregas y sprints **no viven aquí**. Están en las
carpetas hermanas, fuera de `01-Codigo`:

- `00-Contexto-Proyecto/`
- `02-Requerimientos-y-Entregas/`
- `03-Sprints/`
