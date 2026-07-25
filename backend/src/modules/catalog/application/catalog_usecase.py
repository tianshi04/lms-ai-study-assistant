import html
from typing import Any, Callable

from src.modules.catalog.domain.entities import Course, Lesson, Specialization
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.shared.infrastructure.database import async_session_scope


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain using Dependency Inversion (ICatalogRepository interface)."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )

    async def list_courses(
        self,
        page_size: int = 10,
        page_token: str = "",
        search_query: str = "",
        subject: str = "",
        level: str = "",
        sort_by: str = "",
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.list_courses(
                page_size, page_token, search_query, subject, level, sort_by
            )

    async def get_course_detail(self, course_id: str) -> Course | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_course_detail(course_id)

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_lesson_detail(course_id, lesson_id)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.get_specialization(specialization_id)

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "COURSE_SUBJECT_UNSPECIFIED",
        level: str = "COURSE_LEVEL_UNSPECIFIED",
    ) -> Course:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_course(
                title=title,
                slug=slug,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
            )

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
        subject: str = "COURSE_SUBJECT_UNSPECIFIED",
        level: str = "COURSE_LEVEL_UNSPECIFIED",
    ) -> Course | None:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.update_course(
                course_id=course_id,
                title=title,
                description=description,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                instructor_names=instructor_names,
                subject=subject,
                level=level,
            )

    async def create_week_module(
        self, course_id: str, week_number: int, title: str, summary: str
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_week_module(
                course_id=course_id,
                week_number=week_number,
                title=title,
                summary=summary,
            )

    async def create_lesson(
        self, course_id: str, week_module_id: str, title: str, estimated_minutes: int
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
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
        item_type: int,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
    ):
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            return await repo.create_learning_item(
                course_id=course_id,
                lesson_id=lesson_id,
                title=title,
                item_type=item_type,
                estimated_minutes=estimated_minutes,
                video_url=video_url,
                reading_markdown=reading_markdown,
            )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
        user_role: str = "",
    ):
        if rating_stars < 1 or rating_stars > 5:
            raise ValueError("Rating stars must be between 1 and 5.")

        # BR_REVIEW_003: Fail-fast 2000 char validation and safe Stored XSS sanitization
        trimmed_comment = comment_text.strip()
        if len(trimmed_comment) > 2000:
            raise ValueError(
                "Văn bản nhận xét không được vượt quá 2000 ký tự (BR_REVIEW_003)."
            )
        clean_comment = html.escape(trimmed_comment)

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id, instructor_names = await repo.get_course_id_by_slug_or_id(
                course_id
            )

            # BR_REVIEW_004: Check if user is instructor or TA of the course
            is_instructor_role = any(
                r in user_role.lower() for r in ["instructor", "ta"]
            )
            is_instructor_id_or_name = user_id.startswith("inst_") or (
                instructor_names and user_name in instructor_names
            )
            if is_instructor_role or is_instructor_id_or_name:
                raise ValueError(
                    "Giảng viên không được phép tự gửi đánh giá cho khóa học của mình (BR_REVIEW_004)."
                )

            # BR_REVIEW_001: Check if user completed at least 50% of the course via Learning domain
            learning_repo = SQLAlchemyLearningRepository(session)
            progress = await learning_repo.get_progress(user_id, real_course_id)

            if not progress or progress.overall_progress_percent < 50.0:
                raise ValueError(
                    "Chỉ học viên hoàn thành tối thiểu 50% tiến độ khóa học mới có quyền gửi đánh giá (BR_REVIEW_001)."
                )

            is_verified_completer = progress.overall_progress_percent >= 100.0

            return await repo.submit_course_review(
                user_id=user_id,
                user_name=user_name,
                course_id=real_course_id,
                rating_stars=rating_stars,
                comment_text=clean_comment,
                is_verified_completer=is_verified_completer,
            )

    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            real_course_id, _ = await repo.get_course_id_by_slug_or_id(course_id)

            return await repo.list_course_reviews(
                course_id=real_course_id, page_size=page_size, page_token=page_token
            )
