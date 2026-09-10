import { useState } from "react";
import { GRAD_AZUL, VIDRIO } from "../../lib/theme";
import { api } from "../../lib/api";

// Pantalla: Alta
// Registra un nuevo usuario (alumno, sinodal o personal CATT) contra
// POST /api/usuarios.
//
// Ya está enganchada como la sección "Alta" del panel (pages/Panel). Usa la
// paleta compartida de lib/theme.js y el cliente HTTP de lib/api.js en vez
// de duplicarlos.

// Las 3 carreras reales de ESCOM (espejo de CARRERAS_VALIDAS del backend).
const CARRERAS = ["ISC", "IIA", "LCD"];

const CAMPOS_INICIALES = {
  nombre: "",
  correo: "",
  boleta: "",
  carrera: "",
  protocolo_tt: "",
  numero_empleado: "",
  especialidad: "",
  cargo: "",
};

const claseInput =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40";
const claseLabel = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function AltaPage() {
  const [tipo, setTipo] = useState("alumno");
  const [formData, setFormData] = useState(CAMPOS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    // Mapeo de datos para que coincida con el backend (/api/usuarios)
    const payload = {
      nombre: formData.nombre.trim(),
      correo: formData.correo.trim(),
      tipo,
      ...(tipo === "alumno" && {
        boleta: formData.boleta,
        carrera: formData.carrera,
        protocolo_tt: formData.protocolo_tt,
      }),
      ...(tipo === "sinodal" && {
        numero_empleado: formData.numero_empleado,
        especialidad: formData.especialidad,
      }),
      ...(tipo === "personal" && {
        numero_empleado: formData.numero_empleado,
        cargo: formData.cargo,
      }),
    };

    try {
      await api("/api/usuarios", { method: "POST", body: payload });
      setMensaje({ tipo: "exito", texto: "¡Usuario registrado correctamente!" });
      setFormData(CAMPOS_INICIALES);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mx-auto max-w-2xl rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <h2 className="text-2xl font-bold text-slate-800">Alta de usuario</h2>

      {mensaje && (
        <div
          role="alert"
          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
            mensaje.tipo === "exito"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className={claseLabel}>Nombre completo</label>
          <input
            type="text"
            name="nombre"
            required
            value={formData.nombre}
            onChange={handleChange}
            className={claseInput}
          />
        </div>

        <div>
          <label className={claseLabel}>Correo electrónico</label>
          <input
            type="email"
            name="correo"
            required
            value={formData.correo}
            onChange={handleChange}
            className={claseInput}
          />
        </div>

        <div>
          <label className={claseLabel}>Tipo de usuario</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={claseInput}>
            <option value="alumno">Alumno</option>
            <option value="sinodal">Sinodal</option>
            <option value="personal">Personal CATT</option>
          </select>
        </div>

        {/* Campos condicionales según el rol */}
        <div className="space-y-4 rounded-2xl bg-white/60 p-4">
          {tipo === "alumno" && (
            <>
              <div>
                <label className={claseLabel}>Boleta</label>
                <input
                  type="text"
                  name="boleta"
                  required
                  value={formData.boleta}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Carrera</label>
                <select
                  name="carrera"
                  required
                  value={formData.carrera}
                  onChange={handleChange}
                  className={claseInput}
                >
                  <option value="">Selecciona…</option>
                  {CARRERAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={claseLabel}>Protocolo TT (Opcional)</label>
                <input
                  type="text"
                  name="protocolo_tt"
                  value={formData.protocolo_tt}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
            </>
          )}

          {tipo === "sinodal" && (
            <>
              <div>
                <label className={claseLabel}>Número de empleado</label>
                <input
                  type="text"
                  name="numero_empleado"
                  required
                  value={formData.numero_empleado}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  required
                  value={formData.especialidad}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
            </>
          )}

          {tipo === "personal" && (
            <>
              <div>
                <label className={claseLabel}>Número de empleado</label>
                <input
                  type="text"
                  name="numero_empleado"
                  required
                  value={formData.numero_empleado}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
              <div>
                <label className={claseLabel}>Cargo</label>
                <input
                  type="text"
                  name="cargo"
                  required
                  value={formData.cargo}
                  onChange={handleChange}
                  className={claseInput}
                />
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundImage: GRAD_AZUL }}
        >
          {loading ? "Registrando…" : "Registrar usuario"}
        </button>
      </form>
    </div>
  );
}
