"""Add unique constraint on attendance_sessions batch_id and session_date

Revision ID: 0004_session_batch_date_unique
Revises: 0003_student_face_consent
Create Date: 2026-11-09 22:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_session_batch_date_unique'
down_revision: Union[str, None] = '0003_student_face_consent'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure one attendance session per batch per calendar date
    op.create_unique_constraint(
        'uq_batch_date',
        'attendance_sessions',
        ['batch_id', 'session_date']
    )


def downgrade() -> None:
    op.drop_constraint('uq_batch_date', 'attendance_sessions', type_='unique')
