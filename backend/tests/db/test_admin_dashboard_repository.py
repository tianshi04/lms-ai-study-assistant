"""Real-PostgreSQL checks for the bounded-context admin dashboard repositories & use cases.

Runs inside the rolled-back savepoint fixture from ``tests/db/conftest.py``.
Assertions compare against a baseline snapshot so pre-existing rows in the
database never affect the result.
"""

import uuid

import pytest

from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import AdminAssessmentAlertKind
from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
)
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.modules.catalog.application import AdminCatalogUseCase
from src.modules.catalog.domain import AdminCourseQualityMetric, CourseStatus
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    CourseReviewModel,
    LowReviewAcknowledgementModel,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.certificate.domain import AdminCertificateSummary
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.modules.identity.domain import UserRole
from src.modules.identity.infrastructure.models import (
    InstructorApplicationModel,
    UserModel,
)
from src.modules.identity.infrastructure.repository import IdentityRepository
from src.modules.learning.application import LearningUseCase
from src.modules.learning.infrastructure.models import LearningProgressModel
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
    UserSubscriptionModel,
)
from src.modules.payment.infrastructure.repository import PaymentRepository
from src.shared.auth import CurrentUser, set_current_user
from src.shared.infrastructure import database

FUTURE_TS = "9999-12-31T00:00:00+00:00"
PAST_TS = "2000-01-01T00:00:00+00:00"
ADMIN_USER = CurrentUser(id="dash-admin", role="USER_ROLE_ADMIN")


@pytest.fixture(autouse=True)
def _admin_context():
    """Catalog queries push the caller's organization scope down to SQL."""
    set_current_user(ADMIN_USER)
    yield
    set_current_user(None)


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _admin_catalog_uc() -> AdminCatalogUseCase:
    return AdminCatalogUseCase(
        repo_factory=SQLAlchemyCatalogRepository,
        learning_repo_factory=SQLAlchemyLearningRepository,
        payment_repo_factory=PaymentRepository,
    )


def _learning_uc() -> LearningUseCase:
    return LearningUseCase(
        repo_factory=SQLAlchemyLearningRepository,
        catalog_repo_factory=SQLAlchemyCatalogRepository,
    )


def _assessment_uc() -> AssessmentUseCase:
    return AssessmentUseCase(
        repo_factory=SQLAlchemyAssessmentRepository,
        identity_repo_factory=IdentityRepository,
    )


async def _fetch_all_course_metrics(
    uc: AdminCatalogUseCase, page_size: int = 50
) -> list[AdminCourseQualityMetric]:
    rows: list[AdminCourseQualityMetric] = []
    page = 1
    while True:
        result = await uc.list_admin_course_metrics(
            ADMIN_USER, page=page, page_size=page_size
        )
        rows.extend(result.courses)
        if len(rows) >= result.total_count or not result.courses:
            return rows
        page += 1


async def _fetch_all_certificates(
    repo: CertificateRepository, page_size: int = 50
) -> list[AdminCertificateSummary]:
    rows: list[AdminCertificateSummary] = []
    page = 1
    while True:
        result = await repo.list_admin_certificates(page, page_size)
        rows.extend(result.certificates)
        if len(rows) >= result.total_count or not result.certificates:
            return rows
        page += 1


