from abc import ABC, abstractmethod

from src.modules.catalog.domain.entities import (
    Category,
    Course,
    CourseReview,
    LearningItem,
    Lesson,
    Specialization,
    WeekModule,
)


class ICatalogRepository(ABC):
    """Abstract Repository Interface for Catalog Domain (DIP)."""

    @abstractmethod
    async def list_courses(
        self,
        page_size: int = 10,
        page_token: str = "",
        search_query: str = "",
        subject: str = "",
        level: str = "",
        sort_by: str = "",
    ) -> tuple[list[Course], str]:
        pass

    @abstractmethod
    async def get_course_detail(self, course_id: str) -> Course | None:
        pass

    @abstractmethod
    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        pass

    @abstractmethod
    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        pass

    @abstractmethod
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
    ) -> Course:
        pass

    @abstractmethod
    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
        is_verified_completer: bool,
    ) -> CourseReview:
        pass

    @abstractmethod
    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[CourseReview], float, int, str]:
        pass

    @abstractmethod
    async def get_course_rating_stats(self, course_id: str) -> tuple[float, int]:
        pass

    @abstractmethod
    async def get_course_id_by_slug_or_id(
        self, course_id_or_slug: str
    ) -> tuple[str, list[str]]:
        pass

    @abstractmethod
    async def list_categories(self, type_filter: str = "") -> list[Category]:
        pass

    @abstractmethod
    async def create_category(self, name: str, category_type: str) -> Category:
        pass

    @abstractmethod
    async def delete_category(self, category_id: str) -> bool:
        pass

