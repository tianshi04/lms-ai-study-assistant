import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Numeric, and_, case, delete, func, or_, select, true, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid6 import uuid7

from src.modules.catalog.domain import (
    ADMIN_LOW_RATING_MAX_STARS,
    ADMIN_LOW_REVIEW_ALERT_LIMIT,
    RATING_ROUND_DECIMALS,
    ActivityDataPoint,
    AdminCatalogStats,
    AdminCatalogTrendPoint,
    AdminCourseSummaryRow,
    AdminLowReviewAlert,
    Category,
    Course,
    CourseAnnouncement,
    CourseBookmark,
    CourseReview,
    CourseRole,
    CourseStatus,
    EnrolledStudent,
    HeatmapCell,
    ICatalogRepository,
    InstructorActivityTimeline,
    InstructorAnalytics,
    InstructorStudentDossier,
    InteractiveTranscript,
    InVideoQuiz,
    ItemType,
    LearningItem,
    Lesson,
    Specialization,
    StudentAssessmentSummaryItem,
    StudentCourseDailyLog,
    StudentDailyActivity,
    StudentDayItemLog,
    WeekModule,
)
from src.modules.catalog.domain.constants import (
    DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
    DEFAULT_ASSESSMENT_MAX_SCORE_QUIZ,
    DEFAULT_ESTIMATED_ITEM_MINUTES,
    DEFAULT_RECOMMENDED_COURSES_COUNT,
    DEFAULT_SPECIALIZATION_DISCOUNT_PERCENT,
    DEFAULT_TIMELINE_DATE_RANGE,
    FAST_PACE_MIN_ESTIMATED_RATIO,
    HEATMAP_DAYS,
    HEATMAP_TIME_SLOTS,
    MAX_FOUNDATIONAL_COURSES_COUNT,
    MAX_SEARCH_QUERY_LENGTH,
    MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK,
    MIN_SEARCH_QUERY_LENGTH,
    QUIZ_PERCENT_TO_SCORE_DIVISOR,
    SEARCH_HISTORY_THROTTLE_SECONDS,
    SECONDS_PER_HOUR,
    SECONDS_PER_MINUTE,
    STUDENT_DAILY_ACTIVITY_DAYS_WINDOW,
    VALID_TIMELINE_DATE_RANGES,
)
from src.modules.catalog.infrastructure.models import (
    CategoryModel,
    CourseAnnouncementModel,
    CourseAuditLogModel,
    CourseBookmarkModel,
    CourseCollaboratorModel,
    CourseEmbeddingModel,
    CourseModel,
    CourseReviewModel,
    CourseReviewReactionModel,
    InVideoQuizModel,
    LearningItemModel,
    LessonModel,
    LowReviewAcknowledgementModel,
    SpecializationModel,
    UserSearchHistoryModel,
    WeekModuleModel,
)
from src.modules.identity.infrastructure.models import UserModel
from src.shared.auth import get_current_user
from src.shared.domain import TREND_DATE_PREFIX_LEN, escape_like_pattern
from src.shared.infrastructure.scopes import apply_organization_scope

logger = logging.getLogger(__name__)


def _model_to_domain_lesson(l_model: LessonModel) -> Lesson:
    items: list[LearningItem] = []
    for i_model in l_model.items or []:
        transcripts = [
            InteractiveTranscript(timestamp_seconds=t.timestamp_seconds, text=t.text)
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
                order_index=getattr(i_model, "order_index", 0),
                starter_code=getattr(i_model, "starter_code", ""),
                test_cases_json=getattr(i_model, "test_cases_json", ""),
                language=getattr(i_model, "language", ""),
                rubric_criteria_json=getattr(i_model, "rubric_criteria_json", ""),
                quiz_matrix_id=getattr(i_model, "quiz_matrix_id", ""),
                auto_transcribe=getattr(i_model, "auto_transcribe", False),
                essay_grading_mode=getattr(i_model, "essay_grading_mode", "PEER_REVIEW")
                or "PEER_REVIEW",
                required_peer_reviews=getattr(i_model, "required_peer_reviews", 3) or 3,
                cold_start_hours=getattr(i_model, "cold_start_hours", 48) or 48,
                essay_max_attempts=getattr(i_model, "essay_max_attempts", 3) or 3,
            )
        )
    return Lesson(
        id=l_model.id,
        title=l_model.title,
        estimated_minutes=l_model.estimated_minutes,
        items=items,
        order_index=getattr(l_model, "order_index", 0),
    )


def _model_to_domain_course(model: CourseModel) -> Course:
    from sqlalchemy import inspect as sa_inspect

    insp = sa_inspect(model)
    week_modules: list[WeekModule] = []
    if "week_modules" not in insp.unloaded:
        for wm in model.week_modules or []:
            lessons: list[Lesson] = []
            wm_insp = sa_inspect(wm)
            if "lessons" not in wm_insp.unloaded:
                lessons = [
                    _model_to_domain_lesson(l_model) for l_model in wm.lessons or []
                ]
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
        instructor_names=[],
        week_modules=week_modules,
        average_rating=model.average_rating,
        review_count=model.review_count,
        subject=model.subject or "",
        level=model.level or "",
        owner_id=getattr(model, "owner_id", ""),
        co_instructor_ids=[
            c.user_id
            for c in getattr(model, "collaborators", [])
            if getattr(c, "role", "").upper()
            in (CourseRole.CO_INSTRUCTOR.value, "CO_INSTRUCTOR", "INSTRUCTOR")
        ],
        ta_ids=[
            c.user_id
            for c in getattr(model, "collaborators", [])
            if getattr(c, "role", "").upper()
            in (
                CourseRole.COURSE_TA.value,
                "COURSE_TA",
                "TA",
                "TEACHING_ASSISTANT",
                "COLLABORATOR",
            )
        ],
        status=getattr(model, "status", CourseStatus.DRAFT) or CourseStatus.DRAFT,
        rejection_reason=getattr(model, "rejection_reason", "") or "",
        organization_id=getattr(model, "organization_id", "partner_community")
        or "partner_community",
        price=float(getattr(model, "price", 0.0) or 0.0),
        foundational_course_ids=list(
            getattr(model, "foundational_course_ids", []) or []
        ),
    )


def _model_to_domain_specialization(
    model: SpecializationModel,
    courses: list[Course] | None = None,
) -> Specialization:
    loaded_courses = courses or []
    total_price = sum(getattr(c, "price", 0.0) for c in loaded_courses)
    is_bundle = len(loaded_courses) >= 2
    discount_pct = (
        DEFAULT_SPECIALIZATION_DISCOUNT_PERCENT if is_bundle and total_price > 0 else 0
    )
    bundle_price = (
        round(total_price * (1.0 - discount_pct / 100.0) / 10000) * 10000
        if total_price > 0
        else 0.0
    )
    return Specialization(
        id=model.id,
        title=model.title,
        description=model.description,
        partner_name=model.partner_name,
        partner_logo_url=model.partner_logo_url,
        course_ids=model.course_ids,
        courses=loaded_courses,
        bundle_price=bundle_price,
        total_individual_price=total_price,
        discount_percent=discount_pct,
        owner_id=getattr(model, "owner_id", "") or "",
        organization_id=getattr(model, "organization_id", "partner_community")
        or "partner_community",
    )


def _model_to_domain_review(
    model: CourseReviewModel, is_helpful_by_me: bool = False
) -> CourseReview:
    return CourseReview(
        id=model.id,
        user_id=model.user_id,
        user_name=model.user_name,
        course_id=model.course_id,
        rating_stars=model.rating_stars,
        comment_text=model.comment_text,
        created_at=model.created_at,
        is_verified_completer=model.is_verified_completer,
        helpful_count=getattr(model, "helpful_count", 0) or 0,
        is_helpful_by_me=is_helpful_by_me,
    )


def _parse_status_filter(status_filter: Any) -> CourseStatus | None:
    if not status_filter:
        return None
    if isinstance(status_filter, CourseStatus):
        return status_filter if status_filter != CourseStatus.UNSPECIFIED else None
    val = str(status_filter).strip()
    if not val or val in (
        "0",
        "UNSPECIFIED",
        "COURSE_STATUS_UNSPECIFIED",
        "CourseStatus.UNSPECIFIED",
    ):
        return None
    val = val.replace("COURSE_STATUS_", "").replace("CourseStatus.", "").upper()
    int_map = {
        "1": CourseStatus.DRAFT,
        "2": CourseStatus.PENDING_REVIEW,
        "3": CourseStatus.PUBLISHED,
        "4": CourseStatus.REJECTED,
    }
    if val in int_map:
        return int_map[val]
    try:
        return CourseStatus[val]
    except KeyError:
        return None


