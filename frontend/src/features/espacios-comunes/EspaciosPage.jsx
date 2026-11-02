/* F2-7b — Espacios comunes + subvista de Políticas POR HASH (B6).
 * Cambio del listado: pasa de CrudPage modo ui (F2-7a) a composición del
 * kit (patrón Residentes, F2-6b), para cumplir el fix del dueño SIN tocar
 * CrudPageUi: el campo "Activo" NO existe en la creación (el POST no lo
 * acepta; el registro nace activo) y SÍ en la edición (PATCH con activo),
 * literal "fields según modo" (un solo EspacioFormModal con fields por
 * modo). Paridad idéntica a F2-7a: GET/POST /common-spaces y PATCH
 * /common-spaces/:id; sin eliminar; búsqueda por nombre/capacidad/
 * edificio; estado con StatusBadge override ACTIVA/INACTIVA; sin columna
 * ID; "Detalle" con el GET anidado + Modal + DefinitionList.
 * B6: la subvista se controla con useHashRoute sobre #/espacios
 * (param politicas=<id>) — el botón "Políticas" hace navigate y "Volver a
 * espacios" navega sin param; F5 conserva la subvista y "Atrás" del
 * navegador regresa al listado; id inexistente o inválido → EmptyState
 * con "Volver a espacios". Al entrar, el foco va al h1 de Políticas; al
 * volver, al contenedor del listado (el botón "Políticas" de la fila no
 * es trivial de ubicar desde la página). Los modales de la subvista no se
 * persisten en la URL (decisión del dueño). */
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useHashRoute } from "../../hooks/useHashRoute";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { validate, espacioCrear } from "../../validations";
import {
  Button,
  Checkbox,
  DataTable,
  DefinitionList,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  FormModal,
  Input,
  Modal,
  PageHeader,
  RowActions,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  useToast,
} from "../../components/ui";
import SpacePolicies from "./SpacePolicies";

const DESCRIPCION = "Administra los espacios comunes del condominio.";

/* Mismos criterios de búsqueda que F2-7a (columnas declaradas, sin la
 * booleana `activo`). */
const CAMPOS_BUSQUEDA = ["nombre", "capacidad", "edificio"];

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

/* Modal de CREAR/EDITAR: fields según modo (crear SIN "activo", editar
 * CON él). Paridad del legado: primeros datos de la fila, strings con
 * trim, descripción vacía → null (nullable), Number para
 * capacidad/edificio. Convención §8-bis: error de la acción DENTRO del
 * FormModal (err.errors → errores por campo directos al Field, lección
 * F2-5b), foco al primer inválido, cierre bloqueado en busy, éxito por
 * Toast del padre. */
