import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import "./dashboard.css";

const ALL_STATES = [
  "RECIBIDA", "EN_REVISION", "ASIGNADA", "EN_PROCESO", "EN_ESPERA",
  "RESUELTA", "CERRADA", "RECHAZADA", "CANCELADA",
];
const SLOTS = 4;

const EMPTY_DATA = {
  kpis: {},
  incidencias: { por_estado: [], evolucion_temporal: [], tiempos_por_prioridad: [] },
  intervenciones: { por_tecnico: [] },
  inventario: { top_insumos: [], insumos_bajo_stock: [] },
};
const EMPTY_OPTIONS = { edificios: [], tipos_incidencia: [], prioridades: [], tecnicos: [] };

function toDateInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
}

function buildQuery(filters, extra = {}) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) params.append(key, value);
  });
  return params.toString();
}

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

export default function DashboardPage({ user, onNavigate }) {
  const isAdmin = user?.rol === "ADMIN";
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(EMPTY_DATA);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [activePreset, setActivePreset] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drilldown, setDrilldown] = useState({
    open: false,
    title: "",
    type: "",
    rows: [],
    searchTerm: "",
  });

  const loadData = useCallback(async (currentFilters) => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`${routes.analytics}/dashboard?${buildQuery(currentFilters)}`);
      setData({ ...EMPTY_DATA, ...result });
    } catch (err) {
      setData(EMPTY_DATA);
      setError(err.message || "No se pudieron cargar los indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [loadData, filters]);

  useEffect(() => {
    let active = true;
    api(`${routes.analytics}/filtros`)
      .then((result) => { if (active && result) setOptions({ ...EMPTY_OPTIONS, ...result }); })
      .catch(() => { /* los filtros quedan vacíos; el error principal lo informa el dashboard */ });
    return () => { active = false; };
  }, []);

  function handleFilterChange(key, value) {
    setActivePreset(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function removeFilter(key) {
    handleFilterChange(key, "");
  }

  function applyPreset(preset) {
    setActivePreset(preset);
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let desde = "";
    const hasta = fmt(today);

    if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      desde = fmt(d);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      desde = fmt(d);
    } else if (preset === "month") {
      desde = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    } else if (preset === "all") {
      desde = "";
    }

    setFilters((prev) => ({ ...prev, desde, hasta }));
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
  }

  async function openDrilldown(type, title) {
    try {
      const records = await api(
        `${routes.analytics}/registros?${buildQuery(filters, { tipo_registro: type, limit: 500 })}`
      );
      setDrilldown({ open: true, title, type, rows: records || [], searchTerm: "" });
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle.");
    }
  }

  const { kpis, incidencias, intervenciones, inventario } = data;

  // Filas fijas (4 cupos) para mantener la simetría aunque falten datos.
  const priorityRows = Array.from({ length: Math.max(SLOTS, options.prioridades.length) }, (_, index) => {
    const base = options.prioridades[index];
    const found = base
      ? incidencias.tiempos_por_prioridad.find((p) => p.id_prioridad === base.id_prioridad)
      : incidencias.tiempos_por_prioridad[index];
    if (found) return found;
    return base ? { id_prioridad: base.id_prioridad, prioridad: base.nombre, objetivo_horas: null, horas_promedio: null, total_resueltas: 0 } : null;
  });

  const technicianBase = options.tecnicos.length > 0
    ? options.tecnicos.map((t) => ({ id_tecnico: t.id_usuario, tecnico_nombre: t.nombre, tecnico_apellido: t.apellido }))
    : intervenciones.por_tecnico;
  const technicianRows = Array.from({ length: Math.max(SLOTS, technicianBase.length) }, (_, index) => {
    const base = technicianBase[index];
    if (!base) return null;
    const found = intervenciones.por_tecnico.find((t) => t.id_tecnico === base.id_tecnico);
    return found || { ...base, total_intervenciones: 0, porcentaje: 0 };
  });

  // Filtrado de filas dentro del modal de Drilldown por buscador
  const filteredDrilldownRows = drilldown.rows.filter((r) => {
    if (!drilldown.searchTerm) return true;
    const term = drilldown.searchTerm.toLowerCase();
    return (
      (r.titulo && r.titulo.toLowerCase().includes(term)) ||
      (r.incidencia_titulo && r.incidencia_titulo.toLowerCase().includes(term)) ||
      (r.resultado && r.resultado.toLowerCase().includes(term)) ||
      (r.nombre && r.nombre.toLowerCase().includes(term)) ||
      (r.edificio && r.edificio.toLowerCase().includes(term)) ||
      (r.tecnico_nombre && `${r.tecnico_nombre} ${r.tecnico_apellido}`.toLowerCase().includes(term)) ||
      (r.estado && r.estado.toLowerCase().includes(term))
    );
  });

  // Filtros activos para chips
  const activeChips = [];
  if (filters.desde || filters.hasta) {
    activeChips.push({
      key: "fechas",
      label: `Período: ${filters.desde || "Inicio"} a ${filters.hasta || "Hoy"}`,
      onRemove: () => setFilters((p) => ({ ...p, desde: "", hasta: "" })),
    });
  }
  if (filters.id_edificio) {
    const ed = options.edificios.find((e) => e.id_edificio === Number(filters.id_edificio));
    if (ed) activeChips.push({ key: "id_edificio", label: `Edificio: ${ed.nombre}`, onRemove: () => removeFilter("id_edificio") });
  }
  if (filters.id_tipo_incidencia) {
    const tp = options.tipos_incidencia.find((t) => t.id_tipo_incidencia === Number(filters.id_tipo_incidencia));
    if (tp) activeChips.push({ key: "id_tipo_incidencia", label: `Tipo: ${tp.nombre}`, onRemove: () => removeFilter("id_tipo_incidencia") });
  }
  if (filters.id_prioridad) {
    const pr = options.prioridades.find((p) => p.id_prioridad === Number(filters.id_prioridad));
    if (pr) activeChips.push({ key: "id_prioridad", label: `Prioridad: ${pr.nombre}`, onRemove: () => removeFilter("id_prioridad") });
  }
  if (filters.id_tecnico) {
    const tc = options.tecnicos.find((t) => t.id_usuario === Number(filters.id_tecnico));
    if (tc) activeChips.push({ key: "id_tecnico", label: `Técnico: ${tc.nombre} ${tc.apellido}`, onRemove: () => removeFilter("id_tecnico") });
  }

  return (
    <div className="dash-container">
      {/* --------------------------------------------------------------------
          Header & Acciones de Redirección Rápida
          -------------------------------------------------------------------- */}
      <section className="dash-header">
        <div className="dash-title-group">
          <h1>
            <Icon name="dashboard" size={26} />
            Dashboard & Indicadores del Sistema
          </h1>
          <p>
            Monitoreo en tiempo real de operaciones, resolución de incidencias, SLA e inventario de insumos.
          </p>
        </div>
        <div className="dash-header-actions">
          {onNavigate && (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => onNavigate("incidents")}
                title="Ir al módulo de incidencias para ver y editar registros"
              >
                <Icon name="incidents" size={16} />
                Gestionar Incidencias
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onNavigate("employees")}
                  title="Ir al listado de empleados y técnicos"
                >
                  <Icon name="employees" size={16} />
                  Personal Técnico
                </button>
              )}
            </>
          )}
          {error && (
            <div className="dash-demo-badge" role="alert" style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>
              <span className="badge-dot" style={{ background: "#ef4444" }} />
              {error}
            </div>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => loadData(filters)}
            title="Refrescar métricas"
          >
            <Icon name="refresh" size={16} />
            {loading ? "Calculando…" : "Actualizar"}
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Barra de Filtros Dinámicos
          -------------------------------------------------------------------- */}
      <section className="dash-filters-card" aria-label="Filtros del panel">
        <div className="dash-filters-top">
          <h2>
            <Icon name="calendar" size={18} />
            Filtros y Período de Análisis
          </h2>
          <div className="dash-presets">
            <button
              type="button"
              className={`dash-preset-btn ${activePreset === "7d" ? "is-active" : ""}`}
              onClick={() => applyPreset("7d")}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              className={`dash-preset-btn ${activePreset === "30d" ? "is-active" : ""}`}
              onClick={() => applyPreset("30d")}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              className={`dash-preset-btn ${activePreset === "month" ? "is-active" : ""}`}
              onClick={() => applyPreset("month")}
            >
              Este mes
            </button>
            <button
              type="button"
              className={`dash-preset-btn ${activePreset === "all" ? "is-active" : ""}`}
              onClick={() => applyPreset("all")}
            >
              Histórico
            </button>
          </div>
        </div>

        <div className="dash-filters-grid">
          <div className="dash-filter-item">
            <label htmlFor="filter-desde">Desde</label>
            <input
              id="filter-desde"
              type="date"
              value={filters.desde}
              onChange={(e) => handleFilterChange("desde", e.target.value)}
            />
          </div>

          <div className="dash-filter-item">
            <label htmlFor="filter-hasta">Hasta</label>
            <input
              id="filter-hasta"
              type="date"
              value={filters.hasta}
              onChange={(e) => handleFilterChange("hasta", e.target.value)}
            />
          </div>

          <div className="dash-filter-item">
            <label htmlFor="filter-edificio">Edificio</label>
            <select
              id="filter-edificio"
              value={filters.id_edificio}
              onChange={(e) => handleFilterChange("id_edificio", e.target.value)}
            >
              <option value="">Todos los edificios</option>
              {options.edificios.map((ed) => (
                <option key={ed.id_edificio} value={ed.id_edificio}>
                  {ed.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="dash-filter-item">
            <label htmlFor="filter-tipo">Tipo Incidencia</label>
            <select
              id="filter-tipo"
              value={filters.id_tipo_incidencia}
              onChange={(e) => handleFilterChange("id_tipo_incidencia", e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {options.tipos_incidencia.map((t) => (
                <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="dash-filter-item">
            <label htmlFor="filter-prioridad">Prioridad</label>
            <select
              id="filter-prioridad"
              value={filters.id_prioridad}
              onChange={(e) => handleFilterChange("id_prioridad", e.target.value)}
            >
              <option value="">Todas las prioridades</option>
              {options.prioridades.map((p) => (
                <option key={p.id_prioridad} value={p.id_prioridad}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && options.tecnicos.length > 0 && (
            <div className="dash-filter-item">
              <label htmlFor="filter-tecnico">Técnico Asignado</label>
              <select
                id="filter-tecnico"
                value={filters.id_tecnico}
                onChange={(e) => handleFilterChange("id_tecnico", e.target.value)}
              >
                <option value="">Todos los técnicos</option>
                {options.tecnicos.map((tec) => (
                  <option key={tec.id_usuario} value={tec.id_usuario}>
                    {tec.nombre} {tec.apellido}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="dash-filter-actions">
            <button
              type="button"
              className="secondary"
              onClick={resetFilters}
              title="Restablecer todos los filtros"
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* Chips de filtros activos y resumen de coincidencia */}
        {activeChips.length > 0 && (
          <div className="dash-active-filters-bar">
            <span className="dash-active-filters-label">Filtros aplicados:</span>
            {activeChips.map((chip) => (
              <span className="dash-filter-chip" key={chip.key}>
                {chip.label}
                <button
                  type="button"
                  className="dash-chip-remove"
                  onClick={chip.onRemove}
                  title="Eliminar este filtro"
                >
                  ✕
                </button>
              </span>
            ))}
            <span className="dash-filter-results-summary">
              Coincidencias: {kpis?.total_incidencias ?? 0} incidencias | {kpis?.total_intervenciones ?? 0} intervenciones
            </span>
          </div>
        )}
      </section>

      {/* --------------------------------------------------------------------
          KPI Cards Grid (Tarjetas simétricas 3 arriba y 3 abajo)
          -------------------------------------------------------------------- */}
      <section className="dash-kpis-grid" aria-label="Tarjetas principales de indicadores">
        {/* Card 1: Total Incidencias */}
        <article
          className="dash-kpi-card kpi-blue"
          onClick={() => openDrilldown("incidencias", "Todas las Incidencias Filtradas")}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Total Incidencias</span>
            <span className="dash-kpi-icon-wrap"><Icon name="incidents" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{kpis?.total_incidencias ?? 0}</span>
            <span className="dash-kpi-unit">reportes</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-blue"
              style={{ width: `${Math.min(kpis?.tasa_resolucion_porcentaje ?? 0, 100)}%` }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>{kpis?.incidencias_pendientes ?? 0} pendientes de cierre</span>
            <span className="dash-kpi-drilldown-hint">Ver todas ({kpis?.total_incidencias ?? 0}) →</span>
          </div>
        </article>

        {/* Card 2: Tasa de Resolución */}
        <article
          className="dash-kpi-card kpi-green"
          onClick={() => openDrilldown("incidencias_resueltas", "Incidencias Resueltas")}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Tasa de Resolución</span>
            <span className="dash-kpi-icon-wrap"><Icon name="check" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{kpis?.tasa_resolucion_porcentaje ?? 0}%</span>
            <span className="dash-kpi-unit">({kpis?.incidencias_resueltas ?? 0} resueltas)</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-green"
              style={{ width: `${Math.min(kpis?.tasa_resolucion_porcentaje ?? 0, 100)}%` }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>{kpis?.incidencias_resueltas ?? 0} de {kpis?.total_incidencias ?? 0} incidencias</span>
            <span className="dash-kpi-drilldown-hint">Ver resueltas ({kpis?.incidencias_resueltas ?? 0}) →</span>
          </div>
        </article>

        {/* Card 3: Cumplimiento SLA */}
        <article
          className="dash-kpi-card kpi-purple"
          onClick={() => openDrilldown("incidencias_resueltas", "Cumplimiento de Plazo SLA")}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Cumplimiento SLA</span>
            <span className="dash-kpi-icon-wrap"><Icon name="clock" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">
              {kpis?.tasa_cumplimiento_sla_porcentaje != null
                ? `${kpis.tasa_cumplimiento_sla_porcentaje}%`
                : "N/A"}
            </span>
            <span className="dash-kpi-unit">en tiempo límite</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-purple"
              style={{ width: `${Math.min(kpis?.tasa_cumplimiento_sla_porcentaje ?? 0, 100)}%` }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>Metas fijadas por prioridad</span>
            <span className="dash-kpi-drilldown-hint">Detalle →</span>
          </div>
        </article>

        {/* Card 4: Tiempo Medio de Resolución (Sin 'MTTR') */}
        <article
          className="dash-kpi-card kpi-amber"
          onClick={() => openDrilldown("incidencias_resueltas", "Incidencias Resueltas y Tiempos de Cierre")}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Tiempo Medio de Resolución</span>
            <span className="dash-kpi-icon-wrap"><Icon name="trendUp" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">
              {kpis?.tiempo_promedio_resolucion_horas != null
                ? kpis.tiempo_promedio_resolucion_horas
                : "—"}
            </span>
            <span className="dash-kpi-unit">horas promedio</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-amber"
              style={{
                width: `${Math.min(((kpis?.tiempo_promedio_resolucion_horas || 0) / 24) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>
              {kpis?.tiempo_promedio_resolucion_horas
                ? `Equivale a ${(kpis.tiempo_promedio_resolucion_horas / 24).toFixed(1)} días por cierre`
                : "Sin incidencias resueltas"}
            </span>
            <span className="dash-kpi-drilldown-hint">Detalle →</span>
          </div>
        </article>

        {/* Card 5: Intervenciones Técnicas */}
        <article
          className="dash-kpi-card kpi-blue"
          onClick={() => openDrilldown("intervenciones_realizadas", `Intervenciones Ejecutadas (Total: ${kpis?.total_intervenciones ?? 0})`)}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Intervenciones</span>
            <span className="dash-kpi-icon-wrap"><Icon name="tool" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{kpis?.total_intervenciones ?? 0}</span>
            <span className="dash-kpi-unit">ejecutadas</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-blue"
              style={{
                width: `${Math.min(
                  ((kpis?.total_intervenciones || 0) / (kpis?.total_incidencias || 1)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <div className="dash-kpi-footer">
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: kpis?.pendientes_intervencion > 0 ? "#dc2626" : "inherit",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={(e) => {
                e.stopPropagation();
                openDrilldown("pendientes_intervencion", `Incidencias Pendientes de Intervención (${kpis?.pendientes_intervencion ?? 0})`);
              }}
              title="Clic para ver las incidencias que no tienen intervención técnica"
            >
              {kpis?.pendientes_intervencion ?? 0} pendientes de atención
            </button>
            <span className="dash-kpi-drilldown-hint">Ver todas ({kpis?.total_intervenciones ?? 0}) →</span>
          </div>
        </article>

        {/* Card 6: Alerta de Insumos y Costo */}
        <article
          className="dash-kpi-card kpi-red"
          onClick={() => openDrilldown("insumos_bajo_stock", "Insumos con Stock Bajo Mínimo")}
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-label">Alerta Stock Bajo</span>
            <span className="dash-kpi-icon-wrap"><Icon name="alertTriangle" size={18} /></span>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{kpis?.insumos_bajo_stock ?? 0}</span>
            <span className="dash-kpi-unit">artículos críticos</span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill fill-red"
              style={{
                width: kpis?.insumos_bajo_stock > 0 ? "100%" : "0%",
              }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>Costo neto: ${Number(kpis?.costo_insumos_consumidos || 0).toLocaleString()}</span>
            <span className="dash-kpi-drilldown-hint">Ver faltantes →</span>
          </div>
        </article>
      </section>

      {/* --------------------------------------------------------------------
          Gráficos y Visualizaciones Principales — Cuadros Simétricos
          -------------------------------------------------------------------- */}
      <section className="dash-section-grid">
        {/* FILA 1 - Panel Izquierdo (50%): Evolución Temporal */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3>
                  <Icon name="chart" size={18} />
                  Evolución Temporal: Reportadas vs Resueltas
                </h3>
                <span className="dash-card-subtitle">
                  Tendencia diaria del volumen según los filtros actuales
                </span>
              </div>
              <div className="dash-chart-legend">
                <div className="dash-legend-item">
                  <span className="dash-legend-color" style={{ background: "#3b82f6" }} />
                  <span>Reportadas</span>
                </div>
                <div className="dash-legend-item">
                  <span className="dash-legend-color" style={{ background: "#10b981" }} />
                  <span>Resueltas</span>
                </div>
              </div>
            </div>

            <div className="dash-chart-container">
              {incidencias?.evolucion_temporal?.length > 0 ? (
                <div className="dash-timeline-bars">
                  {incidencias.evolucion_temporal.map((d) => {
                    const maxVal = Math.max(
                      ...incidencias.evolucion_temporal.map((x) => Math.max(x.reportadas, x.resueltas)),
                      1
                    );
                    const hReport = Math.round((d.reportadas / maxVal) * 100);
                    const hResolve = Math.round((d.resueltas / maxVal) * 100);
                    const label = d.fecha.slice(5);

                    return (
                      <div
                        className="dash-bar-group"
                        key={d.fecha}
                        title={`${d.fecha}: ${d.reportadas} reportadas, ${d.resueltas} resueltas`}
                      >
                        <div className="dash-bar-pair">
                          <div className="dash-bar bar-reported" style={{ height: `${Math.max(hReport, 6)}%` }} />
                          <div className="dash-bar bar-resolved" style={{ height: `${Math.max(hResolve, 6)}%` }} />
                        </div>
                        <span className="dash-bar-label">{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0" }}>
                  No hay datos cronológicos para el período o filtros seleccionados.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* FILA 1 - Panel Derecho (50%): Distribución por Estado (9 estados fijos con espacio preparado) */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3>
                  <Icon name="incidents" size={18} />
                  Distribución por Estado de Incidencia
                </h3>
                <span className="dash-card-subtitle">
                  Ciclo de vida operativo completo (espacio preparado para los 9 estados)
                </span>
              </div>
              <div className="dash-card-header-badge">
                <span className="dash-header-pill">9 Estados</span>
              </div>
            </div>
            <div className="dash-breakdown-list-9">
              {ALL_STATES.map((estadoKey) => {
                const item = incidencias?.por_estado?.find((st) => st.estado === estadoKey) || {
                  estado: estadoKey,
                  total: 0,
                  porcentaje: 0,
                };
                return (
                  <div className="dash-breakdown-row" key={estadoKey}>
                    <div className="dash-breakdown-meta">
                      <span className="dash-breakdown-name">
                        <span
                          className="dash-status-dot"
                          style={{ background: STATUS_COLORS[estadoKey] || "#94a3b8" }}
                        />
                        {estadoKey}
                      </span>
                      <span className="dash-breakdown-stat">
                        {item.total}
                        <span className="dash-breakdown-pct">({item.porcentaje}%)</span>
                      </span>
                    </div>
                    <div className="dash-progress-track">
                      <div
                        className="dash-progress-fill"
                        style={{
                          width: `${item.porcentaje}%`,
                          background: STATUS_COLORS[estadoKey] || "#94a3b8",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FILA 2 - Panel Izquierdo (50%): Carga por Prioridad y Metas SLA (4 prioridades) */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3>
                  <Icon name="clock" size={18} />
                  Carga por Prioridad y Metas SLA
                </h3>
                <span className="dash-card-subtitle">
                  Horas promedio de resolución vs tiempo objetivo fijado (4 niveles)
                </span>
              </div>
              <div className="dash-card-header-badge">
                <span className="dash-header-pill">4 Prioridades</span>
              </div>
            </div>
            <div className="dash-breakdown-equal-grid">
              {priorityRows.map((pr, index) => {
                if (!pr) {
                  return (
                    <div className="dash-breakdown-row" key={`slot-${index}`}>
                      <div className="dash-breakdown-meta">
                        <span className="dash-breakdown-name" style={{ color: "#94a3b8" }}>Sin prioridad</span>
                        <span className="dash-breakdown-stat">—</span>
                      </div>
                      <div className="dash-progress-track" />
                    </div>
                  );
                }

                const badgeClass = `badge-${String(pr.prioridad).toLowerCase()}`;
                const hasData = pr.horas_promedio !== null && pr.horas_promedio !== undefined;
                const hasTarget = pr.objetivo_horas !== null && pr.objetivo_horas !== undefined;
                const isWithinSla = hasData && hasTarget && pr.horas_promedio <= pr.objetivo_horas;
                const width = hasData && hasTarget && pr.objetivo_horas > 0
                  ? Math.min((pr.horas_promedio / pr.objetivo_horas) * 100, 100)
                  : 0;

                return (
                  <div className="dash-breakdown-row" key={pr.id_prioridad}>
                    <div className="dash-breakdown-meta">
                      <span className="dash-breakdown-name">
                        <span className={`dash-badge ${badgeClass}`}>{pr.prioridad}</span>
                        <span className="dash-meta-sub">Meta: {hasTarget ? `${pr.objetivo_horas}h` : "—"}</span>
                      </span>
                      <span className="dash-breakdown-stat" style={{ color: hasData ? (isWithinSla ? "#059669" : "#dc2626") : "#94a3b8" }}>
                        {hasData ? `${pr.horas_promedio}h prom.` : "Sin resueltas"}
                        <span className="dash-breakdown-pct">({pr.total_resueltas} resueltas)</span>
                      </span>
                    </div>
                    <div className="dash-progress-track">
                      <div
                        className="dash-progress-fill"
                        style={{ width: `${width}%`, background: isWithinSla ? "#10b981" : "#ef4444" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FILA 2 - Panel Derecho (50%): Intervenciones por Personal Técnico (4 técnicos alineados a la par) */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3>
                  <Icon name="tool" size={18} />
                  Intervenciones por Personal Técnico
                </h3>
                <span className="dash-card-subtitle">
                  Distribución operativa entre el equipo técnico (4 especialistas)
                </span>
              </div>
              <div className="dash-card-header-badge">
                <span className="dash-header-pill">4 Técnicos</span>
              </div>
            </div>
            <div className="dash-breakdown-equal-grid">
              {technicianRows.map((tec, index) => (
                <div className="dash-breakdown-row" key={tec?.id_tecnico ?? `slot-${index}`}>
                  <div className="dash-breakdown-meta">
                    <span className="dash-breakdown-name">
                      <span className="dash-tec-avatar">{tec?.tecnico_nombre ? tec.tecnico_nombre[0] : "–"}</span>
                      <strong className="dash-tec-name" style={tec ? undefined : { color: "#94a3b8" }}>
                        {tec ? `${tec.tecnico_nombre} ${tec.tecnico_apellido}` : "Sin técnico"}
                      </strong>
                    </span>
                    <span className="dash-breakdown-stat">
                      {tec ? tec.total_intervenciones : 0} intervenciones
                      <span className="dash-breakdown-pct">({tec?.porcentaje ?? 0}%)</span>
                    </span>
                  </div>
                  <div className="dash-progress-track">
                    <div
                      className="dash-progress-fill fill-purple"
                      style={{ width: `${tec?.porcentaje ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILA 3 - Panel Izquierdo (50%): Top Insumos Consumidos (5 items) */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3>
                  <Icon name="box" size={18} />
                  Top Insumos Más Utilizados en Mantenimiento
                </h3>
                <span className="dash-card-subtitle">
                  Rotación y costo acumulado neto (descontando devoluciones)
                </span>
              </div>
              <div className="dash-card-header-badge">
                <span className="dash-header-pill">Mayor Rotación</span>
              </div>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Categoría</th>
                    <th className="text-right">Consumo</th>
                    <th className="text-right">Costo Total</th>
                    <th className="text-center">Intervenciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario?.top_insumos?.map((item) => (
                    <tr key={item.id_insumo}>
                      <td><strong>{item.insumo}</strong></td>
                      <td><span className="dash-badge badge-normal">{item.categoria}</span></td>
                      <td className="text-right">{item.total_consumido}</td>
                      <td className="text-right">${Number(item.costo_total).toLocaleString()}</td>
                      <td className="text-center">{item.intervenciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FILA 3 - Panel Derecho (50%): Insumos Bajo Stock Mínimo (5 items alineados) */}
        <div className="dash-col-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-header-text">
                <h3 style={{ color: "#b91c1c" }}>
                  <Icon name="alertTriangle" size={18} />
                  Insumos Bajo Stock Mínimo
                </h3>
                <span className="dash-card-subtitle">
                  Artículos en umbral crítico que requieren reposición inmediata
                </span>
              </div>
              <div className="dash-card-header-badge">
                <button
                  type="button"
                  className="dash-header-action-btn"
                  onClick={() => openDrilldown("insumos_bajo_stock", "Catálogo Bajo Stock Mínimo")}
                  title="Abrir catálogo completo con detalle de insumos críticos"
                >
                  Ver catálogo ({inventario?.insumos_bajo_stock?.length || 0}) ↗
                </button>
              </div>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th className="text-right">Stock Actual</th>
                    <th className="text-right">Mínimo</th>
                    <th className="text-right">Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario?.insumos_bajo_stock?.map((ins) => (
                    <tr key={ins.id_insumo}>
                      <td>
                        <strong>{ins.nombre}</strong>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{ins.categoria}</div>
                      </td>
                      <td className="text-right" style={{ color: "#dc2626", fontWeight: 700 }}>
                        {ins.stock}
                      </td>
                      <td className="text-right">{ins.stock_minimo}</td>
                      <td className="text-right" style={{ color: "#d97706", fontWeight: 600 }}>
                        +{ins.faltante}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          Modal de Drilldown (Detalle, Búsqueda y Trazabilidad a otras pestañas)
          -------------------------------------------------------------------- */}
      {drilldown.open && (
        <Modal
          title={drilldown.title}
          description={`Visualizando ${filteredDrilldownRows.length} de ${drilldown.rows.length} registros`}
          onClose={() => setDrilldown({ open: false, title: "", type: "", rows: [], searchTerm: "" })}
        >
          <div className="dash-modal-controls">
            <input
              type="search"
              className="dash-modal-search"
              placeholder="Buscar en estos registros…"
              value={drilldown.searchTerm}
              onChange={(e) => setDrilldown((prev) => ({ ...prev, searchTerm: e.target.value }))}
            />
            {onNavigate && (
              <button
                type="button"
                className="secondary"
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={() => {
                  setDrilldown({ open: false, title: "", type: "", rows: [], searchTerm: "" });
                  onNavigate("incidents");
                }}
              >
                Ir a la pantalla de Incidencias ↗
              </button>
            )}
          </div>

          <div className="dash-modal-table-wrap">
            <table className="dash-table">
              <thead>
                {drilldown.type === "insumos_bajo_stock" ? (
                  <tr>
                    <th>Insumo</th>
                    <th>Categoría</th>
                    <th className="text-right">Stock Actual</th>
                    <th className="text-right">Stock Mínimo</th>
                    <th className="text-right">Faltante</th>
                    <th className="text-right">Costo Unitario</th>
                  </tr>
                ) : drilldown.type === "intervenciones_realizadas" ? (
                  <tr>
                    <th>#</th>
                    <th>Fecha Inicio</th>
                    <th>Incidencia Asociada</th>
                    <th>Personal Técnico</th>
                    <th>Resultado / Acción</th>
                    {onNavigate && <th className="text-center">Acción</th>}
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
                    {onNavigate && <th className="text-center">Acción</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredDrilldownRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      No se encontraron registros que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredDrilldownRows.map((r, i) => {
                    if (drilldown.type === "insumos_bajo_stock") {
                      return (
                        <tr key={r.id_insumo || i}>
                          <td><strong>{r.nombre}</strong></td>
                          <td><span className="dash-badge badge-normal">{r.categoria}</span></td>
                          <td className="text-right" style={{ color: "#dc2626", fontWeight: 700 }}>{r.stock}</td>
                          <td className="text-right">{r.stock_minimo}</td>
                          <td className="text-right" style={{ color: "#d97706", fontWeight: 600 }}>+{r.faltante}</td>
                          <td className="text-right">${Number(r.costo_unitario).toLocaleString()}</td>
                        </tr>
                      );
                    }

                    if (drilldown.type === "intervenciones_realizadas") {
                      return (
                        <tr key={r.id_intervencion || i}>
                          <td><strong>#{r.id_intervencion}</strong></td>
                          <td style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>{formatDateTime(r.fecha_inicio)}</td>
                          <td><strong>{r.incidencia_titulo}</strong></td>
                          <td>{r.tecnico_nombre} {r.tecnico_apellido}</td>
                          <td style={{ fontSize: "0.8rem", maxWidth: "260px" }}>{r.resultado}</td>
                          {onNavigate && (
                            <td className="text-center">
                              <button
                                type="button"
                                className="dash-table-btn"
                                onClick={() => {
                                  setDrilldown({ open: false, title: "", type: "", rows: [], searchTerm: "" });
                                  onNavigate("incidents");
                                }}
                                title="Abrir y editar en el módulo de incidencias"
                              >
                                Ver Incidencia ↗
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    }

                    return (
                      <tr key={r.id_incidencia || i}>
                        <td><strong>#{r.id_incidencia}</strong></td>
                        <td><strong>{r.titulo}</strong></td>
                        <td>{[r.edificio, r.unidad || r.espacio_comun].filter(Boolean).join(" - ") || "—"}</td>
                        <td>{r.tipo_incidencia}</td>
                        <td>
                          <span className={`dash-badge badge-${(r.prioridad || "normal").toLowerCase()}`}>
                            {r.prioridad}
                          </span>
                        </td>
                        <td>
                          <span
                            className="dash-status-dot"
                            style={{
                              display: "inline-block",
                              marginRight: "6px",
                              background: STATUS_COLORS[r.estado] || "#94a3b8",
                            }}
                          />
                          {r.estado}
                        </td>
                        <td>
                          {r.tecnico_nombre ? (
                            `${r.tecnico_nombre} ${r.tecnico_apellido}`
                          ) : (
                            <em style={{ color: "#94a3b8" }}>Sin asignar</em>
                          )}
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "#64748b", whiteSpace: "nowrap" }}>
                          {formatDateTime(r.fecha_reporte)}
                        </td>
                        {onNavigate && (
                          <td className="text-center">
                            <button
                              type="button"
                              className="dash-table-btn"
                              onClick={() => {
                                setDrilldown({ open: false, title: "", type: "", rows: [], searchTerm: "" });
                                onNavigate("incidents");
                              }}
                              title="Abrir y editar en el módulo de incidencias"
                            >
                              Gestionar ↗
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Total en este indicador: {drilldown.rows.length} registros
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => setDrilldown({ open: false, title: "", type: "", rows: [], searchTerm: "" })}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
