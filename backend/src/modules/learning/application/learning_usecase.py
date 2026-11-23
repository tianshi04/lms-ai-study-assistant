import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src.modules.catalog.domain import ICatalogRepository, ItemType, LearningItem
from src.modules.learning.domain import (
    DEFAULT_TIMEZONE,
    MAX_HEARTBEAT_DELTA_SECONDS,
    MIN_HEARTBEAT_DELTA_SECONDS,
    AdminLearningStats,
    AdminLearningTrendPoint,
    DailyStudyRecord,
    EnrolledCourseSummary,
    ILearningRepository,
    LearningItemProgress,
    LearningProgress,
    PersonalNote,
    normalize_video_position,
)
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.shared.auth import CurrentUser
from src.shared.domain import (
    ADMIN_REQUIRED_MESSAGE,
    build_trend_window,
    normalize_trend_days,
)
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.rate_limiter import check_learning_heartbeat_rate_limit
from src.shared.permissions import COURSE_STAFF_PREVIEW_ONLY_MESSAGE, is_course_staff

logger = logging.getLogger(__name__)


def _default_catalog_repo_factory(session: Any) -> ICatalogRepository:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


def _resolve_study_date(client_timezone: str = "") -> date:
    now_utc = datetime.now(UTC)
    if client_timezone:
        try:
            return now_utc.astimezone(ZoneInfo(client_timezone)).date()
        except (KeyError, ValueError, ZoneInfoNotFoundError):
            logger.debug(
                "Failed to resolve client timezone %s, falling back", client_timezone
            )
    try:
        return now_utc.astimezone(ZoneInfo(DEFAULT_TIMEZONE)).date()
    except (KeyError, ValueError, ZoneInfoNotFoundError):
        return now_utc.astimezone(timezone(timedelta(hours=7))).date()


