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
  ConfirmDialog,
  DataTable,
  DefinitionList,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  RowActionsMenu,
  SearchInput,
  Section,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Textarea,
  Timeline,
  ToastProvider,
  useToast,
} from "../components/ui";
import { ConfirmProvider, useConfirm } from "../hooks/useConfirm";

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
        <StatusBadge estado="CANCELADA" />
        <StatusBadge estado="CERRADA" />
        <StatusBadge estado="SIN ESTADO" />
      </Fila>
      <Fila>
        <StatusBadge estado="Custom" tone="warning" glyph="triangle" />
      </Fila>
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Presets alineados a los estados reales del backend (incidencia y reservas).
        Nota: "EN_PROCESO" se presenta "EN PROCESO" (guiones bajos → espacios);
        "SIN ESTADO" usa el fallback neutral y "Custom" acepta tone/glyph override.
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
            { term: "Estado", detail: <StatusBadge estado="OCUPADA" /> },
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
    <Bloque titulo="ConfirmDialog (enchufado a useConfirm)">
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
  { id: "u1", codigo: "B1-101", estado: "OCUPADA", residente: "M. López", saldo: "G. 0" },
  { id: "u2", codigo: "B1-102", estado: "RESERVADA", residente: "—", saldo: "G. 60.000" },
  { id: "u3", codigo: "B2-201", estado: "LIBRE", residente: "—", saldo: "G. 350.000" },
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
            { label: "Asignar residente", disabled: fila.estado === "OCUPADA", onSelect: () => logU(`fila ${fila.codigo}: asignar`) },
            { label: "Eliminar unidad", danger: true, onSelect: () => logU(`fila ${fila.codigo}: eliminar`) },
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
          label="Buscar unidad"
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
        caption="Listado de unidades del condominio"
        loading={modo === "loading"}
        error={modo === "error" ? { message: "Falló el servicio de unidades (demo)." } : null}
        emptyTitle="Sin unidades"
        emptyDescription="Ajusta los filtros o registra la primera unidad."
        emptyAction={
          <Button variant="quiet" onClick={() => logU("tabla vacía: acción")}>
            Registrar unidad
          </Button>
        }
        onRetry={() => {
          setModo("data");
          logU("tabla: reintento");
        }}
      />
      <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-3)" }}>
        Bajo 640px las filas se apilan en tarjetas con el nombre de la columna.
      </p>
    </Bloque>
  );
}

export default function UiGuide() {
  return (
    <ConfirmProvider>
      <ToastProvider>
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
          <ConfirmSection />
          <DataTableSection />
          <ConfirmDialog />
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
