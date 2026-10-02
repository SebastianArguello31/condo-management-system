from psycopg2 import sql
from psycopg2.errors import ForeignKeyViolation, UniqueViolation
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from app.core.db_helpers import query, transaction

def list_specialties():
    return query(
        """
        SELECT id_especialidad, nombre, descripcion, activo
        FROM especialidades
        ORDER BY nombre, id_especialidad;
        """,
        many=True,
    )

def create_specialty(data):
    try:
        return query(
            """
            INSERT INTO especialidades (nombre, descripcion, activo)
            VALUES (%s, %s, %s)
            RETURNING id_especialidad, nombre, descripcion, activo;
            """, (data["nombre"], data.get("descripcion", ""), data.get("activo", True),),
        )
    except UniqueViolation as error:
        if error.diag.constraint_name == "uq_especialidades_nombre":
            raise Conflict("Ya existe una especialidad con ese nombre") from None
        raise

def update_specialty(specialty_id, data):
    changes = dict(data)
    allowed_fields = {"nombre", "descripcion", "activo"}

    if not changes or not set(changes).issubset(allowed_fields):
        raise BadRequest("Campos inválidos")

    assignments = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(field)) for field in changes)

    statement = sql.SQL(
        """
        UPDATE especialidades
        SET {}
        WHERE id_especialidad = %s
        RETURNING id_especialidad, nombre, descripcion, activo;
        """
    ).format(assignments)

    try:
        specialty = query(statement, (*changes.values(), specialty_id),)
    except UniqueViolation as error:
        if error.diag.constraint_name == "uq_especialidades_nombre":
            raise Conflict("Ya existe una especialidad con ese nombre") from None
        raise

    if not specialty:
        raise NotFound("Especialidad no encontrada")

    return specialty

def _get_employee_for_specialties(cursor, employee_id):
    cursor.execute(
        """
        SELECT u.id_usuario, u.activo
        FROM usuarios u
        JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = %s AND r.nombre = %s
        FOR UPDATE OF u;
        """, (employee_id, "TECNICO"),
    )

    employee = cursor.fetchone()

    if not employee:
        raise NotFound("Empleado no encontrado")

    return employee

def list_employee_specialties(employee_id):
    with transaction() as cursor:
        _get_employee_for_specialties(cursor, employee_id)

        cursor.execute(
            """
            SELECT e.id_especialidad, e.nombre, e.descripcion, e.activo
            FROM usuario_especialidades ue
            JOIN especialidades e ON e.id_especialidad = ue.id_especialidad
            WHERE ue.id_usuario = %s
            ORDER BY e.nombre, e.id_especialidad;
            """, (employee_id,),
        )

        return cursor.fetchall()

def link_employee_specialty(employee_id, specialty_id):
    with transaction() as cursor:
        employee = _get_employee_for_specialties(cursor, employee_id,)

        if not employee["activo"]:
            raise BadRequest("Debes activar al empleado antes de asignar especialidades")

        cursor.execute(
            """
            SELECT id_especialidad, activo
            FROM especialidades
            WHERE id_especialidad = %s
            FOR SHARE;
            """, (specialty_id,),
        )

        specialty = cursor.fetchone()

        if not specialty:
            raise NotFound("Especialidad no encontrada")

        if not specialty["activo"]:
            raise BadRequest("No puedes asignar una especialidad inactiva")

        cursor.execute(
            """
            INSERT INTO usuario_especialidades (id_usuario, id_especialidad)
            VALUES (%s, %s)
            ON CONFLICT (id_usuario, id_especialidad)
            DO NOTHING;
            """, (employee_id, specialty_id),
        )

    return {"message": "Especialidad vinculada correctamente"}

def unlink_employee_specialty(employee_id, specialty_id):
    with transaction() as cursor:
        _get_employee_for_specialties(cursor, employee_id)
        cursor.execute("SELECT id_especialidad FROM usuario_especialidades WHERE id_usuario = %s", (employee_id,))
        assigned = {row["id_especialidad"] for row in cursor.fetchall()}
        if specialty_id not in assigned:
            raise NotFound("El empleado no tiene esa especialidad")
        if len(assigned) == 1:
            raise BadRequest("El empleado debe conservar al menos una especialidad")

        cursor.execute(
            """
            DELETE FROM usuario_especialidades
            WHERE id_usuario = %s AND id_especialidad = %s
            RETURNING id_especialidad;
            """, (employee_id, specialty_id),
        )

        if not cursor.fetchone():
            raise NotFound("El empleado no tiene vinculada esa especialidad")

def delete_specialty(specialty_id):
    """La FK impide borrar especialidades asignadas, incluso ante concurrencia."""
    try:
        deleted = query(
            "DELETE FROM especialidades WHERE id_especialidad = %s RETURNING id_especialidad",
            (specialty_id,),
        )
    except ForeignKeyViolation:
        raise Conflict(
            "No se puede eliminar: la especialidad está asignada a empleados "
            "o tiene registros relacionados. Puedes desactivarla para impedir nuevas asignaciones."
        ) from None
    if not deleted:
        raise NotFound("Especialidad no encontrada")
