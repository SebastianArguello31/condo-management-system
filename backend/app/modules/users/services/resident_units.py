from werkzeug.exceptions import BadRequest, NotFound
from app.core.db_helpers import query, transaction
from .accounts import get_user_by_id
def get_resident_units(user_id):
    if not get_user_by_id(user_id):
        raise NotFound("Usuario no encontrado")

    return query("""
        SELECT r.id_residente, u.id_unidad, u.codigo, u.piso, e.nombre AS edificio, tu.nombre AS tipo_unidad
        FROM residentes r
        JOIN unidades u ON u.id_unidad = r.id_unidad
        JOIN edificios e ON e.id_edificio = u.id_edificio
        JOIN tipo_unidad tu ON tu.id_tipo_unidad = u.id_tipo_unidad
        WHERE r.id_usuario = %s
        ORDER BY e.nombre, u.codigo;
    """, (user_id,), many=True)

def link_resident_unit(user_id, unit_id):
    with transaction() as cursor:
        cursor.execute("""
            SELECT u.id_usuario, u.activo, r.nombre AS rol
            FROM usuarios u
            JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.id_usuario = %s
            FOR SHARE OF u;
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            raise NotFound("Usuario no encontrado")

        if user["rol"] != "RESIDENTE":
            raise BadRequest("El usuario debe tener el rol RESIDENTE")

        if not user["activo"]:
            raise BadRequest("Debes activar al residente antes de vincularlo")

        cursor.execute("""
            SELECT id_unidad
            FROM unidades
            WHERE id_unidad = %s
            FOR KEY SHARE;
        """, (unit_id,))

        if not cursor.fetchone():
            raise NotFound("Unidad no encontrada")

        cursor.execute("""
            INSERT INTO residentes (id_usuario, id_unidad)
            VALUES (%s, %s)
            ON CONFLICT ON CONSTRAINT uq_residentes_usuario_unidad
            DO NOTHING;
        """, (user_id, unit_id))

    return {"message": "Unidad vinculada correctamente"}

def unlink_resident_unit(user_id, unit_id):
    deleted = query("""
        DELETE FROM residentes
        WHERE id_usuario = %s AND id_unidad = %s
        RETURNING id_residente;
    """, (user_id, unit_id))

    if not deleted:
        raise NotFound("El vínculo no existe")
