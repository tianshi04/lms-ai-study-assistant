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
        last_reset_at: str | None = None,
    ) -> None:
        super().__init__(id=f"{user_id}:{course_id}")
        self.user_id = user_id
        self.course_id = course_id
        self.overall_progress_percent = overall_progress_percent
        self.completed_item_ids = completed_item_ids or []
        self.weekly_deadlines = weekly_deadlines or []
        self.last_reset_at = last_reset_at


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


class ScormTracking(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        cmi_core_lesson_status: str = "not attempted",
        cmi_core_score_raw: float = 0.0,
        cmi_core_session_time: str = "",
        cmi_core_lesson_location: str = "",
        cmi_suspend_data: str = "",
        updated_at: str = "",
    ) -> None:
        super().__init__(id=f"{user_id}:{item_id}")
        self.user_id = user_id
        self.item_id = item_id
        self.cmi_core_lesson_status = cmi_core_lesson_status
        self.cmi_core_score_raw = cmi_core_score_raw
        self.cmi_core_session_time = cmi_core_session_time
        self.cmi_core_lesson_location = cmi_core_lesson_location
        self.cmi_suspend_data = cmi_suspend_data
        self.updated_at = updated_at

    @property
    def cmi_data(self) -> dict:
        score_val = self.cmi_core_score_raw
        score_str = (
            str(int(score_val)) if score_val == int(score_val) else str(score_val)
        )
        return {
            "cmi.core.lesson_status": self.cmi_core_lesson_status,
            "cmi.core.score.raw": score_str,
            "cmi.core.session_time": self.cmi_core_session_time,
            "cmi.core.lesson_location": self.cmi_core_lesson_location,
            "cmi.suspend_data": self.cmi_suspend_data,
        }