class SQLAlchemyCatalogRepository(ICatalogRepository):
    """Async SQLAlchemy Database Repository implementing ICatalogRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _hydrate_instructor_names(self, courses: list[Course]) -> list[Course]:
        """Resolve display instructor names from owner_id + co_instructor_ids in one batch query."""
        if not courses:
            return courses

        ordered_ids: list[str] = []
        seen_ids: set[str] = set()
        for course in courses:
            for uid in [course.owner_id, *(course.co_instructor_ids or [])]:
                clean_uid = (uid or "").strip()
                if clean_uid and clean_uid not in seen_ids:
                    seen_ids.add(clean_uid)
                    ordered_ids.append(clean_uid)

        if not ordered_ids:
            return courses

        from src.modules.identity.infrastructure.repository import (
            IdentityRepository,
        )

        user_repo = IdentityRepository(self.session)
        name_map = await user_repo.get_user_names_by_ids(ordered_ids)

        for course in courses:
            names: list[str] = []
            seen_names: set[str] = set()
            for uid in [course.owner_id, *(course.co_instructor_ids or [])]:
                clean_uid = (uid or "").strip()
                if not clean_uid:
                    continue
                resolved = (name_map.get(clean_uid) or "").strip()
                if resolved and resolved not in seen_names:
                    seen_names.add(resolved)
                    names.append(resolved)
            course.instructor_names = names

        return courses

    async def list_courses(
        self,
        page_size: int = 10,
        page_token: str = "",
        search_query: str = "",
        subject: str = "",
        level: str = "",
        sort_by: str = "",
        status_filter: str | CourseStatus = "",
        organization_id: str | None = None,
    ) -> tuple[list[Course], str]:
        _ = page_token
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

        if organization_id:
            stmt = stmt.where(CourseModel.organization_id == organization_id)
        else:
            stmt = apply_organization_scope(stmt, CourseModel, get_current_user())

        if search_query:
            pattern = f"%{search_query}%"
            stmt = stmt.where(
                CourseModel.title.ilike(pattern)
                | CourseModel.description.ilike(pattern)
            )

        if subject and subject != "UNSPECIFIED":
            stmt = stmt.where(CourseModel.subject == subject)

        if level and level != "UNSPECIFIED":
            stmt = stmt.where(CourseModel.level == level)

        parsed_status = _parse_status_filter(status_filter)
        if parsed_status:
            stmt = stmt.where(CourseModel.status == parsed_status)

        if sort_by == "rating":
            stmt = stmt.order_by(CourseModel.average_rating.desc())
        elif sort_by == "newest":
            stmt = stmt.order_by(CourseModel.id.desc())
        elif sort_by == "popular":
            stmt = stmt.order_by(CourseModel.review_count.desc())
        else:
            stmt = stmt.order_by(CourseModel.title.asc())

        stmt = stmt.limit(page_size or 10)

        res = await self.session.execute(stmt)
        models = res.scalars().all()
        courses = [_model_to_domain_course(m) for m in models]
        return await self._hydrate_instructor_names(courses), ""

    async def list_instructor_courses(
        self,
        instructor_id: str,
        page_size: int = 50,
        page_token: str = "",
        status_filter: str | CourseStatus | None = None,
    ) -> tuple[list[Course], str]:
        _ = page_token

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

        if instructor_id:
            collab_stmt = select(CourseCollaboratorModel.course_id).where(
                CourseCollaboratorModel.user_id == instructor_id
            )
            collab_res = await self.session.execute(collab_stmt)
            collab_course_ids = list(collab_res.scalars().all())

            instructor_cond = CourseModel.owner_id == instructor_id
            if collab_course_ids:
                instructor_cond = instructor_cond | CourseModel.id.in_(
                    collab_course_ids
                )
            stmt = stmt.where(instructor_cond)

        parsed_status = _parse_status_filter(status_filter)
        if parsed_status:
            stmt = stmt.where(CourseModel.status == parsed_status)

        stmt = stmt.order_by(CourseModel.id.desc()).limit(page_size or 50)

        res = await self.session.execute(stmt)
        models = res.scalars().all()
        courses: list[Course] = [_model_to_domain_course(m) for m in models]
        return await self._hydrate_instructor_names(courses), ""

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
        hydrated = await self._hydrate_instructor_names(
            [_model_to_domain_course(model)]
        )
        return hydrated[0]

    async def get_course_recommendations(
        self, course_id: str, target_count: int = DEFAULT_RECOMMENDED_COURSES_COUNT
    ) -> tuple[list[Course], list[tuple[Course, str, float]]]:
        stmt = select(CourseModel).where(
            (CourseModel.id == course_id) | (CourseModel.slug == course_id)
        )
        current_model = (await self.session.execute(stmt)).scalar_one_or_none()
        if not current_model:
            return [], []

        from src.modules.catalog.infrastructure.recommendation_service import (
            get_foundational_courses,
            get_recommended_courses,
        )

        foundational_models = await get_foundational_courses(
            self.session, current_model
        )
        exclude_ids = {current_model.id}
        foundational_domain: list[Course] = []
        for fm in foundational_models:
            foundational_domain.append(_model_to_domain_course(fm))
            exclude_ids.add(fm.id)

        rec_dtos = await get_recommended_courses(
            self.session,
            current_model,
            target_count=target_count,
            exclude_ids=exclude_ids,
        )
        recommended_courses = [_model_to_domain_course(r.course) for r in rec_dtos]
        await self._hydrate_instructor_names(
            [*foundational_domain, *recommended_courses]
        )
        recommended_domain: list[tuple[Course, str, float]] = [
            (course, r.badge_label, r.score)
            for course, r in zip(recommended_courses, rec_dtos, strict=True)
        ]
        return foundational_domain, recommended_domain

    async def get_lesson_detail(self, course_id: str, lesson_id: str) -> Lesson | None:
        stmt = (
            select(LessonModel)
            .join(WeekModuleModel, LessonModel.week_module_id == WeekModuleModel.id)
            .join(CourseModel, WeekModuleModel.course_id == CourseModel.id)
            .where(
                LessonModel.id == lesson_id,
                CourseModel.status == CourseStatus.PUBLISHED,
            )
            .options(
                selectinload(LessonModel.items).selectinload(
                    LearningItemModel.interactive_transcripts
                ),
                selectinload(LessonModel.items).selectinload(
                    LearningItemModel.in_video_quizzes
                ),
            )
        )
        if course_id:
            stmt = stmt.where(
                (CourseModel.id == course_id) | (CourseModel.slug == course_id)
            )

        res = await self.session.execute(stmt)
        l_model = res.scalar_one_or_none()
        if not l_model:
            return None

        return _model_to_domain_lesson(l_model)

    async def get_specialization(
        self, specialization_id: str
    ) -> tuple[Specialization | None, list[Course]]:
        stmt = select(SpecializationModel).where(
            SpecializationModel.id == specialization_id
        )
        stmt = apply_organization_scope(stmt, SpecializationModel, get_current_user())
        res = await self.session.execute(stmt)
        spec_model = res.scalar_one_or_none()
        if not spec_model:
            return None, []
        if not spec_model.course_ids:
            return _model_to_domain_specialization(spec_model, []), []

        courses_stmt = (
            select(CourseModel)
            .where(
                CourseModel.id.in_(spec_model.course_ids),
                CourseModel.status == CourseStatus.PUBLISHED,
            )
            .options(
                selectinload(CourseModel.week_modules).selectinload(
                    WeekModuleModel.lessons
                )
            )
        )
        c_res = await self.session.execute(courses_stmt)
        hydrated = await self._hydrate_instructor_names(
            [_model_to_domain_course(c) for c in c_res.scalars().all()]
        )
        c_map = {c.id: c for c in hydrated}
        courses = [c_map[cid] for cid in spec_model.course_ids if cid in c_map]
        return _model_to_domain_specialization(spec_model, courses), courses

    async def get_specialization_for_course(
        self, course_id: str
    ) -> Specialization | None:
        stmt = select(SpecializationModel).where(
            SpecializationModel.course_ids.contains([course_id])
        )
        stmt = apply_organization_scope(stmt, SpecializationModel, get_current_user())
        res = await self.session.execute(stmt)
        spec_model = res.scalars().first()
        if not spec_model:
            return None

        courses_stmt = (
            select(CourseModel)
            .where(
                CourseModel.id.in_(spec_model.course_ids),
                CourseModel.status == CourseStatus.PUBLISHED,
            )
            .options(
                selectinload(CourseModel.week_modules).selectinload(
                    WeekModuleModel.lessons
                )
            )
        )
        c_res = await self.session.execute(courses_stmt)
        hydrated = await self._hydrate_instructor_names(
            [_model_to_domain_course(c) for c in c_res.scalars().all()]
        )
        c_map = {c.id: c for c in hydrated}
        if course_id not in c_map:
            return None

        courses = [c_map[cid] for cid in spec_model.course_ids if cid in c_map]
        if not courses:
            return None
        return _model_to_domain_specialization(spec_model, courses)

    async def create_specialization(
        self,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        course_ids: list[str],
        owner_id: str,
        organization_id: str = "partner_community",
        slug: str = "",
    ) -> Specialization:
        if slug and slug.strip():
            candidate_id = f"spec-{slug.strip()}"
            existing = await self.session.get(SpecializationModel, candidate_id)
            spec_id = (
                candidate_id
                if not existing
                else f"spec-{slug.strip()}-{str(uuid7())[:8]}"
            )
        else:
            spec_id = f"spec-{uuid7()}"
        model = SpecializationModel(
            id=spec_id,
            title=title,
            description=description,
            partner_name=partner_name,
            partner_logo_url=partner_logo_url,
            course_ids=course_ids,
            owner_id=owner_id,
            organization_id=organization_id,
        )
        self.session.add(model)
        await self.session.flush()

        courses: list[Course] = []
        if course_ids:
            c_stmt = (
                select(CourseModel)
                .where(CourseModel.id.in_(course_ids))
                .options(
                    selectinload(CourseModel.week_modules).selectinload(
                        WeekModuleModel.lessons
                    )
                )
            )
            c_res = await self.session.execute(c_stmt)
            hydrated = await self._hydrate_instructor_names(
                [_model_to_domain_course(c) for c in c_res.scalars().all()]
            )
            c_map = {c.id: c for c in hydrated}
            courses = [c_map[cid] for cid in course_ids if cid in c_map]
        return _model_to_domain_specialization(model, courses)

    async def list_instructor_specializations(
        self,
        owner_id: str,
        page_size: int = 50,
        page_token: str = "",
    ) -> tuple[list[Specialization], str]:
        _ = page_token
        stmt = (
            select(SpecializationModel)
            .where(SpecializationModel.owner_id == owner_id)
            .order_by(SpecializationModel.id.desc())
            .limit(page_size)
        )
        stmt = apply_organization_scope(stmt, SpecializationModel, get_current_user())
        res = await self.session.execute(stmt)
        spec_models = res.scalars().all()

        specializations: list[Specialization] = []
        all_cids = {cid for sm in spec_models for cid in (sm.course_ids or [])}
        c_map: dict[str, Course] = {}
        if all_cids:
            c_stmt = (
                select(CourseModel)
                .where(CourseModel.id.in_(all_cids))
                .options(
                    selectinload(CourseModel.week_modules).selectinload(
                        WeekModuleModel.lessons
                    )
                )
            )
            c_res = await self.session.execute(c_stmt)
            hydrated = await self._hydrate_instructor_names(
                [_model_to_domain_course(c) for c in c_res.scalars().all()]
            )
            c_map = {c.id: c for c in hydrated}

        for sm in spec_models:
            courses = [c_map[cid] for cid in (sm.course_ids or []) if cid in c_map]
            specializations.append(_model_to_domain_specialization(sm, courses))
        return specializations, ""

    async def update_specialization(
        self,
        specialization_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        course_ids: list[str],
    ) -> Specialization | None:
        stmt = select(SpecializationModel).where(
            SpecializationModel.id == specialization_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None

        if title:
            model.title = title
        if description is not None:
            model.description = description
        if partner_name:
            model.partner_name = partner_name
        if partner_logo_url is not None:
            model.partner_logo_url = partner_logo_url
        if course_ids:
            model.course_ids = course_ids

        await self.session.flush()
        courses: list[Course] = []
        if model.course_ids:
            c_stmt = (
                select(CourseModel)
                .where(CourseModel.id.in_(model.course_ids))
                .options(
                    selectinload(CourseModel.week_modules).selectinload(
                        WeekModuleModel.lessons
                    )
                )
            )
            c_res = await self.session.execute(c_stmt)
            hydrated = await self._hydrate_instructor_names(
                [_model_to_domain_course(c) for c in c_res.scalars().all()]
            )
            c_map = {c.id: c for c in hydrated}
            courses = [c_map[cid] for cid in model.course_ids if cid in c_map]
        return _model_to_domain_specialization(model, courses)

    async def delete_specialization(
        self,
        specialization_id: str,
        owner_id: str,
    ) -> bool:
        stmt = select(SpecializationModel).where(
            SpecializationModel.id == specialization_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return False
        if model.owner_id != owner_id:
            current_user = get_current_user()
            if not current_user or not current_user.is_admin:
                return False
        await self.session.delete(model)
        await self.session.flush()
        return True

    async def list_foundational_course_candidates(
        self,
        current_user_id: str,
        course_id: str = "",
        search_query: str = "",
        page_size: int = 10,
        page_token: str = "",
    ) -> tuple[list[Course], str]:
        offset = int(page_token) if page_token.isdigit() else 0
        limit = max(1, min(page_size, 50))

        target_partner_name = ""
        target_vector: list[float] | None = None
        curr = None

        if course_id:
            c_stmt = select(CourseModel).where(
                (CourseModel.id == course_id) | (CourseModel.slug == course_id)
            )
            c_res = await self.session.execute(c_stmt)
            curr = c_res.scalar_one_or_none()
            if curr:
                target_partner_name = curr.partner_name
                emb_stmt = select(CourseEmbeddingModel).where(
                    CourseEmbeddingModel.course_id == curr.id
                )
                emb_res = await self.session.execute(emb_stmt)
                emb_row = emb_res.scalar_one_or_none()
                if emb_row and emb_row.embedding is not None:
                    target_vector = emb_row.embedding

        # Filter: PUBLISHED only, exclude course itself
        base_filter = [CourseModel.status == CourseStatus.PUBLISHED]
        if curr:
            base_filter.append(CourseModel.id != curr.id)
        elif course_id:
            base_filter.append(CourseModel.id != course_id)
            base_filter.append(CourseModel.slug != course_id)

        clean_search = search_query.strip()
        if clean_search:
            escaped_search = (
                clean_search.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            base_filter.append(CourseModel.title.ilike(f"%{escaped_search}%"))

        count_stmt = select(func.count(CourseModel.id)).where(*base_filter)
        count_stmt = apply_organization_scope(
            count_stmt, CourseModel, get_current_user()
        )
        total_count = (await self.session.execute(count_stmt)).scalar() or 0

        # Tier 1: Same Author
        is_same_author = case(
            (CourseModel.owner_id == current_user_id, 1),
            else_=0,
        )

        order_clauses = [is_same_author.desc()]

        # Tier 2: Same Partner/Organization
        if target_partner_name:
            is_same_partner = case(
                (CourseModel.partner_name == target_partner_name, 1),
                else_=0,
            )
            order_clauses.append(is_same_partner.desc())

        query = select(CourseModel).where(*base_filter)
        query = apply_organization_scope(query, CourseModel, get_current_user())

        dialect_name = getattr(getattr(self.session.bind, "dialect", None), "name", "")
        if dialect_name == "postgresql" and target_vector is not None:
            query = query.outerjoin(
                CourseEmbeddingModel, CourseModel.id == CourseEmbeddingModel.course_id
            )
            vec_dist = func.coalesce(
                CourseEmbeddingModel.embedding.cosine_distance(target_vector), 2.0
            )
            order_clauses.append(vec_dist.asc())

        order_clauses.extend(
            [
                CourseModel.average_rating.desc(),
                CourseModel.review_count.desc(),
                CourseModel.id.asc(),
            ]
        )
        query = query.order_by(*order_clauses)

        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        models = result.scalars().all()

        courses = await self._hydrate_instructor_names(
            [_model_to_domain_course(m) for m in models]
        )
        next_offset = offset + len(courses)
        next_page_token = str(next_offset) if next_offset < total_count else ""

        return courses, next_page_token

    async def _validate_foundational_course_ids(
        self,
        current_course_id: str,
        current_slug: str,
        foundational_ids: list[str] | None,
    ) -> list[str]:
        if not foundational_ids:
            return []

        clean_ids = [cid.strip() for cid in foundational_ids if cid.strip()]
        if not clean_ids:
            return []

        if len(clean_ids) > MAX_FOUNDATIONAL_COURSES_COUNT:
            raise ValueError(
                f"Số lượng môn học nền tảng tối đa được phép là {MAX_FOUNDATIONAL_COURSES_COUNT}."
            )

        target_identifiers = {current_course_id}
        if current_slug:
            target_identifiers.add(current_slug)

        # 1. Chặn tự chọn chính mình (Self-selection A ↔ A)
        if target_identifiers & set(clean_ids):
            raise ValueError("Khóa học không thể tự chọn chính mình làm môn nền tảng.")

        # 2. Kiểm tra tồn tại trong DB (Existence Check)
        stmt = select(CourseModel).where(CourseModel.id.in_(clean_ids))
        res = await self.session.execute(stmt)
        found_courses = res.scalars().all()
        found_map = {c.id: c for c in found_courses}

        missing = set(clean_ids) - set(found_map.keys())
        if missing:
            raise ValueError(
                f"Khóa học nền tảng không tồn tại: {', '.join(sorted(missing))}"
            )

        # 3. Chặn phụ thuộc vòng 2 chiều (Circular Dependency A ↔ B)
        for fc in found_courses:
            fc_deps = set(fc.foundational_course_ids or [])
            if target_identifiers & fc_deps:
                raise ValueError(
                    f"Phát hiện quan hệ phụ thuộc vòng: Khóa học '{fc.title}' ({fc.id}) đã chọn khóa học này làm môn nền tảng."
                )

        # 4. Bảo toàn thứ tự gốc và deduplicate
        deduped: list[str] = []
        for x in clean_ids:
            if x not in deduped:
                deduped.append(x)
        return deduped

    async def create_course(
        self,
        title: str,
        slug: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        subject: str = "",
        level: str = "",
        owner_id: str = "",
        co_instructor_ids: list[str] | None = None,
        financial_aid_enabled: bool = True,
        organization_id: str = "partner_community",
        foundational_course_ids: list[str] | None = None,
    ) -> Course:
        import re

        safe_slug = (
            re.sub(r"[^a-z0-9-]", "", slug.lower().strip().replace(" ", "-"))
            if slug
            else ""
        )
        course_id = f"course-{safe_slug}" if safe_slug else f"course-{uuid7().hex[-8:]}"
        clean_foundational_ids = await self._validate_foundational_course_ids(
            current_course_id=course_id,
            current_slug=safe_slug,
            foundational_ids=foundational_course_ids,
        )

        clean_org_id = (
            organization_id.strip()
            if organization_id and organization_id.strip()
            else "partner_community"
        )

        final_partner_name = partner_name.strip() if partner_name else ""
        final_partner_logo = partner_logo_url.strip() if partner_logo_url else ""

        if not final_partner_name:
            from src.modules.identity.infrastructure.models import OrganizationModel

            stmt = select(OrganizationModel).where(OrganizationModel.id == clean_org_id)
            res = await self.session.execute(stmt)
            org_row = res.scalar_one_or_none()
            if org_row:
                final_partner_name = org_row.name
                if not final_partner_logo:
                    final_partner_logo = org_row.avatar_url
            else:
                final_partner_name = ""

        model = CourseModel(
            id=course_id,
            title=title,
            slug=safe_slug or course_id,
            description=description,
            partner_name=final_partner_name,
            partner_logo_url=final_partner_logo,
            subject=subject,
            level=level,
            owner_id=owner_id,
            financial_aid_enabled=financial_aid_enabled,
            organization_id=clean_org_id,
            status=CourseStatus.DRAFT,
            rejection_reason="",
            foundational_course_ids=clean_foundational_ids,
        )
        self.session.add(model)

        if owner_id:
            owner_collab = CourseCollaboratorModel(
                id=f"collab_{uuid7().hex}",
                course_id=course_id,
                user_id=owner_id,
                role="PRIMARY_INSTRUCTOR",
                created_at=datetime.now(UTC).isoformat(),
            )
            self.session.add(owner_collab)

        if co_instructor_ids:
            for co_id in co_instructor_ids:
                if co_id != owner_id:
                    co_collab = CourseCollaboratorModel(
                        id=f"collab_{uuid7().hex}",
                        course_id=course_id,
                        user_id=co_id,
                        role="CO_INSTRUCTOR",
                        created_at=datetime.now(UTC).isoformat(),
                    )
                    self.session.add(co_collab)

        await self.session.commit()
        c_detail = await self.get_course_detail(course_id)
        return c_detail or _model_to_domain_course(model)

    async def update_course(
        self,
        course_id: str,
        title: str,
        description: str,
        partner_name: str,
        partner_logo_url: str,
        subject: str = "",
        level: str = "",
        financial_aid_enabled: bool = True,
        foundational_course_ids: list[str] | None = None,
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

        model.financial_aid_enabled = financial_aid_enabled

        if subject and subject != "UNSPECIFIED":
            model.subject = subject
        if level and level != "UNSPECIFIED":
            model.level = level

        if foundational_course_ids is not None:
            model.foundational_course_ids = (
                await self._validate_foundational_course_ids(
                    current_course_id=model.id,
                    current_slug=model.slug or "",
                    foundational_ids=foundational_course_ids,
                )
            )

        if model.status == CourseStatus.PUBLISHED:
            try:
                from src.modules.catalog.infrastructure.embedding_service import (
                    sync_course_embedding,
                )

                async with self.session.begin_nested():
                    await sync_course_embedding(self.session, model)
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "Failed to sync course embedding for %s: %s", course_id, e
                )

        await self.session.commit()
        return await self.get_course_detail(course_id)

    async def update_course_status(
        self, course_id: str, status: CourseStatus, rejection_reason: str = ""
    ) -> Course | None:
        stmt = select(CourseModel).where(CourseModel.id == course_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        model.status = status
        model.rejection_reason = rejection_reason

        if status == CourseStatus.PUBLISHED:
            try:
                from src.modules.catalog.infrastructure.embedding_service import (
                    sync_course_embedding,
                )

                async with self.session.begin_nested():
                    await sync_course_embedding(self.session, model)
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "Failed to sync course embedding for %s: %s", course_id, e
                )

        await self.session.commit()
        return await self.get_course_detail(course_id)

    async def create_week_module(
        self, course_id: str, title: str, summary: str
    ) -> WeekModule:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        stmt = select(func.max(WeekModuleModel.week_number)).where(
            WeekModuleModel.course_id == real_id
        )
        res = await self.session.execute(stmt)
        max_week = res.scalar()
        week_number = (max_week or 0) + 1

        wm_id = f"week-{week_number}-{uuid7().hex}"
        wm_model = WeekModuleModel(
            id=wm_id,
            course_id=real_id,
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
        _ = course_id
        l_id = f"lesson-{uuid7().hex}"
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
        item_type: int | ItemType | str,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
        vtt_subtitle_url: str = "",
        auto_transcribe: bool = False,
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        essay_grading_mode: str = "PEER_REVIEW",
        required_peer_reviews: int = 3,
        cold_start_hours: int = 48,
        essay_max_attempts: int = 3,
    ) -> LearningItem:
        _ = course_id
        item_id = f"item-{uuid7().hex}"
        type_mapping = {
            0: ItemType.UNSPECIFIED,
            1: ItemType.VIDEO,
            2: ItemType.READING,
            3: ItemType.PRACTICE_QUIZ,
            4: ItemType.GRADED_QUIZ,
            5: ItemType.AUTO_GRADED_LAB,
            6: ItemType.PEER_REVIEW,
        }
        if isinstance(item_type, ItemType):
            enum_type = item_type
        elif isinstance(item_type, str):
            if item_type.isdigit():
                enum_type = type_mapping.get(int(item_type), ItemType.UNSPECIFIED)
            else:
                str_map = {
                    "ITEM_TYPE_UNSPECIFIED": ItemType.UNSPECIFIED,
                    "UNSPECIFIED": ItemType.UNSPECIFIED,
                    "ITEM_TYPE_VIDEO": ItemType.VIDEO,
                    "VIDEO": ItemType.VIDEO,
                    "ITEM_TYPE_READING": ItemType.READING,
                    "READING": ItemType.READING,
                    "ITEM_TYPE_PRACTICE_QUIZ": ItemType.PRACTICE_QUIZ,
                    "PRACTICE_QUIZ": ItemType.PRACTICE_QUIZ,
                    "ITEM_TYPE_GRADED_QUIZ": ItemType.GRADED_QUIZ,
                    "GRADED_QUIZ": ItemType.GRADED_QUIZ,
                    "ITEM_TYPE_AUTO_GRADED_LAB": ItemType.AUTO_GRADED_LAB,
                    "AUTO_GRADED_LAB": ItemType.AUTO_GRADED_LAB,
                    "ITEM_TYPE_PEER_REVIEW": ItemType.PEER_REVIEW,
                    "PEER_REVIEW": ItemType.PEER_REVIEW,
                }
                enum_type = str_map.get(item_type, ItemType.UNSPECIFIED)
        else:
            enum_type = type_mapping.get(item_type, ItemType.UNSPECIFIED)

        # Verify lesson existence to avoid foreign key violation
        lesson_stmt = select(LessonModel).where(LessonModel.id == lesson_id)
        lesson_res = await self.session.execute(lesson_stmt)
        lesson_model = lesson_res.scalar_one_or_none()
        if not lesson_model:
            raise ValueError(
                f"Bài học (Lesson) với ID '{lesson_id}' không tồn tại trong hệ thống."
            )

        item_model = LearningItemModel(
            id=item_id,
            lesson_id=lesson_id,
            title=title,
            type=enum_type,
            estimated_minutes=estimated_minutes or 10,
            video_url=video_url or "",
            vtt_subtitle_url=vtt_subtitle_url or "",
            auto_transcribe=auto_transcribe,
            reading_markdown=reading_markdown or "",
            starter_code=starter_code or "",
            test_cases_json=test_cases_json or "",
            language=language or "",
            rubric_criteria_json=rubric_criteria_json or "",
            quiz_matrix_id=quiz_matrix_id or "",
            essay_grading_mode=essay_grading_mode or "PEER_REVIEW",
            required_peer_reviews=required_peer_reviews or 3,
            cold_start_hours=cold_start_hours or 48,
            essay_max_attempts=essay_max_attempts or 3,
        )
        self.session.add(item_model)

        if in_video_quizzes:
            for ivq in in_video_quizzes:
                if isinstance(ivq, dict):
                    ts = int(
                        ivq.get("timestamp_seconds", ivq.get("timestampSeconds", 0))
                    )
                    q = str(ivq.get("question", ""))
                    opts = list(ivq.get("options", []))
                    corr = int(
                        ivq.get(
                            "correct_option_index", ivq.get("correctOptionIndex", 0)
                        )
                    )
                    exp = str(ivq.get("explanation", ""))
                else:
                    ts = int(
                        getattr(
                            ivq,
                            "timestamp_seconds",
                            getattr(ivq, "timestampSeconds", 0),
                        )
                    )
                    q = str(getattr(ivq, "question", ""))
                    opts = list(getattr(ivq, "options", []))
                    corr = int(
                        getattr(
                            ivq,
                            "correct_option_index",
                            getattr(ivq, "correctOptionIndex", 0),
                        )
                    )
                    exp = str(getattr(ivq, "explanation", ""))

                q_model = InVideoQuizModel(
                    item_id=item_id,
                    timestamp_seconds=ts,
                    question=q,
                    options=opts,
                    correct_option_index=corr,
                    explanation=exp,
                )
                self.session.add(q_model)

        await self.session.commit()
        return LearningItem(
            id=item_id,
            title=title,
            type=enum_type,
            estimated_minutes=estimated_minutes or 10,
            video_url=video_url or "",
            vtt_subtitle_url=vtt_subtitle_url or "",
            auto_transcribe=auto_transcribe,
            interactive_transcripts=[],
            in_video_quizzes=in_video_quizzes or [],
            reading_markdown=reading_markdown or "",
            starter_code=starter_code or "",
            test_cases_json=test_cases_json or "",
            language=language or "",
            rubric_criteria_json=rubric_criteria_json or "",
            quiz_matrix_id=quiz_matrix_id or "",
            essay_grading_mode=essay_grading_mode or "PEER_REVIEW",
            required_peer_reviews=required_peer_reviews or 3,
            cold_start_hours=cold_start_hours or 48,
            essay_max_attempts=essay_max_attempts or 3,
        )

    async def submit_course_review(
        self,
        user_id: str,
        user_name: str,
        course_id: str,
        rating_stars: int,
        comment_text: str,
        is_verified_completer: bool,
    ) -> CourseReview:
        stmt = select(CourseReviewModel).where(
            (CourseReviewModel.user_id == user_id)
            & (CourseReviewModel.course_id == course_id)
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        now_str = datetime.now(UTC).isoformat()
        if existing:
            existing.rating_stars = rating_stars
            existing.comment_text = comment_text
            existing.user_name = user_name or existing.user_name
            existing.created_at = now_str
            existing.is_verified_completer = is_verified_completer
            await self.session.commit()

            # Update CSAT cache
            avg_rating, total_count = await self.get_course_rating_stats(course_id)
            course_stmt = select(CourseModel).where(CourseModel.id == course_id)
            course_res = await self.session.execute(course_stmt)
            course_model = course_res.scalar_one_or_none()
            if course_model:
                course_model.average_rating = avg_rating
                course_model.review_count = total_count
                await self.session.commit()

            return _model_to_domain_review(existing)

        review_id = f"rev-{uuid7().hex}"
        model = CourseReviewModel(
            id=review_id,
            user_id=user_id,
            user_name=user_name or user_id,
            course_id=course_id,
            rating_stars=rating_stars,
            comment_text=comment_text,
            created_at=now_str,
            is_verified_completer=is_verified_completer,
        )
        self.session.add(model)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            stmt_retry = select(CourseReviewModel).where(
                CourseReviewModel.user_id == user_id,
                CourseReviewModel.course_id == course_id,
            )
            res_retry = await self.session.execute(stmt_retry)
            existing_retry = res_retry.scalar_one()
            existing_retry.rating_stars = rating_stars
            existing_retry.comment_text = comment_text
            existing_retry.user_name = user_name or existing_retry.user_name
            existing_retry.created_at = now_str
            existing_retry.is_verified_completer = is_verified_completer
            await self.session.commit()

            # Update CSAT cache
            avg_rating, total_count = await self.get_course_rating_stats(course_id)
            course_stmt = select(CourseModel).where(CourseModel.id == course_id)
            course_res = await self.session.execute(course_stmt)
            course_model = course_res.scalar_one_or_none()
            if course_model:
                course_model.average_rating = avg_rating
                course_model.review_count = total_count
                await self.session.commit()

            return _model_to_domain_review(existing_retry)

        # Update CSAT cache for new insert
        avg_rating, total_count = await self.get_course_rating_stats(course_id)
        course_stmt = select(CourseModel).where(CourseModel.id == course_id)
        course_res = await self.session.execute(course_stmt)
        course_model = course_res.scalar_one_or_none()
        if course_model:
            course_model.average_rating = avg_rating
            course_model.review_count = total_count
            await self.session.commit()

        return _model_to_domain_review(model)

    async def get_review_by_id(self, review_id: str) -> CourseReview | None:
        stmt = select(CourseReviewModel).where(CourseReviewModel.id == review_id)
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        return _model_to_domain_review(m) if m else None

    async def toggle_course_review_helpful(
        self, user_id: str, review_id: str
    ) -> tuple[bool, int]:
        now_str = datetime.now(UTC).isoformat()
        del_stmt = (
            delete(CourseReviewReactionModel)
            .where(
                CourseReviewReactionModel.user_id == user_id,
                CourseReviewReactionModel.review_id == review_id,
            )
            .returning(CourseReviewReactionModel.id)
        )
        deleted_id = (await self.session.execute(del_stmt)).scalar_one_or_none()

        if deleted_id:
            upd_stmt = (
                update(CourseReviewModel)
                .where(CourseReviewModel.id == review_id)
                .values(
                    helpful_count=func.greatest(0, CourseReviewModel.helpful_count - 1)
                )
                .returning(CourseReviewModel.helpful_count)
            )
            res = await self.session.execute(upd_stmt)
            new_count = res.scalar_one_or_none() or 0
            await self.session.commit()
            return False, new_count
        reaction = CourseReviewReactionModel(
            id=f"rev-rx-{uuid7().hex}",
            user_id=user_id,
            review_id=review_id,
            created_at=now_str,
        )
        self.session.add(reaction)
        upd_stmt = (
            update(CourseReviewModel)
            .where(CourseReviewModel.id == review_id)
            .values(helpful_count=CourseReviewModel.helpful_count + 1)
            .returning(CourseReviewModel.helpful_count)
        )
        res = await self.session.execute(upd_stmt)
        new_count = res.scalar_one_or_none() or 1
        try:
            await self.session.commit()
            return True, new_count
        except IntegrityError:
            await self.session.rollback()
            rev = await self.session.get(CourseReviewModel, review_id)
            return True, rev.helpful_count if rev else new_count

    async def list_course_reviews(
        self,
        course_id: str,
        page_size: int = 10,
        page_token: str = "",
        current_user_id: str | None = None,
    ) -> tuple[list[CourseReview], float, int, str]:
        _ = page_token
        stmt = (
            select(CourseReviewModel)
            .where(CourseReviewModel.course_id == course_id)
            .order_by(CourseReviewModel.created_at.desc())
            .limit(page_size or 10)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()

        reacted_ids: set[str] = set()
        if current_user_id and models:
            rev_ids = [m.id for m in models]
            rx_stmt = select(CourseReviewReactionModel.review_id).where(
                CourseReviewReactionModel.user_id == current_user_id,
                CourseReviewReactionModel.review_id.in_(rev_ids),
            )
            rx_res = await self.session.execute(rx_stmt)
            reacted_ids = set(rx_res.scalars().all())

        reviews = [
            _model_to_domain_review(m, is_helpful_by_me=(m.id in reacted_ids))
            for m in models
        ]
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

    async def get_course_id_by_slug_or_id(self, course_id_or_slug: str) -> str:
        stmt = select(CourseModel.id).where(
            (CourseModel.id == course_id_or_slug)
            | (CourseModel.slug == course_id_or_slug)
        )
        res = await self.session.execute(stmt)
        row = res.scalar_one_or_none()
        return row or course_id_or_slug

    async def list_categories(self, type_filter: str = "") -> list[Category]:
        stmt = select(CategoryModel)
        if type_filter:
            stmt = stmt.where(CategoryModel.type == type_filter)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            Category(
                id=m.id, name=m.name, slug=m.slug, type=m.type, created_at=m.created_at
            )
            for m in models
        ]

    async def create_category(self, name: str, category_type: str) -> Category:
        import re

        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        cat_id = f"cat-{uuid7().hex}"
        now_str = datetime.now(UTC).isoformat()

        model = CategoryModel(
            id=cat_id, name=name, slug=slug, type=category_type, created_at=now_str
        )
        self.session.add(model)
        await self.session.commit()
        return Category(
            id=cat_id, name=name, slug=slug, type=category_type, created_at=now_str
        )

    async def delete_category(self, category_id: str) -> bool:
        stmt = select(CategoryModel).where(CategoryModel.id == category_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return False
        await self.session.delete(model)
        await self.session.commit()
        return True

    async def delete_course(self, course_id: str) -> bool:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        stmt = select(CourseModel).where(CourseModel.id == real_id)
        res = await self.session.execute(stmt)
        course = res.scalar_one_or_none()
        if not course:
            return False
        if course.status == CourseStatus.PUBLISHED:
            raise ValueError(
                "Không thể xóa khóa học ở trạng thái Đã xuất bản (PUBLISHED)."
            )
        await self.session.delete(course)
        await self.session.commit()
        return True

    async def update_week_module(
        self, module_id: str, course_id: str, title: str, summary: str
    ) -> WeekModule | None:
        stmt = select(WeekModuleModel).where(
            WeekModuleModel.id == module_id, WeekModuleModel.course_id == course_id
        )
        res = await self.session.execute(stmt)
        wm = res.scalar_one_or_none()
        if not wm:
            return None
        wm.title = title
        wm.summary = summary
        await self.session.commit()
        await self.session.refresh(wm)
        return WeekModule(
            id=wm.id,
            week_number=wm.week_number,
            title=wm.title,
            summary=wm.summary,
            lessons=[],
        )

    async def delete_week_module(self, module_id: str, course_id: str) -> bool:
        stmt = select(WeekModuleModel).where(
            WeekModuleModel.id == module_id, WeekModuleModel.course_id == course_id
        )
        res = await self.session.execute(stmt)
        wm = res.scalar_one_or_none()
        if not wm:
            return False
        await self.session.delete(wm)
        await self.session.commit()
        return True

    async def update_lesson(
        self,
        lesson_id: str,
        course_id: str,
        week_module_id: str,
        title: str,
        estimated_minutes: int,
    ) -> Lesson | None:
        _ = course_id
        stmt = select(LessonModel).where(LessonModel.id == lesson_id)
        res = await self.session.execute(stmt)
        lesson = res.scalar_one_or_none()
        if not lesson:
            return None
        lesson.title = title
        lesson.estimated_minutes = estimated_minutes
        if week_module_id:
            lesson.week_module_id = week_module_id
        await self.session.commit()
        await self.session.refresh(lesson)
        return Lesson(
            id=lesson.id,
            title=lesson.title,
            estimated_minutes=lesson.estimated_minutes,
            items=[],
        )

    async def delete_lesson(self, lesson_id: str, course_id: str) -> bool:
        _ = course_id
        stmt = select(LessonModel).where(LessonModel.id == lesson_id)
        res = await self.session.execute(stmt)
        lesson = res.scalar_one_or_none()
        if not lesson:
            return False
        await self.session.delete(lesson)
        await self.session.commit()
        return True

    async def update_learning_item(
        self,
        item_id: str,
        course_id: str,
        lesson_id: str,
        title: str,
        item_type: int,
        estimated_minutes: int,
        video_url: str,
        reading_markdown: str,
        vtt_subtitle_url: str | None = None,
        auto_transcribe: bool | None = None,
        in_video_quizzes: list | None = None,
        starter_code: str = "",
        test_cases_json: str = "",
        language: str = "",
        rubric_criteria_json: str = "",
        quiz_matrix_id: str = "",
        essay_grading_mode: str | None = None,
        required_peer_reviews: int | None = None,
        cold_start_hours: int | None = None,
        essay_max_attempts: int | None = None,
    ) -> LearningItem | None:
        _ = course_id
        stmt = (
            select(LearningItemModel)
            .options(
                selectinload(LearningItemModel.in_video_quizzes),
                selectinload(LearningItemModel.interactive_transcripts),
            )
            .where(LearningItemModel.id == item_id)
        )
        res = await self.session.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            return None

        item.title = title
        type_mapping = {
            1: ItemType.VIDEO,
            2: ItemType.READING,
            3: ItemType.PRACTICE_QUIZ,
            4: ItemType.GRADED_QUIZ,
            5: ItemType.AUTO_GRADED_LAB,
            6: ItemType.PEER_REVIEW,
        }
        item.type = type_mapping.get(item_type, ItemType.UNSPECIFIED)
        item.estimated_minutes = estimated_minutes
        item.video_url = video_url
        if vtt_subtitle_url is not None:
            item.vtt_subtitle_url = vtt_subtitle_url
        if auto_transcribe is not None:
            item.auto_transcribe = auto_transcribe
        item.reading_markdown = reading_markdown
        item.starter_code = starter_code
        item.test_cases_json = test_cases_json
        item.language = language
        item.rubric_criteria_json = rubric_criteria_json
        if quiz_matrix_id:
            item.quiz_matrix_id = quiz_matrix_id
        if essay_grading_mode is not None:
            item.essay_grading_mode = essay_grading_mode
        if required_peer_reviews is not None:
            item.required_peer_reviews = required_peer_reviews
        if cold_start_hours is not None:
            item.cold_start_hours = cold_start_hours
        if essay_max_attempts is not None:
            item.essay_max_attempts = essay_max_attempts

        if lesson_id:
            item.lesson_id = lesson_id

        if in_video_quizzes is not None:
            item.in_video_quizzes.clear()
            for q in in_video_quizzes:
                quiz_model = InVideoQuizModel(
                    item_id=item.id,
                    timestamp_seconds=getattr(q, "timestamp_seconds", 0),
                    question=getattr(q, "question", ""),
                    options=list(getattr(q, "options", [])),
                    correct_option_index=getattr(q, "correct_option_index", 0),
                    explanation=getattr(q, "explanation", ""),
                )
                item.in_video_quizzes.append(quiz_model)

        await self.session.commit()
        await self.session.refresh(item)

        transcripts = [
            InteractiveTranscript(timestamp_seconds=t.timestamp_seconds, text=t.text)
            for t in item.interactive_transcripts or []
        ]
        quizzes = [
            InVideoQuiz(
                timestamp_seconds=q.timestamp_seconds,
                question=q.question,
                options=q.options,
                correct_option_index=q.correct_option_index,
                explanation=q.explanation,
            )
            for q in item.in_video_quizzes or []
        ]

        return LearningItem(
            id=item.id,
            title=item.title,
            type=item.type,
            estimated_minutes=item.estimated_minutes,
            video_url=item.video_url,
            vtt_subtitle_url=item.vtt_subtitle_url,
            interactive_transcripts=transcripts,
            in_video_quizzes=quizzes,
            reading_markdown=item.reading_markdown,
            starter_code=item.starter_code,
            test_cases_json=item.test_cases_json,
            language=item.language,
            rubric_criteria_json=item.rubric_criteria_json,
            quiz_matrix_id=item.quiz_matrix_id,
            essay_grading_mode=getattr(item, "essay_grading_mode", "PEER_REVIEW")
            or "PEER_REVIEW",
            required_peer_reviews=getattr(item, "required_peer_reviews", 3) or 3,
            cold_start_hours=getattr(item, "cold_start_hours", 48) or 48,
        )

    async def delete_learning_item(self, item_id: str, course_id: str) -> bool:
        _ = course_id
        stmt = select(LearningItemModel).where(LearningItemModel.id == item_id)
        res = await self.session.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            return False
        await self.session.delete(item)
        await self.session.commit()
        return True

    async def create_course_announcement(
        self, course_id: str, author_id: str, author_name: str, title: str, content: str
    ) -> CourseAnnouncement:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        ann_id = f"ann_{uuid7().hex}"
        now_iso = datetime.now(UTC).isoformat()
        ann = CourseAnnouncementModel(
            id=ann_id,
            course_id=real_id,
            author_id=author_id,
            author_name=author_name,
            title=title,
            content=content,
            created_at=now_iso,
        )
        self.session.add(ann)
        await self.session.commit()
        return CourseAnnouncement(
            id=ann.id,
            course_id=ann.course_id,
            author_id=ann.author_id,
            author_name=ann.author_name,
            title=ann.title,
            content=ann.content,
            created_at=ann.created_at,
        )

    async def list_course_announcements(
        self, course_id: str
    ) -> list[CourseAnnouncement]:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        stmt = (
            select(CourseAnnouncementModel)
            .where(CourseAnnouncementModel.course_id == real_id)
            .order_by(CourseAnnouncementModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            CourseAnnouncement(
                id=m.id,
                course_id=m.course_id,
                author_id=m.author_id,
                author_name=m.author_name,
                title=m.title,
                content=m.content,
                created_at=m.created_at,
            )
            for m in models
        ]

    async def get_instructor_activity_timeline(
        self,
        course_ids: list[str],
        date_range: str,
        start_date: str = "",
        end_date: str = "",
        learner_filter: str = "all",
    ) -> InstructorActivityTimeline:
        def _parse_iso_dt(ts_str: str | None) -> datetime | None:
            if not ts_str:
                return None
            try:
                clean = ts_str.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=UTC)
                return dt.astimezone(UTC)
            except (ValueError, TypeError, OverflowError):
                return None

        now = datetime.now(UTC)
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=UTC)
        today_end = datetime(
            now.year, now.month, now.day, 23, 59, 59, 999999, tzinfo=UTC
        )

        normalized_range = (
            date_range
            if date_range in VALID_TIMELINE_DATE_RANGES
            else DEFAULT_TIMELINE_DATE_RANGE
        )

        buckets: list[tuple[datetime, datetime, str, str]] = []
        range_start: datetime
        range_end: datetime

        if normalized_range == "today":
            range_start = today_start
            range_end = today_end
            today_str = today_start.date().isoformat()
            hour_intervals = [
                (0, 3),
                (3, 6),
                (6, 9),
                (9, 12),
                (12, 15),
                (15, 18),
                (18, 21),
                (21, 24),
            ]
            for sh, eh in hour_intervals:
                b_start = today_start + timedelta(hours=sh)
                b_end = today_start + timedelta(hours=eh)
                ts_str = f"{today_str}T{sh:02d}:00:00Z"
                lbl = f"{sh:02d}h"
                buckets.append((b_start, b_end, ts_str, lbl))
        elif normalized_range == "7d":
            range_start = today_start - timedelta(days=6)
            range_end = today_end
            day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
            for i in range(7):
                b_start = range_start + timedelta(days=i)
                b_end = b_start + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = "Hôm nay" if i == 6 else day_names[b_start.weekday()]
                buckets.append((b_start, b_end, ts_str, lbl))
        elif normalized_range == "this_week":
            monday = today_start - timedelta(days=today_start.weekday())
            range_start = monday
            range_end = monday + timedelta(days=7) - timedelta(microseconds=1)
            day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
            for i in range(7):
                b_start = monday + timedelta(days=i)
                b_end = b_start + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = day_names[i]
                buckets.append((b_start, b_end, ts_str, lbl))
        elif normalized_range == "last_week":
            last_monday = today_start - timedelta(days=today_start.weekday() + 7)
            range_start = last_monday
            range_end = last_monday + timedelta(days=7) - timedelta(microseconds=1)
            day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
            for i in range(7):
                b_start = last_monday + timedelta(days=i)
                b_end = b_start + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = day_names[i]
                buckets.append((b_start, b_end, ts_str, lbl))
        elif normalized_range == "this_month":
            first_day = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=UTC)
            next_month_year = now.year + 1 if now.month == 12 else now.year
            next_month_num = 1 if now.month == 12 else now.month + 1
            next_month = datetime(
                next_month_year, next_month_num, 1, 0, 0, 0, tzinfo=UTC
            )
            range_start = first_day
            range_end = next_month - timedelta(microseconds=1)
            curr = first_day
            while curr < next_month:
                b_start = curr
                b_end = curr + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = f"{b_start.day:02d}/{b_start.month:02d}"
                buckets.append((b_start, b_end, ts_str, lbl))
                curr += timedelta(days=1)
        elif normalized_range == "last_month":
            lm_year = now.year - 1 if now.month == 1 else now.year
            lm_month = 12 if now.month == 1 else now.month - 1
            first_day = datetime(lm_year, lm_month, 1, 0, 0, 0, tzinfo=UTC)
            next_month = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=UTC)
            range_start = first_day
            range_end = next_month - timedelta(microseconds=1)
            curr = first_day
            while curr < next_month:
                b_start = curr
                b_end = curr + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = f"{b_start.day:02d}/{b_start.month:02d}"
                buckets.append((b_start, b_end, ts_str, lbl))
                curr += timedelta(days=1)
        elif normalized_range == "custom" and start_date and end_date:
            try:
                s_parts = [int(p) for p in start_date.split("-")]
                e_parts = [int(p) for p in end_date.split("-")]
                s_dt = datetime(s_parts[0], s_parts[1], s_parts[2], 0, 0, 0, tzinfo=UTC)
                e_dt = datetime(
                    e_parts[0], e_parts[1], e_parts[2], 23, 59, 59, 999999, tzinfo=UTC
                )
                if s_dt <= e_dt:
                    range_start = s_dt
                    range_end = e_dt
                    diff_days = (e_dt.date() - s_dt.date()).days + 1

                    if diff_days <= 31:
                        # 1. Hàng ngày (Daily step <= 31 ngày)
                        curr = s_dt
                        while curr <= e_dt:
                            b_start = curr
                            b_end = curr + timedelta(days=1)
                            ts_str = b_start.date().isoformat()
                            lbl = f"{b_start.day:02d}/{b_start.month:02d}"
                            buckets.append((b_start, b_end, ts_str, lbl))
                            curr += timedelta(days=1)
                    elif diff_days <= 180:
                        # 2. Hàng tuần (Weekly step 32 - 180 ngày)
                        curr = s_dt
                        while curr <= e_dt:
                            b_start = curr
                            b_end = min(
                                curr + timedelta(days=7),
                                e_dt + timedelta(microseconds=1),
                            )
                            ts_str = b_start.date().isoformat()
                            lbl = f"{b_start.day:02d}/{b_start.month:02d}"
                            buckets.append((b_start, b_end, ts_str, lbl))
                            curr += timedelta(days=7)
                    elif diff_days <= 1095:
                        # 3. Hàng tháng (Monthly step 181 - 1095 ngày / 6 tháng đến 3 năm)
                        cur_year = s_dt.year
                        cur_month = s_dt.month
                        end_year = e_dt.year
                        end_month = e_dt.month
                        same_year = s_dt.year == e_dt.year

                        while (cur_year < end_year) or (
                            cur_year == end_year and cur_month <= end_month
                        ):
                            m_start = datetime(
                                cur_year, cur_month, 1, 0, 0, 0, tzinfo=UTC
                            )
                            next_y = cur_year + 1 if cur_month == 12 else cur_year
                            next_m = 1 if cur_month == 12 else cur_month + 1
                            m_end = datetime(next_y, next_m, 1, 0, 0, 0, tzinfo=UTC)

                            b_start = max(s_dt, m_start)
                            b_end = min(e_dt, m_end - timedelta(microseconds=1))
                            ts_str = f"{cur_year}-{cur_month:02d}"
                            year_suffix = (
                                f"/{str(cur_year)[2:]}" if not same_year else ""
                            )
                            lbl = f"T{cur_month}{year_suffix}"
                            buckets.append((b_start, b_end, ts_str, lbl))

                            cur_year = next_y
                            cur_month = next_m
                    else:
                        # 4. Hàng năm (Yearly step > 3 năm)
                        for y in range(s_dt.year, e_dt.year + 1):
                            y_start = datetime(y, 1, 1, 0, 0, 0, tzinfo=UTC)
                            y_end = datetime(y, 12, 31, 23, 59, 59, 999999, tzinfo=UTC)
                            b_start = max(s_dt, y_start)
                            b_end = min(e_dt, y_end)
                            ts_str = str(y)
                            lbl = str(y)
                            buckets.append((b_start, b_end, ts_str, lbl))
                else:
                    normalized_range = "7d"
                    range_start = today_start - timedelta(days=6)
                    range_end = today_end
                    day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                    for i in range(7):
                        b_start = range_start + timedelta(days=i)
                        b_end = b_start + timedelta(days=1)
                        ts_str = b_start.date().isoformat()
                        lbl = "Hôm nay" if i == 6 else day_names[b_start.weekday()]
                        buckets.append((b_start, b_end, ts_str, lbl))
            except (ValueError, TypeError, OverflowError):
                normalized_range = "7d"
                range_start = today_start - timedelta(days=6)
                range_end = today_end
                day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                for i in range(7):
                    b_start = range_start + timedelta(days=i)
                    b_end = b_start + timedelta(days=1)
                    ts_str = b_start.date().isoformat()
                    lbl = "Hôm nay" if i == 6 else day_names[b_start.weekday()]
                    buckets.append((b_start, b_end, ts_str, lbl))
        else:
            range_start = today_start - timedelta(days=6)
            range_end = today_end
            day_names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
            for i in range(7):
                b_start = range_start + timedelta(days=i)
                b_end = b_start + timedelta(days=1)
                ts_str = b_start.date().isoformat()
                lbl = "Hôm nay" if i == 6 else day_names[b_start.weekday()]
                buckets.append((b_start, b_end, ts_str, lbl))

        if not course_ids:
            empty_timeline = [
                ActivityDataPoint(
                    timestamp=b[2],
                    label=b[3],
                    active_learners=0,
                    completed_items=0,
                    in_progress=0,
                )
                for b in buckets
            ]
            empty_heatmap = [
                HeatmapCell(
                    day=d,
                    time_slot=ts,
                    count=0,
                    is_peak=False,
                )
                for d in HEATMAP_DAYS
                for ts in HEATMAP_TIME_SLOTS
            ]
            return InstructorActivityTimeline(
                timeline=empty_timeline,
                heatmap=empty_heatmap,
                total_active_in_period=0,
            )

        from src.modules.learning.infrastructure.models import (
            LearningItemProgressModel,
            LearningProgressModel,
            PersonalNoteModel,
        )

        courses_stmt = select(CourseModel).where(CourseModel.id.in_(course_ids))
        courses_res = await self.session.execute(courses_stmt)
        c_models = courses_res.scalars().all()
        staff_ids: set[str] = set()
        for cm in c_models:
            if cm.owner_id:
                staff_ids.add(cm.owner_id)
            if cm.collaborators:
                for collab in cm.collaborators:
                    if collab.user_id:
                        staff_ids.add(collab.user_id)

        range_start_iso = range_start.isoformat()
        range_end_iso = range_end.isoformat()

        lp_stmt = select(LearningProgressModel).where(
            LearningProgressModel.course_id.in_(course_ids),
            or_(
                and_(
                    LearningProgressModel.last_accessed_at >= range_start_iso,
                    LearningProgressModel.last_accessed_at <= range_end_iso,
                ),
                and_(
                    LearningProgressModel.completed_at >= range_start_iso,
                    LearningProgressModel.completed_at <= range_end_iso,
                ),
                and_(
                    LearningProgressModel.enrolled_at >= range_start_iso,
                    LearningProgressModel.enrolled_at <= range_end_iso,
                ),
            ),
        )
        if staff_ids:
            lp_stmt = lp_stmt.where(LearningProgressModel.user_id.notin_(staff_ids))
        if learner_filter == "in_progress":
            lp_stmt = lp_stmt.where(
                LearningProgressModel.overall_progress_percent < 100.0
            )
        elif learner_filter == "completed":
            lp_stmt = lp_stmt.where(
                LearningProgressModel.overall_progress_percent >= 100.0
            )
        elif learner_filter in (
            "paid",
            "audit",
            "paid_in_progress",
            "paid_completed",
        ):
            from src.modules.certificate.infrastructure.models import FinancialAidModel
            from src.modules.identity.infrastructure.models import UserModel
            from src.modules.payment.infrastructure.models import (
                CoursePurchaseModel,
                UserSubscriptionModel,
            )

            p_stmt = select(CoursePurchaseModel.user_id).where(
                CoursePurchaseModel.course_id.in_(course_ids)
            )
            p_res = await self.session.execute(p_stmt)
            paid_uids = set(p_res.scalars().all())

            sub_stmt = select(UserSubscriptionModel.user_id).where(
                UserSubscriptionModel.status == "ACTIVE"
            )
            sub_res = await self.session.execute(sub_stmt)
            paid_uids.update(sub_res.scalars().all())

            ent_user_stmt = select(UserModel.id).where(
                UserModel.enterprise_seat_key.isnot(None),
                UserModel.enterprise_seat_key != "",
            )
            ent_user_res = await self.session.execute(ent_user_stmt)
            paid_uids.update(ent_user_res.scalars().all())

            fa_stmt = select(FinancialAidModel.user_id).where(
                FinancialAidModel.course_id.in_(course_ids),
                FinancialAidModel.status == "APPROVED",
            )
            fa_res = await self.session.execute(fa_stmt)
            paid_uids.update(fa_res.scalars().all())

            if learner_filter == "paid":
                lp_stmt = lp_stmt.where(LearningProgressModel.user_id.in_(paid_uids))
            elif learner_filter == "paid_in_progress":
                lp_stmt = lp_stmt.where(
                    LearningProgressModel.user_id.in_(paid_uids),
                    LearningProgressModel.overall_progress_percent < 100.0,
                )
            elif learner_filter == "paid_completed":
                lp_stmt = lp_stmt.where(
                    LearningProgressModel.user_id.in_(paid_uids),
                    LearningProgressModel.overall_progress_percent >= 100.0,
                )
            else:
                lp_stmt = lp_stmt.where(LearningProgressModel.user_id.notin_(paid_uids))

        lp_res = await self.session.execute(lp_stmt)
        progresses = lp_res.scalars().all()

        note_stmt = select(PersonalNoteModel).where(
            PersonalNoteModel.course_id.in_(course_ids),
            or_(
                and_(
                    PersonalNoteModel.created_at >= range_start_iso,
                    PersonalNoteModel.created_at <= range_end_iso,
                ),
                and_(
                    PersonalNoteModel.updated_at >= range_start_iso,
                    PersonalNoteModel.updated_at <= range_end_iso,
                ),
            ),
        )
        note_res = await self.session.execute(note_stmt)
        notes = note_res.scalars().all()

        item_stmt = select(LearningItemProgressModel).where(
            LearningItemProgressModel.course_id.in_(course_ids),
            LearningItemProgressModel.last_studied_at >= range_start_iso,
            LearningItemProgressModel.last_studied_at <= range_end_iso,
        )
        item_res = await self.session.execute(item_stmt)
        item_progresses = item_res.scalars().all()

        valid_user_ids = {p.user_id for p in progresses}
        user_is_completed = {
            p.user_id: (p.overall_progress_percent >= 100.0) for p in progresses
        }
        user_completed_items_count = {
            p.user_id: len(p.completed_item_ids or []) for p in progresses
        }

        user_events: list[tuple[str, datetime]] = []
        for p in progresses:
            dt_acc = _parse_iso_dt(p.last_accessed_at)
            if dt_acc:
                user_events.append((p.user_id, dt_acc))
            dt_comp = _parse_iso_dt(p.completed_at)
            if dt_comp:
                user_events.append((p.user_id, dt_comp))
            dt_enr = _parse_iso_dt(p.enrolled_at)
            if dt_enr:
                user_events.append((p.user_id, dt_enr))

        for n in notes:
            if n.user_id in valid_user_ids:
                dt_c = _parse_iso_dt(n.created_at)
                if dt_c:
                    user_events.append((n.user_id, dt_c))
                dt_u = _parse_iso_dt(n.updated_at)
                if dt_u:
                    user_events.append((n.user_id, dt_u))

        for ip in item_progresses:
            if ip.user_id in valid_user_ids:
                dt_s = _parse_iso_dt(ip.last_studied_at)
                if dt_s:
                    user_events.append((ip.user_id, dt_s))

        timeline_points: list[ActivityDataPoint] = []
        period_active_users: set[str] = set()

        for b_start, b_end, ts_str, lbl in buckets:
            bucket_users: set[str] = set()
            for uid, dt in user_events:
                if b_start <= dt < b_end:
                    bucket_users.add(uid)
                    period_active_users.add(uid)

            active_count = len(bucket_users)
            completed_items_in_bucket = sum(
                user_completed_items_count.get(uid, 0) for uid in bucket_users
            )
            in_prog_count = sum(
                1 for uid in bucket_users if not user_is_completed.get(uid, False)
            )
            timeline_points.append(
                ActivityDataPoint(
                    timestamp=ts_str,
                    label=lbl,
                    active_learners=active_count,
                    completed_items=completed_items_in_bucket,
                    in_progress=in_prog_count,
                )
            )

        day_labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        heatmap_counts: dict[tuple[str, str], set[str]] = {
            (d, s): set() for d in HEATMAP_DAYS for s in HEATMAP_TIME_SLOTS
        }

        for uid, dt in user_events:
            if range_start <= dt <= range_end:
                day_str = day_labels[dt.weekday()]
                h = dt.hour
                if 6 <= h < 12:
                    slot = "Sáng (06h-12h)"
                elif 12 <= h < 18:
                    slot = "Chiều (12h-18h)"
                elif 18 <= h < 22:
                    slot = "Tối (18h-22h)"
                elif 22 <= h or h < 2:
                    slot = "Đêm (22h-02h)"
                else:
                    slot = "Rạng sáng (02h-06h)"
                heatmap_counts[(day_str, slot)].add(uid)

        max_count = 0
        for d in HEATMAP_DAYS:
            for s in HEATMAP_TIME_SLOTS:
                cnt = len(heatmap_counts[(d, s)])
                max_count = max(max_count, cnt)

        heatmap_cells: list[HeatmapCell] = []
        for d in HEATMAP_DAYS:
            for s in HEATMAP_TIME_SLOTS:
                cnt = len(heatmap_counts[(d, s)])
                is_peak = cnt > 0 and cnt == max_count
                heatmap_cells.append(
                    HeatmapCell(
                        day=d,
                        time_slot=s,
                        count=cnt,
                        is_peak=is_peak,
                    )
                )

        return InstructorActivityTimeline(
            timeline=timeline_points,
            heatmap=heatmap_cells,
            total_active_in_period=len(period_active_users),
        )

    async def get_instructor_analytics(self, course_id: str) -> InstructorAnalytics:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        avg_rating, total_reviews = await self.get_course_rating_stats(real_id)

        # Exclude teaching personnel (owner_id, co_instructor_ids, ta_ids)
        staff_ids: set[str] = set()
        course_stmt = select(CourseModel.owner_id).where(CourseModel.id == real_id)
        course_res = await self.session.execute(course_stmt)
        owner_id = course_res.scalar_one_or_none()
        if owner_id:
            staff_ids.add(owner_id)

        collab_stmt = select(CourseCollaboratorModel.user_id).where(
            CourseCollaboratorModel.course_id == real_id
        )
        collab_res = await self.session.execute(collab_stmt)
        for uid in collab_res.scalars().all():
            if uid:
                staff_ids.add(uid)

        from src.modules.learning.infrastructure.models import (
            DailyLearningRecordModel,
            LearningItemProgressModel,
            LearningProgressModel,
            UserLearningStreakModel,
        )

        lp_stmt = select(LearningProgressModel).where(
            LearningProgressModel.course_id == real_id
        )
        if staff_ids:
            lp_stmt = lp_stmt.where(LearningProgressModel.user_id.notin_(staff_ids))
        lp_res = await self.session.execute(lp_stmt)
        progresses = lp_res.scalars().all()

        if not progresses:
            return InstructorAnalytics(
                id=f"analytics_{real_id}",
                course_id=real_id,
                total_enrolled_students=0,
                average_completion_rate=0.0,
                average_rating=avg_rating,
                review_count=total_reviews,
                students=[],
                paid_students_count=0,
                audit_students_count=0,
                total_learning_hours=0.0,
                course_average_quiz_score=0.0,
                paid_learning_hours=0.0,
                audit_learning_hours=0.0,
            )

        student_user_ids = [p.user_id for p in progresses if p.user_id not in staff_ids]

        # 1. Course items map: item_id -> title, cold_start_hours and count total items
        items_stmt = (
            select(
                LearningItemModel.id,
                LearningItemModel.title,
                LearningItemModel.cold_start_hours,
            )
            .join(LessonModel, LearningItemModel.lesson_id == LessonModel.id)
            .join(WeekModuleModel, LessonModel.week_module_id == WeekModuleModel.id)
            .where(WeekModuleModel.course_id == real_id)
        )
        items_res = await self.session.execute(items_stmt)
        course_items_map: dict[str, str] = {}
        course_item_cold_map: dict[str, int] = {}
        for row in items_res.all():
            course_items_map[row[0]] = row[1]
            course_item_cold_map[row[0]] = int(row[2] or 48)
        total_course_items = len(course_items_map)
        course_item_ids = set(course_items_map.keys())

        # 2. Batch query User identities
        from src.modules.identity.infrastructure.models import (
            EnterpriseLicenseModel,
            UserModel,
        )

        user_stmt = select(UserModel).where(UserModel.id.in_(student_user_ids))
        user_res = await self.session.execute(user_stmt)
        user_map = {u.id: u for u in user_res.scalars().all()}

        # 3. Batch query Access Tiers (Paid, Plus, Enterprise, Financial Aid)
        from src.modules.certificate.infrastructure.models import FinancialAidModel
        from src.modules.payment.infrastructure.models import (
            CoursePurchaseModel,
            UserSubscriptionModel,
        )

        now_dt = datetime.now(UTC)
        now_iso = now_dt.isoformat()

        # 3a. Course purchases
        purchases_stmt = select(CoursePurchaseModel.user_id).where(
            CoursePurchaseModel.user_id.in_(student_user_ids),
            CoursePurchaseModel.course_id == real_id,
            CoursePurchaseModel.status == "COMPLETED",
        )
        purchased_users = set(
            (await self.session.execute(purchases_stmt)).scalars().all()
        )

        # 3b. Active subscriptions (Coursera Plus)
        subs_stmt = select(UserSubscriptionModel.user_id).where(
            UserSubscriptionModel.user_id.in_(student_user_ids),
            UserSubscriptionModel.status == "ACTIVE",
            UserSubscriptionModel.expires_at >= now_iso,
        )
        subscribed_users = set((await self.session.execute(subs_stmt)).scalars().all())

        # 3c. Approved Financial Aid
        fa_stmt = select(FinancialAidModel.user_id).where(
            FinancialAidModel.user_id.in_(student_user_ids),
            FinancialAidModel.course_id == real_id,
            FinancialAidModel.status.in_(["APPROVED", "AUTO_APPROVED"]),
        )
        fa_users = set((await self.session.execute(fa_stmt)).scalars().all())

        # 3d. Enterprise licenses
        enterprise_keys = {
            u.enterprise_seat_key.strip().upper()
            for u in user_map.values()
            if u.enterprise_seat_key and u.enterprise_seat_key.strip()
        }
        valid_enterprise_keys: set[str] = set()
        if enterprise_keys:
            lic_stmt = select(EnterpriseLicenseModel).where(
                EnterpriseLicenseModel.key.in_(enterprise_keys),
                EnterpriseLicenseModel.is_active.is_(True),
            )
            lic_res = await self.session.execute(lic_stmt)
            for lic in lic_res.scalars().all():
                allowed_courses = set(lic.allowed_course_ids or [])
                if (
                    lic.scope_type == "ALL_COURSES"
                    or not allowed_courses
                    or real_id in allowed_courses
                ):
                    valid_enterprise_keys.add(lic.key)

        # 4. Batch query Time Spent per student on this course
        time_stmt = (
            select(
                LearningItemProgressModel.user_id,
                func.sum(LearningItemProgressModel.time_spent_seconds),
            )
            .where(
                LearningItemProgressModel.user_id.in_(student_user_ids),
                LearningItemProgressModel.course_id == real_id,
            )
            .group_by(LearningItemProgressModel.user_id)
        )
        time_res = await self.session.execute(time_stmt)
        time_spent_map = {row[0]: int(row[1] or 0) for row in time_res.all()}

        # 5. Batch query Assessments (Quiz submissions & Cooldowns & Peer review duty)
        from src.modules.assessment.infrastructure.models import (
            PeerAssignmentSubmissionModel,
            QuizCooldownModel,
            QuizSubmissionModel,
        )

        quiz_scores_map: dict[str, list[float]] = {}
        if course_item_ids:
            quiz_stmt = select(
                QuizSubmissionModel.user_id,
                QuizSubmissionModel.score_percent,
            ).where(
                QuizSubmissionModel.user_id.in_(student_user_ids),
                QuizSubmissionModel.item_id.in_(course_item_ids),
            )
            quiz_res = await self.session.execute(quiz_stmt)
            for uid, score in quiz_res.all():
                quiz_scores_map.setdefault(uid, []).append(float(score or 0.0))

        # Cooldowns
        cooldown_map: dict[str, str] = {}
        if course_item_ids:
            cd_stmt = select(
                QuizCooldownModel.user_id,
                QuizCooldownModel.cooldown_until,
            ).where(
                QuizCooldownModel.user_id.in_(student_user_ids),
                QuizCooldownModel.item_id.in_(course_item_ids),
                QuizCooldownModel.cooldown_until.isnot(None),
                QuizCooldownModel.cooldown_until > now_iso,
            )
            cd_res = await self.session.execute(cd_stmt)
            for uid, cd_until in cd_res.all():
                if cd_until:
                    cooldown_map[uid] = str(cd_until)

        # Peer assignment duty & Overdue check
        peer_duty_map: dict[str, str] = {}
        peer_overdue_map: dict[str, bool] = {}
        if course_item_ids:
            peer_stmt = select(
                PeerAssignmentSubmissionModel.user_id,
                PeerAssignmentSubmissionModel.review_duty_status,
                PeerAssignmentSubmissionModel.created_at,
                PeerAssignmentSubmissionModel.item_id,
            ).where(
                PeerAssignmentSubmissionModel.user_id.in_(student_user_ids),
                PeerAssignmentSubmissionModel.item_id.in_(course_item_ids),
            )
            peer_res = await self.session.execute(peer_stmt)
            for uid, duty, sub_created, p_item_id in peer_res.all():
                curr = peer_duty_map.get(uid)
                val = str(duty or "PENDING")
                # Priority: PENDING > WAITING_POOL > others
                if curr is None:
                    peer_duty_map[uid] = val
                elif curr == "PENDING" or val == "PENDING":
                    peer_duty_map[uid] = "PENDING"
                elif curr == "WAITING_POOL" or val == "WAITING_POOL":
                    peer_duty_map[uid] = "WAITING_POOL"
                elif val == "COMPLETED":
                    peer_duty_map[uid] = "COMPLETED"
                else:
                    peer_duty_map[uid] = val

                # Check if overdue based on instructor's cold_start_hours
                if val == "PENDING" and sub_created:
                    item_cold_hours = course_item_cold_map.get(p_item_id, 48)
                    try:
                        sub_dt = datetime.fromisoformat(str(sub_created))
                        if sub_dt.tzinfo is None:
                            sub_dt = sub_dt.replace(tzinfo=UTC)
                        if (now_dt - sub_dt) > timedelta(hours=item_cold_hours):
                            peer_overdue_map[uid] = True
                    except (ValueError, TypeError):
                        logger.debug(
                            "Không thể phân tích thời điểm nộp bài peer review: %s",
                            sub_created,
                        )

        # 6. Batch query 30-day Daily activities & Streaks
        thirty_days_ago = (
            now_dt - timedelta(days=STUDENT_DAILY_ACTIVITY_DAYS_WINDOW)
        ).date()
        daily_stmt = (
            select(DailyLearningRecordModel)
            .where(
                DailyLearningRecordModel.user_id.in_(student_user_ids),
                DailyLearningRecordModel.study_date >= thirty_days_ago,
            )
            .order_by(DailyLearningRecordModel.study_date.asc())
        )
        daily_res = await self.session.execute(daily_stmt)
        daily_map: dict[str, list[StudentDailyActivity]] = {}
        for rec in daily_res.scalars().all():
            daily_map.setdefault(rec.user_id, []).append(
                StudentDailyActivity(
                    study_date=rec.study_date.isoformat(),
                    total_seconds=rec.total_seconds,
                    is_streak_qualified=rec.is_streak_qualified,
                )
            )

        streak_stmt = select(UserLearningStreakModel).where(
            UserLearningStreakModel.user_id.in_(student_user_ids)
        )
        streak_res = await self.session.execute(streak_stmt)
        streak_map = {s.user_id: s for s in streak_res.scalars().all()}

        # Build EnrolledStudent list
        students: list[EnrolledStudent] = []
        sum_progress = 0.0
        total_time_spent_all = 0
        paid_time_spent_all = 0
        audit_time_spent_all = 0
        paid_count = 0
        audit_count = 0
        all_quiz_scores: list[float] = []

        for p in progresses:
            if p.user_id in staff_ids:
                continue

            sum_progress += p.overall_progress_percent
            u = user_map.get(p.user_id)
            u_name = (
                u.full_name
                if u and u.full_name
                else (
                    u.email.split("@")[0]
                    if u and u.email
                    else f"Học viên #{p.user_id[:6]}"
                )
            )
            u_email = u.email if u else ""
            enrolled_at_str = p.enrolled_at or ""
            last_accessed_at_str = p.last_accessed_at or ""
            last_item_title = course_items_map.get(p.last_accessed_item_id or "", "")
            completed_count = len(p.completed_item_ids or [])

            # Determine enrollment tier
            user_ent_key = (u.enterprise_seat_key or "").strip().upper() if u else ""
            if p.user_id in purchased_users:
                tier = "PAID"
            elif p.user_id in subscribed_users:
                tier = "PLUS"
            elif user_ent_key and user_ent_key in valid_enterprise_keys:
                tier = "ENTERPRISE"
            elif p.user_id in fa_users:
                tier = "FINANCIAL_AID"
            else:
                tier = "AUDIT"

            t_spent = time_spent_map.get(p.user_id, 0)
            total_time_spent_all += t_spent
            if tier in ("PAID", "PLUS", "ENTERPRISE", "FINANCIAL_AID"):
                paid_count += 1
                paid_time_spent_all += t_spent
            else:
                audit_count += 1
                audit_time_spent_all += t_spent

            q_scores = quiz_scores_map.get(p.user_id, [])
            q_attempts = len(q_scores)
            avg_q_score = (
                round(
                    sum(q_scores) / (len(q_scores) * QUIZ_PERCENT_TO_SCORE_DIVISOR), 1
                )
                if q_scores
                else 0.0
            )
            if q_scores:
                all_quiz_scores.append(avg_q_score)

            cd_until = cooldown_map.get(p.user_id, "")
            is_cooldown = bool(cd_until)
            peer_duty = peer_duty_map.get(p.user_id, "NONE")
            is_peer_overdue = peer_overdue_map.get(p.user_id, False)

            d_acts = daily_map.get(p.user_id, [])
            stk = streak_map.get(p.user_id)
            c_streak = stk.current_streak if stk else 0
            l_streak = stk.longest_streak if stk else 0

            students.append(
                EnrolledStudent(
                    user_id=p.user_id,
                    user_name=u_name,
                    user_email=u_email,
                    progress_percent=round(p.overall_progress_percent, 1),
                    enrolled_at=enrolled_at_str,
                    enrollment_type=tier,
                    total_time_spent_seconds=t_spent,
                    last_accessed_at=last_accessed_at_str,
                    last_accessed_item_title=last_item_title,
                    average_quiz_score=avg_q_score,
                    quiz_attempts_count=q_attempts,
                    is_in_cooldown=is_cooldown,
                    cooldown_until=cd_until,
                    peer_review_duty_status=peer_duty,
                    completed_items_count=completed_count,
                    total_course_items=total_course_items,
                    daily_activities=d_acts,
                    current_streak=c_streak,
                    longest_streak=l_streak,
                    is_peer_review_overdue=is_peer_overdue,
                )
            )

        total_students = len(students)
        avg_completion = (
            round(sum_progress / total_students, 1) if total_students > 0 else 0.0
        )
        total_learning_hours = round(total_time_spent_all / SECONDS_PER_HOUR, 1)
        paid_learning_hours = round(paid_time_spent_all / SECONDS_PER_HOUR, 1)
        audit_learning_hours = round(audit_time_spent_all / SECONDS_PER_HOUR, 1)
        course_avg_quiz = (
            round(sum(all_quiz_scores) / len(all_quiz_scores), 1)
            if all_quiz_scores
            else 0.0
        )

        return InstructorAnalytics(
            id=f"analytics_{real_id}",
            course_id=real_id,
            total_enrolled_students=total_students,
            average_completion_rate=avg_completion,
            average_rating=avg_rating,
            review_count=total_reviews,
            students=students,
            paid_students_count=paid_count,
            audit_students_count=audit_count,
            total_learning_hours=total_learning_hours,
            course_average_quiz_score=course_avg_quiz,
            paid_learning_hours=paid_learning_hours,
            audit_learning_hours=audit_learning_hours,
        )

    async def reorder_week_modules(
        self, course_id: str, ordered_week_module_ids: list[str]
    ) -> bool:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        for idx, wm_id in enumerate(ordered_week_module_ids, start=1):
            stmt = (
                select(WeekModuleModel)
                .where(WeekModuleModel.id == wm_id)
                .where(WeekModuleModel.course_id == real_id)
            )
            res = await self.session.execute(stmt)
            wm = res.scalar_one_or_none()
            if wm:
                wm.week_number = idx
        await self.session.commit()
        return True

    async def reorder_lessons(
        self, course_id: str, week_module_id: str, ordered_lesson_ids: list[str]
    ) -> bool:
        _ = course_id
        for idx, lesson_id in enumerate(ordered_lesson_ids):
            stmt = select(LessonModel).where(
                LessonModel.id == lesson_id,
                LessonModel.week_module_id == week_module_id,
            )
            res = await self.session.execute(stmt)
            lesson = res.scalar_one_or_none()
            if lesson:
                lesson.order_index = idx
        await self.session.commit()
        return True

    async def reorder_learning_items(
        self, course_id: str, lesson_id: str, ordered_item_ids: list[str]
    ) -> bool:
        _ = course_id
        for idx, item_id in enumerate(ordered_item_ids):
            stmt = (
                select(LearningItemModel)
                .where(LearningItemModel.id == item_id)
                .where(LearningItemModel.lesson_id == lesson_id)
            )
            res = await self.session.execute(stmt)
            item = res.scalar_one_or_none()
            if item:
                item.order_index = idx
        await self.session.commit()
        return True

    async def add_course_collaborator(
        self, course_id: str, user_id: str, role: str = "co_instructor"
    ) -> bool:
        stmt = select(CourseCollaboratorModel).where(
            CourseCollaboratorModel.course_id == course_id,
            CourseCollaboratorModel.user_id == user_id,
        )
        res = await self.session.execute(stmt)
        collab = res.scalar_one_or_none()
        if collab:
            collab.role = role
        else:
            collab = CourseCollaboratorModel(
                id=f"collab_{uuid7().hex}",
                course_id=course_id,
                user_id=user_id,
                role=role,
                created_at=datetime.now(UTC).isoformat(),
            )
            self.session.add(collab)
        await self.session.commit()
        return True

    async def remove_course_collaborator(self, course_id: str, user_id: str) -> bool:
        stmt = select(CourseCollaboratorModel).where(
            CourseCollaboratorModel.course_id == course_id,
            CourseCollaboratorModel.user_id == user_id,
        )
        res = await self.session.execute(stmt)
        collab = res.scalar_one_or_none()
        if not collab:
            return False
        await self.session.delete(collab)
        await self.session.commit()
        return True

    async def list_course_collaborators_with_details(
        self, course_id: str
    ) -> list[dict]:
        from src.modules.identity.infrastructure.models import UserModel

        stmt = (
            select(CourseCollaboratorModel, UserModel)
            .join(UserModel, UserModel.id == CourseCollaboratorModel.user_id)
            .where(CourseCollaboratorModel.course_id == course_id)
        )
        res = await self.session.execute(stmt)
        rows = res.all()
        result = []
        for collab_model, user_model in rows:
            result.append(
                {
                    "collaborator_id": collab_model.id,
                    "user_id": user_model.id,
                    "email": user_model.email,
                    "full_name": user_model.full_name,
                    "avatar_url": user_model.avatar_url or "",
                    "role": collab_model.role,
                    "added_at": collab_model.created_at or "",
                }
            )
        return result

    async def create_audit_log(
        self,
        course_id: str,
        actor_id: str,
        target_user_id: str,
        action: str,
        details: str = "",
    ) -> CourseAuditLogModel:
        now_str = datetime.now(UTC).isoformat()
        log_model = CourseAuditLogModel(
            id=f"calog_{uuid7().hex}",
            course_id=course_id,
            actor_id=actor_id,
            target_user_id=target_user_id,
            action=action,
            details=details,
            created_at=now_str,
        )
        self.session.add(log_model)
        await self.session.flush()
        return log_model

    async def list_audit_logs(self, course_id: str, limit: int = 100) -> list[dict]:
        stmt = (
            select(CourseAuditLogModel)
            .where(CourseAuditLogModel.course_id == course_id)
            .order_by(CourseAuditLogModel.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        logs = res.scalars().all()
        if not logs:
            return []

        user_ids = set()
        for item in logs:
            user_ids.add(item.actor_id)
            user_ids.add(item.target_user_id)

        user_names = {}
        if user_ids:
            user_stmt = select(UserModel.id, UserModel.full_name).where(
                UserModel.id.in_(list(user_ids))
            )
            user_res = await self.session.execute(user_stmt)
            user_names = dict(user_res.all())

        return [
            {
                "id": item.id,
                "course_id": item.course_id,
                "actor_id": item.actor_id,
                "actor_name": user_names.get(item.actor_id, "Hệ thống"),
                "target_user_id": item.target_user_id,
                "target_user_name": user_names.get(item.target_user_id, "Thành viên"),
                "action": item.action,
                "details": item.details or "",
                "created_at": item.created_at,
            }
            for item in logs
        ]

    async def get_enrolled_user_ids(self, course_ids: list[str]) -> list[str]:
        if not course_ids:
            return []
        from src.modules.learning.infrastructure.models import LearningProgressModel

        stmt = select(LearningProgressModel.user_id).where(
            LearningProgressModel.course_id.in_(course_ids)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def clear_course_outline(self, course_id: str) -> bool:
        from src.modules.catalog.infrastructure.models import WeekModuleModel

        stmt = select(WeekModuleModel).where(WeekModuleModel.course_id == course_id)
        res = await self.session.execute(stmt)
        for wm in res.scalars().all():
            await self.session.delete(wm)
        await self.session.commit()
        return True

    async def get_quiz_questions_for_export(self, quiz_matrix_id: str) -> list[dict]:
        if not quiz_matrix_id:
            return []
        try:
            from src.modules.assessment.infrastructure.models import QuestionModel

            stmt = (
                select(QuestionModel)
                .options(selectinload(QuestionModel.options))
                .where(QuestionModel.bank_id == quiz_matrix_id)
            )
            res = await self.session.execute(stmt)
            questions = res.scalars().all()
            return [
                {
                    "id": q.id,
                    "question": q.text,
                    "options": [opt.option_text for opt in q.options]
                    if hasattr(q, "options") and q.options
                    else [],
                    "correctOptionIndex": 0,
                    "explanation": q.explanation or "",
                }
                for q in questions
            ]
        except Exception as e:  # noqa: BLE001  # noqa: BLE001
            logger.warning(
                "Failed to export quiz questions for matrix %s: %s",
                quiz_matrix_id,
                e,
            )
            return []

    async def bookmark_course(
        self, user_id: str, course_id: str
    ) -> CourseBookmark | None:
        course = await self.get_course_detail(course_id)
        if not course:
            return None
        real_course_id = course.id

        stmt = select(CourseBookmarkModel).where(
            CourseBookmarkModel.user_id == user_id,
            CourseBookmarkModel.course_id == real_course_id,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return CourseBookmark(
                id=existing.id,
                user_id=existing.user_id,
                course_id=existing.course_id,
                created_at=existing.created_at,
                course=course,
            )

        bookmark_id = f"bm-{uuid7().hex}"
        now_str = datetime.now(UTC).isoformat()
        bookmark_model = CourseBookmarkModel(
            id=bookmark_id,
            user_id=user_id,
            course_id=real_course_id,
            created_at=now_str,
        )
        self.session.add(bookmark_model)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            res = await self.session.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                return CourseBookmark(
                    id=existing.id,
                    user_id=existing.user_id,
                    course_id=existing.course_id,
                    created_at=existing.created_at,
                    course=course,
                )
            raise

        return CourseBookmark(
            id=bookmark_id,
            user_id=user_id,
            course_id=real_course_id,
            created_at=now_str,
            course=course,
        )

    async def unbookmark_course(self, user_id: str, course_id: str) -> bool:
        stmt = (
            select(CourseBookmarkModel)
            .outerjoin(CourseModel, CourseBookmarkModel.course_id == CourseModel.id)
            .where(
                CourseBookmarkModel.user_id == user_id,
                (CourseBookmarkModel.course_id == course_id)
                | (CourseModel.slug == course_id),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return False
        await self.session.delete(model)
        await self.session.commit()
        return True

    async def is_course_bookmarked(self, user_id: str, course_id: str) -> bool:
        stmt = (
            select(CourseBookmarkModel.id)
            .outerjoin(CourseModel, CourseBookmarkModel.course_id == CourseModel.id)
            .where(
                CourseBookmarkModel.user_id == user_id,
                (CourseBookmarkModel.course_id == course_id)
                | (CourseModel.slug == course_id),
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def list_user_bookmarks(self, user_id: str) -> list[CourseBookmark]:
        stmt = (
            select(CourseBookmarkModel)
            .where(CourseBookmarkModel.user_id == user_id)
            .options(selectinload(CourseBookmarkModel.course))
            .order_by(CourseBookmarkModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        bookmarks = []
        for m in models:
            course_domain = _model_to_domain_course(m.course) if m.course else None
            bookmarks.append(
                CourseBookmark(
                    id=m.id,
                    user_id=m.user_id,
                    course_id=m.course_id,
                    created_at=m.created_at,
                    course=course_domain,
                )
            )
        bookmark_courses = [b.course for b in bookmarks if b.course is not None]
        if bookmark_courses:
            await self._hydrate_instructor_names(bookmark_courses)
        return bookmarks

    async def record_search_query(
        self,
        user_id: str,
        query: str,
        filters_json: str = "",
        result_count: int = 0,
    ) -> bool:
        if not user_id:
            return False

        cleaned_query = (query or "").strip()
        if len(cleaned_query) < MIN_SEARCH_QUERY_LENGTH:
            return False

        cleaned_query = cleaned_query[:MAX_SEARCH_QUERY_LENGTH]
        safe_result_count = max(int(result_count), 0)
        now_dt = datetime.now(UTC)
        now_str = now_dt.isoformat()

        # Check last search entry for prefix-update throttling
        stmt = (
            select(UserSearchHistoryModel)
            .where(UserSearchHistoryModel.user_id == user_id)
            .order_by(UserSearchHistoryModel.created_at.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        latest = res.scalars().first()

        if latest:
            try:
                latest_dt = datetime.fromisoformat(latest.created_at)
                if latest_dt.tzinfo is None:
                    latest_dt = latest_dt.replace(tzinfo=UTC)
                elapsed = abs((now_dt - latest_dt).total_seconds())
            except (ValueError, TypeError, OverflowError):
                elapsed = 999999.0

            old_q = latest.search_query.strip()
            if elapsed <= SEARCH_HISTORY_THROTTLE_SECONDS and (
                cleaned_query.startswith(old_q) or old_q.startswith(cleaned_query)
            ):
                latest.search_query = cleaned_query
                latest.filters_json = filters_json or ""
                latest.result_count = safe_result_count
                latest.created_at = now_str
                await self.session.commit()
                return True

        new_record = UserSearchHistoryModel(
            id=uuid7().hex,
            user_id=user_id,
            search_query=cleaned_query,
            filters_json=filters_json or "",
            result_count=safe_result_count,
            created_at=now_str,
        )
        self.session.add(new_record)
        await self.session.commit()
        return True

    async def list_scoped_course_ids(self) -> list[str]:
        stmt = apply_organization_scope(
            select(CourseModel.id), CourseModel, get_current_user()
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_admin_catalog_stats(self) -> AdminCatalogStats:
        current_user = get_current_user()
        scoped_courses_sq = apply_organization_scope(
            select(CourseModel.id, CourseModel.status), CourseModel, current_user
        ).subquery()

        course_sq = (
            select(
                func.count().label("total_courses"),
                func.count()
                .filter(scoped_courses_sq.c.status == CourseStatus.PUBLISHED)
                .label("published_courses"),
                func.count()
                .filter(scoped_courses_sq.c.status == CourseStatus.PENDING_REVIEW)
                .label("pending_review_courses"),
                func.count()
                .filter(scoped_courses_sq.c.status == CourseStatus.DRAFT)
                .label("draft_courses"),
                func.count()
                .filter(scoped_courses_sq.c.status == CourseStatus.REJECTED)
                .label("rejected_courses"),
            )
            .select_from(scoped_courses_sq)
            .subquery()
        )

        category_sq = select(func.count(CategoryModel.id)).scalar_subquery()

        review_sq = (
            select(
                func.count(CourseReviewModel.id).label("total_reviews"),
                func.coalesce(
                    func.round(
                        func.cast(func.avg(CourseReviewModel.rating_stars), Numeric),
                        RATING_ROUND_DECIMALS,
                    ),
                    0.0,
                ).label("average_rating"),
                func.count()
                .filter(CourseReviewModel.rating_stars == 1)
                .label("stars_1"),
                func.count()
                .filter(CourseReviewModel.rating_stars == 2)
                .label("stars_2"),
                func.count()
                .filter(CourseReviewModel.rating_stars == 3)
                .label("stars_3"),
                func.count()
                .filter(CourseReviewModel.rating_stars == 4)
                .label("stars_4"),
                func.count()
                .filter(CourseReviewModel.rating_stars == 5)
                .label("stars_5"),
            )
            .select_from(CourseReviewModel)
            .join(
                scoped_courses_sq,
                scoped_courses_sq.c.id == CourseReviewModel.course_id,
            )
            .subquery()
        )

        agg_stmt = (
            select(
                course_sq.c.total_courses,
                course_sq.c.published_courses,
                course_sq.c.pending_review_courses,
                course_sq.c.draft_courses,
                course_sq.c.rejected_courses,
                category_sq.label("category_count"),
                review_sq.c.total_reviews,
                review_sq.c.average_rating,
                review_sq.c.stars_1,
                review_sq.c.stars_2,
                review_sq.c.stars_3,
                review_sq.c.stars_4,
                review_sq.c.stars_5,
            )
            .select_from(course_sq)
            .join(review_sq, true())
        )
        row = (await self.session.execute(agg_stmt)).one()

        low_stmt = (
            apply_organization_scope(
                select(
                    CourseReviewModel,
                    CourseModel.title.label("course_title"),
                    func.count().over().label("total_count"),
                ).join(CourseModel, CourseModel.id == CourseReviewModel.course_id),
                CourseModel,
                current_user,
            )
            .outerjoin(
                LowReviewAcknowledgementModel,
                LowReviewAcknowledgementModel.review_id == CourseReviewModel.id,
            )
            .where(
                CourseReviewModel.rating_stars <= ADMIN_LOW_RATING_MAX_STARS,
                or_(
                    LowReviewAcknowledgementModel.review_id.is_(None),
                    CourseReviewModel.created_at
                    > LowReviewAcknowledgementModel.acknowledged_at,
                ),
            )
            .order_by(CourseReviewModel.created_at.desc())
            .limit(ADMIN_LOW_REVIEW_ALERT_LIMIT)
        )
        low_rows = (await self.session.execute(low_stmt)).all()
        low_review_total = int(low_rows[0].total_count) if low_rows else 0
        low_reviews = tuple(
            AdminLowReviewAlert(
                review_id=rev.id,
                course_id=rev.course_id,
                course_title=course_title or "",
                user_name=rev.user_name or "",
                rating_stars=int(rev.rating_stars),
                comment_text=rev.comment_text or "",
                created_at=rev.created_at or "",
            )
            for rev, course_title, _ in low_rows
        )

        return AdminCatalogStats(
            total_courses=int(row.total_courses),
            published_courses=int(row.published_courses),
            pending_review_courses=int(row.pending_review_courses),
            draft_courses=int(row.draft_courses),
            rejected_courses=int(row.rejected_courses),
            category_count=int(row.category_count),
            total_reviews=int(row.total_reviews),
            average_rating=float(row.average_rating),
            rating_distribution=(
                int(row.stars_1),
                int(row.stars_2),
                int(row.stars_3),
                int(row.stars_4),
                int(row.stars_5),
            ),
            low_reviews=low_reviews,
            low_review_total=low_review_total,
        )

    async def get_admin_review_trend(
        self, window: list[str]
    ) -> list[AdminCatalogTrendPoint]:
        if not window:
            return []

        review_day = func.substr(
            CourseReviewModel.created_at, 1, TREND_DATE_PREFIX_LEN
        ).label("day")
        stmt = (
            apply_organization_scope(
                select(
                    review_day,
                    func.count(CourseReviewModel.id).label("review_count"),
                    func.avg(CourseReviewModel.rating_stars).label("average_rating"),
                ).join(CourseModel, CourseModel.id == CourseReviewModel.course_id),
                CourseModel,
                get_current_user(),
            )
            .where(CourseReviewModel.created_at >= window[0])
            .group_by(review_day)
        )
        by_day = {
            row.day: (int(row.review_count), float(row.average_rating or 0.0))
            for row in (await self.session.execute(stmt)).all()
        }
        return [
            AdminCatalogTrendPoint(
                date=day,
                review_count=by_day.get(day, (0, 0.0))[0],
                average_rating=round(
                    by_day.get(day, (0, 0.0))[1], RATING_ROUND_DECIMALS
                ),
            )
            for day in window
        ]

    async def list_admin_course_summaries(
        self,
        search_query: str = "",
        status: CourseStatus | None = None,
    ) -> list[AdminCourseSummaryRow]:
        stmt = apply_organization_scope(
            select(
                CourseModel.id,
                CourseModel.title,
                CourseModel.partner_name,
                CourseModel.status,
                CourseModel.average_rating,
                CourseModel.review_count,
            ),
            CourseModel,
            get_current_user(),
        )
        if search_query:
            pattern = escape_like_pattern(search_query)
            stmt = stmt.where(
                or_(
                    CourseModel.title.ilike(pattern, escape="\\"),
                    CourseModel.partner_name.ilike(pattern, escape="\\"),
                )
            )
        if status is not None:
            stmt = stmt.where(CourseModel.status == status)

        rows = (await self.session.execute(stmt)).all()
        return [
            AdminCourseSummaryRow(
                course_id=str(r.id),
                title=r.title or "",
                partner_name=r.partner_name or "",
                status=r.status
                if isinstance(r.status, CourseStatus)
                else CourseStatus(str(r.status)),
                average_rating=float(r.average_rating or 0.0),
                review_count=int(r.review_count or 0),
            )
            for r in rows
        ]

    async def acknowledge_low_review(self, review_id: str, admin_id: str) -> bool:
        exists_stmt = apply_organization_scope(
            select(CourseReviewModel.id)
            .join(CourseModel, CourseModel.id == CourseReviewModel.course_id)
            .where(CourseReviewModel.id == review_id),
            CourseModel,
            get_current_user(),
        )
        if (await self.session.execute(exists_stmt)).scalar_one_or_none() is None:
            return False

        now_iso = datetime.now(UTC).isoformat()
        upsert_stmt = (
            pg_insert(LowReviewAcknowledgementModel)
            .values(
                review_id=review_id,
                acknowledged_by=admin_id,
                acknowledged_at=now_iso,
            )
            .on_conflict_do_update(
                index_elements=[LowReviewAcknowledgementModel.review_id],
                set_={
                    "acknowledged_by": admin_id,
                    "acknowledged_at": now_iso,
                },
            )
        )
        await self.session.execute(upsert_stmt)
        await self.session.flush()
        return True

    async def get_instructor_student_dossier(
        self, course_id: str, student_id: str
    ) -> InstructorStudentDossier:
        from src.modules.assessment.domain import (
            DEFAULT_PASSING_THRESHOLD_PERCENT,
            REQUIRED_PEER_REVIEWS_COUNT,
            REVIEW_DUTY_PENDING,
            is_practice_quiz_item,
            normalize_grade_provenance,
            resolve_peer_effective_grade,
        )
        from src.modules.assessment.infrastructure.models import (
            LabSubmissionModel,
            PeerAssignmentSubmissionModel,
            PeerReviewModel,
            QuizCooldownModel,
            QuizMatrixModel,
            QuizSubmissionModel,
        )
        from src.modules.learning.domain import MIN_DAILY_STUDY_SECONDS_FOR_STREAK
        from src.modules.learning.infrastructure.models import (
            DailyCourseItemRecordModel,
            LearningItemProgressModel,
            LearningProgressModel,
        )

        real_id = await self.get_course_id_by_slug_or_id(course_id)
        now_iso = datetime.now(UTC).isoformat()

        # 1. Query ordered syllabus items with week info
        syllabus_stmt = (
            select(
                LearningItemModel,
                WeekModuleModel.week_number,
                WeekModuleModel.title,
            )
            .join(LessonModel, LessonModel.id == LearningItemModel.lesson_id)
            .join(WeekModuleModel, WeekModuleModel.id == LessonModel.week_module_id)
            .where(WeekModuleModel.course_id == real_id)
            .order_by(
                WeekModuleModel.week_number.asc(),
                LessonModel.order_index.asc(),
                LearningItemModel.order_index.asc(),
            )
        )
        syllabus_rows = (await self.session.execute(syllabus_stmt)).all()

        ordered_items: list[tuple[LearningItemModel, int, str]] = [
            (row[0], int(row[1] or 1), str(row[2] or f"Tuần {row[1] or 1}"))
            for row in syllabus_rows
        ]
        item_meta: dict[str, tuple[LearningItemModel, int, str]] = {
            it.id: (it, wk_num, wk_title) for it, wk_num, wk_title in ordered_items
        }
        all_item_ids = list(item_meta.keys())

        # 2. Query student LearningProgress in this course
        lp_stmt = select(LearningProgressModel).where(
            LearningProgressModel.user_id == student_id,
            LearningProgressModel.course_id == real_id,
        )
        lp = (await self.session.execute(lp_stmt)).scalar_one_or_none()
        enrolled_at = (lp.enrolled_at or "") if lp else ""
        completed_ids = set(lp.completed_item_ids or []) if lp else set()
        last_accessed_id = (lp.last_accessed_item_id or "") if lp else ""

        furthest_item_title = ""
        furthest_week_number = 0
        for it, wk_num, _ in ordered_items:
            if it.id in completed_ids:
                furthest_item_title = it.title
                furthest_week_number = wk_num

        if not furthest_item_title and ordered_items:
            first_it, first_wk, _ = ordered_items[0]
            furthest_item_title = first_it.title
            furthest_week_number = first_wk

        last_accessed_item_title = ""
        last_accessed_week_number = 0
        if last_accessed_id and last_accessed_id in item_meta:
            acc_it, acc_wk, _ = item_meta[last_accessed_id]
            last_accessed_item_title = acc_it.title
            last_accessed_week_number = acc_wk

        # 3. Query assessments (graded items + submitted practice quizzes) ordered by week
        quiz_rows_by_item: dict[str, list[QuizSubmissionModel]] = {}
        quiz_thresholds: dict[str, float] = {}
        cooldown_items: set[str] = set()
        lab_rows_by_item: dict[str, list[LabSubmissionModel]] = {}
        peer_sub_by_item: dict[str, PeerAssignmentSubmissionModel] = {}
        peer_reviews_done_by_item: dict[str, int] = {}

        if all_item_ids:
            matrix_rows = (
                await self.session.execute(
                    select(
                        QuizMatrixModel.item_id,
                        QuizMatrixModel.passing_threshold_percent,
                    ).where(QuizMatrixModel.item_id.in_(all_item_ids))
                )
            ).all()
            quiz_thresholds = {
                str(mid): float(th) for mid, th in matrix_rows if th is not None
            }

            q_rows = (
                (
                    await self.session.execute(
                        select(QuizSubmissionModel).where(
                            QuizSubmissionModel.user_id == student_id,
                            QuizSubmissionModel.item_id.in_(all_item_ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for q in q_rows:
                quiz_rows_by_item.setdefault(q.item_id, []).append(q)

            cd_rows = (
                (
                    await self.session.execute(
                        select(QuizCooldownModel.item_id).where(
                            QuizCooldownModel.user_id == student_id,
                            QuizCooldownModel.item_id.in_(all_item_ids),
                            QuizCooldownModel.cooldown_until.isnot(None),
                            QuizCooldownModel.cooldown_until > now_iso,
                        )
                    )
                )
                .scalars()
                .all()
            )
            cooldown_items = {str(cid) for cid in cd_rows if cid}

            l_rows = (
                (
                    await self.session.execute(
                        select(LabSubmissionModel).where(
                            LabSubmissionModel.user_id == student_id,
                            LabSubmissionModel.item_id.in_(all_item_ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for lb in l_rows:
                lab_rows_by_item.setdefault(lb.item_id, []).append(lb)

            p_rows = (
                (
                    await self.session.execute(
                        select(PeerAssignmentSubmissionModel).where(
                            PeerAssignmentSubmissionModel.user_id == student_id,
                            PeerAssignmentSubmissionModel.item_id.in_(all_item_ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for ps in p_rows:
                peer_sub_by_item[ps.item_id] = ps

            pr_counts = (
                await self.session.execute(
                    select(PeerReviewModel.item_id, func.count(PeerReviewModel.id))
                    .where(
                        PeerReviewModel.reviewer_user_id == student_id,
                        PeerReviewModel.item_id.in_(all_item_ids),
                    )
                    .group_by(PeerReviewModel.item_id)
                )
            ).all()
            peer_reviews_done_by_item = {
                str(iid): int(cnt or 0) for iid, cnt in pr_counts
            }

        def _classify_assessment_kind(item: LearningItemModel) -> str | None:
            raw_type = (item.type or "").strip().upper()
            if is_practice_quiz_item(raw_type):
                return "PRACTICE_QUIZ"
            if "GRADED_QUIZ" in raw_type or raw_type in {"QUIZ", "4"}:
                return "GRADED_QUIZ"
            if "LAB" in raw_type or raw_type == "5":
                return "CODING_LAB"
            if "PEER" in raw_type or raw_type == "6":
                return "PEER_REVIEW"
            if getattr(item, "is_graded", False):
                return "GRADED_QUIZ"
            return None

        graded_item_entries: list[tuple[LearningItemModel, int, str, str]] = []
        all_candidate_entries: list[tuple[LearningItemModel, int, str, str]] = []
        for it, wk_num, wk_title in ordered_items:
            kind = _classify_assessment_kind(it)
            if kind is None:
                continue
            if kind == "PRACTICE_QUIZ":
                if it.id in quiz_rows_by_item:
                    all_candidate_entries.append((it, wk_num, wk_title, kind))
            else:
                graded_item_entries.append((it, wk_num, wk_title, kind))
                all_candidate_entries.append((it, wk_num, wk_title, kind))

        num_graded = len(graded_item_entries)
        graded_weight = round(1.0 / num_graded, 4) if num_graded > 0 else 0.0

        assessment_summaries: list[StudentAssessmentSummaryItem] = []
        total_weighted_grade = 0.0

        for it, wk_num, wk_title, kind in all_candidate_entries:
            w = 0.0 if kind == "PRACTICE_QUIZ" else graded_weight

            if kind in ("GRADED_QUIZ", "PRACTICE_QUIZ"):
                subs = quiz_rows_by_item.get(it.id, [])
                attempts = len(subs)
                if attempts == 0:
                    assessment_summaries.append(
                        StudentAssessmentSummaryItem(
                            item_id=it.id,
                            week_number=wk_num,
                            week_title=wk_title,
                            item_title=it.title,
                            item_type=kind,
                            weight=w,
                            score=0.0,
                            max_score=DEFAULT_ASSESSMENT_MAX_SCORE_QUIZ,
                            is_submitted=False,
                            is_passed=False,
                            attempts_count=0,
                            provenance="AUTO",
                            status_note="",
                            submitted_at="",
                        )
                    )
                else:
                    best_sub = max(subs, key=lambda s: float(s.score_percent or 0.0))
                    best_pct = float(best_sub.score_percent or 0.0)
                    threshold = quiz_thresholds.get(
                        it.id, DEFAULT_PASSING_THRESHOLD_PERCENT
                    )
                    passed = best_pct >= threshold
                    scaled_score = round(best_pct / QUIZ_PERCENT_TO_SCORE_DIVISOR, 1)
                    if it.id in cooldown_items:
                        note = f"{attempts} lượt nộp · Đang khóa"
                    elif not passed and kind == "GRADED_QUIZ":
                        note = f"{attempts} lượt nộp · Chưa đạt"
                    elif kind == "PRACTICE_QUIZ":
                        note = f"Ôn tập · {attempts} lượt"
                    else:
                        note = f"{attempts} lượt nộp"

                    if kind == "GRADED_QUIZ":
                        total_weighted_grade += best_pct * w

                    assessment_summaries.append(
                        StudentAssessmentSummaryItem(
                            item_id=it.id,
                            week_number=wk_num,
                            week_title=wk_title,
                            item_title=it.title,
                            item_type=kind,
                            weight=w,
                            score=scaled_score,
                            max_score=DEFAULT_ASSESSMENT_MAX_SCORE_QUIZ,
                            is_submitted=True,
                            is_passed=passed,
                            attempts_count=attempts,
                            provenance="AUTO",
                            status_note=note,
                            submitted_at=best_sub.created_at or "",
                        )
                    )
            elif kind == "CODING_LAB":
                subs = lab_rows_by_item.get(it.id, [])
                attempts = len(subs)
                if attempts == 0:
                    assessment_summaries.append(
                        StudentAssessmentSummaryItem(
                            item_id=it.id,
                            week_number=wk_num,
                            week_title=wk_title,
                            item_title=it.title,
                            item_type=kind,
                            weight=w,
                            score=0.0,
                            max_score=DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
                            is_submitted=False,
                            is_passed=False,
                            attempts_count=0,
                            provenance="AUTO",
                            status_note="",
                            submitted_at="",
                        )
                    )
                else:
                    best_lab = max(subs, key=lambda s: float(s.score_percent or 0.0))
                    best_pct = round(float(best_lab.score_percent or 0.0), 1)
                    passed = best_pct >= DEFAULT_PASSING_THRESHOLD_PERCENT
                    note = "Máy chấm" if passed else f"{attempts} lượt nộp · Chưa đạt"
                    total_weighted_grade += best_pct * w
                    assessment_summaries.append(
                        StudentAssessmentSummaryItem(
                            item_id=it.id,
                            week_number=wk_num,
                            week_title=wk_title,
                            item_title=it.title,
                            item_type=kind,
                            weight=w,
                            score=best_pct,
                            max_score=DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
                            is_submitted=True,
                            is_passed=passed,
                            attempts_count=attempts,
                            provenance="AUTO",
                            status_note=note,
                            submitted_at=best_lab.created_at or "",
                        )
                    )
            else:
                # PEER_REVIEW
                p_sub = peer_sub_by_item.get(it.id)
                done_reviews = peer_reviews_done_by_item.get(it.id, 0)
                if p_sub is None:
                    assessment_summaries.append(
                        StudentAssessmentSummaryItem(
                            item_id=it.id,
                            week_number=wk_num,
                            week_title=wk_title,
                            item_title=it.title,
                            item_type=kind,
                            weight=w,
                            score=0.0,
                            max_score=DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
                            is_submitted=False,
                            is_passed=False,
                            attempts_count=0,
                            provenance="PEER",
                            status_note="",
                            submitted_at="",
                        )
                    )
                else:
                    eff_score, eff_source, eff_pub_at = resolve_peer_effective_grade(
                        status=p_sub.status,
                        final_score=p_sub.final_score,
                        grade_source=p_sub.grade_source,
                        published_at=p_sub.published_at,
                        previous_best_score=getattr(p_sub, "previous_best_score", None),
                        previous_best_grade_source=getattr(
                            p_sub, "previous_best_grade_source", None
                        ),
                        previous_best_published_at=getattr(
                            p_sub, "previous_best_published_at", None
                        ),
                    )
                    if eff_score is not None:
                        val_score = round(float(eff_score), 1)
                        passed = val_score >= DEFAULT_PASSING_THRESHOLD_PERCENT
                        prov = normalize_grade_provenance(eff_source) or "PEER"
                        req_reviews = (
                            int(getattr(it, "required_peer_reviews", 0) or 0)
                            or REQUIRED_PEER_REVIEWS_COUNT
                        )
                        if prov == "INSTRUCTOR":
                            note = "Giảng viên chấm"
                        elif prov == "TA":
                            note = "Trợ giảng chấm"
                        elif done_reviews > 0:
                            note = f"Bạn học chấm ({done_reviews}/{req_reviews})"
                        else:
                            note = "Bạn học chấm"
                        total_weighted_grade += val_score * w
                        assessment_summaries.append(
                            StudentAssessmentSummaryItem(
                                item_id=it.id,
                                week_number=wk_num,
                                week_title=wk_title,
                                item_title=it.title,
                                item_type=kind,
                                weight=w,
                                score=val_score,
                                max_score=DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
                                is_submitted=True,
                                is_passed=passed,
                                attempts_count=int(p_sub.attempt_number or 1),
                                provenance=prov,
                                status_note=note,
                                submitted_at=eff_pub_at or p_sub.created_at or "",
                            )
                        )
                    else:
                        req_reviews = (
                            int(getattr(it, "required_peer_reviews", 0) or 0)
                            or REQUIRED_PEER_REVIEWS_COUNT
                        )
                        if str(p_sub.review_duty_status or "") == REVIEW_DUTY_PENDING:
                            remaining = max(1, req_reviews - done_reviews)
                            note = f"Nợ chấm {remaining} bài bạn học"
                        else:
                            note = "Đang chờ chấm điểm"
                        assessment_summaries.append(
                            StudentAssessmentSummaryItem(
                                item_id=it.id,
                                week_number=wk_num,
                                week_title=wk_title,
                                item_title=it.title,
                                item_type=kind,
                                weight=w,
                                score=0.0,
                                max_score=DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED,
                                is_submitted=True,
                                is_passed=False,
                                attempts_count=int(p_sub.attempt_number or 1),
                                provenance="PEER",
                                status_note=note,
                                submitted_at=p_sub.created_at or "",
                            )
                        )

        # 4. Query course-scoped daily item activity across entire enrollment history
        dc_rows = (
            (
                await self.session.execute(
                    select(DailyCourseItemRecordModel)
                    .where(
                        DailyCourseItemRecordModel.user_id == student_id,
                        DailyCourseItemRecordModel.course_id == real_id,
                        DailyCourseItemRecordModel.seconds_spent > 0,
                    )
                    .order_by(
                        DailyCourseItemRecordModel.study_date.asc(),
                        DailyCourseItemRecordModel.last_studied_at.asc(),
                    )
                )
            )
            .scalars()
            .all()
        )

        grouped_days: dict[str, list[StudentDayItemLog]] = {}
        if dc_rows:
            for rec in dc_rows:
                d_str = rec.study_date.isoformat()
                meta = item_meta.get(rec.item_id)
                title = meta[0].title if meta else f"Bài học #{rec.item_id[:6]}"
                itype = (meta[0].type or "") if meta else ""
                grouped_days.setdefault(d_str, []).append(
                    StudentDayItemLog(
                        item_id=rec.item_id,
                        item_title=title,
                        item_type=itype,
                        seconds_spent=int(rec.seconds_spent or 0),
                    )
                )
        else:
            # Fallback to LearningItemProgressModel if no daily_course_item_records exist yet
            ip_rows = (
                (
                    await self.session.execute(
                        select(LearningItemProgressModel)
                        .where(
                            LearningItemProgressModel.user_id == student_id,
                            LearningItemProgressModel.course_id == real_id,
                            LearningItemProgressModel.time_spent_seconds > 0,
                        )
                        .order_by(LearningItemProgressModel.last_studied_at.asc())
                    )
                )
                .scalars()
                .all()
            )
            for ip in ip_rows:
                raw_ts = str(ip.last_studied_at or "")
                d_str = (
                    raw_ts[:10]
                    if len(raw_ts) >= 10 and raw_ts[:4].isdigit()
                    else now_iso[:10]
                )
                meta = item_meta.get(ip.item_id)
                title = meta[0].title if meta else f"Bài học #{ip.item_id[:6]}"
                itype = (meta[0].type or "") if meta else ""
                grouped_days.setdefault(d_str, []).append(
                    StudentDayItemLog(
                        item_id=ip.item_id,
                        item_title=title,
                        item_type=itype,
                        seconds_spent=int(ip.time_spent_seconds or 0),
                    )
                )

        daily_logs: list[StudentCourseDailyLog] = []
        total_course_seconds = 0
        for d_str in sorted(grouped_days.keys()):
            day_items = tuple(grouped_days[d_str])
            day_secs = sum(i.seconds_spent for i in day_items)
            total_course_seconds += day_secs
            daily_logs.append(
                StudentCourseDailyLog(
                    study_date=d_str,
                    total_seconds=day_secs,
                    is_streak_qualified=day_secs >= MIN_DAILY_STUDY_SECONDS_FOR_STREAK,
                    items=day_items,
                )
            )

        valid_completed_ids = completed_ids & set(all_item_ids)
        valid_completed_count = len(valid_completed_ids)
        completed_estimated_seconds = sum(
            (
                int(item_meta[iid][0].estimated_minutes or 0)
                or DEFAULT_ESTIMATED_ITEM_MINUTES
            )
            * SECONDS_PER_MINUTE
            for iid in valid_completed_ids
            if iid in item_meta
        )
        is_suspicious_fast_pace = (
            valid_completed_count >= MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK
            and completed_estimated_seconds > 0
            and total_course_seconds
            < completed_estimated_seconds * FAST_PACE_MIN_ESTIMATED_RATIO
        )

        return InstructorStudentDossier(
            enrolled_at=enrolled_at,
            furthest_item_title=furthest_item_title,
            furthest_week_number=furthest_week_number,
            last_accessed_item_title=last_accessed_item_title,
            last_accessed_week_number=last_accessed_week_number,
            final_weighted_grade=round(total_weighted_grade, 1),
            is_suspicious_fast_pace=is_suspicious_fast_pace,
            assessments=tuple(assessment_summaries),
            daily_logs=tuple(daily_logs),
        )

    async def resolve_course_video_item(
        self, course_id_or_slug: str, item_id: str
    ) -> tuple[str, bool] | None:
        clean_course = course_id_or_slug.strip()
        clean_item = item_id.strip()
        if not clean_course or not clean_item:
            return None
        stmt = (
            select(
                CourseModel.id,
                LearningItemModel.type,
                LearningItemModel.video_url,
            )
            .select_from(LearningItemModel)
            .join(LessonModel, LearningItemModel.lesson_id == LessonModel.id)
            .join(WeekModuleModel, LessonModel.week_module_id == WeekModuleModel.id)
            .join(CourseModel, WeekModuleModel.course_id == CourseModel.id)
            .where(
                LearningItemModel.id == clean_item,
                or_(CourseModel.id == clean_course, CourseModel.slug == clean_course),
            )
            .limit(1)
        )
        row = (await self.session.execute(stmt)).first()
        if not row:
            return None
        is_video = row.type == ItemType.VIDEO or bool(row.video_url)
        return str(row.id), is_video
