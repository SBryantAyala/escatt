import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { CARRERAS, ETIQUETA_ROL, PLANES, ROLES_CATT, ROLES_GESTION, tieneRol } from "../../../lib/roles";
import { GRAD_AZUL, VIDRIO } from "../../../lib/theme";

// Pantalla: Alta de usuario (HU-4 docentes/alumnos, HU-6 personal CATT).
// POST /api/usuarios con `perfil`:
//   alumno | docente  -> Secretario Ejecutivo o Auxiliar CATT
//   personal_catt     -> solo el Administrador del sistema (con rol_catt)
// La cuenta nace con una contraseña temporal que se muestra UNA sola vez aquí;
// la persona la cambia en su primer inicio de sesión.

const PERFILES = [
  { valor: "alumno", etiqueta: "Alumno", altaPor: ROLES_GESTION },
  { valor: "docente", etiqueta: "Docente", altaPor: ROLES_GESTION },
  { valor: "personal_catt", etiqueta: "Personal CATT", altaPor: ["admin_sistema"] },
];

const CAMPOS_INICIALES = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  correo: "",
  telefono: "",
  boleta: "",
  carrera: "",
  plan_estudios: "",
  numero_empleado: "",
  academia_id: "",
  cedula_profesional: "",
  extension: "",
  cargo: "",
  rol_catt: "catt_auxiliar",
};

const claseInput =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40";
const claseLabel = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function Campo({ label, opcional, children }) {
  return (
    <label className="block">
      <span className={claseLabel}>
        {label}
        {opcional && <span className="ml-1 lowercase text-slate-400">(opcional)</span>}
      </span>
      {children}
    </label>
  );
}

// Tarjeta con la contraseña temporal recién generada.
function PasswordTemporal({ datos, onOtra, onVerDetalle }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(datos.password_temporal);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };
  return (
    <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">
      <p className="font-semibold">
        Cuenta creada para {datos.usuario.nombre} {datos.usuario.apellido_paterno}.
      </p>
      <p className="mt-2">
        Contraseña temporal (se muestra solo esta vez; entrégala a la persona por un medio
        seguro):
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-base tracking-wider text-slate-800 ring-1 ring-emerald-200">
          {datos.password_temporal}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          {copiado ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p className="mt-2 text-xs text-emerald-700/80">
        Al iniciar sesión se le pedirá cambiarla.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOtra}
          className="rounded-full px-4 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundImage: GRAD_AZUL }}
        >
          Registrar otra persona
        </button>
        {onVerDetalle && (
          <button
            type="button"
            onClick={() => onVerDetalle(datos.usuario)}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Ver ficha
          </button>
        )}
      </div>
    </div>
  );
}

