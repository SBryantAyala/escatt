import { useCallback, useEffect, useState } from "react";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import Etiqueta from "../../components/ui/Etiqueta";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";
import { nombreDirector } from "../../lib/directores";
import { claseInput } from "./estilos";
import { estadoDe } from "./estados";
import Integrantes from "./Integrantes";

const SINODALES = 3;

function EstadoSinodal({ sinodal }) {
  if (!sinodal.activo) return <Etiqueta variante="peligro">Cuenta revocada</Etiqueta>;
  if (sinodal.evaluo) return <Etiqueta variante="exito">Ya evaluó</Etiqueta>;
  return <Etiqueta variante="alerta">Pendiente</Etiqueta>;
}

function TarjetaProtocolo({ protocolo, miembros, onGuardado }) {
  const aviso = useAviso();
  const estado = estadoDe(protocolo.estado);
  const editable = protocolo.estado === "registrado" || protocolo.estado === "en_evaluacion";
  const actuales = protocolo.sinodales;
  const bloqueados = new Set(actuales.filter((s) => s.evaluo && s.activo).map((s) => s.id));
  const [elegidos, setElegidos] = useState(() => {
    const base = actuales.map((s) => String(s.id));
    return Array.from({ length: SINODALES }, (_, i) => base[i] ?? "");
  });
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const idBase = `sinodales-${protocolo.id}`;
  const hayCambio =
    elegidos.some(Boolean) &&
    (elegidos.length !== actuales.length ||
      !actuales.every((s) => elegidos.includes(String(s.id))));
  const reemplazo = actuales.length > 0;
  const directoresIds = new Set(protocolo.directores.filter((d) => !d.externo).map((d) => String(d.id)));

  function revisar(e) {
    e.preventDefault();
    if (elegidos.some((v) => !v)) return setError(`Elige los ${SINODALES} sinodales.`);
    if (new Set(elegidos).size !== SINODALES) return setError("No repitas a un mismo sinodal.");
    if (elegidos.some((v) => directoresIds.has(v))) return setError("Un director del protocolo no puede ser su sinodal.");
    setError(null);
    setConfirmando(true);
  }

  async function guardar() {
    setEnviando(true);
    try {
      await api(`/api/protocolos/${protocolo.id}/sinodales`, {
        method: "PUT",
        body: { sinodales: elegidos.map(Number) },
      });
      aviso.exito(reemplazo ? "Sinodales actualizados." : "Sinodales asignados. El protocolo pasa a evaluación.");
      setConfirmando(false);
      onGuardado();
    } catch (err) {
      setConfirmando(false);
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const nombreDe = (id) => miembros.find((m) => String(m.id) === id)?.nombre_completo ?? "";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{protocolo.titulo}</p>
          <Integrantes protocolo={protocolo} className="mt-1" />
          {protocolo.directores.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">Dirige: {protocolo.directores.map(nombreDirector).join(" · ")}</p>
          )}
        </div>
        <Etiqueta variante={estado.variante}>{estado.etiqueta}</Etiqueta>
      </div>

      {!editable && actuales.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {actuales.map((s) => (
            <li key={s.id}>{s.nombre}</li>
          ))}
        </ul>
      )}

      {editable && (
        <form onSubmit={revisar} noValidate className="mt-4">
          <p className="text-sm font-semibold text-slate-800">
            {reemplazo ? "Sinodales (puedes sustituir a uno que no haya evaluado)" : "Asignar sinodales"}
          </p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {elegidos.map((valor, i) => {
              const actual = actuales.find((s) => String(s.id) === valor);
              const fijo = actual && bloqueados.has(actual.id);
              return (
                <div key={i} className="min-w-0">
                  <label htmlFor={`${idBase}-${i}`} className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Sinodal {i + 1}
                  </label>
                  <select
                    id={`${idBase}-${i}`}
                    value={valor}
                    disabled={fijo || enviando}
                    onChange={(e) => setElegidos((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className={claseInput}
                  >
                    <option value="">Elige un docente</option>
                    {miembros.map((m) => (
                      <option key={m.id} value={m.id} disabled={directoresIds.has(String(m.id))}>
                        {m.nombre_completo}
                      </option>
                    ))}
                  </select>
                  {actual && (
                    <p className="mt-1.5">
                      <EstadoSinodal sinodal={actual} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {actuales.some((s) => !s.activo) && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              Hay sinodales con cuenta revocada. Sustitúyelos para que el protocolo siga su evaluación; su evaluación
              previa se conserva en el historial.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || (reemplazo && !hayCambio)}
            className="mt-4 min-h-11 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white transition hover:bg-[#0F5C8C] disabled:opacity-60"
          >
            {reemplazo ? "Guardar cambios" : "Asignar sinodales"}
          </button>
        </form>
      )}

      <DialogoConfirmacion
        abierto={confirmando}
        titulo={reemplazo ? "¿Actualizar los sinodales?" : "¿Asignar estos sinodales?"}
        descripcion={`${elegidos.map(nombreDe).join(", ")}. ${
          reemplazo
            ? "Quien salga deja de ver el protocolo; las evaluaciones de quienes se quedan se conservan."
            : "El protocolo pasará a «En evaluación»."
        }`}
        etiquetaConfirmar={reemplazo ? "Actualizar" : "Asignar"}
        cargando={enviando}
        onConfirmar={guardar}
        onCancelar={() => setConfirmando(false)}
      />
    </li>
  );
}

export default function VistaSinodalesPresidente({ actor, encabezado = true, onCargado }) {
  const [protocolos, setProtocolos] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const academiaId = actor?.academia_id;

  const cargar = useCallback(() => {
    setErrorCarga(null);
    if (!academiaId) {
      setProtocolos([]);
      return;
    }
    Promise.all([api("/api/protocolos"), api(`/api/academias/${academiaId}`)])
      .then(([lista, ficha]) => {
        setProtocolos(Array.isArray(lista) ? lista : []);
        setMiembros(
          (ficha.integrantes ?? []).filter((m) => m.activo).map((m) => ({ id: m.id, nombre_completo: m.nombre_completo })),
        );
      })
      .catch((e) => setErrorCarga(e.message));
  }, [academiaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (protocolos) onCargado?.(protocolos);
  }, [protocolos, onCargado]);

  const porAsignar = protocolos?.filter((p) => p.estado === "registrado" || p.estado === "en_evaluacion") ?? [];
  const cerrados = protocolos?.filter((p) => p.estado === "aprobado" || p.estado === "no_aprobado") ?? [];

  return (
    <div className="min-w-0">
      {encabezado && (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
            <IconoDocumento className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sinodales de mi Academia</h2>
            <p className="mt-1 text-sm text-slate-500">Asigna tres sinodales a cada protocolo turnado o sustituye a uno</p>
          </div>
        </div>
      )}

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudieron cargar los protocolos. {errorCarga}
        </p>
      )}

      {!protocolos && !errorCarga && (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Esqueleto key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {protocolos && porAsignar.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No hay protocolos turnados a tu Academia que esperen sinodales. Cuando la CATT turne uno, aparecerá aquí.
        </p>
      )}

      {porAsignar.length > 0 && (
        <ul className="mt-6 space-y-3">
          {porAsignar.map((p) => (
            <TarjetaProtocolo key={`${p.id}-${p.sinodales.map((s) => s.id).join("-")}`} protocolo={p} miembros={miembros} onGuardado={cargar} />
          ))}
        </ul>
      )}

      {cerrados.length > 0 && (
        <>
          <h3 className="mt-8 text-base font-bold text-slate-800">Con dictamen ({cerrados.length})</h3>
          <ul className="mt-3 space-y-3">
            {cerrados.map((p) => (
              <TarjetaProtocolo key={p.id} protocolo={p} miembros={miembros} onGuardado={cargar} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
