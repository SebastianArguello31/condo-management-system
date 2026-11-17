"""Agrega referencia a incidencias y notas en la tabla asignaciones."""

from alembic import op
import sqlalchemy as sa


revision = "s3_005_asignaciones_incidencia"
down_revision = "s3_004_password_reset"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "asignaciones",
        sa.Column(
            "id_incidencia",
            sa.Integer(),
            sa.ForeignKey("incidencias.id_incidencia", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.add_column(
        "asignaciones",
        sa.Column(
            "notas",
            sa.String(500),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_asignaciones_incidencia",
        "asignaciones",
        ["id_incidencia"],
    )
    op.create_index(
        "ix_asignaciones_personal",
        "asignaciones",
        ["id_personal_asignado"],
    )


def downgrade():
    op.drop_index(
        "ix_asignaciones_personal",
        table_name="asignaciones",
    )
    op.drop_index(
        "ix_asignaciones_incidencia",
        table_name="asignaciones",
    )
    op.drop_column("asignaciones", "notas")
    op.drop_column("asignaciones", "id_incidencia")
