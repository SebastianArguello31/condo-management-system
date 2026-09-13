let accessToken = null;

export function setAccessToken(token) {accessToken = token;}

export async function api(
  path,
  { method = "GET", body, responseType = "json" } = {}
) {
  const headers = {};
  const isFormData = body instanceof FormData;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/condominio${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && path !== "/auth/login") {
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

    throw new Error(
      [data.error || `Error HTTP ${response.status}`, details]
        .filter(Boolean)
        .join(". ")
    );
  }

  if (response.status === 204) return null;

  if (responseType === "blob") {
    return response.blob();
  }

  return response.json();
}

export async function downloadAttachment(id, filename) {
  const blob = await api(`/incidents/attachments/${id}`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "adjunto";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
