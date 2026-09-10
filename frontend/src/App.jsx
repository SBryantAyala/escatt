import { useEffect, useRef, useState } from "react";
import NexusLogo from "./components/NexusLogo";
import PanelPage from "./pages/Panel";
import { api, TOKEN_KEY } from "./lib/api";
import { AZUL_CLARO, AZUL_MEDIO, AZUL_OSCURO, GRAD_AZUL, VIDRIO } from "./lib/theme";

// Navegación sin librerías externas (sin react-router): un useState("page")
// conmuta entre landing / login / registro / panel. El panel administrativo
// (PanelPage) trae su propia navegación interna por secciones — ver
// src/pages/Panel/.
//
// La identidad visual compartida (paleta azul + clase VIDRIO) vive en
// src/lib/theme.js y el cliente HTTP en src/lib/api.js, para no duplicarlos
// entre App.jsx y las páginas de src/pages/.

const ETAPAS = [
  {
    titulo: "Protocolo",
    texto: "El alumno registra su propuesta de Trabajo Terminal.",
    imagen: "/images/noticias/registro-protocolo.webp",
    alt: "Tres estudiantes de ESCOM revisan una propuesta frente a sus laptops.",
  },
  {
    titulo: "Trabajo Terminal I",
    texto: "Inicia el desarrollo del proyecto con su sinodal asignado.",
    imagen: "/images/noticias/laboratorio-computo.webp",
    alt: "Dos estudiantes programan frente a un monitor en un laboratorio de cómputo.",
  },
  {
    titulo: "Trabajo Terminal II",
    texto: "Entrega el reporte técnico y avanza a la recta final.",
    imagen: "/images/noticias/entrega-documentos.webp",
    alt: "Persona firmando documentos impresos sobre un escritorio.",
  },
  {
    titulo: "Presentación final",
    texto: "El alumno presenta y es evaluado por el jurado de sinodales.",
    imagen: "/images/noticias/presentacion-tt.webp",
    alt: "Un alumno expone su proyecto ante un grupo en un aula con proyector.",
  },
];

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
// El cliente HTTP `api()` y la clave TOKEN_KEY se importan de src/lib/api.js.

// Las 3 carreras reales de ESCOM (espejo de CARRERAS_VALIDAS del backend).
const CARRERAS = ["ISC", "IIA", "LCD"];

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

