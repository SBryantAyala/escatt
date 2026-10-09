import {
  IconoAcademia,
  IconoAltaUsuario,
  IconoCuenta,
  IconoDocumento,
  IconoFlujo,
  IconoInicio,
  IconoPresentacion,
  IconoUsuarios,
} from "../components/iconos";
import { ROLES_CATT, ROLES_GESTION } from "../lib/roles";

// Fuente única de verdad de la navegación del panel: el sidebar (DashboardLayout,
// vía navegacionPara) y las rutas (App.jsx, vía RequiereRol) leen de aquí. Para
// añadir una sección nueva basta con empujar una entrada a este arreglo.
//
// Campos de cada item:
//   clave        identificador único y estable
//   ruta         ruta real en el navegador (react-router)
//   etiqueta     texto visible en sidebar / breadcrumb / accesos rápidos
//   icono        componente de ícono (de components/iconos)
//   roles        roles que pueden ver la sección (basta con tener uno)
//   excepto      roles que NO ven la sección aunque tengan alguno de `roles`
//   oculto       no aparece en el sidebar pero sigue siendo navegable/guardada
//                (Alta y Detalle: se llega desde una fila o un botón, no desde
//                el menú)
//   proximamente si true, la ruta muestra SeccionProximamente

// Grupos de roles para decidir qué secciones ve cada quien. Una persona puede
// tener varios roles: ve la unión de lo que permite cada uno.
export const TODOS = ["admin_sistema", ...ROLES_CATT, "docente", "presidente_academia", "alumno"];
export const ADMIN_Y_CATT = ["admin_sistema", ...ROLES_CATT];
export const ACADEMICOS = ["docente", "presidente_academia", ...ROLES_CATT];

export const SECCIONES = [
  {
    categoria: "PRINCIPAL",
    items: [
      {
        clave: "inicio",
        ruta: "/panel/inicio",
        etiqueta: "Inicio",
        icono: IconoInicio,
        roles: TODOS,
      },
    ],
  },
  {
    categoria: "USUARIOS",
    items: [
      {
        // Pestañas Alumnos / Docentes / Personal CATT (?tab=). El administrador
        // del sistema solo ve la de Personal CATT y Docentes; el backend filtra
        // igual.
        clave: "usuarios",
        ruta: "/panel/usuarios",
        etiqueta: "Usuarios",
        icono: IconoUsuarios,
        roles: ADMIN_Y_CATT,
      },
      {
        // HU-11: el Presidente de Academia consulta (solo lectura) a los
        // docentes de su academia. Es el mismo Listado, acotado solo cuando el
        // actor no es personal CATT ni administrador.
        clave: "mi-academia",
        ruta: "/panel/mi-academia",
        etiqueta: "Mi academia",
        icono: IconoUsuarios,
        roles: ["presidente_academia"],
        excepto: ADMIN_Y_CATT,
      },
      {
        // Se llega desde el botón "Registrar …" de la pestaña activa.
        clave: "alta",
        ruta: "/panel/usuarios/nuevo",
        etiqueta: "Alta",
        icono: IconoAltaUsuario,
        roles: ["admin_sistema", ...ROLES_GESTION],
        oculto: true,
      },
      {
        clave: "detalle",
        ruta: "/panel/usuarios/:id",
        etiqueta: "Detalle",
        icono: IconoDocumento,
        roles: [...ADMIN_Y_CATT, "presidente_academia"],
        oculto: true,
      },
    ],
  },
  {
    categoria: "CATÁLOGOS",
    items: [
      {
        // HU-10: todos los del personal consultan; solo el Secretario
        // Ejecutivo modifica (la pantalla y el backend lo validan).
        clave: "academias",
        ruta: "/panel/academias",
        etiqueta: "Academias",
        icono: IconoAcademia,
        roles: ADMIN_Y_CATT,
      },
    ],
  },
  {
    categoria: "PROCESO",
    items: [
      {
        clave: "protocolo",
        ruta: "/panel/protocolo",
        etiqueta: "Protocolo",
        icono: IconoDocumento,
        roles: ["alumno", ...ACADEMICOS],
        proximamente: true,
      },
      {
        clave: "trabajo-terminal",
        ruta: "/panel/trabajo-terminal",
        etiqueta: "Trabajo Terminal",
        icono: IconoFlujo,
        roles: ["alumno", ...ACADEMICOS],
        proximamente: true,
      },
      {
        clave: "presentaciones",
        ruta: "/panel/presentaciones",
        etiqueta: "Presentaciones",
        icono: IconoPresentacion,
        roles: ACADEMICOS,
        proximamente: true,
      },
    ],
  },
  {
    categoria: "CUENTA",
    items: [
      {
        clave: "mi-cuenta",
        ruta: "/panel/mi-cuenta",
        etiqueta: "Mi cuenta",
        icono: IconoCuenta,
        roles: TODOS,
      },
    ],
  },
];

export const TODAS_SECCIONES = SECCIONES.flatMap((grupo) => grupo.items);

export function seccionPorClave(clave) {
  return TODAS_SECCIONES.find((s) => s.clave === clave);
}

// "/panel/usuarios/nuevo" y "/panel/usuarios/:id" son rutas dinámicas que no
// matchean por igualdad de texto contra `ruta`; esta función resuelve la
// sección activa real a partir del pathname actual (para breadcrumb y, si se
// requiere, resaltado de sidebar).
export function seccionPorRuta(pathname) {
  if (pathname === "/panel/usuarios/nuevo") return seccionPorClave("alta");
  if (/^\/panel\/usuarios\/[^/]+$/.test(pathname)) return seccionPorClave("detalle");
  return TODAS_SECCIONES.find((s) => s.ruta === pathname);
}

export const permiteA = (item, roles = []) =>
  item.roles.some((r) => roles.includes(r)) && !(item.excepto ?? []).some((r) => roles.includes(r));

// Navegación visible para los roles del usuario: grupos con al menos un item
// permitido y no oculto. Es lo que se pinta en el sidebar y en los accesos
// rápidos de Inicio.
export function navegacionPara(roles) {
  return SECCIONES.map((grupo) => ({
    categoria: grupo.categoria,
    items: grupo.items.filter((it) => permiteA(it, roles) && !it.oculto),
  })).filter((grupo) => grupo.items.length > 0);
}
