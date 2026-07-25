from typing import Any, Callable

from src.modules.learning.domain.entities import LearningProgress, PersonalNote
from src.modules.learning.domain.repository import ILearningRepository
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.shared.infrastructure.database import async_session_scope


class LearningUseCase:
    """Application Use Case coordinator for Learning domain using Dependency Inversion (ILearningRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ILearningRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyLearningRepository(session)
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

    async def mark_item_complete(
        self, user_id: str, course_id: str, item_id: str, total_course_items: int
    ) -> tuple[bool, LearningProgress]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.mark_item_complete(
                user_id, course_id, item_id, total_course_items
            )

    async def save_scorm_tracking(
        self,
        user_id: str,
        item_id: str,
        cmi_core_lesson_status: str = "not attempted",
        cmi_core_score_raw: float = 0.0,
        cmi_core_session_time: str = "",
        cmi_core_lesson_location: str = "",
        cmi_suspend_data: str = "",
        cmi_data: dict | None = None,
    ):
        if cmi_data:
            cmi_core_lesson_status = cmi_data.get(
                "cmi.core.lesson_status", cmi_core_lesson_status
            )
            cmi_core_score_raw = float(
                cmi_data.get("cmi.core.score.raw", cmi_core_score_raw or 0.0)
            )
            cmi_core_lesson_location = cmi_data.get(
                "cmi.core.lesson_location", cmi_core_lesson_location
            )
            cmi_suspend_data = cmi_data.get("cmi.suspend_data", cmi_suspend_data)
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.save_scorm_tracking(
                user_id=user_id,
                item_id=item_id,
                cmi_core_lesson_status=cmi_core_lesson_status,
                cmi_core_score_raw=cmi_core_score_raw,
                cmi_core_session_time=cmi_core_session_time,
                cmi_core_lesson_location=cmi_core_lesson_location,
                cmi_suspend_data=cmi_suspend_data,
            )

    async def get_scorm_tracking(self, user_id: str, item_id: str):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_scorm_tracking(user_id=user_id, item_id=item_id)
