"""Add derived columns

Revision ID: add_derived_columns
Revises: f43d9c85fed7
Create Date: 2024-02-23 08:53:47.154

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_derived_columns'
down_revision = 'f43d9c85fed7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add derived columns with nullable=True
    op.add_column('phones', sa.Column('price_per_gb_ram', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('price_per_gb_storage', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('performance_score', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('display_score', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('camera_score', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('storage_score', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('battery_efficiency', sa.Float(), nullable=True))
    op.add_column('phones', sa.Column('price_to_display', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove derived columns
    op.drop_column('phones', 'price_to_display')
    op.drop_column('phones', 'battery_efficiency')
    op.drop_column('phones', 'storage_score')
    op.drop_column('phones', 'camera_score')
    op.drop_column('phones', 'display_score')
    op.drop_column('phones', 'performance_score')
    op.drop_column('phones', 'price_per_gb_storage')
    op.drop_column('phones', 'price_per_gb_ram') 