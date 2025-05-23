"""remove timestamps

Revision ID: 0fb52c317ed0
Revises: merge_all_heads
Create Date: 2024-03-21 10:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = '0fb52c317ed0'
down_revision = 'merge_all_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the timestamp columns
    op.drop_column('phones', 'updated_at')
    op.drop_column('phones', 'created_at')


def downgrade() -> None:
    # Restore the timestamp columns
    op.add_column('phones', sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()))
    op.add_column('phones', sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=func.now()))