@pytest.mark.asyncio
async def test_certificates_are_paginated_valid_first_then_revoked():
    async with database.async_session_scope() as session:
        repo = CertificateRepository(session)
        before = await repo.list_admin_certificates(1, 1)

        learner_id = _uid("cert-learner")
        session.add(
            UserModel(
                id=learner_id,
                email=f"{learner_id}@example.com",
                full_name="Cert Learner",
                role=UserRole.LEARNER,
                password_hash="x",
            )
        )
        course_ids = [_uid("cert-course") for _ in range(3)]
        session.add_all(
            [
                CourseModel(
                    id=cid,
                    title=f"Cert {cid}",
                    slug=cid,
                    status=CourseStatus.PUBLISHED,
                )
                for cid in course_ids
            ]
        )
        await session.flush()

        cert_ids = [f"0000-PAGE-{uuid.uuid4().hex[:8].upper()}" for _ in course_ids]
        session.add_all(
            [
                CertificateModel(
                    certificate_id=cert_id,
                    user_id=learner_id,
                    course_id=course_id,
                    learner_name="Cert Learner",
                    course_title=f"Cert {course_id}",
                    partner_name="Page Partner",
                    issue_date="22/07/2026",
                    verification_url=f"/verify/{cert_id}",
                    is_revoked=index == 0,
                    revoked_reason="fraud" if index == 0 else "",
                )
                for index, (cert_id, course_id) in enumerate(
                    zip(cert_ids, course_ids, strict=True)
                )
            ]
        )
        await session.flush()

        everything = await _fetch_all_certificates(repo, page_size=2)
        first_page = await repo.list_admin_certificates(1, 2)

    assert first_page.total_count == before.total_count + 3
    assert first_page.page == 1
    assert first_page.page_size == 2
    assert len(first_page.certificates) == 2

    ids = [c.certificate_id for c in everything]
    assert len(ids) == len(set(ids)) == first_page.total_count
    assert set(cert_ids) <= set(ids)
    # Valid certificates always precede revoked ones, with no interleaving.
    revoked_flags = [c.is_revoked for c in everything]
    assert revoked_flags == sorted(revoked_flags)


@pytest.mark.asyncio
async def test_course_metrics_are_paginated_and_sorted_by_revenue():
    catalog_uc = _admin_catalog_uc()
    before = await catalog_uc.list_admin_course_metrics(ADMIN_USER, page=1, page_size=1)

    async with database.async_session_scope() as session:
        buyer_id = _uid("page-buyer")
        session.add(
            UserModel(
                id=buyer_id,
                email=f"{buyer_id}@example.com",
                full_name="Page Buyer",
                role=UserRole.LEARNER,
                password_hash="x",
            )
        )
        await session.flush()

        # Revenue far above any realistic seed data so these rank first.
        course_ids = {
            1_000_000_000.0: _uid("page-top"),
            900_000_000.0: _uid("page-mid"),
            800_000_000.0: _uid("page-low"),
        }
        no_revenue_id = _uid("page-none")
        session.add_all(
            [
                CourseModel(
                    id=cid,
                    title=f"Page {cid}",
                    slug=cid,
                    status=CourseStatus.PUBLISHED,
                )
                for cid in [*course_ids.values(), no_revenue_id]
            ]
        )
        await session.flush()
        session.add_all(
            [
                CoursePurchaseModel(
                    id=_uid("page-pur"),
                    user_id=buyer_id,
                    course_id=cid,
                    amount=amount,
                    status="COMPLETED",
                    created_at=FUTURE_TS,
                )
                for amount, cid in course_ids.items()
            ]
        )
        await session.flush()

    first_page = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, page=1, page_size=2
    )
    second_page = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, page=2, page_size=2
    )
    everything = await _fetch_all_course_metrics(catalog_uc)

    assert first_page.total_count == before.total_count + 4
    assert first_page.page == 1
    assert first_page.page_size == 2
    assert len(first_page.courses) == 2
    assert [c.course_id for c in first_page.courses] == [
        course_ids[1_000_000_000.0],
        course_ids[900_000_000.0],
    ]
    assert second_page.courses[0].course_id == course_ids[800_000_000.0]

    ids = [c.course_id for c in everything]
    assert len(ids) == len(set(ids)) == first_page.total_count
    revenues = [c.revenue for c in everything]
    assert revenues == sorted(revenues, reverse=True)
    assert no_revenue_id in ids


