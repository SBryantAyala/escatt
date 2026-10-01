# ESCATT — Código

Este repositorio contiene **únicamente el código** del proyecto ESCATT.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS (v4, compilado localmente)
- **Base de datos:** PostgreSQL (`pg`)

## Estructura

```
backend/
├── scripts/
│   ├── crear-admin.js           # crea el primer Administrador del sistema
│   ├── seed-demo-usuarios.js    # usuarios de prueba (uno o más por rol)
│   └── asignar-credenciales.js  # asigna contraseña a un usuario desde la terminal
└── src/
    ├── index.js        # arranque, registro de rutas y manejador de errores
    ├── db/index.js     # conexión, esquema (12 tablas) y migración del esquema anterior
    ├── lib/            # roles y permisos, sesiones, acceso a usuarios
    └── routes/         # auth, usuarios, academias, health
frontend/src/
├── App.jsx             # landing, login, registro de alumnos, cambio de contraseña obligatorio
├── lib/                # api, roles (espejo del backend), tema
├── components/         # layout del panel, chips de rol, íconos
└── pages/
    ├── Panel/          # navegación por roles
    ├── Usuarios/       # Listado (Alumnos / Docentes / Personal CATT), Alta, Detalle
    ├── MiCuenta/       # datos propios + cambio de contraseña
    └── CambiarPassword/
```

### Modelo de usuarios (Módulo 1)

- `usuarios` guarda lo común; los datos propios viven en tablas de **perfil**:
  `alumnos`, `empleados` → `docentes` / `personal_catt`.
- Los **roles** (`roles` + `usuario_roles`) dicen qué puede hacer cada quien; una
  persona puede tener varios (p. ej. docente + presidente de academia).
- Roles: `admin_sistema`, `catt_ejecutivo`, `catt_auxiliar`, `catt_consulta`,
  `docente`, `presidente_academia`, `alumno`.
- Solo los alumnos se registran solos (`@alumno.ipn.mx`). La CATT da de alta a
  alumnos y docentes; el Administrador del sistema da de alta al personal CATT.
  Las cuentas nuevas nacen con contraseña temporal.
- Lo normal es **revocar** una cuenta (baja lógica: conserva el historial y se
  puede reactivar). **Eliminar** borra la cuenta de forma permanente y solo se
  permite si no tiene historial (altas duplicadas o hechas por error).

## Requisitos

- Node.js **20 o superior** (probado con Node 25)
- npm

## Cómo correrlo en local

Abrí **dos terminales**.

### 1. Backend

Necesitas PostgreSQL con la base y el usuario de `.env` ya creados.

```bash
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:3000  (GET /api/health)
```

Al arrancar, el backend crea las tablas que falten. Si detecta el **esquema
anterior** (columna `usuarios.tipo`), lo migra solo al modelo de perfiles + roles
conservando ids y contraseñas: alumno → alumno, sinodal → docente (academia
"Sin academia asignada"), personal → Auxiliar CATT.

Después, una sola vez:

```bash
node scripts/crear-admin.js admin@ipn.mx "UnaClave123" "Nombre"   # primer administrador
node scripts/seed-demo-usuarios.js                                # opcional: datos de demo
```

El seed deja las credenciales en `scripts/credenciales-demo.txt` (no se sube a git).

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

  | Rama | Pantalla | Carpeta |
  |------|----------|---------|
  | `feature/listado-revocar-eliminar` | listado / revocar / eliminar | `frontend/src/pages/Listado/` |
  | `feature/alta-usuario`             | alta de usuario               | `frontend/src/pages/Alta/` |
  | `feature/consultar-modificar`      | consultar / modificar         | `frontend/src/pages/Detalle/` |

- Antes de empezar a trabajar y seguido: `git fetch origin && git merge origin/main`.
- Cada quien trabaja solo dentro de **su** carpeta en `frontend/src/pages/`
  (tabla de arriba) y consume la API ya fija bajo `/api/usuarios` — no toques
  archivos de los demás ni el router del backend, eso ya está cerrado.

## Documentación del proyecto

Contexto, requerimientos, entregas y sprints **no viven aquí**. Están en las
carpetas hermanas, fuera de `01-Codigo`:

- `00-Contexto-Proyecto/`
- `02-Requerimientos-y-Entregas/`
- `03-Sprints/`
