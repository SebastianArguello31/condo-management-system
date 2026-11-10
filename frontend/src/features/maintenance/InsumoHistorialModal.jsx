/* Historial de movimientos del insumo con filtro por tipo en el servidor.
 * Acumula los tipos recibidos para conservar las opciones al filtrar. */
import { useRef, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { formatDateTime } from "../../utils/format";
import { Button, ErrorState, Field, Modal, Select, Skeleton, Timeline, } from "../../components/ui";
import { formatQuantity, formatQuantityUnit } from "./quantity";

/* Etiquetas históricas de los tipos que puede traer el historial
 * (iguales a las del legado; NO se eliminan aunque un flujo ya no
 * genere el tipo). Estaba en MaintenancePage (F2-10a) y se mueve acá
 * con el filtro (único consumidor). El fallback al código cubre tipos
 * futuros sin mapear. */
const MOVEMENT_LABELS = {
  INICIAL: "Existencias iniciales",
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SALIDA: "Ajuste de salida",
  DEVOLUCION: "Devolución",
};

export default function InsumoHistorialModal({ insumo, onClose }) {
  const [tipo, setTipo] = useState("");
  /* Tipos de movimiento PRESENTES en los datos de este insumo: catálogo
   * de filtro derivado de las cargas (la primera va sin filtrar) — ref
   * + estado que solo CRECE, como el catálogo de categorías del listado
   * (F2-10a), para que el Select no se reduzca al elegir un tipo. Sin
   * movimientos no hay filtro (solo el vacío explícito). */
  const tiposRef = useRef(new Set());
  const [tipos, setTipos] = useState([]);

  /* Idéntico al loadHistory() del legado: SOLO el param `tipo` (el
   * endpoint también acepta desde/hasta/id_intervencion, que el UI no
   * ofrecía; la decisión de re-fetchear usa el filtro en deps para
   * cambiarlo de servidor en servidor). */
  const { data, loading, error: errorCarga, reload,} = useQuery(async (signal) => {
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const movimientos =
      (await api(
        `${routes.maintenance}/insumos/${insumo.id_insumo}/movimientos${suffix}`,
        { signal },
      )) ?? [];

    let crece = false;
    for (const movimiento of movimientos) {
      if (movimiento.tipo && !tiposRef.current.has(movimiento.tipo)) {
        tiposRef.current.add(movimiento.tipo);
        crece = true;
      }
    }
    if (crece) {
      /* Orden estable de MOVEMENT_LABELS primero; tipos futuros sin
       * mapear quedan al final (el option muestra el código). */
      setTipos([
        ...Object.keys(MOVEMENT_LABELS).filter((value) =>
          tiposRef.current.has(value)
        ),
        ...[...tiposRef.current].filter(
          (value) => !(value in MOVEMENT_LABELS)
        ),
      ]);
    }

    return movimientos;
  }, [insumo.id_insumo, tipo]);

  const movimientos = data ?? [];
  const hayMovimientos = tipos.length > 0;

  return (
    <Modal
      title={`Movimientos · ${insumo.nombre}`}
      onClose={onClose}
      footer={<Button variant="quiet" onClick={onClose}>Cerrar</Button>}
    >
      {/* Filtro SOLO si el insumo tiene movimientos (tipos derivados de
       * las cargas, ref acumulado); sin movimientos no se muestra. */}
      {hayMovimientos && (
        <Field label="Filtrar por tipo">
          <Select
            name="tipo"
            autoComplete="off"
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_LABELS[value] ?? value}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Skeleton/ErrorState SOLO sin datos: los reload conservan lo previo
       * montado (useQuery) para no perder la lectura en curso. */}
      {loading && !data && <Skeleton lines={6} />}
      {!loading && errorCarga && !data && (
        <ErrorState
          title="No se pudieron cargar los movimientos"
          description={errorCarga.message}
          onRetry={reload}
        />
      )}

      {data && movimientos.length === 0 && (
        <p style={{ margin: "var(--space-3) 0 0", color: "var(--ink-2)" }}>
          {tipo ? "Sin movimientos de este tipo." : "Sin movimientos registrados."}
        </p>
      )}

      {data && movimientos.length > 0 && (
        <Timeline entries={movimientos.map((movement) => {
          const responsable =
            `${movement.responsable_nombre ?? ""} ${movement.responsable_apellido ?? ""}`.trim();
          const detalle = [
            movement.motivo,
            responsable || undefined,
            movement.id_intervencion
              ? `Intervención #${movement.id_intervencion}`
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ");
          return {
            id: movement.id_movimiento,
            time: formatDateTime(movement.fecha),
            title: MOVEMENT_LABELS[movement.tipo] || movement.tipo,
            meta:
              `${formatQuantityUnit(movement.cantidad, insumo.unidad_medida)}` +
              ` · Stock resultante: ${formatQuantity(movement.stock_resultante)}`,
            detail: detalle || undefined,
          };
        })} />
      )}
    </Modal>
  );
}
