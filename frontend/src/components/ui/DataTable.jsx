/* Tabla de datos con estados integrados: loading → Skeleton, error →
 * ErrorState (con Reintentar), sin filas → EmptyState. caption oculta de
 * salida; th con scope; en <640px cada fila se apila en tarjeta con el
 * nombre de la columna (data-label).
 * K5: columnas aceptan `align: "right"` → th y td con .ui-num (alineación a
 * la derecha + tabular-nums) para montos, códigos y fechas numéricas.
 * La tabla va DENTRO de un marco cerrado (.ui-table-shell): 1px de línea +
 * radio de panel + overflow hidden (sin sombras; en móvil el marco se
 * retira para no doblar los bordes de las tarjetas apiladas).
 * Columnas: { key, header, align?: "right" | "left", width?: string (token,
 * colgroup: ancho fijo de columna, p. ej. la de acciones), headerClassName?,
 * cellClassName?, render?(fila) }.
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

  const alignClass = (column) => (column.align === "right" ? "ui-num" : "");

  /* Opción aditiva de columna (ancho fijo con tokens): si alguna columna
   * define `width`, se emite un colgroup (evita que la celda de acciones y
   * su cabecera cambien de posición entre filas/estados). La pila móvil
   * (<640px) ignora el colgroup. */
  const conAncho = columns.some((column) => column.width);

  return (
    <div className="ui-table-shell">
      <table className={["ui-table", className].filter(Boolean).join(" ")}>
        <caption className="ui-visually-hidden">{caption}</caption>
        {conAncho && (
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width ?? "auto" }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[alignClass(column), column.headerClassName].filter(Boolean).join(" ") || undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey ? rowKey(row) : row.id ?? row}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.header}
                  className={[alignClass(column), column.cellClassName].filter(Boolean).join(" ") || undefined}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
