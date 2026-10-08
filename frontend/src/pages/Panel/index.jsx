import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  IconoAcademia,
  IconoAltaUsuario,
  IconoCuenta,
  IconoDocumento,
  IconoFlujo,
  IconoInicio,
  IconoPresentacion,
  IconoUsuarios,
} from "../../components/iconos";
import { api } from "../../lib/api";
import { etiquetaRolPrincipal, ROLES_CATT, ROLES_GESTION } from "../../lib/roles";
import { AZUL_MEDIO, GRAD_AZUL, VIDRIO } from "../../lib/theme";
import ListadoPage from "../Usuarios/Listado";
import AltaPage from "../Usuarios/Alta";
import DetallePage from "../Usuarios/Detalle";
import MiCuentaPage from "../MiCuenta";
import AcademiasPage from "../Academias";

// PanelPage: el centro de navegación del sistema. Deja de ser una tarjeta de
// bienvenida suelta y pasa a ser un dashboard con sidebar + topbar + contenido.
//
// La navegación interna NO usa react-router: es un useState("seccionActiva")
// más el array de configuración SECCIONES. Para añadir una pantalla nueva basta
// con empujar una entrada a ese array — el sidebar y el área de contenido se
// generan a partir de él, sin tocar el layout.

// Grupos de roles para decidir qué secciones ve cada quien. Una persona puede
// tener varios roles: ve la unión de lo que permite cada uno.
const TODOS = [
  "admin_sistema",
  ...ROLES_CATT,
  "docente",
  "presidente_academia",
  "alumno",
];
const ADMIN_Y_CATT = ["admin_sistema", ...ROLES_CATT];
const ACADEMICOS = ["docente", "presidente_academia", ...ROLES_CATT];

// Descripciones cortas para las tarjetas de accesos rápidos.
const DESCRIPCION_SECCION = {
  usuarios: "Ver y administrar el padrón de usuarios",
  "mi-academia": "Consultar a los docentes de tu academia",
  academias: "Catálogo de academias de la ESCOM",
  "mi-cuenta": "Tus datos y tu contraseña",
  alta: "Registrar un nuevo participante",
  detalle: "Consultar la ficha de un usuario",
  protocolo: "Registro y estado del Protocolo",
  "trabajo-terminal": "Avances de Trabajo Terminal I y II",
  presentaciones: "Calendario y jurados de presentación",
};

// KPIs de respaldo si el backend no responde (proyecto escolar: datos de ejemplo).
const KPIS_EJEMPLO = { total: 24, activos: 18, revocados: 4, pendientes: 3 };

const fechaLarga = () =>
  new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// --- Piezas del "Inicio" del panel -----------------------------------------

// Anillo de progreso en SVG (sin librería), en el azul de marca.
function AnilloProgreso({ fraccion = 0, texto }) {
  const r = 26;
  const circunferencia = 2 * Math.PI * r;
  const avance = Math.max(0, Math.min(1, fraccion));
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={AZUL_MEDIO}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance)}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">
        {texto}
      </span>
    </div>
  );
}

