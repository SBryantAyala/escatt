import { useCallback, useEffect, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api, descargarArchivo } from "../../lib/api";
import { ROLES_GESTION, tieneRol } from "../../lib/roles";
import PanelPadron from "./PanelPadron";

// Pantalla: validar elegibilidad de alumnos para TT (HU-13). El Secretario
// Ejecutivo marca elegible/no elegible; el resto del personal CATT y el
// administrador solo consultan (el backend ya lo exige igual en el PATCH).

const ESTADOS = {
  pendiente: { etiqueta: "En revisión", variante: "alerta" },
  elegible: { etiqueta: "Elegible", variante: "exito" },
  no_elegible: { etiqueta: "No elegible", variante: "peligro" },
};

const COTEJO = {
  coincide: { etiqueta: "Boleta en el padrón", variante: "exito" },
  no_coincide: { etiqueta: "Boleta no está en el padrón", variante: "alerta" },
  sin_padron: { etiqueta: "Sin padrón para cotejar", variante: "neutro" },
};

const FILTROS = [
  { id: "pendiente", etiqueta: "Pendientes" },
  { id: "elegible", etiqueta: "Elegibles" },
  { id: "no_elegible", etiqueta: "No elegibles" },
  { id: "todos", etiqueta: "Todos" },
];

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function VistaValidacion({ actor }) {
  const aviso = useAviso();
  const puedeValidar = tieneRol(actor, "catt_ejecutivo");
  const puedeCargarPadron = tieneRol(actor, ...ROLES_GESTION);
  const [registros, setRegistros] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [filtro, setFiltro] = useState("pendiente");
  const [procesando, setProcesando] = useState(null); // id en curso
  const [motivoAbierto, setMotivoAbierto] = useState(null); // id con el textarea abierto
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(() => {
    setCargando(true);
    setErrorCarga(null);
    api(`/api/elegibilidad?estado=${filtro}`)
      .then((data) => setRegistros(Array.isArray(data) ? data : []))
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function verEvidencia(r) {
    descargarArchivo(`/api/elegibilidad/${r.id}/evidencia`, `evidencia-${r.alumno.boleta}-${r.periodo}`).catch(
      (e) => aviso.error(e.message),
    );
  }

  async function validar(id, estado, motivoTexto) {
    setProcesando(id);
    try {
      await api(`/api/elegibilidad/${id}`, { method: "PATCH", body: { estado, motivo: motivoTexto } });
      aviso.exito(estado === "elegible" ? "Alumno marcado como elegible." : "Alumno marcado como no elegible.");
      setMotivoAbierto(null);
      setMotivo("");
      cargar();
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setProcesando(null);
    }
  }

  function confirmarNoElegible(id) {
    if (!motivo.trim()) return aviso.error("Escribe el motivo de la no elegibilidad");
    validar(id, "no_elegible", motivo.trim());
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Elegibilidad para Trabajo Terminal</h2>
          <p className="mt-1 text-sm text-slate-500">
            {puedeValidar ? "Valida la evidencia que suben los alumnos" : "Consulta de solo lectura"}
          </p>
        </div>
      </div>

      <PanelPadron puedeCargar={puedeCargarPadron} onCargado={cargar} />

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
              filtro === f.id ? "bg-[#1878B6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar la lista. {errorCarga}
        </p>
      )}

      {cargando && !registros && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Esqueleto key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {registros && registros.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">No hay solicitudes en este filtro.</p>
      )}

      {registros && registros.length > 0 && (
        <div className="mt-6 space-y-3">
          {registros.map((r) => {
            const estado = ESTADOS[r.estado];
            const enProceso = procesando === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{r.alumno.nombre}</span>
                      <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
                      {COTEJO[r.padron?.estado] && (
                        <Etiqueta variante={COTEJO[r.padron.estado].variante}>{COTEJO[r.padron.estado].etiqueta}</Etiqueta>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Boleta {r.alumno.boleta} · {r.alumno.carrera} · Periodo {r.periodo} · Enviado el{" "}
                      {formatearFecha(r.creado_en)}
                    </p>
                    {r.padron?.estado === "coincide" && r.padron.nombre && (
                      <p className="mt-1 text-xs text-slate-500">Nombre en el padrón: {r.padron.nombre}</p>
                    )}
                    {r.estado !== "pendiente" && (
                      <p className="mt-1 text-xs text-slate-500">
                        Validado por {r.validado_por} el {formatearFecha(r.validado_en)}
                      </p>
                    )}
                    {r.motivo && <p className="mt-2 text-sm text-red-700"><span className="font-semibold">Motivo: </span>{r.motivo}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {r.tiene_evidencia && (
                      <button
                        type="button"
                        onClick={() => verEvidencia(r)}
                        className="min-h-10 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver evidencia
                      </button>
                    )}
                    {puedeValidar && r.estado === "pendiente" && (
                      <>
                        <button
                          type="button"
                          disabled={enProceso}
                          onClick={() => validar(r.id, "elegible")}
                          className="min-h-10 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Elegible
                        </button>
                        <button
                          type="button"
                          disabled={enProceso}
                          onClick={() => {
                            setMotivoAbierto(r.id);
                            setMotivo("");
                          }}
                          className="min-h-10 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          No elegible
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {motivoAbierto === r.id && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-red-800">
                        Motivo de la no elegibilidad
                      </span>
                      <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={2}
                        placeholder="Ej. Faltan 2 UA del nivel III"
                        className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      />
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={enProceso}
                        onClick={() => confirmarNoElegible(r.id)}
                        className="min-h-10 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setMotivoAbierto(null)}
                        className="min-h-10 rounded-full px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
