import CrudPage from "../../components/CrudPage";
import { useState } from "react";
import ResidentUnits from "./ResidentUnits";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  { name: "apellido", label: "Apellido", required: true, maxLength: 150 },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "telefono", label: "Teléfono", required: true, maxLength: 40 },
  {
    name: "password",
    label: "Contraseña",
    type: "password",
    required: true,
  },
  {
    name: "id_rol",
    label: "Rol",
    type: "select",
    required: true,
    lookup: "roles",
    optionId: "id_rol",
  },
  { name: "activo", label: "Activo", type: "checkbox" },
];

const columns = [
  { name: "id_usuario", label: "ID" },
  { name: "nombre", label: "Nombre" },
  { name: "apellido", label: "Apellido" },
  { name: "email", label: "Email" },
  { name: "telefono", label: "Teléfono" },
  { name: "rol", label: "Rol" },
  { name: "activo", label: "Activo" },
];

const lookups = [
  { name: "roles", endpoint: "/users/roles" },
];

export default function UsersPage() {
  const [selectedResident, setSelectedResident] = useState(null);

  if (selectedResident) {
    return (
      <ResidentUnits
        key={selectedResident.id_usuario}
        user={selectedResident}
        onClose={() => setSelectedResident(null)}
      />
    );
  }

  return (
    <CrudPage
      title="Usuarios"
      endpoint="/users"
      idField="id_usuario"
      fields={fields}
      columns={columns}
      lookups={lookups}
      renderExtraActions={(user, busy) =>
        user.rol === "RESIDENTE" ? (
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setSelectedResident(user)}
          >
            Unidades
          </button>
        ) : null
      }
    />
  );
}