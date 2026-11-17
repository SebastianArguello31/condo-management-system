"""Garantiza la unicidad del correo normalizado."""

from alembic import op
import sqlalchemy as sa


revision = "s3_008_email_normalizado"
down_revision = "s3_007_comentarios"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "uq_usuarios_correo_normalizado",
        "usuarios",
        [sa.text("lower(btrim(email))")],
        unique=True,
    )


def downgrade():
    op.drop_index(
        "uq_usuarios_correo_normalizado",
        table_name="usuarios",
    )