import logging
from typing import Any

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.catalog.v1 import catalog_pb as pb
from src.gen.catalog.v1.catalog_connect import CatalogService
from src.modules.catalog.application import CatalogUseCase
from src.modules.catalog.domain import (
    Category,
    Course,
    CourseReview,
    CourseStatus,
    InteractiveTranscript,
    InVideoQuiz,
    ItemType,
    LearningItem,
    Lesson,
    Specialization,
    WeekModule,
)
from src.modules.catalog.domain.constants import DEFAULT_RECOMMENDED_COURSES_COUNT
from src.shared.auth import (
    CurrentUser,
    CurrentUserContext,
    get_current_user,
    require_current_user,
)
from src.shared.permissions import CoursePermission, enforce_course_ownership

logger = logging.getLogger(__name__)


def _parse_request_item_type(val: Any) -> int:
    if isinstance(val, int):
        return val
    if isinstance(val, pb.ItemType):
        return int(val)
    if isinstance(val, str):
        if val.isdigit():
            return int(val)
        mapping = {
            "ITEM_TYPE_UNSPECIFIED": 0,
            "UNSPECIFIED": 0,
            "ITEM_TYPE_VIDEO": 1,
            "VIDEO": 1,
            "ITEM_TYPE_READING": 2,
            "READING": 2,
            "ITEM_TYPE_PRACTICE_QUIZ": 3,
            "PRACTICE_QUIZ": 3,
            "ITEM_TYPE_GRADED_QUIZ": 4,
            "GRADED_QUIZ": 4,
            "ITEM_TYPE_AUTO_GRADED_LAB": 5,
            "AUTO_GRADED_LAB": 5,
            "ITEM_TYPE_PEER_REVIEW": 6,
            "PEER_REVIEW": 6,
        }
        if val in mapping:
            return mapping[val]
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


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
    return pb.InteractiveTranscript(
        timestamp_seconds=getattr(t, "timestamp_seconds", 0) or 0,
        text=getattr(t, "text", "") or "",
    )


def _to_pb_quiz(q: InVideoQuiz) -> pb.InVideoQuiz:
    return pb.InVideoQuiz(
        timestamp_seconds=getattr(q, "timestamp_seconds", 0) or 0,
        question=getattr(q, "question", "") or "",
        options=getattr(q, "options", []) or [],
        correct_option_index=getattr(q, "correct_option_index", 0) or 0,
        explanation=getattr(q, "explanation", "") or "",
    )


def _to_pb_learning_item(item: LearningItem) -> pb.LearningItem:
    return pb.LearningItem(
        id=item.id or "",
        title=item.title or "",
        type=_to_pb_item_type(item.type),
        estimated_minutes=item.estimated_minutes or 0,
        video_url=item.video_url or "",
        vtt_subtitle_url=item.vtt_subtitle_url or "",
        auto_transcribe=bool(getattr(item, "auto_transcribe", False)),
        interactive_transcripts=[
            _to_pb_transcript(t) for t in item.interactive_transcripts or []
        ],
        in_video_quizzes=[_to_pb_quiz(q) for q in item.in_video_quizzes or []],
        reading_markdown=item.reading_markdown or "",
        order_index=getattr(item, "order_index", 0) or 0,
        starter_code=getattr(item, "starter_code", "") or "",
        test_cases_json=getattr(item, "test_cases_json", "") or "",
        language=getattr(item, "language", "") or "",
        rubric_criteria_json=getattr(item, "rubric_criteria_json", "") or "",
        quiz_matrix_id=getattr(item, "quiz_matrix_id", "") or "",
    )


def _to_pb_lesson(lesson: Lesson) -> pb.Lesson:
    return pb.Lesson(
        id=lesson.id or "",
        title=lesson.title or "",
        estimated_minutes=lesson.estimated_minutes or 0,
        items=[_to_pb_learning_item(i) for i in lesson.items or []],
        order_index=getattr(lesson, "order_index", 0) or 0,
    )


def _to_pb_week_module(week: WeekModule) -> pb.WeekModule:
    return pb.WeekModule(
        id=week.id or "",
        week_number=week.week_number or 0,
        title=week.title or "",
        summary=week.summary or "",
        lessons=[_to_pb_lesson(lesson_item) for lesson_item in week.lessons or []],
    )


def _to_pb_course_status(status_enum: Any) -> pb.CourseStatus:
    val = getattr(status_enum, "value", str(status_enum))
    status_str = (
        str(val).replace("CourseStatus.", "").replace("COURSE_STATUS_", "").upper()
    )
    mapping = {
        "DRAFT": pb.CourseStatus.DRAFT,
        "PENDING_REVIEW": pb.CourseStatus.PENDING_REVIEW,
        "PUBLISHED": pb.CourseStatus.PUBLISHED,
        "REJECTED": pb.CourseStatus.REJECTED,
    }
    return mapping.get(status_str, pb.CourseStatus.DRAFT)


