import { useEffect, useState } from "react";
import NexusLogo from "./components/NexusLogo";
import ListadoPage from "./pages/Listado";

// Navegación mínima sin librerías externas: Sprint 1 solo necesita
// Landing -> Listado (useState, sin react-router).
//
// Paleta DOMINANTE de ESCATT: azul institucional #1878B6 -> #4FB3E8.
// El amarillo #FDD40A es identidad de Nexus Solutions y aparece ÚNICAMENTE
// en su logo y en su crédito de texto, nunca como color de una sección.
const AZUL_MEDIO = "#1878B6";
const AZUL_CLARO = "#4FB3E8";
const AZUL_OSCURO = "#0F5C8C";

const GRAD_AZUL = `linear-gradient(135deg, ${AZUL_MEDIO} 0%, ${AZUL_CLARO} 100%)`;

// Clases reutilizables para el efecto "vidrio esmerilado".
const VIDRIO =
  "border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-[#1878B6]/10";

const ETAPAS = [
  { titulo: "Protocolo", texto: "El alumno registra su propuesta de Trabajo Terminal." },
  {
    titulo: "Trabajo Terminal I",
    texto: "Inicia el desarrollo del proyecto con su sinodal asignado.",
  },
  {
    titulo: "Trabajo Terminal II",
    texto: "Entrega el reporte técnico y avanza a la recta final.",
  },
  {
    titulo: "Presentación final",
    texto: "El alumno presenta y es evaluado por el jurado de sinodales.",
  },
];

const TIPOS = [
  {
    rol: "Alumno",
    texto:
      "Registra su Protocolo de Trabajo Terminal y avanza por las etapas TT-I y TT-II hasta su presentación final.",
  },
  {
    rol: "Sinodal",
    texto: "Asesora el desarrollo del trabajo y evalúa al alumno en cada presentación.",
  },
  {
    rol: "Personal CATT",
    texto:
      "Administra registros, calendarios y aprueba modificaciones a lo largo de todo el proceso.",
  },
];

// Íconos minimalistas (1-2 trazos) para el grid de operaciones.
const OPERACIONES = [
  {
    etiqueta: "Listar",
    icono: (
      <>
        <path d="M8 7h11M8 12h11M8 17h11" />
        <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  { etiqueta: "Dar de alta", icono: <path d="M12 5v14M5 12h14" /> },
  {
    etiqueta: "Consultar",
    icono: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.3-4.3" />
      </>
    ),
  },
  {
    etiqueta: "Modificar",
    icono: (
      <>
        <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3z" />
        <path d="M14 6l3 3" />
      </>
    ),
  },
  {
    etiqueta: "Revocar acceso",
    icono: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 7l10 10" />
      </>
    ),
  },
  {
    etiqueta: "Eliminar",
    icono: (
      <>
        <path d="M5 7h14M10 7V5h4v2" />
        <path d="M8 7l1 12h6l1-12" />
      </>
    ),
  },
];

const CHIPS = ["React + Node.js + SQLite", "100% local", "Sin dependencias externas"];

// Insignia de co-marca: aquí es donde vive el amarillo de Nexus, sobre fondo
// oscuro para que el #FDD40A sea legible.
function InsigniaNexus({ logo = 20, texto = "text-xs" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5">
      <NexusLogo size={logo} />
      <span className={`${texto} font-semibold text-[#FDD40A]`}>Nexus Solutions</span>
    </span>
  );
}

// --- Autenticación (Sprint 2) ---------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "escatt_token";

// Cliente HTTP mínimo: adjunta el token Bearer si existe y normaliza errores
// para poder mostrarlos en la UI (nunca un alert).
async function api(ruta, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let datos = null;
  try {
    datos = await resp.json();
  } catch {
    datos = null;
  }
  if (!resp.ok) {
    throw new Error(datos?.error || `Error ${resp.status}`);
  }
  return datos;
}

const OPCIONES_TIPO = [
  { valor: "alumno", etiqueta: "Alumno" },
  { valor: "sinodal", etiqueta: "Sinodal" },
  { valor: "personal", etiqueta: "Personal CATT" },
];

