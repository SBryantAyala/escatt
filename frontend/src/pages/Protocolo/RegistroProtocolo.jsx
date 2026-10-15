import { useCallback, useEffect, useRef, useState } from "react";
import Esqueleto from "../../components/ui/Esqueleto";
import { useAviso } from "../../components/ui/Avisos";
import { IconoDocumento } from "../../components/iconos";
import { api } from "../../lib/api";
import { AZUL_MEDIO } from "../../lib/theme";
import FormDirectorExterno from "./FormDirectorExterno";
import { claseArchivo, claseBotonSecundario, claseInput, claseLabel } from "./estilos";

const ESTADOS_VIGENTES = ["registrado", "en_evaluacion", "aprobado"];
const MAX_TITULO = 300;
const MAX_RESUMEN = 5000;
// Compañeros además del responsable. Debe coincidir con MAX_INTEGRANTES - 1 del
// backend (lib/equipo.js); el cliente aún no confirma el máximo de alumnos.
const MAX_COMPANEROS = 3;

function ordenarPorNombre(lista) {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export default function RegistroProtocolo({ onRegistrado }) {
  const aviso = useAviso();
  const [vigente, setVigente] = useState(false);
  const [elegible, setElegible] = useState(false);
  const [docentes, setDocentes] = useState([]);
  const [externos, setExternos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [resumen, setResumen] = useState("");
  const [director, setDirector] = useState("");
  const [segundoTipo, setSegundoTipo] = useState("ninguno");
  const [segundoDocente, setSegundoDocente] = useState("");
  const [segundoExterno, setSegundoExterno] = useState("");
  const [registrandoExterno, setRegistrandoExterno] = useState(false);
  const [companeros, setCompaneros] = useState([]);
  const [correoCompanero, setCorreoCompanero] = useState("");
  const [validando, setValidando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const vistoBuenoRef = useRef(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    Promise.all([
      api("/api/protocolos/mio"),
      api("/api/elegibilidad/mi"),
      api("/api/protocolos/candidatos-director"),
      api("/api/directores-externos"),
    ])
      .then(([protocolos, elegibilidad, candidatos, catalogo]) => {
        const lista = Array.isArray(protocolos) ? protocolos : [];
        setVigente(lista.some((p) => ESTADOS_VIGENTES.includes(p.estado)));
        setElegible(Array.isArray(elegibilidad) && elegibilidad[0]?.estado === "elegible");
        setDocentes(Array.isArray(candidatos) ? candidatos : []);
        setExternos(Array.isArray(catalogo) ? ordenarPorNombre(catalogo) : []);
      })
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Esqueleto className="h-40 w-full" />;
  if (errorCarga) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        No se pudo cargar el registro de protocolo. {errorCarga}
      </p>
    );
  }
  if (vigente) return null;

  const docentesSegundo = docentes.filter((d) => String(d.id) !== director);

  function elegirTipoSegundo(tipo) {
    setSegundoTipo(tipo);
    setRegistrandoExterno(false);
  }

  function externoRegistrado(creado) {
    setExternos((lista) => ordenarPorNombre([...lista, creado]));
    setSegundoTipo("externo");
    setSegundoExterno(String(creado.id));
    setRegistrandoExterno(false);
  }

  async function agregarCompanero() {
    const correo = correoCompanero.trim().toLowerCase();
    if (!correo) return aviso.error("Escribe el correo institucional de tu compañero");
    if (companeros.some((c) => c.correo.toLowerCase() === correo)) {
      return aviso.error("Ese compañero ya está en la lista");
    }
    setValidando(true);
    try {
      const alumno = await api("/api/protocolos/companeros/validar", { method: "POST", body: { correo } });
      setCompaneros((lista) => [...lista, alumno]);
      setCorreoCompanero("");
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setValidando(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    const vistoBueno = vistoBuenoRef.current?.files?.[0];
    if (!titulo.trim()) return aviso.error("Escribe el título del protocolo");
    if (!resumen.trim()) return aviso.error("Escribe el resumen del protocolo");
    if (!director) return aviso.error("Elige al menos un director docente de ESCOM");
    if (segundoTipo === "docente" && !segundoDocente) return aviso.error("Elige al segundo director docente");
    if (segundoTipo === "externo" && !segundoExterno) return aviso.error("Elige o registra al director externo");
    if (!vistoBueno) return aviso.error("Adjunta la constancia del visto bueno (PDF, JPG o PNG)");

    const datos = new FormData();
    datos.append("titulo", titulo.trim());
    datos.append("resumen", resumen.trim());
    datos.append("directores", director);
    if (segundoTipo === "docente") datos.append("directores", segundoDocente);
    if (segundoTipo === "externo") datos.append("directores_externos", segundoExterno);
    for (const c of companeros) datos.append("integrantes", c.correo);
    datos.append("visto_bueno", vistoBueno);

    setEnviando(true);
    try {
      await api("/api/protocolos", { method: "POST", body: datos });
      aviso.exito("Protocolo registrado. La CATT lo turnará a una Academia.");
      onRegistrado?.();
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="registro-protocolo" className="min-w-0">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#1878B6]">
          <IconoDocumento className="h-6 w-6" />
        </span>
        <div>
          <h2 id="registro-protocolo" className="text-2xl font-bold text-slate-900">
            Registrar protocolo
          </h2>
          <p className="mt-1 text-sm text-slate-500">Registra tu protocolo de Trabajo Terminal con sus directores</p>
        </div>
      </div>

      {!elegible ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Para registrar tu protocolo, la CATT debe haber dictaminado tu elegibilidad como «Elegible». Sube tu evidencia
          en la sección de elegibilidad y espera la respuesta.
        </p>
      ) : (
        <form
          onSubmit={enviar}
          noValidate
          className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${enviando ? "opacity-70" : ""}`}
        >
          <label className="block">
            <span className={claseLabel}>Título del protocolo</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={MAX_TITULO}
              disabled={enviando}
              className={claseInput}
            />
          </label>

          <label className="mt-4 block">
            <span className={claseLabel}>Resumen y objetivo</span>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={4}
              maxLength={MAX_RESUMEN}
              disabled={enviando}
              className={claseInput}
            />
          </label>

          <fieldset className="mt-4 min-w-0" disabled={enviando}>
            <legend className={claseLabel}>Equipo</legend>
            <p className="text-xs text-slate-500">
              El TT puede desarrollarse en equipo (Art. 4 del Documento Rector). Tú serás el responsable: registras el
              protocolo y envías las solicitudes. Agrega a tus compañeros por su correo; cada uno debe tener la
              elegibilidad vigente y no estar en otro protocolo.
            </p>
            {companeros.length > 0 && (
              <ul className="mt-3 space-y-2" aria-label="Compañeros de equipo">
                {companeros.map((c) => (
                  <li
                    key={c.correo}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 break-words text-slate-700">
                      <span className="font-semibold text-slate-800">{c.nombre}</span>
                      {c.carrera ? ` · ${c.carrera}` : ""} · {c.correo}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompaneros((lista) => lista.filter((x) => x.correo !== c.correo))}
                      className={`${claseBotonSecundario} shrink-0`}
                      aria-label={`Quitar a ${c.nombre}`}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {companeros.length < MAX_COMPANEROS ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="block min-w-0 flex-1">
                  <span className="sr-only">Compañero de equipo (correo)</span>
                  <input
                    type="email"
                    value={correoCompanero}
                    onChange={(e) => setCorreoCompanero(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarCompanero();
                      }
                    }}
                    placeholder="correo.del.companero@alumno.ipn.mx"
                    className={claseInput}
                  />
                </label>
                <button
                  type="button"
                  onClick={agregarCompanero}
                  disabled={validando}
                  className={`${claseBotonSecundario} min-h-13 shrink-0`}
                >
                  {validando ? "Validando…" : "Agregar compañero"}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Llegaste al máximo de {MAX_COMPANEROS + 1} alumnos por equipo.
              </p>
            )}
          </fieldset>

          <p className="mt-4 text-xs text-slate-500">
            Un protocolo lleva uno o dos directores y al menos uno debe ser docente de ESCOM (Art. 35 y 49 del Documento
            Rector). Un director externo solo puede ser el segundo.
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={claseLabel}>Director (docente de ESCOM)</span>
              <select
                value={director}
                onChange={(e) => {
                  setDirector(e.target.value);
                  if (segundoDocente === e.target.value) setSegundoDocente("");
                }}
                disabled={enviando}
                className={claseInput}
              >
                <option value="">Elige un docente</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} · {d.academia}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={claseLabel}>Segundo director</span>
              <select
                value={segundoTipo}
                onChange={(e) => elegirTipoSegundo(e.target.value)}
                disabled={enviando}
                className={claseInput}
              >
                <option value="ninguno">Sin segundo director</option>
                <option value="docente">Docente de ESCOM</option>
                <option value="externo">Director externo</option>
              </select>
            </label>
          </div>

          {segundoTipo === "docente" && (
            <label className="mt-4 block min-w-0">
              <span className={claseLabel}>Segundo director (docente de ESCOM)</span>
              <select
                value={segundoDocente}
                onChange={(e) => setSegundoDocente(e.target.value)}
                disabled={enviando}
                className={claseInput}
              >
                <option value="">Elige un docente</option>
                {docentesSegundo.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} · {d.academia}
                  </option>
                ))}
              </select>
            </label>
          )}

          {segundoTipo === "externo" && (
            <div className="mt-4">
              <label className="block min-w-0">
                <span className={claseLabel}>Director externo</span>
                <select
                  value={segundoExterno}
                  onChange={(e) => setSegundoExterno(e.target.value)}
                  disabled={enviando}
                  className={claseInput}
                >
                  <option value="">{externos.length > 0 ? "Elige un director externo" : "Aún no hay directores externos"}</option>
                  {externos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre} · {x.institucion}
                    </option>
                  ))}
                </select>
              </label>
              {!registrandoExterno && (
                <button
                  type="button"
                  onClick={() => setRegistrandoExterno(true)}
                  disabled={enviando}
                  className={`mt-3 ${claseBotonSecundario}`}
                >
                  Mi director externo no está en la lista
                </button>
              )}
              {registrandoExterno && (
                <FormDirectorExterno onRegistrado={externoRegistrado} onCancelar={() => setRegistrandoExterno(false)} />
              )}
            </div>
          )}

          <label className="mt-4 block min-w-0">
            <span className={claseLabel}>Constancia del visto bueno (PDF, JPG o PNG, máx. 10 MB)</span>
            <input
              ref={vistoBuenoRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={enviando}
              className={claseArchivo}
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
            style={{ backgroundColor: AZUL_MEDIO }}
          >
            {enviando ? "Registrando…" : "Registrar protocolo"}
          </button>
        </form>
      )}
    </section>
  );
}
