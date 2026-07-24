from typing import Any, Callable

from src.modules.catalog.domain.entities import Course, Lesson, Specialization
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
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
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            seed_fn = getattr(repo, "seed_if_empty", None)
            if callable(seed_fn):
                await seed_fn()
            return await repo.list_courses(page_size, page_token)

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
            )

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
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
    ):
        if rating_stars < 1 or rating_stars > 5:
            raise ValueError("Rating stars must be between 1 and 5.")

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.submit_course_review(
                user_id=user_id,
                user_name=user_name,
                course_id=course_id,
                rating_stars=rating_stars,
                comment_text=comment_text,
            )

    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ):
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_reviews(
                course_id=course_id, page_size=page_size, page_token=page_token
            )
