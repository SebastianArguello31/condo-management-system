/* Descarga de adjuntos: pide el blob con api() y dispara la descarga.
 * Movido desde services/api.js (solo se cambió de lugar; el comportamiento
 * es idéntico). Importar desde aquí, no desde services/api. */
import { api } from "../services/api";
import { routes } from "../services/routes";

export async function downloadAttachment(id, filename) {
  const blob = await api(`${routes.incidents}/attachments/${id}`, {
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
