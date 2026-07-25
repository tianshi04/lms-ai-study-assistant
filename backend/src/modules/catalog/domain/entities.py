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
class Category(ValueObject):
    id: str
    name: str
    slug: str
    type: str
    created_at: str


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
        order_index: int = 0,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        scorm_package_path: str = "",
        scorm_entry_html: str = "",
        auto_transcribe: bool = False,
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
        self.order_index = order_index
        self.starter_code = starter_code
        self.test_cases_json = test_cases_json
        self.language = language
        self.rubric_criteria_json = rubric_criteria_json
        self.quiz_matrix_id = quiz_matrix_id
        self.scorm_package_path = scorm_package_path
        self.scorm_entry_html = scorm_entry_html
        self.auto_transcribe = auto_transcribe


class Lesson(Entity):
    def __init__(
        self,
        id: str,
        title: str,
        estimated_minutes: int = 30,
        items: list[LearningItem] | None = None,
        order_index: int = 0,
    ) -> None:
        super().__init__(id=id)
        self.title = title
        self.estimated_minutes = estimated_minutes
        self.items = items or []
        self.order_index = order_index


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
        is_verified_completer: bool = False,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.user_name = user_name
        self.course_id = course_id
        self.rating_stars = rating_stars
        self.comment_text = comment_text
        self.created_at = created_at
        self.is_verified_completer = is_verified_completer


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
        subject: str = "",
        level: str = "",
        owner_id: str = "",
        co_instructor_ids: list[str] | None = None,
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
        self.subject = subject
        self.level = level
        self.owner_id = owner_id
        self.co_instructor_ids = co_instructor_ids or []


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


class CourseAnnouncement(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        author_id: str,
        author_name: str,
        title: str,
        content: str,
        created_at: str = "",
    ) -> None:
        super().__init__(id=id)
        self.course_id = course_id
        self.author_id = author_id
        self.author_name = author_name
        self.title = title
        self.content = content
        self.created_at = created_at


@dataclass(frozen=True)
class EnrolledStudent(ValueObject):
    user_id: str
    user_name: str
    user_email: str
    progress_percent: float
    enrolled_at: str


class InstructorAnalytics(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        total_enrolled_students: int = 0,
        average_completion_rate: float = 0.0,
        average_rating: float = 0.0,
        review_count: int = 0,
        students: list[EnrolledStudent] | None = None,
    ) -> None:
        super().__init__(id=id)
        self.course_id = course_id
        self.total_enrolled_students = total_enrolled_students
        self.average_completion_rate = average_completion_rate
        self.average_rating = average_rating
        self.review_count = review_count
        self.students = students or []