const CARRERAS = ["ISC", "IIA", "LCD"];

// Campos extra que pide el registro según el tipo (espejo de REQUERIDOS_REGISTRO
// del backend). protocolo_tt no se pide aquí.
const CAMPOS_EXTRA_POR_TIPO = {
  alumno: [
    { name: "boleta", label: "Boleta", tipo: "text" },
    { name: "carrera", label: "Carrera", tipo: "select", opciones: CARRERAS },
  ],
  sinodal: [
    { name: "numero_empleado", label: "Número de empleado", tipo: "text" },
    { name: "especialidad", label: "Especialidad", tipo: "text" },
  ],
  personal: [
    { name: "numero_empleado", label: "Número de empleado", tipo: "text" },
    { name: "cargo", label: "Cargo", tipo: "text" },
  ],
};

const CORREO_RE_FRONT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Requisitos de contraseña, evaluados en vivo mientras se escribe.
function requisitosPassword(p) {
  return {
    largo: p.length >= 9,
    letra: /[a-zA-Z]/.test(p),
    numero: /[0-9]/.test(p),
  };
}

function passwordValidoFront(p) {
  const r = requisitosPassword(p);
  return r.largo && r.letra && r.numero;
}

// Clases del input según su estado de validación en vivo.
function clasesInput(estado) {
  const base =
    "w-full rounded-xl border bg-white/80 px-3 py-2.5 text-sm outline-none transition";
  if (estado === "error") {
    return `${base} border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200`;
  }
  if (estado === "ok") {
    return `${base} border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60`;
  }
  return `${base} border-slate-200 focus:border-[#1878B6] focus:ring-2 focus:ring-[#4FB3E8]/40`;
}

