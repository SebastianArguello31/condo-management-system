import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation, useQuery } from "../../hooks";
import {
  Alert,
  Button,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Section,
  useToast,
} from "../../components/ui";
import { perfilEmpleado, validate } from "../../validations";

const CAMPOS = [
  {
    name: "nombre",
    label: "Nombre",
    type: "text",
    autoComplete: "given-name",
    maxLength: 150,
  },
  {
    name: "apellido",
    label: "Apellido",
    type: "text",
    autoComplete: "family-name",
    maxLength: 150,
  },
  {
    name: "email",
    label: "Correo electrónico",
    type: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  {
    name: "telefono",
    label: "Teléfono",
    type: "tel",
    autoComplete: "tel",
    maxLength: 40,
  },
];

function formFromProfile(profile) {
  return Object.fromEntries(
    CAMPOS.map(({ name }) => [name, profile[name] ?? ""])
  );
}

function normalizarErrores(errors = {}) {
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : String(value),
    ])
  );
}

export default function AccountProfile({ onProfileUpdated }) {
  const notify = useToast();
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionError, setActionError] = useState("");

  const { data, loading, error, reload } = useQuery(
    (signal) => api(`${routes.auth}/me`, { signal }),
    []
  );

  const guardar = useMutation((body) =>
    api(`${routes.auth}/me`, {
      method: "PATCH",
      body,
    })
  );

  useEffect(() => {
    if (data) setForm(formFromProfile(data));
  }, [data]);

  function actualizar(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setActionError("");
  }

  async function guardarPerfil(event) {
    event.preventDefault();
    if (guardar.busy || !form) return;

    const body = Object.fromEntries(
      CAMPOS.map(({ name }) => [name, form[name].trim()])
    );

    const errors = validate(body, perfilEmpleado);
    setFieldErrors(errors);
    setActionError("");

    if (Object.keys(errors).length > 0) return;

    try {
      const updated = await guardar.run(body);
      setForm(formFromProfile(updated));
      onProfileUpdated?.(updated);
      notify("Perfil actualizado.");
    } catch (err) {
      setFieldErrors(normalizarErrores(err.errors));
      setActionError(
        err.message || "No se pudo actualizar el perfil."
      );
    }
  }

  if (loading && !data) {
    return <p role="status">Cargando perfil…</p>;
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar el perfil"
        description={error.message}
        onRetry={reload}
      />
    );
  }

  if (!form) return null;

  return (
    <section>
      <PageHeader
        title="Mi perfil"
        meta="Consulta y actualiza tus datos personales."
      />

      <Section title="Datos personales">
        <form
          className="ui-form-stack"
          noValidate
          onSubmit={guardarPerfil}
        >
          {actionError && (
            <Alert tone="danger">{actionError}</Alert>
          )}

          {CAMPOS.map(({ name, label, ...props }) => (
            <Field
              key={name}
              label={label}
              required
              error={fieldErrors[name]}
            >
              <Input
                {...props}
                name={name}
                value={form[name]}
                disabled={guardar.busy}
                onChange={actualizar}
              />
            </Field>
          ))}

          <div>
            <Button type="submit" busy={guardar.busy}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Section>
    </section>
  );
}