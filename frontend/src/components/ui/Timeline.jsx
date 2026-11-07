/* Timeline "bitácora": línea vertical de 1px, marcas con tono opcional,
 * marca de tiempo en mono, título, meta (estado/autor) y detalle.
 * entries: [{ id?, time, title, meta?, detail?, tone? }]
 * tone: info | success | warning | danger | brand | (ninguno → neutro)
 */
import "./ui.css";

export default function Timeline({ entries, className = "" }) {
  return (
    <ol className={["ui-timeline", className].filter(Boolean).join(" ")}>
      {entries.map((entry, index) => (
        <li key={entry.id ?? index} className="ui-timeline-entry">
          <span
            className={entry.tone ? `ui-timeline-dot ui-timeline-dot-${entry.tone}` : "ui-timeline-dot"}
            aria-hidden="true"
          />
          <p className="ui-timeline-time">{entry.time}</p>
          <p className="ui-timeline-title">{entry.title}</p>
          {entry.meta && <p className="ui-timeline-meta">{entry.meta}</p>}
          {entry.detail && <div className="ui-timeline-detail">{entry.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
