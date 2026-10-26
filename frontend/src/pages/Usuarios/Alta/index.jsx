import { Children, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { CARRERAS, ETIQUETA_ROL, PLANES, ROLES_CATT, ROLES_GESTION, tieneRol } from "../../../lib/roles";
import { AZUL_MEDIO, VIDRIO } from "../../../lib/theme";
import { IconoAcademia, IconoAltaUsuario, IconoCuenta, IconoDocumento } from "../../../components/iconos";

// Pantalla: Alta de usuario (HU-4 docentes/alumnos, HU-6 personal CATT).
// Vive en /panel/usuarios/nuevo?perfil=alumno|docente|personal_catt.
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
  procedencia: "escom",
  escuela_origen: "",
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
  "alta-control min-h-13 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:font-normal placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";
const claseLabel = "mb-2 flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-800";

function Campo({ label, opcional, children }) {
  return (
    <label className="block min-w-0">
      <span className={claseLabel}>
        {label}
        {opcional ? <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Opcional</span> : <span aria-hidden="true" className="text-blue-700">*</span>}
      </span>
      {children}
    </label>
  );
}

function Selector({ children, className = "", ...props }) {
  const opciones = Children.toArray(children);
  const seleccionada = opciones.find((opcion) => String(opcion.props.value) === String(props.value)) || opciones[0];
  return (
    <span className="alta-selector relative grid w-full min-w-0">
      <select {...props} className={`${claseInput} absolute inset-0 h-full appearance-none pr-11 ${className}`}>{children}</select>
      <span aria-hidden="true" className={`pointer-events-none relative flex min-h-13 items-center break-words px-4 py-3 pr-11 text-sm leading-relaxed ${props.disabled ? "text-slate-500" : props.value ? "font-medium text-slate-800" : "text-slate-500"}`}><span>{seleccionada?.props.children}</span></span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center"><span className="-mt-1 h-2 w-2 rotate-45 border-b-2 border-r-2 border-[#1878B6]" /></span>
    </span>
  );
}

function EncabezadoSeccion({ numero, titulo, Icono, academico = false }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${academico ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}><Icono className="h-5 w-5" /></span>
      <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
      <span className={`ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${academico ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"}`}>{numero}</span>
    </div>
  );
}

// Tarjeta con la contraseña temporal recién generada.
function PasswordTemporal({ datos, onOtra, onVerDetalle, etiquetaOtra }) {
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
    <div className="border-l-4 border-emerald-500 bg-emerald-50 p-5 text-sm text-emerald-800 sm:p-8">
      <p role="status" className="flex items-center gap-2 text-base font-semibold">
        <IconoAltaUsuario className="h-5 w-5 shrink-0" />
        Cuenta creada para {datos.usuario.nombre} {datos.usuario.apellido_paterno}.
      </p>
      <p className="mt-2">
        Contraseña temporal (se muestra solo esta vez; entrégala a la persona por un medio
        seguro):
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="max-w-full break-all rounded-lg bg-white px-4 py-3 font-mono text-lg text-slate-800 ring-1 ring-emerald-200">
          {datos.password_temporal}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="min-h-11 rounded-full border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          {copiado ? "Contraseña copiada" : "Copiar contraseña"}
        </button>
      </div>
      <p className="mt-2 text-xs text-emerald-700/80">
        Al iniciar sesión se le pedirá cambiarla.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOtra}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white"
          style={{ backgroundColor: AZUL_MEDIO }}
        >
          <IconoAltaUsuario className="h-4 w-4" />{etiquetaOtra}
        </button>
        {onVerDetalle && (
          <button
            type="button"
            onClick={() => onVerDetalle(datos.usuario)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <IconoDocumento className="h-4 w-4" />Ver ficha
          </button>
        )}
      </div>
    </div>
  );
}

