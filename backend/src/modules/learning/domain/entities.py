from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
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
    ) -> None:
        super().__init__(id=f"{user_id}:{course_id}")
        self.user_id = user_id
        self.course_id = course_id
        self.overall_progress_percent = overall_progress_percent
        self.completed_item_ids = completed_item_ids or []
        self.weekly_deadlines = weekly_deadlines or []
        self.last_reset_at = last_reset_at

    def mark_item_complete(self, item_id: str, total_items_count: int) -> bool:
        if item_id in self.completed_item_ids:
            return False
        self.completed_item_ids.append(item_id)
        if total_items_count > 0:
            self.overall_progress_percent = round(
                min(100.0, (len(self.completed_item_ids) / total_items_count) * 100.0),
                1,
            )
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
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.course_id = course_id
        self.item_id = item_id
        self.highlighted_text = highlighted_text
        self.note_comment = note_comment
        self.created_at = created_at


@dataclass(frozen=True)
class EnrolledCourseSummary(ValueObject):
    course_id: str
    course_title: str
    partner_name: str
    progress_percent: float
    status: str
    last_accessed_at: str