class LearningUseCase:
    """Application Use Case coordinator for Learning domain using Dependency Inversion (ILearningRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ILearningRepository] | None = None,
        catalog_repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyLearningRepository(session)
        )
        self._has_custom_catalog_repo_factory = catalog_repo_factory is not None
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )

    async def _resolve_course_for_guard(
        self, session: Any, repo: Any, course_id: str
    ) -> Any:
        if not course_id:
            return None
        is_real_db = "SQLAlchemy" in repo.__class__.__name__ and getattr(
            type(session), "__module__", ""
        ).startswith("sqlalchemy.")
        if self._has_custom_catalog_repo_factory or is_real_db:
            catalog_repo = self.catalog_repo_factory(session)
            return await catalog_repo.get_course_detail(course_id)
        return None

    async def _ensure_not_course_staff(
        self,
        session: Any,
        repo: Any,
        user_id: str,
        course_id: str,
        current_user: CurrentUser | None = None,
    ) -> Any:
        if current_user is not None and current_user.is_admin:
            raise PermissionError(COURSE_STAFF_PREVIEW_ONLY_MESSAGE)
        course = await self._resolve_course_for_guard(session, repo, course_id)
        if is_course_staff(course, user_id, current_user):
            raise PermissionError(COURSE_STAFF_PREVIEW_ONLY_MESSAGE)
        return course

    async def get_progress(
        self,
        user_id: str,
        course_id: str,
        current_item_id: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> LearningProgress:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._ensure_not_course_staff(
                session, repo, user_id, course_id, current_user
            )
            return await repo.get_progress(user_id, course_id, current_item_id)

    async def get_progress_with_video_positions(
        self,
        user_id: str,
        course_id: str,
        current_item_id: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> tuple[LearningProgress, list[LearningItemProgress]]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._ensure_not_course_staff(
                session, repo, user_id, course_id, current_user
            )
            progress = await repo.get_progress(user_id, course_id, current_item_id)
            video_positions = await repo.list_course_video_positions(
                user_id, progress.course_id
            )
            return progress, video_positions

    async def reset_deadlines(
        self,
        user_id: str,
        course_id: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, LearningProgress]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._ensure_not_course_staff(
                session, repo, user_id, course_id, current_user
            )
            return await repo.reset_deadlines(user_id, course_id)

    async def save_personal_note(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        highlighted_text: str,
        note_comment: str,
        timestamp_seconds: int = 0,
        current_user: CurrentUser | None = None,
    ) -> PersonalNote:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._ensure_not_course_staff(
                session, repo, user_id, course_id, current_user
            )
            return await repo.save_personal_note(
                user_id,
                course_id,
                item_id,
                highlighted_text,
                note_comment,
                timestamp_seconds,
            )

    async def list_personal_notes(
        self, user_id: str, course_id: str
    ) -> list[PersonalNote]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_personal_notes(user_id, course_id)

    async def delete_personal_note(self, note_id: str, user_id: str) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.delete_personal_note(note_id, user_id)

    async def mark_item_complete(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        *,
        from_learner_rpc: bool = False,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, LearningProgress]:

        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            course = await catalog_repo.get_course_detail(course_id)

        if not course:
            logger.warning(
                "Failed to mark item complete: Course %s not found", course_id
            )
            return False, LearningProgress(
                user_id=user_id, course_id=course_id, overall_progress_percent=0.0
            )

        if is_course_staff(course, user_id, current_user):
            raise PermissionError(COURSE_STAFF_PREVIEW_ONLY_MESSAGE)

        valid_item_ids: set[str] = set()
        week_item_ids: dict[int, set[str]] = {}
        target_item: LearningItem | None = None
        for week in course.week_modules:
            w_items = week_item_ids.setdefault(week.week_number, set())
            for lesson in week.lessons:
                for item in lesson.items:
                    valid_item_ids.add(item.id)
                    w_items.add(item.id)
                    if item.id == item_id:
                        target_item = item

        if item_id not in valid_item_ids or target_item is None:
            logger.warning(
                "Failed to mark item complete: Item %s is not part of course %s",
                item_id,
                course_id,
            )
            return False, LearningProgress(
                user_id=user_id, course_id=course_id, overall_progress_percent=0.0
            )

        if from_learner_rpc and target_item.type == ItemType.PEER_REVIEW:
            logger.warning(
                "Blocked direct MarkItemComplete RPC on PEER_REVIEW item %s for user %s",
                item_id,
                user_id,
            )
            raise PermissionError(
                "Không thể tự đánh dấu hoàn thành bài tập tự luận. Hệ thống chỉ tự động ghi nhận hoàn thành khi điểm được công bố và bạn hoàn tất nghĩa vụ chấm chéo."
            )

        total_course_items = len(valid_item_ids)
        graded_item_types = (
            ItemType.GRADED_QUIZ,
            ItemType.AUTO_GRADED_LAB,
            ItemType.PEER_REVIEW,
        )

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            if target_item.type in graded_item_types:
                (
                    is_eligible,
                    reason,
                ) = await repo.check_graded_item_completion_eligibility(
                    user_id=user_id,
                    item_id=item_id,
                    item_type=target_item.type.value,
                    item_title=target_item.title,
                )
                if not is_eligible:
                    logger.warning(
                        "Blocked mark_item_complete on %s item %s for user %s: %s",
                        target_item.type.value,
                        item_id,
                        user_id,
                        reason,
                    )
                    raise PermissionError(reason)

            result = await repo.mark_item_complete(
                user_id,
                course.id,
                item_id,
                total_course_items,
                valid_item_ids,
                week_item_ids,
            )
            logger.info(
                "User %s marked item %s complete in course %s",
                user_id,
                item_id,
                course.id,
            )
            return result

    async def list_enrolled_courses(
        self, user_id: str, current_user: CurrentUser | None = None
    ) -> list[EnrolledCourseSummary]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            progresses = await repo.list_user_progresses(user_id)
            catalog_repo = self.catalog_repo_factory(session)
            course_tasks = [
                catalog_repo.get_course_detail(p.course_id) for p in progresses
            ]
            courses = await asyncio.gather(*course_tasks)
        course_map = {c.id: c for c in courses if c}

        summaries: list[EnrolledCourseSummary] = []
        for p in progresses:
            course = course_map.get(p.course_id)
            if is_course_staff(course, user_id, current_user):
                continue
            c_title = course.title if course else f"Khóa học #{p.course_id}"
            c_partner = course.partner_name if course else ""

            progress = p.overall_progress_percent
            if progress <= 0:
                status = "NOT_STARTED"
            elif progress >= 100.0:
                status = "COMPLETED"
            else:
                status = "IN_PROGRESS"

            summaries.append(
                EnrolledCourseSummary(
                    course_id=p.course_id,
                    course_title=c_title,
                    partner_name=c_partner,
                    progress_percent=progress,
                    status=status,
                    last_accessed_at=p.last_accessed_at or p.last_reset_at or "",
                    last_accessed_item_id=p.last_accessed_item_id or "",
                    enrolled_at=p.enrolled_at or "",
                    completed_at=p.completed_at or "",
                )
            )
        return summaries

    async def record_learning_time(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        delta_seconds: int,
        client_timezone: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[int, int, int, bool]:
        if delta_seconds < MIN_HEARTBEAT_DELTA_SECONDS:
            return 0, 0, 0, False

        # Rate limit heartbeat ping (anti-cheating)
        allowed = await check_learning_heartbeat_rate_limit(user_id, cooldown_seconds=5)
        if not allowed:
            logger.warning(
                "Heartbeat throttled for user %s on course %s", user_id, course_id
            )
            return 0, 0, 0, False

        # Clamping delta_seconds to prevent hacking/abnormal velocity
        clamped_delta = min(delta_seconds, MAX_HEARTBEAT_DELTA_SECONDS)

        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            course = await catalog_repo.get_course_detail(course_id)

        if not course:
            raise ValueError(f"Khóa học {course_id} không tồn tại.")

        if is_course_staff(course, user_id, current_user):
            raise PermissionError(COURSE_STAFF_PREVIEW_ONLY_MESSAGE)

        valid_item_ids = {
            item.id
            for wm in course.week_modules
            for lesson in wm.lessons
            for item in lesson.items
        }
        if item_id not in valid_item_ids:
            raise ValueError(f"Bài học {item_id} không thuộc khóa học {course_id}.")

        # Enrollment guard: verify user has registered/enrolled in the course (read-only)
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            progress = await repo.find_progress(user_id, course.id)
            if not progress or not progress.enrolled_at:
                raise PermissionError(
                    f"Người dùng {user_id} chưa ghi danh khóa học {course_id}."
                )

        study_date = _resolve_study_date(client_timezone)
        now_iso = datetime.now(UTC).isoformat()

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.record_learning_time(
                user_id=user_id,
                course_id=course.id,
                item_id=item_id,
                delta_seconds=clamped_delta,
                study_date=study_date,
                now_iso=now_iso,
            )

    async def get_learning_streak(
        self, user_id: str, client_timezone: str = ""
    ) -> tuple[int, int, int, int, str, list[DailyStudyRecord]]:
        today = _resolve_study_date(client_timezone)

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            streak, today_seconds, recent_days = await repo.get_learning_streak_stats(
                user_id=user_id, today=today
            )

        effective_streak = streak.get_effective_streak(today)
        last_active = (
            streak.last_active_date.isoformat() if streak.last_active_date else ""
        )

        return (
            effective_streak,
            streak.longest_streak,
            today_seconds,
            streak.total_study_seconds,
            last_active,
            recent_days,
        )

    async def get_admin_learning_stats(
        self, current_user: CurrentUser
    ) -> AdminLearningStats:
        if not current_user.is_admin:
            raise PermissionError(ADMIN_REQUIRED_MESSAGE)
        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            valid_course_ids = await catalog_repo.list_scoped_course_ids()
            repo = self.repo_factory(session)
            return await repo.get_admin_enrollment_stats(valid_course_ids)

    async def get_admin_learning_trend(
        self, current_user: CurrentUser, days: int = 0
    ) -> list[AdminLearningTrendPoint]:
        if not current_user.is_admin:
            raise PermissionError(ADMIN_REQUIRED_MESSAGE)
        window = build_trend_window(normalize_trend_days(days))
        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            valid_course_ids = await catalog_repo.list_scoped_course_ids()
            repo = self.repo_factory(session)
            return await repo.get_admin_enrollment_trend(valid_course_ids, window)

    async def save_video_position(
        self,
        user_id: str,
        course_id: str,
        item_id: str,
        position_seconds: int,
        duration_seconds: int = 0,
    ) -> tuple[int, str]:
        normalized_pos, safe_duration = normalize_video_position(
            position_seconds=position_seconds,
            duration_seconds=duration_seconds,
        )

        async with async_session_scope() as session:
            catalog_repo = self.catalog_repo_factory(session)
            resolved = await catalog_repo.resolve_course_video_item(course_id, item_id)

        if not resolved:
            raise ValueError(
                f"Bài học {item_id} không thuộc khóa học {course_id} hoặc khóa học không tồn tại."
            )

        resolved_course_id, is_video_item = resolved
        if not is_video_item:
            raise ValueError(f"Bài học {item_id} không phải học liệu video.")

        now_iso = datetime.now(UTC).isoformat()
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            enrolled = await repo.is_enrolled(user_id, resolved_course_id)
            if not enrolled:
                raise PermissionError(
                    f"Người dùng {user_id} chưa ghi danh khóa học {resolved_course_id}."
                )
            return await repo.save_video_position(
                user_id=user_id,
                course_id=resolved_course_id,
                item_id=item_id,
                position_seconds=normalized_pos,
                duration_seconds=safe_duration,
                now_iso=now_iso,
            )
