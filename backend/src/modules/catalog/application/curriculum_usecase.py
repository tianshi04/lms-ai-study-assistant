import logging
from collections.abc import Callable
from typing import Any

from uuid6 import uuid7

from src.modules.catalog.domain import (
    CourseStatus,
    ICatalogRepository,
    ItemType,
    Lesson,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from src.shared.permissions import (
    CoursePermission,
    enforce_course_ownership,
)

logger = logging.getLogger(__name__)


class CurriculumUseCase:
    """Application Use Case for WeekModule, Lesson, LearningItem management, and Media storage."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
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
                if (
                    disallow_published_mutation
                    and course.status == CourseStatus.PUBLISHED
                    and not getattr(user, "is_admin", False)
                ):
                    raise PermissionError(
                        f"Không thể {action_name} này vì khóa học đã được xuất bản (PUBLISHED)."
                    )

    # -------------------------------------------------------------------------
    # Week Modules
    # -------------------------------------------------------------------------

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

    async def update_week_module(
        self,
        module_id: str,
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
                module_id=module_id,
                course_id=course_id,
                title=title,
                summary=summary,
            )

    async def delete_week_module(
        self, module_id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "xóa tuần học",
                disallow_published_mutation=True,
            )
            return await repo.delete_week_module(
                module_id=module_id, course_id=course_id
            )

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

    # -------------------------------------------------------------------------
    # Lessons
    # -------------------------------------------------------------------------

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

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_lesson_detail(course_id, lesson_id)

    async def update_lesson(
        self,
        lesson_id: str,
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
                lesson_id=lesson_id,
                course_id=course_id,
                week_module_id=week_module_id,
                title=title,
                estimated_minutes=estimated_minutes,
            )

    async def delete_lesson(
        self, lesson_id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "xóa bài học",
                disallow_published_mutation=True,
            )
            return await repo.delete_lesson(lesson_id=lesson_id, course_id=course_id)

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

    # -------------------------------------------------------------------------
    # Learning Items
    # -------------------------------------------------------------------------

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

    async def update_learning_item(
        self,
        item_id: str,
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
                item_id=item_id,
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
        self, item_id: str, course_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            await self._verify_ownership(
                repo,
                course_id,
                current_user,
                "xóa học liệu",
                disallow_published_mutation=True,
            )
            return await repo.delete_learning_item(item_id=item_id, course_id=course_id)

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

    # -------------------------------------------------------------------------
    # Media & Storage
    # -------------------------------------------------------------------------

    async def generate_upload_url(
        self, filename: str, content_type: str, folder: str = "videos"
    ) -> tuple[str, str, str]:
        """Generate presigned upload URL and public file access URL for MinIO/S3."""

        s3 = get_s3_storage_service()
        await s3.ensure_bucket_exists()
        ext = filename.split(".")[-1] if "." in filename else "bin"
        safe_folder = folder.strip("/") if folder else "videos"
        object_key = f"{safe_folder}/{uuid7().hex[:12]}.{ext}"

        upload_url = await s3.generate_presigned_upload_url(
            object_key, content_type=content_type or "application/octet-stream"
        )
        file_url = s3.to_public_url(f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}")
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
        object_key = f"{safe_folder}/{uuid7().hex[:12]}.{ext}"

        await s3.upload_file(
            file_bytes=file_bytes,
            object_key=object_key,
            content_type=content_type or "application/octet-stream",
        )
        file_url = s3.to_public_url(f"{s3.endpoint_url}/{s3.bucket_name}/{object_key}")
        return file_url, object_key
