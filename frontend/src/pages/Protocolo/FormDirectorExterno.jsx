import { useRef, useState } from "react";
import { useAviso } from "../../components/ui/Avisos";
import { api } from "../../lib/api";
import { claseArchivo, claseBotonSecundario, claseInput, claseLabel } from "./estilos";

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Botón "Mi director externo no está en la lista" y, al abrirlo, los campos
// para registrarlo. Va dentro del formulario de registro de protocolo y del de
// cambio de director, así que no es un <form>: Enter en sus campos registra al
// externo en lugar de enviar el formulario de afuera. `deshabilitado` es
// true mientras ese formulario se envía.
export default function FormDirectorExterno({ onRegistrado, deshabilitado = false }) {
  const aviso = useAviso();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [correo, setCorreo] = useState("");
  const [cedulaNumero, setCedulaNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cedulaRef = useRef(null);
  const curriculumRef = useRef(null);

  async function registrar() {
    const cedula = cedulaRef.current?.files?.[0];
    const curriculum = curriculumRef.current?.files?.[0];
    if (!nombre.trim()) return aviso.error("Escribe el nombre del director externo");
    if (!institucion.trim()) return aviso.error("Indica la institución del director externo");
    if (!CORREO_VALIDO.test(correo.trim())) return aviso.error("Escribe un correo válido para el director externo");
    if (!cedulaNumero.trim()) return aviso.error("Escribe el número de cédula profesional");
    if (!cedula) return aviso.error("Adjunta la copia de la cédula profesional (PDF, JPG o PNG)");
    if (!curriculum) return aviso.error("Adjunta el mini currículum (PDF, JPG o PNG)");

    const datos = new FormData();
    datos.append("nombre", nombre.trim());
    datos.append("institucion", institucion.trim());
    datos.append("correo", correo.trim());
    datos.append("cedula_numero", cedulaNumero.trim());
    datos.append("cedula", cedula);
    datos.append("curriculum", curriculum);

    setEnviando(true);
    try {
      const creado = await api("/api/directores-externos", { method: "POST", body: datos });
      aviso.exito("Director externo registrado.");
      setAbierto(false);
      onRegistrado(creado);
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const bloqueado = enviando || deshabilitado;

  function alPresionarTecla(e) {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    if (!bloqueado) registrar();
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} disabled={deshabilitado} className={`mt-3 ${claseBotonSecundario}`}>
        Mi director externo no está en la lista
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Registrar director externo"
      onKeyDown={alPresionarTecla}
      className={`mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5 ${bloqueado ? "opacity-70" : ""}`}
    >
      <p className="text-sm font-semibold text-slate-800">Registrar director externo</p>
      <p className="mt-1 text-xs text-slate-600">
        Se registra una sola vez con su cédula profesional y un mini currículum; después cualquier alumno puede elegirlo
        de la lista.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={claseLabel}>Nombre completo</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={200}
            disabled={bloqueado}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Institución</span>
          <input
            type="text"
            value={institucion}
            onChange={(e) => setInstitucion(e.target.value)}
            maxLength={200}
            disabled={bloqueado}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Correo</span>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            maxLength={200}
            disabled={bloqueado}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Número de cédula profesional</span>
          <input
            type="text"
            value={cedulaNumero}
            onChange={(e) => setCedulaNumero(e.target.value)}
            maxLength={30}
            disabled={bloqueado}
            className={claseInput}
          />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Copia de la cédula (PDF, JPG o PNG)</span>
          <input ref={cedulaRef} type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={bloqueado} className={claseArchivo} />
        </label>
        <label className="block min-w-0">
          <span className={claseLabel}>Mini currículum (PDF, JPG o PNG)</span>
          <input
            ref={curriculumRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={bloqueado}
            className={claseArchivo}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={registrar}
          disabled={bloqueado}
          className="min-h-10 rounded-full bg-[#1878B6] px-5 text-sm font-semibold text-white transition hover:bg-[#0F5C8C] disabled:opacity-60"
        >
          {enviando ? "Registrando…" : "Registrar director externo"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} disabled={bloqueado} className={claseBotonSecundario}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
