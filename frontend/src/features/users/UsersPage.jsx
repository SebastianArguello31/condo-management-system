/* Consulta de usuarios y gestión de accesos mediante las acciones compartidas.
 * El listado no permite crear, editar ni eliminar cuentas. */
import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import { roleLabel } from "../../utils/roles";
import AccountDetailModal, { estadoCuenta, useCuentaAcceso, } from "./AccountDetailModal";

const columns = [
  {
    name: "nombre",
    label: "Usuario",
    render: (row) =>
      [row.nombre, row.apellido].filter(Boolean).join(" ") || "—",
  },
  { name: "email", label: "Email" },
  {
    /* F2-12a: rol legible (roleLabel, §8-bis convenciones); la BÚSQUEDA
     * sigue usando el valor crudo de row.rol (el filtro de CrudPageUi
     * lee row[column.name], no el render). */
    name: "rol",
    label: "Rol",
    render: (row) => roleLabel(row.rol),
  },
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