function EspacioFormModal({ espacio, onClose, onGuardado }) {
  const esEdicion = Boolean(espacio);
  const notify = useToast();
  const [form, setForm] = useState(() => ({
    nombre: espacio?.nombre ?? "",
    descripcion: espacio?.descripcion ?? "",
    capacidad: espacio?.capacidad ?? "",
    id_edificio:
      espacio?.id_edificio === undefined || espacio?.id_edificio === null
        ? ""
        : String(espacio.id_edificio),
    ...(esEdicion ? { activo: Boolean(espacio.activo) } : {}),
  }));
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada intento fallido: mueve el foco al PRIMER
   * control inválido del modal (los Field reparten aria-invalid). */
  const [intento, setIntento] = useState(0);

  /* Catálogo de edificios (GET /buildings, el mismo del legado). El modal
   * se monta SOLO al abrir: el fetch no dispara al cargar la pantalla. */
  const {
    data: edificiosData,
    loading: cargandoEdificios,
    error: errorEdificios,
    reload: recargarEdificios,
  } = useQuery((signal) => api(routes.buildings, { signal }), []);
  const edificios = edificiosData ?? [];

  const guardando = useMutation((body) =>
    esEdicion
      ? api(`${routes.commonSpaces}/${espacio.id_espacio_comun}`, {
          method: "PATCH",
          body,
        })
      : api(routes.commonSpaces, { method: "POST", body })
  );
  const busy = guardando.busy;

  /* El error por campo se LIMPIA al editar ese campo. */
  const actualizar = (campo) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [campo]: value }));
    setCamposErr((current) => {
      if (!current || !(campo in current)) return current;
      const { [campo]: omitido, ...resto } = current;
      return resto;
    });
  };

  useEffect(() => {
    if (intento === 0) return;
    document.querySelector(".ui-modal-body .ui-control-invalid")?.focus();
  }, [intento]);

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Espejo exacto de SpaceCreateSchema (sin `activo`, también para la
     * edición: el checkbox no tiene regla). */
    const erroresCampos = validate(form, espacioCrear);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0) return;

    /* Payload IDÉNTICO al legado: strings con trim, descripción vacía →
     * null, capacidad/edificio Number; SIN "activo" al crear y CON él al
     * editar. */
    const body = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      capacidad: Number(form.capacidad),
      id_edificio: Number(form.id_edificio),
    };
    if (esEdicion) body.activo = Boolean(form.activo);

    try {
      await guardando.run(body);
      onClose();
      notify(esEdicion ? "Cambios guardados." : "Espacio creado.");
      await onGuardado?.();
    } catch (err) {
      setAccionError(err?.message ?? "No se pudo guardar el espacio.");
      if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      setIntento((current) => current + 1);
    }
  }

  const deshabilitado = busy || cargandoEdificios;

  return (
    <FormModal
      title={esEdicion ? "Editar espacio" : "Nuevo espacio"}
      description={esEdicion ? `Espacio: ${espacio.nombre}` : undefined}
      open
      busy={busy}
      error={accionError || undefined}
      showRequiredNote
      onSubmit={guardar}
      onClose={onClose}
    >
      {errorEdificios && !edificiosData ? (
        <ErrorState
          title="No se pudieron cargar los edificios"
          description={errorEdificios.message}
          onRetry={recargarEdificios}
        />
      ) : (
        <div className="ui-form-stack">
          <Field label="Nombre" required error={camposErr?.nombre}>
            <Input
              name="nombre"
              autoComplete="off"
              maxLength={150}
              value={form.nombre}
              onChange={actualizar("nombre")}
              disabled={deshabilitado}
            />
          </Field>
          <Field
            label="Capacidad"
            required
            error={camposErr?.capacidad}
            help="Cantidad de personas para reservas."
          >
            <Input
              type="number"
              name="capacidad"
              autoComplete="off"
              value={form.capacidad}
              onChange={actualizar("capacidad")}
              disabled={deshabilitado}
            />
          </Field>
          <Field
            label="Edificio"
            required
            error={camposErr?.id_edificio}
            help={
              edificiosData && edificios.length === 0
                ? "No hay edificios registrados."
                : undefined
            }
          >
            <Select
              name="id_edificio"
              autoComplete="off"
              value={form.id_edificio}
              onChange={actualizar("id_edificio")}
              disabled={deshabilitado}
            >
              <option value="">Seleccionar...</option>
              {edificios.map((edificio) => (
                <option key={edificio.id_edificio} value={edificio.id_edificio}>
                  {edificio.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Descripción"
            error={camposErr?.descripcion}
            help="Opcional, hasta 1000 caracteres."
          >
            <Textarea
              name="descripcion"
              autoComplete="off"
              maxLength={1000}
              rows={3}
              value={form.descripcion}
              onChange={actualizar("descripcion")}
              disabled={deshabilitado}
            />
          </Field>
          {esEdicion && (
            <Checkbox
              label="Activo"
              name="activo"
              autoComplete="off"
              checked={Boolean(form.activo)}
              disabled={busy}
              onChange={(event) =>
                setForm((current) => ({ ...current, activo: event.target.checked }))
              }
            />
          )}
        </div>
      )}
    </FormModal>
  );
}

/* "Ver detalle" del legado, al kit (desde F2-7a, sin cambios): GET
 * anidado con signal, Skeleton/ErrorState solo SIN datos, un solo h2 (el
 * título del Modal), footer solo "Cerrar". Sin datos horarios (no aplica
 * formatTime). */
function EspacioDetalleModal({ espacio, onClose }) {
  const { data: detail, loading, error, reload } = useQuery(
    async (signal) =>
      api(`${routes.commonSpaces}/${espacio.id_espacio_comun}`, { signal }),
    [espacio.id_espacio_comun]
  );

  return (
    <Modal
      title={detail ? detail.nombre : "Detalle del espacio"}
      onClose={onClose}
      footer={<Button variant="quiet" onClick={onClose}>Cerrar</Button>}
    >
      {loading && !detail && <Skeleton lines={6} />}

      {!loading && error && !detail && (
        <ErrorState
          title="No se pudo cargar el detalle"
          description={error.message}
          onRetry={() => reload()}
        />
      )}

      {detail && (
        <DefinitionList
          items={[
            {
              term: "Estado",
              detail: detail.activo ? (
                <StatusBadge estado="ACTIVA" tone="success" glyph="check" />
              ) : (
                <StatusBadge estado="INACTIVA" tone="muted" />
              ),
            },
            { term: "Capacidad", detail: detail.capacidad },
            { term: "Edificio", detail: detail.edificio },
            ...(detail.descripcion
              ? [{ term: "Descripción", detail: detail.descripcion }]
              : []),
          ]}
        />
      )}
    </Modal>
  );
}

export default function EspaciosPage() {
  const { params, navigate } = useHashRoute();

  /* Listado con signal; en la SUBVISTA (#/espacios?politicas=...) la
   * consulta queda inactiva y vuelve a consultar al regresar. */
  const { data, loading, error, reload } = useQuery(
    (signal) => api(routes.commonSpaces, { signal }),
    [],
    { enabled: params.politicas === undefined }
  );
  const filas = data ?? [];

  const [search, setSearch] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);

  /* Subvista de Políticas (B6): #/espacios?politicas=<id>, leído del
   * hash. Id ausente para el listado; inválido (no numérico/fuera de
   * rango) → SpacePolicies muestra EmptyState. */
  const politicasParam = params.politicas;
  const politicasId = politicasParam === undefined ? null : Number(politicasParam);
  const politicasValidas =
    politicasId !== null && Number.isInteger(politicasId) && politicasId >= 1;

  /* Foco al VOLVER de la subvista: el botón "Políticas" de la fila
   * original no es trivial de ubicar desde la pantalla → foco al
   * contenedor del listado (regla del dueño). */
  const seccionRef = useRef(null);
  const vuelveDePoliticas = useRef(false);
  useEffect(() => {
    if (politicasParam !== undefined) {
      vuelveDePoliticas.current = true;
      return;
    }
    if (!vuelveDePoliticas.current) return;
    vuelveDePoliticas.current = false;
    seccionRef.current?.focus();
  }, [politicasParam]);

  /* Búsqueda en cliente por las columnas declaradas (insensible a
   * mayúsculas), igual que CrudPageUi en F2-7a. */
  const coincidencia = search.trim().toLocaleLowerCase();
  const visibles = useMemo(() => {
    if (!coincidencia) return filas;
    return filas.filter((fila) =>
      CAMPOS_BUSQUEDA.some((campo) =>
        String(fila[campo] ?? "")
          .toLocaleLowerCase()
          .includes(coincidencia)
      )
    );
  }, [filas, coincidencia]);
  const sinCoincidencia =
    !loading && !error && filas.length > 0 && visibles.length === 0;

  if (politicasParam !== undefined) {
    return (
      <SpacePolicies
        idEspacio={politicasValidas ? politicasId : null}
        onVolver={() => navigate("/espacios")}
      />
    );
  }

  const conteo = loading
    ? undefined
    : `${visibles.length} espacio${visibles.length === 1 ? "" : "s"}`;
  const meta = [DESCRIPCION, conteo].filter(Boolean).join(" · ") || undefined;

  /* Única instancia del trigger: en PageHeader con datos y, si no hay
   * espacios, dentro del EmptyState (patrón Residentes/Mis reservas). */
  const triggerNuevo = (
    <Button disabled={loading} onClick={() => setNuevo(true)}>
      Nuevo espacio
    </Button>
  );

  const columns = [
    { key: "nombre", header: "Nombre", render: (fila) => fila.nombre ?? "—" },
    {
      key: "capacidad",
      header: "Capacidad",
      render: (fila) => fila.capacidad ?? "—",
    },
    {
      key: "edificio",
      header: "Edificio",
      render: (fila) => fila.edificio ?? "—",
    },
    {
      /* `estado` no existe en la fila (el flag real es booleano `activo`):
       * presentación con el override ya verificado en F2-7a. */
      key: "estado",
      header: "Estado",
      render: (fila) =>
        fila.activo ? (
          <StatusBadge estado="ACTIVA" tone="success" glyph="check" />
        ) : (
          <StatusBadge estado="INACTIVA" tone="muted" />
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      width: "calc(var(--space-12) * 4)",
      render: (fila) => (
        <RowActions
          actions={[
            {
              label: "Editar",
              ariaLabel: `Editar espacio ${fila.nombre}`,
              onSelect: () => setEditando(fila),
            },
            {
              label: "Detalle",
              ariaLabel: `Ver detalle de ${fila.nombre}`,
              onSelect: () => setDetalle(fila),
            },
            {
              label: "Políticas",
              ariaLabel: `Ver políticas de reserva de ${fila.nombre}`,
              onSelect: () =>
                navigate("/espacios", { politicas: fila.id_espacio_comun }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <section ref={seccionRef} tabIndex={-1}>
      <PageHeader
        title="Espacios comunes"
        meta={meta}
        actions={!loading && filas.length === 0 ? null : triggerNuevo}
      />

      <FilterBar>
        <SearchInput
          label="Buscar en espacios comunes"
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Buscar registros..."
        />
        <Button variant="quiet" disabled={loading} onClick={reload}>
          Actualizar
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visibles}
        rowKey={(fila) => fila.id_espacio_comun}
        caption="Listado de espacios comunes"
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={
          sinCoincidencia ? "No hay espacios que coincidan." : "No hay espacios"
        }
        emptyDescription={
          sinCoincidencia
            ? "Ajusta la búsqueda para ver resultados."
            : "Crea el primer espacio común."
        }
        emptyAction={sinCoincidencia ? undefined : triggerNuevo}
      />

      {nuevo && (
        <EspacioFormModal onClose={() => setNuevo(false)} onGuardado={reload} />
      )}

      {editando && (
        <EspacioFormModal
          espacio={editando}
          onClose={() => setEditando(null)}
          onGuardado={reload}
        />
      )}

      {detalle && (
        <EspacioDetalleModal espacio={detalle} onClose={() => setDetalle(null)} />
      )}
    </section>
  );
}
