import { useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import CargandoPantalla from "./components/CargandoPantalla";
import NexusLogo from "./components/NexusLogo";
import SeccionNoticias from "./components/SeccionNoticias";
import TablonAvisos from "./components/TablonAvisos";
import { AvisoProvider } from "./components/ui/Avisos";
import { SesionProvider, useSesion } from "./context/SesionContext";
import AcademiasPage from "./pages/Academias";
import AcademiaFicha from "./pages/Academias/Ficha";
import BitacoraPage from "./pages/Bitacora";
import CambioObligatorioPage from "./pages/CambiarPassword";
import PanelInicio from "./pages/Panel/Inicio";
import PanelLayout from "./pages/Panel";
import ProtocoloPage from "./pages/Protocolo";
import SesionesPage from "./pages/Sesiones";
import SesionDetalle from "./pages/Sesiones/Detalle";
import SeccionProximamente from "./pages/Panel/SeccionProximamente";
import AltaPage from "./pages/Usuarios/Alta";
import DetallePage from "./pages/Usuarios/Detalle";
import ListadoPage from "./pages/Usuarios/Listado";
import MiCuentaPage from "./pages/MiCuenta";
import { api, TOKEN_KEY } from "./lib/api";
import { CARRERAS, DOMINIO_ALUMNO, PLANES } from "./lib/roles";
import { AZUL_CLARO, AZUL_MEDIO, AZUL_OSCURO, VIDRIO } from "./lib/theme";
import NoEncontrada from "./routes/NoEncontrada";
import RequiereInvitado from "./routes/RequiereInvitado";
import RequiereRol from "./routes/RequiereRol";
import RequiereSesion from "./routes/RequiereSesion";

// Rutas reales con react-router (BrowserRouter en main.jsx). App.jsx define
// el árbol completo: landing / login / registro / cambiar-password / panel
// (con sus sub-rutas) / 404. El usuario en sesión vive en SesionContext, no
// se pasa por props.
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

const GUIA_ETAPAS = [
  "Revisa los avisos de registro y conversa con tus directores sobre la propuesta que presentarás.",
  "Organiza con tus directores el desarrollo del proyecto y consulta los avisos relacionados con esta etapa.",
  "Revisa con tus directores el reporte técnico y consulta los avisos de entrega antes de preparar tus documentos.",
  "Prepara la exposición de tu proyecto y revisa los avisos de presentación publicados por la CATT.",
];

const TONOS_ETAPA = ["#1D4ED8", "#0F766E", "#6D28D9", "#BE185D"];

const PILARES_CATT = [
  {
    titulo: "Registro claro",
    texto: "Cada propuesta entra con datos completos, archivos y responsables desde el primer paso.",
  },
  {
    titulo: "Seguimiento vivo",
    texto: "Alumnos, sinodales y coordinación comparten una sola vista del avance del Trabajo Terminal.",
  },
  {
    titulo: "Cierre ordenado",
    texto: "Las entregas, revisiones y presentaciones quedan listas para cerrar el proceso sin perder contexto.",
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

function LogosInstitucionales({ compacto = false }) {
  return (
    <div className={`flex items-center gap-4 ${compacto ? "" : "sm:gap-6"}`}>
      <a href="https://www.ipn.mx/" target="_blank" rel="noopener noreferrer" className="rounded-sm opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        <img src="/images/logo-ipn.png" alt="Instituto Politécnico Nacional" width="544" height="196" loading="lazy" className={`object-contain brightness-0 invert ${compacto ? "h-auto w-36 sm:w-[180px]" : "h-auto w-[152px] sm:w-[220px]"}`} />
      </a>
      <span aria-hidden="true" className="h-9 w-px shrink-0 bg-white/25" />
      <a href="https://www.escom.ipn.mx/" target="_blank" rel="noopener noreferrer" className="rounded-sm opacity-90 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        <img src="/images/logo-escom.png" alt="Escuela Superior de Cómputo" width="480" height="366" loading="lazy" className={`object-contain brightness-0 invert ${compacto ? "h-auto w-16 sm:w-20" : "h-auto w-16 sm:w-24"}`} />
      </a>
    </div>
  );
}

function FlechaIcono() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PanelIcono() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M8 9h8M8 13h5M8 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SalirIcono() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 12h9m-3-3 3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Autenticación (Sprint 2) ---------------------------------------------
// El cliente HTTP `api()` y la clave TOKEN_KEY se importan de src/lib/api.js.

// Carreras, planes y dominio de correo de alumno vienen de src/lib/roles.js
// (espejo del backend).

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

// Página dedicada (no modal) para iniciar sesión y registrarse. `modo` decide
// qué campos aparecen. Validación en vivo + alertas. El registro es SOLO
// para alumnos (docentes los da de alta la CATT y al personal CATT, el
// administrador del sistema).
function AuthPage({ modo }) {
  const esRegistro = modo === "registro";
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUsuario } = useSesion();

  const [form, setForm] = useState({
    nombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    correo: "",
    password: "",
    confirmarPassword: "",
    boleta: "",
    carrera: "",
    planEstudios: "",
  });
  const [tocado, setTocado] = useState({});
  const [intentado, setIntentado] = useState(false);
  const [alerta, setAlerta] = useState(null); // { tipo: "error" | "ok", texto }
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === "Escape") navigate("/");
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [navigate]);

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
  } else if (esRegistro && !correo.toLowerCase().endsWith(DOMINIO_ALUMNO)) {
    errores.correo = `Usa tu correo institucional (${DOMINIO_ALUMNO}).`;
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
    else if (!/^\d{10}$/.test(boleta)) errores.boleta = "La boleta tiene 10 dígitos.";
    if (!form.carrera) errores.carrera = "Elige tu carrera.";
    if (!form.planEstudios) errores.planEstudios = "Elige tu plan de estudios.";
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
          planEstudios: form.planEstudios,
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
      setUsuario(datos.usuario);
      const siguiente = params.get("next");
      navigate(siguiente || "/panel/inicio", { replace: true });
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
          onClick={() => navigate("/")}
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
              label={esRegistro ? `Correo institucional (${DOMINIO_ALUMNO})` : "Correo"}
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
                <SelectLive
                  label="Plan de estudios"
                  value={form.planEstudios}
                  onChange={set("planEstudios")}
                  onBlur={alSalirCampo("planEstudios")}
                  opciones={PLANES.map((p) => ({ valor: p, etiqueta: `Plan ${p}` }))}
                  placeholder="Selecciona…"
                  error={mostrar("planEstudios")}
                  valido={valido("planEstudios")}
                />
              </>
            )}

            <button
              type="submit"
              disabled={bloqueado}
              className="mt-1 inline-flex w-full items-center justify-center rounded-full px-5 py-3
                         font-semibold text-white shadow-lg shadow-[#1878B6]/30 transition
                         hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: AZUL_MEDIO }}
            >
              {enviando ? "Enviando…" : esRegistro ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          {esRegistro && (
            <p className="mt-4 text-center text-xs text-slate-400">
              ¿Eres docente o personal de la CATT? Tu cuenta la da de alta la CATT; recibirás una contraseña temporal.
            </p>
          )}

          <p className="mt-5 text-center text-sm text-slate-500">
            {esRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button
              type="button"
              onClick={() => navigate(esRegistro ? "/login" : "/registro")}
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
    <section id="proceso" className="scroll-mt-36 bg-white px-4 py-14 md:scroll-mt-28">
      <div className="mx-auto max-w-6xl">
        <span className="text-sm font-semibold text-[#1878B6]">
          Ruta de titulación
        </span>
        <h2 className="mt-2 text-3xl font-bold text-[#102D4B]">Proceso de la CATT</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          De principio a fin, la titulación curricular avanza por cuatro etapas encadenadas: cada
          una habilita la siguiente.
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
              <div className="group flex h-full flex-col rounded-[20px] p-5 text-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: TONOS_ETAPA[i] }}>
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/25 text-sm font-bold text-white transition group-hover:scale-110"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-white">
                  {etapa.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white">{etapa.texto}</p>
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
      </div>
    </section>
  );
}

// Página de inicio pública. Antes era el único "page" sin sesión en App();
// ahora lee el usuario de SesionContext y navega con <Link>/useNavigate.
function LandingPage() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const nombrePerfil = [usuario?.nombre, usuario?.apellido_paterno]
    .map((parte) => (parte || "").trim())
    .filter(Boolean)
    .join(" ") || "Mi cuenta";
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [etapaGuia, setEtapaGuia] = useState(0);
  const perfilRef = useRef(null);
  const perfilBotonRef = useRef(null);

  useEffect(() => {
    if (!perfilAbierto) return;
    const cerrarFuera = (evento) => {
      if (!perfilRef.current?.contains(evento.target)) setPerfilAbierto(false);
    };
    const cerrarConEscape = (evento) => {
      if (evento.key === "Escape") {
        setPerfilAbierto(false);
        perfilBotonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [perfilAbierto]);

  useEffect(() => {
    const alHacerScroll = () => {
      setScrolled(window.scrollY > 8);
      const actual = ["inicio", "catt", "noticias", "proceso"].filter(
        (id) => document.getElementById(id)?.getBoundingClientRect().top <= 170,
      ).pop();
      setSeccionActiva(actual || "inicio");
    };
    alHacerScroll();
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => window.removeEventListener("scroll", alHacerScroll);
  }, []);

  if (cargando) return <CargandoPantalla />;

  const alCerrarSesion = async () => {
    await cerrarSesion();
    navigate("/");
  };

  return (
    <div className="landing-publica min-h-screen overflow-x-clip bg-[#F4F7FB] text-slate-800">

      {/* TOPBAR */}
      <header
        className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6"
      >
        <div className={`landing-topbar relative mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-4 rounded-3xl border border-sky-100 bg-white/95 px-4 backdrop-blur-xl transition-shadow duration-300 sm:px-6 ${scrolled ? "shadow-xl shadow-sky-900/10" : "shadow-lg shadow-sky-900/5"}`}>
          <a href="#inicio" onClick={() => setSeccionActiva("inicio")} className="inline-flex h-16 shrink-0 items-center text-xl font-extrabold text-[#1878B6] outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
            ESCATT
          </a>

          <nav aria-label="Navegación principal" className="order-last flex w-full items-center justify-between gap-1 border-t border-sky-100 py-2 text-xs font-medium md:order-none md:ml-4 md:w-auto md:justify-start md:border-t-0 md:text-sm">
            {[["inicio", "Inicio"], ["catt", "¿Qué es la CATT?"], ["noticias", "Noticias"], ["proceso", "Proceso"]].map(([id, titulo]) => (
              <a key={id} href={`#${id}`} onClick={() => setSeccionActiva(id)} aria-current={seccionActiva === id ? "location" : undefined} className={`landing-nav-link relative flex min-h-10 items-center rounded-full px-2 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 md:px-4 ${seccionActiva === id ? "bg-[#1878B6] text-white shadow-sm" : "text-slate-700 hover:bg-sky-50 hover:text-[#1878B6]"}`}>
                {titulo}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {usuario ? (
              <div ref={perfilRef} className="relative" onBlur={(evento) => {
                if (!evento.currentTarget.contains(evento.relatedTarget)) setPerfilAbierto(false);
              }}>
                <button
                  ref={perfilBotonRef}
                  type="button"
                  onClick={() => setPerfilAbierto((abierto) => !abierto)}
                  aria-label={`Abrir opciones de ${nombrePerfil}`}
                  aria-expanded={perfilAbierto}
                  aria-controls="opciones-perfil"
                  title="Mi perfil"
                  className={`group inline-flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-1.5 text-right transition-all duration-300 hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 sm:gap-3 ${perfilAbierto ? "border-sky-200 bg-sky-50" : "border-transparent bg-white"}`}
                >
                  <span className="hidden max-w-[180px] flex-col gap-0.5 sm:flex">
                    <span className="break-words text-xs font-semibold leading-snug text-slate-800 transition-colors group-hover:text-[#1878B6] sm:text-sm">{nombrePerfil}</span>
                    <span className="text-[10px] font-medium leading-tight text-[#1878B6]/80 sm:text-xs">Mi cuenta</span>
                  </span>
                  <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1878B6] text-sm font-bold text-white ring-4 ring-sky-50 transition-transform duration-300 group-hover:scale-105">{[usuario.nombre?.trim()[0], usuario.apellido_paterno?.trim()[0]].filter(Boolean).join("").toUpperCase() || "U"}</span>
                  <span aria-hidden="true" className="flex h-3 w-3 shrink-0 items-center justify-center">
                    <span className={`h-1.5 w-1.5 border-b-[1.5px] border-r-[1.5px] border-[#1878B6] transition-transform duration-300 ${perfilAbierto ? "rotate-[225deg]" : "rotate-45"}`} />
                  </span>
                </button>
                {perfilAbierto && (
                  <div id="opciones-perfil" className="landing-profile-menu absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-900/15">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="break-words text-sm font-semibold text-slate-900">{nombrePerfil}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{usuario.correo}</p>
                    </div>
                    <a href="/panel/mi-cuenta" className="mt-1 flex min-h-11 items-center rounded-lg px-3 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-[#1878B6]">Mi perfil</a>
                    <a href="/panel" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-700 transition hover:bg-sky-50 hover:text-[#1878B6]"><PanelIcono />Mi panel</a>
                    <button type="button" onClick={alCerrarSesion} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600"><SalirIcono />Cerrar sesión</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-semibold text-[#1878B6] transition-colors hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 sm:text-sm"
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/registro")}
                  className="inline-flex min-h-10 items-center rounded-full bg-[#1878B6] px-3 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-[#1264A3] hover:shadow-lg hover:shadow-sky-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:px-4 sm:text-sm"
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" aria-label="Anuncios destacados" className="relative scroll-mt-36 px-4 pb-8 pt-40 md:scroll-mt-28 md:pt-28">
          <div className="mx-auto max-w-6xl">
            <TablonAvisos />
          </div>
        </section>

        {/* Guía pública: las etapas no representan el estado de un expediente. */}
        <section aria-labelledby="titulo-guia" className="relative bg-white px-4 py-14">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.92fr]">
            <div className="landing-reveal">
              <p className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[#1878B6]">
                Guía de titulación · ESCOM
              </p>
              <h2 id="titulo-guia" className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-[#102D4B]">
                Tu ruta de Trabajo Terminal
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                Conoce cada etapa de tu Trabajo Terminal y consulta los avisos de la CATT
                para preparar lo que sigue.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#inicio"
                  onClick={() => setSeccionActiva("inicio")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1878B6] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0F5C8C]"
                >
                  Consultar avisos
                  <FlechaIcono />
                </a>
                <a
                  href="#proceso"
                  className="inline-flex items-center justify-center rounded-full border border-[#1878B6]/15 bg-white/75 px-6 py-3 text-sm font-bold text-[#0F5C8C] shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white"
                >
                  Ver proceso completo
                </a>
              </div>
              <div className="mt-10 border-l-2 border-[#4FB3E8] pl-5">
                <p className="text-sm font-semibold text-[#0F5C8C]">{usuario ? "Tu espacio personal" : "¿Aún no tienes cuenta?"}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{usuario ? "Consulta tus datos y las secciones disponibles para tu perfil." : "Regístrate para acceder a tu espacio en ESCATT."}</p>
                <button type="button" onClick={() => navigate(usuario ? "/panel" : "/registro")} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1878B6] transition hover:text-[#0F5C8C]">
                  {usuario ? "Ir a mi panel" : "Crear cuenta"}<FlechaIcono />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] bg-[#102D4B] shadow-lg">
              <img
                src={ETAPAS[etapaGuia].imagen}
                alt={ETAPAS[etapaGuia].alt}
                width="900"
                height="500"
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="p-5 text-white sm:p-6">
                <p className="text-sm font-semibold text-white">Explora las etapas</p>
                <div role="group" aria-label="Etapa de la guía" className="mt-4 grid grid-cols-2 gap-2">
                  {ETAPAS.map((etapa, i) => (
                    <button key={etapa.titulo} type="button" aria-pressed={etapaGuia === i} aria-controls="detalle-etapa-guia" onClick={() => setEtapaGuia(i)} className={`flex min-h-16 items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm ${etapaGuia === i ? "border-white bg-white text-[#0F5C8C] shadow-lg shadow-black/10" : "border-white/25 bg-white/10 text-white backdrop-blur-md hover:border-white/60 hover:bg-white/20"}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${etapaGuia === i ? "bg-sky-100 text-[#1878B6]" : "bg-white/15 text-white"}`}>{i + 1}</span>
                      <span>{etapa.titulo}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div id="detalle-etapa-guia" aria-live="polite" aria-atomic="true" className="border-t border-white/15 px-5 py-5 text-white sm:px-6">
                <div key={etapaGuia} className="landing-reveal">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Etapa {etapaGuia + 1} de {ETAPAS.length}</p>
                  <h3 className="mt-2 text-lg font-bold">{ETAPAS[etapaGuia].titulo}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/90">{ETAPAS[etapaGuia].texto}</p>
                  <p className="mt-4 border-t border-white/20 pt-4 text-sm leading-relaxed text-sky-100">{GUIA_ETAPAS[etapaGuia]}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ¿QUÉ ES LA CATT? */}
        <section id="catt" className="scroll-mt-36 bg-[#102D4B] px-4 py-14 text-white md:scroll-mt-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-start">
            <div>
              <span className="text-sm font-semibold text-sky-200">
                ¿Qué es la CATT?
              </span>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Comisión Académica de Trabajos Terminales
              </h2>
              <div className="mt-7"><LogosInstitucionales compacto /></div>
            </div>
            <div>
              <p className="text-base leading-relaxed text-sky-50">
                La Comisión Académica de Trabajos Terminales administra el proceso de titulación
                curricular de ESCOM: desde el registro del Protocolo, pasando por Trabajo Terminal
                I y II, hasta la presentación final ante sinodales. ESCATT digitaliza el registro y
                seguimiento de quienes participan en él.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {PILARES_CATT.map((pilar, i) => (
                  <article
                    key={pilar.titulo}
                    className="rounded-[20px] p-5 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{ backgroundColor: ["#1D4ED8", "#0F766E", "#6D28D9"][i] }}
                  >
                    <h3 className="font-bold text-white">{pilar.titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white">{pilar.texto}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NOTICIAS: avisos del proceso, formato tarjeta con foto real */}
        <SeccionNoticias />

        {/* PROCESO DE LA CATT: diagrama de flujo animado de las 4 etapas */}
        <DiagramaProceso />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-sky-900 bg-[#092B43] px-4 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
            <LogosInstitucionales />
            <div>
              <p className="text-lg font-bold">ESCATT</p>
              <p className="mt-1 text-sm text-sky-100/75">Comisión Académica de Trabajos Terminales</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 border-t border-white/15 pt-6 text-center text-xs text-sky-100/70 sm:flex-row sm:justify-between sm:text-left">
          <p>© 2026 ESCATT — Sistema desarrollado por Nexus Solutions para ESCOM-IPN.</p>
          <InsigniaNexus />
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Puentes entre rutas y páginas (props -> hooks) --------------------------
// Las páginas de pages/ siguen recibiendo props simples (actor, userId,
// onVolver…); estos componentes son el único lugar que conoce react-router.

function ListadoRoute() {
  const { usuario } = useSesion();
  return <ListadoPage actor={usuario} />;
}

function AltaRoute() {
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const perfil = params.get("perfil") ?? "alumno";
  const academia = params.get("academia");
  return (
    <AltaPage
      key={perfil}
      actor={usuario}
      perfilInicial={perfil}
      academiaPreseleccionada={academia}
      onVerDetalle={(u) => navigate(`/panel/usuarios/${u.id}`)}
    />
  );
}

function DetalleRoute() {
  const { usuario } = useSesion();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // "Volver" regresa a la ruta anterior; si no hay historial dentro de la app
  // (p. ej. se entró recargando esta misma URL), cae a /panel/usuarios.
  function volver() {
    if (location.key !== "default") navigate(-1);
    else navigate("/panel/usuarios");
  }

  return <DetallePage actor={usuario} userId={id} onVolver={volver} />;
}

function AcademiasRoute() {
  const { usuario } = useSesion();
  return <AcademiasPage actor={usuario} />;
}

function ProtocoloRoute() {
  const { usuario } = useSesion();
  return <ProtocoloPage actor={usuario} />;
}

function SesionesRoute() {
  const { usuario } = useSesion();
  return <SesionesPage actor={usuario} />;
}

function SesionDetalleRoute() {
  const { usuario } = useSesion();
  const { id } = useParams();
  return <SesionDetalle actor={usuario} sesionId={id} />;
}

function AcademiaFichaRoute() {
  const { usuario } = useSesion();
  const { id } = useParams();
  return <AcademiaFicha actor={usuario} academiaId={id} />;
}

// El Presidente ve la ficha de SU academia (su propio academia_id como
// docente), siempre en solo lectura: no tiene catt_ejecutivo, así que la
// ficha misma oculta todos los botones de acción.
function MiAcademiaRoute() {
  const { usuario } = useSesion();
  if (usuario.academia_id == null) {
    return (
      <div className={`rounded-3xl p-8 text-center ${VIDRIO} bg-white/85`}>
        <p className="text-base font-medium text-slate-900">Todavía no tienes una academia asignada.</p>
        <p className="mt-2 text-sm text-slate-600">
          Cuando la CATT te asigne una, aparecerá aquí.
        </p>
      </div>
    );
  }
  return <AcademiaFicha actor={usuario} academiaId={usuario.academia_id} />;
}

function MiCuentaRoute() {
  const { usuario, setUsuario } = useSesion();
  return <MiCuentaPage usuario={usuario} onUsuarioActualizado={setUsuario} />;
}

function CambiarPasswordRoute() {
  const { usuario, setUsuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  return (
    <CambioObligatorioPage
      usuario={usuario}
      onCambiada={(u) => {
        setUsuario(u);
        navigate("/panel/inicio");
      }}
      onCerrarSesion={async () => {
        await cerrarSesion();
        navigate("/");
      }}
    />
  );
}

const DESCRIPCION_PROXIMAMENTE =
  "Esta sección estará disponible en un próximo sprint. Ya está conectada al panel: cuando se implemente aparecerá aquí sin tocar el layout.";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RequiereInvitado>
            <AuthPage modo="login" />
          </RequiereInvitado>
        }
      />
      <Route
        path="/registro"
        element={
          <RequiereInvitado>
            <AuthPage modo="registro" />
          </RequiereInvitado>
        }
      />
      <Route
        path="/cambiar-password"
        element={
          <RequiereSesion>
            <CambiarPasswordRoute />
          </RequiereSesion>
        }
      />

      <Route
        path="/panel"
        element={
          <RequiereSesion>
            <PanelLayout />
          </RequiereSesion>
        }
      >
        <Route index element={<Navigate to="inicio" replace />} />
        <Route
          path="inicio"
          element={
            <RequiereRol clave="inicio">
              <PanelInicio />
            </RequiereRol>
          }
        />
        <Route
          path="usuarios"
          element={
            <RequiereRol clave="usuarios">
              <ListadoRoute />
            </RequiereRol>
          }
        />
        <Route
          path="usuarios/nuevo"
          element={
            <RequiereRol clave="alta">
              <AltaRoute />
            </RequiereRol>
          }
        />
        <Route
          path="usuarios/:id"
          element={
            <RequiereRol clave="detalle">
              <DetalleRoute />
            </RequiereRol>
          }
        />
        <Route
          path="mi-academia"
          element={
            <RequiereRol clave="mi-academia">
              <MiAcademiaRoute />
            </RequiereRol>
          }
        />
        <Route
          path="academias"
          element={
            <RequiereRol clave="academias">
              <AcademiasRoute />
            </RequiereRol>
          }
        />
        <Route
          path="academias/:id"
          element={
            <RequiereRol clave="academia-ficha">
              <AcademiaFichaRoute />
            </RequiereRol>
          }
        />
        <Route
          path="sesiones"
          element={
            <RequiereRol clave="sesiones">
              <SesionesRoute />
            </RequiereRol>
          }
        />
        <Route
          path="sesiones/:id"
          element={
            <RequiereRol clave="sesion-detalle">
              <SesionDetalleRoute />
            </RequiereRol>
          }
        />
        <Route
          path="bitacora"
          element={
            <RequiereRol clave="bitacora">
              <BitacoraPage />
            </RequiereRol>
          }
        />
        <Route
          path="mi-cuenta"
          element={
            <RequiereRol clave="mi-cuenta">
              <MiCuentaRoute />
            </RequiereRol>
          }
        />
        <Route
          path="protocolo"
          element={
            <RequiereRol clave="protocolo">
              <ProtocoloRoute />
            </RequiereRol>
          }
        />
        <Route
          path="trabajo-terminal"
          element={
            <RequiereRol clave="trabajo-terminal">
              <SeccionProximamente titulo="Trabajo Terminal" descripcion={DESCRIPCION_PROXIMAMENTE} />
            </RequiereRol>
          }
        />
        <Route
          path="presentaciones"
          element={
            <RequiereRol clave="presentaciones">
              <SeccionProximamente titulo="Presentaciones" descripcion={DESCRIPCION_PROXIMAMENTE} />
            </RequiereRol>
          }
        />
      </Route>

      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SesionProvider>
      <AvisoProvider>
        <AppRoutes />
      </AvisoProvider>
    </SesionProvider>
  );
}
