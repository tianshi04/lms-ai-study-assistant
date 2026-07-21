from src.modules.catalog.domain.entities import (
    Course,
    InVideoQuiz,
    InteractiveTranscript,
    ItemType,
    LearningItem,
    Lesson,
    Specialization,
    WeekModule,
)


class CatalogUseCase:
    """Application Use Case coordinator for Catalog domain."""

    def __init__(self) -> None:
        self._courses: dict[str, Course] = {}
        self._specializations: dict[str, Specialization] = {}
        self._seed_data()

    def _seed_data(self) -> None:
        # Seed Course 1: Python AI & Machine Learning Specialization Course
        transcript_item1 = [
            InteractiveTranscript(
                timestamp_seconds=0,
                text="Welcome to Supervised Machine Learning! In this lesson, we will cover linear regression.",
            ),
            InteractiveTranscript(
                timestamp_seconds=15,
                text="Linear regression fits a straight line through dataset points to predict continuous numerical values.",
            ),
            InteractiveTranscript(
                timestamp_seconds=35,
                text="Let's look at the cost function, often represented as Mean Squared Error (MSE).",
            ),
            InteractiveTranscript(
                timestamp_seconds=60,
                text="Gradient descent updates model parameters iteratively until minimum cost is reached.",
            ),
            InteractiveTranscript(
                timestamp_seconds=90,
                text="Congratulations! You now understand the basic principle of training linear regression models.",
            ),
        ]

        quiz_item1 = [
            InVideoQuiz(
                timestamp_seconds=35,
                question="What cost function is commonly used for Linear Regression?",
                options=[
                    "Cross-Entropy Loss",
                    "Mean Squared Error (MSE)",
                    "Hinge Loss",
                    "Kullback-Leibler Divergence",
                ],
                correct_option_index=1,
                explanation="Mean Squared Error (MSE) measures the average squared difference between estimated values and actual values.",
            )
        ]

        item1 = LearningItem(
            id="item-ml-intro-video",
            title="Lecture: Introduction to Linear Regression & Cost Function",
            type=ItemType.VIDEO,
            estimated_minutes=12,
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            vtt_subtitle_url="",
            interactive_transcripts=transcript_item1,
            in_video_quizzes=quiz_item1,
        )

        item2 = LearningItem(
            id="item-ml-reading-1",
            title="Reading: Math Foundations of Gradient Descent",
            type=ItemType.READING,
            estimated_minutes=15,
            reading_markdown="""# Math Foundations of Gradient Descent

Gradient descent is an optimization algorithm used to minimize cost functions in machine learning models.

### Key Equations:
$$\\theta_j := \\theta_j - \\alpha \\frac{\\partial}{\\partial \\theta_j} J(\\theta_0, \\theta_1)$$

- **$\\alpha$**: Learning rate (controls step size).
- **$J(\\theta)$**: Cost function value.

### Important Considerations:
1. If the learning rate $\\alpha$ is too small, gradient descent will be slow.
2. If $\\alpha$ is too large, gradient descent can overshoot the minimum and fail to converge.
""",
        )

        item3 = LearningItem(
            id="item-ml-practice-quiz",
            title="Practice Quiz: Linear Regression Fundamentals",
            type=ItemType.PRACTICE_QUIZ,
            estimated_minutes=10,
        )

        lesson1 = Lesson(
            id="lesson-linear-regression",
            title="Lesson 1: Linear Regression with One Variable",
            estimated_minutes=37,
            items=[item1, item2, item3],
        )

        week1 = WeekModule(
            id="week-1-ml",
            week_number=1,
            title="Week 1: Introduction to Machine Learning & Regression",
            summary="Learn the core concepts of supervised learning and implement your first linear regression model.",
            lessons=[lesson1],
        )

        course1 = Course(
            id="course-python-ai",
            title="Supervised Machine Learning: Regression and Classification",
            slug="supervised-machine-learning",
            description="Build machine learning models in Python using NumPy and scikit-learn, train supervised models for prediction and binary classification.",
            partner_name="DeepLearning.AI",
            partner_logo_url="https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/partner_logos/deeplearningai.png",
            instructor_names=["Andrew Ng", "Eddy Shyu"],
            week_modules=[week1],
        )

        # Seed Course 2: Web Development with Next.js & ConnectRPC
        course2 = Course(
            id="course-web-dev",
            title="Modern Fullstack Web Development with Next.js & ConnectRPC",
            slug="modern-fullstack-web-dev",
            description="Master modern Web Development using Next.js 15 App Router, TypeScript, ConnectRPC gRPC web, and Tailwind CSS v4.",
            partner_name="Meta",
            partner_logo_url="https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/partner_logos/meta.png",
            instructor_names=["Jane Doe"],
            week_modules=[],
        )

        self._courses[course1.id] = course1
        self._courses[course2.id] = course2

        spec = Specialization(
            id="spec-ai-eng",
            title="Machine Learning Specialization",
            description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
            partner_name="DeepLearning.AI",
            course_ids=[course1.id, course2.id],
        )
        self._specializations[spec.id] = spec

    async def list_courses(
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        courses = list(self._courses.values())
        return courses, ""

    async def get_course_detail(self, course_id: str) -> Course | None:
        return self._courses.get(course_id)

    async def get_lesson_detail(
        self, course_id: str, lesson_id: str
    ) -> Lesson | None:
        course = self._courses.get(course_id)
        if not course:
            return None
        for week in course.week_modules:
            for lesson in week.lessons:
                if lesson.id == lesson_id:
                    return lesson
        return None

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        spec = self._specializations.get(specialization_id)
        if not spec:
            return None, []
        courses = [
            self._courses[cid] for cid in spec.course_ids if cid in self._courses
        ]
        return spec, courses
