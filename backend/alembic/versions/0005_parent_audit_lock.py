"""Add parent contact fields, session locking, and attendance audit logs

Revision ID: 0005_parent_contact_and_audit_locking
Revises: 0004_session_batch_date_unique
Create Date: 2026-11-10 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_parent_audit_lock'
down_revision: Union[str, None] = '0004_session_batch_date_unique'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add parent contact info to students
    op.add_column('students', sa.Column('parent_name', sa.String(255), nullable=True))
    op.add_column('students', sa.Column('parent_phone', sa.String(50), nullable=True))

    # 2. Add attendance session locking fields
    op.add_column('attendance_sessions', sa.Column('is_locked', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('attendance_sessions', sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('attendance_sessions', sa.Column('unlock_reason', sa.String(500), nullable=True))

    # 3. Create attendance audit log table
    op.create_table(
        'attendance_audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=True),
        sa.Column('changed_by_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('previous_status', sa.String(20), nullable=True),
        sa.Column('new_status', sa.String(20), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('reason', sa.String(500), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_attendance_audit_logs_session_id', 'attendance_audit_logs', ['session_id'])
    op.create_index('ix_attendance_audit_logs_student_id', 'attendance_audit_logs', ['student_id'])


def downgrade() -> None:
    op.drop_index('ix_attendance_audit_logs_student_id', table_name='attendance_audit_logs')
    op.drop_index('ix_attendance_audit_logs_session_id', table_name='attendance_audit_logs')
    op.drop_table('attendance_audit_logs')

    op.drop_column('attendance_sessions', 'unlock_reason')
    op.drop_column('attendance_sessions', 'locked_at')
    op.drop_column('attendance_sessions', 'is_locked')

    op.drop_column('students', 'parent_phone')
    op.drop_column('students', 'parent_name')
