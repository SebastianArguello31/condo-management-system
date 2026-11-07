/* AccountDetailModal + useCuentaAcceso — F2-6a (NUEVO, compartido por
 * Usuarios, Empleados y Administradores).
 *
 * DETALLE (componente por defecto): Modal del kit con backdrop (el modal
 * legado de ManagementPage era un <dialog open> sin backdrop ni foco —
 * bugs B1/B4; el cierre queda "por verificar con captura del dueño", NO
 * se declara cerrado). MISMO endpoint que el legado: GET /users/:id
 * (useQuery con signal); loading → Skeleton y error → ErrorState con
 * Reintentar solo SIN datos (el contenido se conserva montado en los
 * reload). Un solo h2 (el del Modal), contenido en DefinitionList
 * (nombre, email, teléfono, rol, estado con StatusBadge override y
 * "Creada" con formatDate — sin ISO crudo) y footer solo "Cerrar" (quiet,
 * patrón F2-3/F2-5c). Solo lectura: sin editar, sin eliminar, sin reset
 * de contraseña.
 *
 * ACCIONES DE ACCESO (useCuentaAcceso): hook compartido de las 3
 * pantallas para la columna Acciones con RowActions —
 * - abrirDetalle(row) guarda la fila y monta este modal; renderActions
 *   emite "Detalle" (Button quiet sm, aria-label con el nombre).
 * - alternar(row): PATCH /users/:id { activo: !row.activo } (MISMO
 *   endpoint y payload que el legado), con useConfirm (danger SOLO al
 *   desactivar), useMutation con dedupe y Toast de éxito; error por
 *   Toast danger. "Desactivar" queda deshabilitado sobre la propia
 *   cuenta del ADMIN con aria-label que lo explica.
 * El botón del toggle usa danger-ghost sm solo cuando desactiva
 * (destructiva §8-bis); activar es quiet sm.
 */
import { useState } from "react";
import { api } from "../../services/api";
import { routes } from "../../services/routes";
import { useQuery } from "../../hooks/useQuery";
import { useMutation } from "../../hooks/useMutation";
import { useConfirm } from "../../hooks/useConfirm";
import { formatDate } from "../../utils/format";
import {
  Button,
  DefinitionList,
  ErrorState,
  Modal,
  Skeleton,
  StatusBadge,
  useToast,
} from "../../components/ui";

/* Presentación del ESTADO de una cuenta (decisión F2-6a): inicial mayús-
 * cula como texto del preset de especialidades; override ACTIVA
 * success+check / INACTIVA muted (dot por defecto del tone). ÚNICA
 * fuente: la consumen las tablas y este detalle (misma técnica que
 * priorities.js en F2-5c). */
export function estadoCuenta(activo) {
  return activo
    ? { estado: "ACTIVA", tone: "success", glyph: "check" }
    : { estado: "INACTIVA", tone: "muted" };
}

const nombreCompleto = (registro) =>
  [registro?.nombre, registro?.apellido].filter(Boolean).join(" ") || "—";

export default function AccountDetailModal({ usuario, onClose }) {
  const id = usuario.id_usuario;

  const {
    data: detail,
    loading,
    error,
    reload,
  } = useQuery(
    (signal) => api(`${routes.users}/${id}`, { signal }),
    [id]
  );

  return (
    <Modal
      title="Detalle de usuario"
      description={nombreCompleto(usuario)}
      onClose={onClose}
      backdrop
      footer={
        <Button variant="quiet" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {loading && !detail && <Skeleton lines={6} />}

      {!loading && error && !detail && (
        <ErrorState
          title="No se pudo cargar el detalle"
          description={error.message}
          onRetry={reload}
        />
      )}

      {detail && (
        <DefinitionList
          items={[
            {
              term: "Estado",
              detail: <StatusBadge {...estadoCuenta(Boolean(detail.activo))} />,
            },
            { term: "Nombre", detail: nombreCompleto(detail) },
            { term: "Email", detail: detail.email },
            { term: "Teléfono", detail: detail.telefono || "—" },
            { term: "Rol", detail: detail.rol },
            { term: "Creada", detail: formatDate(detail.created_at) || "—" },
          ]}
        />
      )}
    </Modal>
  );
}

/* Hook de acciones de acceso por fila (Detalle + Activar/Desactivar).
 * `renderExtraActions(row, busy)` va a CrudPageUi como children de
 * RowActions (sin Editar/Eliminar en estas pantallas). `onChanged` es el
 * `reload` del listado del padre (patrón F2-5c: éxito también refresca
 * el listado sin titilar). */
export function useCuentaAcceso({ user, onChanged }) {
  const notify = useToast();
  const confirm = useConfirm();
  const [detalle, setDetalle] = useState(null);
  /* Binding local: el onClick del botón "Detalle" necesita el identificador
   * `abrirDetalle` EN el scope del hook (la propiedad del objeto retornado
   * no crea binding — causa de la ronda 1: ReferenceError al pulsar). */
  const abrirDetalle = setDetalle;

  const alternarCuenta = useMutation((row) =>
    api(`${routes.users}/${row.id_usuario}`, {
      method: "PATCH",
      body: { activo: !row.activo },
    })
  );

  async function alternar(row) {
    if (alternarCuenta.busy) return;
    const si = await confirm({
      title: row.activo ? "Desactivar cuenta" : "Activar cuenta",
      message: `Se ${
        row.activo ? "desactivará" : "activará"
      } la cuenta de ${nombreCompleto(row)}.${
        row.activo ? " No podrá iniciar sesión mientras esté inactiva." : ""
      }`,
      confirmLabel: row.activo ? "Desactivar" : "Activar",
      danger: Boolean(row.activo),
    });
    if (!si) return;

    try {
      await alternarCuenta.run(row);
      notify(row.activo ? "Cuenta desactivada." : "Cuenta activada.");
      await onChanged?.();
    } catch (err) {
      notify(err.message || "No se pudo actualizar la cuenta.", {
        tone: "danger",
      });
    }
  }

  return {
    detalle,
    abrirDetalle,
    cerrarDetalle: () => setDetalle(null),
    busy: alternarCuenta.busy,
    alternar,
    renderExtraActions: (row, busy) => {
      const propia = user?.id_usuario === row.id_usuario;
      const etiqueta = nombreCompleto(row);
      const bloqueada = row.activo && propia;

      return (
        <>
          <Button
            variant="quiet"
            size="sm"
            aria-label={`Detalle de la cuenta de ${etiqueta}`}
            onClick={() => abrirDetalle(row)}
          >
            Detalle
          </Button>
          <Button
            variant={row.activo ? "danger-ghost" : "quiet"}
            size="sm"
            disabled={busy || alternarCuenta.busy || bloqueada}
            aria-label={
              bloqueada
                ? `Desactivar la cuenta de ${etiqueta} — es tu propia cuenta, acción no permitida`
                : `${row.activo ? "Desactivar" : "Activar"} la cuenta de ${etiqueta}`
            }
            onClick={() => alternar(row)}
          >
            {row.activo ? "Desactivar" : "Activar"}
          </Button>
        </>
      );
    },
  };
}
