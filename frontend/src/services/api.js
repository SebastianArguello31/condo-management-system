import { API_BASE, routes } from "./routes";

const SESSION_KEY = "condominio.accessToken";

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

let accessToken = readStoredToken();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;

  try {
    if (accessToken) {
      window.sessionStorage.setItem(SESSION_KEY, accessToken);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Si el almacenamiento está bloqueado, continúa en memoria.
  }
}

export async function api(
  path,
  {
    method = "GET",
    body,
    responseType = "json",
    signal,
  } = {}
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

    if (
      response.status === 401 &&
      path !== `${routes.auth}/login` &&
      requestToken === accessToken
    ) {
      setAccessToken(null);
      window.dispatchEvent(new Event("session-expired"));
    }

    const details = data.errors
      ? Object.entries(data.errors)
          .map(([field, errors]) => (
            `${field}: ${
              Array.isArray(errors)
                ? errors.join(", ")
                : JSON.stringify(errors)
            }`
          ))
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