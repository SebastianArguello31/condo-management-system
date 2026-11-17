/* Lista de definiciones de pares término/detalle. items: [{ term, detail }].
 * columns: 1 (radio por defecto) o 2.
 */
import "./ui.css";

export default function DefinitionList({ items, columns = 1, className = "" }) {
  return (
    <dl className={["ui-dl", columns === 2 ? "ui-dl-2" : "", className].filter(Boolean).join(" ")}>
      {items.map((item, index) => (
        <div key={item.term ?? index} className="ui-dl-row">
          <dt>{item.term}</dt>
          <dd>{item.detail !== undefined ? item.detail : item.children}</dd>
        </div>
      ))}
    </dl>
  );
}
