/* ResidentsPage — F2-6b: Residentes al kit (ADMIN). Reemplaza al shell
 * legado (mg-* / residents) y RETIRA los consumidores de CreateAccount y
 * ResidentUnits (ambos archivos se eliminan; B2/B3 cierran en el crear del
 * kit, B5 en el modal de unidades).
 * Paridad con el legado:
 * - Listado GET /residents (una fila POR UNIDAD vinculada): fila por
 *   residente con deduplicado conservando la PRIMERA (el backend ordena
 *   por apellido, nombre y código de unidad); columnas Residente, Email,
 *   Teléfono, Unidades (conteo calculado del grupo), Estado y Acciones.
 * - Búsqueda en cliente por nombre, apellido, email y teléfono Y por
 *   unidad/edificio (evaluada contra TODAS las filas del residente; el
 *   placeholder lo promete), con botón "Actualizar" como la FilterBar de
 *   CrudPageUi.
 * - Crear con "Unidad inicial" (POST /residents con id_unidad Number;
 *   409 de vínculo duplicado mostrado DENTRO del modal) →
 *   ResidentCreateModal; "Ver unidades" → ResidentUnitsModal (:id/units).
 * - Activar/Desactivar: PATCH /residents/:id {activo} (mismo endpoint y
 *   payload del legado) con useConfirm (danger SOLO al desactivar),
 *   useMutation con dedupe y Toast; error por Toast danger.
 * Cambios por convención (§8-bis): PageHeader con meta de conteo,
 * useQuery con signal (Skeleton/ErrorState/EmptyState sin parpadeo),
 * DataTable sin columna ID, estado con StatusBadge override ACTIVA/
 * INACTIVA (estadoCuenta, única fuente de F2-6a), acciones con RowActions
 * y botón de crear solo texto. EmptyState DISTINTO para búsqueda sin
 * resultados y para sin residentes (cero window.confirm; español neutro).
 */