@pytest.mark.asyncio
async def test_dashboard_stats_reflect_seeded_rows_across_bounded_contexts():
    catalog_uc = _admin_catalog_uc()
    learning_uc = _learning_uc()
    assessment_uc = _assessment_uc()

    async with database.async_session_scope() as session:
        before_identity = await IdentityRepository(session).get_admin_identity_stats()
        before_catalog = await SQLAlchemyCatalogRepository(
            session
        ).get_admin_catalog_stats()
        before_payment = await PaymentRepository(session).get_admin_payment_stats()
        before_cert = await CertificateRepository(session).get_admin_certificate_stats()
    before_learning = await learning_uc.get_admin_learning_stats(ADMIN_USER)
    before_assessment = await assessment_uc.list_admin_assessment_alerts(ADMIN_USER)

    learner_id = _uid("dash-learner")
    reviewer_id = _uid("dash-reviewer")
    course_id = _uid("dash-course")
    other_course_id = _uid("dash-course2")
    draft_course_id = _uid("dash-course-draft")
    rejected_course_id = _uid("dash-course-rejected")
    missing_course_id = _uid("dash-missing-course")
    submission_id = _uid("dash-sub")
    review_id = _uid("dash-review")
    cert_id = f"0000-DASH-{uuid.uuid4().hex[:8].upper()}"

    async with database.async_session_scope() as session:
        session.add_all(
            [
                UserModel(
                    id=learner_id,
                    email=f"{learner_id}@example.com",
                    full_name="Dash Learner",
                    role=UserRole.LEARNER,
                    password_hash="x",
                    is_identity_verified=True,
                ),
                UserModel(
                    id=reviewer_id,
                    email=f"{reviewer_id}@example.com",
                    full_name="Dash Reviewer",
                    role=UserRole.INSTRUCTOR,
                    password_hash="x",
                ),
            ]
        )
        await session.flush()

        session.add_all(
            [
                CourseModel(
                    id=course_id,
                    title="Dash Course",
                    slug=course_id,
                    status=CourseStatus.PUBLISHED,
                    partner_name="Dash Partner",
                ),
                CourseModel(
                    id=other_course_id,
                    title="Dash Course Pending",
                    slug=other_course_id,
                    status=CourseStatus.PENDING_REVIEW,
                ),
                CourseModel(
                    id=draft_course_id,
                    title="Dash Course Draft",
                    slug=draft_course_id,
                    status=CourseStatus.DRAFT,
                ),
                CourseModel(
                    id=rejected_course_id,
                    title="Dash Course Rejected",
                    slug=rejected_course_id,
                    status=CourseStatus.REJECTED,
                ),
            ]
        )
        await session.flush()

        session.add_all(
            [
                LearningProgressModel(
                    id=f"{learner_id}:{course_id}",
                    user_id=learner_id,
                    course_id=course_id,
                    overall_progress_percent=100.0,
                ),
                LearningProgressModel(
                    id=f"{reviewer_id}:{course_id}",
                    user_id=reviewer_id,
                    course_id=course_id,
                    overall_progress_percent=40.0,
                ),
                # Enrollment of a course that no longer exists must not be counted.
                LearningProgressModel(
                    id=f"{learner_id}:{missing_course_id}",
                    user_id=learner_id,
                    course_id=missing_course_id,
                    overall_progress_percent=100.0,
                ),
                CourseReviewModel(
                    id=review_id,
                    user_id=learner_id,
                    user_name="Dash Learner",
                    course_id=course_id,
                    rating_stars=1,
                    comment_text="Nội dung lỗi",
                    created_at=FUTURE_TS,
                ),
                CoursePurchaseModel(
                    id=_uid("dash-pur"),
                    user_id=learner_id,
                    course_id=course_id,
                    amount=1_000_000.0,
                    status="COMPLETED",
                    created_at=FUTURE_TS,
                ),
                CoursePurchaseModel(
                    id=_uid("dash-pur-failed"),
                    user_id=reviewer_id,
                    course_id=course_id,
                    amount=777_000.0,
                    status="FAILED",
                    created_at=FUTURE_TS,
                ),
                PaymentOrderModel(
                    id=_uid("dash-order-sub"),
                    user_id=learner_id,
                    target_type="SYSTEM_SUBSCRIPTION",
                    target_id="plus_monthly",
                    amount=200_000.0,
                    status="COMPLETED",
                    vnp_txn_ref=_uid("TXN"),
                    created_at=FUTURE_TS,
                    updated_at=FUTURE_TS,
                ),
                # Course orders are counted through course_purchases, never here.
                PaymentOrderModel(
                    id=_uid("dash-order-course"),
                    user_id=learner_id,
                    target_type="COURSE",
                    target_id=course_id,
                    amount=555_000.0,
                    status="COMPLETED",
                    vnp_txn_ref=_uid("TXN"),
                    created_at=FUTURE_TS,
                    updated_at=FUTURE_TS,
                ),
                UserSubscriptionModel(
                    id=_uid("dash-sub-active"),
                    user_id=learner_id,
                    plan_type="MONTHLY",
                    status="ACTIVE",
                    starts_at=FUTURE_TS,
                    expires_at=FUTURE_TS,
                    created_at=FUTURE_TS,
                ),
                UserSubscriptionModel(
                    id=_uid("dash-sub-expired"),
                    user_id=reviewer_id,
                    plan_type="MONTHLY",
                    status="ACTIVE",
                    starts_at="2000-01-01T00:00:00Z",
                    expires_at="2000-02-01T00:00:00Z",
                    created_at="2000-01-01T00:00:00Z",
                ),
                CertificateModel(
                    certificate_id=cert_id,
                    user_id=learner_id,
                    course_id=course_id,
                    learner_name="Dash Learner",
                    course_title="Dash Course",
                    partner_name="Dash Partner",
                    issue_date="22/07/2026",
                    verification_url=f"/verify/{cert_id}",
                    is_revoked=True,
                    revoked_reason="cheating",
                ),
                FinancialAidModel(
                    id=_uid("dash-aid-pending"),
                    user_id=learner_id,
                    course_id=course_id,
                    essay_150_words="essay",
                    status="PENDING",
                ),
                FinancialAidModel(
                    id=_uid("dash-aid-approved"),
                    user_id=reviewer_id,
                    course_id=course_id,
                    essay_150_words="essay",
                    status="AUTO_APPROVED",
                ),
                InstructorApplicationModel(
                    id=_uid("dash-app"),
                    user_id=learner_id,
                    title="Dr",
                    bio="bio",
                    status="PENDING_REVIEW",
                ),
                PeerAssignmentSubmissionModel(
                    id=submission_id,
                    user_id=learner_id,
                    item_id="item-dash",
                    created_at=FUTURE_TS,
                    graded_by_staff=False,
                ),
                GradeAppealModel(
                    id=_uid("dash-report"),
                    user_id=learner_id,
                    submission_id=submission_id,
                    appeal_reason="[REPORT_REVIEW:rev-dash] spam",
                    status="PENDING_STAFF_REVIEW",
                    created_at=FUTURE_TS,
                ),
                GradeAppealModel(
                    id=_uid("dash-resolved"),
                    user_id=learner_id,
                    submission_id=_uid("dash-other-sub"),
                    appeal_reason="already handled",
                    status="RESOLVED",
                    created_at=FUTURE_TS,
                ),
                PeerReviewModel(
                    id=_uid("dash-outlier"),
                    submission_id=submission_id,
                    reviewer_user_id=reviewer_id,
                    item_id="item-dash",
                    rubric_criteria_json={},
                    total_score=10.0,
                    is_outlier=True,
                    created_at=FUTURE_TS,
                ),
            ]
        )
        await session.flush()

        after_identity = await IdentityRepository(session).get_admin_identity_stats()
        after_catalog = await SQLAlchemyCatalogRepository(
            session
        ).get_admin_catalog_stats()
        after_payment = await PaymentRepository(session).get_admin_payment_stats()
        cert_repo = CertificateRepository(session)
        after_cert = await cert_repo.get_admin_certificate_stats()
        all_certificates = await _fetch_all_certificates(cert_repo)

    after_learning = await learning_uc.get_admin_learning_stats(ADMIN_USER)
    after_assessment = await assessment_uc.list_admin_assessment_alerts(ADMIN_USER)
    all_metrics = await _fetch_all_course_metrics(catalog_uc)

    assert after_identity.total_users == before_identity.total_users + 2
    assert after_identity.learner_count == before_identity.learner_count + 1
    assert after_identity.instructor_count == before_identity.instructor_count + 1
    assert after_identity.verified_user_count == before_identity.verified_user_count + 1
    assert (
        after_identity.pending_instructor_applications
        == before_identity.pending_instructor_applications + 1
    )

    assert after_catalog.total_courses == before_catalog.total_courses + 4
    assert after_catalog.published_courses == before_catalog.published_courses + 1
    assert (
        after_catalog.pending_review_courses
        == before_catalog.pending_review_courses + 1
    )
    assert after_catalog.draft_courses == before_catalog.draft_courses + 1
    assert after_catalog.rejected_courses == before_catalog.rejected_courses + 1
    assert after_catalog.total_reviews == before_catalog.total_reviews + 1
    assert (
        after_catalog.rating_distribution[0]
        == before_catalog.rating_distribution[0] + 1
    )
    assert after_catalog.low_review_total == before_catalog.low_review_total + 1

    assert after_learning.total_enrollments == before_learning.total_enrollments + 2
    assert (
        after_learning.completed_enrollments
        == before_learning.completed_enrollments + 1
    )

    assert after_payment.total_revenue == pytest.approx(
        before_payment.total_revenue + 1_200_000.0
    )
    assert (
        after_payment.course_purchase_count == before_payment.course_purchase_count + 1
    )
    assert after_payment.active_subscriptions == before_payment.active_subscriptions + 1

    assert after_cert.certificates_issued == before_cert.certificates_issued + 1
    assert after_cert.certificates_revoked == before_cert.certificates_revoked + 1
    assert after_cert.approved_financial_aids == before_cert.approved_financial_aids + 1
    assert after_cert.pending_financial_aids == before_cert.pending_financial_aids + 1

    metric = next(m for m in all_metrics if m.course_id == course_id)
    assert metric.enrolled_count == 2
    assert metric.completed_count == 1
    assert metric.revenue == pytest.approx(1_000_000.0)
    assert metric.status == CourseStatus.PUBLISHED
    assert metric.partner_name == "Dash Partner"
    pending_metric = next(m for m in all_metrics if m.course_id == other_course_id)
    assert pending_metric.enrolled_count == 0
    assert pending_metric.revenue == 0.0
    assert pending_metric.status == CourseStatus.PENDING_REVIEW

    low = next(r for r in after_catalog.low_reviews if r.review_id == review_id)
    assert low.rating_stars == 1
    assert low.course_id == course_id
    assert low.course_title == "Dash Course"

    kinds = {
        a.kind: a for a in after_assessment.alerts if a.submission_id == submission_id
    }
    assert AdminAssessmentAlertKind.REPORTED_PEER_REVIEW in kinds
    assert (
        kinds[AdminAssessmentAlertKind.REPORTED_PEER_REVIEW].user_name == "Dash Learner"
    )
    assert AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW in kinds
    outlier = kinds[AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW]
    assert outlier.user_name == "Dash Reviewer"
    assert outlier.total_score == pytest.approx(10.0)
    assert all(alert.reason != "already handled" for alert in after_assessment.alerts)
    assert after_assessment.total_count == before_assessment.total_count + 2

    cert = next(c for c in all_certificates if c.certificate_id == cert_id)
    assert cert.is_revoked is True
    assert cert.revoked_reason == "cheating"


