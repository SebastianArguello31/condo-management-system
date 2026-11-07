from decimal import Decimal


def technician_scope(user):
    """Un técnico solo ve datos de sus asignaciones; el admin ve todo."""
    return user["id_usuario"] if user["rol"] == "TECNICO" else None


def to_number(value):
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return float(value)
    return value


def numeric_rows(rows, *keys):
    """Convierte Decimal a número para que el JSON sea homogéneo (Flask los serializa como texto)."""
    rows = rows or []
    for row in rows:
        for key in keys:
            row[key] = to_number(row.get(key))
    return rows


def with_percentage(rows, total, key="total"):
    for row in rows:
        row["porcentaje"] = percentage(row[key], total)
    return rows


def percentage(part, total):
    return round(part * 100 / total, 1) if total else 0.0
