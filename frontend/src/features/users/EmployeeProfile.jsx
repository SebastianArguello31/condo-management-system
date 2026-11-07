/* F2-4 — Mi perfil (técnico) migrado al kit (plantilla §8-ter, formulario
 * INLINE, no modal). Quedan SOLO datos personales + especialidades de solo
 * lectura: la lista de "Incidencias asignadas" vive en #/incidencias
 * (misma fuente GET /incidents; el backend ya filtra technician_id) y se
 * saca del perfil junto con su fetch, cerrando la parte del B7 en Mi
 * perfil.
 * Datos: useQuery única (PATCH /employees/me y especialidades embebidas,
 * con signal); el form se sincroniza desde data solo cuando llega el
 * perfil. Validación en cliente: perfilEmpleado (validations/, espejo de
 * EmployeeProfileUpdateSchema — email REQUERIDO). err.errors (arrays) se
 * normaliza a UN mensaje por campo; error de la ACCIÓN en Alert danger y
 * éxito por Toast. Badge activo/inactivo: StatusBadge con override tone/
 * glyph. Especialidades en lista simple (.ui-specialty-list, ronda 1) con
 * su estado en StatusBadge; la nota de ayuda en .ui-specialty-note.
 * onProfileUpdated se conserva (App.jsx actualiza el shell). */
import { useEffect, useState } from "react";

import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation, useQuery } from "../../hooks";
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Section,
  Skeleton,
  StatusBadge,
  useToast,
} from "../../components/ui";
import { perfilEmpleado, validate } from "../../validations";

const CAMPOS = [
  { key: "nombre", label: "Nombre", type: "text", autoComplete: "given-name", maxLength: 150, required: true },
  { key: "apellido", label: "Apellido", type: "text", autoComplete: "family-name", maxLength: 150, required: true },
  { key: "email", label: "Correo electrónico", type: "email", autoComplete: "email", maxLength: 254, required: true },
  { key: "telefono", label: "Teléfono", type: "text", autoComplete: "tel", maxLength: 40, required: true },
];

/* err.errors del backend es { campo: [mensajes] }: separa los mensajes de
 * los 4 campos del form (→ Field) del resto (→ Alert de la acción). */
function repartirErrores(error, aCampos, aAccion) {
  const cruces = [];
  const deCampos = {};
  for (const [campo, mensajes] of Object.entries(error?.errors ?? {})) {
    const mensaje = Array.isArray(mensajes) ? mensajes[0] : mensajes;
    if (CAMPOS.some(({ key }) => key === campo)) deCampos[campo] = mensaje;
    else cruces.push(`${campo}: ${mensaje}`);
  }
  if (Object.keys(deCampos).length) aCampos(deCampos);
  aAccion(cruces.join(" · ") || error?.message || "No se pudo guardar el perfil.");
}

export default function EmployeeProfile({ onProfileUpdated }) {
  const notify = useToast();
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorAccion, setErrorAccion] = useState("");

  const { data, loading, error, reload } = useQuery(async (signal) => {
    const perfil = await api(`${routes.employees}/me`, { signal });
    return [perfil, perfil.especialidades ?? []];
  }, []);

  const [perfil, especialidades = []] = data ?? [];

  /* Sincroniza el form con el perfil CARGADO/recargado (el único
   * reload() ocurre tras guardar, nunca mientras el usuario escribe). */
  useEffect(() => {
    if (!perfil) return;
    setForm({
      nombre: perfil.nombre ?? "",
      apellido: perfil.apellido ?? "",
      email: perfil.email ?? "",
      telefono: perfil.telefono ?? "",
    });
  }, [perfil]);

  const guardar = useMutation((body) =>
    api(`${routes.employees}/me`, { method: "PATCH", body })
  );

  async function onSubmit(event) {
    event.preventDefault();
    setErrorAccion("");
    const valores = Object.fromEntries(
      CAMPOS.map(({ key }) => [key, form[key].trim()])
    );
    const errores = validate(valores, perfilEmpleado);
    if (Object.keys(errores).length) {
      setFieldErrors(errores);
      return;
    }
    setFieldErrors({});
    try {
      const actualizado = await guardar.run(valores);
      onProfileUpdated?.(actualizado);
      notify("Perfil actualizado.");
      reload();
    } catch (err) {
      repartirErrores(err, setFieldErrors, setErrorAccion);
    }
  }

  const onChange = (key) => (event) =>
    setForm((actual) => ({ ...actual, [key]: event.target.value }));

  return (
    <section>
      <PageHeader title="Mi perfil" />

      {loading && <Skeleton lines={6} />}

      {!loading && error && (
        <ErrorState
          title="No se pudo cargar tu perfil"
          description={error.message}
          onRetry={() => reload()}
        />
      )}

      {!loading && !error && perfil && form && (
        <>
          <Section
            title="Datos personales"
            actions={
              <StatusBadge
                estado={perfil.activo ? "ACTIVA" : "INACTIVA"}
                tone={perfil.activo ? "success" : "muted"}
                glyph={perfil.activo ? "check" : "dot"}
              />
            }
          >
            <Alert
              tone="danger"
              visible={Boolean(errorAccion)}
              title="No se pudo guardar el perfil"
              onDismiss={() => setErrorAccion("")}
            >
              {errorAccion}
            </Alert>
            <form onSubmit={onSubmit} noValidate>
              <div className="ui-form-stack">
                {CAMPOS.map(({ key, label, type, autoComplete, maxLength, required }) => (
                  <Field key={key} label={label} required={required} error={fieldErrors[key]}>
                    <Input
                      name={key}
                      type={type}
                      autoComplete={autoComplete}
                      maxLength={maxLength}
                      value={form[key]}
                      onChange={onChange(key)}
                    />
                  </Field>
                ))}
              </div>
              <div className="ui-form-actions">
                <Button type="submit" busy={guardar.busy}>Guardar cambios</Button>
              </div>
            </form>
          </Section>

          <Section title="Especialidades">
            <p className="ui-specialty-note">
              Las especialidades son gestionadas por administración.
            </p>
            {especialidades.length === 0 ? (
              <EmptyState
                title="Aún no tienes especialidades asignadas"
                description="Las gestiona administración."
              />
            ) : (
              <ul className="ui-specialty-list">
                {especialidades.map((especialidad) => (
                  <li key={especialidad.id_especialidad}>
                    <span>{especialidad.nombre}</span>
                    <StatusBadge
                      estado={especialidad.activo ? "ACTIVA" : "INACTIVA"}
                      tone={especialidad.activo ? "success" : "muted"}
                      glyph={especialidad.activo ? "check" : "dot"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </section>
  );
}
