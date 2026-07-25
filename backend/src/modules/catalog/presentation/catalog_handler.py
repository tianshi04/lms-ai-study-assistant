from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.catalog.v1 import catalog_pb as pb
from src.gen.catalog.v1.catalog_connect import CatalogService
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
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
from src.shared.auth import CurrentUser, require_current_user


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
        order_index=getattr(item, "order_index", 0),
    )


def _to_pb_lesson(lesson: Lesson) -> pb.Lesson:
    return pb.Lesson(
        id=lesson.id,
        title=lesson.title,
        estimated_minutes=lesson.estimated_minutes,
        items=[_to_pb_learning_item(i) for i in lesson.items],
        order_index=getattr(lesson, "order_index", 0),
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
        average_rating=course.average_rating,
        review_count=course.review_count,
    )


def _to_pb_review(review: CourseReview) -> pb.CourseReview:
    return pb.CourseReview(
        id=review.id,
        user_id=review.user_id,
        user_name=review.user_name,
        course_id=review.course_id,
        rating_stars=review.rating_stars,
        comment_text=review.comment_text,
        created_at=review.created_at,
        is_verified_completer=review.is_verified_completer,
    )


def _to_pb_specialization(
    spec: Specialization, courses: list[Course] | None = None
) -> pb.Specialization:
    return pb.Specialization(
        id=spec.id,
        title=spec.title,
        description=spec.description,
        partner_name=spec.partner_name,
        partner_logo_url=spec.partner_logo_url,
        courses=[_to_pb_course(c) for c in (courses or [])],
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
        course = await self.use_case.get_course_detail(request.id_or_slug)
        if not course:
            raise ConnectError(Code.NOT_FOUND, f"Course {request.id_or_slug} not found")
        return pb.GetCourseDetailResponse(course=_to_pb_course(course))

    async def get_lesson_detail(
        self,
        request: pb.GetLessonDetailRequest,
        ctx: RequestContext[pb.GetLessonDetailRequest, pb.GetLessonDetailResponse],
    ) -> pb.GetLessonDetailResponse:
        lesson = await self.use_case.get_lesson_detail(
            course_id="", lesson_id=request.lesson_id
        )
        if not lesson:
            raise ConnectError(Code.NOT_FOUND, f"Lesson {request.lesson_id} not found")
        return pb.GetLessonDetailResponse(lesson=_to_pb_lesson(lesson))

    async def get_specialization(
        self,
        request: pb.GetSpecializationRequest,
        ctx: RequestContext[pb.GetSpecializationRequest, pb.GetSpecializationResponse],
    ) -> pb.GetSpecializationResponse:
        spec, courses = await self.use_case.get_specialization(request.id_or_slug)
        if not spec:
            raise ConnectError(
                Code.NOT_FOUND, f"Specialization {request.id_or_slug} not found"
            )
        return pb.GetSpecializationResponse(
            specialization=_to_pb_specialization(spec, courses),
        )

    def _verify_instructor_permission(self) -> CurrentUser:
        user = require_current_user()
        if not user.is_staff():
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ tài khoản Giảng viên (Instructor) hoặc Quản trị viên mới có quyền tạo và chỉnh sửa khóa học.",
            )
        return user

    async def create_course(
        self,
        request: pb.CreateCourseRequest,
        ctx: RequestContext[pb.CreateCourseRequest, pb.CreateCourseResponse],
    ) -> pb.CreateCourseResponse:
        user = self._verify_instructor_permission()
        course = await self.use_case.create_course(
            title=request.title,
            slug=request.slug,
            description=request.description,
            partner_name=request.partner_name,
            partner_logo_url=request.partner_logo_url,
            instructor_names=list(request.instructor_names),
            owner_id=user.id,
        )
        return pb.CreateCourseResponse(course=_to_pb_course(course))

    async def update_course(
        self,
        request: pb.UpdateCourseRequest,
        ctx: RequestContext[pb.UpdateCourseRequest, pb.UpdateCourseResponse],
    ) -> pb.UpdateCourseResponse:
        user = self._verify_instructor_permission()
        course = await self.use_case.update_course(
            course_id=request.id,
            title=request.title,
            description=request.description,
            partner_name=request.partner_name,
            partner_logo_url=request.partner_logo_url,
            instructor_names=list(request.instructor_names),
            current_user=user,
        )
        if not course:
            raise ConnectError(Code.NOT_FOUND, f"Khóa học {request.id} không tồn tại")
        return pb.UpdateCourseResponse(course=_to_pb_course(course))

    async def create_week_module(
        self,
        request: pb.CreateWeekModuleRequest,
        ctx: RequestContext[pb.CreateWeekModuleRequest, pb.CreateWeekModuleResponse],
    ) -> pb.CreateWeekModuleResponse:
        user = self._verify_instructor_permission()
        wm = await self.use_case.create_week_module(
            course_id=request.course_id,
            week_number=request.week_number,
            title=request.title,
            summary=request.summary,
            current_user=user,
        )
        return pb.CreateWeekModuleResponse(week_module=_to_pb_week_module(wm))

    async def create_lesson(
        self,
        request: pb.CreateLessonRequest,
        ctx: RequestContext[pb.CreateLessonRequest, pb.CreateLessonResponse],
    ) -> pb.CreateLessonResponse:
        user = self._verify_instructor_permission()
        lesson = await self.use_case.create_lesson(
            course_id=request.course_id,
            week_module_id=request.week_module_id,
            title=request.title,
            estimated_minutes=request.estimated_minutes,
            current_user=user,
        )
        return pb.CreateLessonResponse(lesson=_to_pb_lesson(lesson))

    async def create_learning_item(
        self,
        request: pb.CreateLearningItemRequest,
        ctx: RequestContext[
            pb.CreateLearningItemRequest, pb.CreateLearningItemResponse
        ],
    ) -> pb.CreateLearningItemResponse:
        user = self._verify_instructor_permission()
        item = await self.use_case.create_learning_item(
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            title=request.title,
            item_type=int(request.type),
            estimated_minutes=request.estimated_minutes,
            video_url=request.video_url,
            reading_markdown=request.reading_markdown,
            current_user=user,
        )
        return pb.CreateLearningItemResponse(item=_to_pb_learning_item(item))

    async def submit_course_review(
        self,
        request: pb.SubmitCourseReviewRequest,
        ctx: RequestContext[
            pb.SubmitCourseReviewRequest, pb.SubmitCourseReviewResponse
        ],
    ) -> pb.SubmitCourseReviewResponse:
        current_user = require_current_user()
        if not request.course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")
        if request.rating_stars < 1 or request.rating_stars > 5:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Điểm đánh giá phải từ 1 đến 5 sao"
            )

        try:
            user_display_name = (
                current_user.email.split("@")[0] if current_user.email else "Học viên"
            )
            review = await self.use_case.submit_course_review(
                user_id=current_user.id,
                user_name=user_display_name,
                course_id=request.course_id,
                rating_stars=request.rating_stars,
                comment_text=request.comment_text,
                user_role=current_user.role,
            )
            return pb.SubmitCourseReviewResponse(review=_to_pb_review(review))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Không thể lưu đánh giá: {str(e)}")

    async def list_course_reviews(
        self,
        request: pb.ListCourseReviewsRequest,
        ctx: RequestContext[pb.ListCourseReviewsRequest, pb.ListCourseReviewsResponse],
    ) -> pb.ListCourseReviewsResponse:
        if not request.course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")

        (
            reviews,
            avg_rating,
            total_count,
            next_token,
        ) = await self.use_case.list_course_reviews(
            course_id=request.course_id,
            page_size=request.page_size,
            page_token=request.page_token,
        )
        return pb.ListCourseReviewsResponse(
            reviews=[_to_pb_review(r) for r in reviews],
            average_rating=avg_rating,
            total_reviews=total_count,
            next_page_token=next_token,
        )

    async def delete_course(
        self,
        request: pb.DeleteCourseRequest,
        ctx: RequestContext[pb.DeleteCourseRequest, pb.DeleteCourseResponse],
    ) -> pb.DeleteCourseResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.delete_course(
            course_id=request.id, current_user=user
        )
        if not success:
            raise ConnectError(Code.NOT_FOUND, f"Khóa học {request.id} không tồn tại.")
        return pb.DeleteCourseResponse(success=True)

    async def update_week_module(
        self,
        request: pb.UpdateWeekModuleRequest,
        ctx: RequestContext[pb.UpdateWeekModuleRequest, pb.UpdateWeekModuleResponse],
    ) -> pb.UpdateWeekModuleResponse:
        user = self._verify_instructor_permission()
        wm = await self.use_case.update_week_module(
            id=request.id,
            course_id=request.course_id,
            week_number=request.week_number,
            title=request.title,
            summary=request.summary,
            current_user=user,
        )
        if not wm:
            raise ConnectError(Code.NOT_FOUND, f"Module {request.id} không tồn tại.")
        return pb.UpdateWeekModuleResponse(week_module=_to_pb_week_module(wm))

    async def delete_week_module(
        self,
        request: pb.DeleteWeekModuleRequest,
        ctx: RequestContext[pb.DeleteWeekModuleRequest, pb.DeleteWeekModuleResponse],
    ) -> pb.DeleteWeekModuleResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.delete_week_module(
            id=request.id, course_id=request.course_id, current_user=user
        )
        if not success:
            raise ConnectError(Code.NOT_FOUND, f"Module {request.id} không tồn tại.")
        return pb.DeleteWeekModuleResponse(success=True)

    async def update_lesson(
        self,
        request: pb.UpdateLessonRequest,
        ctx: RequestContext[pb.UpdateLessonRequest, pb.UpdateLessonResponse],
    ) -> pb.UpdateLessonResponse:
        user = self._verify_instructor_permission()
        lesson = await self.use_case.update_lesson(
            id=request.id,
            course_id=request.course_id,
            week_module_id=request.week_module_id,
            title=request.title,
            estimated_minutes=request.estimated_minutes,
            current_user=user,
        )
        if not lesson:
            raise ConnectError(Code.NOT_FOUND, f"Bài học {request.id} không tồn tại.")
        return pb.UpdateLessonResponse(lesson=_to_pb_lesson(lesson))

    async def delete_lesson(
        self,
        request: pb.DeleteLessonRequest,
        ctx: RequestContext[pb.DeleteLessonRequest, pb.DeleteLessonResponse],
    ) -> pb.DeleteLessonResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.delete_lesson(
            id=request.id, course_id=request.course_id, current_user=user
        )
        if not success:
            raise ConnectError(Code.NOT_FOUND, f"Bài học {request.id} không tồn tại.")
        return pb.DeleteLessonResponse(success=True)

    async def update_learning_item(
        self,
        request: pb.UpdateLearningItemRequest,
        ctx: RequestContext[
            pb.UpdateLearningItemRequest, pb.UpdateLearningItemResponse
        ],
    ) -> pb.UpdateLearningItemResponse:
        user = self._verify_instructor_permission()
        item = await self.use_case.update_learning_item(
            id=request.id,
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            title=request.title,
            item_type=int(request.type),
            estimated_minutes=request.estimated_minutes,
            video_url=request.video_url,
            reading_markdown=request.reading_markdown,
            in_video_quizzes=list(request.in_video_quizzes),
            current_user=user,
        )
        if not item:
            raise ConnectError(
                Code.NOT_FOUND, f"Vật liệu học tập {request.id} không tồn tại."
            )
        return pb.UpdateLearningItemResponse(item=_to_pb_learning_item(item))

    async def delete_learning_item(
        self,
        request: pb.DeleteLearningItemRequest,
        ctx: RequestContext[
            pb.DeleteLearningItemRequest, pb.DeleteLearningItemResponse
        ],
    ) -> pb.DeleteLearningItemResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.delete_learning_item(
            id=request.id, course_id=request.course_id, current_user=user
        )
        if not success:
            raise ConnectError(
                Code.NOT_FOUND, f"Vật liệu học tập {request.id} không tồn tại."
            )
        return pb.DeleteLearningItemResponse(success=True)

    async def create_course_announcement(
        self,
        request: pb.CreateCourseAnnouncementRequest,
        ctx: RequestContext[
            pb.CreateCourseAnnouncementRequest, pb.CreateCourseAnnouncementResponse
        ],
    ) -> pb.CreateCourseAnnouncementResponse:
        user = self._verify_instructor_permission()
        author_name = user.email.split("@")[0] if user.email else "Giảng viên"
        ann = await self.use_case.create_course_announcement(
            course_id=request.course_id,
            author_id=user.id,
            author_name=author_name,
            title=request.title,
            content=request.content,
            current_user=user,
        )
        return pb.CreateCourseAnnouncementResponse(
            announcement=pb.CourseAnnouncement(
                id=ann.id,
                course_id=ann.course_id,
                author_id=ann.author_id,
                author_name=ann.author_name,
                title=ann.title,
                content=ann.content,
                created_at=ann.created_at,
            )
        )

    async def list_course_announcements(
        self,
        request: pb.ListCourseAnnouncementsRequest,
        ctx: RequestContext[
            pb.ListCourseAnnouncementsRequest, pb.ListCourseAnnouncementsResponse
        ],
    ) -> pb.ListCourseAnnouncementsResponse:
        announcements = await self.use_case.list_course_announcements(
            course_id=request.course_id
        )
        return pb.ListCourseAnnouncementsResponse(
            announcements=[
                pb.CourseAnnouncement(
                    id=a.id,
                    course_id=a.course_id,
                    author_id=a.author_id,
                    author_name=a.author_name,
                    title=a.title,
                    content=a.content,
                    created_at=a.created_at,
                )
                for a in announcements
            ]
        )

    async def get_instructor_analytics(
        self,
        request: pb.GetInstructorAnalyticsRequest,
        ctx: RequestContext[
            pb.GetInstructorAnalyticsRequest, pb.GetInstructorAnalyticsResponse
        ],
    ) -> pb.GetInstructorAnalyticsResponse:
        user = self._verify_instructor_permission()
        analytics = await self.use_case.get_instructor_analytics(
            course_id=request.course_id, current_user=user
        )
        return pb.GetInstructorAnalyticsResponse(
            analytics=pb.InstructorAnalytics(
                course_id=analytics.course_id,
                total_enrolled_students=analytics.total_enrolled_students,
                average_completion_rate=analytics.average_completion_rate,
                average_rating=analytics.average_rating,
                review_count=analytics.review_count,
                students=[
                    pb.EnrolledStudent(
                        user_id=s.user_id,
                        user_name=s.user_name,
                        user_email=s.user_email,
                        progress_percent=s.progress_percent,
                        enrolled_at=s.enrolled_at,
                    )
                    for s in analytics.students
                ],
            )
        )

    async def reorder_week_modules(
        self,
        request: pb.ReorderWeekModulesRequest,
        ctx: RequestContext[
            pb.ReorderWeekModulesRequest, pb.ReorderWeekModulesResponse
        ],
    ) -> pb.ReorderWeekModulesResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.reorder_week_modules(
            course_id=request.course_id,
            ordered_week_module_ids=list(request.ordered_week_module_ids),
            current_user=user,
        )
        return pb.ReorderWeekModulesResponse(success=success)

    async def reorder_lessons(
        self,
        request: pb.ReorderLessonsRequest,
        ctx: RequestContext[pb.ReorderLessonsRequest, pb.ReorderLessonsResponse],
    ) -> pb.ReorderLessonsResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.reorder_lessons(
            course_id=request.course_id,
            week_module_id=request.week_module_id,
            ordered_lesson_ids=list(request.ordered_lesson_ids),
            current_user=user,
        )
        return pb.ReorderLessonsResponse(success=success)

    async def reorder_learning_items(
        self,
        request: pb.ReorderLearningItemsRequest,
        ctx: RequestContext[
            pb.ReorderLearningItemsRequest, pb.ReorderLearningItemsResponse
        ],
    ) -> pb.ReorderLearningItemsResponse:
        user = self._verify_instructor_permission()
        success = await self.use_case.reorder_learning_items(
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            ordered_item_ids=list(request.ordered_item_ids),
            current_user=user,
        )
        return pb.ReorderLearningItemsResponse(success=success)
