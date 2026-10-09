import { useEffect, useState } from "react";
import ChipsRol from "../../../components/ChipsRol";
import DialogoConfirmacion from "../../../components/ui/DialogoConfirmacion";
import EncabezadoFicha from "../../../components/ui/EncabezadoFicha";
import Esqueleto from "../../../components/ui/Esqueleto";
import Etiqueta from "../../../components/ui/Etiqueta";
import ZonaPeligro from "../../../components/ui/ZonaPeligro";
import { useAviso } from "../../../components/ui/Avisos";
import { api } from "../../../lib/api";
import { nombreCompleto } from "../../../lib/nombre";
import {
  CARRERAS,
  ETIQUETA_ROL,
  PLANES,
  ROLES_CATT,
  esCuentaDePersonal,
  puedeGestionar,
  tieneRol,
} from "../../../lib/roles";
import { GRAD_AZUL, VIDRIO } from "../../../lib/theme";

// Pantalla: Detalle / edición de un usuario (HU-3 consulta, HU-4 edición,
// HU-6 roles del personal). Vive en /panel/usuarios/:id.
//
//   - Los campos que se muestran dependen de los PERFILES de la persona
//     (alumno, docente, personal CATT); una persona puede tener varios.
//   - Los roles se muestran como chips. Según quién consulta:
//       Secretario Ejecutivo -> asigna/quita "Presidente de Academia" a docentes.
//       Administrador        -> asigna/quita roles de la CATT y de administrador.
//   - Zona de peligro: revocar / reactivar acceso (baja lógica), restablecer
//     contraseña (genera una temporal) y eliminar la cuenta, esto último solo
//     si no tiene historial (altas duplicadas o por error).
// El backend valida todo otra vez; aquí solo se ocultan botones.
export const userService = {
  async getUser(id) {
    return api(`/api/usuarios/${id}`);
  },
  async updateUser(id, data) {
    return api(`/api/usuarios/${id}`, { method: "PUT", body: data });
  },
};

const GENERAL_FIELD_DEFS = [
  { key: "nombre", label: "Nombre(s)", minLength: 2 },
  { key: "apellido_paterno", label: "Apellido paterno", minLength: 2 },
  { key: "apellido_materno", label: "Apellido materno", minLength: 2 },
  { key: "correo", label: "Correo electrónico", type: "email" },
  { key: "telefono", label: "Número de teléfono", optional: true },
];

