import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.learning.domain.entities import (
    DeadlineStatus,
    LearningProgress,
    PersonalNote,
    WeeklyDeadline,
)
from src.modules.learning.domain.repository import ILearningRepository
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
    WeeklyDeadlineModel,
)


def _model_to_domain_progress(model: LearningProgressModel) -> LearningProgress:
    deadlines = [
        WeeklyDeadline(
            week_number=d.week_number,
            due_date=d.due_date,
            status=d.status,
        )
        for d in model.weekly_deadlines or []
    ]
    return LearningProgress(
        user_id=model.user_id,
        course_id=model.course_id,
        overall_progress_percent=model.overall_progress_percent,
        completed_item_ids=model.completed_item_ids,
        weekly_deadlines=deadlines,
    )


def _model_to_domain_note(model: PersonalNoteModel) -> PersonalNote:
    return PersonalNote(
        id=model.id,
        user_id=model.user_id,
        course_id=model.course_id,
        item_id=model.item_id,
        highlighted_text=model.highlighted_text,
        note_comment=model.note_comment,
        created_at=model.created_at,
    )


class SQLAlchemyLearningRepository(ILearningRepository):
    """Async SQLAlchemy Database Repository implementing ILearningRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _get_key(self, user_id: str, course_id: str) -> str:
        return f"{user_id}:{course_id}"

    async def get_progress(
        self, user_id: str, course_id: str
    ) -> LearningProgress:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            past_date = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
            future_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

            model = LearningProgressModel(
                id=key,
                user_id=user_id,
                course_id=course_id,
                overall_progress_percent=25.0,
                completed_item_ids=["item-ml-intro-video"],
            )
            d1 = WeeklyDeadlineModel(
                week_number=1, due_date=past_date, status=DeadlineStatus.OVERDUE
            )
            d2 = WeeklyDeadlineModel(
                week_number=2, due_date=future_date, status=DeadlineStatus.ON_TRACK
            )
            model.weekly_deadlines.extend([d1, d2])
            self.session.add(model)
            await self.session.commit()

        return _model_to_domain_progress(model)

    async def reset_deadlines(
        self, user_id: str, course_id: str
    ) -> tuple[bool, LearningProgress]:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            await self.get_progress(user_id, course_id)
            res = await self.session.execute(stmt)
            model = res.scalar_one()

        now = datetime.now(timezone.utc)
        for i, d in enumerate(model.weekly_deadlines, start=1):
            d.due_date = (now + timedelta(days=7 * i)).strftime("%Y-%m-%d")
            d.status = DeadlineStatus.ON_TRACK

        await self.session.commit()
        return True, _model_to_domain_progress(model)

    async def save_personal_note(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
    ) -> PersonalNote:
        note_model = PersonalNoteModel(
            id=f"note-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            course_id=course_id,
            item_id=item_id,
            highlighted_text=highlighted_text,
            note_comment=note_comment,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.session.add(note_model)
        await self.session.commit()
        return _model_to_domain_note(note_model)

    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        stmt = (
            select(PersonalNoteModel)
            .where(
                PersonalNoteModel.user_id == user_id,
                PersonalNoteModel.course_id == course_id,
            )
            .order_by(PersonalNoteModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_model_to_domain_note(m) for m in models]
