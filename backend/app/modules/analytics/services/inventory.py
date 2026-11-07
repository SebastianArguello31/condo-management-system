from app.core.db_helpers import transaction
from app.modules.analytics.repositories import inventory as repo
from app.modules.analytics.services.common import numeric_rows, technician_scope, to_number


def compute(filters, user, *, cursor):
    scope = technician_scope(user)
    totals = repo.get_consumption_totals(filters, scope, cursor=cursor)
    return {
        "resumen": {
            # El catálogo de stock es global (DEV2 ya lo expone a ADMIN y TECNICO);
            # los consumos sí se acotan a las intervenciones del técnico.
            "insumos_bajo_stock": repo.count_low_stock(cursor=cursor),
            "costo_total_consumido": round(to_number(totals["costo_total_consumido"]), 2),
            "total_unidades_consumidas": to_number(totals["total_unidades_consumidas"]),
        },
        "top_insumos": numeric_rows(
            repo.get_top_consumed_items(filters, scope, limit=5, cursor=cursor),
            "total_consumido", "costo_total",
        ),
        "insumos_bajo_stock": numeric_rows(
            repo.list_low_stock(limit=10, cursor=cursor),
            "stock", "stock_minimo", "faltante", "costo_unitario",
        ),
        "evolucion_consumos": numeric_rows(
            repo.get_consumption_timeline(filters, scope, cursor=cursor), "costo", "cantidad",
        ),
    }


def get_inventory_metrics(filters, user):
    with transaction() as cursor:
        return compute(filters, user, cursor=cursor)


def list_records(record_type, filters, user, *, limit=100):
    with transaction() as cursor:
        if record_type == "insumos_bajo_stock":
            return numeric_rows(
                repo.list_low_stock(limit=limit, cursor=cursor),
                "stock", "stock_minimo", "faltante", "costo_unitario",
            )
        return numeric_rows(
            repo.get_top_consumed_items(filters, technician_scope(user), limit=limit, cursor=cursor),
            "total_consumido", "costo_total",
        )
