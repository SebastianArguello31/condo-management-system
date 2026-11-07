import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { validate, reservaCrear } from "../../validations";
import { formatDate, formatTime } from "../../utils/format";
import {
  Alert,
  Button,
  DefinitionList,
  EmptyState,
  ErrorState,
  Field,
  FormModal,
  Input,
  Select,
  Textarea,
  useToast,
} from "../../components/ui";

/* F2-8b — "Nueva reserva" (CreateReservation) migrado a FormModal.
 * Misma consulta de disponibilidad (GET /common-spaces/:id/availability) al
 * cambiar espacio/fecha/tipo de evento, mismo POST /reservations (payload
 * idéntico al legado) y mismo contrato { spaces, events, onCreated } de Mis
 * reservas (onCreated = reload() del listado). Cambios de convención §2.18:
 * error de la acción DENTRO del modal (Alert danger con foco/scroll),
 * errores por campo (validate(form, reservaCrear) + err.errors normalizado),
 * éxito por Toast + cierre + onCreated, cierre bloqueado mientras busy y
 * cero window.confirm. Las reglas de negocio (solapamiento, horario de la
 * política, duración, anticipación, aforo) NO se duplican en cliente: el
 * backend responde 409 y el FormModal lo muestra. */

/* err.errors del backend trae ARRAYS por campo → string por campo. */
function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes) ? (mensajes[0] ?? "") : String(mensajes),
    ])
  );
}

