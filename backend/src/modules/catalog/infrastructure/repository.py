import uuid
from sqlalchemy import select
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
