/* ==========================================================================
 * Guía de UI viva (CP3 + CP4) — ruta SOLO DEV: #/ui (solo ADMIN).
 * Importada dinámicamente desde config/routing.js bajo import.meta.env.DEV:
 * en producción la rama desaparece y el módulo NO entra al bundle.
 * Sustituye al arnés ui-smoke.jsx (eliminado en CP6b). Une una sección por
 * componente con todos sus estados; los avisos de la consola usan el
 * prefijo [ui-guide] como ayuda durante la revisión.
 * ========================================================================== */

import { useRef, useState } from "react";
import {
  Alert,
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
  RowActionsMenu,
  SearchInput,
  Section,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Textarea,
  Timeline,
  useFormFieldError,
  useToast,
} from "../components/ui";
import { useConfirm } from "../hooks/useConfirm";

function logU(message) {
  console.log(`[ui-guide] ${message}`);
}

function Bloque({ titulo, children }) {
  return (
    <section
      style={{
        paddingBlock: "var(--space-5)",
        borderBottom: "1px solid var(--line)",
        display: "grid",
        gap: "var(--space-3)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "var(--fs-16)", color: "var(--brand)" }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Fila({ children }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>{children}</div>;
}

function BotonesSection() {
  const [busy, setBusy] = useState(false);
  return (
    <Bloque titulo="Button">
      <Fila>
        <Button>Primario</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Deshabilitado</Button>
      </Fila>
      <Fila>
        <Button
          busy={busy}
          onClick={() => {
            setBusy(true);
            logU("busy activado (botón bloqueado + spinner inline)");
            window.setTimeout(() => setBusy(false), 1500);
          }}
        >
          {busy ? "Guardando…" : "Probar busy (1,5 s)"}
        </Button>
        <Button variant="quiet" block>
          Block (ancho completo)
        </Button>
      </Fila>
      <Fila>
        {/* Aditivas F2-3: danger-ghost destructiva secundaria (texto rojo,
          * sin borde/fondo) y compacto "sm" combinado con variantes. */}
        <Button variant="danger-ghost">Danger ghost</Button>
        <Button variant="quiet" size="sm">
          Quiet compacto (sm)
        </Button>
        <Button variant="danger-ghost" size="sm">
          Danger ghost compacto (sm)
        </Button>
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Recorre con Tab: el foco visible es el anillo de 2px (var(--focus-ring)).
      </p>
    </Bloque>
  );
}

const TONOS = ["neutral", "info", "success", "warning", "danger", "muted"];

function AlertsSection() {
  const [dangerVisible, setDangerVisible] = useState(true);
  return (
    <Bloque titulo="Alert (persistentes, controlado por el padre)">
      {TONOS.map((tone) => (
        <Alert key={tone} tone={tone} title={`Tono ${tone}`}>
          Texto del aviso con detalle suficiente. {tone === "danger" ? 'role="alert".' : ""}
        </Alert>
      ))}
      <Fila>
        <Alert
          tone="danger"
          title="Aviso descartable"
          visible={dangerVisible}
          onDismiss={() => {
            setDangerVisible(false);
            logU("alert cerrado (el padre quedó sin él)");
          }}
        >
          Ciérralo con la × y vuelve a mostrarlo con el botón.
        </Alert>
        <Button variant="quiet" onClick={() => setDangerVisible((v) => !v)}>
          {dangerVisible ? "Ocultar aviso" : "Mostrar aviso"}
        </Button>
      </Fila>
    </Bloque>
  );
}

const TONOS_TOAST = ["neutral", "info", "success", "warning", "danger"];

function ToastsSection() {
  const show = useToast();
  return (
    <Bloque titulo="Toast (efímeros, aria-live=polite)">
      <Fila>
        {TONOS_TOAST.map((tone) => (
          <Button
            key={tone}
            variant={tone === "danger" ? "danger" : "quiet"}
            onClick={() => {
              const id = show(`Toast ${tone}: este aviso se cierra solo.`, { tone });
              logU(`toast id=${id} tone=${tone}`);
            }}
          >
            Toast {tone}
          </Button>
        ))}
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Los del tono danger se anuncian en la región aria-live="assertive".
      </p>
    </Bloque>
  );
}

function EstadosSection() {
  return (
    <Bloque titulo="StatusBadge (glifo + texto con estados reales del backend)">
      <Fila>
        <StatusBadge estado="RECIBIDA" />
        <StatusBadge estado="EN_REVISION" />
        <StatusBadge estado="ASIGNADA" />
        <StatusBadge estado="EN_PROCESO" />
        <StatusBadge estado="EN_ESPERA" />
        <StatusBadge estado="PENDIENTE" />
      </Fila>
      <Fila>
        <StatusBadge estado="CONFIRMADA" />
        <StatusBadge estado="RESUELTA" />
        <StatusBadge estado="RECHAZADA" />
        <StatusBadge estado="CERRADA" />
        <StatusBadge estado="SIN ESTADO" />
      </Fila>
      {/* Cierres de reservas lado a lado: glifos y tonos distintos. */}
      <Fila>
        <StatusBadge estado="FINALIZADA" />
        <StatusBadge estado="CANCELADA" />
      </Fila>
      <Fila>
        <StatusBadge estado="Custom" tone="warning" glyph="triangle" />
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Presets alineados a los estados reales del backend (incidencia y reservas).
        Nota: "EN_PROCESO" se presenta "EN PROCESO" (guiones bajos → espacios);
        "SIN ESTADO" usa el fallback neutral y "Custom" acepta tone/glyph override.
        En reservas, FINALIZADA (check, info) y CANCELADA (punto, muted) comparten
        contraste AA.
      </p>
    </Bloque>
  );
}

function CamposSection() {
  const [conError, setConError] = useState(false);
  return (
    <Bloque titulo="Field + controles (aria-invalid / aria-describedby)">
      <Field label="Nombre del espacio" required help="Texto visible que ayuda a comprender el campo.">
        <Input placeholder="Sin error" />
      </Field>
      <Field
        label="Nombre del espacio (con error)"
        error={conError ? "El nombre es obligatorio." : undefined}
      >
        <Input placeholder={conError ? "Con aria-invalid + border accent" : "Sin error"} />
      </Field>
      <Button variant="quiet" onClick={() => setConError((v) => !v)}>
        {conError ? "Quitar error del campo" : "Mostrar error del campo"}
      </Button>
      <Field label="Tipo" help="Elegir de la lista.">
        <Select>
          <option>Salón</option>
          <option>Parrilla</option>
        </Select>
      </Field>
      <Field label="Observaciones">
        <Textarea placeholder="Texto largo…" />
      </Field>
      <Field label="Acepto el reglamento" error="Debe aceptar el reglamento para continuar.">
        <Checkbox />
      </Field>
      <Checkbox label="Checkbox standalone (sin Field)" />
    </Bloque>
  );
}

function BusquedaSection() {
  const [valor, setValor] = useState("");
  return (
    <Bloque titulo="SearchInput (Borrar con botón y Esc)">
      <SearchInput
        value={valor}
        onChange={(nuevo) => setValor(nuevo)}
        onClear={() => {
          setValor("");
          logU("searchInput limpiado");
        }}
        placeholder="Buscar unidad…"
      />
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        valor actual: {valor === "" ? "(vacío)" : `"${valor}"`}
      </p>
    </Bloque>
  );
}

function EstadosVaciosSection() {
  const intentos = useRef(0);
  return (
    <Bloque titulo="EmptyState / ErrorState / Spinner / Skeleton">
      <EmptyState
        title="Sin reservas todavía"
        description="Cuando un residente reserve, aparecerá aquí."
        action={
          <Button
            variant="quiet"
            onClick={() => {
              intentos.current += 1;
              logU("empty state: acción lanzada");
            }}
          >
            Crear reserva
          </Button>
        }
      />
      <ErrorState
        title="No se pudieron cargar las unidades"
        description="Detalle: falló el servicio (demo)."
        onRetry={() => logU("error state: reintento lanzado")}
      />
      <Fila>
        <Spinner label="Cargando torres…" />
        <Skeleton lines={3} />
      </Fila>
    </Bloque>
  );
}

function CabezaSection() {
  return (
    <Bloque titulo="PageHeader">
      <PageHeader
        title="Gestión de reservas"
        meta="12 registros · actualizado 2026-10-20 09:31"
        actions={
          <Button variant="quiet" onClick={() => logU("page header: acción")}>
            Nueva reserva
          </Button>
        }
      />
    </Bloque>
  );
}

function SectionFichaSection() {
  return (
    <Bloque titulo="Section (ficha) + DefinitionList">
      <Section
        title="Datos de la unidad"
        actions={
          <RowActionsMenu
            actions={[
              { label: "Editar unidad", onSelect: () => logU("ficha: editar") },
              { label: "Eliminar unidad", danger: true, onSelect: () => logU("ficha: eliminar") },
            ]}
          />
        }
      >
        <DefinitionList
          columns={2}
          items={[
            { term: "Código", detail: <span className="ui-mono">B1-101</span> },
            { term: "Torre", detail: "Aurora" },
            { term: "Metros cuadrados", detail: <span className="ui-mono">78</span> },
            { term: "Estado", detail: <StatusBadge estado="CONFIRMADA" /> },
          ]}
        />
      </Section>
      <Section title="Resumen económico">
        <DefinitionList
          items={[
            { term: "Cuota mensual", detail: <span className="ui-mono">G. 350.000</span> },
            { term: "Saldo pendiente", detail: <span className="ui-mono">G. 150.000</span> },
          ]}
        />
      </Section>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        En 375px la ficha pasa a una columna (título arriba, contenido abajo).
      </p>
    </Bloque>
  );
}

function TimelineSection() {
  return (
    <Bloque titulo="Timeline (bitácora de historial)">
      <Timeline
        entries={[
          {
            id: "t1",
            time: "2026-10-18 09:12",
            title: "Incidencia recibida",
            meta: "RECIBIDA · reportado por residente, torre B",
            detail: "Fuga de agua en el baño común del pasillo 1.",
            tone: "info",
          },
          {
            id: "t2",
            time: "2026-10-18 11:40",
            title: "Técnico asignado",
            meta: "EN_PROCESO · técnico: J. Ramírez",
            tone: "warning",
          },
          {
            id: "t3",
            time: "2026-10-19 16:05",
            title: "Reparación completada",
            meta: "RESUELTA · ejecutar ronda de control el 21/10",
            detail: "Se cambió la junta del lavamanos.",
            tone: "success",
          },
        ]}
      />
    </Bloque>
  );
}

/* Campo de demo: consume los errores por campo del FormModal vía
 * useFormFieldError (patrón previsto para las migraciones de Fase 2). */
function CampoDemo({ name, label, ...rest }) {
  const error = useFormFieldError(name);
  return (
    <Field label={label} error={error}>
      <Input name={name} autoComplete="off" {...rest} />
    </Field>
  );
}

/* Estados demo: "normal", "busy", "error" (general) y "campos" (por campo).
 * El submit simula 1,2 s de red; en los modos de error reproduce el fallo y
 * el Alert queda enfocado; en éxito informa con Toast (convención §2.18). */
function FormModalSection() {
  const show = useToast();
  const [modo, setModo] = useState(null); // null | "normal" | "busy" | "error" | "campos"
  const [busy, setBusy] = useState(false);

  const abrir = (nuevo) => {
    if (nuevo === "busy") {
      setBusy(true);
      window.setTimeout(() => setBusy(false), 1500);
    }
    setModo(nuevo);
    logU(`formmodal: abierto en modo ${nuevo}`);
  };

  const cerrar = () => {
    setModo(null);
    setBusy(false);
    logU("formmodal: cerrado");
  };

  const error =
    modo === "error"
      ? "El servidor rechazó la operación (demo). Ajusta los datos y vuelve a intentar."
      : undefined;
  const fieldErrors =
    modo === "campos"
      ? { nombre: "El nombre es obligatorio (demo).", email: "El formato del email no es válido (demo)." }
      : null;

  return (
    <Bloque titulo="FormModal (Modal + form: error dentro, éxito con Toast, cierre bloqueado en busy)">
      <Fila>
        <Button onClick={() => abrir("normal")}>Abrir normal</Button>
        <Button variant="quiet" onClick={() => abrir("busy")}>
          Abrir busy (1,5 s)
        </Button>
        <Button variant="quiet" onClick={() => abrir("error")}>
          Abrir con error general
        </Button>
        <Button variant="quiet" onClick={() => abrir("campos")}>
          Abrir con error por campo
        </Button>
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        En los modos de error el Alert (role="alert") se enfoca al aparecer; con
        busy la ×, Esc y Cancelar están bloqueadas y el Guardar muestra spinner.
      </p>
      <FormModal
        title="Nueva reserva (demo)"
        description="El foco queda atrapado; al cerrar vuelve al botón que lo abrió."
        open={modo !== null}
        busy={busy}
        error={error}
        fieldErrors={fieldErrors}
        onClose={cerrar}
        onSubmit={() => {
          setBusy(true);
          window.setTimeout(() => {
            setBusy(false);
            cerrar();
            show("Reserva creada (demo).", { tone: "success" });
            logU("formmodal: submit ok");
          }, 1200);
        }}
      >
        <CampoDemo name="nombre" label="Nombre del espacio" required />
        <CampoDemo name="email" label="Email de contacto" type="email" />
        <CampoDemo name="observaciones" label="Observaciones (opcional)" />
      </FormModal>
    </Bloque>
  );
}

function ModalSection() {
  const [abierto, setAbierto] = useState(null); // null | "footer" | "simple"
  if (!abierto) {
    return (
      <Bloque titulo="Modal (footer, foco atrapado/devuelto, Esc, backdrop opt-in)">
        <Fila>
          <Button onClick={() => setAbierto("footer")}>Modal con footer + backdrop</Button>
          <Button variant="quiet" onClick={() => setAbierto("simple")}>
            Modal sin backdrop
          </Button>
        </Fila>
      </Bloque>
    );
  }
  return (
    <Bloque titulo="Modal abierto (cerrar con Esc / × / backdrop si está activo)">
      <Modal
        title={abierto === "footer" ? "Nueva reserva" : "Confirmación sin backdrop"}
        description={
          abierto === "footer"
            ? "El foco queda atrapado; al cerrar vuelve al botón que lo abrió."
            : "Sin overlay: el fondo no se oscurece; Esc y × siguen cerrando."
        }
        busy={false}
        onClose={() => {
          setAbierto(null);
          logU("modal cerrado");
        }}
        backdrop={abierto === "footer"}
        footer={
          <>
            <Button variant="quiet" onClick={() => setAbierto(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setAbierto(null);
                logU("modal confirmado");
              }}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Espacio" required>
          <Input placeholder="Parrilla 2" />
        </Field>
        <Field label="Observaciones">
          <Textarea placeholder="Detalle opcional…" />
        </Field>
      </Modal>
    </Bloque>
  );
}

function ConfirmSection() {
  const confirm = useConfirm();
  const [resultado, setResultado] = useState("(aún sin responder)");
  return (
    <Bloque titulo="ConfirmDialog (provider global de App.jsx, useConfirm a la vista)">
      <Fila>
        <Button
          onClick={async () => {
            const ok = await confirm({ title: "Reservar parrilla", message: "Se notificará al residente. ¿Seguimos?" });
            setResultado(`normal: ${ok}`);
          }}
        >
          Confirmar normal
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            const ok = await confirm({
              title: "Eliminar reserva",
              message: "La reserva se cancelará y no habrá vuelta atrás.",
              danger: true,
              confirmLabel: "Eliminar",
            });
            setResultado(`danger: ${ok}`);
          }}
        >
          Confirmar danger
        </Button>
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Última respuesta: {resultado}
      </p>
    </Bloque>
  );
}

const FILAS_DEMO = [
  { id: "r1", codigo: "R-0001", estado: "PENDIENTE", residente: "M. López", saldo: "G. 0" },
  { id: "r2", codigo: "R-0002", estado: "CONFIRMADA", residente: "M. López", saldo: "G. 60.000" },
  { id: "r3", codigo: "R-0003", estado: "RECHAZADA", residente: "C. Delgado", saldo: "G. 35.000" },
  { id: "r4", codigo: "R-0004", estado: "CANCELADA", residente: "—", saldo: "G. 120.000" },
];

function DataTableSection() {
  const [modo, setModo] = useState("data");
  const columnas = [
    {
      key: "codigo",
      header: "Código",
      render: (fila) => <span className="ui-mono">{fila.codigo}</span>,
    },
    { key: "estado", header: "Estado", render: (fila) => <StatusBadge estado={fila.estado} /> },
    { key: "residente", header: "Residente" },
    {
      key: "saldo",
      header: "Saldo",
      align: "right", // K5: números a la derecha con tabular-nums
      render: (fila) => <span className="ui-mono">{fila.saldo}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right", // K6: el disparador y su cabecera comparten el borde derecho
      render: (fila) => (
        <RowActionsMenu
          actions={[
            { label: "Ver ficha", onSelect: () => logU(`fila ${fila.codigo}: ficha`) },
            { label: "Cancelar reserva", disabled: fila.estado !== "PENDIENTE", onSelect: () => logU(`fila ${fila.codigo}: cancelar`) },
            { label: "Eliminar reserva", danger: true, onSelect: () => logU(`fila ${fila.codigo}: eliminar`) },
          ]}
        />
      ),
    },
  ];

  return (
    <Bloque titulo="DataTable (estados integrados + menú por fila) y FilterBar">
      <Fila>
        {["data", "loading", "error", "empty"].map((valor) => (
          <Button key={valor} variant="quiet" onClick={() => setModo(valor)}>
            estado {valor}
          </Button>
        ))}
      </Fila>
      <FilterBar onReset={() => logU("filterbar: reset")}>
        <SearchInput
          label="Buscar"
          value=""
          onChange={() => {}}
          onClear={() => {}}
          placeholder="Código o residente…"
        />
        <Field label="Estado">
          <Select>
            <option>Todos</option>
          </Select>
        </Field>
        <Button>Aplicar</Button>
      </FilterBar>
      <DataTable
        columns={columnas}
        rows={modo === "data" ? FILAS_DEMO : []}
        rowKey={(fila) => fila.id}
        caption="Listado de reservas del condominio"
        loading={modo === "loading"}
        error={modo === "error" ? { message: "Falló el servicio de reservas (demo)." } : null}
        emptyTitle="Sin reservas"
        emptyDescription="Ajusta los filtros o crea la primera reserva."
        emptyAction={
          <Button variant="quiet" onClick={() => logU("tabla vacía: acción")}>
            Crear reserva
          </Button>
        }
        onRetry={() => {
          setModo("data");
          logU("tabla: reintento");
        }}
      />
      <Fila>
        <RowActions
          actions={[
            {
              label: "Detalle",
              onSelect: () => logU("rowactions: detalle"),
            },
            {
              label: "Cancelar",
              danger: true,
              onSelect: () => logU("rowactions: cancelar"),
            },
            {
              label: "Oculta",
              hidden: true,
              onSelect: () => logU("rowactions: oculta (NO se muestra)"),
            },
          ]}
        />
        <RowActionsMenu
          actions={[
            { label: "Ver ficha", onSelect: () => logU("menú: ficha") },
            { label: "Cancelar reserva", onSelect: () => logU("menú: cancelar") },
            { label: "Eliminar reserva", danger: true, onSelect: () => logU("menú: eliminar") },
          ]}
        />
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        RowActions: 1–3 acciones por fila como botones visibles (quiet sm;
        destructiva danger-ghost sm; aria-label con el nombre/fecha del
        registro — Mis reservas, Especialidades). RowActionsMenu: SOLO con
        más de 3 acciones por fila.
      </p>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Bajo 640px las filas se apilan en tarjetas con el nombre de la columna.
        Cabecera con más peso (ajuste F2-3, cambio de kit): 13px (--fs-13),
        600, --ink y tracking normal sobre --status-neutral-bg; conserva
        mayúsculas y su línea inferior; en móvil las etiquetas de
        las tarjetas (td::before) no cambian de peso.
      </p>
    </Bloque>
  );
}

export default function UiGuide() {
  return (
    <div style={{ display: "grid", gap: "var(--space-5)", paddingBlock: "var(--space-4)" }}>
      <PageHeader
        title="Guía de UI del sistema"
        meta="Ruta solo DEV (#/ui) · CP3 + CP4 · solo tokens"
      />
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Referencia viva de los componentes base. En producción esta página no existe
        (import dinámico bajo import.meta.env.DEV: no entra al bundle).
      </p>
      <BotonesSection />
      <AlertsSection />
      <ToastsSection />
      <EstadosSection />
      <CamposSection />
      <BusquedaSection />
      <EstadosVaciosSection />
      <CabezaSection />
      <SectionFichaSection />
      <TimelineSection />
      <ModalSection />
      <FormModalSection />
      <ConfirmSection />
      <DataTableSection />
    </div>
  );
}
/* Nota: ConfirmDialog y los providers (Toast/Confirm) se montan UNA vez en
 * App.jsx; ConfirmSection arriba usa useConfirm de ese provider global. */
