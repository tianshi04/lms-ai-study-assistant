from dataclasses import dataclass

from src.shared.domain.events import DomainEvent


@dataclass
class FinancialAidReviewedDomainEvent(DomainEvent):
    application_id: str = ""
    user_id: str = ""
    course_id: str = ""
    is_approved: bool = False
    status: str = ""
    notes: str = ""


@dataclass
class CertificateIssuedDomainEvent(DomainEvent):
    certificate_id: str = ""
    user_id: str = ""
    course_id: str = ""
    certificate_code: str = ""
    course_title: str = ""
