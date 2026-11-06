/* Insumos — F2-10b (shell y listado al kit en F2-10a; "Nuevo/Editar
 * insumo" a FormModal en F2-10b). La pantalla mantiene el contrato
 * `({ user })` de la ruta #/insumos (roles ADMIN/TECNICO, sin cambios en
 * routing). Paridad conservada: GET /maintenance/insumos con filtros de
 * SERVIDOR buscar/categoria/bajo_stock (vacíos omitidos), el "Nuevo
 * insumo" solo para ADMIN, los payloads POST/PATCH del insumo intactos
 * (ahora en features/maintenance/InsumoFormModal.jsx: mismos campos y
 * endpoints; creación y edición solo para ADMIN, como las acciones de
 * fila que los disparan). Los modales de MOVIMIENTO e HISTORIAL siguen
 * LEGADOS con sus payloads (los patch/post salen líneas abajo tal
 * cual; F2-10c los migra). Cambios respecto al legado (F2-10a):
 * PageHeader sin eyebrow con meta mono de UNA línea "N insumos · M con
 * stock bajo" (la descripción larga NO va en el encabezado — la nota de
 * consumos vive SOLO en el EmptyState sin datos), FilterBar sin botón
 * "Filtrar" (Buscar aplica con Enter; Categoría y Stock bajo consultan
 * al cambiar; vacíos omitidos), "Actualizar" = reload() que conserva
 * datos previos (sin parpadeo), sembrado ?bajo_stock=true desde el hash
 * (nunca se escribe de vuelta), DataTable SIN columna ID, Existencia y
 * Stock mínimo alineadas a la derecha con formatQuantity y el plural
 * conservador de la unidad (helper de módulo formatQuantityUnit — NO
 * toca formatQuantity), Estado con StatusBadge override de módulo,
 * "Movimientos" renombrado a "Historial" y Entrada/Salida unificados en
 * "Registrar movimiento" (abre el modal legado con tipo ENTRADA por
 * defecto), éxito de acciones por Toast, carga con useQuery + signal
 * sin flash de Reintentar, EmptyState distinto para búsqueda/filtros y
 * para vacío real, y el catálogo de categorías en un ref acumulado
 * (ahora también alimenta el datalist del InsumoFormModal sin endpoint
 * nuevo): el select NO se reduce al filtrar. Cambios de F2-10b: el
 * modal de insumo ya no usa el error/busy compartidos de la pantalla
 * (el FormModal gestiona el suyo propio): el estado error/busy aquí
 * queda SOLO para movimiento/historial.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import Modal from "../../components/ui/Modal";
import InsumoFormModal from "./InsumoFormModal";
import {
  Button,
  Checkbox,
  DataTable,
  Field,
  FilterBar,
  PageHeader,
  RowActions,
  SearchInput,
  Select,
  StatusBadge,
  useToast,
} from "../../components/ui";

const EMPTY_MOVEMENT = { cantidad: "", motivo: "" };

const MOVEMENT_PATHS = {
  ENTRADA: "entradas",
  SALIDA: "salidas",
};

const MOVEMENT_LABELS = {
  INICIAL: "Existencias iniciales",
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE_ENTRADA: "Ajuste de entrada",
  AJUSTE_SALIDA: "Ajuste de salida",
  DEVOLUCION: "Devolución",
};

/* Override del Estado de módulo (convención §8-bis: nunca color solo). */
const ESTADO_INSUMO = {
  bajo: { estado: "Stock bajo", tone: "warning", glyph: "triangle" },
  disponible: { estado: "Disponible", tone: "success", glyph: "check" },
};

/* Plural conservador de la unidad: SOLO si es una palabra, minúsculas,
 * sin tildes y de ≥4 letras (además de mayúsculas/espacios/dígitos, la
 * de 0–3 letras —kg, m, lt, m2— queda tal cual por el patrón). Termina
 * en vocal → +"s"; en l/r/n/d → +"es"; cualquier otra abreviatura no se
 * toca. Singular solo con Number(valor) === 1 (pluralizador del valor,
 * no de la unidad). Firma y export de formatQuantity INTACTOS. */
const UNIDAD_PLURAL = /^[a-z]{4,}$/;

