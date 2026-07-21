from abc import ABC, abstractmethod

from src.modules.learning.domain.entities import LearningProgress, PersonalNote


class ILearningRepository(ABC):
    """Abstract Repository Interface for Learning Domain (DIP)."""

    @abstractmethod
    async def get_progress(
        self, user_id: str, course_id: str
    ) -> LearningProgress:
        pass

    @abstractmethod
    async def reset_deadlines(
        self, user_id: str, course_id: str
    ) -> tuple[bool, LearningProgress]:
        pass

    @abstractmethod
    async def save_personal_note(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
    ) -> PersonalNote:
        pass

    @abstractmethod
    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        pass

    @abstractmethod
    async def mark_item_complete(
        self, user_id: str, course_id: str, item_id: str, total_course_items: int
    ) -> tuple[bool, LearningProgress]:
        pass