import { useMemo, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { usePagination } from "../../hooks/usePagination";
import {
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  Pagination,
  RowActions,
  SearchInput,
  StatusBadge,
  useToast,
} from "../../components/ui";
import { estadoCuenta } from "./AccountDetailModal";
import ResidentCreateModal from "./ResidentCreateModal";
import ResidentUnitsModal from "./ResidentUnitsModal";

const DESCRIPCION =
  "Administra las cuentas y unidades vinculadas de cada residente.";

const nombreCompleto = (registro) =>
  [registro?.nombre, registro?.apellido].filter(Boolean).join(" ") || "—";

/* Búsqueda en cliente por nombre/apellido/email/teléfono + la unidad y el
 * edificio de TODAS las filas del residente (paridad del placeholder del
 * legado). */
const coincide = (grupo, aguja) =>
  [
    grupo.fila.nombre,
    grupo.fila.apellido,
    grupo.fila.email,
    grupo.fila.telefono,
    grupo.unidadesTexto,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
    .includes(aguja);

export default function ResidentsPage() {
  /* Una sola consulta con signal: el dedupe y el conteo se calculan en
   * cliente; reload() conserva datos (sin titilar). */
  const { data, loading, error, reload } = useQuery(
    (signal) => api(routes.residents, { signal }),
    []
  );
  const filas = data ?? [];

  const [search, setSearch] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [verUnidades, setVerUnidades] = useState(null);
  const notify = useToast();
  const confirm = useConfirm();

  const alternarCuenta = useMutation((fila) =>
    api(`${routes.residents}/${fila.id_usuario}`, {
      method: "PATCH",
      body: { activo: !fila.activo },
    })
  );

  async function alternar(fila) {
    if (alternarCuenta.busy) return;
    const ok = await confirm({
      title: fila.activo ? "Desactivar cuenta" : "Activar cuenta",
      message: `Se ${
        fila.activo ? "desactivará" : "activará"
      } la cuenta de ${nombreCompleto(fila)}.${
        fila.activo ? " No podrá iniciar sesión mientras esté inactiva." : ""
      }`,
      confirmLabel: fila.activo ? "Desactivar" : "Activar",
      danger: Boolean(fila.activo),
    });
    if (!ok) return;
    try {
      await alternarCuenta.run(fila);
      notify(fila.activo ? "Cuenta desactivada." : "Cuenta activada.");
      await reload();
    } catch (err) {
      notify(err.message || "No se pudo actualizar la cuenta.", {
        tone: "danger",
      });
    }
  }

  /* Fila por RESIDENTE (el API trae una por unidad): primera fila del
   * grupo + conteo de unidades + texto de búsqueda con TODAS las filas
   * del grupo (unidad/edificio de cada una). */
  const residentes = useMemo(() => {
    const grupos = new Map();
    filas.forEach((fila) => {
      const texto = [fila.unidad, fila.edificio].filter(Boolean).join(" ");
      const grupo = grupos.get(fila.id_usuario);
      if (grupo) {
        grupo.cantidad += 1;
        if (texto) grupo.unidadesTexto = `${grupo.unidadesTexto} ${texto}`;
      } else {
        grupos.set(fila.id_usuario, { fila, cantidad: 1, unidadesTexto: texto });
      }
    });
    return [...grupos.values()];
  }, [filas]);

  const coincidencia = search.trim().toLocaleLowerCase();
  const visibles = useMemo(() => {
    if (!coincidencia) return residentes;
    return residentes.filter((grupo) => coincide(grupo, coincidencia));
  }, [residentes, coincidencia]);
  const sinCoincidencia =
    !loading && !error && filas.length > 0 && visibles.length === 0;

  /* Paginación EN EL CLIENTE (F2-13b): `visibles` ya está deduplicado y
   * filtrado (paginación DESPUÉS); el resetKey es la búsqueda. La meta
   * ("N residentes") sigue con `residentes` (total deduplicado). */
  const pag = usePagination(visibles, { resetKey: search });

  const conteo = loading
    ? undefined
    : `${residentes.length} residente${residentes.length === 1 ? "" : "s"}`;
  const meta = [DESCRIPCION, conteo].filter(Boolean).join(" · ") || undefined;

  const triggerNuevo = (
    <Button disabled={loading || alternarCuenta.busy} onClick={() => setNuevo(true)}>
      Nuevo residente
    </Button>
  );

  const columns = [
    {
      key: "residente",
      header: "Residente",
      render: (grupo) => nombreCompleto(grupo.fila),
    },
    { key: "email", header: "Email", render: (grupo) => grupo.fila.email ?? "—" },
    {
      key: "telefono",
      header: "Teléfono",
      render: (grupo) => grupo.fila.telefono || "—",
    },
    {
      key: "unidades",
      header: "Unidades",
      /* Conteo calculado del grupo de filas del residente. */
      render: (grupo) => grupo.cantidad,
    },
    {
      /* "estado" no existe en la fila (el flag real es `activo` booleano):
       * presentación con el override compartido de F2-6a. */
      key: "estado",
      header: "Estado",
      render: (grupo) => (
        <StatusBadge {...estadoCuenta(Boolean(grupo.fila.activo))} />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      width: "calc(var(--space-12) * 4)",
      render: (grupo) => (
        <RowActions
          actions={[
            {
              label: "Ver unidades",
              ariaLabel: `Unidades de ${nombreCompleto(grupo.fila)}`,
              onSelect: () => setVerUnidades(grupo),
            },
            {
              label: grupo.fila.activo ? "Desactivar" : "Activar",
              danger: Boolean(grupo.fila.activo),
              disabled: alternarCuenta.busy,
              ariaLabel: `${grupo.fila.activo ? "Desactivar" : "Activar"} la cuenta de ${nombreCompleto(grupo.fila)}`,
              onSelect: () => alternar(grupo.fila),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Residentes"
        meta={meta}
        /* Única instancia del trigger: en PageHeader con datos y, si no hay
         * residentes, dentro del EmptyState (como Mis reservas/CrudPageUi). */
        actions={!loading && filas.length === 0 ? null : triggerNuevo}
      />

      <FilterBar>
        <SearchInput
          label="Buscar en residentes"
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Buscar residente o unidad..."
        />
        <Button variant="quiet" disabled={loading} onClick={reload}>
          Actualizar
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pag.pageRows}
        rowKey={(grupo) => grupo.fila.id_usuario}
        caption="Listado de residentes"
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={sinCoincidencia ? "No hay residentes que coincidan." : "No hay residentes"}
        emptyDescription={
          sinCoincidencia
            ? "Ajusta la búsqueda para ver resultados."
            : "Crea la primera cuenta de residente."
        }
        emptyAction={sinCoincidencia ? undefined : triggerNuevo}
      />
      <Pagination
        page={pag.page}
        pageCount={pag.pageCount}
        total={pag.total}
        from={pag.from}
        to={pag.to}
        onPrev={pag.goPrev}
        onNext={pag.goNext}
        label="Paginación de residentes"
      />

      {nuevo && (
        <ResidentCreateModal
          onClose={() => setNuevo(false)}
          onCreated={reload}
        />
      )}

      {verUnidades && (
        <ResidentUnitsModal
          user={verUnidades.fila}
          onClose={() => setVerUnidades(null)}
          onChanged={reload}
        />
      )}
    </section>
  );
}
