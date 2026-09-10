import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { GRAD_AZUL, VIDRIO } from "../../../lib/theme";

// Pantalla: Detalle / edición de un usuario.
// Consume /api/usuarios/:id (mismo contrato que Listado y Alta) a través del
// cliente compartido de lib/api.js, que ya normaliza errores.
//
// Rediseño:
//   - Paleta institucional compartida (lib/theme) en vez de colores propios.
//   - El "tipo" (alumno/sinodal/personal) es de solo lectura: se muestra como
//     badge, nunca como selector.
//   - Encabezado con inicial + badge de rol + "Agregado el {fecha}".
//   - "Zona de peligro" (dar de baja / reactivar / eliminar acceso), portada
//     desde el Listado y adaptada a un solo usuario, con confirmación en modal.
export const userService = {
  async getUser(id) {
    return api(`/api/usuarios/${id}`);
  },
  async updateUser(id, data) {
    return api(`/api/usuarios/${id}`, { method: "PUT", body: data });
  },
};

const TIPO_OPTIONS = [
  { value: "alumno", label: "Alumno" },
  { value: "sinodal", label: "Sinodal" },
  { value: "personal", label: "Personal CATT" },
];

function getTipoLabel(value) {
  return TIPO_OPTIONS.find((opcion) => opcion.value === value)?.label || value;
}

const CARRERA_OPTIONS = [
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería en Inteligencia Artificial",
  "Licenciatura en Ciencia de Datos",
];

// Cargos fijos de la coordinación de la CATT (solo aplica a tipo "personal").
const CARGO_OPTIONS = [
  "Presidencia de la CATT",
  "Secretaría Técnica",
  "Secretaría Ejecutiva / Coordinación Operativa",
  "Vocal Académico",
  "Personal Administrativo",
];

const GENERAL_FIELD_DEFS = [
  { key: "nombre", label: "Nombre", minLength: 2 },
  { key: "correo", label: "Correo electrónico", type: "email" },
  { key: "telefono", label: "Número de teléfono", optional: true },
];