def _to_pb_course(course: Course) -> pb.Course:
    return pb.Course(
        id=course.id or "",
        title=course.title or "",
        slug=course.slug or "",
        description=course.description or "",
        partner_name=course.partner_name or "",
        partner_logo_url=course.partner_logo_url or "",
        instructor_names=course.instructor_names or [],
        week_modules=[_to_pb_week_module(wm) for wm in course.week_modules or []],
        average_rating=float(course.average_rating or 0.0),
        review_count=int(course.review_count or 0),
        subject=course.subject or "",
        level=course.level or "",
        financial_aid_enabled=bool(getattr(course, "financial_aid_enabled", True)),
        status=_to_pb_course_status(getattr(course, "status", "PUBLISHED")),
        rejection_reason=getattr(course, "rejection_reason", "") or "",
        organization_id=getattr(course, "organization_id", "partner_community")
        or "partner_community",
        owner_id=getattr(course, "owner_id", "") or "",
        co_instructor_ids=getattr(course, "co_instructor_ids", []) or [],
        price=float(getattr(course, "price", 0.0) or 0.0),
        foundational_course_ids=getattr(course, "foundational_course_ids", []) or [],
    )


def _to_pb_category(cat: Category) -> pb.Category:
    return pb.Category(
        id=cat.id,
        name=cat.name,
        slug=cat.slug,
        type=cat.type,
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
        helpful_count=review.helpful_count,
        is_helpful_by_me=review.is_helpful_by_me,
    )


