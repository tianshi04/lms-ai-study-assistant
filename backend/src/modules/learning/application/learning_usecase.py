import uuid
from datetime import datetime, timedelta, timezone

from src.modules.learning.domain.entities import (
    DeadlineStatus,
    LearningProgress,
    PersonalNote,
    WeeklyDeadline,
)


class LearningUseCase:
    """Application Use Case coordinator for Learning Domain."""

    def __init__(self) -> None:
        self._progresses: dict[str, LearningProgress] = {}
        self._notes: dict[str, list[PersonalNote]] = {}

    def _get_key(self, user_id: str, course_id: str) -> str:
        return f"{user_id}:{course_id}"

    async def get_progress(
        self, user_id: str, course_id: str
    ) -> LearningProgress:
        key = self._get_key(user_id, course_id)
        if key not in self._progresses:
            # Create initial progress with an overdue deadline to demonstrate "Reset My Deadlines"
            past_date = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
            future_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
            deadlines = [
                WeeklyDeadline(week_number=1, due_date=past_date, status=DeadlineStatus.OVERDUE),
                WeeklyDeadline(week_number=2, due_date=future_date, status=DeadlineStatus.ON_TRACK),
            ]
            self._progresses[key] = LearningProgress(
                user_id=user_id,
                course_id=course_id,
                overall_progress_percent=25.0,
                completed_item_ids=["item-ml-intro-video"],
                weekly_deadlines=deadlines,
            )
        return self._progresses[key]

    async def reset_deadlines(
        self, user_id: str, course_id: str
    ) -> tuple[bool, LearningProgress]:
        progress = await self.get_progress(user_id, course_id)
        now = datetime.now(timezone.utc)
        updated_deadlines: list[WeeklyDeadline] = []
        for i, d in enumerate(progress.weekly_deadlines, start=1):
            new_due = (now + timedelta(days=7 * i)).strftime("%Y-%m-%d")
            updated_deadlines.append(
                WeeklyDeadline(
                    week_number=d.week_number,
                    due_date=new_due,
                    status=DeadlineStatus.ON_TRACK,
                )
            )
        progress.weekly_deadlines = updated_deadlines
        return True, progress

    async def save_personal_note(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
    ) -> PersonalNote:
        key = self._get_key(user_id, course_id)
        if key not in self._notes:
            self._notes[key] = []

        note = PersonalNote(
            id=f"note-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            course_id=course_id,
            item_id=item_id,
            highlighted_text=highlighted_text,
            note_comment=note_comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._notes[key].append(note)
        return note

    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        key = self._get_key(user_id, course_id)
        return self._notes.get(key, [])
