"""Add batch teacher_id and attendance fields

Revision ID: 0002_batch_teacher_attendance
Revises: 0001_initial_schema
Create Date: 2026-11-09 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_batch_teacher_attendance'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add batches.teacher_id (FK users.id, nullable, ON DELETE SET NULL)
    op.add_column('batches', sa.Column('teacher_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_batches_teacher_id_users',
        'batches', 'users',
        ['teacher_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_batches_teacher_id'), 'batches', ['teacher_id'], unique=False)

    # 2. Add attendance_records.method (enum/string: face|manual, default manual)
    op.add_column(
        'attendance_records',
        sa.Column('method', sa.String(length=20), server_default='manual', nullable=False)
    )

    # 3. Add attendance_records.is_confirmed (bool, default false)
    op.add_column(
        'attendance_records',
        sa.Column('is_confirmed', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )

    # 4. Add attendance_sessions.unrecognized_count (int, default 0)
    op.add_column(
        'attendance_sessions',
        sa.Column('unrecognized_count', sa.Integer(), server_default='0', nullable=False)
    )


def downgrade() -> None:
    # Drop columns in reverse order
    op.drop_column('attendance_sessions', 'unrecognized_count')
    op.drop_column('attendance_records', 'is_confirmed')
    op.drop_column('attendance_records', 'method')
    op.drop_index(op.f('ix_batches_teacher_id'), table_name='batches')
    op.drop_constraint('fk_batches_teacher_id_users', 'batches', type_='foreignkey')
    op.drop_column('batches', 'teacher_id')
