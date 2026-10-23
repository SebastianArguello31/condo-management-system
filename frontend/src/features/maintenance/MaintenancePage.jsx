import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Modal from "../../components/ui/Modal";

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
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", lowStock: false });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT);
  const [movementType, setMovementType] = useState("ENTRADA");
  const [history, setHistory] = useState([]);
  const [historyType, setHistoryType] = useState("");

  const loadItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (appliedFilters.search.trim()) params.set("buscar", appliedFilters.search.trim());
    if (appliedFilters.category) params.set("categoria", appliedFilters.category);
    if (appliedFilters.lowStock) params.set("bajo_stock", "true");

    const query = params.toString();
    const result = await api(
      `${routes.maintenance}/insumos${query ? `?${query}` : ""}`,
    );
    setItems(result || []);
  }, [appliedFilters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    loadItems()
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadItems]);

  async function refreshItems() {
    setLoading(true);
    setError("");
    try {
      await loadItems();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

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
    setNotice("");

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
      setNotice(selectedItem ? "Insumo actualizado." : "Insumo creado.");
      await loadItems();
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
    setNotice("");

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
      setNotice("Movimiento registrado y stock actualizado.");
      await loadItems();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory(item, type = historyType) {
    setBusy(true);
    setError("");
    const params = new URLSearchParams();
    if (type) params.set("tipo", type);

    try {
      const suffix = params.toString() ? `?${params.toString()}` : "";
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

  const categories = [...new Set(items.map((item) => item.categoria))]
    .filter(Boolean)
    .sort();
  const lowStockCount = items.filter((item) => item.bajo_stock).length;

  return (
    <section className="management-page">
      <div className="mg-page-heading">
        <div>
          <p className="mg-eyebrow">MANTENIMIENTO</p>
          <h1>Insumos</h1>
          <p>Consulta las existencias y su historial. Registra movimientos y consumos desde las intervenciones.</p>
        </div>
        {isAdmin && (
          <button className="mg-primary" type="button" onClick={openCreate}>
            Nuevo insumo
          </button>
        )}
      </div>

      {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
      {notice && <p className="mg-alert mg-alert-success" role="status">{notice}</p>}

      <div className="mg-stats">
        <article className="mg-stat"><div><span>Insumos encontrados</span><strong>{items.length}</strong></div></article>
        <article className="mg-stat"><div><span>Con stock bajo</span><strong>{lowStockCount}</strong></div></article>
      </div>

      <div className="mg-panel">
        <form
          className="mg-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedFilters(filters);
          }}
        >
          <label className="mg-search">
            Buscar
            <input
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Nombre o descripción"
            />
          </label>
          <div className="mg-filters">
            <label>
              Categoría
              <select
                value={filters.category}
                onChange={(event) => setFilters({ ...filters, category: event.target.value })}
              >
                <option value="">Todas</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="mg-check-field">
              Stock bajo
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(event) => setFilters({ ...filters, lowStock: event.target.checked })}
              />
            </label>
            <button className="mg-primary" type="submit">Filtrar</button>
            <button className="mg-secondary" type="button" disabled={loading} onClick={refreshItems}>
              Actualizar
            </button>
          </div>
        </form>

        <div className="mg-table-scroll">
          <table className="mg-table">
            <thead>
              <tr>
                <th>Insumo</th><th>Categoría</th><th>Existencia</th>
                <th>Stock mínimo</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id_insumo}>
                  <td>
                    <strong>{item.nombre}</strong>
                    {item.descripcion && <span className="mg-description">{item.descripcion}</span>}
                  </td>
                  <td>{item.categoria}</td>
                  <td>{formatQuantity(item.stock)} {item.unidad_medida}</td>
                  <td>{formatQuantity(item.stock_minimo)} {item.unidad_medida}</td>
                  <td>
                    <span className={`mg-status ${item.bajo_stock ? "is-inactive" : "is-active"}`}>
                      <i />{item.bajo_stock ? "Stock bajo" : "Disponible"}
                    </span>
                  </td>
                  <td>
                    <div className="mg-row-actions">
                      <button className="mg-secondary" type="button" onClick={() => openHistory(item)}>
                        Movimientos
                      </button>
                      {isAdmin && <>
                        <button className="mg-secondary" type="button" onClick={() => openEdit(item)}>Editar</button>
                        <button className="mg-secondary" type="button" onClick={() => openMovement(item, "ENTRADA")}>Entrada</button>
                        <button className="mg-secondary" type="button" onClick={() => openMovement(item, "SALIDA")}>Salida</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="6">Cargando insumos...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="6">No hay insumos que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

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
                <label>Cantidad *<input required type="number" min="0.001" step="0.001" value={movementForm.cantidad} onChange={(event) => setMovementForm({ ...movementForm, cantidad: event.target.value })} /></label>
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
