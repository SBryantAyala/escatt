import React, { useState } from "react";

const API_BASE_URL = "/usuarios";

/** Error genérico de la API, con el status HTTP para que la interfaz decida cómo reaccionar. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Error específico para 404 (usuario no encontrado), útil para mostrar un mensaje distinto. */
export class NotFoundError extends ApiError {
  constructor(message = "El usuario no existe.") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/** Intenta leer un mensaje de error del cuerpo de la respuesta; si no hay, devuelve null. */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return body?.message || body?.error || null;
  } catch {
    return null;
  }
}

export const userService = {
  /** GET /usuarios/:id */
  async getUser(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`);

    if (response.status === 404) {
      throw new NotFoundError();
    }

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new ApiError(
        message || "No se pudo obtener el usuario.",
        response.status,
      );
    }

    return response.json();
  },

  /**
   * PUT /usuarios/:id
   * `data` debe contener únicamente los campos que se quieren modificar.
   */
  async updateUser(id, data) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.status === 404) {
      throw new NotFoundError();
    }

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new ApiError(
        message || "No se pudo guardar la información.",
        response.status,
      );
    }

    // Algunos backends responden 200 sin cuerpo (o con un cuerpo vacío);
    // en ese caso simplemente no hay datos adicionales que fusionar.
    try {
      return await response.json();
    } catch {
      return null;
    }
  },
};


const TIPO_OPTIONS = [
  { value: "alumno", label: "Alumno" },
  { value: "sinodal", label: "Sinodal" },
  { value: "personal", label: "Personal" },
];

function getTipoLabel(value) {
  return TIPO_OPTIONS.find((opcion) => opcion.value === value)?.label || value;
}

const CARRERA_OPTIONS = [
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería en Inteligencia Artificial",
  "Licenciatura en Ciencia de Datos",
];

const GENERAL_FIELD_DEFS = [
  { key: "nombre", label: "Nombre", minLength: 2 },
  { key: "correo", label: "Correo electrónico", type: "email" },
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
    { key: "cargo", label: "Cargo", minLength: 2 },
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Valida un único campo y devuelve un mensaje de error o null si es válido. */
function validateField(def, value) {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    return `${def.label} es obligatorio.`;
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

/* Valida los campos generales, el tipo y los campos específicos del tipo actual. */
function validateAll(data) {
  const errors = {};

  GENERAL_FIELD_DEFS.forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  if (!TIPO_OPTIONS.some((opcion) => opcion.value === data.tipo)) {
    errors.tipo = "Selecciona un tipo de usuario válido.";
  }

  const typeFields = TYPE_FIELD_DEFS[data.tipo] || [];
  typeFields.forEach((def) => {
    const error = validateField(def, data[def.key]);
    if (error) errors[def.key] = error;
  });

  return errors;
}

function formatFecha(isoString) {
  if (!isoString) return "—";
  const fecha = new Date(isoString);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* Body del PUT */
function buildUpdatePayload(original, current) {
  const relevantKeys = [
    ...GENERAL_FIELD_DEFS.map((def) => def.key),
    "tipo",
    "activo",
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

/** Fila en modo consulta: etiqueta + valor de solo lectura. */
function FieldView({ label, value }) {
  return (
    <div className="py-3">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-base text-zinc-900">{value || "—"}</p>
    </div>
  );
}

/* Fila en modo edición para texto plano. */
function FieldEdit({ def, value, error, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor={def.key} className="text-sm font-medium text-zinc-500">
        {def.label}
      </label>
      <input
        id={def.key}
        name={def.key}
        type="text"
        value={value}
        onChange={(e) => onChange(def.key, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${def.key}-error` : undefined}
        className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-base text-zinc-900
          placeholder:text-zinc-400 focus:outline-none focus:ring-2
          ${
            error
              ? "border-red-400 focus:ring-red-200"
              : "border-zinc-300 focus:border-[#6c1d45] focus:ring-[#f5e9ee]"
          }`}
      />
      {error && (
        <p id={`${def.key}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* Fila en modo edición para un campo de selección (dropdown). */
function SelectEdit({ def, value, error, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor={def.key} className="text-sm font-medium text-zinc-500">
        {def.label}
      </label>
      <select
        id={def.key}
        name={def.key}
        value={value}
        onChange={(e) => onChange(def.key, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${def.key}-error` : undefined}
        className={`mt-1 w-full cursor-pointer rounded-md border bg-white px-3 py-2 text-base text-zinc-900
          focus:outline-none focus:ring-2
          ${
            error
              ? "border-red-400 focus:ring-red-200"
              : "border-zinc-300 focus:border-[#6c1d45] focus:ring-[#f5e9ee]"
          }`}
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

/* Fila de solo lectura para "Creado en": nunca es editable. */
function ReadOnlyField({ label, value }) {
  return (
    <div className="py-3">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-base text-zinc-500">{value}</p>
    </div>
  );
}

/* Selector Activo / Inactivo */
function ActivoSelect({ checked, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor="activo" className="text-sm font-medium text-zinc-500">
        Activo
      </label>
      <select
        id="activo"
        name="activo"
        value={checked ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className="mt-1 w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-[#6c1d45] focus:outline-none focus:ring-2 focus:ring-[#f5e9ee]"
      >
        <option value="true">Activo</option>
        <option value="false">Inactivo</option>
      </select>
    </div>
  );
}

/* Selector de Tipo (alumno | sinodal | personal) */
function TipoSelect({ value, error, onChange }) {
  return (
    <div className="py-3">
      <label htmlFor="tipo" className="text-sm font-medium text-zinc-500">
        Tipo
      </label>
      <select
        id="tipo"
        name="tipo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "tipo-error" : undefined}
        className={`mt-1 w-full cursor-pointer rounded-md border bg-white px-3 py-2 text-base text-zinc-900
          focus:outline-none focus:ring-2
          ${
            error
              ? "border-red-400 focus:ring-red-200"
              : "border-zinc-300 focus:border-[#6c1d45] focus:ring-[#f5e9ee]"
          }`}
      >
        <option value="" disabled>
          Selecciona una opción
        </option>
        {TIPO_OPTIONS.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
      {error && (
        <p id="tipo-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function TipoBadge({ tipo }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#f5e9ee] px-3 py-1 text-sm font-medium text-[#6c1d45]">
      {getTipoLabel(tipo)}
    </span>
  );
}

function ActivoBadge({ activo }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        activo ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}

const SECCION_TITULOS = {
  alumno: "Datos de alumno",
  sinodal: "Datos de sinodal",
  personal: "Datos de personal",
};

export default function UserProfileForm({userId, onVolver}) {
  //const userId = 1;

  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  React.useEffect(() => {
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

  function handleTipoChange(nuevoTipo) {
    setFormData((prev) => ({ ...prev, tipo: nuevoTipo }));
    // Al cambiar de tipo, los errores de los campos específicos del tipo anterior ya no aplican y se descartan.
    setErrors((prev) => {
      const next = { ...prev };
      delete next.tipo;
      Object.values(TYPE_FIELD_DEFS)
        .flat()
        .forEach((def) => delete next[def.key]);
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
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "Ocurrió un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#6c1d45] border-t-transparent" />
          <span>Cargando usuario…</span>
        </div>
      </div>
    );
  }

  if (loadError || !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-medium text-zinc-900">
            {loadError || "No se pudo cargar el usuario."}
          </p>
        </div>
      </div>
    );
  }

  const displayData = isEditing ? formData : originalData;
  const typeFields = TYPE_FIELD_DEFS[displayData.tipo] || [];

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          {/* Encabezado */}
          <div className="flex items-center justify-between gap-4 bg-[#6c1d45] px-6 py-5 sm:px-8">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[#e7c3d2]">
                ESCATT
              </p>
              <h1 className="mt-1 truncate text-lg font-semibold text-white">
                {originalData.nombre}
              </h1>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex-shrink-0 cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-medium text-[#6c1d45] hover:bg-[#f5e9ee]"
              >
                Editar
              </button>
            )}
          </div>

          {/* Datos generales */}
          <div className="px-6 pt-2 sm:px-8">
            <h2 className="pt-4 text-sm font-semibold text-zinc-700">
              Datos generales
            </h2>
            <div className="divide-y divide-zinc-100">
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
                  <FieldView
                    key={def.key}
                    label={def.label}
                    value={originalData[def.key]}
                  />
                ),
              )}

              {/* Tipo */}
              {isEditing ? (
                <TipoSelect
                  value={formData.tipo}
                  error={errors.tipo}
                  onChange={handleTipoChange}
                />
              ) : (
                <div className="py-3">
                  <p className="text-sm font-medium text-zinc-500">Tipo</p>
                  <p className="mt-1">
                    <TipoBadge tipo={originalData.tipo} />
                  </p>
                </div>
              )}

              {/* Activo */}
              {isEditing ? (
                <ActivoSelect
                  checked={formData.activo}
                  onChange={(value) => handleFieldChange("activo", value)}
                />
              ) : (
                <div className="py-3">
                  <p className="text-sm font-medium text-zinc-500">Activo</p>
                  <p className="mt-1">
                    <ActivoBadge activo={originalData.activo} />
                  </p>
                </div>
              )}

              {/* Creado en: siempre de solo lectura */}
              <ReadOnlyField
                label="Creado en"
                value={formatFecha(originalData.creado_en)}
              />
            </div>
          </div>

          {/* Campos específicos según el tipo de usuario */}
          <div className="px-6 pb-2 sm:px-8">
            <h2 className="border-t border-zinc-100 pt-4 text-sm font-semibold text-zinc-700">
              {SECCION_TITULOS[displayData.tipo] || "Datos específicos"}
            </h2>
            <div className="divide-y divide-zinc-100">
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
                  <FieldView
                    key={def.key}
                    label={def.label}
                    value={originalData[def.key]}
                  />
                );
              })}
            </div>
          </div>

          {saveError && (
            <div className="px-6 pt-2 sm:px-8">
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-5 sm:px-8">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-md bg-[#6c1d45] px-4 py-2 text-sm font-medium text-white hover:bg-[#591739] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isSaving && <Spinner />}
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
