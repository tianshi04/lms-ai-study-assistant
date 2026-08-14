import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.learning.domain import (
    DEFAULT_COHORT_EXTENSION_DAYS,
    DeadlineStatus,
    EnrolledCourseSummary,
    ILearningRepository,
    LearningProgress,
    PersonalNote,
    WeeklyDeadline,
)
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
        last_reset_at=model.last_reset_at,
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

    async def get_progress(self, user_id: str, course_id: str) -> LearningProgress:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            # Atomic PostgreSQL UPSERT to prevent race conditions without exception overhead
            insert_stmt = (
                pg_insert(LearningProgressModel)
                .values(
                    id=key,
                    user_id=user_id,
                    course_id=course_id,
                    overall_progress_percent=0.0,
                    completed_item_ids=[],
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await self.session.execute(insert_stmt)
            await self.session.commit()

            res = await self.session.execute(stmt)
            model = res.scalar_one()

            if not model.weekly_deadlines:
                past_date = (datetime.now(UTC) - timedelta(days=3)).strftime("%Y-%m-%d")
                future_date = (
                    datetime.now(UTC) + timedelta(days=DEFAULT_COHORT_EXTENSION_DAYS)
                ).strftime("%Y-%m-%d")
                d1 = WeeklyDeadlineModel(
                    week_number=1, due_date=past_date, status=DeadlineStatus.OVERDUE
                )
                d2 = WeeklyDeadlineModel(
                    week_number=2, due_date=future_date, status=DeadlineStatus.ON_TRACK
                )
                model.weekly_deadlines.extend([d1, d2])
                try:
                    await self.session.commit()
                except Exception:  # noqa: BLE001
                    await self.session.rollback()
                    res = await self.session.execute(stmt)
                    model = res.scalar_one()

        return _model_to_domain_progress(model)

    async def reset_deadlines(
        self, user_id: str, course_id: str
    ) -> tuple[bool, LearningProgress]:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            await self.get_progress(user_id, course_id)
            res = await self.session.execute(stmt)
            model = res.scalar_one()

        now = datetime.now(UTC)
        domain_progress = _model_to_domain_progress(model)

        if not domain_progress.can_reset_deadlines(now):
            return False, domain_progress

        total_weeks = max(1, len(model.weekly_deadlines))
        course_end_date = now + timedelta(
            days=max(180, DEFAULT_COHORT_EXTENSION_DAYS * total_weeks + 30)
        )
        new_deadlines: list[WeeklyDeadline] = []
        for i in range(1, total_weeks + 1):
            natural_due = now + timedelta(days=DEFAULT_COHORT_EXTENSION_DAYS * i)
            due_str = min(natural_due, course_end_date).strftime("%Y-%m-%d")
            new_deadlines.append(
                WeeklyDeadline(
                    week_number=i,
                    due_date=due_str,
                    status=DeadlineStatus.ON_TRACK,
                )
            )

        domain_progress.reset_deadlines(new_deadlines, now)

        model.weekly_deadlines = [
            WeeklyDeadlineModel(
                week_number=d.week_number,
                due_date=d.due_date,
                status=d.status,
            )
            for d in domain_progress.weekly_deadlines
        ]
        model.last_reset_at = domain_progress.last_reset_at
        await self.session.commit()
        return True, domain_progress

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
            created_at=datetime.now(UTC).isoformat(),
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

    async def delete_personal_note(self, note_id: str, user_id: str) -> bool:
        stmt = select(PersonalNoteModel).where(
            PersonalNoteModel.id == note_id,
            PersonalNoteModel.user_id == user_id,
        )
        res = await self.session.execute(stmt)
        note = res.scalar_one_or_none()
        if not note:
            return False

        await self.session.delete(note)
        await self.session.commit()
        return True

    async def mark_item_complete(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        total_course_items: int,
        valid_item_ids: set[str] | None = None,
    ) -> tuple[bool, LearningProgress]:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            await self.get_progress(user_id, course_id)
            res = await self.session.execute(stmt)
            model = res.scalar_one()

        domain_progress = _model_to_domain_progress(model)
        total_items = max(1, total_course_items)
        domain_progress.mark_item_complete(item_id, total_items)

        if valid_item_ids is not None:
            domain_progress.completed_item_ids = [
                i for i in domain_progress.completed_item_ids if i in valid_item_ids
            ]
            domain_progress.overall_progress_percent = round(
                min(
                    100.0,
                    (len(domain_progress.completed_item_ids) / total_items) * 100.0,
                ),
                1,
            )

        model.completed_item_ids = list(domain_progress.completed_item_ids)
        model.overall_progress_percent = domain_progress.overall_progress_percent

        await self.session.commit()
        return True, domain_progress

    async def list_user_progresses(self, user_id: str) -> list[LearningProgress]:
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.user_id == user_id)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_model_to_domain_progress(m) for m in models]

    async def list_enrolled_courses(self, user_id: str) -> list[EnrolledCourseSummary]:
        progresses = await self.list_user_progresses(user_id)
        summaries = []
        for lp in progresses:
            progress = lp.overall_progress_percent
            if progress <= 0:
                status = "NOT_STARTED"
            elif progress >= 100.0:
                status = "COMPLETED"
            else:
                status = "IN_PROGRESS"

            summaries.append(
                EnrolledCourseSummary(
                    course_id=lp.course_id,
                    course_title="",
                    partner_name="",
                    progress_percent=progress,
                    status=status,
                    last_accessed_at=lp.last_reset_at or "",
                )
            )
        return summaries
