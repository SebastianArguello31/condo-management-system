/* Sección tipo "ficha": título (y acciones) a la izquierda, contenido a la
 * derecha, separada por regla horizontal de 1px. Una columna en móvil.
 */
import "./ui.css";

export default function Section({ title, actions, children, className = "" }) {
  return (
    <section className={["ui-section", className].filter(Boolean).join(" ")}>
      {title && (
        <div>
          <h2 className="ui-section-title">{title}</h2>
          {actions && <div className="ui-section-actions">{actions}</div>}
        </div>
      )}
      <div className="ui-section-body">{children}</div>
    </section>
  );
}
