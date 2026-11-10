import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import { cuenta } from "../../validations";
import { formatDate } from "../../utils/format";
import AccountDetailModal, { estadoCuenta, useCuentaAcceso, } from "./AccountDetailModal";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  { name: "apellido", label: "Apellido", required: true, maxLength: 150 },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    maxLength: 254,
  },
  {
    name: "telefono",
    label: "Teléfono",
    required: true,
    maxLength: 40,
  },
  {
    name: "password",
    label: "Contraseña",
    type: "password",
    required: true,
    maxLength: 72,
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
  { name: "rol", label: "Rol" },
  {
    name: "estado",
    label: "Estado",
    render: (row) => (
      <StatusBadge {...estadoCuenta(Boolean(row.activo))} />
    ),
  },
  {
    name: "created_at",
    label: "Creada",
    render: (row) => formatDate(row.created_at) || "—",
  },
];

export default function ManagersPage({ user }) {
  const [accesoSenal, setAccesoSenal] = useState(0);

  const acceso = useCuentaAcceso({
    user,
    onChanged: () => setAccesoSenal((senal) => senal + 1),
  });

  return (
    <>
      <CrudPage
        variant="ui"
        title="Gestores"
        description="Administra las cuentas que asignan incidencias y aprueban reservas."
        endpoint={routes.managers}
        idField="id_usuario"
        schema={cuenta}
        fields={fields}
        columns={columns}
        createLabel="Nuevo gestor"
        canEdit={false}
        canDelete={false}
        getRecordLabel={(row) => `cuenta de ${row.nombre} ${row.apellido}`}
        renderExtraActions={acceso.renderExtraActions}
        reloadSignal={accesoSenal}
      />

      {acceso.detalle && (
        <AccountDetailModal
          usuario={acceso.detalle}
          onClose={acceso.cerrarDetalle}
        />
      )}
    </>
  );
}