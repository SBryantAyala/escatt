import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BienvenidaPanel from "../../components/ui/BienvenidaPanel";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { IconoCuenta, IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";

// Home del alumno: a diferencia del Inicio genérico (accesos rápidos por
// rol), aquí el centro es lo único que de verdad le importa hoy a un alumno:
// el estado de su elegibilidad para TT. Vive aparte de Panel/Inicio.jsx para
// no mezclar el caso "personal CATT con estadísticas" con este.

const ESTADOS = {
  pendiente: {
    etiqueta: "En revisión",
    variante: "alerta",
    titulo: "Tu solicitud está en revisión",
    texto: "La CATT está revisando tu evidencia. Te avisaremos cuando haya una decisión.",
  },
  elegible: {
    etiqueta: "Elegible",
    variante: "exito",
    titulo: "¡Ya eres elegible para continuar!",
    texto: "Puedes seguir adelante con tu protocolo de Trabajo Terminal.",
  },
  no_elegible: {
    etiqueta: "No elegible",
    variante: "peligro",
    titulo: "Todavía no cumples los requisitos",
    texto: "Revisa el motivo y, cuando estés listo, sube evidencia para un periodo posterior.",
  },
};

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function InicioAlumno({ usuario }) {
  const [historial, setHistorial] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    let vivo = true;
    api("/api/elegibilidad/mi")
      .then((data) => {
        if (vivo) setHistorial(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (vivo) setErrorCarga(e.message);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const ultimo = historial?.[0] ?? null;
  const estado = ultimo ? ESTADOS[ultimo.estado] : null;

  return (
    <div className="space-y-6">
      <BienvenidaPanel
        etiqueta={`Alumno${usuario.carrera ? ` · ${usuario.carrera}` : ""}`}
        nombre={usuario.nombre}
        descripcion={`${usuario.boleta ? `Boleta ${usuario.boleta} · ` : ""}Tu espacio de seguimiento para Trabajo Terminal.`}
      />

      <section aria-labelledby="inicio-elegibilidad">
        <h2 id="inicio-elegibilidad" className="mb-3 text-base font-bold text-[#102D4B]">
          Elegibilidad para Trabajo Terminal
        </h2>

        {errorCarga && (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            No se pudo cargar tu estado. {errorCarga}
          </p>
        )}

        {!errorCarga && historial === null && <Esqueleto className="h-32 w-full !rounded-[20px]" />}

        {!errorCarga && historial !== null && !ultimo && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-sky-100 bg-sky-50/60 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-[#1878B6]">
                <IconoDocumento className="h-6 w-6" />
              </span>
              <div>
                <p className="font-bold text-slate-800">{usuario.procedencia === "externa" ? "Aún no has subido tu carta de participación" : "Aún no has subido tu kárdex"}</p>
                <p className="mt-1 max-w-md text-sm text-slate-600">
                  {usuario.procedencia === "externa"
                    ? "Sube la carta que te dio tu escuela para que la CATT valide tu participación."
                    : "Sube tu kárdex (tramitarlo tarda días, pídelo con anticipación) para que la CATT revise si cumples los requisitos del Art. 6 para cursar TT-I."}
                </p>
              </div>
            </div>
            <Link
              to="/panel/protocolo"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#1878B6] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#0F5C8C] hover:shadow-lg"
            >
              Subir evidencia
            </Link>
          </div>
        )}

        {!errorCarga && ultimo && (
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  ultimo.estado === "elegible"
                    ? "bg-emerald-100 text-emerald-700"
                    : ultimo.estado === "no_elegible"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}>
                  <IconoDocumento className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-800">{estado.titulo}</p>
                    <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                  </div>
                  <p className="mt-1 max-w-md text-sm text-slate-600">{estado.texto}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Periodo {ultimo.periodo} · Enviado el {formatearFecha(ultimo.creado_en)}
                  </p>
                  {ultimo.estado === "no_elegible" && ultimo.motivo && (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      <span className="font-semibold">Motivo: </span>
                      {ultimo.motivo}
                    </p>
                  )}
                </div>
              </div>
              {ultimo.estado === "no_elegible" && (
                <Link
                  to="/panel/protocolo"
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Subir nueva evidencia
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="inicio-accesos">
        <h2 id="inicio-accesos" className="mb-3 text-base font-bold text-[#102D4B]">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/panel/protocolo"
            className="inicio-acceso group flex min-h-28 min-w-0 flex-col rounded-[20px] border border-white/10 bg-[#C2410C] p-4 text-white shadow-md outline-none hover:border-white/40 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-3">
              <span className="inicio-acceso-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25">
                <IconoDocumento className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-snug text-white">Protocolo</h3>
              </div>
              <span aria-hidden="true" className="inicio-acceso-flecha inline-flex shrink-0 items-center justify-center">
                <span className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2" />
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white">Sube tu evidencia y revisa el estado de tu elegibilidad</p>
          </Link>

          <Link
            to="/panel/mi-cuenta"
            className="inicio-acceso group flex min-h-28 min-w-0 flex-col rounded-[20px] border border-white/10 bg-[#0F766E] p-4 text-white shadow-md outline-none hover:border-white/40 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-3">
              <span className="inicio-acceso-icono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25">
                <IconoCuenta className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-snug text-white">Mi cuenta</h3>
              </div>
              <span aria-hidden="true" className="inicio-acceso-flecha inline-flex shrink-0 items-center justify-center">
                <span className="h-1.5 w-1.5 rotate-45 border-r-2 border-t-2" />
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white">Tus datos de contacto y tu contraseña</p>
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Más secciones (Trabajo Terminal, Presentaciones) estarán disponibles en un próximo sprint.
      </p>
    </div>
  );
}
