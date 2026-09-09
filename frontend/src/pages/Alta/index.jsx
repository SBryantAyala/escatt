import { useState } from "react";

export default function AltaPage() {
  const [tipo, setTipo] = useState("alumno");
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    boleta: "",
    carrera: "",
    protocolo_tt: "",
    numero_empleado: "",
    especialidad: "",
    cargo: "",
  });
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
      const res = await fetch("http://localhost:3000/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar el usuario");
      }

      setMensaje({ tipo: "exito", texto: "¡Usuario registrado correctamente!" });

      // Reiniciar formulario
      setFormData({
        nombre: "",
        correo: "",
        boleta: "",
        carrera: "",
        protocolo_tt: "",
        numero_empleado: "",
        especialidad: "",
        cargo: "",
      });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-xl shadow border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Alta de Usuario</h2>

      {mensaje && (
        <div
          className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            mensaje.tipo === "exito"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input
            type="text"
            name="nombre"
            required
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
          <input
            type="email"
            name="correo"
            required
            value={formData.correo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de usuario</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="alumno">Alumno</option>
            <option value="sinodal">Sinodal</option>
            <option value="personal">Personal Administrativo</option>
          </select>
        </div>

        {/* Campos condicionales según el rol */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
          {tipo === "alumno" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Boleta</label>
                <input
                  type="text"
                  name="boleta"
                  required
                  value={formData.boleta}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Carrera</label>
                <input
                  type="text"
                  name="carrera"
                  required
                  value={formData.carrera}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo TT (Opcional)</label>
                <input
                  type="text"
                  name="protocolo_tt"
                  value={formData.protocolo_tt}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}

          {tipo === "sinodal" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Empleado</label>
                <input
                  type="text"
                  name="numero_empleado"
                  required
                  value={formData.numero_empleado}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  required
                  value={formData.especialidad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}

          {tipo === "personal" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Empleado</label>
                <input
                  type="text"
                  name="numero_empleado"
                  required
                  value={formData.numero_empleado}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <input
                  type="text"
                  name="cargo"
                  required
                  value={formData.cargo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition duration-200"
        >
          {loading ? "Registrando..." : "Registrar Usuario"}
        </button>
      </form>
    </div>
  );
}
