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
