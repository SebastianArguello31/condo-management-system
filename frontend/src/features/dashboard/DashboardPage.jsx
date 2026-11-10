import { useCallback, useEffect, useRef, useState, } from "react";

import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { formatDate, formatDateTime } from "../../utils/format";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import DateInput from "../../components/ui/DateInput";
import CollapsiblePanel, { PanelToggle, useCollapsedPanels } from "./CollapsiblePanel";
import "./dashboard.css";

const ALL_STATES = ["RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA", "RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA",];

const STATUS_COLORS = {
  RECIBIDA: "#64748b",
  EN_REVISION: "#0284c7",
  ASIGNADA: "#d97706",
  EN_PROCESO: "#2563eb",
  EN_ESPERA: "#8b5cf6",
  RESUELTA: "#059669",
  CERRADA: "#10b981",
  RECHAZADA: "#dc2626",
  CANCELADA: "#94a3b8",
};

const EMPTY_DATA = {
  kpis: {},
  incidencias: {
    por_estado: [],
    evolucion_temporal: [],
    tiempos_por_prioridad: [],
  },
  intervenciones: {
    por_tecnico: [],
  },
  inventario: {
    top_insumos: [],
    insumos_bajo_stock: [],
  },
};

const EMPTY_OPTIONS = {
  edificios: [],
  tipos_incidencia: [],
  prioridades: [],
  tecnicos: [],
};

const EMPTY_DRILLDOWN = {
  open: false,
  title: "",
  type: "",
  rows: [],
  searchTerm: "",
};

const PRESETS = [
  ["7d", "Últimos 7 días"],
  ["30d", "Últimos 30 días"],
  ["month", "Este mes"],
  ["all", "Histórico"],
];

const SLOTS = 4;
const percent = (value) =>
  Math.max(0, Math.min(Number(value) || 0, 100));

const money = (value) =>
  `$${Number(value || 0).toLocaleString()}`;

function toDateInput(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    pad(date.getDate())
  );
}

function defaultFilters() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  return {
    desde: toDateInput(desde),
    hasta: toDateInput(hasta),
    id_edificio: "",
    id_tipo_incidencia: "",
    id_prioridad: "",
    id_tecnico: "",
  };
}

function buildQuery(filters, extra = {}) {
  const params = new URLSearchParams();

  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      params.append(key, value);
    }
  });

  return params.toString();
}

function normalizeData(result = {}) {
  return {
    kpis: result.kpis ?? {},
    incidencias: {
      ...EMPTY_DATA.incidencias,
      ...result.incidencias,
    },
    intervenciones: {
      ...EMPTY_DATA.intervenciones,
      ...result.intervenciones,
    },
    inventario: {
      ...EMPTY_DATA.inventario,
      ...result.inventario,
    },
  };
}

function KpiCard({ color, icon, title, value, unit, progress, footer, hint = "Detalle →", onOpen, }) {
  return (
    <article className={`dash-kpi-card kpi-${color}`} onClick={onOpen}>
      <div className="dash-kpi-header">
        <span className="dash-kpi-label">{title}</span>
        <span className="dash-kpi-icon-wrap">
          <Icon name={icon} size={18} />
        </span>
      </div>

      <div className="dash-kpi-value-row">
        <span className="dash-kpi-value">{value}</span>
        <span className="dash-kpi-unit">{unit}</span>
      </div>

      <div className="dash-progress-track">
        <div className={`dash-progress-fill fill-${color}`} style={{ width: `${percent(progress)}%` }}/>
      </div>

      <div className="dash-kpi-footer">
        <span>{footer}</span>
        <button type="button" className="dash-header-action-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          {hint}
        </button>
      </div>
    </article>
  );
}

function Panel({ id, icon, title, subtitle, extra, danger = false, panels, children }) {
  return (
    <div className="dash-col-6">
      <CollapsiblePanel id={id} icon={icon} title={title} subtitle={subtitle} danger={danger} open={panels.isOpen(id)} onToggle={() => panels.toggle(id)} aside={extra}>
        {children}
      </CollapsiblePanel>
    </div>
  );
}

