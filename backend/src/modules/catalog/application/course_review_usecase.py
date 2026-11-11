import html
import logging
from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain import (
    ERR_MSG_SELF_UPVOTE,
    MAX_RATING_STARS,
    MAX_REVIEW_COMMENT_LENGTH,
    MIN_PROGRESS_PERCENT_FOR_REVIEW,
    MIN_RATING_STARS,
    VERIFIED_COMPLETER_PROGRESS_PERCENT,
    CourseAnnouncementCreatedDomainEvent,
    CourseStatus,
    ICatalogRepository,
    StudentReminderSentDomainEvent,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.domain import ILearningRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.event_bus import EventBus
from src.shared.permissions import (
    CoursePermission,
    enforce_course_ownership,
)


def _default_learning_repo_factory(session: Any) -> ILearningRepository:
    from src.modules.learning.infrastructure.repository import (
        SQLAlchemyLearningRepository,
    )

    return SQLAlchemyLearningRepository(session)


logger = logging.getLogger(__name__)


class CourseReviewUseCase:
    """Application Use Case for Course Reviews, Ratings, and Announcements."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )
        self.learning_repo_factory = (
            learning_repo_factory or _default_learning_repo_factory
        )

    async def _verify_ownership(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý khóa học",
        allow_read_only_pending: bool = False,
        required_permission: CoursePermission | None = None,
        disallow_published_mutation: bool = False,
    ) -> None:
        clean_course_id = course_id.strip() if course_id else ""
        if not clean_course_id:
            raise ValueError("Mã khóa học không được để trống")
        if not user:
            raise PermissionError(f"Bạn không có quyền {action_name}.")
        course = await repo.get_course_detail(clean_course_id)
        if not course:
            raise ValueError("Khóa học không tồn tại")
        enforce_course_ownership(
            course,
            user,
            required_permission=required_permission,
            action_name=action_name,
            allow_read_only_pending=allow_read_only_pending,
        )
        if (
            disallow_published_mutation
            and course.status == CourseStatus.PUBLISHED
            and not getattr(user, "is_admin", False)
        ):
            raise PermissionError(
                f"Không thể {action_name} này vì khóa học đã được xuất bản (PUBLISHED)."
            )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
    ):
        if rating_stars < MIN_RATING_STARS or rating_stars > MAX_RATING_STARS:
            logger.warning(
                "User %s attempted to submit review with invalid stars %s",
                user_id,
                rating_stars,
            )
            raise ValueError(
                f"Rating stars must be between {MIN_RATING_STARS} and {MAX_RATING_STARS}."
            )

        # BR_REVIEW_003: Fail-fast char validation and safe Stored XSS sanitization
        trimmed_comment = comment_text.strip()
        if len(trimmed_comment) > MAX_REVIEW_COMMENT_LENGTH:
            logger.warning(
                "User %s attempted to submit review exceeding max length", user_id
            )
            raise ValueError(
                f"Văn bản nhận xét không được vượt quá {MAX_REVIEW_COMMENT_LENGTH} ký tự (BR_REVIEW_003)."
            )

        clean_comment = html.escape(trimmed_comment)

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id = await repo.get_course_id_by_slug_or_id(course_id)

            # BR_REVIEW_004: Check if user is owner or instructor of THIS SPECIFIC course
            course_detail = await repo.get_course_detail(real_course_id)
            is_own_course = False
            if (
                course_detail
                and user_id
                and (
                    user_id == course_detail.owner_id
                    or user_id in (course_detail.co_instructor_ids or [])
                )
            ):
                is_own_course = True

            if is_own_course:
                logger.warning(
                    "Instructor %s attempted to submit review for own course %s",
                    user_id,
                    real_course_id,
                )
                raise ValueError(
                    "Giảng viên không được phép tự gửi đánh giá cho khóa học của mình (BR_REVIEW_004)."
                )

            # BR_REVIEW_001: Check if user completed at least 50% of the course via Learning domain
            learning_repo = self.learning_repo_factory(session)
            progress = await learning_repo.get_progress(user_id, real_course_id)

            if (
                not progress
                or progress.overall_progress_percent < MIN_PROGRESS_PERCENT_FOR_REVIEW
            ):
                logger.warning(
                    "User %s attempted to submit review for course %s without sufficient progress",
                    user_id,
                    real_course_id,
                )
                raise ValueError(
                    f"Chỉ học viên hoàn thành tối thiểu {int(MIN_PROGRESS_PERCENT_FOR_REVIEW)}% tiến độ khóa học mới có quyền gửi đánh giá (BR_REVIEW_001)."
                )

            is_verified_completer = (
                progress.overall_progress_percent >= VERIFIED_COMPLETER_PROGRESS_PERCENT
            )

            review = await repo.submit_course_review(
                user_id=user_id,
                user_name=user_name,
                course_id=real_course_id,
                rating_stars=rating_stars,
                comment_text=clean_comment,
                is_verified_completer=is_verified_completer,
            )
            logger.info(
                "User %s submitted review for course %s", user_id, real_course_id
            )
            return review

    async def list_course_reviews(
        self,
        course_id: str,
        page_size: int = 10,
        page_token: str = "",
        current_user_id: str | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id = await repo.get_course_id_by_slug_or_id(course_id)

            return await repo.list_course_reviews(
                course_id=real_course_id,
                page_size=page_size,
                page_token=page_token,
                current_user_id=current_user_id,
            )

    async def toggle_course_review_helpful(
        self, user_id: str, review_id: str
    ) -> tuple[bool, int]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            review = await repo.get_review_by_id(review_id)
            if not review:
                raise ValueError("Nhận xét không tồn tại.")
            if review.user_id == user_id:
                raise ValueError(ERR_MSG_SELF_UPVOTE)
            return await repo.toggle_course_review_helpful(
                user_id=user_id, review_id=review_id
            )

    async def create_course_announcement(
        self,
        course_id: str,
        author_id: str,
        author_name: str,
        title: str,
        content: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "đăng thông báo khóa học"
            )
            ann = await repo.create_course_announcement(
                course_id=course_id,
                author_id=author_id,
                author_name=author_name,
                title=title,
                content=content,
            )

            # Trigger domain event for announcement dispatching
            real_id = await repo.get_course_id_by_slug_or_id(course_id)
            target_ids = list({course_id, real_id})
            student_ids = await repo.get_enrolled_user_ids(target_ids)

            await EventBus.publish(
                CourseAnnouncementCreatedDomainEvent(
                    course_id=course_id,
                    announcement_id=ann.id,
                    title=title,
                    content=content,
                    author_name=author_name,
                    student_ids=student_ids,
                )
            )

            return ann

    async def list_course_announcements(self, course_id: str):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_announcements(course_id=course_id)

    async def send_student_reminder(
        self,
        course_id: str,
        student_ids: list[str],
        title: str,
        content: str,
        current_user: CurrentUser | None = None,
    ) -> int:
        clean_course_id = course_id.strip() if course_id else ""
        if not clean_course_id:
            raise ValueError("Mã khóa học không được để trống")
        if not student_ids:
            return 0
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, clean_course_id, current_user, "gửi thông báo nhắc nhở học viên"
            )
            real_id = await repo.get_course_id_by_slug_or_id(clean_course_id)
            target_ids = list({clean_course_id, real_id})
            enrolled_ids = set(await repo.get_enrolled_user_ids(target_ids))
            valid_student_ids = [sid for sid in student_ids if sid in enrolled_ids]
            if not valid_student_ids:
                return 0
            author_name = (
                current_user.email.split("@")[0]
                if current_user and current_user.email
                else "Giảng viên"
            )
            await EventBus.publish(
                StudentReminderSentDomainEvent(
                    course_id=clean_course_id,
                    instructor_id=current_user.id if current_user else "",
                    instructor_name=author_name,
                    student_ids=valid_student_ids,
                    title=title,
                    content=content,
                )
            )
            return len(valid_student_ids)
