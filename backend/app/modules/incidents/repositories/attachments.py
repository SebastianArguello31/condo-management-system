from app.core.db_helpers import query

def list_attachments(incident_id, *, cursor):
    return query(
        """
        SELECT
            id_adjuntos_incidencia,
            COALESCE(nombre_original, 'Adjunto') AS nombre_original,
            tipo
        FROM adjuntos_incidencia
        WHERE incidencias_id_incidencia = %s
        ORDER BY id_adjuntos_incidencia;
        """,
        (incident_id,),
        many=True,
        cursor=cursor,
    )

def get_attachment(attachment_id, *, cursor):
    return query(
        """
        SELECT
            url_archivo,
            nombre_original,
            incidencias_id_incidencia
        FROM adjuntos_incidencia
        WHERE id_adjuntos_incidencia = %s;
        """,
        (attachment_id,),
        cursor=cursor,
    )

def insert_attachment(incident_id, user_id, file, *, cursor):
    query(
        """
        INSERT INTO adjuntos_incidencia (
            url_archivo,
            nombre_original,
            tipo,
            fecha,
            id_usuario,
            incidencias_id_incidencia
        )
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP, %s, %s);
        """,
        (file["stored_name"], file["original_name"], file["mime_type"], user_id, incident_id,),
        cursor=cursor,
    )