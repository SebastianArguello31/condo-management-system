/* Cliente HTTP del frontend. Cambios CP6a (ADITIVOS, sin romper contratos):
 * - api() acepta `signal` opcional (AbortController) y la pasa a fetch.
 * - El Error lanzado conserva EXACTAMENTE el mismo message que antes (las
 *   pantallas lo muestran tal cual) y añade err.status (número) y
 *   err.errors (objeto campo → mensajes, cuando el backend lo envía con el
 *   formato de marshmallow: { error, errors } con HTTP 400).
 * - 401 → "session-expired" y el caso login siguen igual.
 */
import { API_BASE, routes } from "./routes";

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export async function api(
  path,
  { method = "GET", body, responseType = "json", signal } = {}
) {
  const requestToken = accessToken;
  const headers = {};
  const isFormData = body instanceof FormData;

  if (requestToken) {
    headers.Authorization = `Bearer ${requestToken}`;
  }

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && path !== `${routes.auth}/login` && requestToken === accessToken) {
      accessToken = null;
      window.dispatchEvent(new Event("session-expired"));
    }

    const details = data.errors
      ? Object.entries(data.errors)
          .map(([field, errors]) =>
            `${field}: ${
              Array.isArray(errors)
                ? errors.join(", ")
                : JSON.stringify(errors)
            }`
          )
          .join(" | ")
      : "";

    const error = new Error(
      [data.error || `Error HTTP ${response.status}`, details]
        .filter(Boolean)
        .join(". ")
    );
    error.status = response.status;
    if (data.errors && typeof data.errors === "object") {
      error.errors = data.errors;
    }
    throw error;
  }

  if (response.status === 204) return null;

  if (responseType === "blob") {
    return response.blob();
  }

  return response.json();
}
