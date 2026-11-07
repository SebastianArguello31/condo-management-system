"""Agrega el catálogo parametrizable de categorías de insumo."""

from alembic import op
import sqlalchemy as sa


revision = "s4_010_categorias_insumo"
down_revision = "s4_009_inventario_insumos"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "categorias_insumo",
        sa.Column("id_categoria_insumo", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.Column("descripcion", sa.String(500), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index(
        "uq_categorias_insumo_nombre_normalizado",
        "categorias_insumo",
        [sa.text("lower(btrim(nombre))")],
        unique=True,
    )
    op.execute(
        """
        UPDATE insumos
        SET categoria = CASE
            WHEN btrim(categoria) = '' THEN 'GENERAL'
            ELSE btrim(categoria)
        END;
        """
    )
    op.execute(
        """
        INSERT INTO categorias_insumo (nombre, activo)
        SELECT min(btrim(categoria)), TRUE
        FROM insumos
        WHERE categoria IS NOT NULL
        GROUP BY lower(btrim(categoria))
        ON CONFLICT DO NOTHING;
        """
    )
    op.execute(
        """
        UPDATE insumos AS i
        SET categoria = c.nombre
        FROM categorias_insumo AS c
        WHERE lower(btrim(i.categoria)) = lower(btrim(c.nombre));
        """
    )


def downgrade():
    op.drop_index(
        "uq_categorias_insumo_nombre_normalizado",
        table_name="categorias_insumo",
    )
    op.drop_table("categorias_insumo")
