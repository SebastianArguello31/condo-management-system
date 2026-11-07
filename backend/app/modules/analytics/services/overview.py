from app.core.db_helpers import transaction
from app.modules.analytics.repositories import catalogs
from app.modules.analytics.services import incidents, interventions, inventory


def get_dashboard_overview(filters, user):
    # Una sola transacción: todos los indicadores salen de la misma foto de datos
    # y se usa una única conexión en lugar de una por bloque.
    with transaction() as cursor:
        incident_data = incidents.compute(filters, user, cursor=cursor)
        intervention_data = interventions.compute(filters, user, cursor=cursor)
        inventory_data = inventory.compute(filters, user, cursor=cursor)

    summary = incident_data["resumen"]
    return {
        "filtros_aplicados": {
            key: (value.isoformat() if hasattr(value, "isoformat") else value)
            for key, value in filters.items() if value is not None
        },
        "kpis": {
            "total_incidencias": summary["total_incidencias"],
            "incidencias_pendientes": summary["incidencias_pendientes"],
            "incidencias_resueltas": summary["incidencias_resueltas"],
            "tasa_resolucion_porcentaje": summary["tasa_resolucion_porcentaje"],
            "tiempo_promedio_resolucion_horas": summary["tiempo_promedio_resolucion_horas"],
            "tasa_cumplimiento_sla_porcentaje": summary["tasa_cumplimiento_sla_porcentaje"],
            "total_intervenciones": intervention_data["resumen"]["total_intervenciones"],
            "pendientes_intervencion": intervention_data["resumen"]["pendientes_intervencion"],
            "insumos_bajo_stock": inventory_data["resumen"]["insumos_bajo_stock"],
            "costo_insumos_consumidos": inventory_data["resumen"]["costo_total_consumido"],
        },
        "incidencias": {key: value for key, value in incident_data.items() if key != "resumen"},
        "intervenciones": {"por_tecnico": intervention_data["por_tecnico"]},
        "inventario": {key: value for key, value in inventory_data.items() if key != "resumen"},
    }


def get_filter_options(user):
    with transaction() as cursor:
        options = {
            "edificios": catalogs.list_buildings(cursor=cursor),
            "tipos_incidencia": catalogs.list_types(cursor=cursor),
            "prioridades": catalogs.list_priorities(cursor=cursor),
            "tecnicos": [],
        }
        # El listado de técnicos es información administrativa (en incidents
        # /technicians también es solo ADMIN); el técnico ya está acotado a sí mismo.
        if user["rol"] == "ADMIN":
            options["tecnicos"] = catalogs.list_technicians(cursor=cursor)
        return options


def get_records(record_type, filters, user, *, status=None, limit=100):
    if record_type in ("incidencias", "incidencias_pendientes", "incidencias_resueltas"):
        return incidents.list_records(record_type, filters, user, status=status, limit=limit)
    if record_type in ("pendientes_intervencion", "intervenciones_realizadas"):
        return interventions.list_records(record_type, filters, user, limit=limit)
    return inventory.list_records(record_type, filters, user, limit=limit)
