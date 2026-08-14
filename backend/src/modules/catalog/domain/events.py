from dataclasses import dataclass, field

from src.shared.domain.events import DomainEvent


@dataclass
class CourseAnnouncementCreatedDomainEvent(DomainEvent):
    course_id: str = ""
    announcement_id: str = ""
    title: str = ""
    content: str = ""
    author_name: str = ""
    student_ids: list[str] = field(default_factory=list)
