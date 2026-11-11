"""Add multi-tenant tutor fields: institution_name on users and creator_id on students

Revision ID: 0006_multi_tenant_tutors
Revises: 0005_parent_audit_lock
Create Date: 2026-11-10 17:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006_multi_tenant_tutors'
down_revision: Union[str, None] = '0005_parent_audit_lock'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add institution_name and phone to users
    op.add_column('users', sa.Column('institution_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))

    # 2. Add creator_id to students (scoping student to the specific tutor)
    op.add_column('students', sa.Column('creator_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_students_creator_id', 'students', ['creator_id'])

    # 3. Migrate roll_number constraint from global unique to per-tutor unique
    op.drop_index(op.f('ix_students_roll_number'), table_name='students')
    op.create_index(op.f('ix_students_roll_number'), 'students', ['roll_number'], unique=False)
    op.create_unique_constraint('uq_student_creator_roll', 'students', ['creator_id', 'roll_number'])


def downgrade() -> None:
    op.drop_constraint('uq_student_creator_roll', 'students', type_='unique')
    op.drop_index(op.f('ix_students_roll_number'), table_name='students')
    op.create_index(op.f('ix_students_roll_number'), 'students', ['roll_number'], unique=True)
    op.drop_index('ix_students_creator_id', table_name='students')
    op.drop_column('students', 'creator_id')

    op.drop_column('users', 'phone')
    op.drop_column('users', 'institution_name')
