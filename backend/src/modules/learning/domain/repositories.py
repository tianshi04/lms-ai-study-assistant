from abc import ABC, abstractmethod
from datetime import date

from src.modules.learning.domain.entities import (
    DailyStudyRecord,
    EnrolledCourseSummary,
    LearningProgress,
    PersonalNote,
    UserLearningStreak,
)


class ILearningRepository(ABC):
    """Abstract Repository Interface for Learning Domain (DIP)."""

    @abstractmethod
    async def get_progress(
        self, user_id: str, course_id: str, current_item_id: str | None = None
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
        timestamp_seconds: int = 0,
    ) -> PersonalNote:
        pass

    @abstractmethod
    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        pass

    @abstractmethod
    async def delete_personal_note(self, note_id: str, user_id: str) -> bool:
        pass

    @abstractmethod
    async def mark_item_complete(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        total_course_items: int,
        valid_item_ids: set[str] | None = None,
    ) -> tuple[bool, LearningProgress]:
        pass

    @abstractmethod
    async def list_user_progresses(self, user_id: str) -> list[LearningProgress]:
        pass

    @abstractmethod
    async def list_enrolled_courses(self, user_id: str) -> list[EnrolledCourseSummary]:
        pass

    @abstractmethod
    async def record_learning_time(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        delta_seconds: int,
        study_date: date,
        now_iso: str,
    ) -> tuple[int, int, int, bool]:
        """Record study time atomically.

        Returns:
            (item_total_seconds, today_total_seconds, current_streak, is_streak_extended_today)
        """

    @abstractmethod
    async def get_learning_streak_stats(
        self,
        user_id: str,
        today: date,
    ) -> tuple[UserLearningStreak, int, list[DailyStudyRecord]]:
        """Get user streak stats.

        Returns:
            (UserLearningStreak, today_total_seconds, recent_7_days)
        """
