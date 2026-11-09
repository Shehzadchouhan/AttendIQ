"""Add student face consent fields

Revision ID: 0003_student_face_consent
Revises: 0002_batch_teacher_attendance
Create Date: 2026-11-09 19:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_student_face_consent'
down_revision: Union[str, None] = '0002_batch_teacher_attendance'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add consent_given (bool, default false, server_default false)
    op.add_column(
        'students',
        sa.Column('consent_given', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    # Add consent_at (datetime, nullable)
    op.add_column(
        'students',
        sa.Column('consent_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('students', 'consent_at')
    op.drop_column('students', 'consent_given')
