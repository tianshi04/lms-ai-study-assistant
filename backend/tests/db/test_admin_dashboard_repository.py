"""Real-PostgreSQL checks for the admin dashboard aggregate queries.

Runs inside the rolled-back savepoint fixture from ``tests/db/conftest.py``.
Assertions compare against a baseline snapshot so pre-existing rows in the
database never affect the result.
"""

import uuid

import pytest

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
)
from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.models import CourseModel, CourseReviewModel
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.identity.domain import (
    AdminAssessmentAlertKind,
    AdminCertificateSummary,
    AdminCourseQualityMetric,
    UserRole,
)
from src.modules.identity.infrastructure.admin_dashboard_repository import (
    AdminDashboardRepository,
)
from src.modules.identity.infrastructure.models import (
    InstructorApplicationModel,
    UserModel,
)
from src.modules.learning.infrastructure.models import LearningProgressModel
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
    UserSubscriptionModel,
)
from src.shared.infrastructure import database

FUTURE_TS = "9999-12-31T00:00:00+00:00"


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


async def _fetch_all_course_metrics(
    repo: AdminDashboardRepository, page_size: int = 50
) -> list[AdminCourseQualityMetric]:
    """Walk every page of ``list_course_metrics`` and return all rows in order."""
    rows: list[AdminCourseQualityMetric] = []
    page = 1
    while True:
        result = await repo.list_course_metrics(page, page_size)
        rows.extend(result.courses)
        if len(rows) >= result.total_count or not result.courses:
            return rows
        page += 1


async def _fetch_all_certificates(
    repo: AdminDashboardRepository, page_size: int = 50
) -> list[AdminCertificateSummary]:
    """Walk every page of ``list_certificates`` and return all rows in order."""
    rows: list[AdminCertificateSummary] = []
    page = 1
    while True:
        result = await repo.list_certificates(page, page_size)
        rows.extend(result.certificates)
        if len(rows) >= result.total_count or not result.certificates:
            return rows
        page += 1


@pytest.mark.asyncio
async def test_certificates_are_paginated_valid_first_then_revoked():
    async with database.async_session_scope() as session:
        repo = AdminDashboardRepository(session)
        before = await repo.list_certificates(1, 1)

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
        first_page = await repo.list_certificates(1, 2)

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
    async with database.async_session_scope() as session:
        repo = AdminDashboardRepository(session)
        before = await repo.list_course_metrics(1, 1)

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

        first_page = await repo.list_course_metrics(1, 2)
        second_page = await repo.list_course_metrics(2, 2)
        everything = await _fetch_all_course_metrics(repo)

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
async def test_dashboard_stats_reflect_seeded_rows():
    async with database.async_session_scope() as session:
        repo = AdminDashboardRepository(session)
        before = await repo.get_dashboard_stats()

        learner_id = _uid("dash-learner")
        reviewer_id = _uid("dash-reviewer")
        course_id = _uid("dash-course")
        other_course_id = _uid("dash-course2")
        missing_course_id = _uid("dash-missing-course")
        submission_id = _uid("dash-sub")
        review_id = _uid("dash-review")
        cert_id = f"0000-DASH-{uuid.uuid4().hex[:8].upper()}"

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

        after = await repo.get_dashboard_stats()
        all_metrics = await _fetch_all_course_metrics(repo)
        all_certificates = await _fetch_all_certificates(repo)

    b, a = before.overview, after.overview
    assert a.total_users == b.total_users + 2
    assert a.learner_count == b.learner_count + 1
    assert a.instructor_count == b.instructor_count + 1
    assert a.verified_user_count == b.verified_user_count + 1
    assert a.total_courses == b.total_courses + 2
    assert a.published_courses == b.published_courses + 1
    assert a.pending_review_courses == b.pending_review_courses + 1
    assert a.total_enrollments == b.total_enrollments + 2
    assert a.completed_enrollments == b.completed_enrollments + 1
    assert a.total_reviews == b.total_reviews + 1
    assert a.rating_distribution[0] == b.rating_distribution[0] + 1
    assert a.total_revenue == pytest.approx(b.total_revenue + 1_200_000.0)
    assert a.course_purchase_count == b.course_purchase_count + 1
    assert a.active_subscriptions == b.active_subscriptions + 1
    assert a.certificates_issued == b.certificates_issued + 1
    assert a.certificates_revoked == b.certificates_revoked + 1
    assert a.approved_financial_aids == b.approved_financial_aids + 1
    assert a.pending_financial_aids == b.pending_financial_aids + 1
    assert a.pending_instructor_applications == b.pending_instructor_applications + 1

    metric = next(m for m in all_metrics if m.course_id == course_id)
    assert metric.enrolled_count == 2
    assert metric.completed_count == 1
    assert metric.revenue == pytest.approx(1_000_000.0)
    assert metric.status == "PUBLISHED"
    assert metric.partner_name == "Dash Partner"
    pending_metric = next(m for m in all_metrics if m.course_id == other_course_id)
    assert pending_metric.enrolled_count == 0
    assert pending_metric.revenue == 0.0
    assert pending_metric.status == "PENDING_REVIEW"

    low = next(r for r in after.low_reviews if r.review_id == review_id)
    assert low.rating_stars == 1
    assert low.course_title == "Dash Course"

    kinds = {
        a.kind: a for a in after.assessment_alerts if a.submission_id == submission_id
    }
    assert AdminAssessmentAlertKind.REPORTED_PEER_REVIEW in kinds
    assert (
        kinds[AdminAssessmentAlertKind.REPORTED_PEER_REVIEW].user_name == "Dash Learner"
    )
    assert AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW in kinds
    outlier = kinds[AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW]
    assert outlier.user_name == "Dash Reviewer"
    assert outlier.total_score == pytest.approx(10.0)
    assert all(alert.reason != "already handled" for alert in after.assessment_alerts)

    cert = next(c for c in all_certificates if c.certificate_id == cert_id)
    assert cert.is_revoked is True
    assert cert.revoked_reason == "cheating"

    # True totals are reported even though the alert lists are capped.
    assert after.low_review_total == before.low_review_total + 1
    # One reported peer review (appeal) + one outlier; the resolved appeal is excluded.
    assert after.assessment_alert_total == before.assessment_alert_total + 2
