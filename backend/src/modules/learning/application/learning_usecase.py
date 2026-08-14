import asyncio
import logging
from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain.repositories import ICatalogRepository
from src.modules.learning.domain.entities import (
    EnrolledCourseSummary,
    LearningProgress,
    PersonalNote,
)
from src.modules.learning.domain.repositories import ILearningRepository
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


def _default_catalog_repo_factory(session: Any) -> ICatalogRepository:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


class LearningUseCase:
    """Application Use Case coordinator for Learning domain using Dependency Inversion (ILearningRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ILearningRepository] | None = None,
        catalog_repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyLearningRepository(session)
        )
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )

    async def get_progress(self, user_id: str, course_id: str) -> LearningProgress:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_progress(user_id, course_id)

    async def reset_deadlines(
        self, user_id: str, course_id: str
    ) -> tuple[bool, LearningProgress]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.reset_deadlines(user_id, course_id)

    async def save_personal_note(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
    ) -> PersonalNote:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.save_personal_note(
                user_id, course_id, item_id, highlighted_text, note_comment
            )

    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_personal_notes(user_id, course_id)

    async def delete_personal_note(self, note_id: str, user_id: str) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.delete_personal_note(note_id, user_id)

    async def mark_item_complete(
        self, user_id: str, course_id: str, item_id: str, total_course_items: int
    ) -> tuple[bool, LearningProgress]:

        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            course = await catalog_repo.get_course_detail(course_id)

        if not course:
            logger.warning(
                "Failed to mark item complete: Course %s not found", course_id
            )
            return False, LearningProgress(
                user_id=user_id, course_id=course_id, overall_progress_percent=0.0
            )

        valid_item_ids = set()
        for week in course.week_modules:
            for lesson in week.lessons:
                for item in lesson.items:
                    valid_item_ids.add(item.id)

        if item_id not in valid_item_ids:
            logger.warning(
                "Failed to mark item complete: Item %s not found in course %s",
                item_id,
                course_id,
            )
            return False, LearningProgress(
                user_id=user_id, course_id=course_id, overall_progress_percent=0.0
            )

        real_total_items = max(1, len(valid_item_ids))

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            result = await repo.mark_item_complete(
                user_id, course_id, item_id, real_total_items, valid_item_ids
            )
            logger.info(
                "User %s marked item %s complete in course %s",
                user_id,
                item_id,
                course_id,
            )
            return result

    async def list_enrolled_courses(self, user_id: str) -> list[EnrolledCourseSummary]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            progresses = await repo.list_user_progresses(user_id)
            catalog_repo = self.catalog_repo_factory(session)
            course_tasks = [
                catalog_repo.get_course_detail(p.course_id) for p in progresses
            ]
            courses = await asyncio.gather(*course_tasks)
        course_map = {c.id: c for c in courses if c}

        summaries: list[EnrolledCourseSummary] = []
        for p in progresses:
            course = course_map.get(p.course_id)
            c_title = course.title if course else f"Khóa học #{p.course_id}"
            c_partner = course.partner_name if course else ""

            progress = p.overall_progress_percent
            if progress <= 0:
                status = "NOT_STARTED"
            elif progress >= 100.0:
                status = "COMPLETED"
            else:
                status = "IN_PROGRESS"

            summaries.append(
                EnrolledCourseSummary(
                    course_id=p.course_id,
                    course_title=c_title,
                    partner_name=c_partner,
                    progress_percent=progress,
                    status=status,
                    last_accessed_at=p.last_reset_at or "",
                )
            )
        return summaries
