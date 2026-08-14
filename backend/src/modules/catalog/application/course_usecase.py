import logging
from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain import (
    Category,
    Course,
    CourseStatus,
    ICatalogRepository,
    Specialization,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.permissions import (
    CoursePermission,
    OrgPermission,
    enforce_course_ownership,
    enforce_organization_permission,
)

logger = logging.getLogger(__name__)


class CourseUseCase:
    """Application Use Case for Course lifecycle, search, management, and categories."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )

    async def _verify_ownership(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý khóa học",
        allow_read_only_pending: bool = False,
        required_permission: CoursePermission | None = None,
        disallow_published_mutation: bool = False,
    ) -> None:
        if user and course_id:
            course = await repo.get_course_detail(course_id)
            if course:
                enforce_course_ownership(
                    course,
                    user,
                    required_permission=required_permission,
                    action_name=action_name,
                    allow_read_only_pending=allow_read_only_pending,
                )
                if (
                    disallow_published_mutation
                    and course.status == CourseStatus.PUBLISHED
                    and not getattr(user, "is_admin", False)
                ):
                    raise PermissionError(
                        f"Không thể {action_name} này vì khóa học đã được xuất bản (PUBLISHED)."
                    )

    async def submit_course_for_launch(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> Course:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "nộp khóa học phê duyệt",
                allow_read_only_pending=True,
            )
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học.")

            course.submit_for_launch()
            updated = await repo.update_course_status(
                course.id, course.status, course.rejection_reason
            )
            return updated if updated else course

    async def review_course(
        self,
        course_id: str,
        action: Any,
        rejection_reason: str = "",
        current_user: CurrentUser | None = None,
    ) -> Course:
        if not current_user or not current_user.is_admin:
            raise PermissionError(
                "Chỉ Quản trị viên hệ thống mới có quyền phê duyệt/từ chối khóa học."
            )

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học.")

            action_str = str(action).upper()
            if action_str in ("APPROVE", "COURSE_REVIEW_ACTION_APPROVE", "1"):
                course.approve()
            elif action_str in ("REJECT", "COURSE_REVIEW_ACTION_REJECT", "2"):
                course.reject(rejection_reason)
            else:
                raise ValueError("Hành động kiểm duyệt không hợp lệ.")

            updated = await repo.update_course_status(
                course.id, course.status, course.rejection_reason
            )
            return updated if updated else course

    async def list_courses(
        self,
        page_size: int = 10,
        page_token: str = "",
        search_query: str = "",
        subject: str = "",
        level: str = "",
        sort_by: str = "",
        organization_id: str | None = None,
        status_filter: Any = "",
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_courses(
                page_size,
                page_token,
                search_query,
                subject,
                level,
                sort_by,
                status_filter,
                organization_id=organization_id,
            )

    async def list_instructor_courses(
        self,
        instructor_id: str,
        page_size: int = 50,
        page_token: str = "",
        status_filter: str | CourseStatus | None = None,
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_instructor_courses(
                instructor_id=instructor_id,
                page_size=page_size,
                page_token=page_token,
                status_filter=status_filter,
            )

    async def get_course_detail(self, course_id: str) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_course_detail(course_id)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_specialization(specialization_id)

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "",
        level: str = "",
        owner_id: str = "",
        financial_aid_enabled: bool = True,
        organization_id: str = "partner_community",
        current_user: CurrentUser | None = None,
    ) -> Course:
        async with async_session_scope() as session:
            if current_user and organization_id:
                await enforce_organization_permission(
                    session,
                    current_user,
                    organization_id,
                    required_permission=OrgPermission.CREATE_COURSE,
                )
            repo = self.repo_factory(session)
            course = await repo.create_course(
                title=title,
                slug=slug,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
                owner_id=owner_id,
                financial_aid_enabled=financial_aid_enabled,
                organization_id=organization_id or "partner_community",
            )
            logger.info(
                "Created course %s by owner %s",
                course.id if hasattr(course, "id") else title,
                owner_id,
            )
            return course

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "",
        level: str = "",
        financial_aid_enabled: bool = True,
        current_user: CurrentUser | None = None,
    ) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa khóa học"
            )
            return await repo.update_course(
                course_id=course_id,
                title=title,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
                financial_aid_enabled=financial_aid_enabled,
            )

    async def delete_course(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "xóa khóa học",
                disallow_published_mutation=True,
            )
            return await repo.delete_course(course_id)

    async def get_instructor_analytics(
        self, course_id: str, current_user: CurrentUser | None = None
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "xem báo cáo lớp học"
            )
            return await repo.get_instructor_analytics(course_id=course_id)

    async def list_categories(self, type_filter: str = "") -> list[Category]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_categories(type_filter)

    async def create_category(self, name: str, category_type: str) -> Category:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.create_category(name, category_type)

    async def delete_category(self, category_id: str) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.delete_category(category_id)
