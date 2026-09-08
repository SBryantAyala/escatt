# ESCATT — Código

Este repositorio contiene **únicamente el código** del proyecto ESCATT.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS (compilado localmente)
- **Base de datos:** SQLite

## Estructura prevista

```
01-Codigo/
├── backend/    # API Express + acceso a SQLite
└── frontend/   # App React (Vite + Tailwind)
```

## Documentación del proyecto

El detalle de contexto, requerimientos, entregas y sprints **no vive aquí**. Está
en las carpetas hermanas, fuera de `01-Codigo`:

- `00-Contexto-Proyecto/`
- `02-Requerimientos-y-Entregas/`
- `03-Sprints/`

## Ramas

- `main` — rama estable e integradora.
- `feature/listado-revocar-eliminar` — pantalla de listado / revocar / eliminar.
- `feature/alta-usuario` — pantalla de alta de usuario.
- `feature/consultar-modificar` — pantalla de consultar / modificar.

Cada integrante trabaja en su rama `feature/*` y luego integra a `main` mediante Pull Request.