const TYPE_FIELD_DEFS = {
  alumno: [
    {
      key: "boleta",
      label: "Boleta",
      pattern: /^\d{10}$/,
      patternMessage: "La boleta debe tener exactamente 10 dígitos.",
    },
    {
      key: "carrera",
      label: "Carrera",
      type: "select",
      options: CARRERA_OPTIONS,
    },
    { key: "protocolo_tt", label: "Protocolo TT", minLength: 3 },
  ],
  sinodal: [
    {
      key: "numero_empleado",
      label: "Número de empleado",
      pattern: /^\d{6}$/,
      patternMessage: "El número de empleado debe tener exactamente 6 dígitos.",
    },
    { key: "especialidad", label: "Especialidad", minLength: 2 },
  ],
  personal: [
    {
      key: "numero_empleado",
      label: "Número de empleado",
      pattern: /^\d{6}$/,
      patternMessage: "El número de empleado debe tener exactamente 6 dígitos.",
    },
    { key: "cargo", label: "Cargo", type: "select", options: CARGO_OPTIONS },
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SECCION_TITULOS = {
  alumno: "Datos de alumno",
  sinodal: "Datos de sinodal",
  personal: "Datos de personal",
};

// Estilo de input/select en modo edición: transición suave + focus:ring, igual
// que claseInput en Alta/index.jsx (antes eran estilos estáticos).
const CLASE_INPUT_BASE =
  "mt-1 w-full rounded-xl border bg-white/80 px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2";
const CLASE_INPUT_OK = "border-slate-200 focus:border-[#1878B6] focus:ring-[#4FB3E8]/40";
const CLASE_INPUT_ERROR = "border-red-300 focus:border-red-400 focus:ring-red-200";
const claseInput = (error) => `${CLASE_INPUT_BASE} ${error ? CLASE_INPUT_ERROR : CLASE_INPUT_OK}`;
const claseLabel = "text-xs font-semibold uppercase tracking-wide text-slate-500";

// --- Confirmación de acciones sensibles (portado desde Listado) --------------

const TITULO_CONFIRMACION = {
  eliminar: "Eliminar usuario",
  revocar: "Dar de baja acceso",
  reactivar: "Reactivar acceso",
};

const TEXTO_CONFIRMACION = {
  eliminar: (nombre) =>
    `Esta acción borra a "${nombre}" de forma permanente. No se puede deshacer.`,
  revocar: (nombre) => `"${nombre}" perderá acceso al sistema hasta que se le reactive.`,
  reactivar: (nombre) => `"${nombre}" recupera su acceso al sistema de inmediato.`,
};

function ConfirmDialog({ accion, nombre, onCancelar, onConfirmar, procesando }) {
  if (!accion) return null;

  const esEliminar = accion === "eliminar";
  const esRevocar = accion === "revocar";
  const claseBoton = esEliminar
    ? "bg-red-600 hover:bg-red-700"
    : esRevocar
      ? "bg-amber-600 hover:bg-amber-700"
      : "shadow-md shadow-[#1878B6]/30 hover:-translate-y-0.5";
  const estiloBoton = !esEliminar && !esRevocar ? { background: GRAD_AZUL } : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-titulo" className="text-lg font-semibold text-slate-900">
          {TITULO_CONFIRMACION[accion]}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{TEXTO_CONFIRMACION[accion](nombre)}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            style={estiloBoton}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50 ${claseBoton}`}
          >
            {procesando ? "Procesando…" : TITULO_CONFIRMACION[accion]}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Validación ------------------------------------------------------------

/* Valida un único campo y devuelve un mensaje de error o null si es válido. */
function validateField(def, value) {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    // Los campos opcionales (p. ej. teléfono) pueden quedar vacíos.
    return def.optional ? null : `${def.label} es obligatorio.`;
  }

  if (def.type === "email" && !EMAIL_REGEX.test(trimmed)) {
    return "Escribe un correo electrónico válido.";
  }

  if (def.type === "select" && def.options && !def.options.includes(trimmed)) {
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

/* Valida los campos generales y los específicos del tipo actual (el tipo NO se
   edita, así que no se valida). */
function validateAll(data) {
  const errors = {};

  GENERAL_FIELD_DEFS.forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  const typeFields = TYPE_FIELD_DEFS[data.tipo] || [];
  typeFields.forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  return errors;
}

function formatFecha(isoString) {
  if (!isoString) return "—";
  // SQLite entrega "YYYY-MM-DD HH:MM:SS"; el espacio rompe el parseo en algunos
  // navegadores, se cambia por "T".
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
    ...(TYPE_FIELD_DEFS[current.tipo] || []).map((def) => def.key),
  ];

  const payload = {};
  relevantKeys.forEach((key) => {
    if (current[key] !== original[key]) {
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
          <option key={opcion} value={opcion}>
            {opcion}
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

function TipoBadge({ tipo }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#4FB3E8]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0F5C8C]">
      {getTipoLabel(tipo)}
    </span>
  );
}

function ActivoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
      Inactivo
    </span>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}

/* "Volver al listado": el bug era que la prop onVolver nunca se usaba. */
function VolverLink({ onVolver }) {
  if (!onVolver) return null;
  return (
    <button
      type="button"
      onClick={onVolver}
      className="mb-3 inline-flex items-center rounded-full px-2 py-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
    >
      ← Volver al listado
    </button>
  );
}

/* Zona de peligro (estilo GitHub): solo visible fuera del modo edición. */
function ZonaPeligro({ activo, error, onRevocar, onReactivar, onEliminar }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/70 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">Zona de peligro</h2>
      <p className="mt-1 text-sm text-red-700/80">
        Estas acciones afectan el acceso de la persona al sistema. Se pedirá confirmación.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {activo ? (
          <button
            type="button"
            onClick={onRevocar}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
          >
            Dar de baja acceso
          </button>
        ) : (
          <button
            type="button"
            onClick={onReactivar}
            className="rounded-lg border border-[#1878B6]/40 bg-white px-3 py-1.5 text-sm font-medium text-[#0F5C8C] transition hover:bg-[#4FB3E8]/10"
          >
            Reactivar acceso
          </button>
        )}
        <button
          type="button"
          onClick={onEliminar}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Eliminar usuario
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

// --- Componente principal ----------------------------------------------------

export default function UserProfileForm({ userId, onVolver }) {
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Zona de peligro: acción pendiente de confirmar + estado de la petición.
  const [accionPeligro, setAccionPeligro] = useState(null); // 'revocar' | 'reactivar' | 'eliminar'
  const [procesandoPeligro, setProcesandoPeligro] = useState(false);
  const [errorPeligro, setErrorPeligro] = useState(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    userService
      .getUser(userId)
      .then((user) => {
        if (!active) return;
        setOriginalData(user);
        setFormData(user);
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

  function handleEdit() {
    setIsEditing(true);
    setSaveError(null);
  }

  function handleCancel() {
    setFormData(originalData);
    setErrors({});
    setSaveError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    const validationErrors = validateAll(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = buildUpdatePayload(originalData, formData);

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await userService.updateUser(userId, payload);
      setOriginalData((prev) => ({ ...prev, ...formData, ...(updated || {}) }));
      setFormData((prev) => ({ ...prev, ...(updated || {}) }));
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  }

  function pedirConfirmacion(accion) {
    setErrorPeligro(null);
    setAccionPeligro(accion);
  }

  function cancelarAccion() {
    if (procesandoPeligro) return;
    setAccionPeligro(null);
  }

  async function confirmarAccion() {
    if (!accionPeligro) return;
    setProcesandoPeligro(true);
    setErrorPeligro(null);
    try {
      if (accionPeligro === "eliminar") {
        await api(`/api/usuarios/${userId}`, { method: "DELETE" });
        // El usuario ya no existe: regresar al listado.
        onVolver?.();
        return;
      }

      const actualizado =
        accionPeligro === "reactivar"
          ? await api(`/api/usuarios/${userId}`, { method: "PUT", body: { activo: true } })
          : await api(`/api/usuarios/${userId}/revocar`, { method: "PATCH" });

      // Solo se refleja el nuevo estado, sin salir de la pantalla.
      const nuevoActivo = actualizado?.activo ?? accionPeligro === "reactivar";
      setOriginalData((prev) => ({ ...prev, ...(actualizado || {}), activo: nuevoActivo }));
      setFormData((prev) => ({ ...prev, ...(actualizado || {}), activo: nuevoActivo }));
      setAccionPeligro(null);
    } catch (err) {
      setErrorPeligro(err.message || "No se pudo completar la acción.");
    } finally {
      setProcesandoPeligro(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <VolverLink onVolver={onVolver} />
        <div className={`rounded-3xl p-8 ${VIDRIO} bg-white/85`}>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1878B6] border-t-transparent" />
            <span>Cargando usuario…</span>
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

  const displayData = isEditing ? formData : originalData;
  const typeFields = TYPE_FIELD_DEFS[displayData.tipo] || [];
  const inicial = (originalData.nombre ?? "").trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="mx-auto max-w-2xl">
      <VolverLink onVolver={onVolver} />

      <div className={`overflow-hidden rounded-3xl ${VIDRIO} bg-white/85`}>
        {/* Encabezado: inicial + rol + nombre + fecha de alta */}
        <div className="flex items-start gap-4 border-b border-slate-100 p-6 sm:p-8">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundImage: GRAD_AZUL }}
            aria-hidden="true"
          >
            {inicial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TipoBadge tipo={originalData.tipo} />
              <ActivoBadge activo={originalData.activo} />
            </div>
            <h1 className="mt-1.5 truncate text-xl font-bold text-slate-900">
              {originalData.nombre}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Agregado el {formatFecha(originalData.creado_en)}
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5"
              style={{ background: GRAD_AZUL }}
            >
              Editar
            </button>
          )}
        </div>

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

            {/* Tipo: siempre de solo lectura (badge), nunca editable */}
            <div className="py-3">
              <p className={claseLabel}>Tipo</p>
              <p className="mt-1">
                <TipoBadge tipo={originalData.tipo} />
              </p>
            </div>
          </div>
        </div>

        {/* Campos específicos según el tipo de usuario */}
        <div className="px-6 pb-6 sm:px-8">
          <h2 className="border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700">
            {SECCION_TITULOS[displayData.tipo] || "Datos específicos"}
          </h2>
          <div className="divide-y divide-slate-100">
            {typeFields.map((def) => {
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
              return (
                <FieldView key={def.key} label={def.label} value={originalData[def.key]} />
              );
            })}
          </div>
        </div>

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
              className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{ background: GRAD_AZUL }}
              className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#1878B6]/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Spinner />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      {/* Zona de peligro: solo fuera del modo edición */}
      {!isEditing && (
        <ZonaPeligro
          activo={originalData.activo}
          error={errorPeligro}
          onRevocar={() => pedirConfirmacion("revocar")}
          onReactivar={() => pedirConfirmacion("reactivar")}
          onEliminar={() => pedirConfirmacion("eliminar")}
        />
      )}

      <ConfirmDialog
        accion={accionPeligro}
        nombre={originalData.nombre}
        onCancelar={cancelarAccion}
        onConfirmar={confirmarAccion}
        procesando={procesandoPeligro}
      />
    </div>
  );
}
