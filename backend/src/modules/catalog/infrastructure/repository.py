from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    InVideoQuizModel,
    InteractiveTranscriptModel,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)


def _model_to_domain_course(model: CourseModel) -> Course:
    week_modules: list[WeekModule] = []
    for wm in model.week_modules or []:
        lessons: list[Lesson] = []
        for l_model in wm.lessons or []:
            items: list[LearningItem] = []
            for i_model in l_model.items or []:
                transcripts = [
                    InteractiveTranscript(
                        timestamp_seconds=t.timestamp_seconds, text=t.text
                    )
                    for t in i_model.interactive_transcripts or []
                ]
                quizzes = [
                    InVideoQuiz(
                        timestamp_seconds=q.timestamp_seconds,
                        question=q.question,
                        options=q.options,
                        correct_option_index=q.correct_option_index,
                        explanation=q.explanation,
                    )
                    for q in i_model.in_video_quizzes or []
                ]
                items.append(
                    LearningItem(
                        id=i_model.id,
                        title=i_model.title,
                        type=i_model.type,
                        estimated_minutes=i_model.estimated_minutes,
                        video_url=i_model.video_url,
                        vtt_subtitle_url=i_model.vtt_subtitle_url,
                        interactive_transcripts=transcripts,
                        in_video_quizzes=quizzes,
                        reading_markdown=i_model.reading_markdown,
                    )
                )
            lessons.append(
                Lesson(
                    id=l_model.id,
                    title=l_model.title,
                    estimated_minutes=l_model.estimated_minutes,
                    items=items,
                )
            )
        week_modules.append(
            WeekModule(
                id=wm.id,
                week_number=wm.week_number,
                title=wm.title,
                summary=wm.summary,
                lessons=lessons,
            )
        )

    return Course(
        id=model.id,
        title=model.title,
        slug=model.slug,
        description=model.description,
        partner_name=model.partner_name,
        partner_logo_url=model.partner_logo_url,
        instructor_names=model.instructor_names,
        week_modules=week_modules,
    )


def _model_to_domain_specialization(
    model: SpecializationModel,
) -> Specialization:
    return Specialization(
        id=model.id,
        title=model.title,
        description=model.description,
        partner_name=model.partner_name,
        partner_logo_url=model.partner_logo_url,
        course_ids=model.course_ids,
    )


