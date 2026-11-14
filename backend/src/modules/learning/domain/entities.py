from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from enum import Enum

from src.modules.learning.domain.constants import DEADLINE_RESET_COOLDOWN_DAYS
from src.shared.domain.base import Entity, ValueObject


class DeadlineStatus(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    ON_TRACK = "ON_TRACK"
    OVERDUE = "OVERDUE"
    COMPLETED = "COMPLETED"


@dataclass(frozen=True)
class WeeklyDeadline(ValueObject):
    week_number: int
    due_date: str
    status: DeadlineStatus


class LearningProgress(Entity):
    def __init__(
        self,
        user_id: str,
        course_id: str,
        overall_progress_percent: float = 0.0,
        completed_item_ids: list[str] | None = None,
        weekly_deadlines: list[WeeklyDeadline] | None = None,
        last_reset_at: str | None = None,
        last_accessed_at: str | None = None,
        last_accessed_item_id: str | None = None,
        enrolled_at: str = "",
        completed_at: str | None = None,
    ) -> None:
        super().__init__(id=f"{user_id}:{course_id}")
        self.user_id = user_id
        self.course_id = course_id
        self.overall_progress_percent = overall_progress_percent
        self.completed_item_ids = list(completed_item_ids) if completed_item_ids else []
        self.weekly_deadlines = list(weekly_deadlines) if weekly_deadlines else []
        self.last_reset_at = last_reset_at
        self.last_accessed_at = last_accessed_at
        self.last_accessed_item_id = last_accessed_item_id
        self.enrolled_at = enrolled_at
        self.completed_at = completed_at

    def mark_item_complete(
        self, item_id: str, total_items_count: int, now_iso: str | None = None
    ) -> bool:
        if now_iso:
            self.last_accessed_at = now_iso
            self.last_accessed_item_id = item_id
        if item_id in self.completed_item_ids:
            return False
        self.completed_item_ids.append(item_id)
        if total_items_count > 0:
            self.overall_progress_percent = round(
                min(100.0, (len(self.completed_item_ids) / total_items_count) * 100.0),
                1,
            )
        if self.overall_progress_percent >= 100.0 and not self.completed_at:
            self.completed_at = now_iso or datetime.now(UTC).isoformat()
        return True

    def can_reset_deadlines(self, now: datetime) -> bool:
        if not self.last_reset_at:
            return True
        try:
            last_dt = datetime.fromisoformat(self.last_reset_at)
            if last_dt.tzinfo is None and now.tzinfo is not None:
                last_dt = last_dt.replace(tzinfo=UTC)
            elif last_dt.tzinfo is not None and now.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=None)
            return (now - last_dt) >= timedelta(days=DEADLINE_RESET_COOLDOWN_DAYS)
        except (ValueError, TypeError):
            return True

    def reset_deadlines(
        self, new_weekly_deadlines: list[WeeklyDeadline], now: datetime
    ) -> None:
        if not self.can_reset_deadlines(now):
            raise ValueError(
                f"Chỉ được thiết lập lại hạn chót sau {DEADLINE_RESET_COOLDOWN_DAYS} ngày kể từ lần thiết lập gần nhất."
            )
        self.weekly_deadlines = new_weekly_deadlines
        self.last_reset_at = now.isoformat()


class PersonalNote(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
        created_at: str,
        timestamp_seconds: int = 0,
        updated_at: str = "",
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.course_id = course_id
        self.item_id = item_id
        self.highlighted_text = highlighted_text
        self.note_comment = note_comment
        self.created_at = created_at
        self.timestamp_seconds = timestamp_seconds
        self.updated_at = updated_at or created_at


@dataclass(frozen=True)
class EnrolledCourseSummary(ValueObject):
    course_id: str
    course_title: str
    partner_name: str
    progress_percent: float
    status: str
    last_accessed_at: str
    last_accessed_item_id: str = ""
    enrolled_at: str = ""
    completed_at: str = ""


@dataclass
class LearningItemProgress:
    user_id: str
    item_id: str
    course_id: str
    time_spent_seconds: int = 0
    last_studied_at: str = ""


@dataclass(frozen=True)
class DailyStudyRecord(ValueObject):
    date: str
    total_seconds: int
    is_streak_qualified: bool


@dataclass(frozen=True)
class AdminLearningStats(ValueObject):
    """Scoped platform-wide enrollment & completion counters for the Admin Dashboard."""

    total_enrollments: int = 0
    completed_enrollments: int = 0


@dataclass(frozen=True)
class AdminLearningTrendPoint(ValueObject):
    """New enrollments and completions recorded on one UTC day."""

    date: str
    enrollments: int = 0
    completions: int = 0


class UserLearningStreak(Entity):
    def __init__(
        self,
        user_id: str,
        current_streak: int = 0,
        longest_streak: int = 0,
        last_active_date: date | None = None,
        total_study_seconds: int = 0,
        updated_at: str = "",
    ) -> None:
        super().__init__(id=user_id)
        self.user_id = user_id
        self.current_streak = current_streak
        self.longest_streak = longest_streak
        self.last_active_date = last_active_date
        self.total_study_seconds = total_study_seconds
        self.updated_at = updated_at

    def get_effective_streak(self, today: date) -> int:
        """Return effective streak, resetting to 0 if missed yesterday and today."""
        if not self.last_active_date:
            return 0
        yesterday = today - timedelta(days=1)
        if self.last_active_date in (today, yesterday):
            return self.current_streak
        return 0

    def advance_streak(self, today: date, now_iso: str) -> bool:
        """Advance streak when daily goal is reached. Returns True if streak advanced."""
        if self.last_active_date == today:
            return False

        yesterday = today - timedelta(days=1)
        if self.last_active_date == yesterday:
            self.current_streak += 1
        else:
            self.current_streak = 1

        self.longest_streak = max(self.longest_streak, self.current_streak)

        self.last_active_date = today
        self.updated_at = now_iso
        return True
