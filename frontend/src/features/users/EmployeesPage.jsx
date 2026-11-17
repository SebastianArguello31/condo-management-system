/* Creación de técnicos con especialidades y gestión de sus accesos.
 * Las especialidades seleccionadas se envían como identificadores numéricos. */
import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import { cuentaEmpleado } from "../../validations";
import { formatDate } from "../../utils/format";
import { roleLabel } from "../../utils/roles";
import AccountDetailModal, { estadoCuenta, useCuentaAcceso, } from "./AccountDetailModal";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  { name: "apellido", label: "Apellido", required: true, maxLength: 150 },
  { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
  { name: "telefono", label: "Teléfono", required: true, maxLength: 40 },
  { name: "password", label: "Contraseña", type: "password", required: true, maxLength: 72 },
  {
    name: "especialidad_ids",
    label: "Especialidades",
    type: "checks",
    lookup: "specialties",
    optionId: "id_especialidad",
    required: true,
    onlyActive: true,
    emptyMessage: "No hay especialidades activas en el catálogo.",
    help: "Marca todas las especialidades que correspondan.",
  },
];

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
    /* name "estado": el flag real es `activo` booleano; por fuera de la
     * búsqueda intencional (ver UsersPage). */
    name: "estado",
    label: "Estado",
    render: (row) => <StatusBadge {...estadoCuenta(Boolean(row.activo))} />,
  },
  {
    name: "created_at",
    label: "Creada",
    render: (row) => formatDate(row.created_at) || "—",
  },
];

const lookups = [{ name: "specialties", endpoint: routes.specialties }];

export default function EmployeesPage({ user }) {
  const [accesoSenal, setAccesoSenal] = useState(0);
  const acceso = useCuentaAcceso({
    user,
    onChanged: () => setAccesoSenal((senal) => senal + 1),
  });

  return (
    <>
      <CrudPage
        variant="ui"
        title="Técnicos"
        description="Administra las cuentas de los técnicos y sus especialidades."
        endpoint={routes.employees}
        idField="id_usuario"
        schema={cuentaEmpleado}
        fields={fields}
        columns={columns}
        lookups={lookups}
        createLabel="Nuevo técnico"
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
