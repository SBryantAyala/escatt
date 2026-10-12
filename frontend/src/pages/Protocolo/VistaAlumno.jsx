import { useCallback, useEffect, useRef, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";
import { AZUL_MEDIO } from "../../lib/theme";

// Pantalla: elegibilidad del alumno para TT (HU-12). Sube evidencia
// (kárdex/boleta) por periodo y ve el estado de cada envío.

const ESTADOS = {
  pendiente: { etiqueta: "En revisión", variante: "alerta" },
  elegible: { etiqueta: "Elegible", variante: "exito" },
  no_elegible: { etiqueta: "No elegible", variante: "peligro" },
};

const claseInput =
  "min-h-13 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:font-normal placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const claseLabel = "mb-2 block text-sm font-semibold text-slate-800";

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function VistaAlumno() {
  const aviso = useAviso();
  const [historial, setHistorial] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [periodo, setPeriodo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const inputArchivoRef = useRef(null);

  const cargarHistorial = useCallback(() => {
    setCargando(true);
    setErrorCarga(null);
    api("/api/elegibilidad/mi")
      .then((data) => setHistorial(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  async function enviar(e) {
    e.preventDefault();
    const archivo = inputArchivoRef.current?.files?.[0];
    if (!periodo.trim()) return aviso.error("Indica el periodo (ej. 2026-1)");
    if (!archivo) return aviso.error("Adjunta tu kárdex o boleta (PDF, JPG o PNG)");

    const datos = new FormData();
    datos.append("periodo", periodo.trim());
    datos.append("evidencia", archivo);

    setEnviando(true);
    try {
      await api("/api/elegibilidad", { method: "POST", body: datos });
      aviso.exito("Evidencia enviada. La CATT revisará tu elegibilidad.");
      setPeriodo("");
      if (inputArchivoRef.current) inputArchivoRef.current.value = "";
      cargarHistorial();
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function verEvidencia(registro) {
    descargarArchivo(`/api/elegibilidad/${registro.id}/evidencia`, `evidencia-${registro.periodo}`).catch(
      (e) => aviso.error(e.message),
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Elegibilidad para Trabajo Terminal</h2>
          <p className="mt-1 text-sm text-slate-500">Sube tu evidencia y revisa el estado de tu solicitud</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Requisitos para cursar TT-I (Art. 6 del Documento Rector)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Haber aprobado todas las UA de los niveles I y II del ISC.</li>
          <li>Haber aprobado 10 o más UA del nivel III del ISC.</li>
          <li>Tener un Protocolo aprobado.</li>
        </ul>
      </div>

      <form onSubmit={enviar} className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${enviando ? "opacity-70" : ""}`}>
        <h3 className="text-base font-bold text-slate-800">Subir evidencia</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className={claseLabel}>Periodo</span>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="Ej. 2026-1"
              maxLength={20}
              disabled={enviando}
              className={claseInput}
            />
          </label>
          <label className="block min-w-0">
            <span className={claseLabel}>Kárdex o boleta global (PDF, JPG o PNG)</span>
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={enviando}
              className={`${claseInput} px-3 py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700`}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
          style={{ backgroundColor: AZUL_MEDIO }}
        >
          {enviando ? "Enviando…" : "Subir evidencia"}
        </button>
      </form>

      <h3 className="mt-8 text-base font-bold text-slate-800">Mis solicitudes</h3>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar tu historial. {errorCarga}
        </p>
      )}

      {cargando && !historial && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {historial && historial.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">Todavía no has subido ninguna evidencia.</p>
      )}

      {historial && historial.length > 0 && (
        <div className="mt-4 space-y-3">
          {historial.map((r) => {
            const estado = ESTADOS[r.estado];
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Periodo {r.periodo}</span>
                    <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Enviado el {formatearFecha(r.creado_en)}</p>
                  {r.estado === "no_elegible" && r.motivo && (
                    <p className="mt-2 text-sm text-red-700">
                      <span className="font-semibold">Motivo: </span>
                      {r.motivo}
                    </p>
                  )}
                </div>
                {r.tiene_evidencia && (
                  <button
                    type="button"
                    onClick={() => verEvidencia(r)}
                    className="min-h-10 shrink-0 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver mi evidencia
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
