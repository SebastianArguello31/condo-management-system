import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";

export default function InterventionMaterials({
  intervention,
  items,
  canConsume,
  onStockChanged,
}) {
  const [consumptions, setConsumptions] = useState([]);
  const [idItem, setIdItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const endpoint = `${routes.maintenance}/intervenciones/${intervention.id_intervencion}/insumos`;

  function formatQuantity(value) {
    return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 3, useGrouping: false }).format(Number(value));
  }

  async function loadConsumptions() {
    setLoading(true);
    setError("");
    try {
      setConsumptions((await api(endpoint)) || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConsumptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervention.id_intervencion]);

  async function registerConsumption(event) {
    event.preventDefault();
    if (!idItem || !quantity || !reason.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(endpoint, {
        method: "POST",
        body: {
          id_insumo: Number(idItem),
          cantidad: quantity,
          motivo: reason.trim(),
        },
      });
      setIdItem("");
      setQuantity("");
      setReason("");
      setShowForm(false);
      setNotice("Consumo registrado y stock actualizado.");
      await loadConsumptions();
      await onStockChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-section">
      <h4>Insumos utilizados</h4>
      {error && <p className="mg-alert mg-alert-error" role="alert">{error}</p>}
      {notice && <p className="mg-alert mg-alert-success" role="status">{notice}</p>}
      {loading && <p>Cargando consumos...</p>}
      {!loading && consumptions.length === 0 && <p>No hay insumos registrados.</p>}
      {consumptions.length > 0 && (
        <ul>
          {consumptions.map((row) => (
            <li key={row.id_intervencion_insumos}>
              {row.insumo}: {formatQuantity(row.cantidad_utilizada)} {row.unidad_medida}
            </li>
          ))}
        </ul>
      )}

      {canConsume && (
        <>
          <button className="mg-secondary" type="button" onClick={() => setShowForm((visible) => !visible)}>
            {showForm ? "Cancelar consumo" : "Registrar insumo"}
          </button>
          {showForm && <form onSubmit={registerConsumption}>
          <fieldset disabled={busy || items.length === 0}>
            <label>Insumo
              <select required value={idItem} onChange={(event) => setIdItem(event.target.value)}>
                <option value="">Seleccionar...</option>
                {items.map((item) => (
                  <option key={item.id_insumo} value={item.id_insumo}>
                    {item.nombre} · Stock {formatQuantity(item.stock)} {item.unidad_medida}
                  </option>
                ))}
              </select>
            </label>
            <label>Cantidad
              <input required type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            <label>Motivo
              <input required minLength="3" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button className="mg-primary" disabled={busy || items.length === 0}>
              {busy ? "Registrando..." : "Registrar consumo"}
            </button>
            {items.length === 0 && <p>No hay insumos activos disponibles.</p>}
          </fieldset>
          </form>}
        </>
      )}
    </section>
  );
}
