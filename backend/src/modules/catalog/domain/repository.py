from abc import ABC, abstractmethod

from src.modules.catalog.domain.entities import Course, Lesson, Specialization


class ICatalogRepository(ABC):
    """Abstract Repository Interface for Catalog Domain (DIP)."""

    @abstractmethod
    async def list_courses(
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        pass

    @abstractmethod
    async def get_course_detail(self, course_id: str) -> Course | None:
        pass

    @abstractmethod
    async def get_lesson_detail(
        self, course_id: str, lesson_id: str
    ) -> Lesson | None:
        pass

    @abstractmethod
    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        pass