# ---------------------------------------------------------------------------
# Low-review acknowledgement, search / status filters, organization scope
# ---------------------------------------------------------------------------


def _course(course_id: str, title: str, **fields) -> CourseModel:
    return CourseModel(
        id=course_id,
        title=title,
        slug=course_id,
        status=fields.pop("status", CourseStatus.PUBLISHED),
        **fields,
    )


def _user(user_id: str, role: UserRole = UserRole.LEARNER) -> UserModel:
    return UserModel(
        id=user_id,
        email=f"{user_id}@example.com",
        full_name=f"User {user_id}",
        role=role,
        password_hash="x",
    )


@pytest.mark.asyncio
async def test_acknowledged_low_review_leaves_alerts_until_it_is_edited():
    async with database.async_session_scope() as session:
        repo = SQLAlchemyCatalogRepository(session)
        before = await repo.get_admin_catalog_stats()

        learner_id, admin_id = _uid("ack-learner"), _uid("ack-admin")
        course_id, review_id = _uid("ack-course"), _uid("ack-review")
        session.add_all([_user(learner_id), _user(admin_id, UserRole.ADMIN)])
        session.add(_course(course_id, "Ack Course"))
        await session.flush()
        review = CourseReviewModel(
            id=review_id,
            user_id=learner_id,
            user_name="Ack Learner",
            course_id=course_id,
            rating_stars=1,
            comment_text="Tệ",
            created_at=PAST_TS,
        )
        session.add(review)
        await session.flush()

        opened = await repo.get_admin_catalog_stats()

        assert await repo.acknowledge_low_review(review_id, admin_id) is True
        acknowledged = await repo.get_admin_catalog_stats()
        ack_row = await session.get(LowReviewAcknowledgementModel, review_id)

        # Acknowledging again is idempotent (no duplicate row, still hidden).
        assert await repo.acknowledge_low_review(review_id, admin_id) is True
        acknowledged_again = await repo.get_admin_catalog_stats()

        # The author edits the review afterwards: it must come back.
        review.created_at = FUTURE_TS
        await session.flush()
        reopened = await repo.get_admin_catalog_stats()

        unknown = await repo.acknowledge_low_review("no-such-review", admin_id)

    assert opened.low_review_total == before.low_review_total + 1
    assert acknowledged.low_review_total == before.low_review_total
    assert acknowledged_again.low_review_total == before.low_review_total
    assert reopened.low_review_total == before.low_review_total + 1
    assert review_id not in {r.review_id for r in acknowledged.low_reviews}
    assert review_id in {r.review_id for r in reopened.low_reviews}
    assert ack_row is not None
    assert ack_row.acknowledged_by == admin_id
    assert unknown is False


