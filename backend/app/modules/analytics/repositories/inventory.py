from app.core.db_helpers import query
from app.modules.analytics.repositories.incidents import date_range

# Fuente de verdad del consumo: movimientos de inventario vinculados a una
# intervención. SALIDA suma y DEVOLUCION resta, por lo que el resultado es el
# consumo neto. El costo usa el precio unitario congelado al momento del
# consumo (subtotal / cantidad_utilizada de intervencion_insumos).
CONSUMPTION_FROM = """
    FROM movimientos_insumo m
    JOIN intervencion_insumos ii
        ON ii.id_intervencion = m.id_intervencion AND ii.id_insumo = m.id_insumo
    JOIN insumos ins ON ins.id_insumo = m.id_insumo
    JOIN intervenciones v ON v.id_intervencion = m.id_intervencion
    JOIN incidencias i ON i.id_incidencia = v.id_incidencia
    LEFT JOIN unidades u ON u.id_unidad = i.id_unidad
    LEFT JOIN espacios_comunes ec ON ec.id_espacio_comun = i.id_espacio_comun
"""

SIGNED_QUANTITY = "CASE WHEN m.tipo = 'SALIDA' THEN m.cantidad ELSE -m.cantidad END"
SIGNED_COST = f"({SIGNED_QUANTITY}) * ii.subtotal / NULLIF(ii.cantidad_utilizada, 0)"


def build_consumption_filters(filters, technician_id=None):
    conditions, params = date_range("m.fecha", filters)
    conditions.insert(0, "m.tipo IN ('SALIDA', 'DEVOLUCION') AND m.id_intervencion IS NOT NULL")

    if filters.get("id_edificio"):
        conditions.append("COALESCE(u.id_edificio, ec.id_edificio) = %s")
        params.append(filters["id_edificio"])

    if filters.get("id_tipo_incidencia"):
        conditions.append("i.id_tipo_incidencia = %s")
        params.append(filters["id_tipo_incidencia"])

    if filters.get("id_prioridad"):
        conditions.append("i.id_prioridad = %s")
        params.append(filters["id_prioridad"])

    if filters.get("id_tecnico"):
        conditions.append("v.id_personal = %s")
        params.append(filters["id_tecnico"])

    if technician_id is not None:
        conditions.append("v.id_personal = %s")
        params.append(technician_id)

    return " AND ".join(conditions), params


def count_low_stock(*, cursor):
    return query(
        """
        SELECT COUNT(*) AS insumos_bajo_stock
        FROM insumos
        WHERE activo = TRUE AND stock <= stock_minimo
        """,
        cursor=cursor,
    )["insumos_bajo_stock"]


def list_low_stock(*, limit=100, cursor):
    return query(
        """
        SELECT id_insumo, nombre, categoria, unidad_medida, stock, stock_minimo,
               (stock_minimo - stock) AS faltante, costo_unitario
        FROM insumos
        WHERE activo = TRUE AND stock <= stock_minimo
        ORDER BY (stock - stock_minimo) ASC, nombre
        LIMIT %s
        """,
        (limit,), many=True, cursor=cursor,
    )


def get_consumption_totals(filters, technician_id=None, *, cursor):
    where, params = build_consumption_filters(filters, technician_id)
    return query(
        f"""
        SELECT COALESCE(SUM({SIGNED_COST}), 0) AS costo_total_consumido,
               COALESCE(SUM({SIGNED_QUANTITY}), 0) AS total_unidades_consumidas
        {CONSUMPTION_FROM}
        WHERE {where}
        """,
        tuple(params), cursor=cursor,
    )


def get_top_consumed_items(filters, technician_id=None, *, limit=5, cursor):
    where, params = build_consumption_filters(filters, technician_id)
    return query(
        f"""
        SELECT ins.id_insumo, ins.nombre AS insumo, ins.categoria, ins.unidad_medida,
               SUM({SIGNED_QUANTITY}) AS total_consumido,
               SUM({SIGNED_COST}) AS costo_total,
               COUNT(DISTINCT m.id_intervencion) AS intervenciones
        {CONSUMPTION_FROM}
        WHERE {where}
        GROUP BY ins.id_insumo, ins.nombre, ins.categoria, ins.unidad_medida
        HAVING SUM({SIGNED_QUANTITY}) > 0
        ORDER BY total_consumido DESC, ins.nombre
        LIMIT %s
        """,
        tuple(params + [limit]), many=True, cursor=cursor,
    )


def get_consumption_timeline(filters, technician_id=None, *, cursor):
    where, params = build_consumption_filters(filters, technician_id)
    return query(
        f"""
        SELECT TO_CHAR(m.fecha::date, 'YYYY-MM-DD') AS fecha,
               SUM({SIGNED_COST}) AS costo,
               SUM({SIGNED_QUANTITY}) AS cantidad
        {CONSUMPTION_FROM}
        WHERE {where}
        GROUP BY m.fecha::date
        ORDER BY m.fecha::date
        """,
        tuple(params), many=True, cursor=cursor,
    )
