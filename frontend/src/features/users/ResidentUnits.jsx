import { useEffect, useState } from "react";

import { api } from "../../services/api";

export default function ResidentUnits({ user, onClose }) {
  const [units, setUnits] = useState([]);
  const [linked, setLinked] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const endpoint = `/users/${user.id_usuario}/units`;

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const [allUnits, assignedUnits] = await Promise.all([
          api("/units"),
          api(endpoint),
        ]);

        if (cancelled) return;

        setUnits(allUnits);
        setLinked(assignedUnits);
        setReady(true);
      } catch (error) {
        if (!cancelled) setError(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const availableUnits = units.filter(
    (unit) =>
      !linked.some((assigned) => assigned.id_unidad === unit.id_unidad)
  );

  async function reloadLinks() {
    try {
      setLinked(await api(endpoint));
    } catch (error) {
      // Evita continuar operando con una lista desactualizada.
      setReady(false);
      setError(
        `La operación se guardó, pero no se pudo actualizar la lista. ` +
        `Cierra y vuelve a abrir este panel. ${error.message}`
      );
    }
  }

  async function link(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api(endpoint, {
        method: "POST",
        body: { id_unidad: Number(unitId) },
      });

      setUnitId("");
      setNotice("Unidad vinculada.");
      await reloadLinks();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function unlink(unit) {
    const confirmed = window.confirm(
      `¿Desvincular ${unit.edificio} · ${unit.codigo}?`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api(`${endpoint}/${unit.id_unidad}`, {
        method: "DELETE",
      });

      setNotice("Unidad desvinculada.");
      await reloadLinks();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-label="Unidades del residente">
      <div className="actions">
        <h2>
          Unidades de {user.nombre} {user.apellido}
        </h2>

        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <p>{user.email}</p>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}

      {loading ? (
        <p>Cargando unidades...</p>
      ) : (
        <>
          {!user.activo && (
            <p>
              Este residente está desactivado. Puedes retirar vínculos,
              pero debes activarlo para añadir nuevas unidades.
            </p>
          )}

          <form onSubmit={link}>
            <fieldset disabled={busy || !ready || !user.activo}>
              <div className="form-grid">
                <label>
                  Unidad disponible
                  <select
                    required
                    value={unitId}
                    onChange={(event) => setUnitId(event.target.value)}
                  >
                    <option value="">Seleccionar...</option>

                    {availableUnits.map((unit) => (
                      <option
                        key={unit.id_unidad}
                        value={unit.id_unidad}
                      >
                        {unit.edificio} · {unit.codigo}
                        {unit.piso ? ` · Piso ${unit.piso}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={!unitId || availableUnits.length === 0}
              >
                Vincular unidad
              </button>
            </fieldset>
          </form>

          {ready && availableUnits.length === 0 && (
            <p>No hay otras unidades disponibles para vincular.</p>
          )}

          <h3>Unidades vinculadas</h3>

          {ready && linked.length === 0 && (
            <p>Este residente todavía no tiene unidades vinculadas.</p>
          )}

          <ul>
            {linked.map((unit) => (
              <li key={unit.id_residente} style={{ marginBottom: 12 }}>
                <div className="actions">
                  <span>
                    {unit.edificio} · {unit.codigo} · {unit.tipo_unidad}
                  </span>

                  <button
                    type="button"
                    className="danger"
                    disabled={busy || !ready}
                    onClick={() => unlink(unit)}
                  >
                    Desvincular
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}