import { useState } from "react";
import ChipsRol from "../../components/ChipsRol";
import { useAviso } from "../../components/ui/Avisos";
import { api } from "../../lib/api";
import { nombreCompleto } from "../../lib/nombre";
import { GRAD_AZUL, VIDRIO } from "../../lib/theme";
import { FormCambioPassword } from "../CambiarPassword";

// "Mi cuenta": cualquier usuario consulta sus datos, edita solo sus datos de
// contacto (teléfono y, si es docente, extensión) y cambia su contraseña.
// Los datos institucionales (boleta, número de empleado, academia…) los
// corrige la CATT.

const claseInput =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40";
const claseLabel = "text-xs font-semibold uppercase tracking-wide text-slate-500";

function Dato({ label, valor }) {
  return (
    <div className="py-2.5">
      <p className={claseLabel}>{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{valor || "—"}</p>
    </div>
  );
}

export default function MiCuentaPage({ usuario, onUsuarioActualizado }) {
  const aviso = useAviso();
  const esDocente = usuario.perfiles?.includes("docente");
  const [telefono, setTelefono] = useState(usuario.telefono ?? "");
  const [extension, setExtension] = useState(usuario.extension ?? "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const body = { telefono };
      if (esDocente) body.extension = extension;
      const datos = await api("/api/auth/perfil", { method: "PATCH", body });
      onUsuarioActualizado?.(datos.usuario);
      aviso.exito("Datos de contacto actualizados.");
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <section className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
        <h2 className="text-lg font-bold text-slate-800">{nombreCompleto(usuario)}</h2>
        <ChipsRol roles={usuario.roles} className="mt-2" />

        <div className="mt-4 divide-y divide-slate-100">
          <Dato label="Correo" valor={usuario.correo} />
          {usuario.perfiles?.includes("alumno") && (
            <>
              <Dato label="Boleta" valor={usuario.boleta} />
              <Dato label="Carrera" valor={usuario.carrera} />
              <Dato label="Plan de estudios" valor={usuario.plan_estudios} />
            </>
          )}
          {usuario.numero_empleado && (
            <Dato label="Número de empleado" valor={usuario.numero_empleado} />
          )}
          {esDocente && <Dato label="Academia" valor={usuario.academia} />}
          {usuario.perfiles?.includes("personal_catt") && (
            <Dato label="Cargo" valor={usuario.cargo} />
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          ¿Algún dato institucional es incorrecto? Solicita la corrección a la CATT.
        </p>

        <form onSubmit={guardar} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-700">Datos de contacto</h3>
          <label className="block">
            <span className={`${claseLabel} mb-1 block`}>Teléfono</span>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={claseInput}
            />
          </label>
          {esDocente && (
            <label className="block">
              <span className={`${claseLabel} mb-1 block`}>Extensión</span>
              <input
                type="text"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className={claseInput}
              />
            </label>
          )}
          <button
            type="submit"
            disabled={guardando}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:opacity-60"
            style={{ backgroundImage: GRAD_AZUL }}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </section>

      <section className={`rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Cambiar contraseña</h2>
        <FormCambioPassword onCambiada={onUsuarioActualizado} />
      </section>
    </div>
  );
}
