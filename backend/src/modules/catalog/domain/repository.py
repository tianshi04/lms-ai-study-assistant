from abc import ABC, abstractmethod

from src.modules.catalog.domain.entities import (
    Course,
    CourseAnnouncement,
    CourseReview,
    InstructorAnalytics,
    Lesson,
    Specialization,
)


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
    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        pass

    @abstractmethod
    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
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
    async def delete_course(self, course_id: str) -> bool:
        pass

    @abstractmethod
    async def update_week_module(
        self, id: str, course_id: str, week_number: int, title: str, summary: str
    ):
        pass

    @abstractmethod
    async def delete_week_module(self, id: str, course_id: str) -> bool:
        pass

    @abstractmethod
    async def update_lesson(
        self,
        id: str,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
    ):
        pass

    @abstractmethod
    async def delete_lesson(self, id: str, course_id: str) -> bool:
        pass

    @abstractmethod
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
        in_video_quizzes: list | None = None,
    ):
        pass

    @abstractmethod
    async def delete_learning_item(self, id: str, course_id: str) -> bool:
        pass

    @abstractmethod
    async def create_course_announcement(
        self, course_id: str, author_id: str, author_name: str, title: str, content: str
    ) -> CourseAnnouncement:
        pass

    @abstractmethod
    async def list_course_announcements(
        self, course_id: str
    ) -> list[CourseAnnouncement]:
        pass

    @abstractmethod
    async def get_instructor_analytics(self, course_id: str) -> InstructorAnalytics:
        pass

    @abstractmethod
    async def reorder_week_modules(
        self, course_id: str, ordered_week_module_ids: list[str]
    ) -> bool:
        pass

    @abstractmethod
    async def reorder_lessons(
        self, course_id: str, week_module_id: str, ordered_lesson_ids: list[str]
    ) -> bool:
        pass

    @abstractmethod
    async def reorder_learning_items(
        self, course_id: str, lesson_id: str, ordered_item_ids: list[str]
    ) -> bool:
        pass
