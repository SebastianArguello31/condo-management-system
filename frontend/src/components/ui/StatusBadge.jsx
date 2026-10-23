/* Insignia de estado: glifo de forma propia + texto (nunca solo color).
 * K3: presets alineados a los estados REALES del backend:
 * - incidencias (backend/app/modules/incidents/rules.py:4-12): RECIBIDA,
 *   EN_REVISION, ASIGNADA, EN_PROCESO, EN_ESPERA, RESUELTA, CERRADA,
 *   RECHAZADA, CANCELADA;
 * - reservas (backend/app/modules/reservations/rules.py:7-8): PENDIENTE,
 *   CONFIRMADA, RECHAZADA, CANCELADA.
 * La presentación normaliza guiones bajos a espacios ("EN_PROCESO" →
 * "EN PROCESO"). tone y glyph se deducen del preset; aceptan override para
 * estados fuera de estos módulos. glifos: dot, ring, square, diamond,
 * triangle. tone: neutral | info | success | warning | danger | muted.
 */
import "./ui.css";

const PRESETS = {
  recibida: { tone: "info", glyph: "ring" },
  "en-revision": { tone: "info", glyph: "ring" },
  asignada: { tone: "info", glyph: "dot" },
  "en-proceso": { tone: "warning", glyph: "triangle" },
  "en-espera": { tone: "warning", glyph: "ring" },
  pendiente: { tone: "warning", glyph: "ring" },
  confirmada: { tone: "success", glyph: "square" },
  resuelta: { tone: "success", glyph: "square" },
  rechazada: { tone: "danger", glyph: "diamond" },
  cancelada: { tone: "neutral", glyph: "dot" },
  cerrada: { tone: "neutral", glyph: "dot" },
};

const NORMALIZE = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
const DISPLAY = (value) => String(value ?? "").trim().replace(/_/g, " ");

export default function StatusBadge({ estado, tone, glyph, className = "" }) {
  const preset = PRESETS[NORMALIZE(estado)] ?? { tone: "neutral", glyph: "dot" };
  const activeTone = tone ?? preset.tone;
  const activeGlyph = glyph ?? preset.glyph;

  return (
    <span className={["ui-status", `ui-status-${activeTone}`, className].filter(Boolean).join(" ")}>
      <span className={`ui-status-glyph ui-status-${activeGlyph}`} aria-hidden="true" />
      <span>{DISPLAY(estado)}</span>
    </span>
  );
}

export { PRESETS as STATUS_PRESETS, NORMALIZE as normalizeStatus };