function unidadPlural(unidad) {
  const texto = String(unidad ?? "");
  if (!UNIDAD_PLURAL.test(texto)) return texto;
  const ultima = texto.charAt(texto.length - 1);
  if ("aeiou".includes(ultima)) return `${texto}s`;
  if ("lrnd".includes(ultima)) return `${texto}es`;
  return texto;
}

function formatQuantityUnit(value, unit) {
  const cantidad = Number(value);
  const unidad = cantidad === 1 ? unit : unidadPlural(unit);
  return `${formatQuantity(value)} ${unidad}`;
}

/* Estilo LOCAL de la pantalla (ajuste 1 de F2-10a; sin CSS de kit nuevo):
 * - .acciones-insumos envuelve por defecto (pila móvil <640px: las tarjetas
 *   apiladas no desbordan).
 * - En ≥640px los botones de fila NO parten su texto en 2 líneas (la
 *   columna tiene ancho de colgroup reservado) y su padding-inline baja a
 *   --space-2: con el --space-4 del kit, los 3 botones nowrap no caben en
 *   el ancho --space-12*7 y la fila pasaría del --row-h.
 * Solo tokens; nada de hex/px. */
const ESTILOS_PANTALLA = `
.acciones-insumos { flex-wrap: wrap; }
@media (min-width: 640px) {
  .acciones-insumos .ui-btn { white-space: nowrap; padding-inline: var(--space-2); }
}`;

/* Nota única del EmptyState sin datos (ajuste 1: la descripción larga
 * salió del encabezado; esta frase conserva la información). */
const NOTA_CONSUMOS =
  "Los consumos se registran desde las intervenciones de cada incidencia.";

function errorMessage(error) {
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatQuantity(value) {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 3, useGrouping: false }).format(Number(value));
}