class SQLAlchemyCatalogRepository(ICatalogRepository):
    """Async SQLAlchemy Database Repository implementing ICatalogRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def seed_if_empty(self) -> None:
        """Seed initial demonstration course catalog if table is empty."""
        stmt = select(CourseModel).limit(1)
        res = await self.session.execute(stmt)
        sample_url = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"

        if res.scalar_one_or_none() is not None:
            # Update legacy sample video URL to high-reliability HTTPS MDN MP4 stream
            await self.session.execute(
                update(LearningItemModel)
                .where(LearningItemModel.id == "item-ml-intro-video")
                .values(video_url=sample_url)
            )
            await self.session.commit()
            return

        course1 = CourseModel(
            id="course-python-ai",
            title="Supervised Machine Learning: Regression and Classification",
            slug="supervised-machine-learning",
            description="Build machine learning models in Python using NumPy and scikit-learn, train supervised models for prediction and binary classification.",
            partner_name="DeepLearning.AI",
            partner_logo_url="https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/partner_logos/deeplearningai.png",
            instructor_names=["Andrew Ng", "Eddy Shyu"],
        )

        week1 = WeekModuleModel(
            id="week-1-ml",
            course_id=course1.id,
            week_number=1,
            title="Week 1: Introduction to Machine Learning & Regression",
            summary="Learn the core concepts of supervised learning and implement your first linear regression model.",
        )

        lesson1 = LessonModel(
            id="lesson-linear-regression",
            week_module_id=week1.id,
            title="Lesson 1: Linear Regression with One Variable",
            estimated_minutes=37,
        )

        item1 = LearningItemModel(
            id="item-ml-intro-video",
            lesson_id=lesson1.id,
            title="Lecture: Introduction to Linear Regression & Cost Function",
            type=ItemType.VIDEO,
            estimated_minutes=12,
            video_url=sample_url,
            vtt_subtitle_url="",
        )

        t1 = InteractiveTranscriptModel(
            timestamp_seconds=0,
            text="Welcome to Supervised Machine Learning! In this lesson, we will cover linear regression.",
        )
        t2 = InteractiveTranscriptModel(
            timestamp_seconds=5,
            text="Linear regression fits a straight line through dataset points to predict continuous numerical values.",
        )
        t3 = InteractiveTranscriptModel(
            timestamp_seconds=10,
            text="Let's look at the cost function, often represented as Mean Squared Error (MSE).",
        )
        t4 = InteractiveTranscriptModel(
            timestamp_seconds=15,
            text="Gradient descent updates model parameters iteratively until minimum cost is reached.",
        )

        q1 = InVideoQuizModel(
            timestamp_seconds=10,
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

        item1.interactive_transcripts.extend([t1, t2, t3, t4])
        item1.in_video_quizzes.append(q1)

        item2 = LearningItemModel(
            id="item-ml-reading-1",
            lesson_id=lesson1.id,
            title="Reading: Math Foundations of Gradient Descent",
            type=ItemType.READING,
            estimated_minutes=15,
            reading_markdown="# Math Foundations of Gradient Descent\n\nGradient descent is an optimization algorithm used to minimize cost functions in machine learning models.\n\n## Key Concepts\n- **Learning Rate (alpha)**: Controls the step size at each iteration.\n- **Loss Function**: Measures the prediction error.\n\n> *Tip: Choosing an appropriate learning rate is crucial for convergence.*",
        )

        lesson1.items.extend([item1, item2])
        week1.lessons.append(lesson1)
        course1.week_modules.append(week1)

        course2 = CourseModel(
            id="course-web-dev",
            title="Modern Fullstack Web Development with Next.js & ConnectRPC",
            slug="modern-fullstack-web-dev",
            description="Master modern Web Development using Next.js 15 App Router, TypeScript, ConnectRPC gRPC web, and Tailwind CSS v4.",
            partner_name="Meta",
            partner_logo_url="https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/partner_logos/meta.png",
            instructor_names=["Jane Doe"],
        )

        spec = SpecializationModel(
            id="spec-ai-eng",
            title="Machine Learning Specialization",
            description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
            partner_name="DeepLearning.AI",
            course_ids=[course1.id, course2.id],
        )

        self.session.add_all([course1, course2, spec])
        await self.session.commit()

    async def list_courses(
        self, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[Course], str]:
        stmt = select(CourseModel).options(
            selectinload(CourseModel.week_modules)
            .selectinload(WeekModuleModel.lessons)
            .selectinload(LessonModel.items)
            .selectinload(LearningItemModel.interactive_transcripts),
            selectinload(CourseModel.week_modules)
            .selectinload(WeekModuleModel.lessons)
            .selectinload(LessonModel.items)
            .selectinload(LearningItemModel.in_video_quizzes),
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_model_to_domain_course(m) for m in models], ""

    async def get_course_detail(self, course_id: str) -> Course | None:
        stmt = (
            select(CourseModel)
            .where(CourseModel.id == course_id)
            .options(
                selectinload(CourseModel.week_modules)
                .selectinload(WeekModuleModel.lessons)
                .selectinload(LessonModel.items)
                .selectinload(LearningItemModel.interactive_transcripts),
                selectinload(CourseModel.week_modules)
                .selectinload(WeekModuleModel.lessons)
                .selectinload(LessonModel.items)
                .selectinload(LearningItemModel.in_video_quizzes),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return _model_to_domain_course(model)

    async def get_lesson_detail(
        self, course_id: str, lesson_id: str
    ) -> Lesson | None:
        course = await self.get_course_detail(course_id)
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
        stmt = select(SpecializationModel).where(
            SpecializationModel.id == specialization_id
        )
        res = await self.session.execute(stmt)
        spec_model = res.scalar_one_or_none()
        if not spec_model:
            return None, []
        courses: list[Course] = []
        for cid in spec_model.course_ids:
            c = await self.get_course_detail(cid)
            if c:
                courses.append(c)
        return _model_to_domain_specialization(spec_model), courses
