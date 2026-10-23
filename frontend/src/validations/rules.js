/* ==========================================================================
 * Primitivas de validación (una regla = fn(value, form) → mensaje | null).
 * Mensajes en español neutro; cuando el backend ya tiene texto propio
 * (contraseña), se copia EXACTO para que la UI diga lo mismo que el API.
 * validate() aplica trim() a los strings antes de evaluar (igual que el
 * pre_load de BaseSchema en el backend), salvo para password.
 * ========================================================================== */

export const requerido = () => (value) => {
  const vacio = value === undefined
    || value === null
    || (typeof value === "string" && value.trim() === "")
    || (Array.isArray(value) && value.length === 0);
  return vacio ? "Este campo es requerido." : null;
};

export const longitud = (min, max) => (value) => {
  if (typeof value !== "string") return null;
  const n = value.length;
  if (min != null && max != null && (n < min || n > max)) {
    return `Debe tener entre ${min} y ${max} caracteres.`;
  }
  if (max != null && n > max) return `No puede superar ${max} caracteres.`;
  return null;
};

export const maximo = (max) => longitud(null, max);

/* Aproximación del fields.Email de marshmallow (formato bonito con @ y
 * dominio). Origen del máximo: cada schema del backend (254). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const correo = () => (value) => {
  if (typeof value !== "string" || value === "") return null;
  return EMAIL.test(value) ? null : "Ingresa un correo válido.";
};

/* Origen: backend/app/core/passwords.py — "Debe tener al menos 8
 * caracteres" y "No puede superar 72 bytes" (UTF-8). Textos EXACTOS del
 * backend para que el front diga lo mismo. */
export const contrasena = () => (value) => {
  if (typeof value !== "string" || value === "") return null;
  if (value.length < 8) return "Debe tener al menos 8 caracteres";
  if (new TextEncoder().encode(value).length > 72) return "No puede superar 72 bytes";
  return null;
};

/* Int entero ≥ min con strict=True del backend: acepta "5"/5, rechaza
 * decimales y valores menores al mínimo. Origen: positive_id() core/validation. */
export const entero = (min = 1) => (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    return `Debe ser un número entero mayor o igual a ${min}.`;
  }
  return null;
};

/* fields.Date → AAAA-MM-DD. */
export const fecha = () => (value) => {
  if (typeof value !== "string" || value === "") return null;
  const valido = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
  return valido ? null : "Ingresa una fecha válida (AAAA-MM-DD).";
};

/* fields.Time(format "%H:%M") → HH:MM 24h. */
export const hora = () => (value) => {
  if (typeof value !== "string" || value === "") return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? null : "Ingresa una hora válida (HH:MM).";
};

/* fields.List(positive_id(), min=n): array de ids enteros ≥1. */
export const listaDeEnteros = (min = 1) => (value) => {
  if (!Array.isArray(value)) return null;
  if (value.length < min) {
    return min === 1 ? "Agrega al menos un elemento." : `Agrega al menos ${min} elementos.`;
  }
  const validos = value.every((item) => {
    const number = Number(item);
    return Number.isInteger(number) && number >= 1;
  });
  return validos ? null : "Todos los elementos deben ser identificadores válidos.";
};
