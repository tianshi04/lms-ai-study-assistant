from connectrpc.code import Code

from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.catalog.v1 import catalog_pb as pb
from src.gen.catalog.v1.catalog_connect import CatalogService
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.shared.auth import require_current_user
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


def _to_pb_item_type(type_enum: ItemType) -> pb.ItemType:
    mapping = {
        ItemType.UNSPECIFIED: pb.ItemType.UNSPECIFIED,
        ItemType.VIDEO: pb.ItemType.VIDEO,
        ItemType.READING: pb.ItemType.READING,
        ItemType.PRACTICE_QUIZ: pb.ItemType.PRACTICE_QUIZ,
        ItemType.GRADED_QUIZ: pb.ItemType.GRADED_QUIZ,
        ItemType.AUTO_GRADED_LAB: pb.ItemType.AUTO_GRADED_LAB,
        ItemType.PEER_REVIEW: pb.ItemType.PEER_REVIEW,
    }
    return mapping.get(type_enum, pb.ItemType.UNSPECIFIED)


def _to_pb_transcript(
    t: InteractiveTranscript,
) -> pb.InteractiveTranscript:
    return pb.InteractiveTranscript(timestamp_seconds=t.timestamp_seconds, text=t.text)


def _to_pb_quiz(q: InVideoQuiz) -> pb.InVideoQuiz:
    return pb.InVideoQuiz(
        timestamp_seconds=q.timestamp_seconds,
        question=q.question,
        options=q.options,
        correct_option_index=q.correct_option_index,
        explanation=q.explanation,
    )


def _to_pb_learning_item(item: LearningItem) -> pb.LearningItem:
    return pb.LearningItem(
        id=item.id,
        title=item.title,
        type=_to_pb_item_type(item.type),
        estimated_minutes=item.estimated_minutes,
        video_url=item.video_url,
        vtt_subtitle_url=item.vtt_subtitle_url,
        interactive_transcripts=[
            _to_pb_transcript(t) for t in item.interactive_transcripts
        ],
        in_video_quizzes=[_to_pb_quiz(q) for q in item.in_video_quizzes],
        reading_markdown=item.reading_markdown,
    )


def _to_pb_lesson(lesson: Lesson) -> pb.Lesson:
    return pb.Lesson(
        id=lesson.id,
        title=lesson.title,
        estimated_minutes=lesson.estimated_minutes,
        items=[_to_pb_learning_item(i) for i in lesson.items],
    )


def _to_pb_week_module(week: WeekModule) -> pb.WeekModule:
    return pb.WeekModule(
        id=week.id,
        week_number=week.week_number,
        title=week.title,
        summary=week.summary,
        lessons=[_to_pb_lesson(lesson_item) for lesson_item in week.lessons],
    )


def _to_pb_course(course: Course) -> pb.Course:
    return pb.Course(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        partner_name=course.partner_name,
        partner_logo_url=course.partner_logo_url,
        instructor_names=course.instructor_names,
        week_modules=[_to_pb_week_module(wm) for wm in course.week_modules],
    )


def _to_pb_specialization(spec: Specialization) -> pb.Specialization:
    return pb.Specialization(
        id=spec.id,
        title=spec.title,
        description=spec.description,
        partner_name=spec.partner_name,
        partner_logo_url=spec.partner_logo_url,
        course_ids=spec.course_ids,
    )


