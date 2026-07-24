from dataclasses import dataclass
from enum import Enum
from src.shared.domain.base import Entity, ValueObject


class ItemType(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    VIDEO = "VIDEO"
    READING = "READING"
    PRACTICE_QUIZ = "PRACTICE_QUIZ"
    GRADED_QUIZ = "GRADED_QUIZ"
    AUTO_GRADED_LAB = "AUTO_GRADED_LAB"
    PEER_REVIEW = "PEER_REVIEW"


@dataclass(frozen=True)
class InteractiveTranscript(ValueObject):
    timestamp_seconds: int
    text: str


@dataclass(frozen=True)
class InVideoQuiz(ValueObject):
    timestamp_seconds: int
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str


class LearningItem(Entity):
    def __init__(
        self,
        id: str,
        title: str,
        type: ItemType,
        estimated_minutes: int = 10,
        video_url: str = "",
        vtt_subtitle_url: str = "",
        interactive_transcripts: list[InteractiveTranscript] | None = None,
        in_video_quizzes: list[InVideoQuiz] | None = None,
        reading_markdown: str = "",
    ) -> None:
        super().__init__(id=id)
        self.title = title
        self.type = type
        self.estimated_minutes = estimated_minutes
        self.video_url = video_url
        self.vtt_subtitle_url = vtt_subtitle_url
        self.interactive_transcripts = interactive_transcripts or []
        self.in_video_quizzes = in_video_quizzes or []
        self.reading_markdown = reading_markdown


class Lesson(Entity):
    def __init__(
        self,
        id: str,
        title: str,
        estimated_minutes: int = 30,
        items: list[LearningItem] | None = None,
    ) -> None:
        super().__init__(id=id)
        self.title = title
        self.estimated_minutes = estimated_minutes
        self.items = items or []


class WeekModule(Entity):
    def __init__(
        self,
        id: str,
        week_number: int,
        title: str,
        summary: str = "",
        lessons: list[Lesson] | None = None,
    ) -> None:
        super().__init__(id=id)
        self.week_number = week_number
        self.title = title
        self.summary = summary
        self.lessons = lessons or []


class CourseReview(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str = "",
        created_at: str = "",
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.user_name = user_name
        self.course_id = course_id
        self.rating_stars = rating_stars
        self.comment_text = comment_text
        self.created_at = created_at


class Course(Entity):
    def __init__(
        self,
        id: str,
        title: str,
        slug: str,
        description: str = "",
        partner_name: str = "DeepLearning.AI",
        partner_logo_url: str = "",
        instructor_names: list[str] | None = None,
        week_modules: list[WeekModule] | None = None,
        average_rating: float = 0.0,
        review_count: int = 0,
    ) -> None:
        super().__init__(id=id)
        self.title = title
        self.slug = slug
        self.description = description
        self.partner_name = partner_name
        self.partner_logo_url = partner_logo_url
        self.instructor_names = instructor_names or []
        self.week_modules = week_modules or []
        self.average_rating = average_rating
        self.review_count = review_count


class Specialization(Entity):
    def __init__(
        self,
        id: str,
        title: str,
        description: str = "",
        partner_name: str = "DeepLearning.AI",
        partner_logo_url: str = "",
        course_ids: list[str] | None = None,
    ) -> None:
        super().__init__(id=id)
        self.title = title
        self.description = description
        self.partner_name = partner_name
        self.partner_logo_url = partner_logo_url
        self.course_ids = course_ids or []