// Campos por perfil. `seccion` agrupa la vista.
function camposDePerfil(usuario, academias = []) {
  const perfiles = usuario?.perfiles ?? [];
  const campos = [];
  if (perfiles.includes("alumno")) {
    campos.push(
      {
        seccion: "Datos de alumno",
        key: "boleta",
        label: "Boleta",
        pattern: /^\d{10}$/,
        patternMessage: "La boleta debe tener exactamente 10 dígitos.",
      },
      { seccion: "Datos de alumno", key: "carrera", label: "Carrera", type: "select", options: CARRERAS },
      {
        seccion: "Datos de alumno",
        key: "plan_estudios",
        label: "Plan de estudios",
        type: "select",
        options: PLANES.map((p) => ({ valor: p, etiqueta: `Plan ${p}` })),
      },
    );
  }
  if (usuario?.numero_empleado != null) {
    campos.push({ seccion: "Datos de empleado", key: "numero_empleado", label: "Número de empleado" });
  }
  if (perfiles.includes("docente")) {
    campos.push(
      {
        seccion: "Datos de docente",
        key: "academia_id",
        label: "Academia",
        type: "select",
        options: academias.map((a) => ({ valor: String(a.id), etiqueta: a.nombre })),
        mostrar: (u) => u.academia,
      },
      { seccion: "Datos de docente", key: "cedula_profesional", label: "Cédula profesional", optional: true },
      { seccion: "Datos de docente", key: "extension", label: "Extensión", optional: true },
    );
  }
  if (perfiles.includes("personal_catt")) {
    campos.push({ seccion: "Datos de personal CATT", key: "cargo", label: "Cargo", optional: true });
  }
  return campos;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CLASE_INPUT_BASE =
  "mt-1 w-full rounded-xl border bg-white/80 px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2";
const CLASE_INPUT_OK = "border-slate-200 focus:border-[#1878B6] focus:ring-[#4FB3E8]/40";
const CLASE_INPUT_ERROR = "border-red-300 focus:border-red-400 focus:ring-red-200";
const claseInput = (error) => `${CLASE_INPUT_BASE} ${error ? CLASE_INPUT_ERROR : CLASE_INPUT_OK}`;
const claseLabel = "text-xs font-semibold uppercase tracking-wide text-slate-500";

// --- Confirmación de acciones sensibles --------------------------------------
// Cada acción de la zona de peligro mapea a un nivel de DialogoConfirmacion:
// revocar/reactivar/reset son "simple"; eliminar es "escribir" el correo (o
// "bloqueado" si el historial no lo permite).

const CONFIG_CONFIRMACION = {
  revocar: {
    nivel: "simple",
    titulo: "Revocar acceso",
    descripcion: (nombre) =>
      `"${nombre}" no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus datos se conservan y puedes reactivarla después.`,
    etiquetaConfirmar: "Revocar acceso",
    colorConfirmar: "bg-amber-600 hover:bg-amber-700",
  },
  reactivar: {
    nivel: "simple",
    titulo: "Reactivar acceso",
    descripcion: (nombre) => `"${nombre}" recupera su acceso al sistema de inmediato.`,
    etiquetaConfirmar: "Reactivar acceso",
  },
  reset: {
    nivel: "simple",
    titulo: "Restablecer contraseña",
    descripcion: (nombre) =>
      `Se generará una contraseña temporal para "${nombre}" y se cerrarán sus sesiones. Deberá cambiarla al entrar.`,
    etiquetaConfirmar: "Restablecer contraseña",
  },
  eliminar: {
    nivel: "escribir",
    titulo: "Eliminar cuenta",
    descripcion: (nombre) =>
      `Se borrará a "${nombre}" de forma permanente. Solo se permite porque la cuenta no tiene historial. No se puede deshacer.`,
    etiquetaConfirmar: "Eliminar cuenta",
    colorConfirmar: "bg-red-600 hover:bg-red-700",
  },
  "eliminar-bloqueada": {
    nivel: "bloqueado",
    titulo: "Eliminar cuenta",
  },
};

// --- Validación ------------------------------------------------------------

/* Valida un único campo y devuelve un mensaje de error o null si es válido. */
function validateField(def, value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    // Los campos opcionales (p. ej. teléfono) pueden quedar vacíos.
    return def.optional ? null : `${def.label} es obligatorio.`;
  }

  if (def.type === "email" && !EMAIL_REGEX.test(trimmed)) {
    return "Escribe un correo electrónico válido.";
  }

  if (def.type === "select" && def.options && !def.options.some((o) => String(o.valor) === trimmed)) {
    return "Selecciona una opción válida.";
  }

  if (def.pattern && !def.pattern.test(trimmed)) {
    return def.patternMessage || "El formato no es válido.";
  }

  if (def.minLength && trimmed.length < def.minLength) {
    return `Debe tener al menos ${def.minLength} caracteres.`;
  }

  return null;
}

/* Valida los campos generales y los de los perfiles que tenga la persona. */
function validateAll(data, academias = []) {
  const errors = {};

  GENERAL_FIELD_DEFS.forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  camposDePerfil(data, academias).forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  return errors;
}