export default function MaintenancePage({ user }) {
  const isAdmin = user.rol === "ADMIN";
  const notify = useToast();
  const { params } = useHashRoute();

  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [categoria, setCategoria] = useState("");
  const [bajoStock, setBajoStock] = useState(false);

  /* Sembrado de ?bajo_stock=true desde el hash (patrón F2-5a/F2-8a): se
   * aplica al entrar o al cambiar el hash estando en la pantalla, sin
   * escribir de vuelta; el usuario puede DESMARCAR libremente (el hash no
   * cambia, este efecto no vuelve a correr). */
  const bajoStockDesdeUrl = params.bajo_stock === "true";
  useEffect(() => {
    if (bajoStockDesdeUrl) setBajoStock(true);
  }, [bajoStockDesdeUrl]);

  /* Catálogo de categorías: se alimenta de TODAS las cargas exitosas
   * (sin endpoint nuevo) para que el select no se reduzca al elegir una
   * categoría; se actualiza solo cuando crece de verdad. */
  const catalogoRef = useRef(new Set());
  const [categorias, setCategorias] = useState([]);

  /* Misma consulta que el loadItems() anterior: GET /insumos con los
   * mismos params de servidor (buscar/categoria/bajo_stock, vacíos
   * omitidos). Los cambios de filtro relanzan la consulta (deps = clave
   * de filtros) y reload() conserva datos previos (Lista sin titilar). */
  const claveFiltros = `${busquedaAplicada.trim()}|${categoria}|${bajoStock}`;
  const { data, loading, error: errorCarga, reload } = useQuery(async (signal) => {
    const filtros = new URLSearchParams();
    if (busquedaAplicada.trim()) filtros.set("buscar", busquedaAplicada.trim());
    if (categoria) filtros.set("categoria", categoria);
    if (bajoStock) filtros.set("bajo_stock", "true");

    const query = filtros.toString();
    const filas = (await api(`${routes.maintenance}/insumos${query ? `?${query}` : ""}`, { signal })) ?? [];

    let catalogoCrece = false;
    for (const fila of filas) {
      if (fila.categoria && !catalogoRef.current.has(fila.categoria)) {
        catalogoRef.current.add(fila.categoria);
        catalogoCrece = true;
      }
    }
    if (catalogoCrece) setCategorias([...catalogoRef.current].sort());

    return filas;
  }, [claveFiltros]);

  const items = data ?? [];

  /* Estados compartidos SOLO del modal de MOVIMIENTO e HISTORIAL (F2-10c
   * los migra): sin cambios respecto al legado. El modal de insumo
   * (InsumoFormModal) gestiona SU error y busy por dentro del FormModal
   * y usa `selectedItem`/`modal` de esta pantalla para abrirse. */
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [movementType, setMovementType] = useState("ENTRADA");
  const [history, setHistory] = useState([]);
  const [historyType, setHistoryType] = useState("");

  function openCreate() {
    setSelectedItem(null);
    setModal("item");
  }

  function openEdit(item) {
    setSelectedItem(item);
    setModal("item");
  }

  function openMovement(item, type) {
    setSelectedItem(item);
    setMovementType(type);
    setMovementForm(EMPTY_MOVEMENT);
    setError("");
    setModal("movement");
  }

  async function saveMovement(event) {
    event.preventDefault();
    if (!selectedItem || !MOVEMENT_PATHS[movementType]) return;

    setBusy(true);
    setError("");

    const body = {
      cantidad: movementForm.cantidad,
      motivo: movementForm.motivo.trim(),
    };

    try {
      await api(
        `${routes.maintenance}/insumos/${selectedItem.id_insumo}/${MOVEMENT_PATHS[movementType]}`,
        { method: "POST", body },
      );
      setModal(null);
      notify("Movimiento registrado y stock actualizado.");
      await reload();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory(item, type = historyType) {
    setBusy(true);
    setError("");
    const paramsMovimientos = new URLSearchParams();
    if (type) paramsMovimientos.set("tipo", type);

    try {
      const suffix = paramsMovimientos.toString() ? `?${paramsMovimientos.toString()}` : "";
      const result = await api(
        `${routes.maintenance}/insumos/${item.id_insumo}/movimientos${suffix}`,
      );
      setHistory(result || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function openHistory(item) {
    setSelectedItem(item);
    setHistoryType("");
    setHistory([]);
    setModal("history");
    loadHistory(item, "");
  }

  const hayFiltros = Boolean(busquedaAplicada.trim() || categoria || bajoStock);
  const vacioReal = !loading && !hayFiltros && items.length === 0;
  const conStockBajo = items.filter((item) => item.bajo_stock).length;
  const meta =
    !loading && items.length > 0
      ? `${items.length} ${items.length === 1 ? "insumo" : "insumos"} · ${conStockBajo} con stock bajo`
      : undefined;

  const triggerNuevo = isAdmin ? (
    <Button onClick={openCreate}>Nuevo insumo</Button>
  ) : null;

  const columns = [
    {
      key: "insumo",
      header: "Insumo",
      render: (row) => (
        <>
          {row.nombre}
          {row.descripcion ? (
            <span style={{ display: "block" }}>{row.descripcion}</span>
          ) : null}
        </>
      ),
    },
    { key: "categoria", header: "Categoría" },
    {
      key: "stock",
      header: "Existencia",
      align: "right",
      width: "calc(var(--space-12) * 3)",
      render: (row) => formatQuantityUnit(row.stock, row.unidad_medida),
    },
    {
      key: "stock_minimo",
      header: "Stock mínimo",
      align: "right",
      width: "calc(var(--space-12) * 3)",
      render: (row) => formatQuantityUnit(row.stock_minimo, row.unidad_medida),
    },
    {
      key: "estado",
      header: "Estado",
      width: "calc(var(--space-12) * 3)",
      render: (row) => {
        const badge = row.bajo_stock ? ESTADO_INSUMO.bajo : ESTADO_INSUMO.disponible;
        return <StatusBadge estado={badge.estado} tone={badge.tone} glyph={badge.glyph} />;
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      width: "calc(var(--space-12) * 7)",
      render: (row) => (
        <RowActions
          className="acciones-insumos"
          actions={[
            {
              label: "Historial",
              ariaLabel: `Historial de movimientos del insumo ${row.nombre}`,
              onSelect: () => openHistory(row),
            },
            ...(isAdmin
              ? [
                  {
                    label: "Editar",
                    ariaLabel: `Editar insumo ${row.nombre}`,
                    onSelect: () => openEdit(row),
                  },
                  {
                    label: "Registrar movimiento",
                    ariaLabel: `Registrar movimiento del insumo ${row.nombre}`,
                    onSelect: () => openMovement(row, "ENTRADA"),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <section>
      <style>{ESTILOS_PANTALLA}</style>
      <PageHeader
        title="Insumos"
        meta={meta}
        actions={vacioReal ? null : triggerNuevo}
      />

      <FilterBar>
        <SearchInput
          label="Buscar insumo"
          value={busqueda}
          onChange={setBusqueda}
          onClear={() => setBusqueda("")}
          placeholder="Nombre o descripción"
          onKeyDown={(event) => {
            if (event.key === "Enter") setBusquedaAplicada(busqueda);
          }}
        />
        <Field label="Categoría">
          <Select value={categoria} onChange={(event) => setCategoria(event.target.value)}>
            <option value="">Todas</option>
            {categorias.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
        {/* Ajuste 1 de F2-10a: el checkbox standalone quedaba ~9px más bajo
         * y sin etiqueta superior; se envuelve en Field como los demás
         * (etiqueta arriba + control alineado a la altura del kit
         * --control-h, centrado). Sin aria-label: el Field ya nombra el
         * control (lección F2-5c). */}
        <Field label="Stock bajo">
          <div style={{ display: "flex", alignItems: "center", height: "var(--control-h)" }}>
            <Checkbox
              checked={bajoStock}
              onChange={(event) => setBajoStock(event.target.checked)}
            />
          </div>
        </Field>
        <Button variant="quiet" disabled={loading} onClick={reload}>
          Actualizar
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(row) => row.id_insumo}
        caption="Listado de insumos"
        loading={loading}
        error={errorCarga}
        onRetry={reload}
        emptyTitle={hayFiltros ? "No hay insumos que coincidan." : "No hay insumos"}
        emptyDescription={hayFiltros ? "Ajusta la búsqueda o los filtros para ver resultados." : NOTA_CONSUMOS}
        emptyAction={vacioReal ? triggerNuevo : undefined}
      />

      {modal === "item" && (
        <InsumoFormModal
          insumo={selectedItem}
          categorias={categorias}
          onClose={() => setModal(null)}
          onGuardado={reload}
        />
      )}

      {modal === "movement" && selectedItem && (
        <Modal title={`Movimiento · ${selectedItem.nombre}`} busy={busy} onClose={() => setModal(null)}>
          <form onSubmit={saveMovement}>
            <div className="mg-form-body">
              {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
              <div className="mg-form-grid">
                <label className="mg-full-field">Tipo de movimiento
                  <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                  </select>
                </label>
                <label>Cantidad *<input required type="number" min="0.001" step="any" value={movementForm.cantidad} onChange={(event) => setMovementForm({ ...movementForm, cantidad: event.target.value })} /></label>
                <label className="mg-full-field">Motivo *<textarea required minLength="3" maxLength="500" rows="3" value={movementForm.motivo} onChange={(event) => setMovementForm({ ...movementForm, motivo: event.target.value })} /></label>
              </div>
            </div>
            <div className="mg-modal-actions">
              <button className="mg-primary" disabled={busy}>{busy ? "Procesando..." : "Registrar movimiento"}</button>
              <button className="mg-secondary" type="button" disabled={busy} onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "history" && selectedItem && (
        <Modal title={`Movimientos · ${selectedItem.nombre}`} busy={busy} onClose={() => setModal(null)}>
          <div className="mg-form-body">
            {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
            <label>Filtrar por tipo
              <select value={historyType} onChange={(event) => {
                const value = event.target.value;
                setHistoryType(value);
                loadHistory(selectedItem, value);
              }}>
                <option value="">Todos</option>
                {Object.entries(MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {busy && <p>Cargando movimientos...</p>}
            {!busy && history.length === 0 && <p>No hay movimientos para mostrar.</p>}
            <ul>
              {history.map((movement) => (
                <li key={movement.id_movimiento}>
                  {formatDate(movement.fecha)} · {MOVEMENT_LABELS[movement.tipo] || movement.tipo} · {formatQuantity(movement.cantidad)} · Stock: {formatQuantity(movement.stock_resultante)} · {movement.motivo} · {movement.responsable_nombre} {movement.responsable_apellido}
                  {movement.id_intervencion ? ` · Intervención #${movement.id_intervencion}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </section>
  );
}
