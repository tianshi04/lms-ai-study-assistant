from dataclasses import dataclass
from enum import Enum
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
    ) -> None:
        super().__init__(id=f"{user_id}:{course_id}")
        self.user_id = user_id
        self.course_id = course_id
        self.overall_progress_percent = overall_progress_percent
        self.completed_item_ids = completed_item_ids or []
        self.weekly_deadlines = weekly_deadlines or []


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
