from app.core.db_helpers import transaction
from app.modules.analytics.repositories import interventions as repo
from app.modules.analytics.services.common import technician_scope, with_percentage


def compute(filters, user, *, cursor):
    scope = technician_scope(user)
    kpis = repo.get_intervention_kpis(filters, scope, cursor=cursor)
    by_technician = repo.get_interventions_by_technician(filters, scope, cursor=cursor)
    return {
        "resumen": kpis,
        "por_tecnico": with_percentage(
            by_technician, kpis["total_intervenciones"], key="total_intervenciones",
        ),
    }


def get_intervention_metrics(filters, user):
    with transaction() as cursor:
        return compute(filters, user, cursor=cursor)


def list_records(record_type, filters, user, *, limit=100):
    scope = technician_scope(user)
    with transaction() as cursor:
        if record_type == "pendientes_intervencion":
            return repo.list_pending_interventions(filters, scope, limit=limit, cursor=cursor)
        return repo.list_interventions(filters, scope, limit=limit, cursor=cursor)