function formatFecha(isoString) {
  if (!isoString) return "—";
  const fecha = new Date(String(isoString).replace(" ", "T"));
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* Body del PUT: solo los campos que cambiaron respecto al original. */
function buildUpdatePayload(original, current) {
  const relevantKeys = [
    ...GENERAL_FIELD_DEFS.map((def) => def.key),
    ...camposDePerfil(current).map((def) => def.key),
  ];

  const payload = {};
  relevantKeys.forEach((key) => {
    if (String(current[key] ?? "") !== String(original[key] ?? "")) {
      payload[key] = current[key];
    }
  });
  return payload;
}

// --- Piezas de presentación ---------------------------------------------

/* Fila en modo consulta: etiqueta + valor de solo lectura. */
function FieldView({ label, value }) {
  return (
    <div className="py-3">
      <p className={claseLabel}>{label}</p>
      <p className="mt-1 text-base text-slate-900">{value || "—"}</p>
    </div>
  );
}

/* Fila en modo edición para texto plano. */
function FieldEdit({ def, value, error, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor={def.key} className={claseLabel}>
        {def.label}
        {def.optional && <span className="ml-1 lowercase text-slate-400">(opcional)</span>}
      </label>
      <input
        id={def.key}
        name={def.key}
        type={def.key === "telefono" ? "tel" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${def.key}-error` : undefined}
        className={claseInput(error)}
      />
      {error && (
        <p id={`${def.key}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* Fila en modo edición para un campo de selección. */
function SelectEdit({ def, value, error, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor={def.key} className={claseLabel}>
        {def.label}
      </label>
      <select
        id={def.key}
        name={def.key}
        value={value ?? ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${def.key}-error` : undefined}
        className={`${claseInput(error)} cursor-pointer`}
      >
        <option value="" disabled>
          Selecciona una opción
        </option>
        {def.options.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${def.key}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}

/* "Volver al listado". */
function VolverLink({ onVolver }) {
  if (!onVolver) return null;
  return (
    <button
      type="button"
      onClick={onVolver}
      className="mb-3 inline-flex min-h-11 items-center rounded-full px-2 py-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
    >
      ← Volver al listado
    </button>
  );
}

/* Roles: chips + botones para asignar/quitar según quién consulta. */
function SeccionRoles({ actor, usuario, onCambio }) {
  const aviso = useAviso();
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState(null);

  const esPropio = actor?.id === usuario.id;
  const gestionables = [];
  if (!esPropio && tieneRol(actor, "catt_ejecutivo") && usuario.perfiles?.includes("docente")) {
    gestionables.push("presidente_academia");
  }
  if (!esPropio && tieneRol(actor, "admin_sistema")) {
    if (usuario.numero_empleado != null) gestionables.push(...ROLES_CATT);
    if (esCuentaDePersonal(usuario)) gestionables.push("admin_sistema");
  }

  const alternar = async (rol) => {
    setProcesando(rol);
    setError(null);
    try {
      const tiene = usuario.roles.includes(rol);
      const actualizado = tiene
        ? await api(`/api/usuarios/${usuario.id}/roles/${rol}`, { method: "DELETE" })
        : await api(`/api/usuarios/${usuario.id}/roles`, { method: "POST", body: { rol } });
      onCambio(actualizado);
    } catch (err) {
      setError(err.message);
      aviso.error(err.message);
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
      <h2 className="text-sm font-semibold text-slate-700">Roles</h2>
      <ChipsRol roles={usuario.roles} className="mt-2" />
      {gestionables.length > 0 && (
        <div className="mt-4">
          <p className={claseLabel}>Asignar o quitar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gestionables.map((rol) => {
              const tiene = usuario.roles.includes(rol);
              return (
                <button
                  key={rol}
                  type="button"
                  disabled={procesando !== null}
                  onClick={() => alternar(rol)}
                  aria-pressed={tiene}
                  className={`min-h-11 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                    tiene
                      ? "text-white shadow-md shadow-[#1878B6]/30"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={tiene ? { background: GRAD_AZUL } : undefined}
                >
                  {procesando === rol ? "…" : `${tiene ? "✓ " : "+ "}${ETIQUETA_ROL[rol]}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// --- Componente principal ----------------------------------------------------

export default function UserProfileForm({ actor, userId, onVolver }) {
  const aviso = useAviso();
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [academias, setAcademias] = useState([]);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // 'revocar' | 'reactivar' | 'reset' | 'eliminar' | 'eliminar-bloqueada'
  const [accionPeligro, setAccionPeligro] = useState(null);
  const [procesandoPeligro, setProcesandoPeligro] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState(null);
  const [historial, setHistorial] = useState(null); // { puede_eliminar, motivos }

  // Normaliza academia_id a texto para que el <select> lo compare bien.
  const aFormulario = (u) => ({ ...u, academia_id: u.academia_id != null ? String(u.academia_id) : "" });

  const aplicar = (u) => {
    setOriginalData(aFormulario(u));
    setFormData(aFormulario(u));
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setHistorial(null);
    api(`/api/usuarios/${userId}/historial`)
      .then((h) => active && setHistorial(h))
      .catch(() => {});
    userService
      .getUser(userId)
      .then((user) => {
        if (!active) return;
        aplicar(user);
        if (user.perfiles?.includes("docente")) {
          api("/api/academias")
            .then((a) => active && setAcademias(a))
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err.message || "No se pudo cargar el usuario.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  function handleFieldChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleCancel() {
    setFormData(originalData);
    setErrors({});
    setSaveError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    const validationErrors = validateAll(formData, academias);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = buildUpdatePayload(originalData, formData);
    if (payload.academia_id !== undefined) payload.academia_id = Number(payload.academia_id);
    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      aplicar(await userService.updateUser(userId, payload));
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  }

  function pedirConfirmacion(accion) {
    setPasswordTemporal(null);
    setAccionPeligro(accion);
  }

  // El botón "Eliminar cuenta" siempre se puede pulsar (una vez cargado el
  // historial): si el historial lo permite abre el diálogo "escribir"; si no,
  // abre el diálogo "bloqueado" con el motivo y qué hacer en su lugar.
  function alPedirEliminar() {
    if (historial?.puede_eliminar) {
      pedirConfirmacion("eliminar");
    } else {
      pedirConfirmacion("eliminar-bloqueada");
    }
  }

  async function confirmarAccion() {
    if (!accionPeligro || accionPeligro === "eliminar-bloqueada") return;
    setProcesandoPeligro(true);
    try {
      if (accionPeligro === "eliminar") {
        await api(`/api/usuarios/${userId}`, { method: "DELETE" });
        setAccionPeligro(null);
        aviso.exito(`Se eliminó la cuenta de ${nombreCompleto(originalData)}.`);
        onVolver?.();
        return;
      }
      if (accionPeligro === "reset") {
        const datos = await api(`/api/usuarios/${userId}/reset-password`, { method: "POST" });
        aplicar(datos.usuario);
        setPasswordTemporal(datos.password_temporal);
        setAccionPeligro(null);
        return;
      }
      const ruta = accionPeligro === "reactivar" ? "reactivar" : "revocar";
      const actualizado = await api(`/api/usuarios/${userId}/${ruta}`, { method: "PATCH" });
      aplicar(actualizado);
      setAccionPeligro(null);
      const nombre = nombreCompleto(actualizado);
      if (accionPeligro === "revocar") {
        aviso.exito(`Se revocó el acceso de ${nombre}.`, {
          deshacer: async () => {
            try {
              const reactivado = await api(`/api/usuarios/${userId}/reactivar`, { method: "PATCH" });
              aplicar(reactivado);
              aviso.exito(`Se reactivó el acceso de ${nombreCompleto(reactivado)}.`);
            } catch (err) {
              aviso.error(err.message);
            }
          },
        });
      } else {
        aviso.exito(`Se reactivó el acceso de ${nombre}.`);
      }
    } catch (err) {
      // HU-7: al revocar a un docente con asignaciones vigentes el backend
      // responde 409 con la lista; se muestra completa para que se sepa qué
      // reasignar antes de volver a intentarlo.
      const asignaciones = err.datos?.asignaciones;
      const detalle =
        Array.isArray(asignaciones) && asignaciones.length > 0
          ? `: ${asignaciones.map((a) => a.descripcion ?? a.rol).join("; ")}`
          : "";
      aviso.error(`${err.message || "No se pudo completar la acción."}${detalle}`);
      setAccionPeligro(null);
    } finally {
      setProcesandoPeligro(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <VolverLink onVolver={onVolver} />
        <div className={`rounded-3xl p-8 ${VIDRIO} bg-white/85`}>
          <div className="flex items-center gap-4">
            <Esqueleto className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Esqueleto className="h-4 w-1/3" />
              <Esqueleto className="h-5 w-2/3" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !formData) {
    return (
      <div className="mx-auto max-w-2xl">
        <VolverLink onVolver={onVolver} />
        <div className={`rounded-3xl p-8 text-center ${VIDRIO} bg-white/85`}>
          <p className="text-base font-medium text-slate-900">
            {loadError || "No se pudo cargar el usuario."}
          </p>
        </div>
      </div>
    );
  }

  const puedeEditar = puedeGestionar(actor, originalData);
  const campos = camposDePerfil(originalData, academias);
  const secciones = [...new Set(campos.map((c) => c.seccion))];
  const inicial = (originalData.nombre ?? "").trim().charAt(0).toUpperCase() || "U";

  const renderCampo = (def) => {
    if (isEditing) {
      return def.type === "select" ? (
        <SelectEdit
          key={def.key}
          def={def}
          value={formData[def.key]}
          error={errors[def.key]}
          onChange={handleFieldChange}
        />
      ) : (
        <FieldEdit
          key={def.key}
          def={def}
          value={formData[def.key]}
          error={errors[def.key]}
          onChange={handleFieldChange}
        />
      );
    }
    const valor = def.mostrar ? def.mostrar(originalData) : originalData[def.key];
    return <FieldView key={def.key} label={def.label} value={valor} />;
  };

  const configConfirmacion = CONFIG_CONFIRMACION[accionPeligro];

  return (
    <div className="mx-auto max-w-2xl">
      <VolverLink onVolver={onVolver} />

      <div className={`overflow-hidden rounded-3xl ${VIDRIO} bg-white/85`}>
        <EncabezadoFicha
          figura={
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ backgroundImage: GRAD_AZUL }}
              aria-hidden="true"
            >
              {inicial}
            </span>
          }
          etiquetas={
            <>
              <Etiqueta variante={originalData.activo ? "exito" : "neutro"}>
                {originalData.activo ? "Activo" : "Acceso revocado"}
              </Etiqueta>
              {originalData.debe_cambiar_password && (
                <Etiqueta variante="alerta">Contraseña temporal</Etiqueta>
              )}
            </>
          }
          titulo={nombreCompleto(originalData)}
          subtitulo={`Agregado el ${formatFecha(originalData.creado_en)}`}
          acciones={
            !isEditing &&
            puedeEditar && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setSaveError(null);
                }}
                className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5"
                style={{ background: GRAD_AZUL }}
              >
                Editar
              </button>
            )
          }
        />

        {/* Datos generales */}
        <div className="px-6 pt-2 sm:px-8">
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Datos generales</h2>
          <div className="divide-y divide-slate-100">
            {GENERAL_FIELD_DEFS.map((def) =>
              isEditing ? (
                <FieldEdit
                  key={def.key}
                  def={def}
                  value={formData[def.key]}
                  error={errors[def.key]}
                  onChange={handleFieldChange}
                />
              ) : (
                <FieldView key={def.key} label={def.label} value={originalData[def.key]} />
              ),
            )}
          </div>
        </div>

        {/* Un bloque por perfil */}
        {secciones.map((seccion) => (
          <div key={seccion} className="px-6 pb-2 sm:px-8">
            <h2 className="border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700">
              {seccion}
            </h2>
            <div className="divide-y divide-slate-100">
              {campos.filter((c) => c.seccion === seccion).map(renderCampo)}
            </div>
          </div>
        ))}

        {saveError && (
          <div className="px-6 pb-2 sm:px-8">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="min-h-11 cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{ background: GRAD_AZUL }}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Spinner />}
              Guardar cambios
            </button>
          </div>
        )}

        {!isEditing && <SeccionRoles actor={actor} usuario={originalData} onCambio={aplicar} />}
      </div>

      {!isEditing && puedeEditar && (
        <ZonaPeligro
          titulo="Acceso a la cuenta"
          descripcion="Revocar conserva el historial y se puede revertir. Eliminar borra la cuenta y solo está disponible para cuentas sin historial (altas duplicadas o por error)."
        >
          {originalData.activo ? (
            <button
              type="button"
              onClick={() => pedirConfirmacion("revocar")}
              className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
            >
              Revocar acceso
            </button>
          ) : (
            <button
              type="button"
              onClick={() => pedirConfirmacion("reactivar")}
              className="min-h-11 rounded-lg border border-[#1878B6]/40 bg-white px-3 py-1.5 text-sm font-medium text-[#0F5C8C] transition hover:bg-[#4FB3E8]/10"
            >
              Reactivar acceso
            </button>
          )}
          {originalData.activo && (
            <button
              type="button"
              onClick={() => pedirConfirmacion("reset")}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Restablecer contraseña
            </button>
          )}
          <button
            type="button"
            onClick={alPedirEliminar}
            disabled={historial === null}
            className="min-h-11 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
          >
            Eliminar cuenta
          </button>
          {passwordTemporal && (
            <div className="mt-1 w-full rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-emerald-200">
              Contraseña temporal (se muestra solo esta vez):{" "}
              <code className="font-mono font-semibold tracking-wider">{passwordTemporal}</code>
            </div>
          )}
        </ZonaPeligro>
      )}

      <DialogoConfirmacion
        abierto={Boolean(accionPeligro)}
        nivel={configConfirmacion?.nivel ?? "simple"}
        titulo={configConfirmacion?.titulo}
        descripcion={configConfirmacion?.descripcion?.(nombreCompleto(originalData))}
        etiquetaConfirmar={configConfirmacion?.etiquetaConfirmar}
        colorConfirmar={configConfirmacion?.colorConfirmar}
        textoEsperado={originalData.correo}
        motivoBloqueo={
          accionPeligro === "eliminar-bloqueada"
            ? `No se puede eliminar porque tiene historial: ${
                historial?.motivos?.join("; ") ?? "sin detalle"
              }. Usa "Revocar acceso" en su lugar.`
            : undefined
        }
        cargando={procesandoPeligro}
        onConfirmar={confirmarAccion}
        onCancelar={() => !procesandoPeligro && setAccionPeligro(null)}
      />
    </div>
  );
}
