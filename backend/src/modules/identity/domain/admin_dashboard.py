"""Read models for the Super Admin dashboard (platform-wide aggregates)."""

from dataclasses import dataclass, field
from enum import Enum


class AdminAssessmentAlertKind(str, Enum):
    GRADE_APPEAL = "GRADE_APPEAL"
    REPORTED_PEER_REVIEW = "REPORTED_PEER_REVIEW"
    OUTLIER_PEER_REVIEW = "OUTLIER_PEER_REVIEW"


@dataclass
class AdminOverviewMetrics:
    # Users
    total_users: int = 0
    learner_count: int = 0
    instructor_count: int = 0
    admin_count: int = 0
    verified_user_count: int = 0

    # Courses
    total_courses: int = 0
    published_courses: int = 0
    pending_review_courses: int = 0
    draft_courses: int = 0
    rejected_courses: int = 0

    # Learning
    total_enrollments: int = 0
    completed_enrollments: int = 0

    # Satisfaction (CSAT)
    total_reviews: int = 0
    average_rating: float = 0.0
    # Review counts for 1..5 stars; index 0 is 1 star, index 4 is 5 stars.
    rating_distribution: list[int] = field(default_factory=lambda: [0, 0, 0, 0, 0])

    # Revenue
    total_revenue: float = 0.0
    course_purchase_count: int = 0
    active_subscriptions: int = 0

    # Certificates and financial aid
    certificates_issued: int = 0
    certificates_revoked: int = 0
    approved_financial_aids: int = 0

    # Admin work queues
    pending_instructor_applications: int = 0
    pending_financial_aids: int = 0

    # Catalog and partners
    partner_count: int = 0
    category_count: int = 0


@dataclass
class AdminCourseQualityMetric:
    course_id: str
    title: str
    partner_name: str
    status: str
    enrolled_count: int = 0
    completed_count: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    revenue: float = 0.0


@dataclass
class AdminLowReviewAlert:
    review_id: str
    course_id: str
    course_title: str
    user_name: str
    rating_stars: int
    comment_text: str
    created_at: str


@dataclass
class AdminAssessmentAlert:
    alert_id: str
    kind: AdminAssessmentAlertKind
    submission_id: str
    user_id: str
    user_name: str = ""
    reason: str = ""
    total_score: float = 0.0
    created_at: str = ""


@dataclass
class AdminCertificateSummary:
    certificate_id: str
    learner_name: str
    course_title: str
    partner_name: str
    issue_date: str
    is_revoked: bool = False
    revoked_reason: str = ""


@dataclass
class AdminCourseMetricsPage:
    courses: list[AdminCourseQualityMetric] = field(default_factory=list)
    total_count: int = 0
    page: int = 1
    page_size: int = 0


@dataclass
class AdminCertificatesPage:
    certificates: list[AdminCertificateSummary] = field(default_factory=list)
    total_count: int = 0
    page: int = 1
    page_size: int = 0


@dataclass
class AdminDashboardStats:
    overview: AdminOverviewMetrics = field(default_factory=AdminOverviewMetrics)
    low_reviews: list[AdminLowReviewAlert] = field(default_factory=list)
    assessment_alerts: list[AdminAssessmentAlert] = field(default_factory=list)
    # Totals include alerts beyond the capped lists above.
    low_review_total: int = 0
    assessment_alert_total: int = 0
