from app.core.db_helpers import query


def get_intervention(intervention_id, *, cursor, for_update=False):
    lock = " FOR UPDATE" if for_update else ""
    return query(
        f"""
        SELECT id_intervencion, id_incidencia, id_personal
        FROM intervenciones WHERE id_intervencion = %s{lock}
        """,
        (intervention_id,), cursor=cursor,
    )


def list_consumptions(intervention_id, *, cursor):
    return query(
        """
        SELECT ii.id_intervencion_insumos, ii.id_insumo, i.nombre AS insumo,
               i.unidad_medida, ii.cantidad_utilizada, ii.subtotal,
               ii.id_responsable, ii.id_intervencion
        FROM intervencion_insumos ii
        JOIN insumos i ON i.id_insumo = ii.id_insumo
        WHERE ii.id_intervencion = %s
        ORDER BY ii.id_intervencion_insumos
        """,
        (intervention_id,), many=True, cursor=cursor,
    )