// Ícono de "ojo" para mostrar/ocultar contraseña (SVG propio, sin emoji).
function OjoIcono({ visible }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3.06 3.72" />
          <path d="M6.24 6.27A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3.86-.8" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

// Igual que CampoLive pero para contraseñas: botón "ojo" para revelar el valor.
function CampoPassword({ label, value, onChange, onBlur, error, valido }) {
  const [visible, setVisible] = useState(false);
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
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={estado === "error"}
          className={`${clasesInput(estado)} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
        >
          <OjoIcono visible={visible} />
        </button>
      </div>
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
// El registro es SOLO para alumnos (sinodal/personal los da de alta un admin).
function AuthPage({ modo, onAutenticado, onSalir, onCambiarModo }) {
  const esRegistro = modo === "registro";

  const [form, setForm] = useState({
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    correo: "",
    password: "",
    confirmarPassword: "",
    boleta: "",
    carrera: "",
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
  const apellidoPaterno = form.apellidoPaterno.trim();
  const apellidoMaterno = form.apellidoMaterno.trim();
  const correo = form.correo.trim();
  const boleta = form.boleta.trim();
  const reqPassword = requisitosPassword(form.password);
  const passwordsCoinciden = form.confirmarPassword === form.password;

  const errores = {};
  if (esRegistro) {
    if (!nombre) errores.nombre = "Escribe tu nombre.";
    if (!apellidoPaterno) errores.apellidoPaterno = "Escribe tu apellido paterno.";
    if (!apellidoMaterno) errores.apellidoMaterno = "Escribe tu apellido materno.";
  }
  if (!correo) errores.correo = "Escribe tu correo.";
  else if (!CORREO_RE_FRONT.test(correo)) {
    errores.correo = "Ese correo no tiene un formato válido.";
  }
  if (!form.password) errores.password = "Escribe tu contraseña.";
  else if (esRegistro && !passwordValidoFront(form.password)) {
    errores.password = "La contraseña no cumple los requisitos.";
  }
  if (esRegistro) {
    if (!form.confirmarPassword) errores.confirmarPassword = "Confirma tu contraseña.";
    else if (!passwordsCoinciden) {
      errores.confirmarPassword = "Las contraseñas no coinciden.";
    }
    if (!boleta) errores.boleta = "Escribe tu boleta.";
    if (!form.carrera) errores.carrera = "Elige tu carrera.";
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
          apellidoPaterno,
          apellidoMaterno,
          correo,
          password: form.password,
          boleta,
          carrera: form.carrera,
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

  // El botón queda bloqueado también si las contraseñas no coinciden todavía.
  const bloqueado =
    enviando ||
    (intentado && !formOk) ||
    (esRegistro && form.confirmarPassword.length > 0 && !passwordsCoinciden);

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
              ? "Regístrate como alumno para dar seguimiento a tu Trabajo Terminal."
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
              <>
                <CampoLive
                  label="Nombre"
                  value={form.nombre}
                  onChange={set("nombre")}
                  onBlur={alSalirCampo("nombre")}
                  error={mostrar("nombre")}
                  valido={valido("nombre")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoLive
                    label="Apellido paterno"
                    value={form.apellidoPaterno}
                    onChange={set("apellidoPaterno")}
                    onBlur={alSalirCampo("apellidoPaterno")}
                    error={mostrar("apellidoPaterno")}
                    valido={valido("apellidoPaterno")}
                  />
                  <CampoLive
                    label="Apellido materno"
                    value={form.apellidoMaterno}
                    onChange={set("apellidoMaterno")}
                    onBlur={alSalirCampo("apellidoMaterno")}
                    error={mostrar("apellidoMaterno")}
                    valido={valido("apellidoMaterno")}
                  />
                </div>
              </>
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
              <CampoPassword
                label="Contraseña"
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
              <CampoPassword
                label="Confirmar contraseña"
                value={form.confirmarPassword}
                onChange={set("confirmarPassword")}
                onBlur={alSalirCampo("confirmarPassword")}
                error={mostrar("confirmarPassword")}
                valido={form.confirmarPassword.length > 0 && passwordsCoinciden}
              />
            )}

            {esRegistro && (
              <>
                <CampoLive
                  label="Boleta"
                  value={form.boleta}
                  onChange={set("boleta")}
                  onBlur={alSalirCampo("boleta")}
                  error={mostrar("boleta")}
                  valido={valido("boleta")}
                />
                <SelectLive
                  label="Carrera"
                  value={form.carrera}
                  onChange={set("carrera")}
                  onBlur={alSalirCampo("carrera")}
                  opciones={CARRERAS}
                  placeholder="Selecciona…"
                  error={mostrar("carrera")}
                  valido={valido("carrera")}
                />
              </>
            )}

            <button
              type="submit"
              disabled={bloqueado}
              className="mt-1 inline-flex w-full items-center justify-center rounded-full px-5 py-3
                         font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                         hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundImage: GRAD_AZUL }}
            >
              {enviando ? "Enviando…" : esRegistro ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          {esRegistro && (
            <p className="mt-4 text-center text-xs text-slate-400">
              ¿Eres sinodal o personal de la CATT? Tu cuenta la asigna un administrador.
            </p>
          )}

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

// PanelPage se movió a src/pages/Panel/: ahora es un dashboard con sidebar +
// topbar + navegación interna por secciones (Listado, Alta, Detalle y las
// secciones de "Proceso" que vendrán). App.jsx solo lo monta cuando page === "panel".

// Fondo por diapositiva: el mismo trío de azules de marca, variando ángulo y
// orden para que cada etapa se sienta distinta sin salirse de la identidad.
// El extremo oscuro siempre queda del lado izquierdo, donde va el texto.
const FONDOS_BANNER = [
  `linear-gradient(135deg, ${AZUL_OSCURO} 0%, ${AZUL_MEDIO} 55%, ${AZUL_CLARO} 100%)`,
  `linear-gradient(200deg, ${AZUL_MEDIO} 0%, ${AZUL_OSCURO} 60%, ${AZUL_MEDIO} 100%)`,
  `linear-gradient(115deg, ${AZUL_OSCURO} 0%, ${AZUL_OSCURO} 30%, ${AZUL_CLARO} 100%)`,
  `linear-gradient(160deg, ${AZUL_MEDIO} 0%, ${AZUL_OSCURO} 50%, ${AZUL_MEDIO} 100%)`,
];

// Mismo azul que domina cada diapositiva pero semitransparente, para teñir la
// foto de la etapa y que combine con el degradado en vez de verse como una
// imagen "de stock" ajena a la marca.
const FONDOS_BANNER_TINTE = [`${AZUL_OSCURO}66`, `${AZUL_MEDIO}66`, `${AZUL_OSCURO}66`, `${AZUL_MEDIO}66`];

// El costado derecho de cada diapositiva ya no usa formas SVG genéricas:
// muestra la foto real de esa etapa (las mismas fotos libres de derechos que
// se usan en la sección Noticias), atenuada con una máscara y un tinte azul
// de marca para que se funda con el degradado en vez de verse "pegada".

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
              {/* Foto real de la etapa (una de las noticias principales), fundida
                  con el degradado mediante una máscara para que no se vea como
                  un recorte pegado encima del color de marca. */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-[78%] overflow-hidden sm:w-[55%]"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 22%, #000 50%)",
                  maskImage:
                    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 22%, #000 50%)",
                }}
              >
                <img
                  src={etapa.imagen}
                  alt={etapa.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  width="920"
                  height="880"
                  className="h-full w-full object-cover"
                />
                {/* Tinte de marca sobre la foto para no romper la paleta azul */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(115deg, ${FONDOS_BANNER_TINTE[i]} 0%, transparent 60%)`,
                  }}
                />
              </div>

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

// --- Noticias -----------------------------------------------------------------
// Contenido de EJEMPLO para el proyecto escolar: todavía no hay backend de
// noticias, así que los textos son ficticios pero verosímiles y coherentes con
// lo que describe la sección "¿Qué es la CATT?". Las fotos son libres de
// derechos (Unsplash) y viven en public/images/noticias/. Formato inspirado en
// cómo ESCOM publica sus avisos: imagen destacada + categoría + título + fecha
// + resumen breve.
const NOTICIAS = [
  {
    categoria: "Convocatoria",
    titulo: "Abre el registro de Protocolo para el semestre 2027/1",
    fecha: "25 de agosto de 2026",
    iso: "2026-08-25",
    resumen:
      "Los alumnos que cubran los créditos requeridos ya pueden subir su propuesta de Trabajo Terminal para revisión de la CATT.",
    imagen: "/images/noticias/registro-protocolo.webp",
    alt: "Tres estudiantes de ESCOM revisan una propuesta frente a sus laptops.",
  },
  {
    categoria: "Trámites",
    titulo: "Se actualizan los lineamientos de entrega del reporte técnico de TT II",
    fecha: "12 de agosto de 2026",
    iso: "2026-08-12",
    resumen:
      "El nuevo formato unifica portada, carta de liberación y bitácora en un solo expediente digital.",
    imagen: "/images/noticias/entrega-documentos.webp",
    alt: "Persona firmando documentos impresos sobre un escritorio.",
  },
  {
    categoria: "Laboratorios",
    titulo: "Nuevos horarios de laboratorios de cómputo para alumnos de TT I",
    fecha: "5 de agosto de 2026",
    iso: "2026-08-05",
    resumen:
      "Se amplía el acceso por las tardes para avanzar en el desarrollo de proyectos con equipo especializado.",
    imagen: "/images/noticias/laboratorio-computo.webp",
    alt: "Dos estudiantes programan frente a un monitor en un laboratorio de cómputo.",
  },
  {
    categoria: "Trabajo Terminal",
    titulo: "Se publican las nuevas fechas de presentación de Trabajo Terminal II",
    fecha: "30 de julio de 2026",
    iso: "2026-07-30",
    resumen:
      "El calendario de exposiciones ante el jurado de sinodales abarca de la semana 14 a la 17 del periodo.",
    imagen: "/images/noticias/presentacion-tt.webp",
    alt: "Un alumno expone su proyecto ante un grupo en un aula con proyector.",
  },
  {
    categoria: "Difusión",
    titulo: "Reunión informativa de la CATT para quienes se integran al proceso",
    fecha: "22 de julio de 2026",
    iso: "2026-07-22",
    resumen:
      "La coordinación explicará las etapas, el papel de los sinodales y el uso de ESCATT para dar seguimiento.",
    imagen: "/images/noticias/campus-escom.webp",
    alt: "Edificio principal del campus de ESCOM rodeado de áreas verdes.",
  },
  {
    categoria: "Asesorías",
    titulo: "Jornada de asesorías con sinodales para revisión de avances",
    fecha: "15 de julio de 2026",
    iso: "2026-07-15",
    resumen:
      "Espacios de 20 minutos por alumno para resolver dudas de metodología y redacción del reporte.",
    imagen: "/images/noticias/alumnos-biblioteca.webp",
    alt: "Un grupo de estudiantes trabaja junto a un librero en una biblioteca.",
  },
];

// Tarjeta VIDRIO con foto destacada arriba. Hover: elevación sutil + zoom leve
// de la imagen, en línea con el resto del sitio (rounded-3xl, sombra azul).
function TarjetaNoticia({ noticia }) {
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl transition duration-300
                  hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1878B6]/20 ${VIDRIO}`}
    >
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={noticia.imagen}
          alt={noticia.alt}
          loading="lazy"
          decoding="async"
          width="800"
          height="500"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-flex w-fit items-center rounded-full bg-[#4FB3E8]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0F5C8C]">
          {noticia.categoria}
        </span>
        <h3 className="mt-3 text-lg font-bold leading-snug text-slate-800">{noticia.titulo}</h3>
        <time
          dateTime={noticia.iso}
          className="mt-1 block text-xs font-medium uppercase tracking-wide text-slate-400"
        >
          {noticia.fecha}
        </time>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{noticia.resumen}</p>
      </div>
    </article>
  );
}

function SeccionNoticias() {
  return (
    <section id="noticias" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
      <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Noticias</h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
        Avisos y fechas clave del proceso de titulación: convocatorias de Protocolo, entregas de
        Trabajo Terminal, laboratorios y asesorías con sinodales.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {NOTICIAS.map((noticia) => (
          <TarjetaNoticia key={noticia.titulo} noticia={noticia} />
        ))}
      </div>
    </section>
  );
}

// --- Proceso de la CATT: diagrama de flujo animado ---------------------------
// Conector entre nodos: una línea que se "dibuja" (stroke-dasharray/offset con
// pathLength=1) y una punta de flecha que aparece después. Las transiciones
// viven en index.css (.proceso-conector-*); aquí solo el retardo escalonado.
function ConectorProceso({ orientacion, delay }) {
  const horizontal = orientacion === "horizontal";
  const svgProps = horizontal
    ? { viewBox: "0 0 64 32", className: "h-8 w-16" }
    : { viewBox: "0 0 32 64", className: "h-16 w-8" };
  return (
    <svg {...svgProps} fill="none" aria-hidden="true">
      <line
        x1={horizontal ? 2 : 16}
        y1={horizontal ? 16 : 2}
        x2={horizontal ? 54 : 16}
        y2={horizontal ? 16 : 54}
        stroke={AZUL_MEDIO}
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        className="proceso-conector-linea"
        style={{ transitionDelay: delay }}
      />
      <path
        d={horizontal ? "M48 8l10 8-10 8" : "M8 48l8 10 8-10"}
        stroke={AZUL_OSCURO}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="proceso-conector-flecha"
        style={{ transitionDelay: `calc(${delay} + 380ms)` }}
      />
    </svg>
  );
}

function DiagramaProceso() {
  // Revelado progresivo al hacer scroll, sin librerías: un IntersectionObserver
  // pone la clase .is-visible en el <ol> y CSS se encarga del resto.
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setVisible(true);
            observador.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <section id="proceso" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-20">
      <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Proceso de la CATT</h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
        De principio a fin, la titulación curricular avanza por cuatro etapas encadenadas: cada una
        habilita la siguiente.
      </p>

      <ol
        ref={ref}
        aria-label="Proceso de la CATT en cuatro etapas, en orden"
        className={`mt-12 flex flex-col gap-12 md:flex-row md:items-stretch md:gap-6 ${
          visible ? "is-visible" : ""
        }`}
      >
        {ETAPAS.map((etapa, i) => (
          <li
            key={etapa.titulo}
            aria-label={`Etapa ${i + 1} de ${ETAPAS.length}: ${etapa.titulo}. ${etapa.texto}`}
            className="proceso-nodo relative md:flex-1"
            style={{ transitionDelay: `${i * 130}ms` }}
          >
            <div className={`flex h-full flex-col rounded-2xl p-5 ${VIDRIO}`}>
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundImage: GRAD_AZUL }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-base font-bold" style={{ color: AZUL_OSCURO }}>
                {etapa.titulo}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{etapa.texto}</p>
            </div>

            {i < ETAPAS.length - 1 && (
              <>
                {/* Conector horizontal (desktop) / vertical (móvil), decorativo. */}
                <span className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 md:block">
                  <ConectorProceso orientacion="horizontal" delay={`${i * 130 + 260}ms`} />
                </span>
                <span className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 md:hidden">
                  <ConectorProceso orientacion="vertical" delay={`${i * 130 + 260}ms`} />
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("landing"); // landing | panel | login | registro
  const [scrolled, setScrolled] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

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

  if (page === "panel" && usuario) {
    return (
      <PanelPage
        usuario={usuario}
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
            <a href="#noticias" className="transition hover:text-slate-900">
              Noticias
            </a>
            <a href="#proceso" className="transition hover:text-slate-900">
              Proceso
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
                  onClick={() => setConfirmandoSalida(true)}
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
          </div>
        </div>
      </header>

      <main>
        {/* INICIO: encabezado breve + banner de etapas */}
        <section id="inicio" className="mx-auto max-w-5xl scroll-mt-24 px-4 pb-10 pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1878B6]">
            ESCOM · Comisión Académica de Trabajos Terminales
          </p>
          <h1
            className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${AZUL_OSCURO} 0%, ${AZUL_MEDIO} 60%, ${AZUL_CLARO} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ESCATT
          </h1>
          <p className="mt-2 max-w-xl text-base text-slate-600 sm:text-lg">
            Consulta el estado y las etapas de tu proceso de Trabajo Terminal.
          </p>
          <CarruselEtapas />
        </section>

        {/* ¿QUÉ ES LA CATT? */}
        <section id="catt" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-20">
          <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">¿Qué es la CATT?</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            La Comisión Académica de Trabajos Terminales (CATT) administra el proceso de
            titulación curricular de ESCOM: desde el registro del Protocolo, pasando por Trabajo
            Terminal I y II, hasta la presentación final ante sinodales. En este proceso participan
            los alumnos con protocolo de Trabajo Terminal registrado, los sinodales designados y el
            personal de coordinación de la CATT. ESCATT digitaliza el registro y seguimiento de
            quienes participan en él.
          </p>
        </section>

        {/* NOTICIAS: avisos del proceso, formato tarjeta con foto real */}
        <SeccionNoticias />

        {/* PROCESO DE LA CATT: diagrama de flujo animado de las 4 etapas */}
        <DiagramaProceso />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/50 bg-white/50 px-4 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-500 sm:flex-row sm:justify-between sm:text-left">
          <p>© 2026 ESCATT — Sistema desarrollado por Nexus Solutions para ESCOM-IPN.</p>
          <InsigniaNexus />
        </div>
      </footer>

      {/* Confirmación antes de cerrar sesión */}
      {confirmandoSalida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">¿Cerrar sesión?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Vas a salir de tu cuenta. Puedes volver a iniciar sesión cuando quieras.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoSalida(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmandoSalida(false);
                  cerrarSesion();
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md
                           shadow-red-600/30 transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
