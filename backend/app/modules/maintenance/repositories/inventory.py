from app.core.db_helpers import query


def list_items(*, search=None, category=None, low_stock=False, active=None, cursor):
    conditions = ["TRUE"]
    params = []
    if search:
        conditions.append("(i.nombre ILIKE %s OR i.descripcion ILIKE %s)")
        params.extend((f"%{search}%", f"%{search}%"))
    if category:
        conditions.append("i.categoria = %s")
        params.append(category)
    if low_stock:
        conditions.append("i.stock <= i.stock_minimo")
    if active is not None:
        conditions.append("i.activo = %s")
        params.append(active)
    return query(
        f"""
        SELECT i.id_insumo, i.nombre, i.descripcion, i.categoria,
               i.unidad_medida, i.stock_minimo, i.costo_unitario, i.stock,
               i.activo, (i.stock <= i.stock_minimo) AS bajo_stock
        FROM insumos i
        WHERE {' AND '.join(conditions)}
        ORDER BY i.nombre, i.id_insumo
        """,
        tuple(params), many=True, cursor=cursor,
    )


def get_item(item_id, *, cursor, for_update=False):
    lock = " FOR UPDATE" if for_update else ""
    return query(
        f"""
        SELECT id_insumo, nombre, descripcion, categoria, unidad_medida,
               stock_minimo, costo_unitario, stock, activo
        FROM insumos WHERE id_insumo = %s{lock}
        """,
        (item_id,), cursor=cursor,
    )


def insert_item(data, *, cursor):
    return query(
        """
        INSERT INTO insumos
            (nombre, descripcion, categoria, unidad_medida, stock_minimo,
             costo_unitario, stock)
        VALUES (%s, %s, %s, %s, %s, %s, 0)
        RETURNING id_insumo
        """,
        (
            data["nombre"], data.get("descripcion"), data["categoria"],
            data["unidad_medida"], data["stock_minimo"], data["costo_unitario"],
        ), cursor=cursor,
    )


def update_item(item_id, data, *, cursor):
    allowed = {
        "nombre", "descripcion", "categoria", "unidad_medida",
        "stock_minimo", "costo_unitario", "activo",
    }
    fields = [name for name in data if name in allowed]
    assignments = ", ".join(f"{name} = %s" for name in fields)
    values = [data[name] for name in fields]
    return query(
        f"UPDATE insumos SET {assignments} WHERE id_insumo = %s RETURNING id_insumo",
        (*values, item_id), cursor=cursor,
    )


def change_stock(item_id, delta, *, cursor, allow_inactive=False):
    active_clause = "" if allow_inactive else "AND activo = TRUE"
    return query(
        f"""
        UPDATE insumos
        SET stock = stock + %s
        WHERE id_insumo = %s AND stock + %s >= 0
          {active_clause}
        RETURNING stock
        """,
        (delta, item_id, delta), cursor=cursor,
    )


def has_initial_movement(item_id, *, cursor):
    return query(
        "SELECT 1 FROM movimientos_insumo WHERE id_insumo = %s AND tipo = 'INICIAL'",
        (item_id,), cursor=cursor,
    ) is not None


def insert_movement(
    item_id, kind, quantity, resulting_stock, reason, actor_id, *,
    intervention_id=None, cursor,
):
    return query(
        """
        INSERT INTO movimientos_insumo
            (id_insumo, tipo, cantidad, stock_resultante, motivo,
             id_responsable, id_intervencion)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id_movimiento, fecha
        """,
        (item_id, kind, quantity, resulting_stock, reason, actor_id, intervention_id),
        cursor=cursor,
    )


def insert_consumption(intervention_id, item_id, quantity, subtotal, actor_id, *, cursor):
    return query(
        """
        INSERT INTO intervencion_insumos
            (cantidad_utilizada, subtotal, id_intervencion, id_insumo, id_responsable)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id_intervencion_insumos
        """,
        (quantity, subtotal, intervention_id, item_id, actor_id), cursor=cursor,
    )


def list_movements(
    item_id, *, since=None, until=None, kind=None, intervention_id=None, cursor,
):
    conditions = ["m.id_insumo = %s"]
    params = [item_id]
    for value, clause in (
        (since, "m.fecha >= %s"), (until, "m.fecha < %s"),
        (kind, "m.tipo = %s"), (intervention_id, "m.id_intervencion = %s"),
    ):
        if value is not None:
            conditions.append(clause)
            params.append(value)
    return query(
        f"""
        SELECT m.id_movimiento, m.tipo, m.cantidad, m.stock_resultante,
               m.motivo, m.fecha, m.id_responsable,
               u.nombre AS responsable_nombre, u.apellido AS responsable_apellido,
               m.id_intervencion
        FROM movimientos_insumo m
        JOIN usuarios u ON u.id_usuario = m.id_responsable
        WHERE {' AND '.join(conditions)}
        ORDER BY m.fecha DESC, m.id_movimiento DESC
        """,
        tuple(params), many=True, cursor=cursor,
    )


def intervention_consumed(item_id, intervention_id, *, cursor):
    row = query(
        """
        SELECT COALESCE(SUM(cantidad_utilizada), 0) AS cantidad
        FROM intervencion_insumos
        WHERE id_insumo = %s AND id_intervencion = %s
        """,
        (item_id, intervention_id), cursor=cursor,
    )
    return row["cantidad"]


def intervention_returned(item_id, intervention_id, *, cursor):
    row = query(
        """
        SELECT COALESCE(SUM(cantidad), 0) AS cantidad
        FROM movimientos_insumo
        WHERE id_insumo = %s AND id_intervencion = %s AND tipo = 'DEVOLUCION'
        """,
        (item_id, intervention_id), cursor=cursor,
    )
    return row["cantidad"]
