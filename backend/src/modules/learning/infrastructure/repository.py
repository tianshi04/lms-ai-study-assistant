from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid6 import uuid7

from src.modules.catalog.infrastructure.models import WeekModuleModel
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
        completed_item_ids=list(model.completed_item_ids or []),
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


def _build_initial_weekly_deadlines(
    week_numbers: list[int], now: datetime
) -> list[WeeklyDeadlineModel]:
    return [
        WeeklyDeadlineModel(
            week_number=week_num,
            due_date=(
                now + timedelta(days=DEFAULT_COHORT_EXTENSION_DAYS * idx)
            ).strftime("%Y-%m-%d"),
            status=DeadlineStatus.ON_TRACK,
        )
        for idx, week_num in enumerate(week_numbers, start=1)
    ]


class SQLAlchemyLearningRepository(ILearningRepository):
    """Async SQLAlchemy Database Repository implementing ILearningRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _get_key(self, user_id: str, course_id: str) -> str:
        return f"{user_id}:{course_id}"

    async def _resolve_course_week_numbers(
        self, course_id: str, fallback_weeks: list[int] | None = None
    ) -> list[int]:
        week_stmt = (
            select(WeekModuleModel.week_number)
            .where(WeekModuleModel.course_id == course_id)
            .order_by(WeekModuleModel.week_number)
        )
        week_res = await self.session.execute(week_stmt)
        week_numbers = sorted({int(w) for w in week_res.scalars().all() if w > 0})
        return week_numbers or fallback_weeks or [1, 2]

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

            res = await self.session.execute(stmt.with_for_update())
            model = res.scalar_one()

            if not model.weekly_deadlines:
                week_numbers = await self._resolve_course_week_numbers(course_id)
                now = datetime.now(UTC)
                model.weekly_deadlines.extend(
                    _build_initial_weekly_deadlines(week_numbers, now)
                )
                try:
                    await self.session.commit()
                except Exception:  # noqa: BLE001
                    await self.session.rollback()
                    res = await self.session.execute(stmt)
                    model = res.scalar_one()
        elif model.weekly_deadlines:
            today_str = datetime.now(UTC).strftime("%Y-%m-%d")
            overdue_updated = False
            for d in model.weekly_deadlines:
                if (
                    d.status == DeadlineStatus.ON_TRACK
                    and len(d.due_date) >= 10
                    and d.due_date[:4].isdigit()
                    and d.due_date[:10] < today_str
                ):
                    d.status = DeadlineStatus.OVERDUE
                    overdue_updated = True
            if overdue_updated:
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

        existing_by_week = {d.week_number: d for d in domain_progress.weekly_deadlines}
        week_numbers = await self._resolve_course_week_numbers(
            course_id, fallback_weeks=sorted(existing_by_week.keys())
        )
        total_weeks = max(1, len(week_numbers))
        course_end_date = now + timedelta(
            days=max(180, DEFAULT_COHORT_EXTENSION_DAYS * total_weeks + 30)
        )
        new_deadlines: list[WeeklyDeadline] = []
        pending_idx = 0
        for week_num in week_numbers:
            existing = existing_by_week.get(week_num)
            if existing and existing.status == DeadlineStatus.COMPLETED:
                new_deadlines.append(existing)
            else:
                pending_idx += 1
                natural_due = now + timedelta(
                    days=DEFAULT_COHORT_EXTENSION_DAYS * pending_idx
                )
                due_str = min(natural_due, course_end_date).strftime("%Y-%m-%d")
                new_deadlines.append(
                    WeeklyDeadline(
                        week_number=week_num,
                        due_date=due_str,
                        status=DeadlineStatus.ON_TRACK,
                    )
                )

        domain_progress.reset_deadlines(new_deadlines, now)

        model.weekly_deadlines.clear()
        await self.session.flush()
        model.weekly_deadlines.extend(
            WeeklyDeadlineModel(
                week_number=d.week_number,
                due_date=d.due_date,
                status=d.status,
            )
            for d in domain_progress.weekly_deadlines
        )
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
            id=f"note-{uuid7().hex}",
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
        week_item_ids: dict[int, set[str]] | None = None,
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

        if week_item_ids and model.weekly_deadlines:
            completed_set = set(model.completed_item_ids)
            for d in model.weekly_deadlines:
                w_items = week_item_ids.get(d.week_number)
                if w_items and w_items.issubset(completed_set):
                    d.status = DeadlineStatus.COMPLETED

        await self.session.commit()
        return True, _model_to_domain_progress(model)

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
