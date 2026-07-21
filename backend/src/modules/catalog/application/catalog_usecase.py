from src.modules.catalog.domain.entities import Course, Lesson, Specialization
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.shared.infrastructure.database import async_session_scope


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain backed by SQLAlchemy Database Repositories."""

    async def list_courses(
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await repo.seed_if_empty()
            return await repo.list_courses()

    async def get_course_detail(self, course_id: str) -> Course | None:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await repo.seed_if_empty()
            return await repo.get_course_detail(course_id)

    async def get_lesson_detail(
        self, course_id: str, lesson_id: str
    ) -> Lesson | None:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await repo.seed_if_empty()
            return await repo.get_lesson_detail(course_id, lesson_id)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        async with async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            await repo.seed_if_empty()
            return await repo.get_specialization(specialization_id)
