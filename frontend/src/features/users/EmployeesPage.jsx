/* EmployeesPage — F2-6a: Empleados al kit (bug B4 "por verificar con
 * captura del dueño"; NO se declara cerrado). Crea cuentas de personal
 * técnico (POST /employees con el payload del legado: campos de cuenta +
 * especialidad_ids como array de NÚMEROS, mínimo 1 — schemas espejo del
 * backend con validate(): cuentaEmpleado) y NO edita ni elimina (criterio
 * del análisis: sin editar cuentas, sin Eliminar, sin reset de
 * contraseña). Columnas Usuario/Email/Rol/Estado/Creada (formatDate) SIN
 * columna ID; especialidades del formulario como CHECKBOXES del catálogo
 * ACTIVO (tipo aditivo "checks" de CrudPageUi; mínimo 1) con ayuda "Marca
 * todas las especialidades que correspondan." y error por campo del
 * schema (español neutro). Estado con StatusBadge override (ACTIVA
 * success+check / INACTIVA muted). Acciones por fila: "Detalle" (el
 * MISMO GET /users/:id del legado, Modal + DefinitionList, footer
 * "Cerrar") y Activar/Desactivar (PATCH /users/:id {activo}, useConfirm
 * danger solo al desactivar, useMutation, Toast; deshabilitado sobre la
 * cuenta propia). Carga con useQuery + signal (Skeleton sin parpadeo de
 * Reintentar; error → ErrorState). Sin window.confirm. */
import { useState } from "react";
import { routes } from "../../services/routes";
import CrudPage from "../../components/CrudPage";
import { StatusBadge } from "../../components/ui";
import { cuentaEmpleado } from "../../validations";
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
        title="Empleados"
        description="Administra las cuentas del personal técnico y sus especialidades."
        endpoint={routes.employees}
        idField="id_usuario"
        schema={cuentaEmpleado}
        fields={fields}
        columns={columns}
        lookups={lookups}
        createLabel="Nuevo empleado"
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
