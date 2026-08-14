from dataclasses import dataclass

from src.shared.domain.events import DomainEvent


@dataclass
class ForumReplyCreatedDomainEvent(DomainEvent):
    thread_id: str = ""
    reply_id: str = ""
    author_id: str = ""
    author_name: str = ""
    thread_author_id: str = ""
    content: str = ""
    course_id: str = ""
    item_id: str = ""
