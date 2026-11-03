import { useCallback, useEffect, useRef, useState } from "react";
import DialogoConfirmacion from "../../components/ui/DialogoConfirmacion";
import Esqueleto from "../../components/ui/Esqueleto";
import { useAviso } from "../../components/ui/Avisos";
import { api } from "../../lib/api";
import { claseArchivo } from "./estilos";

async function contarFilas(archivo) {
  const texto = (await archivo.text()).replace(/^\uFEFF/, "");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length === 0) return 0;
  const conEncabezado = !/^\s*"?\d{10}"?\s*([,;\t]|$)/.test(lineas[0]);
  return lineas.length - (conEncabezado ? 1 : 0);
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "medium" });
}

export default function PanelPadron({ puedeCargar, onCargado }) {
  const aviso = useAviso();
  const entrada = useRef(null);
  const [estado, setEstado] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  const cargar = useCallback(() => {
    api("/api/padron")
      .then(setEstado)
      .catch((e) => setErrorCarga(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function revisar(e) {
    e.preventDefault();
    if (!archivo) return aviso.error("Elige el archivo CSV con las boletas.");
    setErrores(null);
    setConfirmando({ nombre: archivo.name, filas: await contarFilas(archivo) });
  }

  async function subir() {
    setEnviando(true);
    setErrores(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append("archivo", archivo);
      const nuevo = await api("/api/padron", { method: "POST", body: cuerpo });
      setEstado(nuevo);
      setArchivo(null);
      if (entrada.current) entrada.current.value = "";
      aviso.exito(`Padrón cargado: ${nuevo.total.toLocaleString("es-MX")} boletas.`);
      onCargado?.();
    } catch (err) {
      setErrores(err.datos?.errores ?? null);
      aviso.error(err.message);
    } finally {
      setEnviando(false);
      setConfirmando(null);
    }
  }

  return (
    <section aria-labelledby="padron-titulo" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 id="padron-titulo" className="text-sm font-semibold text-slate-800">
        Padrón de boletas para cotejar el kárdex
      </h3>

      {errorCarga && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          No se pudo consultar el padrón. {errorCarga}
        </p>
      )}
      {!estado && !errorCarga && <Esqueleto className="mt-2 h-5 w-2/3" />}
      {estado && (
        <p className="mt-1 text-sm text-slate-600">
          {estado.cargado
            ? `${estado.total.toLocaleString("es-MX")} boletas · ${estado.archivo} · cargado el ${formatearFecha(estado.cargado_en)}${estado.cargado_por ? ` por ${estado.cargado_por}` : ""}`
            : "Todavía no hay un padrón cargado. Sin él no se puede cotejar la boleta del alumno."}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        El cotejo es informativo: la decisión de elegibilidad sigue siendo de quien valida.
      </p>

      {puedeCargar && (
        <form onSubmit={revisar} className="mt-3 space-y-3">
          <div>
            <label htmlFor="padron-archivo" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Archivo CSV
            </label>
            <input
              ref={entrada}
              id="padron-archivo"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className={claseArchivo}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Una columna «boleta» de 10 dígitos; «nombre» y «carrera» son opcionales. Al cargar uno nuevo se reemplaza
              el anterior.
            </p>
          </div>
          {errores && errores.length > 0 && (
            <ul role="alert" className="list-disc rounded-xl border border-red-200 bg-red-50 py-2 pl-7 pr-3 text-sm text-red-700">
              {errores.map((linea) => (
                <li key={linea}>{linea}</li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white transition hover:bg-[#0F5C8C] disabled:opacity-60"
          >
            {enviando ? "Cargando…" : estado?.cargado ? "Reemplazar padrón" : "Cargar padrón"}
          </button>
        </form>
      )}
      <DialogoConfirmacion
        abierto={Boolean(confirmando)}
        titulo={estado?.cargado ? "¿Reemplazar el padrón?" : "¿Cargar el padrón?"}
        descripcion={
          confirmando
            ? estado?.cargado
              ? `Se reemplazarán las ${estado.total.toLocaleString("es-MX")} boletas actuales (${estado.archivo}) por las ${confirmando.filas.toLocaleString("es-MX")} de «${confirmando.nombre}». El cotejo de todas las solicitudes pasa a usar el padrón nuevo.`
              : `Se cargará el padrón con ${confirmando.filas.toLocaleString("es-MX")} boletas de «${confirmando.nombre}».`
            : undefined
        }
        etiquetaConfirmar={estado?.cargado ? "Reemplazar" : "Cargar"}
        cargando={enviando}
        onConfirmar={subir}
        onCancelar={() => !enviando && setConfirmando(null)}
      />
    </section>
  );
}
