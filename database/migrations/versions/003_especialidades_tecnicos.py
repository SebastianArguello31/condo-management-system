"""Agrega especialidades y su relación con técnicos."""

from alembic import op
import sqlalchemy as sa


revision = "s3_003_especialidades"
down_revision = "c4100e5cff4d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "especialidades",
        sa.Column(
            "id_especialidad",
            sa.Integer(),
            sa.Identity(),
            primary_key=True,
        ),
        sa.Column(
            "nombre",
            sa.String(100),
            nullable=False,
        ),
        sa.Column(
            "descripcion",
            sa.String(500),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "activo",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.CheckConstraint(
            "length(btrim(nombre)) > 0",
            name="ck_especialidades_nombre_no_vacio",
        ),
    )

    op.execute("""
        CREATE UNIQUE INDEX uq_especialidades_nombre
        ON especialidades (lower(btrim(nombre)));
    """)

    op.create_table(
        "usuario_especialidades",
        sa.Column(
            "id_usuario",
            sa.Integer(),
            sa.ForeignKey("usuarios.id_usuario"),
            primary_key=True,
        ),
        sa.Column(
            "id_especialidad",
            sa.Integer(),
            sa.ForeignKey("especialidades.id_especialidad"),
            primary_key=True,
        ),
    )

    op.create_index(
        "ix_usuario_especialidades_especialidad",
        "usuario_especialidades",
        ["id_especialidad"],
    )


def downgrade():
    op.drop_index(
        "ix_usuario_especialidades_especialidad",
        table_name="usuario_especialidades",
    )
    op.drop_table("usuario_especialidades")

    op.drop_index(
        "uq_especialidades_nombre",
        table_name="especialidades",
    )
    op.drop_table("especialidades")