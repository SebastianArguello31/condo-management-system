/* UsersPage — F2-6a: Usuarios y accesos al kit (bugs B1/B4 "por verificar
 * con captura del dueño"; NO se declaran cerrados).
 * Listado de SOLO LECTURA + gestión de acceso: CrudPage modo ui
 * (variant="ui"): useQuery con signal (Skeleton sin parpadeo de
 * Reintentar — B9; ErrorState con Reintentar en error de carga), sin
 * columna ID, sin crear/editar/eliminar. MISMO endpoint que el legado
 * (GET /users) y MISMO payload del toggle (PATCH /users/:id {activo}).
 * Columnas Usuario/Email/Rol/Estado (StatusBadge override ACTIVA
 * success+check / INACTIVA muted). Acciones por fila compartidas de
 * AccountDetailModal: "Detalle" (Modal + DefinitionList, mismo GET
 * /users/:id que el legado, footer "Cerrar") y "Activar/Desactivar"
 * (useConfirm danger solo al desactivar, useMutation con dedupe, Toast;
 * sobre la propia cuenta del ADMIN "Desactivar" queda deshabilitado con
 * aria-label explicativo). */
import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import AccountDetailModal, {
  estadoCuenta,
  useCuentaAcceso,
} from "./AccountDetailModal";

const columns = [
  {
    name: "nombre",
    label: "Usuario",
    render: (row) =>
      [row.nombre, row.apellido].filter(Boolean).join(" ") || "—",
  },
  { name: "email", label: "Email" },
  { name: "rol", label: "Rol" },
  {
    /* "estado" no existe en la fila (el flag real es `activo` booleano):
     * excluye el estado de la búsqueda para que "true"/"false" no se
     * comporten como texto. Presentación con override de módulo. */
    name: "estado",
    label: "Estado",
    render: (row) => <StatusBadge {...estadoCuenta(Boolean(row.activo))} />,
  },
];

export default function UsersPage({ user }) {
  const [accesoSenal, setAccesoSenal] = useState(0);
  const acceso = useCuentaAcceso({
    user,
    onChanged: () => setAccesoSenal((senal) => senal + 1),
  });

  return (
    <>
      <CrudPage
        variant="ui"
        title="Usuarios"
        description="Consulta las cuentas del condominio y activa o desactiva sus accesos."
        endpoint={routes.users}
        idField="id_usuario"
        columns={columns}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        getRecordLabel={(row) => `cuenta de ${row.nombre} ${row.apellido}`}
        renderExtraActions={acceso.renderExtraActions}
        reloadSignal={accesoSenal}
      />
      {acceso.detalle && (
        <AccountDetailModal usuario={acceso.detalle} onClose={acceso.cerrarDetalle} />
      )}
    </>
  );
}
