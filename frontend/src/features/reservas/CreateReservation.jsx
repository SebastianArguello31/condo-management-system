import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { validate, reservaCrear } from "../../validations";
import { formatDate, formatTime } from "../../utils/format";
import DateInput from "../../components/ui/DateInput";
import Time24Field from "../../components/ui/Time24Field";
import { Alert, Button, DefinitionList, EmptyState, ErrorState, Field, FormModal, Input, Select, Textarea, useToast,} from "../../components/ui";

function normalizarErrores(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensajes]) => [
      campo,
      Array.isArray(mensajes)
        ? (mensajes[0] ?? "")
        : String(mensajes),
    ])
  );
}

export default function CreateReservation({ spaces, events, onCreated, }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [camposErr, setCamposErr] = useState(null);
  const [accionError, setAccionError] = useState("");
  const [intento, setIntento] = useState(0);
  const notify = useToast();

  const completo = Boolean(form.id_espacio && form.fecha && form.id_tipo_evento);

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

      if (form.id_tipo_evento) {
        params.set("id_tipo_evento", form.id_tipo_evento);
      }

      return api(
        `${routes.commonSpaces}/${form.id_espacio}/availability?${params}`,
        { signal }
      );
    },
    [open, form.id_espacio, form.fecha, form.id_tipo_evento],
    { enabled: open && completo }
  );

  const guardando = useMutation((body) =>
    api(routes.reservations, {
      method: "POST",
      body,
    })
  );

  const busy = guardando.busy;

  function actualizar(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setCamposErr((current) => {
      if (!current || !(name in current)) return current;

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  useEffect(() => {
    if (intento === 0) return;

    document
      .querySelector(".ui-modal-body .ui-control-invalid")
      ?.focus();
  }, [intento]);

  function abrir() {
    setForm({});
    setCamposErr(null);
    setAccionError("");
    setOpen(true);
  }

  function cerrar() {
    if (!busy) setOpen(false);
  }

  async function guardar() {
    if (busy) return;

    setAccionError("");

    const limpio = {
      ...form,
      observaciones: (form.observaciones || "").trim(),
    };

    const erroresCampos = validate(limpio, reservaCrear);
    const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const name of ["hora_inicio", "hora_fin"]) {
      if (!horaValida.test(limpio[name] || "")) {
        erroresCampos[name] = "Selecciona una hora y sus minutos.";
      }
    }

    setCamposErr(
      Object.keys(erroresCampos).length > 0
        ? erroresCampos
        : null
    );
    setIntento((current) => current + 1);

    if (Object.keys(erroresCampos).length > 0) return;

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
      setAccionError(
        err?.message ?? "No se pudo crear la reserva."
      );

      if (err?.errors) {
        setCamposErr(normalizarErrores(err.errors));
      }

      setIntento((current) => current + 1);
    }
  }

  const politicas = disponibilidad?.politicas ?? [];
  const tramos = disponibilidad?.tramos_ocupados ?? [];

  return (
    <>
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
            <Field
              label="Espacio"
              required
              error={camposErr?.id_espacio}
            >
              <Select
                name="id_espacio"
                autoComplete="off"
                value={form.id_espacio || ""}
                onChange={actualizar}
                disabled={busy}
              >
                <option value="">Seleccionar...</option>
                {spaces.map((space) => (
                  <option
                    key={space.id_espacio_comun}
                    value={space.id_espacio_comun}
                  >
                    {space.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Tipo de evento"
              required
              error={camposErr?.id_tipo_evento}
            >
              <Select
                name="id_tipo_evento"
                autoComplete="off"
                value={form.id_tipo_evento || ""}
                onChange={actualizar}
                disabled={busy}
              >
                <option value="">Seleccionar...</option>
                {events.map((event) => (
                  <option
                    key={event.id_tipo_evento}
                    value={event.id_tipo_evento}
                  >
                    {event.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Fecha"
              required
              error={camposErr?.fecha}
            >
              <DateInput
                name="fecha"
                value={form.fecha || ""}
                onChange={actualizar}
                disabled={busy}
              />
            </Field>

            <Time24Field
              label="Hora de inicio"
              name="hora_inicio"
              value={form.hora_inicio || ""}
              onChange={actualizar}
              error={camposErr?.hora_inicio}
              disabled={busy}
            />

            <Time24Field
              label="Hora de fin"
              name="hora_fin"
              value={form.hora_fin || ""}
              onChange={actualizar}
              error={camposErr?.hora_fin}
              disabled={busy}
            />

            <Field
              label="Personas"
              required
              error={camposErr?.cantidad_personas}
            >
              <Input
                name="cantidad_personas"
                type="number"
                min={1}
                autoComplete="off"
                value={form.cantidad_personas || ""}
                onChange={actualizar}
                disabled={busy}
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
                disabled={busy}
              />
            </Field>
          </div>

          {!completo ? (
            <p role="status">
              Selecciona espacio, fecha y tipo de evento para
              consultar la disponibilidad.
            </p>
          ) : consultando && !disponibilidad ? (
            <p role="status">
              Consultando la disponibilidad...
            </p>
          ) : errorDisponibilidad?.status === 409 ? (
            <Alert tone="info">
              {errorDisponibilidad.message}
            </Alert>
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
                <Alert tone="info">
                  No hay políticas configuradas para este espacio.
                </Alert>
              ) : (
                politicas.map((politica) => (
                  <div key={politica.id_politica_reserva}>
                    <h4>{politica.tipo_evento}</h4>

                    <DefinitionList
                      items={[
                        {
                          term: "Apertura",
                          detail: formatTime(politica.hora_apertura),
                        },
                        {
                          term: "Cierre",
                          detail: formatTime(politica.hora_cierre),
                        },
                        {
                          term: "Duración máxima",
                          detail: `${politica.duracion_max_horas} h`,
                        },
                        {
                          term: "Anticipación",
                          detail: `${politica.dias_anticipacion_min}–${politica.dias_anticipacion_max} días`,
                        },
                        {
                          term: "Aforo",
                          detail: politica.aforo_maximo,
                        },
                        {
                          term: "Costo",
                          detail: politica.costo,
                        },
                        {
                          term: "Depósito",
                          detail: politica.deposito_garantia,
                        },
                        {
                          term: "Penalización",
                          detail: politica.penalizaciones,
                        },
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
                  {tramos.map((tramo) => (
                    <li key={tramo.id_reserva}>
                      {formatDate(tramo.fecha)} ·{" "}
                      {formatTime(tramo.hora_inicio)}–
                      {formatTime(tramo.hora_fin)}{" "}
                      ({tramo.estado})
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </FormModal>
      )}
    </>
  );
}