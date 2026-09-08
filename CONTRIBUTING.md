# Cómo contribuir al código de ESCATT

Esta guía es para el equipo (Edgar, Joshua, Eduardo). Está pensada para que
no haga falta saber mucho de git: seguí los pasos en orden y vas a estar bien.

**Stack del proyecto:** backend Node.js + Express + SQLite · frontend React + Vite + Tailwind CSS.

---

## 0. Una sola vez: clonar el repo

```bash
git clone https://github.com/SBryantAyala/escatt.git
cd escatt
```

Si ya lo clonaste antes, no lo vuelvas a hacer. Solo entrá a la carpeta.

---

## 1. Bajar TU rama y empezar a trabajar

Cada quien tiene **su propia rama**. No trabajes en `main` ni en la rama de otro.

| Persona | Rama |
|---------|------|
| Edgar   | `feature/listado-revocar-eliminar` |
| Joshua  | `feature/alta-usuario` |
| Eduardo | `feature/consultar-modificar` |

Para pararte en tu rama (ejemplo, Joshua):

```bash
git fetch origin
git checkout feature/alta-usuario
```

- `git fetch origin` baja la info más reciente de GitHub (no cambia tus archivos todavía).
- `git checkout feature/alta-usuario` te mueve a tu rama.

Comprobá en qué rama estás cuando quieras:

```bash
git branch --show-current
```

Tiene que decir el nombre de **tu** rama antes de empezar a tocar archivos.

### Levantar el proyecto en local

En **dos terminales** distintas:

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
npm install
npm run dev            # queda escuchando en http://localhost:3000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev            # abrí http://localhost:5173
```

---

## 2. Mantener tu rama actualizada con `main`

Mientras vos trabajás en tu pantalla, los demás van integrando las suyas a `main`.
Si no traés esos cambios seguido, después el Pull Request se llena de conflictos.

**Comando (parado en tu rama):**

```bash
git fetch origin
git merge origin/main
```

**¿Cuándo hacerlo?**

- Al empezar a trabajar cada día.
- Justo antes de abrir tu Pull Request.
- Cuando en el grupo avisen "ya mergeé lo mío a main".

**Antes de hacer `merge`, guardá tu trabajo** (ver el paso 3). Git no te deja
mezclar si tenés cambios a medio guardar.

### Si aparece un conflicto

Git te va a marcar los archivos en conflicto con líneas así:

```
<<<<<<< HEAD
tu versión
=======
la versión que viene de main
>>>>>>> origin/main
```

Editá el archivo dejando **solo** el código que tiene que quedar, borrá las
líneas `<<<<<<<`, `=======` y `>>>>>>>`, y después:

```bash
git add ARCHIVO_QUE_ARREGLASTE
git commit
```

Si no estás seguro de cómo resolverlo, **frená y avisá en el grupo** antes de
seguir. Es más fácil resolverlo juntos que desarmar un merge mal hecho.

---

## 3. Hacer commits con mensajes claros

Un commit es una "foto" de tu avance. Hacé commits **chicos y seguidos**, no
uno gigante al final.

```bash
git add .
git commit -m "alta-usuario: valida que el correo no esté repetido"
git push
```

`git push` sube tus commits a GitHub, a tu rama.

### Cómo escribir el mensaje

- En español, en minúsculas, sin punto final.
- Empezá con el nombre corto de tu pantalla (`alta-usuario:`, `listado:`, `consultar:`).
- Decí **qué** cambiaste, no "cambios" o "avance".

**Ejemplos buenos:**

```
alta-usuario: agrega formulario con nombre, correo y rol
listado: muestra el botón "revocar" solo si el usuario está activo
consultar: corrige el error 500 cuando el id no existe
```

**Ejemplo malo:**

```
cambios
```

(No se entiende qué hiciste. Cualquiera que mire el historial dentro de un mes
—incluido vos— no va a saber qué pasó en ese commit.)

---

## 4. Abrir tu Pull Request cuando termines tu pantalla

Cuando tu pantalla cumple la **Definición de "Terminado"** (más abajo), abrís un
Pull Request (PR) para integrar tu rama a `main`.

1. Asegurate de haber hecho `git push` de todos tus commits.
2. Actualizá tu rama con `main` una última vez (paso 2).
3. Entrá a **https://github.com/SBryantAyala/escatt** → te va a aparecer un botón
   verde **"Compare & pull request"**. Si no, andá a la pestaña **Pull requests**
   → **New pull request**.
4. **Muy importante:** el PR tiene que ir de `feature/tu-rama` **hacia `main`**
   (base: `main` ← compare: `feature/tu-rama`).
5. Se va a abrir una plantilla automática. Completá "¿Qué hice?" y "¿Cómo lo
   probé?", y marcá el checklist.
6. Creá el PR.

También se puede desde la terminal:

```bash
gh pr create --base main --head feature/alta-usuario
```

---

## 5. No podés mergear tu propio PR

La rama `main` está **protegida**. Eso significa:

- **No** se puede hacer `git push` directo a `main`.
- Todo cambio entra por Pull Request.
- Cada PR necesita **1 aprobación** antes de poder mergearse.
- **Vos no podés aprobar tu propio PR.** La aprobación la da **SBryantAyala**
  (o, para la revisión cruzada de 5 min, otro compañero).
- El merge lo hace SBryantAyala, con la opción **"Squash and merge"**.

Si pediste cambios en la revisión: corregí en tu rama, hacé `git commit` y
`git push`. El PR se actualiza solo, no hay que abrir otro.

Después de que tu PR se mergea, los demás traen tu cambio con `git merge origin/main`
en sus ramas (paso 2).

---

## 6. Definición de "Terminado" — checklist antes de abrir el PR

No abras el PR hasta poder marcar **todas** estas casillas:

- [ ] **Corre en Ubuntu** siguiendo solo los pasos del README (sin pasos ocultos ni "en mi máquina anda").
- [ ] **Probado a mano** al menos **un caso correcto y un caso de error**.
- [ ] Los **datos persisten bien en SQLite** (cerrás y volvés a abrir, y siguen ahí).
- [ ] **Otro del equipo le echó un ojo** rápido (revisión cruzada, 5 min).
- [ ] **Respeta el contrato de API acordado** (mismas rutas y nombres; no inventar endpoints por tu cuenta).

---

## Resumen rápido (los comandos de siempre)

```bash
git fetch origin
git checkout feature/tu-rama        # pararte en tu rama
git merge origin/main               # traer lo último de main

# ...trabajás...

git add .
git commit -m "tu-pantalla: qué hiciste"
git push

# cuando la pantalla está "Terminada" -> abrir PR hacia main en GitHub
```

¿Dudas? Preguntá en el grupo **antes** de forzar comandos que no entendés.
