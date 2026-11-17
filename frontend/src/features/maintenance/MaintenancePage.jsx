import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { usePagination } from "../../hooks/usePagination";
import InsumoFormModal from "./InsumoFormModal";
import InsumoHistorialModal from "./InsumoHistorialModal";
import MovimientoFormModal from "./MovimientoFormModal";
import { formatQuantityUnit } from "./quantity";
import { Button, Checkbox, DataTable, Field, FilterBar, PageHeader, Pagination, RowActions, SearchInput, Select, StatusBadge, } from "../../components/ui";

const ESTADO_INSUMO = {
  bajo: {
    estado: "Stock bajo",
    tone: "warning",
    glyph: "triangle",
  },
  disponible: {
    estado: "Disponible",
    tone: "success",
    glyph: "check",
  },
};

const ESTILOS_PANTALLA = `
.acciones-insumos { flex-wrap: wrap; }
@media (min-width: 640px) {
  .acciones-insumos .ui-btn {
    white-space: nowrap;
    padding-inline: var(--space-2);
  }
}`;

const NOTA_CONSUMOS =
  "Los consumos se registran desde las intervenciones de cada incidencia.";

export default function MaintenancePage({ user }) {
  const puedeGestionar = ["ADMIN", "GESTOR"].includes(user?.rol);
  const { params } = useHashRoute();

  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [categoria, setCategoria] = useState("");
  const [bajoStock, setBajoStock] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const bajoStockDesdeUrl = params.bajo_stock === "true";

  useEffect(() => {
    if (bajoStockDesdeUrl) setBajoStock(true);
  }, [bajoStockDesdeUrl]);

  const { data: categorias = [], loading: cargandoCategorias, error: errorCategorias, reload: reloadCategorias,} = useQuery(
    (signal) => api(routes.maintenanceCategories, { signal }),
    []
  );

  const claveFiltros =
    `${busquedaAplicada.trim()}|${categoria}|${bajoStock}`;

  const { data, loading, error: errorCarga, reload, } = useQuery(async (signal) => {
    const filtros = new URLSearchParams();

    if (busquedaAplicada.trim()) {
      filtros.set("buscar", busquedaAplicada.trim());
    }
    if (categoria) filtros.set("categoria", categoria);
    if (bajoStock) filtros.set("bajo_stock", "true");

    const query = filtros.toString();

    return (
      await api(
        `${routes.maintenance}/insumos${query ? `?${query}` : ""}`,
        { signal }
      )
    ) ?? [];
  }, [claveFiltros]);

  const items = data ?? [];

  /* Paginación EN EL CLIENTE (F2-13b): filtro de SERVIDOR (la consulta no
   * cambia); el resetKey es la MISMA clave serializada de filtros y la
   * búsqueda aplicada (`claveFiltros` — el sembrado ?bajo_stock=true
   * también la cambia → página 1). Meta y EmptyState siguen con `items`.
   */
  const pag = usePagination(items, { resetKey: claveFiltros });

  /* Apertura de los tres modales del kit (F2-10b/10c): cada modal
   * gestiona SU carga, error y busy por dentro; selectedItem + modal son
   * el único estado compartido con la pantalla. */

  const categoriasFiltro = [...new Set([
    ...categorias.map((item) => item.nombre),
    ...items.map((item) => item.categoria),
  ])].filter(Boolean).sort();

  function openCreate() {
    if (!puedeGestionar) return;
    setSelectedItem(null);
    setModal("item");
  }

  function openEdit(item) {
    if (!puedeGestionar) return;
    setSelectedItem(item);
    setModal("item");
  }

  function openMovement(item) {
    if (!puedeGestionar) return;
    setSelectedItem(item);
    setModal("movement");
  }

  function openHistory(item) {
    if (!puedeGestionar) return;
    setSelectedItem(item);
    setModal("history");
  }

  const hayFiltros = Boolean(busquedaAplicada.trim() || categoria || bajoStock);
  const vacioReal = !loading && !hayFiltros && items.length === 0;
  const conStockBajo = items.filter((item) => item.bajo_stock).length;

  const meta =
    !loading && items.length > 0
      ? `${items.length} ${items.length === 1 ? "insumo" : "insumos"} · ${conStockBajo} con stock bajo`
      : undefined;

  const triggerNuevo = puedeGestionar ? (
    <Button onClick={openCreate}>Nuevo insumo</Button>
  ) : null;

  const columns = [
    {
      key: "insumo",
      header: "Insumo",
      cellClassName: "inventory-item-cell",
      render: (row) => (
        <div className="inventory-item">
          <strong>{row.nombre}</strong>
          {row.descripcion && (
            <span className="inventory-item-description">
              {row.descripcion}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
    },
    {
      key: "stock",
      header: "Existencia",
      align: "right",
      width: "calc(var(--space-12) * 3)",
      render: (row) =>
        formatQuantityUnit(row.stock, row.unidad_medida),
    },
    {
      key: "stock_minimo",
      header: "Stock mínimo",
      align: "right",
      width: "calc(var(--space-12) * 3)",
      render: (row) =>
        formatQuantityUnit(row.stock_minimo, row.unidad_medida),
    },
    {
      key: "estado",
      header: "Estado",
      width: "calc(var(--space-12) * 3)",
      render: (row) => {
        const badge = row.bajo_stock
          ? ESTADO_INSUMO.bajo
          : ESTADO_INSUMO.disponible;

        return (
          <StatusBadge
            estado={badge.estado}
            tone={badge.tone}
            glyph={badge.glyph}
          />
        );
      },
    },
    ...(puedeGestionar
      ? [{
          key: "acciones",
          header: "Acciones",
          cellClassName: "mobile-actions-cell",
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
                {
                  label: "Editar",
                  ariaLabel: `Editar insumo ${row.nombre}`,
                  onSelect: () => openEdit(row),
                },
                {
                  label: "Registrar movimiento",
                  ariaLabel: `Registrar movimiento del insumo ${row.nombre}`,
                  onSelect: () => openMovement(row),
                },
              ]}
            />
          ),
        }]
      : []),
  ];

  return (
    <section className="mobile-management-page">
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
          onClear={() => {
            setBusqueda("");
            setBusquedaAplicada("");
          }}
          placeholder="Nombre o descripción"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setBusquedaAplicada(busqueda);
            }
          }}
        />

        <Field label="Categoría">
          <Select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
          >
            <option value="">Todas</option>
            {categoriasFiltro.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Stock bajo">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "var(--control-h)",
            }}
          >
            <Checkbox
              checked={bajoStock}
              onChange={(event) => setBajoStock(event.target.checked)}
            />
          </div>
        </Field>

        <Button
          variant="quiet"
          disabled={loading}
          onClick={reload}
        >
          Actualizar
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pag.pageRows}
        rowKey={(row) => row.id_insumo}
        caption="Listado de insumos"
        loading={loading}
        error={errorCarga || errorCategorias}
        onRetry={() => {
          reload();
          reloadCategorias();
        }}
        emptyTitle={
          hayFiltros
            ? "No hay insumos que coincidan."
            : "No hay insumos"
        }
        emptyDescription={
          hayFiltros
            ? "Ajusta la búsqueda o los filtros para ver resultados."
            : NOTA_CONSUMOS
        }
        emptyAction={vacioReal ? triggerNuevo : undefined}
      />
      <Pagination
        page={pag.page}
        pageCount={pag.pageCount}
        total={pag.total}
        from={pag.from}
        to={pag.to}
        onPrev={pag.goPrev}
        onNext={pag.goNext}
        label="Paginación de insumos"
      />

      {puedeGestionar && modal === "item" && (
        <InsumoFormModal
          insumo={selectedItem}
          categorias={categorias}
          cargandoCategorias={cargandoCategorias}
          onClose={() => setModal(null)}
          onGuardado={reload}
        />
      )}

      {puedeGestionar && modal === "movement" && selectedItem && (
        <MovimientoFormModal
          insumo={selectedItem}
          onClose={() => setModal(null)}
          onGuardado={reload}
        />
      )}

      {puedeGestionar && modal === "history" && selectedItem && (
        <InsumoHistorialModal
          insumo={selectedItem}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}