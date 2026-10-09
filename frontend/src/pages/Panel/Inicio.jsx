import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSesion } from "../../context/SesionContext";
import { api } from "../../lib/api";
import { etiquetaRolPrincipal } from "../../lib/roles";
import { AZUL_MEDIO, GRAD_AZUL, VIDRIO } from "../../lib/theme";
import { ADMIN_Y_CATT, navegacionPara } from "../../routes/secciones";

// Contenido de la sección "Inicio": hero de bienvenida + KPIs + accesos
// rápidos. Antes recibía `accesos` y `onIrA` por props desde PanelPage; ahora
// se resuelve sola (usuario de SesionContext, accesos de secciones.js) y
// navega con <Link>.

const DESCRIPCION_SECCION = {
  usuarios: "Ver y administrar el padrón de usuarios",
  "mi-academia": "Consultar a los docentes de tu academia",
  academias: "Catálogo de academias de la ESCOM",
  "mi-cuenta": "Tus datos y tu contraseña",
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

export default function PanelInicio() {
  const { usuario } = useSesion();
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

  // Accesos rápidos = todo lo visible para el rol menos el propio "Inicio".
  const accesos = useMemo(() => {
    const roles = usuario.roles ?? [];
    return navegacionPara(roles)
      .flatMap((g) => g.items)
      .filter((it) => it.clave !== "inicio");
  }, [usuario.roles]);

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
                <Link
                  key={item.clave}
                  to={item.ruta}
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
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
