from app.core.db_helpers import query

def lock_user_by_email(email, *, cursor):
    return query(
        """
            SELECT id_usuario, email, activo
            FROM usuarios
            WHERE lower(btrim(email)) = lower(btrim(%s))
            FOR UPDATE
        """,
        (email,),
        cursor=cursor,
    )

def lock_user_by_id(user_id, *, cursor):
    return query(
        """
            SELECT id_usuario, activo
            FROM usuarios
            WHERE id_usuario = %s
            FOR UPDATE
        """,
        (user_id,),
        cursor=cursor,
    )

def insert_reset_token(user_id, token_hash, *, cursor):
    query(
        """
            INSERT INTO recuperaciones_password (id_usuario, token_hash, expira_en)
            VALUES (%s, %s, clock_timestamp() + interval '30 minutes')
        """,
        (user_id, token_hash),
        cursor=cursor,
    )

def find_token_owner(token_hash, *, cursor):
    return query(
        """
            SELECT id_usuario
            FROM recuperaciones_password
            WHERE token_hash = %s
        """,
        (token_hash,),
        cursor=cursor,
    )

def consume_reset_token(user_id, token_hash, *, cursor):
    return query(
        """
            UPDATE recuperaciones_password
            SET usado_en = clock_timestamp()
            WHERE id_usuario = %s
            AND token_hash = %s
            AND usado_en IS NULL
            AND expira_en > clock_timestamp()
            RETURNING id_recuperacion
        """,
        (user_id, token_hash),
        cursor=cursor,
    )

def update_password(user_id, password_hash, *, cursor):
    query(
        """
            UPDATE usuarios
            SET password_hash = %s, session_version = session_version + 1
            WHERE id_usuario = %s
        """,
        (password_hash, user_id),
        cursor=cursor,
    )

def invalidate_pending_tokens(user_id, *, cursor):
    query(
        """
            UPDATE recuperaciones_password
            SET usado_en = clock_timestamp()
            WHERE id_usuario = %s
            AND usado_en IS NULL
        """,
        (user_id,),
        cursor=cursor,
    )