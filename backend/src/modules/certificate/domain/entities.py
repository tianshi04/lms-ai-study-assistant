from dataclasses import dataclass
from typing import Optional


@dataclass
class FinancialAidApplication:
    id: str
    user_id: str
    course_id: str
    essay_150_words: str
    status: str  # PENDING, APPROVED, REJECTED
    review_deadline_days_left: int = 15


@dataclass
class VerifiedCertificate:
    certificate_id: str
    user_id: str
    learner_name: str
    course_title: str
    partner_name: str
    partner_logo_url: str
    issue_date: str
    verification_url: str
    qr_code_url: str
    open_badges_json_ld: str
    course_id: Optional[str] = None
    is_revoked: bool = False
    revoked_reason: str = ""
    specialization_id: Optional[str] = None
