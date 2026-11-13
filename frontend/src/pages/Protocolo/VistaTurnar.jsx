import { useCallback, useEffect, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";
import { nombreDirector } from "../../lib/directores";
import { claseBotonPrimarioBase, claseBotonSecundario, claseInput } from "./estilos";
import Integrantes from "./Integrantes";
import { formatearFecha } from "../../lib/fechas";

function TarjetaTurno({ protocolo, academias, onTurnado }) {
  const aviso = useAviso();
  const [academiaId, setAcademiaId] = useState(protocolo.academia ? String(protocolo.academia.id) : "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const idSelect = `turnar-academia-${protocolo.id}`;
  const turnado = Boolean(protocolo.academia);
  const sinCambio = turnado && academiaId === String(protocolo.academia.id);

  async function turnar(e) {
    e.preventDefault();
    if (!academiaId) return setError("Elige la Academia a la que se turna el protocolo.");
    setError(null);
    setEnviando(true);
    try {
      await api(`/api/protocolos/${protocolo.id}/academia`, { method: "PATCH", body: { academia_id: Number(academiaId) } });
      aviso.exito(turnado ? "Academia actualizada." : "Protocolo turnado a la Academia.");
      onTurnado();
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{protocolo.titulo}</p>
          <Integrantes protocolo={protocolo} className="mt-1" />
          <p className="mt-1 text-xs text-slate-500">
            Registrado el {formatearFecha(protocolo.creado_en)}
            {protocolo.directores.length > 0 ? ` · Dirige: ${protocolo.directores.map(nombreDirector).join(" · ")}` : ""}
          </p>
        </div>
        {turnado && <Etiqueta variante="info">{protocolo.academia.nombre}</Etiqueta>}
      </div>

      <form onSubmit={turnar} className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor={idSelect} className="mb-1.5 block text-sm font-semibold text-slate-800">
              {turnado ? "Cambiar de Academia" : "Turnar a la Academia"}
            </label>
            <select
              id={idSelect}
              value={academiaId}
              onChange={(e) => {
                setError(null);
                setAcademiaId(e.target.value);
              }}
              disabled={enviando}
              className={claseInput}
            >
              <option value="">Elige una Academia</option>
              {academias.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={enviando || sinCambio}
            className={`min-h-11 px-6 ${claseBotonPrimarioBase}`}
          >
            {enviando ? "Guardando…" : turnado ? "Cambiar" : "Turnar"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </li>
  );
}

export default function VistaTurnar() {
  const [protocolos, setProtocolos] = useState(null);
  const [academias, setAcademias] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    Promise.all([api("/api/protocolos?estado=registrado"), api("/api/academias")])
      .then(([lista, acad]) => {
        setProtocolos(Array.isArray(lista) ? lista : []);
        setAcademias(Array.isArray(acad) ? acad : []);
      })
      .catch((e) => setErrorCarga(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sinTurnar = protocolos?.filter((p) => !p.academia) ?? [];
  const corregibles = protocolos?.filter((p) => p.academia && p.sinodales.length === 0) ?? [];

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Turnar protocolos a Academia</h2>
          <p className="mt-1 text-sm text-slate-500">
            Elige la Academia que evaluará cada protocolo registrado. Se puede corregir mientras no tenga sinodales.
          </p>
        </div>
      </div>

      {errorCarga && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p role="alert">No se pudieron cargar los protocolos. {errorCarga}</p>
          <button type="button" onClick={cargar} className={`mt-3 bg-white ${claseBotonSecundario}`}>
            Reintentar
          </button>
        </div>
      )}

      {!protocolos && !errorCarga && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {protocolos && (
        <>
          <h3 className="mt-6 text-base font-bold text-slate-800">Sin turnar ({sinTurnar.length})</h3>
          {sinTurnar.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No hay protocolos esperando Academia.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sinTurnar.map((p) => (
                <TarjetaTurno key={p.id} protocolo={p} academias={academias} onTurnado={cargar} />
              ))}
            </ul>
          )}

          {corregibles.length > 0 && (
            <>
              <h3 className="mt-8 text-base font-bold text-slate-800">Turnados sin sinodales ({corregibles.length})</h3>
              <ul className="mt-3 space-y-3">
                {corregibles.map((p) => (
                  <TarjetaTurno key={p.id} protocolo={p} academias={academias} onTurnado={cargar} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
