"""Agrega inventario y trazabilidad de movimientos de insumos."""

from alembic import op
import sqlalchemy as sa


revision = "s4_009_inventario_insumos"
down_revision = "s3_008_email_normalizado"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "insumos",
        "stock",
        existing_type=sa.Integer(),
        type_=sa.Numeric(12, 3),
        postgresql_using="stock::numeric",
    )
    op.add_column("insumos", sa.Column("descripcion", sa.Text(), nullable=True))
    op.add_column(
        "insumos",
        sa.Column("categoria", sa.String(80), nullable=False, server_default="GENERAL"),
    )
    op.add_column(
        "insumos",
        sa.Column("stock_minimo", sa.Numeric(12, 3), nullable=False, server_default="0"),
    )
    op.add_column(
        "insumos",
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_check_constraint("ck_insumos_stock_no_negativo", "insumos", "stock >= 0")
    op.create_check_constraint(
        "ck_insumos_stock_minimo_no_negativo", "insumos", "stock_minimo >= 0"
    )
    op.create_check_constraint(
        "ck_insumos_costo_no_negativo", "insumos", "costo_unitario >= 0"
    )

    op.create_table(
        "movimientos_insumo",
        sa.Column("id_movimiento", sa.Integer(), primary_key=True),
        sa.Column("id_insumo", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 3), nullable=False),
        sa.Column("stock_resultante", sa.Numeric(12, 3), nullable=False),
        sa.Column("motivo", sa.String(500), nullable=False),
        sa.Column(
            "fecha", sa.DateTime(), nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column("id_responsable", sa.Integer(), nullable=False),
        sa.Column("id_intervencion", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["id_insumo"], ["insumos.id_insumo"]),
        sa.ForeignKeyConstraint(["id_responsable"], ["usuarios.id_usuario"]),
        sa.ForeignKeyConstraint(
            ["id_intervencion"], ["intervenciones.id_intervencion"]
        ),
        sa.CheckConstraint(
            "tipo IN ('INICIAL', 'ENTRADA', 'SALIDA', 'AJUSTE_ENTRADA', "
            "'AJUSTE_SALIDA', 'DEVOLUCION')",
            name="ck_movimientos_insumo_tipo",
        ),
        sa.CheckConstraint("cantidad > 0", name="ck_movimientos_insumo_cantidad"),
        sa.CheckConstraint(
            "stock_resultante >= 0", name="ck_movimientos_insumo_stock_resultante"
        ),
    )
    op.create_index(
        "ix_movimientos_insumo_insumo_fecha",
        "movimientos_insumo",
        ["id_insumo", "fecha"],
    )
    op.create_index(
        "ix_movimientos_insumo_intervencion",
        "movimientos_insumo",
        ["id_intervencion"],
    )
    op.create_index(
        "uq_movimiento_inicial_insumo",
        "movimientos_insumo",
        ["id_insumo"],
        unique=True,
        postgresql_where=sa.text("tipo = 'INICIAL'"),
    )

    op.add_column(
        "intervencion_insumos", sa.Column("id_responsable", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_intervencion_insumos_responsable",
        "intervencion_insumos",
        "usuarios",
        ["id_responsable"],
        ["id_usuario"],
    )
    op.create_unique_constraint(
        "uq_intervencion_insumo",
        "intervencion_insumos",
        ["id_intervencion", "id_insumo"],
    )
    op.create_check_constraint(
        "ck_intervencion_insumos_cantidad_positiva",
        "intervencion_insumos",
        "cantidad_utilizada > 0",
    )
    op.create_check_constraint(
        "ck_intervencion_insumos_subtotal_no_negativo",
        "intervencion_insumos",
        "subtotal >= 0",
    )


def downgrade():
    op.drop_constraint(
        "ck_intervencion_insumos_subtotal_no_negativo", "intervencion_insumos", type_="check"
    )
    op.drop_constraint(
        "ck_intervencion_insumos_cantidad_positiva", "intervencion_insumos", type_="check"
    )
    op.drop_constraint("uq_intervencion_insumo", "intervencion_insumos", type_="unique")
    op.drop_constraint(
        "fk_intervencion_insumos_responsable", "intervencion_insumos", type_="foreignkey"
    )
    op.drop_column("intervencion_insumos", "id_responsable")

    op.drop_index("uq_movimiento_inicial_insumo", table_name="movimientos_insumo")
    op.drop_index("ix_movimientos_insumo_intervencion", table_name="movimientos_insumo")
    op.drop_index("ix_movimientos_insumo_insumo_fecha", table_name="movimientos_insumo")
    op.drop_table("movimientos_insumo")

    op.drop_constraint("ck_insumos_costo_no_negativo", "insumos", type_="check")
    op.drop_constraint("ck_insumos_stock_minimo_no_negativo", "insumos", type_="check")
    op.drop_constraint("ck_insumos_stock_no_negativo", "insumos", type_="check")
    op.drop_column("insumos", "activo")
    op.drop_column("insumos", "stock_minimo")
    op.drop_column("insumos", "categoria")
    op.drop_column("insumos", "descripcion")
    op.alter_column(
        "insumos", "stock", existing_type=sa.Numeric(12, 3),
        type_=sa.Integer(), postgresql_using="round(stock)::integer",
    )
