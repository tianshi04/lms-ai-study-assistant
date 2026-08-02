from sqlalchemy import select

from src.modules.catalog.infrastructure.models import CourseModel
from src.shared.auth import CurrentUserContext
from src.shared.infrastructure.scopes import apply_organization_scope


def test_apply_organization_scope_super_admin() -> None:
    ctx = CurrentUserContext(id="usr_admin", role="USER_ROLE_ADMIN")
    stmt = select(CourseModel)
    scoped = apply_organization_scope(stmt, CourseModel, ctx)
    # Super Admin statement should remain unmodified
    assert str(scoped) == str(stmt)


def test_apply_organization_scope_learner() -> None:
    ctx = CurrentUserContext(id="usr_learner")
    stmt = select(CourseModel)
    scoped = apply_organization_scope(stmt, CourseModel, ctx)
    sql_str = str(scoped)
    assert "courses.organization_id = :organization_id_1" in sql_str


def test_apply_organization_scope_unauthenticated_public_user() -> None:
    stmt = select(CourseModel)
    scoped = apply_organization_scope(stmt, CourseModel, None)
    sql_str = str(scoped)
    # Public unauthenticated user should be scoped to internal platform org (partner_community)
    assert "courses.organization_id = :organization_id_1" in sql_str
