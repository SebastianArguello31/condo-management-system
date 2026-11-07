/* Insumos — F2-10c (shell y listado al kit en F2-10a; "Nuevo/Editar
 * insumo" a FormModal en F2-10b; "Registrar movimiento" e "Historial"
 * al kit en F2-10c). La pantalla mantiene el contrato `({ user })` de la
 * ruta #/insumos (roles ADMIN/TECNICO, sin cambios en routing). Paridad
 * conservada: GET /maintenance/insumos con filtros de SERVIDOR
 * buscar/categoria/bajo_stock (vacíos omitidos), catálogo de categorías
 * consultado desde /maintenance/categories, el "Nuevo insumo" solo
 * para ADMIN, los payloads POST/PATCH del insumo intactos (en
 * InsumoFormModal.jsx) y los POST de movimiento en
 * MovimientoFormModal.jsx (ruta /entradas|/salidas según el tipo, y
 * GET /insumos/:id/movimientos?tipo= en InsumoHistorialModal.jsx).
 * Cambios respecto al legado (F2-10a): PageHeader sin eyebrow con meta
 * mono de UNA línea "N insumos · M con stock bajo" (la descripción larga
 * NO va en el encabezado — la nota de consumos vive SOLO en el
 * EmptyState sin datos), FilterBar sin botón "Filtrar" (Buscar aplica
 * con Enter; Categoría y Stock bajo consultan al cambiar; vacíos
 * omitidos), "Actualizar" = reload() que conserva datos previos (sin
 * parpadeo), sembrado ?bajo_stock=true desde el hash (nunca se escribe
 * de vuelta), DataTable SIN columna ID, Existencia y Stock mínimo
 * alineadas a la derecha con formatQuantityUnit (helpers compartidos en
 * ./quantity, misma lógica exacta), Estado con StatusBadge override de
 * módulo, "Movimientos" renombrado a "Historial" y Entrada/Salida
 * unificados en "Registrar movimiento" (abre MovimientoFormModal con
 * ENTRADA por defecto). Cambios de F2-10b: "Nuevo/Editar insumo" en
 * InsumoFormModal (el FormModal gestiona SU error/busy por dentro).
 * Cambios de F2-10c: el estado compartido busy/error de la pantalla y
 * los modales legados de MOVIMIENTO/HISTORIAL (mg-form-*) fueron
 * RETIRADOS — el nuevo MovimientoFormModal valida con `movimientoCrear`
 * y muestra los 400 del backend DENTRO del modal; InsumoHistorialModal
 * es un Modal de LECTURA con useQuery + Timeline (Skeleton/ErrorState
 * locales, Sin busy global) y su Toast de éxito es "Movimiento
 * registrado." (decisión F2-10c; el legado decía "Movimiento registrado
 * y stock actualizado."). Helper local formatQuantity/formatDate
 * REMOVIDOS (ahora ./quantity y el historial usa formatDateTime). */
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import InsumoFormModal from "./InsumoFormModal";
import InsumoHistorialModal from "./InsumoHistorialModal";
import MovimientoFormModal from "./MovimientoFormModal";
import { formatQuantityUnit } from "./quantity";
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
} from "../../components/ui";

/* Override del Estado de módulo (convención §8-bis: nunca color solo). */
const ESTADO_INSUMO = {
  bajo: { estado: "Stock bajo", tone: "warning", glyph: "triangle" },
  disponible: { estado: "Disponible", tone: "success", glyph: "check" },
};

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

export default function MaintenancePage({ user }) {
  const isAdmin = user.rol === "ADMIN";
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

  /* El catálogo se administra en su pantalla de configuración. El backend
   * entrega las categorías activas al técnico y todas al administrador. */
  const {
    data: categorias = [],
    loading: cargandoCategorias,
    error: errorCategorias,
    reload: reloadCategorias,
  } = useQuery((signal) => api(routes.maintenanceCategories, { signal }), []);

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

    return filas;
  }, [claveFiltros]);

  const items = data ?? [];
  const categoriasFiltro = [...new Set([
    ...categorias.map((item) => item.nombre),
    ...items.map((item) => item.categoria),
  ])].filter(Boolean).sort();

  /* Apertura de los tres modales del kit (F2-10b/10c): cada modal
   * gestiona SU carga, error y busy por dentro; selectedItem + modal son
   * el único estado compartido con la pantalla. */
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  function openCreate() {
    setSelectedItem(null);
    setModal("item");
  }

  function openEdit(item) {
    setSelectedItem(item);
    setModal("item");
  }

  /* El tipo por defecto (ENTRADA) lo define MovimientoFormModal. */
  function openMovement(item) {
    setSelectedItem(item);
    setModal("movement");
  }

  function openHistory(item) {
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
                    onSelect: () => openMovement(row),
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
            {categoriasFiltro.map((value) => (
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
        error={errorCarga || errorCategorias}
        onRetry={() => { reload(); reloadCategorias(); }}
        emptyTitle={hayFiltros ? "No hay insumos que coincidan." : "No hay insumos"}
        emptyDescription={hayFiltros ? "Ajusta la búsqueda o los filtros para ver resultados." : NOTA_CONSUMOS}
        emptyAction={vacioReal ? triggerNuevo : undefined}
      />

      {modal === "item" && (
        <InsumoFormModal
          insumo={selectedItem}
          categorias={categorias}
          cargandoCategorias={cargandoCategorias}
          onClose={() => setModal(null)}
          onGuardado={reload}
        />
      )}

      {modal === "movement" && selectedItem && (
        <MovimientoFormModal
          insumo={selectedItem}
          onClose={() => setModal(null)}
          onGuardado={reload}
        />
      )}

      {modal === "history" && selectedItem && (
        <InsumoHistorialModal insumo={selectedItem} onClose={() => setModal(null)} />
      )}
    </section>
  );
}
