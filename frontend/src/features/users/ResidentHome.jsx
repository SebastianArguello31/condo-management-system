/* F2-4 — Mi perfil (residente) migrado al kit (plantilla §8-ter, formulario
 * INLINE, no modal). Queda SOLO datos personales + mis unidades: los
 * historiales viven en sus pantallas propias (#/incidencias "Mis
 * incidencias" y #/mis-reservas "Mis reservas", misma fuente de datos que
 * tenía el perfil: GET /incidents y GET /reservations ya filtran por rol en
 * el backend).
 * Datos: useQuery única (perfil + unidades, con signal); reload() tras
 * guardar conserva datos previos (sin titilar); el form se sincroniza desde
 * data solo cuando llega el objeto de perfil (nunca hay reload mientras se
 * escribe). PATCH con useMutation (dedupe, busy en el botón).
 * Validación en cliente: perfilResidente (validations/, espejo de
 * ResidentProfileUpdateSchema — email OPCIONAL; si queda vacío se OMITE, el
 * PATCH es partial y no puede borrar el email). err.errors (arrays) se
 * normaliza a UN mensaje por campo; el error de la ACCIÓN va en Alert
 * danger con foco de lectura a nivel pantalla y el ÉXITO en Toast. Badge
 * activo/inactivo: StatusBadge con override tone/glyph (sin presets
 * nuevos). Unidades en DataTable (sin columna #ID; rowKey estable).
 * onProfileUpdated se conserva: App.jsx usa el perfil guardado para
 * actualizar el nombre del shell. */
import { useEffect, useState } from "react";

import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useMutation, useQuery } from "../../hooks";
import {
  Alert,
  Button,
  DataTable,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Section,
  Skeleton,
  StatusBadge,
  useToast,
} from "../../components/ui";
import { perfilResidente, validate } from "../../validations";

const CAMPOS = [
  { key: "nombre", label: "Nombre", type: "text", autoComplete: "given-name", maxLength: 150, required: true },
  { key: "apellido", label: "Apellido", type: "text", autoComplete: "family-name", maxLength: 150, required: true },
  { key: "email", label: "Correo electrónico", type: "email", autoComplete: "email", maxLength: 254, required: false },
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

export default function ResidentHome({ onProfileUpdated }) {
  const notify = useToast();
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorAccion, setErrorAccion] = useState("");

  const { data, loading, error, reload } = useQuery(async (signal) => {
    const [perfil, unidades] = await Promise.all([
      api(`${routes.residents}/me`, { signal }),
      api(`${routes.residents}/me/units`, { signal }),
    ]);
    return [perfil, unidades ?? []];
  }, []);

  const [perfil, unidades = []] = data ?? [];

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
    api(`${routes.residents}/me`, { method: "PATCH", body })
  );

  async function onSubmit(event) {
    event.preventDefault();
    setErrorAccion("");
    const valores = Object.fromEntries(
      CAMPOS.map(({ key }) => [key, form[key].trim()])
    );
    const errores = validate(valores, perfilResidente);
    if (Object.keys(errores).length) {
      setFieldErrors(errores);
      return;
    }
    setFieldErrors({});
    /* Email opcional en el backend: vacío → se OMITE (el PATCH es partial y
     * el email solo se cambia, no se borra). Los demás campos son
     * requeridos y ya pasaron validate(). */
    const body = { ...valores };
    if (body.email === "") delete body.email;
    try {
      const actualizado = await guardar.run(body);
      onProfileUpdated?.(actualizado);
      notify("Perfil actualizado.");
      reload();
    } catch (err) {
      repartirErrores(err, setFieldErrors, setErrorAccion);
    }
  }

  const onChange = (key) => (event) =>
    setForm((actual) => ({ ...actual, [key]: event.target.value }));

  const meta = !loading && perfil
    ? `${unidades.length} ${unidades.length === 1 ? "unidad" : "unidades"}`
    : undefined;

  const columnas = [
    { key: "edificio", header: "Edificio", render: (unidad) => unidad.edificio || "—" },
    { key: "unidad", header: "Unidad", render: (unidad) => unidad.unidad || "—" },
    {
      key: "piso",
      header: "Piso",
      render: (unidad) =>
        unidad.piso != null && unidad.piso !== "" ? `Piso ${unidad.piso}` : "—",
    },
    { key: "tipo", header: "Tipo de unidad", render: (unidad) => unidad.tipo_unidad || "—" },
  ];

  return (
    <section>
      <PageHeader title="Mi perfil" meta={meta} />

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

          <Section title="Mis unidades">
            <DataTable
              caption="Unidades vinculadas a tu cuenta"
              columns={columnas}
              rows={unidades}
              rowKey={(unidad) => `${unidad.id_residente}:${unidad.id_unidad ?? "sin-unidad"}`}
              emptyTitle="No tienes unidades vinculadas"
              emptyDescription="Contacta con la administración para vincular tu unidad. Sin unidad no puedes reportar incidencias."
            />
          </Section>
        </>
      )}
    </section>
  );
}
