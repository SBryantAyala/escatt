import { useState } from "react";
import { useAviso } from "../../components/ui/Avisos";
import { api } from "../../lib/api";
import { AZUL_CLARO, AZUL_MEDIO, GRAD_AZUL, VIDRIO } from "../../lib/theme";

// HU-5: cambio de contraseña.
//
// Se usa de dos formas:
//   - obligatorio: pantalla completa que aparece al entrar con una contraseña
//     temporal (el backend bloquea todo lo demás hasta que se cambie).
//   - embebido: tarjeta dentro de "Mi cuenta".

const claseInput =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40";
const claseLabel = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function requisitos(p) {
  return [
    ["Al menos 9 caracteres", p.length >= 9],
    ["Al menos una letra", /[a-zA-Z]/.test(p)],
    ["Al menos un número", /[0-9]/.test(p)],
  ];
}

export function FormCambioPassword({ onCambiada, textoBoton = "Cambiar contraseña" }) {
  const aviso = useAviso();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const reqs = requisitos(nueva);
  const cumple = reqs.every(([, ok]) => ok);
  const coincide = nueva === confirmar;
  const listo = actual && cumple && coincide && nueva !== actual;

  const enviar = async (e) => {
    e.preventDefault();
    if (!listo) {
      setMensaje({
        tipo: "error",
        texto: !coincide
          ? "Las contraseñas nuevas no coinciden."
          : nueva === actual
            ? "La nueva contraseña debe ser distinta de la actual."
            : "Completa los campos y cumple los requisitos.",
      });
      return;
    }
    setMensaje(null);
    setEnviando(true);
    try {
      const datos = await api("/api/auth/password", { method: "PUT", body: { actual, nueva } });
      setActual("");
      setNueva("");
      setConfirmar("");
      aviso.exito("Contraseña actualizada. Se cerraron tus otras sesiones.");
      onCambiada?.(datos.usuario);
    } catch (err) {
      aviso.error(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const tipo = ver ? "text" : "password";

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {mensaje && (
        <div
          role="alert"
          className={`rounded-2xl px-4 py-3 text-sm ${
            mensaje.tipo === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}
      <label className="block">
        <span className={claseLabel}>Contraseña actual</span>
        <input
          type={tipo}
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          autoComplete="current-password"
          className={claseInput}
        />
      </label>
      <label className="block">
        <span className={claseLabel}>Nueva contraseña</span>
        <input
          type={tipo}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          autoComplete="new-password"
          className={claseInput}
        />
      </label>
      <ul className="space-y-1">
        {reqs.map(([texto, ok]) => (
          <li
            key={texto}
            className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-slate-400"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {texto}
          </li>
        ))}
      </ul>
      <label className="block">
        <span className={claseLabel}>Confirmar nueva contraseña</span>
        <input
          type={tipo}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          autoComplete="new-password"
          className={claseInput}
        />
        {confirmar && !coincide && (
          <span className="mt-1 block text-xs text-red-500">Las contraseñas no coinciden.</span>
        )}
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
        Mostrar contraseñas
      </label>
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-full px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundImage: GRAD_AZUL }}
      >
        {enviando ? "Guardando…" : textoBoton}
      </button>
    </form>
  );
}

// Pantalla completa para el cambio obligatorio tras recibir una contraseña temporal.
export default function CambioObligatorioPage({ usuario, onCambiada, onCerrarSesion }) {
  return (
    <div className="relative min-h-screen bg-white text-slate-800">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="escatt-blob-1 absolute -left-24 -top-28 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${AZUL_CLARO}55, transparent 70%)` }}
        />
        <div
          className="escatt-blob-2 absolute -right-32 top-1/3 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_MEDIO}44, transparent 70%)` }}
        />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
        <div className={`rounded-3xl p-7 sm:p-9 ${VIDRIO} bg-white/85`}>
          <span className="text-lg font-bold" style={{ color: AZUL_MEDIO }}>
            ESCATT
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Crea tu contraseña</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hola, {usuario.nombre}. Entraste con una contraseña temporal; por seguridad, elige una
            nueva antes de continuar.
          </p>
          <div className="mt-6">
            <FormCambioPassword onCambiada={onCambiada} textoBoton="Guardar y continuar" />
          </div>
          <button
            type="button"
            onClick={onCerrarSesion}
            className="mt-5 w-full text-center text-sm text-slate-500 transition hover:text-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