function TarjetaEstadistica({ etiqueta, valor, de, ejemplo }) {
  const fraccion = de ? valor / de : 0;
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-4 ${VIDRIO} bg-white/80`}>
      <AnilloProgreso fraccion={fraccion} texto={`${Math.round(fraccion * 100)}%`} />
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{valor}</p>
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
          {etiqueta}
        </p>
        {ejemplo && <p className="text-[10px] text-slate-400">dato de ejemplo</p>}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#0F5C8C] ring-1 ring-white/60">
      {children}
    </span>
  );
}

// Contenido de la sección "Inicio": hero de bienvenida + KPIs + accesos rápidos.
function PanelInicio({ usuario, accesos, onIrA }) {
  // Estadísticas del padrón: solo quien puede consultarlo (CATT y admin).
  const esPersonal = usuario.roles?.some((r) => ADMIN_Y_CATT.includes(r));
  const [usuarios, setUsuarios] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  // Solo el personal CATT ve estadísticas de usuarios: cárgalas de /api/usuarios.
  useEffect(() => {
    if (!esPersonal) return undefined;
    let vivo = true;
    api("/api/usuarios")
      .then((datos) => {
        if (vivo) setUsuarios(Array.isArray(datos) ? datos : []);
      })
      .catch((e) => {
        if (vivo) setErrorCarga(e.message);
      });
    return () => {
      vivo = false;
    };
  }, [esPersonal]);

  const hayDatos = Array.isArray(usuarios);
  const total = hayDatos ? usuarios.length : KPIS_EJEMPLO.total;
  const activos = hayDatos ? usuarios.filter((u) => u.activo).length : KPIS_EJEMPLO.activos;
  const revocados = hayDatos ? total - activos : KPIS_EJEMPLO.revocados;
  const pendientes = hayDatos
    ? usuarios.filter((u) => u.debe_cambiar_password).length
    : KPIS_EJEMPLO.pendientes;

  const estadisticas = [
    { etiqueta: "Usuarios totales", valor: total, de: total },
    { etiqueta: "Con acceso activo", valor: activos, de: total },
    { etiqueta: "Acceso revocado", valor: revocados, de: total },
    {
      etiqueta: "Sin estrenar contraseña",
      valor: pendientes,
      de: total,
      ejemplo: !hayDatos,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section
        className="overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-[#1878B6]/30 sm:p-8"
        style={{ backgroundImage: GRAD_AZUL }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          {fechaLarga()}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Hola, {usuario.nombre}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
          {esPersonal
            ? "Este es el centro de administración del proceso de titulación. Usa el menú de la izquierda para moverte entre secciones."
            : "Aquí darás seguimiento a tu Trabajo Terminal. Algunas secciones estarán disponibles en próximos sprints."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>{etiquetaRolPrincipal(usuario)}</Chip>
          {esPersonal ? (
            <>
              <Chip>{hayDatos ? `${total} usuarios registrados` : "Datos de ejemplo"}</Chip>
              <Chip>{activos} con acceso activo</Chip>
            </>
          ) : (
            <Chip>Proceso en seguimiento</Chip>
          )}
        </div>
      </section>

      {/* KPIs — solo para personal CATT */}
      {esPersonal && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resumen de usuarios
            </h2>
            {errorCarga && (
              <span className="text-xs text-slate-400">
                Sin conexión con el backend; se muestran datos de ejemplo.
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {estadisticas.map((e) => (
              <TarjetaEstadistica key={e.etiqueta} {...e} />
            ))}
          </div>
        </section>
      )}

      {/* ACCESOS RÁPIDOS */}
      {accesos.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Accesos rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accesos.map((item) => {
              const Icono = item.icono;
              return (
                <button
                  key={item.clave}
                  type="button"
                  onClick={() => onIrA(item.clave)}
                  className={`group flex items-center gap-4 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1878B6]/15 ${VIDRIO} bg-white/80`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundImage: GRAD_AZUL }}
                  >
                    <Icono className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.etiqueta}</span>
                      {item.proximamente && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          Pronto
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {DESCRIPCION_SECCION[item.clave] ?? "Abrir sección"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// Placeholder DENTRO del layout (no una página aparte) para secciones aún sin
// implementar o sin permiso para el rol actual.
function SeccionProximamente({ titulo, descripcion }) {
  return (
    <div className={`rounded-3xl p-8 text-center ${VIDRIO} bg-white/80`}>
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
        style={{ backgroundImage: GRAD_AZUL }}
      >
        <IconoFlujo className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-800">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{descripcion}</p>
    </div>
  );
}

// --- Configuración de navegación -----------------------------------------
// Cada item:
//   clave        identificador único y estable (lo guarda seccionActiva)
//   etiqueta     texto visible en sidebar / breadcrumb / accesos rápidos
//   icono        componente de ícono (de components/iconos)
//   roles        roles que pueden ver la sección (basta con tener uno)
//   Componente   se renderiza en el área de contenido
//   props        props fijas para ese componente (opcional)
//   proximamente si true, muestra SeccionProximamente en vez del componente
//   oculto       no aparece en el sidebar pero sigue siendo navegable
//                (p. ej. Detalle, al que se llegará desde una fila del listado)
//   excepto      roles que NO ven la sección aunque tengan alguno de `roles`
//                (p. ej. "Mi academia" es la versión acotada de "Usuarios" y no
//                tiene sentido para quien ya ve el padrón completo)
const SECCIONES = [
  {
    categoria: "PRINCIPAL",
    items: [
      {
        clave: "inicio",
        etiqueta: "Inicio",
        icono: IconoInicio,
        roles: TODOS,
        Componente: PanelInicio,
      },
    ],
  },
  {
    categoria: "USUARIOS",
    items: [
      {
        // Pestañas Alumnos / Docentes / Personal CATT. El administrador del
        // sistema solo ve la de Personal CATT (y docentes, para asignarles
        // un rol de la CATT); el backend filtra igual.
        clave: "usuarios",
        etiqueta: "Usuarios",
        icono: IconoUsuarios,
        roles: ADMIN_Y_CATT,
        Componente: ListadoPage,
        props: { embebido: true },
      },
      {
        // HU-11: el Presidente de Academia consulta (solo lectura) a los
        // docentes de su academia. Es el mismo Listado, que se acota solo
        // cuando el actor no es personal CATT ni administrador.
        clave: "mi-academia",
        etiqueta: "Mi academia",
        icono: IconoUsuarios,
        roles: ["presidente_academia"],
        excepto: ADMIN_Y_CATT,
        Componente: ListadoPage,
        props: { embebido: true },
      },
      {
        // Se llega desde el botón "Registrar …" de la pestaña activa.
        clave: "alta",
        etiqueta: "Alta",
        icono: IconoAltaUsuario,
        roles: ["admin_sistema", ...ROLES_GESTION],
        Componente: AltaPage,
        oculto: true,
      },
      {
        clave: "detalle",
        etiqueta: "Detalle",
        icono: IconoDocumento,
        roles: [...ADMIN_Y_CATT, "presidente_academia"],
        Componente: DetallePage,
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
        etiqueta: "Academias",
        icono: IconoAcademia,
        roles: ADMIN_Y_CATT,
        Componente: AcademiasPage,
      },
    ],
  },
  {
    categoria: "PROCESO",
    items: [
      {
        clave: "protocolo",
        etiqueta: "Protocolo",
        icono: IconoDocumento,
        roles: ["alumno", ...ACADEMICOS],
        proximamente: true,
      },
      {
        clave: "trabajo-terminal",
        etiqueta: "Trabajo Terminal",
        icono: IconoFlujo,
        roles: ["alumno", ...ACADEMICOS],
        proximamente: true,
      },
      {
        clave: "presentaciones",
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
        etiqueta: "Mi cuenta",
        icono: IconoCuenta,
        roles: TODOS,
        Componente: MiCuentaPage,
      },
    ],
  },
];

const TODAS = SECCIONES.flatMap((grupo) => grupo.items);

const permiteA = (item, roles = []) =>
  item.roles.some((r) => roles.includes(r)) && !(item.excepto ?? []).some((r) => roles.includes(r));

// Navegación visible para los roles del usuario: grupos con al menos un item
// permitido y no oculto. Es lo que se pinta en el sidebar y en los accesos rápidos.
function navegacionPara(roles) {
  return SECCIONES.map((grupo) => ({
    categoria: grupo.categoria,
    items: grupo.items.filter((it) => permiteA(it, roles) && !it.oculto),
  })).filter((grupo) => grupo.items.length > 0);
}

export default function PanelPage({ usuario, onUsuarioActualizado, onCerrarSesion, onVolver }) {
  const etiquetaRol = etiquetaRolPrincipal(usuario);
  const clavesRoles = (usuario.roles ?? []).join(",");
  const navegacion = useMemo(
    () => navegacionPara(clavesRoles.split(",")),
    [clavesRoles],
  );

  // Primera sección visible según el rol (para todos los roles hoy es "inicio").
  const seccionInicial = navegacion[0]?.items[0]?.clave ?? "inicio";
  const [seccionActiva, setSeccionActiva] = useState(seccionInicial);
  // Usuario seleccionado desde una fila del Listado, para la sección "detalle"
  // (oculta del sidebar: solo se llega a ella dando clic en "Ver").
  const [detalleUserId, setDetalleUserId] = useState(null);
  // Perfil con el que se abre el formulario de Alta cuando se llega desde el
  // botón "Registrar …" de la pestaña activa en Listado.
  const [altaPerfil, setAltaPerfil] = useState("alumno");
  // Sección desde la que se abrió el Detalle, para que "Volver" regrese ahí
  // ("usuarios" para el personal, "mi-academia" para el Presidente).
  const [origenDetalle, setOrigenDetalle] = useState("usuarios");

  const seccion = TODAS.find((s) => s.clave === seccionActiva) ?? TODAS[0];
  const permitida = seccion ? permiteA(seccion, usuario.roles) : false;

  // Accesos rápidos = todo lo visible para el rol menos el propio "Inicio".
  const accesos = useMemo(
    () => navegacion.flatMap((g) => g.items).filter((it) => it.clave !== "inicio"),
    [navegacion],
  );

  const irADetalle = (usuarioSeleccionado) => {
    setDetalleUserId(usuarioSeleccionado.id);
    setOrigenDetalle(seccionActiva === "mi-academia" ? "mi-academia" : "usuarios");
    setSeccionActiva("detalle");
  };

  const irAAlta = (perfil) => {
    setAltaPerfil(perfil);
    setSeccionActiva("alta");
  };

  let contenido;
  if (!seccion || !permitida) {
    contenido = (
      <SeccionProximamente
        titulo="Acceso denegado"
        descripcion="Tu rol no tiene acceso a esta sección del panel. Si crees que es un error, comunícate con la CATT."
      />
    );
  } else if (seccion.proximamente || !seccion.Componente) {
    contenido = (
      <SeccionProximamente
        titulo={seccion.etiqueta}
        descripcion="Esta sección estará disponible en un próximo sprint. Ya está conectada al panel: cuando se implemente aparecerá aquí sin tocar el layout."
      />
    );
  } else if (seccion.clave === "inicio") {
    contenido = <PanelInicio usuario={usuario} accesos={accesos} onIrA={setSeccionActiva} />;
  } else if (seccion.clave === "usuarios" || seccion.clave === "mi-academia") {
    contenido = (
      <ListadoPage
        {...(seccion.props ?? {})}
        actor={usuario}
        onVerDetalle={irADetalle}
        onDarDeAlta={irAAlta}
      />
    );
  } else if (seccion.clave === "alta") {
    contenido = (
      <AltaPage
        key={altaPerfil}
        actor={usuario}
        perfilInicial={altaPerfil}
        onVerDetalle={irADetalle}
      />
    );
  } else if (seccion.clave === "detalle") {
    contenido = (
      <DetallePage
        actor={usuario}
        userId={detalleUserId}
        onVolver={() => setSeccionActiva(origenDetalle)}
      />
    );
  } else if (seccion.clave === "academias") {
    contenido = <AcademiasPage actor={usuario} />;
  } else if (seccion.clave === "mi-cuenta") {
    contenido = <MiCuentaPage usuario={usuario} onUsuarioActualizado={onUsuarioActualizado} />;
  } else {
    const Componente = seccion.Componente;
    contenido = <Componente {...(seccion.props ?? {})} />;
  }

  return (
    <DashboardLayout
      usuario={usuario}
      etiquetaRol={etiquetaRol}
      navegacion={navegacion}
      seccionActiva={seccionActiva}
      onSeleccionar={setSeccionActiva}
      breadcrumb={seccion?.etiqueta ?? "Inicio"}
      onCerrarSesion={onCerrarSesion}
      onVolverInicio={onVolver}
    >
      {contenido}
    </DashboardLayout>
  );
}