function IconoOk() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Campo de texto con estado visual en vivo: neutro / válido (verde) / error (rojo).
function CampoLive({ label, type = "text", value, onChange, onBlur, error, valido }) {
  const estado = error ? "error" : valido ? "ok" : "base";
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {estado === "ok" && (
          <span className="text-emerald-500">
            <IconoOk />
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={estado === "error"}
        className={clasesInput(estado)}
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function SelectLive({ label, value, onChange, onBlur, opciones, placeholder, error, valido }) {
  const estado = error ? "error" : valido ? "ok" : "base";
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {estado === "ok" && (
          <span className="text-emerald-500">
            <IconoOk />
          </span>
        )}
      </span>
      <select
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={clasesInput(estado)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opciones.map((op) => (
          <option key={op.valor ?? op} value={op.valor ?? op}>
            {op.etiqueta ?? op}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

function ListaRequisitos({ req }) {
  const items = [
    ["Al menos 9 caracteres", req.largo],
    ["Al menos una letra", req.letra],
    ["Al menos un número", req.numero],
  ];
  return (
    <ul className="mt-2 space-y-1">
      {items.map(([texto, ok]) => (
        <li
          key={texto}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            ok ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              ok ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {texto}
        </li>
      ))}
    </ul>
  );
}

// Páginas dedicadas (no modal) para iniciar sesión y registrarse. Comparten
// layout; `modo` decide qué campos aparecen. Validación en vivo + alertas.
function AuthPage({ modo, onAutenticado, onSalir, onCambiarModo }) {
  const esRegistro = modo === "registro";

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    password: "",
    tipo: "alumno",
    boleta: "",
    carrera: "",
    numero_empleado: "",
    especialidad: "",
    cargo: "",
  });
  const [tocado, setTocado] = useState({});
  const [intentado, setIntentado] = useState(false);
  const [alerta, setAlerta] = useState(null); // { tipo: "error" | "ok", texto }
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === "Escape") onSalir();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [onSalir]);

  const set = (campo) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [campo]: value }));
    setAlerta(null);
  };
  const alSalirCampo = (campo) => () => setTocado((t) => ({ ...t, [campo]: true }));

  // --- Validación en vivo: se recalcula en cada tecla ---
  const nombre = form.nombre.trim();
  const correo = form.correo.trim();
  const reqPassword = requisitosPassword(form.password);
  const camposExtra = esRegistro ? CAMPOS_EXTRA_POR_TIPO[form.tipo] : [];

  const errores = {};
  if (esRegistro && !nombre) errores.nombre = "Escribe tu nombre.";
  if (!correo) errores.correo = "Escribe tu correo.";
  else if (!CORREO_RE_FRONT.test(correo)) {
    errores.correo = "Ese correo no tiene un formato válido.";
  }
  if (!form.password) errores.password = "Escribe tu contraseña.";
  else if (esRegistro && !passwordValidoFront(form.password)) {
    errores.password = "La contraseña no cumple los requisitos.";
  }
  if (esRegistro) {
    for (const campo of camposExtra) {
      if (String(form[campo.name] ?? "").trim() === "") {
        errores[campo.name] = `Completa ${campo.label.toLowerCase()}.`;
      }
    }
  }

  const formOk = Object.keys(errores).length === 0;
  // Un error solo se muestra tras salir del campo o tras intentar enviar.
  const mostrar = (campo) =>
    ((tocado[campo] || intentado) && errores[campo]) || null;
  const valido = (campo) => String(form[campo] ?? "").trim() !== "" && !errores[campo];

  const enviar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    setAlerta(null);

    if (!formOk) {
      setAlerta({ tipo: "error", texto: "Revisa los campos marcados en rojo." });
      return;
    }

    const cuerpo = esRegistro
      ? {
          nombre,
          correo,
          password: form.password,
          tipo: form.tipo,
          ...Object.fromEntries(
            camposExtra.map((c) => [c.name, String(form[c.name]).trim()]),
          ),
        }
      : { correo, password: form.password };

    setEnviando(true);
    try {
      const datos = await api(esRegistro ? "/api/auth/registro" : "/api/auth/login", {
        method: "POST",
        body: cuerpo,
      });
      localStorage.setItem(TOKEN_KEY, datos.token);
      setAlerta({ tipo: "ok", texto: "Listo, entrando…" });
      onAutenticado(datos.usuario);
    } catch (err) {
      setAlerta({ tipo: "error", texto: err.message });
      setEnviando(false);
    }
  };

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
        <button
          type="button"
          onClick={onSalir}
          className="mb-6 self-start text-sm text-slate-500 transition hover:text-slate-800"
        >
          ← Volver al inicio
        </button>

        <div className={`rounded-3xl p-7 sm:p-9 ${VIDRIO} bg-white/85`}>
          <span className="text-lg font-bold" style={{ color: AZUL_MEDIO }}>
            ESCATT
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-800 sm:text-3xl">
            {esRegistro ? "Crea tu cuenta" : "Inicia sesión"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {esRegistro
              ? "Regístrate para acceder a tu panel de ESCATT."
              : "Entra con tu correo y contraseña."}
          </p>

          {alerta && (
            <div
              role="alert"
              className={`mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${
                alerta.tipo === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {alerta.tipo === "error" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M12 7v6M12 16.5h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <IconoOk />
                )}
              </span>
              <span>{alerta.texto}</span>
            </div>
          )}

          <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
            {esRegistro && (
              <CampoLive
                label="Nombre"
                value={form.nombre}
                onChange={set("nombre")}
                onBlur={alSalirCampo("nombre")}
                error={mostrar("nombre")}
                valido={valido("nombre")}
              />
            )}

            <CampoLive
              label="Correo"
              type="email"
              value={form.correo}
              onChange={set("correo")}
              onBlur={alSalirCampo("correo")}
              error={mostrar("correo")}
              valido={valido("correo")}
            />

            <div>
              <CampoLive
                label="Contraseña"
                type="password"
                value={form.password}
                onChange={set("password")}
                onBlur={alSalirCampo("password")}
                error={mostrar("password")}
                valido={
                  esRegistro
                    ? passwordValidoFront(form.password)
                    : form.password.length > 0 && !errores.password
                }
              />
              {esRegistro && <ListaRequisitos req={reqPassword} />}
            </div>

            {esRegistro && (
              <SelectLive
                label="Tipo de usuario"
                value={form.tipo}
                onChange={set("tipo")}
                opciones={OPCIONES_TIPO}
              />
            )}

            {esRegistro &&
              camposExtra.map((campo) =>
                campo.tipo === "select" ? (
                  <SelectLive
                    key={campo.name}
                    label={campo.label}
                    value={form[campo.name]}
                    onChange={set(campo.name)}
                    onBlur={alSalirCampo(campo.name)}
                    opciones={campo.opciones}
                    placeholder="Selecciona…"
                    error={mostrar(campo.name)}
                    valido={valido(campo.name)}
                  />
                ) : (
                  <CampoLive
                    key={campo.name}
                    label={campo.label}
                    value={form[campo.name]}
                    onChange={set(campo.name)}
                    onBlur={alSalirCampo(campo.name)}
                    error={mostrar(campo.name)}
                    valido={valido(campo.name)}
                  />
                ),
              )}

            <button
              type="submit"
              disabled={enviando || (intentado && !formOk)}
              className="mt-1 inline-flex w-full items-center justify-center rounded-full px-5 py-3
                         font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                         hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundImage: GRAD_AZUL }}
            >
              {enviando ? "Enviando…" : esRegistro ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {esRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button
              type="button"
              onClick={() => onCambiarModo(esRegistro ? "login" : "registro")}
              className="font-semibold text-[#1878B6] transition hover:underline"
            >
              {esRegistro ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelPage({ usuario, onIrListado, onCerrarSesion, onVolver }) {
  const esPersonal = usuario.tipo === "personal";
  const etiquetaTipo =
    usuario.tipo === "alumno"
      ? "Alumno"
      : usuario.tipo === "sinodal"
        ? "Sinodal"
        : "Personal CATT";

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

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-16">
        <div className={`w-full rounded-3xl p-8 ${VIDRIO} bg-white/80`}>
          <span className="inline-flex items-center rounded-full bg-[#4FB3E8]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0F5C8C]">
            Panel · {etiquetaTipo}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-800 sm:text-4xl">
            Bienvenido, {usuario.nombre}
          </h1>

          {esPersonal ? (
            <>
              <p className="mt-3 text-slate-600">
                Desde aquí administras el padrón de participantes del proceso de titulación.
              </p>
              <button
                type="button"
                onClick={onIrListado}
                className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3
                           font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                           hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: GRAD_AZUL }}
              >
                Ver listado de usuarios
              </button>
            </>
          ) : (
            <p className="mt-3 text-slate-600">
              Tu panel de {etiquetaTipo} está en construcción — estará disponible en un próximo
              sprint.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCerrarSesion}
              className="rounded-full border border-slate-200 bg-white/70 px-5 py-2 text-sm font-semibold
                         text-slate-600 transition hover:bg-white"
            >
              Cerrar sesión
            </button>
            <button
              type="button"
              onClick={onVolver}
              className="rounded-full px-5 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fondo por diapositiva: el mismo trío de azules de marca, variando ángulo y
// orden para que cada etapa se sienta distinta sin salirse de la identidad.
// El extremo oscuro siempre queda del lado izquierdo, donde va el texto.
const FONDOS_BANNER = [
  `linear-gradient(135deg, ${AZUL_OSCURO} 0%, ${AZUL_MEDIO} 55%, ${AZUL_CLARO} 100%)`,
  `linear-gradient(200deg, ${AZUL_MEDIO} 0%, ${AZUL_OSCURO} 60%, ${AZUL_MEDIO} 100%)`,
  `linear-gradient(115deg, ${AZUL_OSCURO} 0%, ${AZUL_OSCURO} 30%, ${AZUL_CLARO} 100%)`,
  `linear-gradient(160deg, ${AZUL_MEDIO} 0%, ${AZUL_OSCURO} 50%, ${AZUL_MEDIO} 100%)`,
];

// Formas decorativas abstractas (solo blanco translúcido), una por diapositiva,
// al costado derecho — como el "hueco" de la foto en el banner de ESCOM, pero
// sin depender de imágenes ni assets externos.
const DECORES_BANNER = [
  <g key="d0" fill="none" stroke="#fff" strokeWidth="2">
    <circle cx="300" cy="230" r="60" opacity="0.22" />
    <circle cx="300" cy="230" r="115" opacity="0.15" />
    <circle cx="300" cy="230" r="170" opacity="0.09" />
    <circle cx="300" cy="230" r="225" opacity="0.05" />
  </g>,
  <g key="d1" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="3">
    <path d="M60 110 C 160 40, 300 200, 460 110" opacity="0.18" />
    <path d="M60 190 C 160 120, 300 280, 460 190" opacity="0.14" />
    <path d="M60 270 C 160 200, 300 360, 460 270" opacity="0.10" />
    <path d="M60 350 C 160 280, 300 440, 460 350" opacity="0.06" />
  </g>,
  <g key="d2" stroke="#fff" fill="#fff" strokeWidth="2">
    <rect x="230" y="140" width="170" height="170" rx="22" transform="rotate(18 315 225)" fillOpacity="0.08" strokeOpacity="0.18" />
    <rect x="265" y="175" width="170" height="170" rx="22" transform="rotate(-12 350 260)" fillOpacity="0.05" strokeOpacity="0.13" />
  </g>,
  <g key="d3" fill="#fff" stroke="#fff">
    {Array.from({ length: 5 }).map((_, r) =>
      Array.from({ length: 5 }).map((__, c) => (
        <circle key={`${r}-${c}`} cx={210 + c * 46} cy={100 + r * 58} r="4.5" fillOpacity="0.16" stroke="none" />
      )),
    )}
    <circle cx="330" cy="240" r="175" fill="none" strokeOpacity="0.12" strokeWidth="2" />
  </g>,
];

const ChevronBanner = ({ dir }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

function CarruselEtapas() {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [ciclo, setCiclo] = useState(0);

  useEffect(() => {
    if (pausado) return undefined;
    const id = setInterval(() => {
      setActivo((i) => (i + 1) % ETAPAS.length);
    }, 5500);
    return () => clearInterval(id);
  }, [pausado, ciclo]);

  // Navegación manual: cambia de etapa y reinicia el temporizador de auto-avance
  // (bump de `ciclo` -> el efecto se vuelve a montar con un setInterval nuevo).
  const irA = (i) => {
    setActivo(i);
    setCiclo((c) => c + 1);
  };
  const mover = (delta) => {
    setActivo((i) => (i + delta + ETAPAS.length) % ETAPAS.length);
    setCiclo((c) => c + 1);
  };

  return (
    <div className="mt-10">
      <div
        className="relative h-[320px] w-full overflow-hidden rounded-3xl shadow-2xl shadow-[#1878B6]/30 sm:h-[440px]"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        aria-roledescription="carrusel"
      >
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activo * 100}%)` }}
        >
          {ETAPAS.map((etapa, i) => (
            <div
              key={etapa.titulo}
              className="relative h-full w-full shrink-0"
              style={{ backgroundImage: FONDOS_BANNER[i] }}
            >
              <svg
                viewBox="0 0 460 460"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute right-0 top-0 h-full w-[72%] sm:w-1/2"
                aria-hidden="true"
              >
                {DECORES_BANNER[i]}
              </svg>

              {/* Refuerzo de contraste del lado del texto */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center sm:items-start sm:px-14 sm:text-left">
                {/* Panel oscuro suave solo en mobile (texto centrado sobre la zona clara del degradado) */}
                <div className="max-w-md rounded-2xl bg-black/15 p-5 sm:max-w-lg sm:bg-transparent sm:p-0">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm">
                    Etapa {i + 1} de {ETAPAS.length}
                  </span>
                  <h4 className="mt-4 text-3xl font-bold uppercase leading-tight text-white sm:text-5xl">
                    {etapa.titulo}
                  </h4>
                  <p className="mt-3 text-sm text-white/90 sm:text-lg">{etapa.texto}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Etapa anterior"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full
                     bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 sm:left-5 sm:h-11 sm:w-11"
        >
          <ChevronBanner dir="prev" />
        </button>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label="Etapa siguiente"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full
                     bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 sm:right-5 sm:h-11 sm:w-11"
        >
          <ChevronBanner dir="next" />
        </button>
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {ETAPAS.map((etapa, i) => (
          <button
            key={etapa.titulo}
            type="button"
            aria-label={`Ver etapa ${i + 1}: ${etapa.titulo}`}
            aria-current={i === activo}
            onClick={() => irA(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activo ? "w-8" : "w-2 bg-slate-300 hover:bg-slate-400"
            }`}
            style={i === activo ? { backgroundImage: GRAD_AZUL } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing"); // landing | listado | panel | login | registro
  const [scrolled, setScrolled] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    const alHacerScroll = () => setScrolled(window.scrollY > 8);
    alHacerScroll();
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => window.removeEventListener("scroll", alHacerScroll);
  }, []);

  // Al cargar: si hay token guardado, validarlo contra el backend y restaurar
  // el usuario. Si ya no sirve, se borra en silencio.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCargandoSesion(false);
      return undefined;
    }
    let vivo = true;
    api("/api/auth/yo")
      .then((datos) => {
        if (vivo) setUsuario(datos.usuario);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => {
        if (vivo) setCargandoSesion(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const cerrarSesion = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // El resultado neto que nos importa (no hay sesión local) se logra igual.
    }
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
    setPage("landing");
  };

  const alAutenticar = (u) => {
    setUsuario(u);
    setPage("panel");
  };

  if (cargandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
        <span className="animate-pulse text-sm">Cargando…</span>
      </div>
    );
  }

  if ((page === "login" || page === "registro") && !usuario) {
    return (
      <AuthPage
        modo={page}
        onAutenticado={alAutenticar}
        onSalir={() => setPage("landing")}
        onCambiarModo={(m) => setPage(m)}
      />
    );
  }

  if (page === "listado") {
    return <ListadoPage onVolver={() => setPage(usuario ? "panel" : "landing")} />;
  }

  if (page === "panel" && usuario) {
    return (
      <PanelPage
        usuario={usuario}
        onIrListado={() => setPage("listado")}
        onCerrarSesion={cerrarSesion}
        onVolver={() => setPage("landing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Fondo: blobs azules grandes, desenfocados y en movimiento lento */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="escatt-blob-1 absolute -left-24 -top-28 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${AZUL_CLARO}55, transparent 70%)` }}
        />
        <div
          className="escatt-blob-2 absolute -right-32 top-1/3 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_MEDIO}44, transparent 70%)` }}
        />
        <div
          className="escatt-blob-3 absolute bottom-[-12rem] left-1/4 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${AZUL_CLARO}3d, transparent 70%)` }}
        />
      </div>

      {/* TOPBAR */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled
            ? "border-b border-white/50 bg-white/70 shadow-sm backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <a href="#inicio" className="text-lg font-bold" style={{ color: AZUL_MEDIO }}>
            ESCATT
          </a>

          <nav className="ml-3 hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#inicio" className="transition hover:text-slate-900">
              Inicio
            </a>
            <a href="#catt" className="transition hover:text-slate-900">
              ¿Qué es la CATT?
            </a>
            <a href="#operaciones" className="transition hover:text-slate-900">
              Operaciones
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {usuario ? (
              <>
                <button
                  type="button"
                  onClick={() => setPage("panel")}
                  className="max-w-[9rem] truncate rounded-full px-2.5 py-1.5 text-xs font-medium
                             text-slate-600 transition hover:text-slate-900 sm:max-w-[12rem] sm:text-sm"
                >
                  Hola, {usuario.nombre}
                </button>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-md
                             shadow-[#1878B6]/30 transition hover:-translate-y-0.5 hover:shadow-lg sm:px-4 sm:text-sm"
                  style={{ backgroundImage: GRAD_AZUL }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPage("login")}
                  className="rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 transition
                             hover:text-slate-900 sm:text-sm"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setPage("registro")}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-md
                             shadow-[#1878B6]/30 transition hover:-translate-y-0.5 hover:shadow-lg sm:px-4 sm:text-sm"
                  style={{ backgroundImage: GRAD_AZUL }}
                >
                  Registrarse
                </button>
              </>
            )}
            <span className="hidden lg:inline-flex">
              <InsigniaNexus logo={18} texto="text-[11px]" />
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          id="inicio"
          className="mx-auto flex min-h-[88vh] max-w-3xl scroll-mt-24 flex-col items-center
                     justify-center px-4 pb-16 pt-28 text-center"
        >
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg shadow-[#1878B6]/25"
            style={{ background: GRAD_AZUL }}
          >
            {/* Documento con check: protocolos de Trabajo Terminal gestionados */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V5A1.5 1.5 0 0 1 5.5 3.5H6Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 3.5V7a1 1 0 0 0 1 1h3.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8.2 13.6l2.3 2.3 5-5"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1
            className="text-5xl font-bold tracking-tight sm:text-6xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${AZUL_OSCURO} 0%, ${AZUL_MEDIO} 60%, ${AZUL_CLARO} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ESCATT
          </h1>

          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Administra a los participantes del proceso de titulación de la CATT — alumnos con
            protocolo de Trabajo Terminal, sinodales y personal de coordinación.
          </p>

          <button
            type="button"
            onClick={() => setPage("listado")}
            className="mt-8 inline-flex items-center justify-center rounded-full px-7 py-3
                       font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                       hover:-translate-y-0.5 hover:shadow-xl"
            style={{ background: GRAD_AZUL }}
          >
            Ver listado de usuarios
          </button>
        </section>

        {/* ¿QUÉ ES LA CATT? */}
        <section id="catt" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-20">
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">¿Qué es la CATT?</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            La Comisión Académica de Trabajos Terminales (CATT) administra el proceso de
            titulación curricular de ESCOM: desde el registro del Protocolo, pasando por Trabajo
            Terminal I y II, hasta la presentación final ante sinodales. ESCATT digitaliza el
            registro y seguimiento de quienes participan en ese proceso.
          </p>
          <CarruselEtapas />
        </section>

        {/* TARJETAS DE TIPOS DE USUARIO */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {TIPOS.map((tipo) => (
              <div
                key={tipo.rol}
                className={`rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${VIDRIO}`}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{ backgroundImage: GRAD_AZUL }}
                >
                  {tipo.rol[0]}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{tipo.rol}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tipo.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GRID DE OPERACIONES */}
        <section id="operaciones" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Operaciones</h2>
          <p className="mt-3 text-slate-600">
            Todo lo que ESCATT permite hacer sobre el padrón de participantes.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {OPERACIONES.map((op) => (
              <div
                key={op.etiqueta}
                className={`flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition
                           duration-300 hover:-translate-y-1 hover:shadow-lg ${VIDRIO}`}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: AZUL_MEDIO }}
                  aria-hidden="true"
                >
                  {op.icono}
                </svg>
                <span className="text-sm font-semibold text-slate-700">{op.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CHIPS DE STACK */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex flex-wrap justify-center gap-3">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#1878B6]/20 bg-[#4FB3E8]/10 px-4 py-1.5
                           text-sm font-medium text-[#0F5C8C]"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/50 bg-white/50 px-4 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-500 sm:flex-row sm:justify-between sm:text-left">
          <p>
            ESCATT — Escuela Superior de Cómputo, IPN · Desarrollado por Bryan, Edgar, Joshua y
            Eduardo — Nexus Solutions
          </p>
          <InsigniaNexus />
        </div>
      </footer>
    </div>
  );
}