export default function CreateReservation({ spaces, events, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  /* Se incrementa en cada intento fallido: mueve el foco al PRIMER control
   * inválido del modal (los Field reparten aria-invalid). */
  const [intento, setIntento] = useState(0);
  const notify = useToast();

  /* Disponibilidad: solo consulta con las 3 claves completas y el modal
   * abierto. useQuery aborta la consulta en vuelo y DESCARTA los datos
   * previos al cambiar una clave (equivalente al setAvailability(null) del
   * legado). El rango de fechas (≤31 días) lo valida el endpoint: aquí
   * siempre se consulta un solo día. */
  const completo = Boolean(
    form.id_espacio && form.fecha && form.id_tipo_evento
  );
  const {
    data: disponibilidad,
    loading: consultando,
    error: errorDisponibilidad,
    reload: recargarDisponibilidad,
  } = useQuery(
    (signal) => {
      const params = new URLSearchParams({
        fecha_inicio: form.fecha,
        fecha_fin: form.fecha,
      });
      if (form.id_tipo_evento) params.set("id_tipo_evento", form.id_tipo_evento);
      return api(
        `${routes.commonSpaces}/${form.id_espacio}/availability?${params}`,
        { signal }
      );
    },
    [open, form.id_espacio, form.fecha, form.id_tipo_evento],
    { enabled: open && completo }
  );

  const guardando = useMutation((body) =>
    api(routes.reservations, { method: "POST", body })
  );
  const busy = guardando.busy;

  /* El error por campo se LIMPIA al editar ese campo. Cambiar espacio,
   * fecha o tipo descarta la disponibilidad mostrada: useQuery aborta la
   * consulta en vuelo y descarta los datos previos al cambiar sus deps. */
  const actualizar = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setCamposErr((current) => {
      if (!current || !(name in current)) return current;
      const { [name]: omitido, ...resto } = current;
      return resto;
    });
  };

  useEffect(() => {
    if (intento === 0) return;
    document.querySelector(".ui-modal-body .ui-control-invalid")?.focus();
  }, [intento]);

  function abrir() {
    setForm({});
    setCamposErr(null);
    setAccionError("");
    setOpen(true);
  }

  function cerrar() {
    setOpen(false);
  }

  async function guardar() {
    if (busy) return;
    setAccionError("");

    /* Espejo exacto de ReservationCreateSchema. */
    const limpio = {
      ...form,
      observaciones: (form.observaciones || "").trim(),
    };
    const erroresCampos = validate(limpio, reservaCrear);
    setCamposErr(Object.keys(erroresCampos).length > 0 ? erroresCampos : null);
    setIntento((current) => current + 1);
    if (Object.keys(erroresCampos).length > 0) return;

    /* Payload IDÉNTICO al legado: ids/personas Number, observaciones con
     * trim ("" si queda vacía); fecha y horas como strings HH:MM/día. */
    const body = {
      ...form,
      id_espacio: Number(form.id_espacio),
      id_tipo_evento: Number(form.id_tipo_evento),
      cantidad_personas: Number(form.cantidad_personas),
      observaciones: (form.observaciones || "").trim(),
    };

    try {
      await guardando.run(body);
      setOpen(false);
      setForm({});
      setCamposErr(null);
      setAccionError("");
      notify("Reserva creada.");
      await onCreated?.();
    } catch (err) {
      setAccionError(err?.message ?? "No se pudo crear la reserva.");
      if (err?.errors) setCamposErr(normalizarErrores(err.errors));
      setIntento((current) => current + 1);
    }
  }

  const politicas = disponibilidad?.politicas ?? [];
  const tramos = disponibilidad?.tramos_ocupados ?? [];

  return <>
    <Button onClick={abrir}>Nueva reserva</Button>
    {open && (
      <FormModal
        title="Nueva reserva"
        open
        busy={busy}
        error={accionError || undefined}
        showRequiredNote
        submitLabel="Crear reserva"
        onSubmit={guardar}
        onClose={cerrar}
      >
        <div className="ui-form-stack">
          <Field label="Espacio" required error={camposErr?.id_espacio}>
            <Select
              name="id_espacio"
              autoComplete="off"
              value={form.id_espacio || ""}
              onChange={actualizar}
            >
              <option value="">Seleccionar...</option>
              {spaces.map((s) => (
                <option key={s.id_espacio_comun} value={s.id_espacio_comun}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de evento" required error={camposErr?.id_tipo_evento}>
            <Select
              name="id_tipo_evento"
              autoComplete="off"
              value={form.id_tipo_evento || ""}
              onChange={actualizar}
            >
              <option value="">Seleccionar...</option>
              {events.map((s) => (
                <option key={s.id_tipo_evento} value={s.id_tipo_evento}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" required error={camposErr?.fecha}>
            <Input
              name="fecha"
              type="date"
              autoComplete="off"
              value={form.fecha || ""}
              onChange={actualizar}
            />
          </Field>
          <Field label="Hora de inicio" required error={camposErr?.hora_inicio}>
            <Input
              name="hora_inicio"
              type="time"
              autoComplete="off"
              value={form.hora_inicio || ""}
              onChange={actualizar}
            />
          </Field>
          <Field label="Hora de fin" required error={camposErr?.hora_fin}>
            <Input
              name="hora_fin"
              type="time"
              autoComplete="off"
              value={form.hora_fin || ""}
              onChange={actualizar}
            />
          </Field>
          <Field label="Personas" required error={camposErr?.cantidad_personas}>
            <Input
              name="cantidad_personas"
              type="number"
              min={1}
              autoComplete="off"
              value={form.cantidad_personas || ""}
              onChange={actualizar}
            />
          </Field>
          <Field
            label="Observaciones"
            error={camposErr?.observaciones}
            help="Máximo 500 caracteres."
          >
            <Textarea
              name="observaciones"
              maxLength={500}
              autoComplete="off"
              value={form.observaciones || ""}
              onChange={actualizar}
            />
          </Field>
        </div>

        {!completo ? (
          <p role="status">
            Selecciona espacio, fecha y tipo de evento para consultar la
            disponibilidad.
          </p>
        ) : consultando && !disponibilidad ? (
          <p role="status">Consultando la disponibilidad...</p>
        ) : errorDisponibilidad && errorDisponibilidad.status === 409 ? (
          /* Sin política para ese espacio/tipo (o espacio inactivo): aviso
           * informativo; NO bloquea Guardar (el backend responde igual). */
          <Alert tone="info">{errorDisponibilidad.message}</Alert>
        ) : errorDisponibilidad ? (
          <ErrorState
            title="No se pudo consultar la disponibilidad"
            description={errorDisponibilidad.message}
            onRetry={recargarDisponibilidad}
          />
        ) : (
          <>
            <h3>Políticas de reserva</h3>
            {!politicas.length ? (
              /* Sin políticas: aviso informativo; NO deshabilita Guardar. */
              <Alert tone="info">
                No hay políticas configuradas para este espacio.
              </Alert>
            ) : (
              politicas.map((p) => (
                <div key={p.id_politica_reserva}>
                  <h4>{p.tipo_evento}</h4>
                  <DefinitionList
                    items={[
                      { term: "Apertura", detail: p.hora_apertura },
                      { term: "Cierre", detail: p.hora_cierre },
                      { term: "Duración máxima", detail: `${p.duracion_max_horas} h` },
                      {
                        term: "Anticipación",
                        detail: `${p.dias_anticipacion_min}–${p.dias_anticipacion_max} días`,
                      },
                      { term: "Aforo", detail: p.aforo_maximo },
                      { term: "Costo", detail: p.costo },
                      { term: "Depósito", detail: p.deposito_garantia },
                      { term: "Penalización", detail: p.penalizaciones },
                    ]}
                  />
                </div>
              ))
            )}
            <h3>Horarios ocupados</h3>
            {!tramos.length ? (
              <EmptyState title="Sin reservas en ese período" />
            ) : (
              <ul>
                {tramos.map((t) => (
                  <li key={t.id_reserva}>
                    {formatDate(t.fecha)} · {formatTime(t.hora_inicio)}
                    –{formatTime(t.hora_fin)} ({t.estado})
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </FormModal>
    )}
  </>;
}