def _to_pb_specialization(
    spec: Specialization, courses: list[Course] | None = None
) -> pb.Specialization:
    effective_courses = courses if courses is not None else getattr(spec, "courses", [])
    pb_courses = [_to_pb_course(c) for c in (effective_courses or [])]
    return pb.Specialization(
        id=spec.id,
        title=spec.title,
        description=spec.description,
        partner_name=spec.partner_name,
        partner_logo_url=spec.partner_logo_url,
        courses=pb_courses,
        bundle_price=float(getattr(spec, "bundle_price", 0.0) or 0.0),
        total_individual_price=float(
            getattr(spec, "total_individual_price", 0.0) or 0.0
        ),
        discount_percent=int(getattr(spec, "discount_percent", 0) or 0),
        owner_id=getattr(spec, "owner_id", "") or "",
        organization_id=getattr(spec, "organization_id", "partner_community")
        or "partner_community",
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
            page_size=request.page_size,
            page_token=request.page_token,
            search_query=request.search_query,
            subject=request.subject,
            level=request.level,
            sort_by=request.sort_by,
            organization_id=getattr(request, "organization_id", None) or None,
            status_filter=pb.CourseStatus.PUBLISHED,
        )
        return pb.ListCoursesResponse(
            courses=[_to_pb_course(c) for c in courses],
            next_page_token=next_token,
        )

    async def record_course_search(
        self,
        request: pb.RecordCourseSearchRequest,
        ctx: RequestContext[
            pb.RecordCourseSearchRequest, pb.RecordCourseSearchResponse
        ],
    ) -> pb.RecordCourseSearchResponse:
        current_user = require_current_user()
        success = await self.use_case.record_course_search(
            user_id=current_user.id,
            query=request.search_query,
            filters_json=request.filters_json,
            result_count=request.result_count,
        )
        return pb.RecordCourseSearchResponse(success=success)

    async def list_instructor_courses(
        self,
        request: pb.ListInstructorCoursesRequest,
        ctx: RequestContext[
            pb.ListInstructorCoursesRequest, pb.ListInstructorCoursesResponse
        ],
    ) -> pb.ListInstructorCoursesResponse:
        current_user = require_current_user()
        status_filter = request.status_filter
        if not status_filter or status_filter == pb.CourseStatus.UNSPECIFIED:
            status_filter_val = None
        else:
            status_filter_val = str(status_filter)

        instructor_id = "" if current_user.is_admin else current_user.id

        courses, next_token = await self.use_case.list_instructor_courses(
            instructor_id=instructor_id,
            page_size=request.page_size,
            page_token=request.page_token,
            status_filter=status_filter_val,
        )
        return pb.ListInstructorCoursesResponse(
            courses=[_to_pb_course(c) for c in courses],
            next_page_token=next_token,
        )

    async def submit_course_for_launch(
        self,
        request: pb.SubmitCourseForLaunchRequest,
        ctx: RequestContext[
            pb.SubmitCourseForLaunchRequest, pb.SubmitCourseForLaunchResponse
        ],
    ) -> pb.SubmitCourseForLaunchResponse:
        user = self._verify_instructor_permission()
        try:
            course = await self.use_case.submit_course_for_launch(
                course_id=request.course_id, current_user=user
            )
            return pb.SubmitCourseForLaunchResponse(course=_to_pb_course(course))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def review_course(
        self,
        request: pb.ReviewCourseRequest,
        ctx: RequestContext[pb.ReviewCourseRequest, pb.ReviewCourseResponse],
    ) -> pb.ReviewCourseResponse:
        user = require_current_user()
        try:
            course = await self.use_case.review_course(
                course_id=request.course_id,
                action=request.action,
                rejection_reason=request.rejection_reason,
                current_user=user,
            )
            return pb.ReviewCourseResponse(course=_to_pb_course(course))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def get_course_detail(
        self,
        request: pb.GetCourseDetailRequest,
        ctx: RequestContext[pb.GetCourseDetailRequest, pb.GetCourseDetailResponse],
    ) -> pb.GetCourseDetailResponse:
        course = await self.use_case.get_course_detail(request.id_or_slug)
        if not course:
            raise ConnectError(Code.NOT_FOUND, f"Course {request.id_or_slug} not found")

        try:
            foundational_list, recs = await self.use_case.get_course_recommendations(
                course.id, target_count=DEFAULT_RECOMMENDED_COURSES_COUNT
            )
        except Exception:
            logger.exception(
                "Failed to get course recommendations for %s",
                request.id_or_slug,
            )
            foundational_list, recs = [], []

        try:
            specialization = await self.use_case.get_specialization_for_course(
                course.id
            )
            pb_spec = _to_pb_specialization(specialization) if specialization else None
        except Exception:
            logger.exception(
                "Failed to get specialization for course %s",
                course.id,
            )
            pb_spec = None
        pb_foundational = [_to_pb_course(c) for c in (foundational_list or [])]
        pb_recs = [
            pb.CourseRecommendationItem(
                course=_to_pb_course(rec_course),
                badge_label=badge,
                score=score,
            )
            for rec_course, badge, score in recs
        ]

        return pb.GetCourseDetailResponse(
            course=_to_pb_course(course),
            foundational_courses=pb_foundational,
            recommended_courses=pb_recs,
            specialization=pb_spec,
        )

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

    async def create_specialization(
        self,
        request: pb.CreateSpecializationRequest,
        ctx: RequestContext[
            pb.CreateSpecializationRequest, pb.CreateSpecializationResponse
        ],
    ) -> pb.CreateSpecializationResponse:
        user = self._verify_instructor_permission()
        try:
            spec = await self.use_case.create_specialization(
                title=request.title,
                slug=request.slug,
                description=request.description,
                partner_name=request.partner_name,
                partner_logo_url=request.partner_logo_url,
                course_ids=list(request.course_ids),
                organization_id=request.organization_id or "partner_community",
                current_user=user,
            )
            return pb.CreateSpecializationResponse(
                specialization=_to_pb_specialization(spec)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def list_instructor_specializations(
        self,
        request: pb.ListInstructorSpecializationsRequest,
        ctx: RequestContext[
            pb.ListInstructorSpecializationsRequest,
            pb.ListInstructorSpecializationsResponse,
        ],
    ) -> pb.ListInstructorSpecializationsResponse:
        user = self._verify_instructor_permission()
        try:
            (
                specializations,
                next_token,
            ) = await self.use_case.list_instructor_specializations(
                current_user=user,
                page_size=request.page_size or 50,
                page_token=request.page_token or "",
            )
            return pb.ListInstructorSpecializationsResponse(
                specializations=[_to_pb_specialization(s) for s in specializations],
                next_page_token=next_token,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def update_specialization(
        self,
        request: pb.UpdateSpecializationRequest,
        ctx: RequestContext[
            pb.UpdateSpecializationRequest, pb.UpdateSpecializationResponse
        ],
    ) -> pb.UpdateSpecializationResponse:
        user = self._verify_instructor_permission()
        try:
            spec = await self.use_case.update_specialization(
                specialization_id=request.id,
                title=request.title,
                description=request.description,
                partner_name=request.partner_name,
                partner_logo_url=request.partner_logo_url,
                course_ids=list(request.course_ids),
                current_user=user,
            )
            return pb.UpdateSpecializationResponse(
                specialization=_to_pb_specialization(spec)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def delete_specialization(
        self,
        request: pb.DeleteSpecializationRequest,
        ctx: RequestContext[
            pb.DeleteSpecializationRequest, pb.DeleteSpecializationResponse
        ],
    ) -> pb.DeleteSpecializationResponse:
        user = self._verify_instructor_permission()
        try:
            success = await self.use_case.delete_specialization(
                specialization_id=request.id,
                current_user=user,
            )
            return pb.DeleteSpecializationResponse(success=success)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    def _verify_instructor_permission(self) -> CurrentUser:
        user = require_current_user()
        if not user.is_instructor and not user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ tài khoản Giảng viên (Instructor) hoặc Quản trị viên mới có quyền tạo và chỉnh sửa khóa học.",
            )
        return user

    async def list_foundational_course_candidates(
        self,
        request: pb.ListFoundationalCourseCandidatesRequest,
        ctx: RequestContext[
            pb.ListFoundationalCourseCandidatesRequest,
            pb.ListFoundationalCourseCandidatesResponse,
        ],
    ) -> pb.ListFoundationalCourseCandidatesResponse:
        user = self._verify_instructor_permission()
        (
            courses,
            next_page_token,
        ) = await self.use_case.list_foundational_course_candidates(
            current_user_id=user.id,
            course_id=request.course_id,
            search_query=request.search_query,
            page_size=request.page_size or 10,
            page_token=request.page_token,
        )
        return pb.ListFoundationalCourseCandidatesResponse(
            courses=[_to_pb_course(c) for c in courses],
            next_page_token=next_page_token,
        )

    async def create_course(
        self,
        request: pb.CreateCourseRequest,
        ctx: RequestContext[pb.CreateCourseRequest, pb.CreateCourseResponse],
    ) -> pb.CreateCourseResponse:
        user = self._verify_instructor_permission()
        try:
            course = await self.use_case.create_course(
                title=request.title,
                slug=request.slug,
                description=request.description,
                partner_name=request.partner_name,
                partner_logo_url=request.partner_logo_url,
                instructor_names=list(request.instructor_names),
                subject=request.subject,
                level=request.level,
                owner_id=user.id,
                financial_aid_enabled=request.financial_aid_enabled,
                organization_id=request.organization_id,
                foundational_course_ids=list(request.foundational_course_ids),
                current_user=user,
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        return pb.CreateCourseResponse(course=_to_pb_course(course))

    async def update_course(
        self,
        request: pb.UpdateCourseRequest,
        ctx: RequestContext[pb.UpdateCourseRequest, pb.UpdateCourseResponse],
    ) -> pb.UpdateCourseResponse:
        user = self._verify_instructor_permission()
        try:
            course = await self.use_case.update_course(
                course_id=request.id,
                title=request.title,
                description=request.description,
                partner_name=request.partner_name,
                partner_logo_url=request.partner_logo_url,
                instructor_names=list(request.instructor_names),
                subject=request.subject,
                level=request.level,
                financial_aid_enabled=request.financial_aid_enabled,
                # In Proto3, repeated fields default to empty list when unset.
                # Instructor management UI transmits the full list of foundational course IDs;
                # passing [] intentionally clears all prerequisite foundational courses.
                foundational_course_ids=list(request.foundational_course_ids),
                current_user=user,
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
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
        if not request.title or not request.title.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Tên học liệu không được để trống"
            )
        if not request.lesson_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã bài học (lesson_id) không được để trống"
            )

        try:
            item = await self.use_case.create_learning_item(
                course_id=request.course_id,
                lesson_id=request.lesson_id,
                title=request.title.strip(),
                item_type=_parse_request_item_type(request.type),
                estimated_minutes=request.estimated_minutes or 10,
                video_url=request.video_url or "",
                vtt_subtitle_url=request.vtt_subtitle_url or "",
                auto_transcribe=request.auto_transcribe,
                in_video_quizzes=list(request.in_video_quizzes)
                if request.in_video_quizzes
                else [],
                reading_markdown=request.reading_markdown or "",
                starter_code=request.starter_code or "",
                test_cases_json=request.test_cases_json or "",
                language=request.language or "",
                rubric_criteria_json=request.rubric_criteria_json or "",
                quiz_matrix_id=request.quiz_matrix_id or "",
                current_user=user,
            )
            return pb.CreateLearningItemResponse(item=_to_pb_learning_item(item))
        except ConnectError:
            raise
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except Exception as e:  # noqa: BLE001
            raise ConnectError(Code.INTERNAL, f"Không thể tạo học liệu: {e!s}")

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
                current_user.email.split("@")[0]
                if current_user.email
                else current_user.id
            )
            review = await self.use_case.submit_course_review(
                user_id=current_user.id,
                user_name=user_display_name,
                course_id=request.course_id,
                rating_stars=request.rating_stars,
                comment_text=request.comment_text,
            )
            return pb.SubmitCourseReviewResponse(review=_to_pb_review(review))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except Exception as e:  # noqa: BLE001
            raise ConnectError(Code.INTERNAL, f"Không thể lưu đánh giá: {e!s}")

    async def list_course_reviews(
        self,
        request: pb.ListCourseReviewsRequest,
        ctx: RequestContext[pb.ListCourseReviewsRequest, pb.ListCourseReviewsResponse],
    ) -> pb.ListCourseReviewsResponse:
        if not request.course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")

        current_user = get_current_user()
        current_user_id = current_user.id if current_user else None

        (
            reviews,
            avg_rating,
            total_count,
            next_token,
        ) = await self.use_case.list_course_reviews(
            course_id=request.course_id,
            page_size=request.page_size,
            page_token=request.page_token,
            current_user_id=current_user_id,
        )
        return pb.ListCourseReviewsResponse(
            reviews=[_to_pb_review(r) for r in reviews],
            average_rating=avg_rating,
            total_reviews=total_count,
            next_page_token=next_token,
        )

    async def toggle_course_review_helpful(
        self,
        request: pb.ToggleCourseReviewHelpfulRequest,
        ctx: RequestContext[
            pb.ToggleCourseReviewHelpfulRequest, pb.ToggleCourseReviewHelpfulResponse
        ],
    ) -> pb.ToggleCourseReviewHelpfulResponse:
        user = require_current_user()
        if not request.review_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã đánh giá không được để trống")
        try:
            (
                is_helpful,
                helpful_count,
            ) = await self.use_case.toggle_course_review_helpful(
                user_id=user.id,
                review_id=request.review_id,
            )
            return pb.ToggleCourseReviewHelpfulResponse(
                review_id=request.review_id,
                is_helpful=is_helpful,
                helpful_count=helpful_count,
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
        except Exception as e:
            logger.exception("Failed to toggle course review helpful")
            raise ConnectError(Code.INTERNAL, f"Không thể cập nhật hữu ích: {e!s}")

    def _verify_super_admin(self) -> None:
        user = require_current_user()
        if not user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Yêu cầu quyền Quản trị viên hệ thống để thực hiện thao tác này",
            )

    async def list_categories(
        self,
        request: pb.ListCategoriesRequest,
        ctx: RequestContext[pb.ListCategoriesRequest, pb.ListCategoriesResponse],
    ) -> pb.ListCategoriesResponse:
        cats = await self.use_case.list_categories(request.type)
        return pb.ListCategoriesResponse(categories=[_to_pb_category(c) for c in cats])

    async def create_category(
        self,
        request: pb.CreateCategoryRequest,
        ctx: RequestContext[pb.CreateCategoryRequest, pb.CreateCategoryResponse],
    ) -> pb.CreateCategoryResponse:
        self._verify_super_admin()
        cat = await self.use_case.create_category(request.name, request.type)
        return pb.CreateCategoryResponse(category=_to_pb_category(cat))

    async def delete_category(
        self,
        request: pb.DeleteCategoryRequest,
        ctx: RequestContext[pb.DeleteCategoryRequest, pb.DeleteCategoryResponse],
    ) -> pb.DeleteCategoryResponse:
        self._verify_super_admin()
        success = await self.use_case.delete_category(request.id)
        if not success:
            raise ConnectError(Code.NOT_FOUND, f"Category {request.id} not found")
        return pb.DeleteCategoryResponse(success=True)

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
            module_id=request.id,
            course_id=request.course_id,
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
            module_id=request.id, course_id=request.course_id, current_user=user
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
            lesson_id=request.id,
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
            lesson_id=request.id, course_id=request.course_id, current_user=user
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
            item_id=request.id,
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            title=request.title,
            item_type=int(request.type),
            estimated_minutes=request.estimated_minutes,
            video_url=request.video_url,
            reading_markdown=request.reading_markdown,
            vtt_subtitle_url=request.vtt_subtitle_url,
            auto_transcribe=request.auto_transcribe,
            in_video_quizzes=list(request.in_video_quizzes),
            starter_code=request.starter_code,
            test_cases_json=request.test_cases_json,
            language=request.language,
            rubric_criteria_json=request.rubric_criteria_json,
            quiz_matrix_id=request.quiz_matrix_id,
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
            item_id=request.id, course_id=request.course_id, current_user=user
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
        author_name = user.email.split("@")[0] if user.email else user.id
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

    async def get_instructor_activity_timeline(
        self,
        request: pb.GetInstructorActivityTimelineRequest,
        ctx: RequestContext[
            pb.GetInstructorActivityTimelineRequest,
            pb.GetInstructorActivityTimelineResponse,
        ],
    ) -> pb.GetInstructorActivityTimelineResponse:
        user = self._verify_instructor_permission()
        try:
            res = await self.use_case.get_instructor_activity_timeline(
                course_id=request.course_id,
                date_range=request.date_range or "7d",
                start_date=request.start_date,
                end_date=request.end_date,
                learner_filter=request.learner_filter or "all",
                current_user=user,
            )
            return pb.GetInstructorActivityTimelineResponse(
                timeline=[
                    pb.ActivityDataPoint(
                        timestamp=p.timestamp,
                        label=p.label,
                        active_learners=p.active_learners,
                        completed_items=p.completed_items,
                        in_progress=p.in_progress,
                    )
                    for p in res.timeline
                ],
                heatmap=[
                    pb.HeatmapCell(
                        day=h.day,
                        time_slot=h.time_slot,
                        count=h.count,
                        is_peak=h.is_peak,
                    )
                    for h in res.heatmap
                ],
                total_active_in_period=res.total_active_in_period,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

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

    async def generate_upload_url(
        self,
        request: pb.GenerateUploadUrlRequest,
        ctx: RequestContext[pb.GenerateUploadUrlRequest, pb.GenerateUploadUrlResponse],
    ) -> pb.GenerateUploadUrlResponse:
        self._verify_instructor_permission()
        upload_url, file_url, object_key = await self.use_case.generate_upload_url(
            filename=request.filename,
            content_type=request.content_type,
            folder=request.folder or "videos",
        )
        return pb.GenerateUploadUrlResponse(
            upload_url=upload_url, file_url=file_url, object_key=object_key
        )

    async def upload_media_file(
        self,
        request: pb.UploadMediaFileRequest,
        ctx: RequestContext[pb.UploadMediaFileRequest, pb.UploadMediaFileResponse],
    ) -> pb.UploadMediaFileResponse:
        self._verify_instructor_permission()
        file_url, object_key = await self.use_case.upload_media_file(
            filename=request.filename,
            content_type=request.content_type,
            file_bytes=request.file_bytes,
            folder=request.folder or "videos",
        )
        return pb.UploadMediaFileResponse(file_url=file_url, object_key=object_key)

    async def export_course_to_scorm(
        self,
        request: pb.ExportCourseToScormRequest,
        ctx: RequestContext[
            pb.ExportCourseToScormRequest, pb.ExportCourseToScormResponse
        ],
    ) -> pb.ExportCourseToScormResponse:
        user = self._verify_instructor_permission()
        download_url, object_key = await self.use_case.export_course_to_scorm(
            course_id=request.course_id,
            current_user=user,
        )
        return pb.ExportCourseToScormResponse(
            download_url=download_url, object_key=object_key
        )

    async def parse_scorm_package(
        self,
        request: pb.ParseScormPackageRequest,
        ctx: RequestContext[pb.ParseScormPackageRequest, pb.ParseScormPackageResponse],
    ) -> pb.ParseScormPackageResponse:
        self._verify_instructor_permission()
        (
            course_preview,
            is_single_item,
            single_item_preview,
        ) = await self.use_case.parse_scorm_package(
            scorm_object_key=request.scorm_object_key,
        )

        # We need to map Course and LearningItem entities to protobuf messages
        # Let's write a helper mapping or just call pb messages constructor
        # Since _map_course_to_pb is already helper inside catalog_handler, let's check if it exists!
        # Yes, catalog_handler.py usually has a mapper. Let's see if we have mapper methods.
        # Let's inspect.
        pb_course = _to_pb_course(course_preview) if course_preview else None
        pb_item = (
            _to_pb_learning_item(single_item_preview) if single_item_preview else None
        )

        return pb.ParseScormPackageResponse(
            course_preview=pb_course,
            is_single_item=is_single_item,
            single_item_preview=pb_item,
        )

    async def import_course_from_scorm(
        self,
        request: pb.ImportCourseFromScormRequest,
        ctx: RequestContext[
            pb.ImportCourseFromScormRequest, pb.ImportCourseFromScormResponse
        ],
    ) -> pb.ImportCourseFromScormResponse:
        user = self._verify_instructor_permission()
        course_res, item_res = await self.use_case.import_course_from_scorm(
            scorm_object_key=request.scorm_object_key,
            course_id=request.course_id,
            current_user=user,
        )
        pb_course = _to_pb_course(course_res) if course_res else None
        pb_item = _to_pb_learning_item(item_res) if item_res else None

        return pb.ImportCourseFromScormResponse(
            course=pb_course,
            imported_item=pb_item,
        )

    async def add_course_collaborator(
        self,
        request: pb.AddCourseCollaboratorRequest,
        ctx: RequestContext[
            pb.AddCourseCollaboratorRequest,
            pb.AddCourseCollaboratorResponse,
        ],
    ) -> pb.AddCourseCollaboratorResponse:
        user = require_current_user()
        try:
            res = await self.use_case.add_course_collaborator(
                course_id=request.course_id.strip(),
                email=request.email.strip(),
                role=request.role.strip(),
                current_user=user,
            )
            c = res["collaborator"]
            detail = pb.CourseCollaboratorDetail(
                collaborator_id=c["collaborator_id"],
                user_id=c["user_id"],
                email=c["email"],
                full_name=c["full_name"],
                avatar_url=c["avatar_url"],
                role=c["role"],
                added_at=c["added_at"],
            )
            return pb.AddCourseCollaboratorResponse(
                collaborator=detail,
                co_instructor_ids=res["co_instructor_ids"],
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def list_course_collaborators(
        self,
        request: pb.ListCourseCollaboratorsRequest,
        ctx: RequestContext[
            pb.ListCourseCollaboratorsRequest,
            pb.ListCourseCollaboratorsResponse,
        ],
    ) -> pb.ListCourseCollaboratorsResponse:
        user = require_current_user()
        try:
            collabs = await self.use_case.list_course_collaborators(
                course_id=request.course_id.strip(), current_user=user
            )
            pb_collabs = [
                pb.CourseCollaboratorDetail(
                    collaborator_id=c["collaborator_id"],
                    user_id=c["user_id"],
                    email=c["email"],
                    full_name=c["full_name"],
                    avatar_url=c["avatar_url"],
                    role=c["role"],
                    added_at=c["added_at"],
                )
                for c in collabs
            ]
            return pb.ListCourseCollaboratorsResponse(collaborators=pb_collabs)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def remove_course_collaborator(
        self,
        request: pb.RemoveCourseCollaboratorRequest,
        ctx: RequestContext[
            pb.RemoveCourseCollaboratorRequest,
            pb.RemoveCourseCollaboratorResponse,
        ],
    ) -> pb.RemoveCourseCollaboratorResponse:
        user = require_current_user()
        try:
            res = await self.use_case.remove_course_collaborator(
                course_id=request.course_id.strip(),
                user_id=request.user_id.strip(),
                current_user=user,
            )
            return pb.RemoveCourseCollaboratorResponse(
                success=res["success"],
                co_instructor_ids=res["co_instructor_ids"],
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def list_course_audit_logs(
        self,
        request: pb.ListCourseAuditLogsRequest,
        ctx: RequestContext[
            pb.ListCourseAuditLogsRequest,
            pb.ListCourseAuditLogsResponse,
        ],
    ) -> pb.ListCourseAuditLogsResponse:
        user = require_current_user()
        try:
            logs = await self.use_case.list_course_audit_logs(
                course_id=request.course_id.strip(), current_user=user
            )
            pb_logs = []
            for item in logs:
                action_str = item.get("action", "")
                action_enum = pb.CourseAuditAction.UNSPECIFIED
                if "JOINED" in action_str:
                    action_enum = pb.CourseAuditAction.COLLABORATOR_JOINED
                elif "ADDED" in action_str:
                    action_enum = pb.CourseAuditAction.COLLABORATOR_ADDED
                elif "REMOVED" in action_str:
                    action_enum = pb.CourseAuditAction.COLLABORATOR_REMOVED
                elif "ROLE" in action_str:
                    action_enum = pb.CourseAuditAction.ROLE_CHANGED

                pb_logs.append(
                    pb.CourseAuditLog(
                        id=item.get("id", ""),
                        course_id=item.get("course_id", ""),
                        actor_id=item.get("actor_id", ""),
                        actor_name=item.get("actor_name", ""),
                        target_user_id=item.get("target_user_id", ""),
                        target_user_name=item.get("target_user_name", ""),
                        action=action_enum,
                        details=item.get("details", ""),
                        created_at=item.get("created_at", ""),
                    )
                )
            return pb.ListCourseAuditLogsResponse(logs=pb_logs)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def bookmark_course(
        self,
        request: pb.BookmarkCourseRequest,
        ctx: RequestContext[pb.BookmarkCourseRequest, pb.BookmarkCourseResponse],
    ) -> pb.BookmarkCourseResponse:
        user = require_current_user()
        course_id = request.course_id.strip()
        if not course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")
        bm = await self.use_case.bookmark_course(user_id=user.id, course_id=course_id)
        if not bm:
            raise ConnectError(Code.NOT_FOUND, "Không tìm thấy khóa học")
        pb_course = _to_pb_course(bm.course) if bm.course else None
        return pb.BookmarkCourseResponse(
            success=True,
            bookmark=pb.CourseBookmark(
                id=bm.id,
                user_id=bm.user_id,
                course_id=bm.course_id,
                created_at=bm.created_at,
                course=pb_course,
            ),
        )

    async def unbookmark_course(
        self,
        request: pb.UnbookmarkCourseRequest,
        ctx: RequestContext[pb.UnbookmarkCourseRequest, pb.UnbookmarkCourseResponse],
    ) -> pb.UnbookmarkCourseResponse:
        user = require_current_user()
        course_id = request.course_id.strip()
        if not course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")
        success = await self.use_case.unbookmark_course(
            user_id=user.id, course_id=course_id
        )
        return pb.UnbookmarkCourseResponse(success=success)

    async def check_course_bookmarked(
        self,
        request: pb.CheckCourseBookmarkedRequest,
        ctx: RequestContext[
            pb.CheckCourseBookmarkedRequest, pb.CheckCourseBookmarkedResponse
        ],
    ) -> pb.CheckCourseBookmarkedResponse:
        user = require_current_user()
        course_id = request.course_id.strip()
        if not course_id:
            raise ConnectError(Code.INVALID_ARGUMENT, "Mã khóa học không được để trống")
        is_bookmarked = await self.use_case.check_course_bookmarked(
            user_id=user.id, course_id=course_id
        )
        return pb.CheckCourseBookmarkedResponse(is_bookmarked=is_bookmarked)

    async def list_my_bookmarked_courses(
        self,
        request: pb.ListMyBookmarkedCoursesRequest,
        ctx: RequestContext[
            pb.ListMyBookmarkedCoursesRequest, pb.ListMyBookmarkedCoursesResponse
        ],
    ) -> pb.ListMyBookmarkedCoursesResponse:
        user = require_current_user()
        bms = await self.use_case.list_my_bookmarked_courses(user_id=user.id)
        pb_bms = [
            pb.CourseBookmark(
                id=bm.id,
                user_id=bm.user_id,
                course_id=bm.course_id,
                created_at=bm.created_at,
                course=_to_pb_course(bm.course) if bm.course else None,
            )
            for bm in bms
        ]
        return pb.ListMyBookmarkedCoursesResponse(bookmarks=pb_bms)

    async def get_course_gradebook(
        self,
        request: pb.GetCourseGradebookRequest,
        ctx: RequestContext[
            pb.GetCourseGradebookRequest, pb.GetCourseGradebookResponse
        ],
    ) -> pb.GetCourseGradebookResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_detail(request.course_id)
            if not course:
                raise ValueError(f"Khóa học {request.course_id} không tồn tại.")
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="truy cập Sổ điểm (Course Gradebook)",
            )
            from src.modules.assessment.application import AssessmentUseCase

            assessment_usecase = AssessmentUseCase()
            res = await assessment_usecase.get_course_gradebook(
                course_id=course.id,
                search_query=request.search_query,
                status_filter=request.status_filter,
                page_size=request.page_size or 50,
                page_token=request.page_token,
                current_user=current_user,
            )
            columns = [
                pb.GradebookColumn(
                    item_id=c["item_id"],
                    item_title=c["item_title"],
                    item_type=c["item_type"],
                    weight=float(c["weight"]),
                    max_score=float(c["max_score"]),
                )
                for c in res.get("columns", [])
            ]
            rows = [
                pb.GradebookStudentRow(
                    user_id=r["user_id"],
                    full_name=r["full_name"],
                    email=r["email"],
                    avatar_url=r["avatar_url"],
                    enrollment_status=r["enrollment_status"],
                    final_weighted_grade=float(r["final_weighted_grade"]),
                    is_course_completed=r["is_course_completed"],
                    cells=[
                        pb.GradebookCell(
                            item_id=cell["item_id"],
                            score=float(cell["score"]),
                            is_passed=cell["is_passed"],
                            provenance=cell["provenance"],
                            graded_at=cell.get("graded_at", ""),
                            submission_id=cell.get("submission_id", ""),
                        )
                        for cell in r.get("cells", [])
                    ],
                )
                for r in res.get("rows", [])
            ]
            return pb.GetCourseGradebookResponse(
                course_id=res.get("course_id", course.id),
                course_title=res.get("course_title", course.title),
                columns=columns,
                rows=rows,
                total_students=res.get("total_students", len(rows)),
                next_page_token=res.get("next_page_token", ""),
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

    async def get_instructor_action_tasks(
        self,
        request: pb.GetInstructorActionTasksRequest,
        ctx: RequestContext[
            pb.GetInstructorActionTasksRequest, pb.GetInstructorActionTasksResponse
        ],
    ) -> pb.GetInstructorActionTasksResponse:
        current_user = require_current_user()
        try:
            course = await self.use_case.get_course_detail(request.course_id)
            if not course:
                raise ValueError(f"Khóa học {request.course_id} không tồn tại.")
            user_ctx = CurrentUserContext(
                id=current_user.id, role=current_user.role, email=current_user.email
            )
            enforce_course_ownership(
                course=course,
                user=user_ctx,
                required_permission=CoursePermission.GRADE_ASSESSMENTS,
                action_name="xem việc cần xử lý",
            )
            from src.modules.assessment.application import AssessmentUseCase

            assessment_usecase = AssessmentUseCase()
            res = await assessment_usecase.get_instructor_action_tasks(
                course_id=course.id,
                current_user=current_user,
            )
            tasks = [
                pb.InstructorActionTask(
                    id=t["id"],
                    type=t["type"],
                    title=t["title"],
                    lesson_title=t["lesson_title"],
                    student_name=t["student_name"],
                    course_title=t["course_title"],
                    time_ago=t["time_ago"],
                    action_text=t["action_text"],
                    action_url=t["action_url"],
                    course_id=t["course_id"],
                    priority=t["priority"],
                    created_at=t["created_at"],
                )
                for t in res.get("tasks", [])
            ]
            appeals_count = sum(
                1 for t in res.get("tasks", []) if t["type"] == "APPEAL"
            )
            grading_count = sum(
                1 for t in res.get("tasks", []) if t["type"] == "OVERDUE_GRADING"
            )
            return pb.GetInstructorActionTasksResponse(
                tasks=tasks,
                pending_grading_count=grading_count,
                pending_appeals_count=appeals_count,
                pending_qa_count=0,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

    async def get_admin_catalog_stats(
        self,
        request: pb.GetAdminCatalogStatsRequest,
        ctx: RequestContext[
            pb.GetAdminCatalogStatsRequest, pb.GetAdminCatalogStatsResponse
        ],
    ) -> pb.GetAdminCatalogStatsResponse:
        current_user = require_current_user()
        try:
            stats = await self.use_case.get_admin_catalog_stats(
                current_user=current_user
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e

        return pb.GetAdminCatalogStatsResponse(
            total_courses=stats.total_courses,
            published_courses=stats.published_courses,
            pending_review_courses=stats.pending_review_courses,
            draft_courses=stats.draft_courses,
            rejected_courses=stats.rejected_courses,
            category_count=stats.category_count,
            total_reviews=stats.total_reviews,
            average_rating=stats.average_rating,
            rating_distribution=list(stats.rating_distribution),
            low_reviews=[
                pb.AdminLowReviewAlert(
                    review_id=r.review_id,
                    course_id=r.course_id,
                    course_title=r.course_title,
                    user_name=r.user_name,
                    rating_stars=r.rating_stars,
                    comment_text=r.comment_text,
                    created_at=r.created_at,
                )
                for r in stats.low_reviews
            ],
            low_review_total=stats.low_review_total,
        )

    async def get_admin_catalog_trend(
        self,
        request: pb.GetAdminCatalogTrendRequest,
        ctx: RequestContext[
            pb.GetAdminCatalogTrendRequest, pb.GetAdminCatalogTrendResponse
        ],
    ) -> pb.GetAdminCatalogTrendResponse:
        current_user = require_current_user()
        try:
            points = await self.use_case.get_admin_catalog_trend(
                current_user=current_user, days=request.days
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        return pb.GetAdminCatalogTrendResponse(
            points=[
                pb.AdminCatalogTrendPoint(
                    date=p.date,
                    review_count=p.review_count,
                    average_rating=p.average_rating,
                )
                for p in points
            ]
        )

    async def list_admin_course_metrics(
        self,
        request: pb.ListAdminCourseMetricsRequest,
        ctx: RequestContext[
            pb.ListAdminCourseMetricsRequest, pb.ListAdminCourseMetricsResponse
        ],
    ) -> pb.ListAdminCourseMetricsResponse:
        current_user = require_current_user()
        status_map: dict[pb.CourseStatus, CourseStatus | None] = {
            pb.CourseStatus.UNSPECIFIED: None,
            pb.CourseStatus.DRAFT: CourseStatus.DRAFT,
            pb.CourseStatus.PENDING_REVIEW: CourseStatus.PENDING_REVIEW,
            pb.CourseStatus.PUBLISHED: CourseStatus.PUBLISHED,
            pb.CourseStatus.REJECTED: CourseStatus.REJECTED,
        }
        if request.status not in status_map:
            raise ConnectError(
                Code.INVALID_ARGUMENT,
                "Bộ lọc trạng thái khóa học không hợp lệ.",
            )

        try:
            result = await self.use_case.list_admin_course_metrics(
                current_user=current_user,
                page=request.page,
                page_size=request.page_size,
                search_query=request.search_query,
                status=status_map[request.status],
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        return pb.ListAdminCourseMetricsResponse(
            courses=[
                pb.AdminCourseQualityMetric(
                    course_id=m.course_id,
                    title=m.title,
                    partner_name=m.partner_name,
                    status=_to_pb_course_status(m.status),
                    enrolled_count=m.enrolled_count,
                    completed_count=m.completed_count,
                    average_rating=m.average_rating,
                    review_count=m.review_count,
                    revenue=m.revenue,
                )
                for m in result.courses
            ],
            total_count=result.total_count,
            page=result.page,
            page_size=result.page_size,
        )

    async def acknowledge_low_review(
        self,
        request: pb.AcknowledgeLowReviewRequest,
        ctx: RequestContext[
            pb.AcknowledgeLowReviewRequest, pb.AcknowledgeLowReviewResponse
        ],
    ) -> pb.AcknowledgeLowReviewResponse:
        current_user = require_current_user()
        try:
            await self.use_case.acknowledge_low_review(
                current_user=current_user, review_id=request.review_id
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e

        return pb.AcknowledgeLowReviewResponse(
            success=True,
            message="Đã ghi nhận xác nhận đánh giá.",
        )
