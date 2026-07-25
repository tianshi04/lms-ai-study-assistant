from abc import ABC, abstractmethod
from typing import Optional

from src.modules.learning.domain.entities import (
    LearningProgress,
    PersonalNote,
    ScormTracking,
)


class ILearningRepository(ABC):
    """Abstract Repository Interface for Learning Domain (DIP)."""

    @abstractmethod
    async def get_progress(self, user_id: str, course_id: str) -> LearningProgress:
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

    @abstractmethod
    async def save_scorm_tracking(
        self,
        user_id: str,
        item_id: str,
        cmi_core_lesson_status: str,
        cmi_core_score_raw: float,
        cmi_core_session_time: str,
        cmi_core_lesson_location: str,
        cmi_suspend_data: str,
    ) -> ScormTracking:
        pass

    @abstractmethod
    async def get_scorm_tracking(
        self, user_id: str, item_id: str
    ) -> Optional[ScormTracking]:
        pass
