import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BienvenidaPanel from "../../components/ui/BienvenidaPanel";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { IconoDocumento, IconoUsuarios } from "../../components/iconos";
import { ICONO_ACADEMIA_COMPONENTE } from "../../components/iconosAcademia";
import { colorDe } from "../../lib/academias";
import { api } from "../../lib/api";
import { resumenIntegrantes } from "../../lib/integrantes";
import { etiquetaRolPrincipal, tieneRol } from "../../lib/roles";
import { ESTADOS_PROTOCOLO, estadoDe } from "../Protocolo/estados";

// Home del docente (y del Presidente de Academia sin funciones de la CATT).
// No es un dashboard administrativo: el centro es lo que tiene que hacer hoy
// (evaluar los protocolos que le asignaron como sinodal), luego lo que dirige
// y su academia. Las acciones viven en "Mis protocolos"; aquí solo se resume
// y se enlaza a la pestaña correspondiente.

const MAX_PENDIENTES = 3;
const MAX_DIRIGIDOS = 4;

// GET con su propio estado de carga/error, para que una sección que falle no
// tumbe a las demás. `ruta` null = no aplica para esta persona.
function useDatos(ruta) {
  const [estado, setEstado] = useState({ datos: null, error: null });
  useEffect(() => {
    if (!ruta) return undefined;
    let vivo = true;
    api(ruta)
      .then((d) => vivo && setEstado({ datos: d, error: null }))
      .catch((e) => vivo && setEstado({ datos: null, error: e.message }));
    return () => {
      vivo = false;
    };
  }, [ruta]);
  return estado;
}

function TituloSeccion({ id, children, extra }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-base font-bold text-[#102D4B]">
        {children}
      </h2>
      {extra}
    </div>
  );
}

function AvisoError({ texto }) {
  return (
    <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {texto}
    </p>
  );
}

function EnlaceVerTodo({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[#1878B6] transition hover:bg-sky-50"
    >
      {children}
      <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2 border-current" />
    </Link>
  );
}

function Pendientes({ porEvaluar }) {
  if (porEvaluar.error) return <AvisoError texto={`No se pudieron cargar tus evaluaciones. ${porEvaluar.error}`} />;
  if (!porEvaluar.datos) return <Esqueleto className="h-28 w-full !rounded-[20px]" />;

  const asignados = porEvaluar.datos;
  const pendientes = asignados.filter((p) => !p.mi_evaluacion && p.estado === "en_evaluacion");

  if (pendientes.length === 0) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-5">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <span className="mb-1 h-4 w-2 rotate-45 border-b-[3px] border-r-[3px] border-current" />
        </span>
        <div>
          <p className="font-bold text-slate-800">Estás al día</p>
          <p className="mt-1 text-sm text-slate-600">
            {asignados.length === 0
              ? "No tienes protocolos asignados como sinodal. Cuando el Presidente de tu academia te asigne uno, aparecerá aquí."
              : "Ya entregaste todas tus evaluaciones. Puedes consultarlas en Mis protocolos."}
          </p>
        </div>
      </div>
    );
  }

  const visibles = pendientes.slice(0, MAX_PENDIENTES);
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {visibles.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-amber-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex min-w-0 flex-1 basis-72 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <IconoDocumento className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{p.titulo}</p>
                <p className="mt-1 text-sm text-slate-600">{resumenIntegrantes(p, ["carrera"])}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Eres sinodal · {p.sinodales.filter((s) => s.evaluo).length} de {p.sinodales.length} evaluaciones
                  entregadas
                </p>
              </div>
            </div>
            <Link
              to="/panel/protocolo?tab=evaluar"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-[#1878B6] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#0F5C8C]"
            >
              Evaluar
            </Link>
          </li>
        ))}
      </ul>
      {pendientes.length > visibles.length && (
        <EnlaceVerTodo to="/panel/protocolo?tab=evaluar">
          Ver las {pendientes.length} evaluaciones pendientes
        </EnlaceVerTodo>
      )}
    </div>
  );
}

