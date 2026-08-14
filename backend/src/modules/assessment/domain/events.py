from dataclasses import dataclass

from src.shared.domain.events import DomainEvent


@dataclass
class QuizSubmittedDomainEvent(DomainEvent):
    user_id: str = ""
    course_id: str = ""
    item_id: str = ""
    score_percent: float = 0.0
    passed: bool = False
    attempt_number: int = 1


@dataclass
class LabSubmittedDomainEvent(DomainEvent):
    user_id: str = ""
    course_id: str = ""
    item_id: str = ""
    passed: bool = False
    test_cases_passed: int = 0
    total_test_cases: int = 0


@dataclass
class PeerReviewSubmittedDomainEvent(DomainEvent):
    reviewer_id: str = ""
    submission_id: str = ""
    author_id: str = ""
    score: float = 0.0
