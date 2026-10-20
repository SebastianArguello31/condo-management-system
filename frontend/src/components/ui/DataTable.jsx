/* Tabla de datos con estados integrados: loading → Skeleton, error →
 * ErrorState (con Reintentar), sin filas → EmptyState. caption oculta de
 * salida; th con scope; en <640px cada fila se apila en tarjeta con el
 * nombre de la columna (data-label). Columnas: { key, header,
 * headerClassName?, cellClassName?, render?(fila) }.
 */
import "./ui.css";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { Skeleton } from "./Loading";

export default function DataTable({
  columns,
  rows = [],
  rowKey,
  caption,
  loading = false,
  error = null,
  errorTitle = "No se pudieron cargar los datos",
  emptyTitle = "No hay registros",
  emptyDescription,
  emptyAction,
  onRetry,
  className = "",
}) {
  if (loading) {
    return <Skeleton lines={Math.min(Math.max(rows.length, 4), 8)} className={className} />;
  }

  if (error) {
    return (
      <ErrorState
        title={errorTitle}
        description={typeof error === "string" ? error : error?.message}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <table className={["ui-table", className].filter(Boolean).join(" ")}>
      <caption className="ui-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={column.headerClassName}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey ? rowKey(row) : row.id ?? row}>
            {columns.map((column) => (
              <td key={column.key} data-label={column.header} className={column.cellClassName}>
                {column.render ? column.render(row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