function Dirigidos({ dirigidos }) {
  if (dirigidos.error) return <AvisoError texto={`No se pudieron cargar tus protocolos. ${dirigidos.error}`} />;
  if (!dirigidos.datos) return <Esqueleto className="h-48 w-full !rounded-[20px]" />;

  const lista = dirigidos.datos;
  if (lista.length === 0) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-slate-200 bg-white p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-slate-800">Aún no diriges ningún protocolo</p>
          <p className="mt-1 text-sm text-slate-600">
            Cuando un alumno te registre como su director, aquí verás su avance y el dictamen.
          </p>
        </div>
      </div>
    );
  }

  const porEstado = Object.keys(ESTADOS_PROTOCOLO)
    .map((clave) => ({ clave, n: lista.filter((p) => p.estado === clave).length }))
    .filter((e) => e.n > 0);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        {porEstado.map(({ clave, n }) => (
          <Etiqueta key={clave} variante={ESTADOS_PROTOCOLO[clave].variante}>
            {n} {ESTADOS_PROTOCOLO[clave].etiqueta.toLowerCase()}
          </Etiqueta>
        ))}
      </div>
      <ul className="divide-y divide-slate-100">
        {lista.slice(0, MAX_DIRIGIDOS).map((p) => {
          const estado = estadoDe(p.estado);
          return (
            <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{p.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-500">{resumenIntegrantes(p, ["boleta"])}</p>
              </div>
              <Etiqueta variante={estado.variante} className="shrink-0">
                {estado.etiqueta}
              </Etiqueta>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-100 px-2 py-1">
        <EnlaceVerTodo to="/panel/protocolo?tab=dirijo">
          {lista.length > MAX_DIRIGIDOS ? `Ver los ${lista.length} protocolos` : "Ver detalle y observaciones"}
        </EnlaceVerTodo>
      </div>
    </div>
  );
}

function MiAcademia({ usuario, academias, turnados, esPresidente }) {
  if (academias.error) return <AvisoError texto={`No se pudo cargar tu academia. ${academias.error}`} />;
  if (!academias.datos) return <Esqueleto className="h-48 w-full !rounded-[20px]" />;

  const academia = academias.datos.find((a) => a.id === usuario.academia_id);
  if (!academia) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Todavía no tienes una academia asignada. Cuando la CATT te asigne una, aparecerá aquí.
      </div>
    );
  }

  const color = colorDe(academia.color);
  const Icono = ICONO_ACADEMIA_COMPONENTE[academia.icono] ?? IconoUsuarios;
  const presidencia = !academia.presidente
    ? "Sin presidente asignado"
    : academia.presidente.id === usuario.id
      ? "Tú presides esta academia"
      : `Preside ${academia.presidente.nombre_completo}`;

  const lista = turnados.datos ?? [];
  const resumenPresidente = [
    { etiqueta: "Esperan sinodales", valor: lista.filter((p) => p.estado === "registrado").length },
    { etiqueta: "En evaluación", valor: lista.filter((p) => p.estado === "en_evaluacion").length },
    { etiqueta: "Con dictamen", valor: lista.filter((p) => ["aprobado", "no_aprobado"].includes(p.estado)).length },
  ];

  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4 text-white sm:p-5" style={{ backgroundColor: color.hex }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Icono className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-bold leading-snug">{academia.nombre}</p>
          <p className="mt-0.5 text-xs text-white/85">{academia.total_docentes} docentes</p>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-sm text-slate-700">{presidencia}</p>

        {esPresidente && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Protocolos turnados</p>
            {turnados.error ? (
              <p className="mt-2 text-sm text-red-700">No se pudieron cargar. {turnados.error}</p>
            ) : !turnados.datos ? (
              <Esqueleto className="mt-2 h-16 w-full" />
            ) : (
              <dl className="mt-2 grid grid-cols-3 gap-2">
                {resumenPresidente.map((r) => (
                  <div key={r.etiqueta} className="flex flex-col-reverse justify-end rounded-xl bg-slate-50 px-3 py-2.5">
                    <dt className="mt-0.5 text-xs leading-snug text-slate-500">{r.etiqueta}</dt>
                    <dd className="text-xl font-bold tabular-nums text-slate-800">{r.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {esPresidente && <EnlaceVerTodo to="/panel/mi-academia">Ver integrantes</EnlaceVerTodo>}
      </div>
    </div>
  );
}

export default function InicioDocente({ usuario }) {
  const esPresidente = tieneRol(usuario, "presidente_academia");
  const porEvaluar = useDatos("/api/protocolos/por-evaluar");
  const dirigidos = useDatos("/api/protocolos/dirigidos");
  const academias = useDatos("/api/academias");
  const turnados = useDatos(esPresidente ? "/api/protocolos" : null);

  const asignados = porEvaluar.datos ?? [];
  const entregadas = asignados.filter((p) => p.mi_evaluacion).length;

  return (
    <div className="space-y-8">
      <BienvenidaPanel
        etiqueta={[etiquetaRolPrincipal(usuario), usuario.academia].filter(Boolean).join(" · ")}
        nombre={usuario.nombre}
        descripcion="Evalúa y da seguimiento a los protocolos de Trabajo Terminal en los que participas."
      />

      <section aria-labelledby="inicio-pendientes">
        <TituloSeccion
          id="inicio-pendientes"
          extra={
            asignados.length > 0 && (
              <span className="text-xs text-slate-500">
                Entregaste {entregadas} de {asignados.length} {asignados.length === 1 ? "evaluación" : "evaluaciones"}
              </span>
            )
          }
        >
          Requiere tu atención
        </TituloSeccion>
        <Pendientes porEvaluar={porEvaluar} />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="inicio-dirigidos" className="min-w-0">
          <TituloSeccion id="inicio-dirigidos">Protocolos que diriges</TituloSeccion>
          <Dirigidos dirigidos={dirigidos} />
        </section>
        <section aria-labelledby="inicio-academia" className="min-w-0">
          <TituloSeccion id="inicio-academia">Tu academia</TituloSeccion>
          <MiAcademia usuario={usuario} academias={academias} turnados={turnados} esPresidente={esPresidente} />
        </section>
      </div>

      <p className="text-center text-xs text-slate-400">
        Trabajo Terminal y Presentaciones estarán disponibles en un próximo sprint.
      </p>
    </div>
  );
}