function SelectFilter({ id, label, value, onChange, placeholder, options, idField, renderLabel = (item) => item.nombre, }) {
  return (
    <div className="dash-filter-item">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item[idField]} value={item[idField]}>
            {renderLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

function DetailTable({ type, rows, onNavigate }) {
  const isStock = type === "insumos_bajo_stock";
  const isInterventions = type === "intervenciones_realizadas";

  const columnCount = isStock
    ? 6
    : isInterventions
      ? 5 + Number(Boolean(onNavigate))
      : 8 + Number(Boolean(onNavigate));

  return (
    <div className="dash-modal-table-wrap">
      <table className="dash-table">
        <thead>
          {isStock ? (
            <tr>
              <th>Insumo</th>
              <th>Categoría</th>
              <th className="text-right">Stock actual</th>
              <th className="text-right">Stock mínimo</th>
              <th className="text-right">Faltante</th>
              <th className="text-right">Costo unitario</th>
            </tr>
          ) : isInterventions ? (
            <tr>
              <th>#</th>
              <th>Fecha de inicio</th>
              <th>Incidencia asociada</th>
              <th>Personal técnico</th>
              <th>Resultado / Acción</th>
              {onNavigate && <th>Acción</th>}
            </tr>
          ) : (
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Ubicación</th>
              <th>Categoría</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Técnico</th>
              <th>Reporte</th>
              {onNavigate && <th>Acción</th>}
            </tr>
          )}
        </thead>

        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={columnCount}>
                No se encontraron registros que coincidan con la búsqueda.
              </td>
            </tr>
          ) : rows.map((row, index) => {
            if (isStock) {
              return (
                <tr key={row.id_insumo ?? index}>
                  <td><strong>{row.nombre}</strong></td>
                  <td>{row.categoria}</td>
                  <td className="text-right">{row.stock}</td>
                  <td className="text-right">{row.stock_minimo}</td>
                  <td className="text-right">+{row.faltante}</td>
                  <td className="text-right">
                    {money(row.costo_unitario)}
                  </td>
                </tr>
              );
            }

            if (isInterventions) {
              return (
                <tr key={row.id_intervencion ?? index}>
                  <td>#{row.id_intervencion}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDateTime(row.fecha_inicio) || "—"}
                  </td>
                  <td>{row.incidencia_titulo}</td>
                  <td>
                    {row.tecnico_nombre} {row.tecnico_apellido}
                  </td>
                  <td>{row.resultado}</td>
                  {onNavigate && (
                    <td>
                      <button type="button" className="dash-table-btn" onClick={onNavigate}>
                        Ver incidencia ↗
                      </button>
                    </td>
                  )}
                </tr>
              );
            }

            return (
              <tr key={row.id_incidencia ?? index}>
                <td>#{row.id_incidencia}</td>
                <td><strong>{row.titulo}</strong></td>
                <td>
                  {[row.edificio, row.unidad || row.espacio_comun]
                    .filter(Boolean)
                    .join(" - ") || "—"}
                </td>
                <td>{row.tipo_incidencia}</td>
                <td>
                  <span className={`dash-badge badge-${( row.prioridad || "normal").toLowerCase()}`}>
                    {row.prioridad}
                  </span>
                </td>
                <td>
                  <span className="dash-status-dot" style={{ display: "inline-block", marginRight: 6, background: STATUS_COLORS[row.estado] || "#94a3b8", }}/>
                  {row.estado}
                </td>
                <td>
                  {row.tecnico_nombre
                    ? `${row.tecnico_nombre} ${row.tecnico_apellido}`
                    : "Sin asignar"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {formatDateTime(row.fecha_reporte) || "—"}
                </td>
                {onNavigate && (
                  <td>
                    <button type="button" className="dash-table-btn" onClick={onNavigate}>
                      Gestionar ↗
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage({ user, onNavigate }) {
  const isAdmin = user?.rol === "ADMIN";
  const canFilterTechnicians =
    ["ADMIN", "GESTOR"].includes(user?.rol);

  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(EMPTY_DATA);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [activePreset, setActivePreset] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drilldown, setDrilldown] = useState(EMPTY_DRILLDOWN);
  const [dateReset, setDateReset] = useState(0);
  const panels = useCollapsedPanels();

  const requestRef = useRef(null);
  const requestId = useRef(0);

  const loadData = useCallback(async (currentFilters) => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;
    const currentRequest = ++requestId.current;

    setLoading(true);
    setError("");

    try {
      const result = await api(
        `${routes.analytics}/dashboard?${buildQuery(currentFilters)}`,
        { signal: controller.signal }
      );

      if (!controller.signal.aborted && currentRequest === requestId.current) {
        setData(normalizeData(result));
      }
    } catch (err) {
      if (controller.signal.aborted || currentRequest !== requestId.current) return;

      setData(EMPTY_DATA);
      setError(err.message || "No se pudieron cargar los indicadores.");
    } finally {
      if (!controller.signal.aborted && currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(filters);
    return () => requestRef.current?.abort();
  }, [loadData, filters]);

  useEffect(() => {
    const controller = new AbortController();

    api(`${routes.analytics}/filtros`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted && result) {
          setOptions({ ...EMPTY_OPTIONS, ...result });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(rr.message || "No se pudieron cargar los filtros.");
        }
      });

    return () => controller.abort();
  }, []);

  function handleFilterChange(key, value) {
    setActivePreset(null);
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function applyPreset(preset) {
    const today = new Date();
    let desde = "";

    if (preset === "7d" || preset === "30d") {
      const start = new Date();
      start.setDate(start.getDate() - (preset === "7d" ? 7 : 30));
      desde = toDateInput(start);
    } else if (preset === "month") {
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      desde = toDateInput(start);
    }

    setActivePreset(preset);
    setFilters((previous) => ({
      ...previous,
      desde,
      hasta: toDateInput(today),
    }));
    setDateReset((current) => current + 1);
  }

  function resetFilters() {
    setActivePreset("all");
    setFilters({
      desde: "",
      hasta: "",
      id_edificio: "",
      id_tipo_incidencia: "",
      id_prioridad: "",
      id_tecnico: "",
    });
    setDateReset((current) => current + 1);
  }

  async function openDrilldown(type, title) {
    try {
      const records = await api(
        `${routes.analytics}/registros?${buildQuery(filters, {
          tipo_registro: type,
          limit: 500,
        })}`
      );

      setDrilldown({
        open: true,
        title,
        type,
        rows: records || [],
        searchTerm: "",
      });
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle.");
    }
  }

  function closeDrilldown() {
    setDrilldown(EMPTY_DRILLDOWN);
  }

  function goToIncidents() {
    closeDrilldown();
    onNavigate?.("incidents");
  }

  const { kpis, incidencias, intervenciones, inventario } = data;

  const priorityRows = Array.from(
    { length: Math.max(SLOTS, options.prioridades.length) },
    (_, index) => {
      const base = options.prioridades[index];
      const found = base
        ? incidencias.tiempos_por_prioridad.find(
            (item) => item.id_prioridad === base.id_prioridad
          )
        : incidencias.tiempos_por_prioridad[index];

      return found || (
        base
          ? {
              id_prioridad: base.id_prioridad,
              prioridad: base.nombre,
              objetivo_horas: null,
              horas_promedio: null,
              total_resueltas: 0,
            }
          : null
      );
    }
  );

  const technicianBase = options.tecnicos.length
    ? options.tecnicos.map((item) => ({
        id_tecnico: item.id_usuario,
        tecnico_nombre: item.nombre,
        tecnico_apellido: item.apellido,
      }))
    : intervenciones.por_tecnico;

  const technicianRows = Array.from(
    { length: Math.max(SLOTS, technicianBase.length) },
    (_, index) => {
      const base = technicianBase[index];
      if (!base) return null;

      return intervenciones.por_tecnico.find(
        (item) => item.id_tecnico === base.id_tecnico
      ) || {
        ...base,
        total_intervenciones: 0,
        porcentaje: 0,
      };
    }
  );

  const filteredDrilldownRows = drilldown.rows.filter((row) => {
    const term = drilldown.searchTerm.trim().toLowerCase();
    if (!term) return true;

    return [
      row.titulo,
      row.incidencia_titulo,
      row.resultado,
      row.nombre,
      row.edificio,
      row.tecnico_nombre,
      row.tecnico_apellido,
      row.estado,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(term)
    );
  });

  const activeChips = [];

  if (filters.desde || filters.hasta) {
    activeChips.push({
      key: "fechas",
      label:
        `Período: ${formatDate(filters.desde) || "Inicio"} a ` +
        `${formatDate(filters.hasta) || "Hoy"}`,
      onRemove: () => {
        setActivePreset(null);
        setFilters((previous) => ({
          ...previous,
          desde: "",
          hasta: "",
        }));
        setDateReset((current) => current + 1);
      },
    });
  }

  const chipDefinitions = [
    ["id_edificio", options.edificios, "id_edificio", "Edificio"],
    ["id_tipo_incidencia", options.tipos_incidencia, "id_tipo_incidencia", "Tipo",],
    ["id_prioridad", options.prioridades, "id_prioridad", "Prioridad"],
    ["id_tecnico", options.tecnicos, "id_usuario", "Técnico"],
  ];

  for (const [key, entries, idField, label] of chipDefinitions) {
    if (!filters[key]) continue;

    const entry = entries.find((item) => Number(item[idField]) === Number(filters[key]));
    if (!entry) continue;

    activeChips.push({
      key,
      label: `${label}: ${
        key === "id_tecnico"
          ? `${entry.nombre} ${entry.apellido}`
          : entry.nombre
      }`,
      onRemove: () => handleFilterChange(key, ""),
    });
  }

  const maxTimeline = Math.max(
    1,
    ...incidencias.evolucion_temporal.map((item) =>
      Math.max(item.reportadas, item.resueltas)
    )
  );

  return (
    <div className="dash-container">
      <section className="dash-header">
        <div className="dash-title-group">
          <h1>
            <Icon name="dashboard" size={26} />
            Dashboard e indicadores del sistema
          </h1>
          <p>
            Operaciones, resolución de incidencias, cumplimiento
            de plazos e inventario de insumos.
          </p>
        </div>

        <div className="dash-header-actions">
          {onNavigate && (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => onNavigate("incidents")}
              >
                <Icon name="incidents" size={16} />
                Gestionar incidencias
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onNavigate("employees")}
                >
                  <Icon name="employees" size={16} />
                  Personal técnico
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => loadData(filters)}
          >
            <Icon name="refresh" size={16} />
            {loading ? "Calculando…" : "Actualizar"}
          </button>
        </div>
      </section>

      {error && (
        <div
          className="dash-demo-badge"
          role="alert"
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      <section
        className={`dash-filters-card${panels.isOpen("filtros") ? "" : " is-collapsed"}`}
        aria-label="Filtros del panel"
      >
        <div className="dash-filters-top">
          <h2 className="dash-panel-title-area" onClick={() => panels.toggle("filtros")}>
            <Icon name="calendar" size={18} />
            Filtros y período de análisis
          </h2>

          <div className="dash-card-header-side">
            {panels.isOpen("filtros") && (
              <div className="dash-presets">
                {PRESETS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={
                      `dash-preset-btn ${activePreset === key ? "is-active" : ""}`
                    }
                    onClick={() => applyPreset(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <PanelToggle
              open={panels.isOpen("filtros")}
              onToggle={() => panels.toggle("filtros")}
              controls="dash-panel-filtros"
              label="Filtros y período de análisis"
            />
          </div>
        </div>

        <div id="dash-panel-filtros" className="dash-panel-body" hidden={!panels.isOpen("filtros")}>
        <div className="dash-filters-grid">
          <div className="dash-filter-item">
            <label htmlFor="filter-desde">Desde</label>
            <DateInput
              id="filter-desde"
              value={filters.desde}
              resetKey={dateReset}
              onChange={(event) =>
                handleFilterChange("desde", event.target.value)
              }
            />
          </div>

          <div className="dash-filter-item">
            <label htmlFor="filter-hasta">Hasta</label>
            <DateInput
              id="filter-hasta"
              value={filters.hasta}
              resetKey={dateReset}
              onChange={(event) =>
                handleFilterChange("hasta", event.target.value)
              }
            />
          </div>

          <SelectFilter
            id="filter-edificio"
            label="Edificio"
            value={filters.id_edificio}
            onChange={(value) =>
              handleFilterChange("id_edificio", value)
            }
            placeholder="Todos los edificios"
            options={options.edificios}
            idField="id_edificio"
          />

          <SelectFilter
            id="filter-tipo"
            label="Tipo de incidencia"
            value={filters.id_tipo_incidencia}
            onChange={(value) =>
              handleFilterChange("id_tipo_incidencia", value)
            }
            placeholder="Todas las categorías"
            options={options.tipos_incidencia}
            idField="id_tipo_incidencia"
          />

          <SelectFilter
            id="filter-prioridad"
            label="Prioridad"
            value={filters.id_prioridad}
            onChange={(value) =>
              handleFilterChange("id_prioridad", value)
            }
            placeholder="Todas las prioridades"
            options={options.prioridades}
            idField="id_prioridad"
          />

          {canFilterTechnicians && options.tecnicos.length > 0 && (
            <SelectFilter
              id="filter-tecnico"
              label="Técnico asignado"
              value={filters.id_tecnico}
              onChange={(value) =>
                handleFilterChange("id_tecnico", value)
              }
              placeholder="Todos los técnicos"
              options={options.tecnicos}
              idField="id_usuario"
              renderLabel={(item) =>
                `${item.nombre} ${item.apellido}`
              }
            />
          )}

          <div className="dash-filter-actions">
            <button
              type="button"
              className="secondary"
              onClick={resetFilters}
            >
              Restablecer
            </button>
          </div>
        </div>
        </div>

        {activeChips.length > 0 && (
          <div className="dash-active-filters-bar">
            <span className="dash-active-filters-label">
              Filtros aplicados:
            </span>

            {activeChips.map((chip) => (
              <span className="dash-filter-chip" key={chip.key}>
                {chip.label}
                <button
                  type="button"
                  className="dash-chip-remove"
                  onClick={chip.onRemove}
                  aria-label={`Eliminar filtro ${chip.label}`}
                >
                  ✕
                </button>
              </span>
            ))}

            <span className="dash-filter-results-summary">
              Coincidencias: {kpis.total_incidencias ?? 0} incidencias
              {" | "}
              {kpis.total_intervenciones ?? 0} intervenciones
            </span>
          </div>
        )}
      </section>

      <section className="dash-group" aria-labelledby="dash-kpis-title">
        <div className="dash-group-header">
          <h2
            id="dash-kpis-title"
            className="dash-panel-title-area"
            onClick={() => panels.toggle("kpis")}
          >
            Indicadores clave
          </h2>
          <PanelToggle
            open={panels.isOpen("kpis")}
            onToggle={() => panels.toggle("kpis")}
            controls="dash-panel-kpis"
            label="Indicadores clave"
          />
        </div>
        <div
          id="dash-panel-kpis"
          className="dash-kpis-grid"
          hidden={!panels.isOpen("kpis")}
        >
        <KpiCard
          color="blue"
          icon="incidents"
          title="Total incidencias"
          value={kpis.total_incidencias ?? 0}
          unit="reportes"
          progress={kpis.tasa_resolucion_porcentaje}
          footer={`${kpis.incidencias_pendientes ?? 0} pendientes de cierre`}
          hint={`Ver todas (${kpis.total_incidencias ?? 0}) →`}
          onOpen={() =>
            openDrilldown("incidencias", "Todas las incidencias filtradas")
          }
        />

        <KpiCard
          color="green"
          icon="check"
          title="Tasa de resolución"
          value={`${kpis.tasa_resolucion_porcentaje ?? 0}%`}
          unit={`(${kpis.incidencias_resueltas ?? 0} resueltas)`}
          progress={kpis.tasa_resolucion_porcentaje}
          footer={`${kpis.incidencias_resueltas ?? 0} de ${kpis.total_incidencias ?? 0} incidencias`}
          hint="Ver resueltas →"
          onOpen={() =>
            openDrilldown("incidencias_resueltas", "Incidencias resueltas")
          }
        />

        <KpiCard
          color="purple"
          icon="clock"
          title="Cumplimiento SLA"
          value={
            kpis.tasa_cumplimiento_sla_porcentaje != null
              ? `${kpis.tasa_cumplimiento_sla_porcentaje}%`
              : "N/A"
          }
          unit="en tiempo límite"
          progress={kpis.tasa_cumplimiento_sla_porcentaje}
          footer="Metas fijadas por prioridad"
          onOpen={() =>
            openDrilldown(
              "incidencias_resueltas",
              "Cumplimiento de plazo SLA"
            )
          }
        />

        <KpiCard
          color="amber"
          icon="trendUp"
          title="Tiempo medio de resolución"
          value={kpis.tiempo_promedio_resolucion_horas ?? "—"}
          unit="horas promedio"
          progress={
            ((kpis.tiempo_promedio_resolucion_horas || 0) / 24) * 100
          }
          footer={
            kpis.tiempo_promedio_resolucion_horas != null
              ? `Equivale a ${(kpis.tiempo_promedio_resolucion_horas / 24).toFixed(1)} días por cierre`
              : "Sin incidencias resueltas"
          }
          onOpen={() =>
            openDrilldown(
              "incidencias_resueltas",
              "Incidencias resueltas y tiempos de cierre"
            )
          }
        />

        <KpiCard
          color="blue"
          icon="tool"
          title="Intervenciones"
          value={kpis.total_intervenciones ?? 0}
          unit="ejecutadas"
          progress={
            ((kpis.total_intervenciones || 0) /
              (kpis.total_incidencias || 1)) * 100
          }
          footer={
            <button
              type="button"
              className="dash-header-action-btn"
              onClick={(event) => {
                event.stopPropagation();
                openDrilldown(
                  "pendientes_intervencion",
                  "Incidencias pendientes de intervención"
                );
              }}
            >
              {kpis.pendientes_intervencion ?? 0} pendientes de atención
            </button>
          }
          hint="Ver todas →"
          onOpen={() =>
            openDrilldown(
              "intervenciones_realizadas",
              "Intervenciones ejecutadas"
            )
          }
        />

        <KpiCard
          color="red"
          icon="alertTriangle"
          title="Alerta de stock bajo"
          value={kpis.insumos_bajo_stock ?? 0}
          unit="artículos críticos"
          progress={kpis.insumos_bajo_stock > 0 ? 100 : 0}
          footer={`Costo neto: ${money(kpis.costo_insumos_consumidos)}`}
          hint="Ver faltantes →"
          onOpen={() =>
            openDrilldown(
              "insumos_bajo_stock",
              "Insumos con stock bajo mínimo"
            )
          }
        />
        </div>
      </section>

      <section className="dash-section-grid">
        <Panel
          id="evolucion"
          panels={panels}
          icon="chart"
          title="Evolución temporal: reportadas vs resueltas"
          subtitle="Tendencia diaria según los filtros actuales"
          extra={
            <div className="dash-chart-legend">
              <div className="dash-legend-item">
                <span
                  className="dash-legend-color"
                  style={{ background: "#3b82f6" }}
                />
                <span>Reportadas</span>
              </div>
              <div className="dash-legend-item">
                <span
                  className="dash-legend-color"
                  style={{ background: "#10b981" }}
                />
                <span>Resueltas</span>
              </div>
            </div>
          }
        >
          <div className="dash-chart-container">
            {incidencias.evolucion_temporal.length ? (
              <div className="dash-timeline-bars">
                {incidencias.evolucion_temporal.map((item) => (
                  <div
                    className="dash-bar-group"
                    key={item.fecha}
                    title={`${formatDate(item.fecha)}: ${item.reportadas} reportadas, ${item.resueltas} resueltas`}
                  >
                    <div className="dash-bar-pair">
                      <div
                        className="dash-bar bar-reported"
                        style={{
                          height: `${Math.max(
                            Math.round(item.reportadas / maxTimeline * 100),
                            item.reportadas > 0 ? 6 : 0
                          )}%`,
                        }}
                      />
                      <div
                        className="dash-bar bar-resolved"
                        style={{
                          height: `${Math.max(
                            Math.round(item.resueltas / maxTimeline * 100),
                            item.resueltas > 0 ? 6 : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="dash-bar-label">
                      {formatDate(item.fecha)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay datos para el período o filtros seleccionados.</p>
            )}
          </div>
        </Panel>

        <Panel
          id="estados"
          panels={panels}
          icon="incidents"
          title="Distribución por estado de incidencia"
          subtitle="Ciclo de vida operativo completo"
          extra={
            <span className="dash-header-pill">
              {ALL_STATES.length} estados
            </span>
          }
        >
          <div className="dash-breakdown-list-9">
            {ALL_STATES.map((estado) => {
              const item = incidencias.por_estado.find(
                (row) => row.estado === estado
              ) || { total: 0, porcentaje: 0 };

              return (
                <div className="dash-breakdown-row" key={estado}>
                  <div className="dash-breakdown-meta">
                    <span className="dash-breakdown-name">
                      <span
                        className="dash-status-dot"
                        style={{ background: STATUS_COLORS[estado] }}
                      />
                      {onNavigate ? (
                        <button
                          type="button"
                          className="dash-link-btn"
                          onClick={() => onNavigate("incidents", { estado })}
                          aria-label={`Ver incidencias en estado ${estado}`}
                        >
                          {estado}
                        </button>
                      ) : (
                        estado
                      )}
                    </span>
                    <span className="dash-breakdown-stat">
                      {item.total}
                      <span className="dash-breakdown-pct">
                        ({item.porcentaje}%)
                      </span>
                    </span>
                  </div>
                  <div className="dash-progress-track">
                    <div
                      className="dash-progress-fill"
                      style={{
                        width: `${percent(item.porcentaje)}%`,
                        background: STATUS_COLORS[estado],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          id="prioridades"
          panels={panels}
          icon="clock"
          title="Carga por prioridad y metas SLA"
          subtitle="Horas promedio de resolución frente al tiempo objetivo"
          extra={
            <span className="dash-header-pill">
              {options.prioridades.length} prioridades
            </span>
          }
        >
          <div className="dash-breakdown-equal-grid">
            {priorityRows.map((item, index) => {
              if (!item) {
                return (
                  <div
                    className="dash-breakdown-row"
                    key={`priority-${index}`}
                  >
                    <div className="dash-breakdown-meta">
                      <span>Sin prioridad</span>
                      <span>—</span>
                    </div>
                    <div className="dash-progress-track" />
                  </div>
                );
              }

              const hasData = item.horas_promedio != null;
              const hasTarget = item.objetivo_horas != null;
              const withinSla =
                hasData &&
                hasTarget &&
                item.horas_promedio <= item.objetivo_horas;

              const width =
                hasData && hasTarget && item.objetivo_horas > 0
                  ? percent(item.horas_promedio / item.objetivo_horas * 100)
                  : 0;

              return (
                <div
                  className="dash-breakdown-row"
                  key={item.id_prioridad}
                >
                  <div className="dash-breakdown-meta">
                    <span className="dash-breakdown-name">
                      <span
                        className={`dash-badge badge-${String(item.prioridad).toLowerCase()}`}
                      >
                        {item.prioridad}
                      </span>
                      <span className="dash-meta-sub">
                        Meta: {hasTarget ? `${item.objetivo_horas}h` : "—"}
                      </span>
                    </span>
                    <span
                      className="dash-breakdown-stat"
                      style={{
                        color: hasData
                          ? (withinSla ? "#059669" : "#dc2626")
                          : "#94a3b8",
                      }}
                    >
                      {hasData
                        ? `${item.horas_promedio}h prom.`
                        : "Sin resueltas"}
                      <span className="dash-breakdown-pct">
                        ({item.total_resueltas} resueltas)
                      </span>
                    </span>
                  </div>
                  <div className="dash-progress-track">
                    <div
                      className="dash-progress-fill"
                      style={{
                        width: `${width}%`,
                        background: withinSla ? "#10b981" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          id="tecnicos"
          panels={panels}
          icon="tool"
          title="Intervenciones por personal técnico"
          subtitle="Distribución operativa entre el equipo técnico"
          extra={
            <span className="dash-header-pill">
              {technicianBase.length} técnicos
            </span>
          }
        >
          <div className="dash-breakdown-equal-grid">
            {technicianRows.map((item, index) => (
              <div
                className="dash-breakdown-row"
                key={item?.id_tecnico ?? `technician-${index}`}
              >
                <div className="dash-breakdown-meta">
                  <span className="dash-breakdown-name">
                    <span className="dash-tec-avatar">
                      {item?.tecnico_nombre?.[0] || "–"}
                    </span>
                    <strong className="dash-tec-name">
                      {item
                        ? `${item.tecnico_nombre} ${item.tecnico_apellido}`
                        : "Sin técnico"}
                    </strong>
                  </span>
                  <span className="dash-breakdown-stat">
                    {item?.total_intervenciones ?? 0} intervenciones
                    <span className="dash-breakdown-pct">
                      ({item?.porcentaje ?? 0}%)
                    </span>
                  </span>
                </div>
                <div className="dash-progress-track">
                  <div
                    className="dash-progress-fill fill-purple"
                    style={{
                      width: `${percent(item?.porcentaje)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          id="top-insumos"
          panels={panels}
          icon="box"
          title="Insumos más utilizados en mantenimiento"
          subtitle="Rotación y costo neto, descontando devoluciones"
          extra={<span className="dash-header-pill">Mayor rotación</span>}
        >
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Categoría</th>
                  <th className="text-right">Consumo</th>
                  <th className="text-right">Costo total</th>
                  <th className="text-center">Intervenciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.top_insumos.map((item) => (
                  <tr key={item.id_insumo}>
                    <td><strong>{item.insumo}</strong></td>
                    <td>{item.categoria}</td>
                    <td className="text-right">{item.total_consumido}</td>
                    <td className="text-right">{money(item.costo_total)}</td>
                    <td className="text-center">{item.intervenciones}</td>
                  </tr>
                ))}
                {!inventario.top_insumos.length && (
                  <tr>
                    <td colSpan={5}>Sin consumos para estos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          id="bajo-stock"
          panels={panels}
          danger
          icon="alertTriangle"
          title="Insumos bajo stock mínimo"
          subtitle="Artículos que requieren reposición"
          extra={
            <>
              <button
                type="button"
                className="dash-header-action-btn"
                onClick={() =>
                  openDrilldown(
                    "insumos_bajo_stock",
                    "Catálogo bajo stock mínimo"
                  )
                }
              >
                Ver catálogo ({kpis.insumos_bajo_stock ?? 0}) ↗
              </button>
              {onNavigate && (
                <button
                  type="button"
                  className="dash-header-action-btn"
                  onClick={() => onNavigate("maintenance", { bajo_stock: "true" })}
                  title="Abrir Insumos filtrado por stock bajo"
                >
                  Ir a Insumos ↗
                </button>
              )}
            </>
          }
        >
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th className="text-right">Stock actual</th>
                  <th className="text-right">Mínimo</th>
                  <th className="text-right">Faltante</th>
                </tr>
              </thead>
              <tbody>
                {inventario.insumos_bajo_stock.map((item) => (
                  <tr key={item.id_insumo}>
                    <td>
                      <strong>{item.nombre}</strong>
                      <div>{item.categoria}</div>
                    </td>
                    <td className="text-right">{item.stock}</td>
                    <td className="text-right">{item.stock_minimo}</td>
                    <td className="text-right">+{item.faltante}</td>
                  </tr>
                ))}
                {!inventario.insumos_bajo_stock.length && (
                  <tr>
                    <td colSpan={4}>No hay insumos bajo stock mínimo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      {drilldown.open && (
        <Modal
          title={drilldown.title}
          description={
            `Visualizando ${filteredDrilldownRows.length} de ` +
            `${drilldown.rows.length} registros`
          }
          onClose={closeDrilldown}
        >
          <div className="dash-modal-controls">
            <input
              type="search"
              className="dash-modal-search"
              aria-label="Buscar en el detalle"
              placeholder="Buscar en estos registros…"
              value={drilldown.searchTerm}
              onChange={(event) =>
                setDrilldown((previous) => ({
                  ...previous,
                  searchTerm: event.target.value,
                }))
              }
            />

            {onNavigate && (
              <button
                type="button"
                className="secondary"
                onClick={goToIncidents}
              >
                Ir a la pantalla de incidencias ↗
              </button>
            )}
          </div>

          <DetailTable
            type={drilldown.type}
            rows={filteredDrilldownRows}
            onNavigate={onNavigate ? goToIncidents : undefined}
          />

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>
              Total en este indicador: {drilldown.rows.length} registros
            </span>
            <button
              type="button"
              className="secondary"
              onClick={closeDrilldown}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}