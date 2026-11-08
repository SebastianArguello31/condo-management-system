import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation } from "../../hooks";
import {
  Alert,
  Button,
  Field,
  Input,
  Section,
} from "../../components/ui";

const INITIAL_FORM = {
  current_password: "",
  password: "",
  confirmation: "",
};

export default function ChangePasswordForm({ onChanged }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState("");

  const guardar = useMutation((body) =>
    api(`${routes.auth}/change-password`, {
      method: "POST",
      body,
    })
  );

  function actualizar(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setActionError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (guardar.busy) return;

    const validation = {};

    if (!form.current_password) {
      validation.current_password = "Ingresa tu contraseña actual.";
    }

    if (Array.from(form.password).length < 8) {
      validation.password = "Debe tener al menos 8 caracteres.";
    } else if (
      new TextEncoder().encode(form.password).length > 72
    ) {
      validation.password = "No puede superar 72 bytes.";
    } else if (form.password === form.current_password) {
      validation.password =
        "Debe ser diferente de la contraseña actual.";
    }

    if (
      !form.confirmation ||
      form.confirmation !== form.password
    ) {
      validation.confirmation = "Las contraseñas no coinciden.";
    }

    setErrors(validation);
    setActionError("");

    if (Object.keys(validation).length > 0) return;

    try {
      await guardar.run({
        current_password: form.current_password,
        password: form.password,
      });

      setForm(INITIAL_FORM);
      onChanged();
    } catch (err) {
      setErrors(
        Object.fromEntries(
          Object.entries(err.errors ?? {}).map(([key, value]) => [
            key,
            Array.isArray(value) ? value[0] : String(value),
          ])
        )
      );

      setActionError(
        err.message || "No se pudo cambiar la contraseña."
      );
    }
  }

  return (
    <Section title="Cambiar contraseña">
      <form
        className="ui-form-stack"
        noValidate
        onSubmit={submit}
      >
        <p>
          Al actualizarla, se cerrarán las sesiones existentes y
          deberás iniciar sesión nuevamente.
        </p>

        {actionError && (
          <Alert tone="danger">{actionError}</Alert>
        )}

        <Field
          label="Contraseña actual"
          required
          error={errors.current_password}
        >
          <Input
            name="current_password"
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            disabled={guardar.busy}
            onChange={actualizar}
          />
        </Field>

        <Field
          label="Nueva contraseña"
          required
          error={errors.password}
          help="Al menos 8 caracteres y un máximo de 72 bytes."
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            disabled={guardar.busy}
            onChange={actualizar}
          />
        </Field>

        <Field
          label="Confirmar nueva contraseña"
          required
          error={errors.confirmation}
        >
          <Input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            value={form.confirmation}
            disabled={guardar.busy}
            onChange={actualizar}
          />
        </Field>

        <div>
          <Button type="submit" busy={guardar.busy}>
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Section>
  );
}