@pytest.mark.asyncio
async def test_course_metrics_search_and_status_filters():
    token = uuid.uuid4().hex[:10]
    catalog_uc = _admin_catalog_uc()
    async with database.async_session_scope() as session:
        published = _uid("flt-pub")
        draft = _uid("flt-draft")
        by_partner = _uid("flt-partner")
        unrelated = _uid("flt-other")
        session.add_all(
            [
                _course(published, f"Zeta {token} Basics"),
                _course(draft, f"Draft {token}", status=CourseStatus.DRAFT),
                _course(by_partner, "Plain title", partner_name=f"Partner {token}"),
                _course(unrelated, "Totally unrelated"),
            ]
        )
        await session.flush()

    everything = await catalog_uc.list_admin_course_metrics(ADMIN_USER, 1, 50, token)
    upper = await catalog_uc.list_admin_course_metrics(ADMIN_USER, 1, 50, token.upper())
    only_published = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, 1, 50, token, CourseStatus.PUBLISHED
    )
    only_draft = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, 1, 50, token, CourseStatus.DRAFT
    )
    no_match = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, 1, 50, f"nope-{token}"
    )
    paged = await catalog_uc.list_admin_course_metrics(ADMIN_USER, 2, 1, token)

    ids = {c.course_id for c in everything.courses}
    assert ids == {published, draft, by_partner}
    assert everything.total_count == 3
    assert {c.course_id for c in upper.courses} == ids  # case-insensitive
    assert {c.course_id for c in only_published.courses} == {published, by_partner}
    assert only_published.total_count == 2
    assert [c.course_id for c in only_draft.courses] == [draft]
    assert no_match.courses == ()
    assert no_match.total_count == 0
    # total_count reflects the filtered set while paging still works on it.
    assert paged.total_count == 3
    assert len(paged.courses) == 1


