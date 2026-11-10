# Acceso SQL a categorías de insumos.
# Encapsula las consultas usadas por los servicios de este módulo.
from app.core.db_helpers import query

def list_categories(*, active=None, cursor):
    condition = "" if active is None else "WHERE activo = %s"
    params = () if active is None else (active,)
    return query(
        f"""
            SELECT id_categoria_insumo, nombre, descripcion, activo
            FROM categorias_insumo
            {condition}
            ORDER BY nombre, id_categoria_insumo;
        """,
        params,
        many=True,
        cursor=cursor,
    )

def get_category(category_id, *, cursor, for_update=False):
    lock = " FOR UPDATE" if for_update else ""
    return query(
        f"""
            SELECT id_categoria_insumo, nombre, descripcion, activo
            FROM categorias_insumo
            WHERE id_categoria_insumo = %s{lock};
        """,
        (category_id,),
        cursor=cursor,
    )

def get_category_by_name(name, *, cursor, for_share=False):
    lock = " FOR SHARE" if for_share else ""
    return query(
        f"""
            SELECT id_categoria_insumo, nombre, descripcion, activo
            FROM categorias_insumo
            WHERE lower(btrim(nombre)) = lower(btrim(%s))
            ORDER BY id_categoria_insumo
            LIMIT 1{lock};
        """,
        (name,),
        cursor=cursor,
    )

def insert_category(data, *, cursor):
    return query(
        """
            INSERT INTO categorias_insumo (nombre, descripcion, activo)
            VALUES (%s, %s, %s)
            RETURNING id_categoria_insumo, nombre, descripcion, activo;
        """,
        (data["nombre"], data.get("descripcion"), data.get("activo", True)),
        cursor=cursor,
    )

def update_category(category_id, previous_name, data, *, cursor):
    query(
        """
            UPDATE categorias_insumo
            SET nombre = %s, descripcion = %s, activo = %s
            WHERE id_categoria_insumo = %s;
        """,
        (
            data.get("nombre", previous_name),
            data.get("descripcion"),
            data.get("activo", True),
            category_id,
        ),
        cursor=cursor,
    )

    new_name = data.get("nombre", previous_name)
    if new_name != previous_name:
        query(
            "UPDATE insumos SET categoria = %s WHERE categoria = %s;",
            (new_name, previous_name),
            cursor=cursor,
        )

    return get_category(category_id, cursor=cursor)


def count_items_by_category(name, *, cursor):
    row = query(
        "SELECT COUNT(*) AS total FROM insumos WHERE categoria = %s;",
        (name,),
        cursor=cursor,
    )
    return row["total"]


def delete_category(category_id, *, cursor):
    return query(
        """
            DELETE FROM categorias_insumo
            WHERE id_categoria_insumo = %s
            RETURNING id_categoria_insumo;
        """,
        (category_id,),
        cursor=cursor,
    )
