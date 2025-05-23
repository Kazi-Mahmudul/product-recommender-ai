"""remove_screen_to_body_ratio

Revision ID: 3ec18465832f
Revises: f43d9c85fed7
Create Date: 2024-03-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ec18465832f'
down_revision: Union[str, None] = 'f43d9c85fed7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove screen_to_body_ratio column
    op.drop_column('phones', 'screen_to_body_ratio')


def downgrade() -> None:
    # Add back screen_to_body_ratio column
    op.add_column('phones', sa.Column('screen_to_body_ratio', sa.String(length=50), nullable=True))