class CatalogHandler(CatalogService):
    def __init__(self, use_case: CatalogUseCase) -> None:
        self.use_case = use_case

    async def list_courses(
        self,
        request: pb.ListCoursesRequest,
        ctx: RequestContext[pb.ListCoursesRequest, pb.ListCoursesResponse],
    ) -> pb.ListCoursesResponse:
        courses, next_token = await self.use_case.list_courses(
            page_size=request.page_size, page_token=request.page_token
        )
        return pb.ListCoursesResponse(
            courses=[_to_pb_course(c) for c in courses],
            next_page_token=next_token,
        )

    async def get_course_detail(
        self,
        request: pb.GetCourseDetailRequest,
        ctx: RequestContext[pb.GetCourseDetailRequest, pb.GetCourseDetailResponse],
    ) -> pb.GetCourseDetailResponse:
        course = await self.use_case.get_course_detail(request.course_id)
        if not course:
            raise ConnectError(Code.NOT_FOUND, f"Course {request.course_id} not found")
        return pb.GetCourseDetailResponse(course=_to_pb_course(course))

    async def get_lesson_detail(
        self,
        request: pb.GetLessonDetailRequest,
        ctx: RequestContext[pb.GetLessonDetailRequest, pb.GetLessonDetailResponse],
    ) -> pb.GetLessonDetailResponse:
        lesson = await self.use_case.get_lesson_detail(
            course_id=request.course_id, lesson_id=request.lesson_id
        )
        if not lesson:
            raise ConnectError(Code.NOT_FOUND, f"Lesson {request.lesson_id} not found")
        return pb.GetLessonDetailResponse(lesson=_to_pb_lesson(lesson))

    async def get_specialization(
        self,
        request: pb.GetSpecializationRequest,
        ctx: RequestContext[pb.GetSpecializationRequest, pb.GetSpecializationResponse],
    ) -> pb.GetSpecializationResponse:
        spec, courses = await self.use_case.get_specialization(
            request.specialization_id
        )
        if not spec:
            raise ConnectError(
                Code.NOT_FOUND, f"Specialization {request.specialization_id} not found"
            )
        return pb.GetSpecializationResponse(
            specialization=_to_pb_specialization(spec),
            courses=[_to_pb_course(c) for c in courses],
        )

    def _verify_instructor_permission(self) -> None:
        user = require_current_user()
        if user.role not in (
            "USER_ROLE_INSTRUCTOR",
            "USER_ROLE_SUPER_ADMIN",
            "USER_ROLE_PARTNER_ADMIN",
            "INSTRUCTOR",
            "ADMIN",
        ):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ tài khoản Giảng viên (Instructor) hoặc Quản trị viên mới có quyền tạo và chỉnh sửa khóa học.",
            )

    async def create_course(
        self,
        request: pb.CreateCourseRequest,
        ctx: RequestContext[pb.CreateCourseRequest, pb.CreateCourseResponse],
    ) -> pb.CreateCourseResponse:
        self._verify_instructor_permission()
        course = await self.use_case.create_course(
            title=request.title,
            slug=request.slug,
            description=request.description,
            partner_name=request.partner_name,
            partner_logo_url=request.partner_logo_url,
            instructor_names=list(request.instructor_names),
        )
        return pb.CreateCourseResponse(course=_to_pb_course(course))

    async def update_course(
        self,
        request: pb.UpdateCourseRequest,
        ctx: RequestContext[pb.UpdateCourseRequest, pb.UpdateCourseResponse],
    ) -> pb.UpdateCourseResponse:
        self._verify_instructor_permission()
        course = await self.use_case.update_course(
            course_id=request.course_id,
            title=request.title,
            description=request.description,
            partner_name=request.partner_name,
            partner_logo_url=request.partner_logo_url,
            instructor_names=list(request.instructor_names),
        )
        if not course:
            raise ConnectError(
                Code.NOT_FOUND, f"Khóa học {request.course_id} không tồn tại"
            )
        return pb.UpdateCourseResponse(course=_to_pb_course(course))

    async def create_week_module(
        self,
        request: pb.CreateWeekModuleRequest,
        ctx: RequestContext[pb.CreateWeekModuleRequest, pb.CreateWeekModuleResponse],
    ) -> pb.CreateWeekModuleResponse:
        self._verify_instructor_permission()
        wm = await self.use_case.create_week_module(
            course_id=request.course_id,
            week_number=request.week_number,
            title=request.title,
            summary=request.summary,
        )
        return pb.CreateWeekModuleResponse(week_module=_to_pb_week_module(wm))

    async def create_lesson(
        self,
        request: pb.CreateLessonRequest,
        ctx: RequestContext[pb.CreateLessonRequest, pb.CreateLessonResponse],
    ) -> pb.CreateLessonResponse:
        self._verify_instructor_permission()
        lesson = await self.use_case.create_lesson(
            course_id=request.course_id,
            week_module_id=request.week_module_id,
            title=request.title,
            estimated_minutes=request.estimated_minutes,
        )
        return pb.CreateLessonResponse(lesson=_to_pb_lesson(lesson))

    async def create_learning_item(
        self,
        request: pb.CreateLearningItemRequest,
        ctx: RequestContext[
            pb.CreateLearningItemRequest, pb.CreateLearningItemResponse
        ],
    ) -> pb.CreateLearningItemResponse:
        self._verify_instructor_permission()
        item = await self.use_case.create_learning_item(
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            title=request.title,
            item_type=int(request.type),
            estimated_minutes=request.estimated_minutes,
            video_url=request.video_url,
            reading_markdown=request.reading_markdown,
        )
        return pb.CreateLearningItemResponse(item=_to_pb_learning_item(item))