export default function AltaPage({ actor, perfilInicial = "alumno", academiaPreseleccionada, onVerDetalle }) {
  const configuracion = PERFILES.find((p) => p.valor === perfilInicial);
  const perfil = configuracion && tieneRol(actor, ...configuracion.altaPor) ? configuracion.valor : null;
  const formularioInicial = () => ({
    ...CAMPOS_INICIALES,
    ...(perfil === "docente" && academiaPreseleccionada && { academia_id: String(academiaPreseleccionada) }),
  });
  const [form, setForm] = useState(formularioInicial);
  // Si se llegó desde "Registrar docente nuevo" en la ficha de una academia,
  // el select de Academia llega bloqueado con esa academia; "Cambiar" lo
  // desbloquea por si la persona se equivocó de ficha.
  const [academiaBloqueada, setAcademiaBloqueada] = useState(Boolean(academiaPreseleccionada));
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
        <p className="text-slate-600">{configuracion ? `Tu rol no puede registrar ${configuracion.etiqueta.toLowerCase()}.` : "El tipo de registro solicitado no existe."}</p>
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
      ...(perfil === "alumno" && form.procedencia === "escom" && {
        procedencia: "escom",
        boleta: t(form.boleta),
        carrera: form.carrera,
        plan_estudios: form.plan_estudios,
      }),
      ...(perfil === "alumno" && form.procedencia === "externa" && {
        procedencia: "externa",
        escuela_origen: t(form.escuela_origen),
        carrera: t(form.carrera),
        ...(t(form.boleta) && { boleta: t(form.boleta) }),
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
      setForm(academiaBloqueada ? formularioInicial() : { ...CAMPOS_INICIALES });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const titulo = PERFILES.find((p) => p.valor === perfil)?.etiqueta ?? "usuario";
  const externa = perfil === "alumno" && form.procedencia === "externa";

  const cambiarProcedencia = (valor) => {
    setForm((f) => ({ ...f, procedencia: valor, boleta: "", carrera: "", plan_estudios: "", escuela_origen: "" }));
    setError(null);
  };

  return (
    <div className="alta-usuario mx-auto max-w-4xl overflow-hidden rounded-[20px] bg-white shadow-md ring-1 ring-slate-100">
      <header className="flex items-start gap-4 bg-[#1878B6] px-5 py-6 sm:px-8 sm:py-7">
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-white/25 text-white"><IconoAltaUsuario className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-white">Alta de {titulo.toLowerCase()}</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-100">Crea su cuenta y completa los datos de su perfil en ESCATT.</p>
        </div>
      </header>

      {creado && (
        <PasswordTemporal
          datos={creado}
          etiquetaOtra={perfil === "alumno" ? "Registrar otro alumno" : perfil === "docente" ? "Registrar otro docente" : "Registrar otro integrante CATT"}
          onOtra={() => setCreado(null)}
          onVerDetalle={onVerDetalle}
        />
      )}

      {error && (
        <div role="alert" className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-8">
          {error}
        </div>
      )}

      {!creado && (
        <form onSubmit={enviar} autoComplete="off">
          <fieldset disabled={enviando} className="min-w-0 space-y-8 px-5 py-7 disabled:opacity-70 sm:px-8 sm:py-8">
          <section>
          <EncabezadoSeccion numero="01" titulo="Datos personales" Icono={IconoCuenta} />
          <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
          <Campo label="Nombre(s)">
            <input required value={form.nombre} onChange={set("nombre")} placeholder="Nombre o nombres de la persona" className={claseInput} />
          </Campo>
          </div>
            <Campo label="Apellido paterno">
              <input
                required
                value={form.apellido_paterno}
                onChange={set("apellido_paterno")}
                placeholder="Primer apellido"
                className={claseInput}
              />
            </Campo>
            <Campo label="Apellido materno">
              <input
                required
                value={form.apellido_materno}
                onChange={set("apellido_materno")}
                placeholder="Segundo apellido"
                className={claseInput}
              />
            </Campo>
          <Campo label="Correo electrónico">
            <input
              type="email"
              required
              value={form.correo}
              onChange={set("correo")}
              placeholder={perfil === "alumno" ? (externa ? "correo@su-escuela.edu.mx" : "usuario@alumno.ipn.mx") : "usuario@ipn.mx"}
              className={claseInput}
            />
          </Campo>
          <Campo label="Teléfono" opcional>
            <input type="tel" value={form.telefono} onChange={set("telefono")} placeholder="Ej. 5512345678" className={claseInput} />
          </Campo>
          </div>
          </section>

          <section>
            <EncabezadoSeccion numero="02" titulo={perfil === "alumno" ? "Datos académicos" : perfil === "docente" ? "Información docente" : "Asignación en la CATT"} Icono={IconoAcademia} academico />
            <div className="space-y-5">
            {perfil === "alumno" && (
              <fieldset className="min-w-0">
                <legend className={claseLabel}>Procedencia del alumno</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { valor: "escom", etiqueta: "ESCOM" },
                    { valor: "externa", etiqueta: "Otra escuela" },
                  ].map((o) => (
                    <label
                      key={o.valor}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                        form.procedencia === o.valor
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="procedencia"
                        value={o.valor}
                        checked={form.procedencia === o.valor}
                        onChange={() => cambiarProcedencia(o.valor)}
                        className="h-4 w-4 accent-[#1878B6]"
                      />
                      {o.etiqueta}
                    </label>
                  ))}
                </div>
                {externa && (
                  <p className="mt-2 text-sm text-slate-600">
                    Participa con una carta de la CATT en lugar de kárdex. Su correo puede ser de cualquier dominio y
                    puede formar equipo con alumnos de ESCOM.
                  </p>
                )}
              </fieldset>
            )}

            {perfil === "alumno" && !externa && (
              <>
                <Campo label="Boleta (10 dígitos)">
                  <input
                    required
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    placeholder="Ingresa los 10 dígitos de la boleta"
                    value={form.boleta}
                    onChange={set("boleta")}
                    className={claseInput}
                  />
                </Campo>
                <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
                  <Campo label="Carrera">
                    <Selector required value={form.carrera} onChange={set("carrera")}>
                      <option value="">Selecciona una carrera</option>
                      {CARRERAS.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.etiqueta}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                  <Campo label="Plan de estudios">
                    <Selector
                      required
                      value={form.plan_estudios}
                      onChange={set("plan_estudios")}
                    >
                      <option value="">Selecciona un plan</option>
                      {PLANES.map((p) => (
                        <option key={p} value={p}>
                          Plan {p}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                </div>
              </>
            )}

            {externa && (
              <>
                <Campo label="Escuela de origen">
                  <input
                    required
                    maxLength={200}
                    placeholder="Ej. UAM Azcapotzalco"
                    value={form.escuela_origen}
                    onChange={set("escuela_origen")}
                    className={claseInput}
                  />
                </Campo>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo label="Carrera">
                    <input
                      required
                      maxLength={120}
                      placeholder="Ej. Ingeniería en Computación"
                      value={form.carrera}
                      onChange={set("carrera")}
                      className={claseInput}
                    />
                  </Campo>
                  <Campo label="Boleta o matrícula en su escuela" opcional>
                    <input maxLength={30} value={form.boleta} onChange={set("boleta")} className={claseInput} />
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
                  <div className="flex items-center gap-2">
                    <Selector
                      required
                      value={form.academia_id}
                      onChange={set("academia_id")}
                      disabled={academiaBloqueada}
                    >
                      <option value="">Selecciona…</option>
                      {academias.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </Selector>
                    {academiaBloqueada && (
                      <button
                        type="button"
                        onClick={() => setAcademiaBloqueada(false)}
                        className="shrink-0 whitespace-nowrap text-xs font-medium text-[#1878B6] underline-offset-2 hover:underline"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
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
                  <Selector value={form.rol_catt} onChange={set("rol_catt")}>
                    {ROLES_CATT.map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </option>
                    ))}
                  </Selector>
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
          </section>
          </fieldset>

          <div className="flex flex-col gap-4 border-t border-blue-100 bg-blue-50 px-5 py-6 md:flex-row md:items-center md:justify-between sm:px-8">
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-800">Acceso con contraseña temporal</p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-600">Se mostrará al registrar la cuenta. La persona deberá cambiarla en su primer acceso.</p>
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#1878B6] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#0F5C8C] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {enviando ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" /> : <IconoAltaUsuario className="h-4 w-4" />}
            {enviando ? "Registrando…" : `Registrar ${titulo.toLowerCase()}`}
          </button>
          </div>
          <p className="bg-blue-50 px-5 pb-5 text-sm text-slate-600 sm:px-8"><span className="font-semibold text-blue-700">*</span> Campos obligatorios</p>
        </form>
      )}
    </div>
  );
}
