from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid6 import uuid7

from src.modules.catalog.infrastructure.models import WeekModuleModel
from src.modules.learning.domain import (
    DEFAULT_COHORT_EXTENSION_DAYS,
    MIN_DAILY_STUDY_SECONDS_FOR_STREAK,
    DailyStudyRecord,
    DeadlineStatus,
    EnrolledCourseSummary,
    ILearningRepository,
    LearningProgress,
    PersonalNote,
    UserLearningStreak,
    WeeklyDeadline,
)
from src.modules.learning.infrastructure.models import (
    DailyLearningRecordModel,
    LearningItemProgressModel,
    LearningProgressModel,
    PersonalNoteModel,
    UserLearningStreakModel,
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
        last_accessed_at=model.last_accessed_at,
        last_accessed_item_id=model.last_accessed_item_id,
        enrolled_at=model.enrolled_at,
        completed_at=model.completed_at,
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
        timestamp_seconds=model.timestamp_seconds,
        updated_at=model.updated_at,
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

    async def get_progress(
        self, user_id: str, course_id: str, current_item_id: str | None = None
    ) -> LearningProgress:
        key = self._get_key(user_id, course_id)
        stmt = (
            select(LearningProgressModel)
            .where(LearningProgressModel.id == key)
            .options(selectinload(LearningProgressModel.weekly_deadlines))
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        now_str = datetime.now(UTC).isoformat()

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
                    enrolled_at=now_str,
                    last_accessed_at=now_str,
                    last_accessed_item_id=current_item_id,
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
        else:
            dirty = False
            if current_item_id:
                model.last_accessed_at = now_str
                model.last_accessed_item_id = current_item_id
                dirty = True
            if model.weekly_deadlines:
                today_str = datetime.now(UTC).strftime("%Y-%m-%d")
                for d in model.weekly_deadlines:
                    if (
                        d.status == DeadlineStatus.ON_TRACK
                        and len(d.due_date) >= 10
                        and d.due_date[:4].isdigit()
                        and d.due_date[:10] < today_str
                    ):
                        d.status = DeadlineStatus.OVERDUE
                        dirty = True
            if dirty:
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
        timestamp_seconds: int = 0,
    ) -> PersonalNote:
        now_str = datetime.now(UTC).isoformat()
        note_model = PersonalNoteModel(
            id=f"note-{uuid7().hex}",
            user_id=user_id,
            course_id=course_id,
            item_id=item_id,
            highlighted_text=highlighted_text,
            note_comment=note_comment,
            timestamp_seconds=timestamp_seconds,
            created_at=now_str,
            updated_at=now_str,
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

        now_str = datetime.now(UTC).isoformat()
        domain_progress = _model_to_domain_progress(model)
        total_items = max(1, total_course_items)
        domain_progress.mark_item_complete(item_id, total_items, now_iso=now_str)

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
        model.last_accessed_at = now_str
        model.last_accessed_item_id = item_id
        if domain_progress.completed_at and not model.completed_at:
            model.completed_at = domain_progress.completed_at

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
                    last_accessed_at=lp.last_accessed_at or lp.last_reset_at or "",
                    last_accessed_item_id=lp.last_accessed_item_id or "",
                    enrolled_at=lp.enrolled_at or "",
                    completed_at=lp.completed_at or "",
                )
            )
        return summaries

    async def record_learning_time(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        delta_seconds: int,
        study_date: date,
        now_iso: str,
    ) -> tuple[int, int, int, bool]:
        # 1. Atomic upsert learning_item_progresses
        item_stmt = (
            pg_insert(LearningItemProgressModel)
            .values(
                user_id=user_id,
                item_id=item_id,
                course_id=course_id,
                time_spent_seconds=delta_seconds,
                last_studied_at=now_iso,
            )
            .on_conflict_do_update(
                index_elements=[
                    LearningItemProgressModel.user_id,
                    LearningItemProgressModel.item_id,
                ],
                set_={
                    "time_spent_seconds": LearningItemProgressModel.time_spent_seconds
                    + delta_seconds,
                    "last_studied_at": now_iso,
                },
            )
            .returning(LearningItemProgressModel.time_spent_seconds)
        )
        res_item = await self.session.execute(item_stmt)
        item_total_seconds = res_item.scalar_one()

        # 2. Atomic upsert daily_learning_records
        daily_stmt = (
            pg_insert(DailyLearningRecordModel)
            .values(
                user_id=user_id,
                study_date=study_date,
                total_seconds=delta_seconds,
                is_streak_qualified=False,
            )
            .on_conflict_do_update(
                index_elements=[
                    DailyLearningRecordModel.user_id,
                    DailyLearningRecordModel.study_date,
                ],
                set_={
                    "total_seconds": DailyLearningRecordModel.total_seconds
                    + delta_seconds,
                },
            )
            .returning(DailyLearningRecordModel.total_seconds)
        )
        res_daily = await self.session.execute(daily_stmt)
        today_total_seconds = res_daily.scalar_one()

        # 3. Atomic state transition: is_streak_qualified False -> True
        is_streak_extended_today = False
        if today_total_seconds >= MIN_DAILY_STUDY_SECONDS_FOR_STREAK:
            transition_stmt = (
                update(DailyLearningRecordModel)
                .where(
                    DailyLearningRecordModel.user_id == user_id,
                    DailyLearningRecordModel.study_date == study_date,
                    DailyLearningRecordModel.is_streak_qualified == False,
                )
                .values(is_streak_qualified=True)
                .returning(DailyLearningRecordModel.user_id)
            )
            res_trans = await self.session.execute(transition_stmt)
            if res_trans.scalar_one_or_none() is not None:
                is_streak_extended_today = True

        # 4. Atomic initialization to prevent concurrency IntegrityError on first-time streak insert
        init_streak_stmt = (
            pg_insert(UserLearningStreakModel)
            .values(
                user_id=user_id,
                current_streak=0,
                longest_streak=0,
                last_active_date=None,
                total_study_seconds=0,
                updated_at=now_iso,
            )
            .on_conflict_do_nothing(index_elements=[UserLearningStreakModel.user_id])
        )
        await self.session.execute(init_streak_stmt)

        # Row-lock user_learning_streaks and leverage rich Domain Entity logic
        streak_stmt = (
            select(UserLearningStreakModel)
            .where(UserLearningStreakModel.user_id == user_id)
            .with_for_update()
        )
        streak_res = await self.session.execute(streak_stmt)
        streak_model = streak_res.scalar_one()

        domain_streak = UserLearningStreak(
            user_id=streak_model.user_id,
            current_streak=streak_model.current_streak,
            longest_streak=streak_model.longest_streak,
            last_active_date=streak_model.last_active_date,
            total_study_seconds=streak_model.total_study_seconds,
            updated_at=streak_model.updated_at,
        )
        domain_streak.total_study_seconds += delta_seconds
        domain_streak.updated_at = now_iso
        if is_streak_extended_today:
            domain_streak.advance_streak(study_date, now_iso)

        streak_model.current_streak = domain_streak.current_streak
        streak_model.longest_streak = domain_streak.longest_streak
        streak_model.last_active_date = domain_streak.last_active_date
        streak_model.total_study_seconds = domain_streak.total_study_seconds
        streak_model.updated_at = domain_streak.updated_at

        await self.session.commit()

        effective_streak = domain_streak.get_effective_streak(study_date)
        return (
            item_total_seconds,
            today_total_seconds,
            effective_streak,
            is_streak_extended_today,
        )

    async def get_learning_streak_stats(
        self,
        user_id: str,
        today: date,
    ) -> tuple[UserLearningStreak, int, list[DailyStudyRecord]]:
        stmt = select(UserLearningStreakModel).where(
            UserLearningStreakModel.user_id == user_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if model:
            streak = UserLearningStreak(
                user_id=model.user_id,
                current_streak=model.current_streak,
                longest_streak=model.longest_streak,
                last_active_date=model.last_active_date,
                total_study_seconds=model.total_study_seconds,
                updated_at=model.updated_at,
            )
        else:
            streak = UserLearningStreak(
                user_id=user_id,
                current_streak=0,
                longest_streak=0,
                last_active_date=None,
                total_study_seconds=0,
                updated_at="",
            )

        start_date = today - timedelta(days=6)
        daily_stmt = (
            select(DailyLearningRecordModel)
            .where(
                DailyLearningRecordModel.user_id == user_id,
                DailyLearningRecordModel.study_date >= start_date,
                DailyLearningRecordModel.study_date <= today,
            )
            .order_by(DailyLearningRecordModel.study_date.asc())
        )
        daily_res = await self.session.execute(daily_stmt)
        daily_models = {d.study_date: d for d in daily_res.scalars().all()}

        today_seconds = 0
        recent_days: list[DailyStudyRecord] = []
        for i in range(7):
            d = start_date + timedelta(days=i)
            rec = daily_models.get(d)
            sec = rec.total_seconds if rec else 0
            is_qual = rec.is_streak_qualified if rec else False
            if d == today:
                today_seconds = sec
            recent_days.append(
                DailyStudyRecord(
                    date=d.isoformat(),
                    total_seconds=sec,
                    is_streak_qualified=is_qual,
                )
            )

        return streak, today_seconds, recent_days
