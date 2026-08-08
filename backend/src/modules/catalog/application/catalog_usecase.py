import html
import logging
import uuid
from typing import Any, Callable

from src.modules.catalog.domain.constants import (
    MAX_RATING_STARS,
    MAX_REVIEW_COMMENT_LENGTH,
    MIN_PROGRESS_PERCENT_FOR_REVIEW,
    MIN_RATING_STARS,
    VERIFIED_COMPLETER_PROGRESS_PERCENT,
)
from src.modules.catalog.domain.entities import (
    Category,
    Course,
    CourseStatus,
    ItemType,
    Lesson,
    Specialization,
    LearningItem,
)
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.domain.repository import ILearningRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from src.shared.permissions import (
    CoursePermission,
    OrgPermission,
    enforce_course_ownership,
    enforce_organization_permission,
)


def _default_learning_repo_factory(session: Any) -> ILearningRepository:
    from src.modules.learning.infrastructure.repository import (
        SQLAlchemyLearningRepository,
    )

    return SQLAlchemyLearningRepository(session)


logger = logging.getLogger(__name__)


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain using Dependency Inversion (ICatalogRepository interface)."""

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
    ) -> None:
        if user and course_id:
            course = await repo.get_course_detail(course_id)
            if course:
                enforce_course_ownership(
                    course,
                    user,
                    required_permission=required_permission,
                    action_name=action_name,
                    allow_read_only_pending=allow_read_only_pending,
                )

    async def submit_course_for_launch(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> Course:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "nộp khóa học phê duyệt",
                allow_read_only_pending=True,
            )
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học.")

            course.submit_for_launch()
            updated = await repo.update_course_status(
                course.id, course.status, course.rejection_reason
            )
            return updated if updated else course

    async def review_course(
        self,
        course_id: str,
        action: Any,
        rejection_reason: str = "",
        current_user: CurrentUser | None = None,
    ) -> Course:
        if not current_user or not current_user.is_admin:
            raise PermissionError(
                "Chỉ Quản trị viên hệ thống mới có quyền phê duyệt/từ chối khóa học."
            )

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học.")

            action_str = str(action).upper()
            if action_str in ("APPROVE", "COURSE_REVIEW_ACTION_APPROVE", "1"):
                course.approve()
            elif action_str in ("REJECT", "COURSE_REVIEW_ACTION_REJECT", "2"):
                course.reject(rejection_reason)
            else:
                raise ValueError("Hành động kiểm duyệt không hợp lệ.")

            updated = await repo.update_course_status(
                course.id, course.status, course.rejection_reason
            )
            return updated if updated else course

    async def list_courses(
        self,
        page_size: int = 10,
        page_token: str = "",
        search_query: str = "",
        subject: str = "",
        level: str = "",
        sort_by: str = "",
        organization_id: str | None = None,
        status_filter: Any = "",
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_courses(
                page_size,
                page_token,
                search_query,
                subject,
                level,
                sort_by,
                status_filter,
                organization_id=organization_id,
            )

    async def list_instructor_courses(
        self,
        instructor_id: str,
        page_size: int = 50,
        page_token: str = "",
        status_filter: str | CourseStatus | None = None,
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_instructor_courses(
                instructor_id=instructor_id,
                page_size=page_size,
                page_token=page_token,
                status_filter=status_filter,
            )

    async def get_course_detail(self, course_id: str) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_course_detail(course_id)

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_lesson_detail(course_id, lesson_id)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_specialization(specialization_id)

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "",
        level: str = "",
        owner_id: str = "",
        financial_aid_enabled: bool = True,
        organization_id: str = "partner_community",
        current_user: CurrentUser | None = None,
    ) -> Course:
        async with async_session_scope() as session:
            if current_user and organization_id:
                await enforce_organization_permission(
                    session,
                    current_user,
                    organization_id,
                    required_permission=OrgPermission.CREATE_COURSE,
                )
            repo = self.repo_factory(session)
            course = await repo.create_course(
                title=title,
                slug=slug,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
                owner_id=owner_id,
                financial_aid_enabled=financial_aid_enabled,
                organization_id=organization_id or "partner_community",
            )
            logger.info(
                "Created course %s by owner %s",
                course.id if hasattr(course, "id") else title,
                owner_id,
            )
            return course

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "",
        level: str = "",
        financial_aid_enabled: bool = True,
        current_user: CurrentUser | None = None,
    ) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa khóa học"
            )
            return await repo.update_course(
                course_id=course_id,
                title=title,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
                financial_aid_enabled=financial_aid_enabled,
            )

    async def create_week_module(
        self,
        course_id: str,
        title: str,
        summary: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo tuần học")
            return await repo.create_week_module(
                course_id=course_id,
                title=title,
                summary=summary,
            )

    async def create_lesson(
        self,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo bài học")
            return await repo.create_lesson(
                course_id=course_id,
                week_module_id=week_module_id,
                title=title,
                estimated_minutes=estimated_minutes,
            )

    async def create_learning_item(
        self,
        course_id: str,
        lesson_id: str,
        title: str,
        item_type: int | ItemType | str = ItemType.UNSPECIFIED,
        estimated_minutes: int = 10,
        video_url: str = "",
        reading_markdown: str = "",
        vtt_subtitle_url: str = "",
        auto_transcribe: bool = False,
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "tạo học liệu")
            item = await repo.create_learning_item(
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
                vtt_subtitle_url=vtt_subtitle_url,
                auto_transcribe=auto_transcribe,
                in_video_quizzes=in_video_quizzes,
                starter_code=starter_code,
                test_cases_json=test_cases_json,
                language=language,
                rubric_criteria_json=rubric_criteria_json,
                quiz_matrix_id=quiz_matrix_id,
            )
            logger.info(
                "Created learning item %s in course %s",
                item.id if hasattr(item, "id") else title,
                course_id,
            )
            return item

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
            real_course_id, instructor_names = await repo.get_course_id_by_slug_or_id(
                course_id
            )

            # BR_REVIEW_004: Check if user is owner or instructor of THIS SPECIFIC course
            course_detail = await repo.get_course_detail(real_course_id)
            is_own_course = False
            if course_detail:
                if user_id and (
                    user_id == course_detail.owner_id
                    or user_id in (course_detail.co_instructor_ids or [])
                ):
                    is_own_course = True
                elif instructor_names and user_name in instructor_names:
                    is_own_course = True
            elif instructor_names and user_name in instructor_names:
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
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id, _ = await repo.get_course_id_by_slug_or_id(course_id)

            return await repo.list_course_reviews(
                course_id=real_course_id, page_size=page_size, page_token=page_token
            )

    async def list_categories(self, type_filter: str = "") -> list[Category]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_categories(type_filter)

    async def create_category(self, name: str, category_type: str) -> Category:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.create_category(name, category_type)

    async def delete_category(self, category_id: str) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.delete_category(category_id)

    async def delete_course(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa khóa học")
            return await repo.delete_course(course_id)

    async def update_week_module(
        self,
        id: str,
        course_id: str,
        title: str,
        summary: str,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa tuần học"
            )
            return await repo.update_week_module(
                id=id,
                course_id=course_id,
                title=title,
                summary=summary,
            )

    async def delete_week_module(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa tuần học")
            return await repo.delete_week_module(id=id, course_id=course_id)

    async def update_lesson(
        self,
        id: str,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa bài học"
            )
            return await repo.update_lesson(
                id=id,
                course_id=course_id,
                week_module_id=week_module_id,
                title=title,
                estimated_minutes=estimated_minutes,
            )

    async def delete_lesson(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa bài học")
            return await repo.delete_lesson(id=id, course_id=course_id)

    async def update_learning_item(
        self,
        id: str,
        course_id: str,
        lesson_id: str,
        title: str,
        item_type: int,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
        vtt_subtitle_url: str | None = None,
        auto_transcribe: bool | None = None,
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        current_user: CurrentUser | None = None,
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "chỉnh sửa học liệu"
            )
            return await repo.update_learning_item(
                id=id,
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
                vtt_subtitle_url=vtt_subtitle_url,
                auto_transcribe=auto_transcribe,
                in_video_quizzes=in_video_quizzes,
                starter_code=starter_code,
                test_cases_json=test_cases_json,
                language=language,
                rubric_criteria_json=rubric_criteria_json,
                quiz_matrix_id=quiz_matrix_id,
            )

    async def delete_learning_item(
        self, id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xóa học liệu")
            return await repo.delete_learning_item(id=id, course_id=course_id)

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

            # Trigger batch notification to enrolled learners
            try:
                from sqlalchemy import select
                from src.modules.learning.infrastructure.models import (
                    LearningProgressModel,
                )
                from src.modules.notification.application.use_cases import (
                    NotificationUseCase,
                )
                from src.modules.notification.domain.constants import (
                    NotificationCategory,
                )

                real_id, _ = await repo.get_course_id_by_slug_or_id(course_id)
                target_ids = list({course_id, real_id})

                enrolled_stmt = select(LearningProgressModel.user_id).where(
                    LearningProgressModel.course_id.in_(target_ids)
                )
                enrolled_res = await session.execute(enrolled_stmt)
                student_ids = list(enrolled_res.scalars().all())

                if student_ids:
                    notif_uc = NotificationUseCase()
                    await notif_uc.send_batch_notifications(
                        recipient_ids=student_ids,
                        category=NotificationCategory.ANNOUNCEMENT,
                        title=f"Thông báo mới từ Giảng viên {author_name}",
                        content=f"{title}: {content[:100]}...",
                        action_url=f"/learn/{course_id}",
                    )
            except Exception as e:
                import logging

                logging.getLogger(__name__).warning(
                    "Failed to send course announcement notifications: %s", e
                )

            return ann

    async def list_course_announcements(self, course_id: str):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_announcements(course_id=course_id)

    async def get_instructor_analytics(
        self, course_id: str, current_user: CurrentUser | None = None
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "xem báo cáo lớp học"
            )
            return await repo.get_instructor_analytics(course_id=course_id)

    async def reorder_week_modules(
        self,
        course_id: str,
        ordered_week_module_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp tuần học"
            )
            return await repo.reorder_week_modules(
                course_id=course_id, ordered_week_module_ids=ordered_week_module_ids
            )

    async def reorder_lessons(
        self,
        course_id: str,
        week_module_id: str,
        ordered_lesson_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp bài học"
            )
            return await repo.reorder_lessons(
                course_id=course_id,
                week_module_id=week_module_id,
                ordered_lesson_ids=ordered_lesson_ids,
            )

    async def reorder_learning_items(
        self,
        course_id: str,
        lesson_id: str,
        ordered_item_ids: list[str],
        current_user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo, course_id, current_user, "sắp xếp học liệu"
            )
            return await repo.reorder_learning_items(
                course_id=course_id,
                lesson_id=lesson_id,
                ordered_item_ids=ordered_item_ids,
            )

    async def generate_upload_url(
        self, filename: str, content_type: str, folder: str = "videos"
    ) -> tuple[str, str, str]:
        """Generate presigned upload URL and public file access URL for MinIO/S3."""

        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        ext = filename.split(".")[-1] if "." in filename else "bin"
        safe_folder = folder.strip("/") if folder else "videos"
        PUBLIC_FOLDERS = {"thumbnails", "banners", "avatars"}
        prefix = "public" if safe_folder in PUBLIC_FOLDERS else "private"
        object_key = f"{prefix}/{safe_folder}/{uuid.uuid4().hex[:12]}.{ext}"

        upload_url = await s3.generate_presigned_upload_url(
            object_key, content_type=content_type or "application/octet-stream"
        )
        file_url = s3._to_public_url(f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}")
        return upload_url, file_url, object_key

    async def upload_media_file(
        self,
        filename: str,
        content_type: str,
        file_bytes: bytes,
        folder: str = "videos",
    ) -> tuple[str, str]:
        """Upload raw file bytes directly to MinIO/S3 storage."""

        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        ext = filename.split(".")[-1] if "." in filename else "bin"
        safe_folder = folder.strip("/") if folder else "videos"
        PUBLIC_FOLDERS = {"thumbnails", "banners", "avatars"}
        prefix = "public" if safe_folder in PUBLIC_FOLDERS else "private"
        object_key = f"{prefix}/{safe_folder}/{uuid.uuid4().hex[:12]}.{ext}"

        await s3.upload_file(
            file_bytes=file_bytes,
            object_key=object_key,
            content_type=content_type or "application/octet-stream",
        )
        file_url = s3._to_public_url(f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}")
        return file_url, object_key

    async def export_course_to_scorm(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> tuple[str, str]:
        """Export a course Outline + Learning Items + Quizzes to a standard SCORM 1.2 ZIP package."""
        import io
        import json
        import os
        import zipfile
        from sqlalchemy import text

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(repo, course_id, current_user, "xuất SCORM")
            course = await repo.get_course_detail(course_id)
            if not course:
                raise ValueError("Không tìm thấy khóa học để xuất SCORM.")

            # 1. Build course JSON representation
            course_dict = {
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "description": course.description,
                "partnerName": course.partner_name,
                "partnerLogoUrl": course.partner_logo_url,
                "instructorNames": course.instructor_names,
                "ownerId": course.owner_id,
                "coInstructorIds": course.co_instructor_ids,
                "weekModules": [],
            }

            for wm in course.week_modules:
                wm_dict = {
                    "id": wm.id,
                    "weekNumber": wm.week_number,
                    "title": wm.title,
                    "summary": wm.summary,
                    "lessons": [],
                }
                for lesson in wm.lessons:
                    lesson_dict = {
                        "id": lesson.id,
                        "title": lesson.title,
                        "estimatedMinutes": lesson.estimated_minutes,
                        "items": [],
                    }
                    for item in lesson.items:
                        # Convert ItemType to integer
                        type_val = 0
                        if item.type == ItemType.VIDEO:
                            type_val = 1
                        elif item.type == ItemType.READING:
                            type_val = 2
                        elif item.type == ItemType.PRACTICE_QUIZ:
                            type_val = 3
                        elif item.type == ItemType.GRADED_QUIZ:
                            type_val = 4
                        elif item.type == ItemType.AUTO_GRADED_LAB:
                            type_val = 5
                        elif item.type == ItemType.PEER_REVIEW:
                            type_val = 6

                        item_dict = {
                            "id": item.id,
                            "title": item.title,
                            "type": type_val,
                            "estimatedMinutes": item.estimated_minutes,
                            "videoUrl": item.video_url,
                            "readingMarkdown": item.reading_markdown,
                            "vttSubtitleUrl": item.vtt_subtitle_url,
                            "autoTranscribe": item.auto_transcribe,
                            "starterCode": item.starter_code,
                            "testCasesJson": item.test_cases_json,
                            "language": item.language,
                            "rubricCriteriaJson": item.rubric_criteria_json,
                            "quizMatrixId": item.quiz_matrix_id,
                            "inVideoQuizzes": [
                                {
                                    "timestampSeconds": q.timestamp_seconds,
                                    "question": q.question,
                                    "options": q.options,
                                    "correctOptionIndex": q.correct_option_index,
                                    "explanation": q.explanation,
                                }
                                for q in item.in_video_quizzes
                            ],
                            "quizzes": [],
                        }

                        # Load Quiz questions directly via raw SQL if quiz_matrix_id exists
                        if item.quiz_matrix_id:
                            try:
                                stmt = text(
                                    "SELECT id, question_text, options, correct_option_index, explanation "
                                    "FROM quizzes WHERE matrix_id = :matrix_id"
                                )
                                res = await session.execute(
                                    stmt, {"matrix_id": item.quiz_matrix_id}
                                )
                                for row in res.fetchall():
                                    item_dict["quizzes"].append(
                                        {
                                            "id": row[0],
                                            "question": row[1],
                                            "options": list(row[2]),
                                            "correctOptionIndex": row[3],
                                            "explanation": row[4],
                                        }
                                    )
                            except Exception as e:
                                logger.warning(
                                    "Failed to fetch quizzes for item %s: %s",
                                    item.id,
                                    str(e),
                                )

                        lesson_dict["items"].append(item_dict)
                    wm_dict["lessons"].append(lesson_dict)
                course_dict["weekModules"].append(wm_dict)

            # 2. Package everything in a ZIP file in memory
            zip_buffer = io.BytesIO()
            template_dir = os.path.join(
                os.path.dirname(__file__), "..", "infrastructure", "scorm_templates"
            )

            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
                # Add all static files from SCORM templates
                if os.path.exists(template_dir):
                    for root, _, files in os.walk(template_dir):
                        for file in files:
                            full_path = os.path.join(root, file)
                            rel_path = os.path.relpath(full_path, template_dir)
                            z.write(full_path, rel_path)

                # Add course_data.json
                z.writestr(
                    "content/course_data.json",
                    json.dumps(course_dict, ensure_ascii=False, indent=2),
                )

                # Add Level 1 Native file: openlms-course.json
                openlms_metadata = {
                    "exporter": "OpenLMS",
                    "version": "1.0",
                    "course": course_dict,
                }
                z.writestr(
                    "openlms-course.json",
                    json.dumps(openlms_metadata, ensure_ascii=False, indent=2),
                )

            # 3. Upload ZIP file to storage
            zip_bytes = zip_buffer.getvalue()
            object_key = f"scorm/exports/{uuid.uuid4().hex[:16]}.zip"
            s3 = get_s3_storage_service()
            await s3.ensure_bucket_exists()
            await s3.upload_file(
                file_bytes=zip_bytes,
                object_key=object_key,
                content_type="application/zip",
            )
            download_url = await s3.generate_presigned_download_url(object_key)
            return download_url, object_key

    async def parse_scorm_package(
        self, scorm_object_key: str, target_course_id: str
    ) -> tuple[Course | None, bool, LearningItem | None]:
        """Parse uploaded SCORM ZIP to determine capability levels (Level 1: Native Course, Level 2: SCORM Item)."""
        import io
        import json
        import zipfile

        s3 = get_s3_storage_service()
        try:
            file_bytes = await s3.download_file(scorm_object_key)
        except Exception as e:
            raise ValueError(f"Không thể tải tệp tin SCORM từ storage: {str(e)}")

        zip_buffer = io.BytesIO(file_bytes)
        try:
            with zipfile.ZipFile(zip_buffer) as z:
                namelist = z.namelist()

                # Level 1 check: openlms-course.json
                metadata_file = next(
                    (f for f in namelist if f.endswith("openlms-course.json")), None
                )
                if metadata_file:
                    try:
                        metadata_content = z.read(metadata_file).decode("utf-8")
                        metadata = json.loads(metadata_content)
                        if "exporter" not in metadata or "course" not in metadata:
                            raise ValueError(
                                "Thiếu trường thông tin exporter hoặc course trong metadata."
                            )

                        course_dict = metadata["course"]
                        if "weekModules" not in course_dict or not isinstance(
                            course_dict["weekModules"], list
                        ):
                            raise ValueError(
                                "Khóa học thiếu danh sách collection 'weekModules'."
                            )

                        preview_course = self._map_dict_to_course_entity(course_dict)
                        return preview_course, False, None
                    except Exception as err:
                        raise ValueError(
                            f"Không thể phục hồi cấu trúc khóa học Native: {str(err)}"
                        )

                # Level 2 check (standard SCORM): reject it
                manifest_file = next(
                    (f for f in namelist if f.endswith("imsmanifest.xml")), None
                )
                if manifest_file:
                    raise ValueError(
                        "Hệ thống chỉ hỗ trợ import gói SCORM Native định dạng khóa học (Level 1). Gói SCORM tương tác (Level 2) bị từ chối."
                    )

                # Invalid package
                raise ValueError(
                    "Không tìm thấy tệp openlms-course.json hợp lệ trong gói SCORM."
                )
        except zipfile.BadZipFile:
            raise ValueError("Định dạng tệp ZIP không hợp lệ.")

    def _map_dict_to_course_entity(self, d: dict) -> Course:
        from src.modules.catalog.domain.entities import (
            Course,
            WeekModule,
            Lesson,
            LearningItem,
            InteractiveTranscript,
            InVideoQuiz,
            ItemType,
        )

        week_modules = []
        for wm in d.get("weekModules", []):
            lessons = []
            for lesson in wm.get("lessons", []):
                items = []
                for item in lesson.get("items", []):
                    transcripts = [
                        InteractiveTranscript(
                            timestamp_seconds=t.get("timestampSeconds", 0),
                            text=t.get("text", ""),
                        )
                        for t in item.get("interactiveTranscripts", [])
                    ]
                    quizzes = [
                        InVideoQuiz(
                            timestamp_seconds=q.get("timestampSeconds", 0),
                            question=q.get("question", ""),
                            options=list(q.get("options", [])),
                            correct_option_index=q.get("correctOptionIndex", 0),
                            explanation=q.get("explanation", ""),
                        )
                        for q in item.get("inVideoQuizzes", [])
                    ]
                    # Safe mapping of item types
                    raw_type = item.get("type", 0)
                    type_mapping = {
                        1: ItemType.VIDEO,
                        2: ItemType.READING,
                        3: ItemType.PRACTICE_QUIZ,
                        4: ItemType.GRADED_QUIZ,
                        5: ItemType.AUTO_GRADED_LAB,
                        6: ItemType.PEER_REVIEW,
                    }
                    itype = type_mapping.get(raw_type, ItemType.UNSPECIFIED)

                    items.append(
                        LearningItem(
                            id=item.get("id", ""),
                            title=item.get("title", ""),
                            type=itype,
                            estimated_minutes=item.get("estimatedMinutes", 10),
                            video_url=item.get("videoUrl", ""),
                            vtt_subtitle_url=item.get("vttSubtitleUrl", ""),
                            interactive_transcripts=transcripts,
                            in_video_quizzes=quizzes,
                            reading_markdown=item.get("readingMarkdown", ""),
                            order_index=item.get("orderIndex", 0),
                            starter_code=item.get("starterCode", ""),
                            test_cases_json=item.get("testCasesJson", ""),
                            language=item.get("language", ""),
                            rubric_criteria_json=item.get("rubricCriteriaJson", ""),
                            quiz_matrix_id=item.get("quizMatrixId", ""),
                        )
                    )
                lessons.append(
                    Lesson(
                        id=lesson.get("id", ""),
                        title=lesson.get("title", ""),
                        estimated_minutes=lesson.get("estimatedMinutes", 30),
                        items=items,
                        order_index=lesson.get("orderIndex", 0),
                    )
                )
            week_modules.append(
                WeekModule(
                    id=wm.get("id", ""),
                    week_number=wm.get("weekNumber", 1),
                    title=wm.get("title", ""),
                    summary=wm.get("summary", ""),
                    lessons=lessons,
                )
            )

        return Course(
            id=d.get("id", ""),
            title=d.get("title", ""),
            slug=d.get("slug", ""),
            description=d.get("description", ""),
            partner_name=d.get("partnerName", ""),
            partner_logo_url=d.get("partnerLogoUrl", ""),
            instructor_names=list(d.get("instructorNames", [])),
            week_modules=week_modules,
            owner_id=d.get("ownerId", ""),
            co_instructor_ids=list(d.get("coInstructorIds", [])),
        )

    async def import_course_from_scorm(
        self,
        scorm_object_key: str,
        course_id: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[Course | None, LearningItem | None]:
        """Import course structure (Level 1) or static SCORM package item (Level 2)."""
        import io
        import json
        import zipfile
        from sqlalchemy import text

        s3 = get_s3_storage_service()
        try:
            file_bytes = await s3.download_file(scorm_object_key)
        except Exception as e:
            raise ValueError(f"Không thể tải tệp tin SCORM từ storage: {str(e)}")

        zip_buffer = io.BytesIO(file_bytes)

        with zipfile.ZipFile(zip_buffer) as z:
            namelist = z.namelist()
            metadata_file = next(
                (f for f in namelist if f.endswith("openlms-course.json")), None
            )

            # ----------------------------------------------------
            # Level 1: Full Native Course Restore
            # ----------------------------------------------------
            if metadata_file:
                metadata_content = z.read(metadata_file).decode("utf-8")
                metadata = json.loads(metadata_content)
                course_dict = metadata["course"]

                async with async_session_scope() as session:
                    repo = self.repo_factory(session)
                    await self._verify_ownership(
                        repo, course_id, current_user, "import SCORM"
                    )

                    existing = await repo.get_course_detail(course_id)
                    if not existing:
                        raise ValueError("Không tìm thấy khóa học đích để ghi đè.")

                    # 1. Truncate existing outline completely
                    # Wait, repository has delete_course_outline_content or similar?
                    # Let's delete outline manually using SQL to be absolutely robust and clean
                    await session.execute(
                        text("DELETE FROM week_modules WHERE course_id = :course_id"),
                        {"course_id": course_id},
                    )
                    await session.commit()

                    # 2. Iterate and restore week modules, lessons, and items
                    for wm_dict in course_dict.get("weekModules", []):
                        wm = await repo.create_week_module(
                            course_id=course_id,
                            title=wm_dict.get("title", ""),
                            summary=wm_dict.get("summary", ""),
                        )
                        for lesson_dict in wm_dict.get("lessons", []):
                            lesson = await repo.create_lesson(
                                course_id=course_id,
                                week_module_id=wm.id,
                                title=lesson_dict.get("title", ""),
                                estimated_minutes=lesson_dict.get(
                                    "estimatedMinutes", 15
                                ),
                            )
                            for item_dict in lesson_dict.get("items", []):
                                # Skip importing item as nested SCORM if it is SCORM item itself to avoid loop
                                # Restoring all standard items natively
                                await repo.create_learning_item(
                                    course_id=course_id,
                                    lesson_id=lesson.id,
                                    title=item_dict.get("title", ""),
                                    item_type=item_dict.get("type", 1),
                                    estimated_minutes=item_dict.get(
                                        "estimatedMinutes", 10
                                    ),
                                    video_url=item_dict.get("videoUrl", ""),
                                    reading_markdown=item_dict.get(
                                        "readingMarkdown", ""
                                    ),
                                    vtt_subtitle_url=item_dict.get(
                                        "vttSubtitleUrl", ""
                                    ),
                                    auto_transcribe=item_dict.get(
                                        "autoTranscribe", False
                                    ),
                                    in_video_quizzes=item_dict.get(
                                        "inVideoQuizzes", []
                                    ),
                                    starter_code=item_dict.get("starterCode", ""),
                                    test_cases_json=item_dict.get("testCasesJson", ""),
                                    language=item_dict.get("language", ""),
                                    rubric_criteria_json=item_dict.get(
                                        "rubricCriteriaJson", ""
                                    ),
                                    quiz_matrix_id=item_dict.get("quizMatrixId", ""),
                                )

                    refreshed = await repo.get_course_detail(course_id)
                    return refreshed, None

            # ----------------------------------------------------
            # Level 2: Standard SCORM Package (Single Learning Item) - REJECTED
            # ----------------------------------------------------
            manifest_file = next(
                (f for f in namelist if f.endswith("imsmanifest.xml")), None
            )
            if manifest_file:
                raise ValueError(
                    "Hệ thống chỉ hỗ trợ import gói SCORM Native định dạng khóa học (Level 1). Gói SCORM tương tác (Level 2) bị từ chối."
                )

            raise ValueError("Không tìm thấy tệp openlms-course.json hợp lệ trong ZIP.")

    async def _verify_course_owner_permission(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý người hợp tác",
    ) -> Course:
        if not user:
            raise PermissionError("Vui lòng đăng nhập để tiếp tục.")
        course = await repo.get_course_detail(course_id)
        if not course:
            raise ValueError(f"Không tìm thấy khóa học với ID '{course_id}'")
        if user.is_admin:
            return course
        if course.owner_id and user.id == course.owner_id:
            return course
        raise PermissionError(
            f"Bạn không có quyền {action_name} vì bạn không phải là Chủ sở hữu chính (Owner) của khóa học."
        )

    async def add_course_collaborator(
        self,
        course_id: str,
        email: str,
        role: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        from src.modules.identity.infrastructure.repository import IdentityRepository
        from datetime import datetime, timezone

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            identity_repo = IdentityRepository(session)

            await self._verify_course_owner_permission(
                repo, course_id, current_user, "thêm người hợp tác vào khóa học"
            )

            target_user = await identity_repo.get_by_email(email.strip())
            if not target_user:
                raise ValueError(f"Không tìm thấy người dùng với email '{email}'")

            clean_role = role.lower().strip()
            if clean_role not in ("co_instructor", "ta"):
                clean_role = "co_instructor"

            await repo.add_course_collaborator(course_id, target_user.id, clean_role)

            await repo.create_audit_log(
                course_id=course_id,
                actor_id=current_user.id if current_user else "system",
                target_user_id=target_user.id,
                action="COURSE_AUDIT_ACTION_COLLABORATOR_ADDED",
                details=f"Được thêm vào khóa học với vai trò {clean_role.upper()}",
            )

            collabs = await repo.list_course_collaborators_with_details(course_id)
            updated_course = await repo.get_course_detail(course_id)
            co_instructor_ids = (
                updated_course.co_instructor_ids if updated_course else []
            )

            for c in collabs:
                if c["user_id"] == target_user.id:
                    return {
                        "collaborator": c,
                        "co_instructor_ids": co_instructor_ids,
                    }

            return {
                "collaborator": {
                    "collaborator_id": f"collab_{uuid.uuid4().hex[:12]}",
                    "user_id": target_user.id,
                    "email": target_user.email,
                    "full_name": target_user.full_name,
                    "avatar_url": target_user.avatar_url or "",
                    "role": clean_role,
                    "added_at": datetime.now(timezone.utc).isoformat(),
                },
                "co_instructor_ids": co_instructor_ids,
            }

    async def list_course_collaborators(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xem danh sách người hợp tác khóa học"
            )
            return await repo.list_course_collaborators_with_details(course_id)

    async def remove_course_collaborator(
        self,
        course_id: str,
        user_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xóa người hợp tác khỏi khóa học"
            )
            is_self = current_user and current_user.id == user_id
            actor_id = current_user.id if current_user else "system"
            if is_self:
                action_str = "COURSE_AUDIT_ACTION_COLLABORATOR_REMOVED"
                details_str = "Thành viên tự rút tên khỏi khóa học"
            else:
                action_str = "COURSE_AUDIT_ACTION_COLLABORATOR_REMOVED"
                actor_name = (
                    current_user.full_name or current_user.email
                    if current_user
                    else "Quản trị viên"
                )
                details_str = f"Bị loại bỏ khỏi khóa học bởi {actor_name}"

            success = await repo.remove_course_collaborator(course_id, user_id)
            if success:
                await repo.create_audit_log(
                    course_id=course_id,
                    actor_id=actor_id,
                    target_user_id=user_id,
                    action=action_str,
                    details=details_str,
                )

            updated_course = await repo.get_course_detail(course_id)
            co_instructor_ids = (
                updated_course.co_instructor_ids if updated_course else []
            )
            return {"success": success, "co_instructor_ids": co_instructor_ids}

    async def list_course_audit_logs(
        self, course_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_course_owner_permission(
                repo, course_id, current_user, "xem nhật ký lịch sử khóa học"
            )
            return await repo.list_audit_logs(course_id)
