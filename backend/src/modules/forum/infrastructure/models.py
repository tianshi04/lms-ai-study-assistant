import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.shared.infrastructure.database import Base


def utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


class ForumThreadORM(Base):
    __tablename__ = "forum_threads"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    course_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(255), nullable=False, default="", index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(String(100), nullable=False, default="Student")
    author_user_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(100), nullable=False, default=utc_now_str)
    upvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_staff_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    replies: Mapped[list["ForumReplyORM"]] = relationship(
        "ForumReplyORM",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ForumReplyORM.created_at.asc()",
    )


class ForumReplyORM(Base):
    __tablename__ = "forum_replies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(String(100), nullable=False, default="Student")
    author_user_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_staff_answer: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    upvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(String(100), nullable=False, default=utc_now_str)

    thread: Mapped[ForumThreadORM] = relationship(
        "ForumThreadORM", back_populates="replies"
    )


class ForumVoteORM(Base):
    __tablename__ = "forum_votes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    post_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[str] = mapped_column(String(100), nullable=False, default=utc_now_str)