@pytest.mark.asyncio
async def test_search_treats_like_wildcards_literally():
    token = uuid.uuid4().hex[:10]
    catalog_uc = _admin_catalog_uc()
    async with database.async_session_scope() as session:
        percent, underscore, lookalike = (
            _uid("wild-pct"),
            _uid("wild-us"),
            _uid("wild-x"),
        )
        session.add_all(
            [
                _course(percent, f"Save 100%{token}"),
                _course(underscore, f"snake_case{token}"),
                _course(lookalike, f"snakeXcase{token}"),
            ]
        )
        await session.flush()

    pct = await catalog_uc.list_admin_course_metrics(ADMIN_USER, 1, 50, f"100%{token}")
    under = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, 1, 50, f"snake_case{token}"
    )
    lone_percent = await catalog_uc.list_admin_course_metrics(
        ADMIN_USER, 1, 50, f"%{token}"
    )

    assert [c.course_id for c in pct.courses] == [percent]
    # An unescaped "_" would also match "snakeXcase...".
    assert [c.course_id for c in under.courses] == [underscore]
    # "%" must not act as a wildcard: no title has a literal "%<token>" except one.
    assert [c.course_id for c in lone_percent.courses] == [percent]


@pytest.mark.asyncio
async def test_certificate_search_and_status_filters():
    token = uuid.uuid4().hex[:8].upper()
    async with database.async_session_scope() as session:
        repo = CertificateRepository(session)
        learner_id = _uid("cflt-learner")
        session.add(_user(learner_id))
        course_ids = [_uid("cflt-course") for _ in range(3)]
        session.add_all([_course(cid, f"Cert course {cid}") for cid in course_ids])
        await session.flush()

        by_id, by_learner, by_course = (f"CERT-{token}-{n}" for n in "ABC")
        session.add_all(
            [
                CertificateModel(
                    certificate_id=by_id,
                    user_id=learner_id,
                    course_id=course_ids[0],
                    learner_name="Someone",
                    course_title="Plain A",
                    partner_name="P",
                    issue_date="22/07/2026",
                    verification_url=f"/verify/{by_id}",
                ),
                CertificateModel(
                    certificate_id=by_learner,
                    user_id=learner_id,
                    course_id=course_ids[1],
                    learner_name=f"Nguyen {token}",
                    course_title="Plain B",
                    partner_name="P",
                    issue_date="22/07/2026",
                    verification_url=f"/verify/{by_learner}",
                    is_revoked=True,
                    revoked_reason="fraud",
                ),
                CertificateModel(
                    certificate_id=by_course,
                    user_id=learner_id,
                    course_id=course_ids[2],
                    learner_name="Other",
                    course_title=f"Deep {token} Learning",
                    partner_name="P",
                    issue_date="22/07/2026",
                    verification_url=f"/verify/{by_course}",
                ),
            ]
        )
        await session.flush()

        matches = await repo.list_admin_certificates(1, 50, token.lower())
        valid_only = await repo.list_admin_certificates(1, 50, token, False)
        revoked_only = await repo.list_admin_certificates(1, 50, token, True)
        by_id_fragment = await repo.list_admin_certificates(1, 50, f"cert-{token}-b")
        no_match = await repo.list_admin_certificates(1, 50, f"zzz{token}")

    assert {c.certificate_id for c in matches.certificates} == {
        by_id,
        by_learner,
        by_course,
    }
    assert matches.total_count == 3
    assert {c.certificate_id for c in valid_only.certificates} == {by_id, by_course}
    assert [c.certificate_id for c in revoked_only.certificates] == [by_learner]
    assert revoked_only.total_count == 1
    assert [c.certificate_id for c in by_id_fragment.certificates] == [by_learner]
    assert no_match.certificates == ()
    assert no_match.total_count == 0


@pytest.mark.asyncio
async def test_course_queries_respect_organization_scope():
    token = uuid.uuid4().hex[:10]
    async with database.async_session_scope() as session:
        repo = SQLAlchemyCatalogRepository(session)
        internal, foreign = _uid("org-internal"), _uid("org-foreign")
        session.add_all(
            [
                _course(internal, f"Scope {token} internal"),
                _course(
                    foreign,
                    f"Scope {token} foreign",
                    organization_id=_uid("some-other-org"),
                ),
            ]
        )
        await session.flush()

        as_admin = await repo.list_admin_course_summaries(token)

        set_current_user(CurrentUser(id="plain-user", role="USER_ROLE_LEARNER"))
        as_learner = await repo.list_admin_course_summaries(token)

        set_current_user(None)
        anonymous = await repo.list_admin_course_summaries(token)

    assert {c.course_id for c in as_admin} == {internal, foreign}
    # Non-admin and anonymous callers only ever see the platform's internal org.
    assert [c.course_id for c in as_learner] == [internal]
    assert [c.course_id for c in anonymous] == [internal]
