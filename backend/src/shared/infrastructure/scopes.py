from typing import Any, Optional
from sqlalchemy import Select, or_

from src.modules.identity.domain.constants import INTERNAL_SYSTEM_ORG_ID
from src.shared.auth import CurrentUserContext


def apply_organization_scope(
    stmt: Select[Any],
    model_cls: Any,
    ctx: Optional[CurrentUserContext],
) -> Select[Any]:
    """Applies SQL Scope Pushdown filtering for Organization-scoped models.

    Rules:
    1. Super Admin: Returns all records across all orgs.
    2. User with active_org_id: Returns records matching active_org_id OR platform internal org.
    3. General/Public query (or unauthenticated user): Returns courses from platform internal org.
    """
    if ctx and ctx.is_system_admin():
        return stmt

    org_id_col = getattr(model_cls, "organization_id", None)
    if org_id_col is None:
        return stmt

    if ctx and ctx.active_org_id:
        return stmt.where(
            or_(
                org_id_col == ctx.active_org_id,
                org_id_col == INTERNAL_SYSTEM_ORG_ID,
            )
        )

    return stmt.where(org_id_col == INTERNAL_SYSTEM_ORG_ID)
