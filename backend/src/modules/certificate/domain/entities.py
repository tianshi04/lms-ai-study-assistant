from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Optional


from src.modules.certificate.domain.constants import (
    DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS,
)


class FinancialAidStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    AUTO_APPROVED = "AUTO_APPROVED"


def count_words(text: str) -> int:
    return len(text.strip().split())


@dataclass
class FinancialAidApplication:
    id: str
    user_id: str
    course_id: str
    essay_150_words: str
    status: FinancialAidStatus
    review_deadline_days_left: int = DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS

    def __post_init__(self) -> None:
        self.status = FinancialAidStatus(self.status)

    @property
    def prevents_resubmission(self) -> bool:
        return self.status in {
            FinancialAidStatus.PENDING,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.AUTO_APPROVED,
        }

    def resubmit(self, essay_150_words: str) -> None:
        """Restarts a rejected application with the learner's revised essay."""
        self.essay_150_words = essay_150_words
        self.status = FinancialAidStatus.PENDING
        self.review_deadline_days_left = DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS

    def auto_approve_if_overdue(self) -> bool:
        if (
            self.status == FinancialAidStatus.PENDING
            and self.review_deadline_days_left <= 0
        ):
            self.status = FinancialAidStatus.AUTO_APPROVED
            self.review_deadline_days_left = 0
            return True
        return False

    def review(self, is_approved: bool) -> None:
        self.status = (
            FinancialAidStatus.APPROVED if is_approved else FinancialAidStatus.REJECTED
        )
        self.review_deadline_days_left = 0


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
    open_badges_json_ld: dict[str, Any]
    course_id: Optional[str] = None
    is_revoked: bool = False
    revoked_reason: str = ""
    specialization_id: Optional[str] = None
