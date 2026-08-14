import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.catalog.domain import (
    Category,
    Course,
    CourseAnnouncement,
    CourseReview,
    CourseStatus,
    EnrolledStudent,
    ICatalogRepository,
    InstructorAnalytics,
    InteractiveTranscript,
    InVideoQuiz,
    ItemType,
    LearningItem,
    Lesson,
    Specialization,
    WeekModule,
)
from src.modules.catalog.infrastructure.models import (
    CategoryModel,
    CourseAnnouncementModel,
    CourseAuditLogModel,
    CourseCollaboratorModel,
    CourseModel,
    CourseReviewModel,
    InVideoQuizModel,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)
from src.modules.identity.infrastructure.models import UserModel
from src.shared.auth import get_current_user
from src.shared.infrastructure.scopes import apply_organization_scope


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
                        order_index=getattr(i_model, "order_index", 0),
                        starter_code=getattr(i_model, "starter_code", ""),
                        test_cases_json=getattr(i_model, "test_cases_json", ""),
                        language=getattr(i_model, "language", ""),
                        rubric_criteria_json=getattr(
                            i_model, "rubric_criteria_json", ""
                        ),
                        quiz_matrix_id=getattr(i_model, "quiz_matrix_id", ""),
                        auto_transcribe=getattr(i_model, "auto_transcribe", False),
                    )
                )
            lessons.append(
                Lesson(
                    id=l_model.id,
                    title=l_model.title,
                    estimated_minutes=l_model.estimated_minutes,
                    items=items,
                    order_index=getattr(l_model, "order_index", 0),
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
        instructor_names=[],
        week_modules=week_modules,
        average_rating=model.average_rating,
        review_count=model.review_count,
        subject=model.subject or "",
        level=model.level or "",
        owner_id=getattr(model, "owner_id", ""),
        co_instructor_ids=[c.user_id for c in getattr(model, "collaborators", [])],
        status=getattr(model, "status", CourseStatus.DRAFT) or CourseStatus.DRAFT,
        rejection_reason=getattr(model, "rejection_reason", "") or "",
        organization_id=getattr(model, "organization_id", "partner_community")
        or "partner_community",
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
        is_verified_completer=model.is_verified_completer,
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
        return [_model_to_domain_course(m) for m in models], ""

    async def list_instructor_courses(
        self,
        instructor_id: str,
        page_size: int = 50,
        page_token: str = "",
        status_filter: str | CourseStatus | None = None,
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
        subject: str = "",
        level: str = "",
        owner_id: str = "",
        co_instructor_ids: list[str] | None = None,
        financial_aid_enabled: bool = True,
        organization_id: str = "partner_community",
    ) -> Course:
        import re

        safe_slug = (
            re.sub(r"[^a-z0-9-]", "", slug.lower().strip().replace(" ", "-"))
            if slug
            else ""
        )
        course_id = (
            f"course-{safe_slug}" if safe_slug else f"course-{uuid.uuid4().hex[:8]}"
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
                final_partner_name = "Coursera Project Network"

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
        )
        self.session.add(model)

        if owner_id:
            owner_collab = CourseCollaboratorModel(
                id=f"collab_{uuid.uuid4().hex[:12]}",
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
                        id=f"collab_{uuid.uuid4().hex[:12]}",
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
        instructor_names: list[str],
        subject: str = "",
        level: str = "",
        financial_aid_enabled: bool = True,
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

        wm_id = f"week-{week_number}-{uuid.uuid4().hex[:6]}"
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
    ) -> LearningItem:
        item_id = f"item-{uuid.uuid4().hex[:8]}"
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

        review_id = f"rev-{uuid.uuid4().hex[:10]}"
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
        cat_id = f"cat-{uuid.uuid4().hex[:8]}"
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
        stmt = select(WeekModuleModel).where(WeekModuleModel.id == module_id)
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
        stmt = select(WeekModuleModel).where(WeekModuleModel.id == module_id)
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
    ) -> LearningItem | None:
        stmt = (
            select(LearningItemModel)
            .options(selectinload(LearningItemModel.in_video_quizzes))
            .where(LearningItemModel.id == id)
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
        )

    async def delete_learning_item(self, item_id: str, course_id: str) -> bool:
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
        ann_id = f"ann_{uuid.uuid4().hex[:12]}"
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

    async def get_instructor_analytics(self, course_id: str) -> InstructorAnalytics:
        real_id = await self.get_course_id_by_slug_or_id(course_id)
        avg_rating, total_reviews = await self.get_course_rating_stats(real_id)

        identity_repo_factory = __import__(
            "src.modules.identity.infrastructure.repository",
            fromlist=["IdentityRepository"],
        ).IdentityRepository

        identity_repo = identity_repo_factory(self.session)

        learning_progress_model = __import__(
            "src.modules.learning.infrastructure.models",
            fromlist=["LearningProgressModel"],
        ).LearningProgressModel
        stmt = select(learning_progress_model).where(
            learning_progress_model.course_id == real_id
        )
        res = await self.session.execute(stmt)
        progresses = res.scalars().all()

        students: list[EnrolledStudent] = []
        total_students = len(progresses)
        sum_progress = 0.0

        for p in progresses:
            sum_progress += p.overall_progress_percent
            user_entity = await identity_repo.get_by_id(p.user_id)
            u_name = (
                user_entity.email.split("@")[0]
                if user_entity and user_entity.email
                else f"Học viên #{p.user_id[:6]}"
            )
            u_email = user_entity.email if user_entity else ""

            students.append(
                EnrolledStudent(
                    user_id=p.user_id,
                    user_name=u_name,
                    user_email=u_email,
                    progress_percent=round(p.overall_progress_percent, 1),
                    enrolled_at="2026-07-25T00:00:00Z",
                )
            )

        avg_completion = (
            round(sum_progress / total_students, 1) if total_students > 0 else 0.0
        )

        return InstructorAnalytics(
            id=f"analytics_{real_id}",
            course_id=real_id,
            total_enrolled_students=total_students,
            average_completion_rate=avg_completion,
            average_rating=avg_rating,
            review_count=total_reviews,
            students=students,
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
        for idx, lesson_id in enumerate(ordered_lesson_ids):
            stmt = (
                select(LessonModel)
                .where(LessonModel.id == lesson_id)
                .where(LessonModel.week_module_id == week_module_id)
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
                id=f"collab_{uuid.uuid4().hex[:12]}",
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
            id=f"calog_{uuid.uuid4().hex[:12]}",
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
            user_names = dict(user_res.tuples().all())

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

            stmt = select(QuestionModel).where(QuestionModel.bank_id == quiz_matrix_id)
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
        except Exception:  # noqa: BLE001
            return []
