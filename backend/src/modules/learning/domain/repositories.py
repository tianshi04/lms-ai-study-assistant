from abc import ABC, abstractmethod
from datetime import date

from src.modules.learning.domain.entities import (
    AdminLearningStats,
    AdminLearningTrendPoint,
    DailyStudyRecord,
    EnrolledCourseSummary,
    LearningItemProgress,
    LearningProgress,
    PersonalNote,
    UserLearningStreak,
)


class ILearningRepository(ABC):
    """Abstract Repository Interface for Learning Domain (DIP)."""

    @abstractmethod
    async def find_progress(
        self, user_id: str, course_id: str
    ) -> LearningProgress | None:
        """Read-only lookup of user learning progress without auto-enrolling."""

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
        week_item_ids: dict[int, set[str]] | None = None,
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

    @abstractmethod
    async def get_admin_enrollment_stats(
        self, valid_course_ids: list[str]
    ) -> AdminLearningStats:
        """Count enrollments and completions restricted to organization-scoped courses."""

    @abstractmethod
    async def get_admin_enrollment_trend(
        self, valid_course_ids: list[str], window: list[str]
    ) -> list[AdminLearningTrendPoint]:
        """Daily enrollments/completions for scoped courses, zero-filled per ``window`` date."""

    @abstractmethod
    async def get_course_enrollment_counts(
        self, course_ids: list[str]
    ) -> dict[str, tuple[int, int]]:
        """Return ``{course_id: (enrolled_count, completed_count)}`` for ``course_ids``."""

    @abstractmethod
    async def is_enrolled(self, user_id: str, course_id: str) -> bool:
        """Read-only check whether the user is enrolled in the course."""

    @abstractmethod
    async def save_video_position(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        position_seconds: int,
        duration_seconds: int,
        now_iso: str,
    ) -> tuple[int, str]:
        """Upsert video playback position and return (saved_position_seconds, updated_at)."""

    @abstractmethod
    async def list_course_video_positions(
        self, user_id: str, course_id: str
    ) -> list[LearningItemProgress]:
        """Return video item progress rows with last_position_seconds > 0 for the course."""