export default function AltaPage({ actor, perfilInicial = "alumno", onVerDetalle }) {
  const perfilesPermitidos = PERFILES.filter((p) => tieneRol(actor, ...p.altaPor));
  const inicial = perfilesPermitidos.some((p) => p.valor === perfilInicial)
    ? perfilInicial
    : perfilesPermitidos[0]?.valor;

  const [perfil, setPerfil] = useState(inicial);
  const [form, setForm] = useState(CAMPOS_INICIALES);
  const [academias, setAcademias] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null);

  useEffect(() => {
    if (perfil !== "docente") return undefined;
    let vivo = true;
    api("/api/academias")
      .then((datos) => vivo && setAcademias(datos))
      .catch((e) => vivo && setError(`No se pudieron cargar las academias: ${e.message}`));
    return () => {
      vivo = false;
    };
  }, [perfil]);

  if (!perfil) {
    return (
      <div className={`mx-auto max-w-2xl rounded-3xl p-8 text-center ${VIDRIO} bg-white/85`}>
        <p className="text-slate-600">Tu rol no puede dar de alta usuarios.</p>
      </div>
    );
  }

  const set = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setError(null);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const t = (v) => String(v ?? "").trim();
    const payload = {
      perfil,
      nombre: t(form.nombre),
      apellido_paterno: t(form.apellido_paterno),
      apellido_materno: t(form.apellido_materno),
      correo: t(form.correo),
      telefono: t(form.telefono),
      ...(perfil === "alumno" && {
        boleta: t(form.boleta),
        carrera: form.carrera,
        plan_estudios: form.plan_estudios,
      }),
      ...(perfil === "docente" && {
        numero_empleado: t(form.numero_empleado),
        academia_id: Number(form.academia_id) || null,
        cedula_profesional: t(form.cedula_profesional),
        extension: t(form.extension),
      }),
      ...(perfil === "personal_catt" && {
        numero_empleado: t(form.numero_empleado),
        cargo: t(form.cargo),
        rol_catt: form.rol_catt,
      }),
    };

    try {
      const datos = await api("/api/usuarios", { method: "POST", body: payload });
      setCreado(datos);
      setForm(CAMPOS_INICIALES);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const titulo = PERFILES.find((p) => p.valor === perfil)?.etiqueta ?? "usuario";

  return (
    <div className={`mx-auto max-w-2xl rounded-3xl p-6 sm:p-8 ${VIDRIO} bg-white/85`}>
      <h2 className="text-2xl font-bold text-slate-800">Alta de {titulo.toLowerCase()}</h2>
      <p className="mt-1 text-sm text-slate-500">
        La persona recibirá una contraseña temporal y deberá cambiarla al entrar.
      </p>

      {creado && (
        <PasswordTemporal
          datos={creado}
          onOtra={() => setCreado(null)}
          onVerDetalle={onVerDetalle}
        />
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!creado && (
        <form onSubmit={enviar} className="mt-6 space-y-4">
          {perfilesPermitidos.length > 1 && (
            <Campo label="Tipo de persona">
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
                className={claseInput}
              >
                {perfilesPermitidos.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo label="Nombre(s)">
            <input required value={form.nombre} onChange={set("nombre")} className={claseInput} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Apellido paterno">
              <input
                required
                value={form.apellido_paterno}
                onChange={set("apellido_paterno")}
                className={claseInput}
              />
            </Campo>
            <Campo label="Apellido materno">
              <input
                required
                value={form.apellido_materno}
                onChange={set("apellido_materno")}
                className={claseInput}
              />
            </Campo>
          </div>
          <Campo label="Correo electrónico">
            <input
              type="email"
              required
              value={form.correo}
              onChange={set("correo")}
              placeholder={perfil === "alumno" ? "usuario@alumno.ipn.mx" : "usuario@ipn.mx"}
              className={claseInput}
            />
          </Campo>
          <Campo label="Teléfono" opcional>
            <input type="tel" value={form.telefono} onChange={set("telefono")} className={claseInput} />
          </Campo>

          <div className="space-y-4 rounded-2xl bg-white/60 p-4">
            {perfil === "alumno" && (
              <>
                <Campo label="Boleta (10 dígitos)">
                  <input
                    required
                    inputMode="numeric"
                    pattern="\d{10}"
                    value={form.boleta}
                    onChange={set("boleta")}
                    className={claseInput}
                  />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo label="Carrera">
                    <select required value={form.carrera} onChange={set("carrera")} className={claseInput}>
                      <option value="">Selecciona…</option>
                      {CARRERAS.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.etiqueta}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Plan de estudios">
                    <select
                      required
                      value={form.plan_estudios}
                      onChange={set("plan_estudios")}
                      className={claseInput}
                    >
                      <option value="">Selecciona…</option>
                      {PLANES.map((p) => (
                        <option key={p} value={p}>
                          Plan {p}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
              </>
            )}

            {(perfil === "docente" || perfil === "personal_catt") && (
              <Campo label="Número de empleado">
                <input
                  required
                  value={form.numero_empleado}
                  onChange={set("numero_empleado")}
                  className={claseInput}
                />
              </Campo>
            )}

            {perfil === "docente" && (
              <>
                <Campo label="Academia">
                  <select
                    required
                    value={form.academia_id}
                    onChange={set("academia_id")}
                    className={claseInput}
                  >
                    <option value="">Selecciona…</option>
                    {academias.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo label="Cédula profesional" opcional>
                    <input
                      value={form.cedula_profesional}
                      onChange={set("cedula_profesional")}
                      className={claseInput}
                    />
                  </Campo>
                  <Campo label="Extensión" opcional>
                    <input value={form.extension} onChange={set("extension")} className={claseInput} />
                  </Campo>
                </div>
              </>
            )}

            {perfil === "personal_catt" && (
              <>
                <Campo label="Rol en la CATT">
                  <select value={form.rol_catt} onChange={set("rol_catt")} className={claseInput}>
                    {ROLES_CATT.map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Cargo" opcional>
                  <input
                    value={form.cargo}
                    onChange={set("cargo")}
                    placeholder="Ej. Secretaría Ejecutiva, Personal administrativo…"
                    className={claseInput}
                  />
                </Campo>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-full px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundImage: GRAD_AZUL }}
          >
            {enviando ? "Registrando…" : `Registrar ${titulo.toLowerCase()}`}
          </button>
        </form>
      )}
    </div>
  );
}
