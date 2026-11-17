/* Cabecera de página: título + UNA línea de metadatos opcional (mono) +
 * acciones a la derecha. Sin eyebrow ni breadcrumbs duplicados.
 */
import "./ui.css";

export default function PageHeader({ title, meta, actions, className = "" }) {
  return (
    <header className={["ui-page-header", className].filter(Boolean).join(" ")}>
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {meta && <p className="ui-page-meta">{meta}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}
