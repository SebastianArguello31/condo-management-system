/* Insumos — F2-10a (shell y listado al kit). La pantalla mantiene el
 * contrato `({ user })` de la ruta #/insumos (roles ADMIN/TECNICO, sin
 * cambios en routing). Paridad conservada: GET /maintenance/insumos con
 * filtros de SERVIDOR buscar/categoria/bajo_stock (vacíos omitidos), el
 * "Nuevo insumo" solo para ADMIN, los TRES modales legados (insumo,
 * movimiento e historial) intactos con sus payloads (los patch/post
 * salen líneas abajo tal cual; F2-10b/F2-10c los migran). Cambia:
 * PageHeader sin eyebrow con meta mono de UNA línea "N insumos · M con
 * stock bajo" (misma semántica que las tarjetas: cuenta de la lista
 * cargada; la descripción larga NO va en el encabezado — la nota de
 * consumos vive SOLO en el EmptyState sin datos), las 2 tarjetas .mg-stat
 * ELIMINADAS, FilterBar sin botón "Filtrar" (Buscar aplica con Enter;
 * Categoría y Stock bajo consultan al cambiar; vacíos omitidos), "Actualizar" = reload() que conserva datos previos (sin
 * parpadeo), sembrado ?bajo_stock=true desde el hash (nunca se escribe
 * de vuelta), DataTable SIN columna ID (rowKey id_insumo), Existencia y
 * Stock mínimo alineadas a la derecha con formatQuantity y el plural
 * conservador de la unidad (helper de módulo formatQuantityUnit — NO
 * toca formatQuantity), Estado con StatusBadge override de módulo,
 * "Movimientos" renombrado a "Historial" y Entrada/Salida unificados en
 * "Registrar movimiento" (abre el modal legado con tipo ENTRADA por
 * defecto; los tipos siguen siendo Entrada/Salida), éxito de acciones
 * por Toast (el error sigue siendo el estado `error` único del legado,
 * que los 3 modales muestran DENTRO), carga con useQuery + signal sin
 * flash de Reintentar, EmptyState distinto para búsqueda/filtros y para
 * vacío real, y el catálogo de categorías se conserva en un ref
 * acumulado de cada carga exitosa: el select NO se reduce al filtrar.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import Modal from "../../components/ui/Modal";
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

const EMPTY_ITEM = {
  nombre: "",
  descripcion: "",
  categoria: "",
  unidad_medida: "",
  stock_minimo: "0",
  costo_unitario: "0",
};

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

  /* Estados de los TRES modales legados (insumo, movimiento, historial):
   * sin cambios respecto al legado. */ 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [movementType, setMovementType] = useState("ENTRADA");
  const [history, setHistory] = useState([]);
  const [historyType, setHistoryType] = useState("");

  function openCreate() {
    setSelectedItem(null);
    setItemForm(EMPTY_ITEM);
    setError("");
    setModal("item");
  }

  function openEdit(item) {
    setSelectedItem(item);
    setItemForm({
      nombre: item.nombre ?? "",
      descripcion: item.descripcion ?? "",
      categoria: item.categoria ?? "",
      unidad_medida: item.unidad_medida ?? "",
      stock_minimo: String(item.stock_minimo ?? 0),
      costo_unitario: String(item.costo_unitario ?? 0),
    });
    setError("");
    setModal("item");
  }

  async function saveItem(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const body = {
      ...itemForm,
      nombre: itemForm.nombre.trim(),
      descripcion: itemForm.descripcion.trim() || null,
      categoria: itemForm.categoria.trim(),
      unidad_medida: itemForm.unidad_medida.trim(),
    };

    try {
      await api(
        selectedItem
          ? `${routes.maintenance}/insumos/${selectedItem.id_insumo}`
          : `${routes.maintenance}/insumos`,
        { method: selectedItem ? "PATCH" : "POST", body },
      );
      setModal(null);
      notify(selectedItem ? "Insumo actualizado." : "Insumo creado.");
      await reload();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
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
        <Modal title={selectedItem ? "Editar insumo" : "Nuevo insumo"} busy={busy} onClose={() => setModal(null)}>
          <form onSubmit={saveItem}>
            <div className="mg-form-body">
              {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
              <div className="mg-form-grid">
                <label>Nombre *<input required maxLength="150" value={itemForm.nombre} onChange={(event) => setItemForm({ ...itemForm, nombre: event.target.value })} /></label>
                <label>Categoría *<input required maxLength="80" value={itemForm.categoria} onChange={(event) => setItemForm({ ...itemForm, categoria: event.target.value })} /></label>
                <label>Unidad de medida *<input required maxLength="40" value={itemForm.unidad_medida} onChange={(event) => setItemForm({ ...itemForm, unidad_medida: event.target.value })} /></label>
                <label>Stock mínimo *<input required type="number" min="0" step="0.001" value={itemForm.stock_minimo} onChange={(event) => setItemForm({ ...itemForm, stock_minimo: event.target.value })} /></label>
                <label>Costo unitario<input type="number" min="0" step="0.01" value={itemForm.costo_unitario} onChange={(event) => setItemForm({ ...itemForm, costo_unitario: event.target.value })} /></label>
                <label className="mg-full-field">Descripción<textarea maxLength="2000" rows="3" value={itemForm.descripcion} onChange={(event) => setItemForm({ ...itemForm, descripcion: event.target.value })} /></label>
              </div>
            </div>
            <div className="mg-modal-actions">
              <button className="mg-primary" disabled={busy}>{busy ? "Guardando..." : "Guardar"}</button>
              <button className="mg-secondary" type="button" disabled={busy} onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </Modal>
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
