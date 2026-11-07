/* AdminsPage — F2-6a: Administradores al kit. Crea cuentas
 * administradoras (POST /admins; MISMO payload que el legado: nombre,
 * apellido, email, telefono, password — el backend las registra con rol
 * ADMIN fijo, AdminCreateSchema NO recibe id_rol) y NO edita ni elimina
 * (criterio del análisis: sin editar cuentas, sin Eliminar, sin reset de
 * contraseña). Validación en cliente con `cuenta` (espejo EXACTO de
 * AccountSchema; NOTA: la decisión decía `cuentaAdmin`, pero ese schema
 * espeja UserCreateSchema del script con id_rol requerido — enviar id_rol
 * a POST /admins da 400 de campo desconocido; hay REPORTE en el plan).
 * Columnas Usuario/Email/Rol/Estado/Creada (formatDate) SIN columna ID;
 * estado con StatusBadge override (ACTIVA success+check / INACTIVA
 * muted). Acciones por fila: "Detalle" (el MISMO GET /users/:id del
 * legado, Modal + DefinitionList, footer "Cerrar") y Activar/Desactivar
 * (PATCH /users/:id {activo}, useConfirm danger solo al desactivar,
 * useMutation, Toast; deshabilitado sobre la cuenta propia). Carga con
 * useQuery + signal (Skeleton sin parpadeo de Reintentar; error →
 * ErrorState). Sin window.confirm. */
import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import { cuenta } from "../../validations";
import { formatDate } from "../../utils/format";
import AccountDetailModal, {
  estadoCuenta,
  useCuentaAcceso,
} from "./AccountDetailModal";

const fields = [
  { name: "nombre", label: "Nombre", required: true, maxLength: 150 },
  { name: "apellido", label: "Apellido", required: true, maxLength: 150 },
  { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
  { name: "telefono", label: "Teléfono", required: true, maxLength: 40 },
  { name: "password", label: "Contraseña", type: "password", required: true, maxLength: 72 },
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

export default function AdminsPage({ user }) {
  const [accesoSenal, setAccesoSenal] = useState(0);
  const acceso = useCuentaAcceso({
    user,
    onChanged: () => setAccesoSenal((senal) => senal + 1),
  });

  return (
    <>
      <CrudPage
        variant="ui"
        title="Administradores"
        description="Administra las cuentas de administración del condominio."
        endpoint={routes.admins}
        idField="id_usuario"
        schema={cuenta}
        fields={fields}
        columns={columns}
        createLabel="Nuevo administrador"
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
