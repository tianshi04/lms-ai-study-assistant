import logging
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from src.modules.catalog.domain.entities import Course
from src.modules.catalog.domain.repositories import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope


def _default_identity_repo_factory(session: Any) -> Any:
    from src.modules.identity.infrastructure.repository import IdentityRepository

    return IdentityRepository(session)


logger = logging.getLogger(__name__)


class CourseCollaboratorUseCase:
    """Application Use Case for Course Collaborators and Audit Logs."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        identity_repo_factory: Callable[[Any], Any] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )
        self.identity_repo_factory = (
            identity_repo_factory or _default_identity_repo_factory
        )

    async def _verify_course_owner_permission(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý người hợp tác",
    ) -> Course:
        if not user:
            raise PermissionError("Vui lòng đăng nhập để tiếp tục.")
        course = await repo.get_course_detail(course_id)
        if not course:
            raise ValueError(f"Không tìm thấy khóa học với ID '{course_id}'")
        if user.is_admin:
            return course
        if course.owner_id and user.id == course.owner_id:
            return course
        raise PermissionError(
            f"Bạn không có quyền {action_name} vì bạn không phải là Chủ sở hữu chính (Owner) của khóa học."
        )

    async def add_course_collaborator(
        self,
        course_id: str,
        email: str,
        role: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            identity_repo = self.identity_repo_factory(session)

            await self._verify_course_owner_permission(
                repo, course_id, current_user, "thêm người hợp tác vào khóa học"
            )

            target_user = await identity_repo.get_by_email(email.strip())
            if not target_user:
                raise ValueError(f"Không tìm thấy người dùng với email '{email}'")

            clean_role = role.lower().strip()
            if clean_role not in ("co_instructor", "ta"):
                clean_role = "co_instructor"

            await repo.add_course_collaborator(course_id, target_user.id, clean_role)

            await repo.create_audit_log(
                course_id=course_id,
                actor_id=current_user.id if current_user else "system",
                target_user_id=target_user.id,
                action="COURSE_AUDIT_ACTION_COLLABORATOR_ADDED",
                details=f"Được thêm vào khóa học với vai trò {clean_role.upper()}",
            )

            collabs = await repo.list_course_collaborators_with_details(course_id)
            updated_course = await repo.get_course_detail(course_id)
            co_instructor_ids = (
                updated_course.co_instructor_ids if updated_course else []
            )

            for c in collabs:
                if c["user_id"] == target_user.id:
                    return {
                        "collaborator": c,
                        "co_instructor_ids": co_instructor_ids,
                    }

            return {
                "collaborator": {
                    "collaborator_id": f"collab_{uuid.uuid4().hex[:12]}",
                    "user_id": target_user.id,
                    "email": target_user.email,
                    "full_name": target_user.full_name,
                    "avatar_url": target_user.avatar_url or "",
                    "role": clean_role,
                    "added_at": datetime.now(UTC).isoformat(),
                },
                "co_instructor_ids": co_instructor_ids,
            }

    async def list_course_collaborators(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xem danh sách người hợp tác khóa học"
            )
            return await repo.list_course_collaborators_with_details(course_id)

    async def remove_course_collaborator(
        self,
        course_id: str,
        user_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xóa người hợp tác khỏi khóa học"
            )
            is_self = current_user and current_user.id == user_id
            actor_id = current_user.id if current_user else "system"
            if is_self:
                action_str = "COURSE_AUDIT_ACTION_COLLABORATOR_REMOVED"
                details_str = "Thành viên tự rút tên khỏi khóa học"
            else:
                action_str = "COURSE_AUDIT_ACTION_COLLABORATOR_REMOVED"
                actor_name = (
                    current_user.full_name or current_user.email
                    if current_user
                    else "Quản trị viên"
                )
                details_str = f"Bị loại bỏ khỏi khóa học bởi {actor_name}"

            success = await repo.remove_course_collaborator(course_id, user_id)
            if success:
                await repo.create_audit_log(
                    course_id=course_id,
                    actor_id=actor_id,
                    target_user_id=user_id,
                    action=action_str,
                    details=details_str,
                )

            updated_course = await repo.get_course_detail(course_id)
            co_instructor_ids = (
                updated_course.co_instructor_ids if updated_course else []
            )
            return {"success": success, "co_instructor_ids": co_instructor_ids}

    async def list_course_audit_logs(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xem nhật ký lịch sử khóa học"
            )
            return await repo.list_audit_logs(course_id)
