"""Add timestamps to phones table

Revision ID: add_timestamps
Revises: a2aab67b540c
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = 'add_timestamps'
down_revision = 'a2aab67b540c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Column already exists, nothing to do
    pass


def downgrade() -> None:
    # Column already exists, nothing to do
    pass 