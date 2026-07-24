import uuid
from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.catalog.domain.entities import (
    Course,
    CourseReview,
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
    CourseReviewModel,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)


def _model_to_domain_course(
    model: CourseModel, avg_rating: float = 0.0, review_count: int = 0
) -> Course:
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
        average_rating=avg_rating,
        review_count=review_count,
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


def _model_to_domain_review(model: CourseReviewModel) -> CourseReview:
    return CourseReview(
        id=model.id,
        user_id=model.user_id,
        user_name=model.user_name,
        course_id=model.course_id,
        rating_stars=model.rating_stars,
        comment_text=model.comment_text,
        created_at=model.created_at,
    )


class SQLAlchemyCatalogRepository(ICatalogRepository):
    """Async SQLAlchemy Database Repository implementing ICatalogRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

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
        courses: list[Course] = []
        for m in models:
            avg_rating, review_count = await self.get_course_rating_stats(m.id)
            courses.append(_model_to_domain_course(m, avg_rating, review_count))
        return courses, ""

    async def get_course_detail(self, course_id: str) -> Course | None:
        stmt = (
            select(CourseModel)
            .where((CourseModel.id == course_id) | (CourseModel.slug == course_id))
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
        avg_rating, review_count = await self.get_course_rating_stats(model.id)
        return _model_to_domain_course(model, avg_rating, review_count)

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
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

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
    ) -> Course:
        course_id = f"course-{slug}" if slug else f"course-{uuid.uuid4().hex[:8]}"
        model = CourseModel(
            id=course_id,
            title=title,
            slug=slug or course_id,
            description=description,
            partner_name=partner_name or "Coursera AI Partner",
            partner_logo_url=partner_logo_url
            or "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            instructor_names=instructor_names or ["Giảng viên AI"],
        )
        self.session.add(model)
        await self.session.commit()
        c_detail = await self.get_course_detail(course_id)
        return c_detail if c_detail else _model_to_domain_course(model)

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        instructor_names: list[str],
    ) -> Course | None:
        stmt = select(CourseModel).where(CourseModel.id == course_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        if title:
            model.title = title
        if description:
            model.description = description
        if partner_name:
            model.partner_name = partner_name
        if partner_logo_url:
            model.partner_logo_url = partner_logo_url
        if instructor_names:
            model.instructor_names = instructor_names
        await self.session.commit()
        return await self.get_course_detail(course_id)

    async def create_week_module(
        self, course_id: str, week_number: int, title: str, summary: str
    ) -> WeekModule:
        wm_id = f"week-{week_number}-{uuid.uuid4().hex[:6]}"
        wm_model = WeekModuleModel(
            id=wm_id,
            course_id=course_id,
            week_number=week_number,
            title=title,
            summary=summary,
        )
        self.session.add(wm_model)
        await self.session.commit()
        return WeekModule(
            id=wm_id,
            week_number=week_number,
            title=title,
            summary=summary,
            lessons=[],
        )

    async def create_lesson(
        self, course_id: str, week_module_id: str, title: str, estimated_minutes: int
    ) -> Lesson:
        l_id = f"lesson-{uuid.uuid4().hex[:8]}"
        l_model = LessonModel(
            id=l_id,
            week_module_id=week_module_id,
            title=title,
            estimated_minutes=estimated_minutes or 15,
        )
        self.session.add(l_model)
        await self.session.commit()
        return Lesson(
            id=l_id,
            title=title,
            estimated_minutes=estimated_minutes or 15,
            items=[],
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
    ) -> LearningItem:
        item_id = f"item-{uuid.uuid4().hex[:8]}"
        item_model = LearningItemModel(
            id=item_id,
            lesson_id=lesson_id,
            title=title,
            type=item_type,
            estimated_minutes=estimated_minutes or 10,
            video_url=video_url or "",
            vtt_subtitle_url="",
            reading_markdown=reading_markdown or "",
        )
        self.session.add(item_model)
        await self.session.commit()
        return LearningItem(
            id=item_id,
            title=title,
            type=ItemType(item_type),
            estimated_minutes=estimated_minutes or 10,
            video_url=video_url or "",
            vtt_subtitle_url="",
            interactive_transcripts=[],
            in_video_quizzes=[],
            reading_markdown=reading_markdown or "",
        )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
    ) -> CourseReview:
        stmt = select(CourseReviewModel).where(
            (CourseReviewModel.user_id == user_id)
            & (CourseReviewModel.course_id == course_id)
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        now_str = datetime.now(timezone.utc).isoformat()
        if existing:
            existing.rating_stars = rating_stars
            existing.comment_text = comment_text
            existing.user_name = user_name or existing.user_name
            existing.created_at = now_str
            await self.session.commit()
            return _model_to_domain_review(existing)

        review_id = f"rev-{uuid.uuid4().hex[:10]}"
        model = CourseReviewModel(
            id=review_id,
            user_id=user_id,
            user_name=user_name or "Học viên LMS",
            course_id=course_id,
            rating_stars=rating_stars,
            comment_text=comment_text,
            created_at=now_str,
        )
        self.session.add(model)
        await self.session.commit()
        return _model_to_domain_review(model)

    async def list_course_reviews(
        self, course_id: str, page_size: int = 10, page_token: str = ""
    ) -> tuple[list[CourseReview], float, int, str]:
        stmt = (
            select(CourseReviewModel)
            .where(CourseReviewModel.course_id == course_id)
            .order_by(CourseReviewModel.created_at.desc())
            .limit(page_size or 10)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        reviews = [_model_to_domain_review(m) for m in models]
        avg_rating, total_count = await self.get_course_rating_stats(course_id)
        return reviews, avg_rating, total_count, ""

    async def get_course_rating_stats(self, course_id: str) -> tuple[float, int]:
        stmt = select(
            func.coalesce(func.avg(CourseReviewModel.rating_stars), 0.0),
            func.count(CourseReviewModel.id),
        ).where(CourseReviewModel.course_id == course_id)
        res = await self.session.execute(stmt)
        row = res.one_or_none()
        if not row or row[1] == 0:
            return 0.0, 0
        avg_rating, count = row
        return round(float(avg_rating), 1), int(count)
