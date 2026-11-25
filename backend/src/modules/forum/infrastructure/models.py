from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid6 import uuid7

from src.shared.infrastructure.database import Base


def utc_now_str() -> str:
    return datetime.now(UTC).isoformat()


class ForumThreadORM(Base):
    __tablename__ = "forum_threads"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid7())
    )
    course_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(
        String(255), nullable=False, default="", index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Student"
    )
    author_user_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(
        String(100), nullable=False, default=utc_now_str, index=True
    )
    upvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_staff_pinned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_solved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false", index=True
    )
    is_edited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    edited_at: Mapped[str] = mapped_column(String(100), nullable=False, default="")

    __table_args__ = (
        Index(
            "idx_forum_threads_title_trgm",
            func.immutable_unaccent(func.lower(title)).label("title_unaccent"),
            postgresql_using="gin",
            postgresql_ops={"title_unaccent": "gin_trgm_ops"},
        ),
        Index(
            "idx_forum_threads_content_trgm",
            func.immutable_unaccent(func.lower(content)).label("content_unaccent"),
            postgresql_using="gin",
            postgresql_ops={"content_unaccent": "gin_trgm_ops"},
        ),
        Index(
            "idx_forum_threads_author_name_trgm",
            func.immutable_unaccent(func.lower(author_name)).label(
                "author_name_unaccent"
            ),
            postgresql_using="gin",
            postgresql_ops={"author_name_unaccent": "gin_trgm_ops"},
        ),
    )

    replies: Mapped[list["ForumReplyORM"]] = relationship(
        "ForumReplyORM",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ForumReplyORM.created_at.asc()",
        lazy="selectin",
    )


class ForumReplyORM(Base):
    __tablename__ = "forum_replies"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid7())
    )
    thread_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("forum_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Student"
    )
    author_user_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_staff_answer: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    upvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(
        String(100), nullable=False, default=utc_now_str, index=True
    )
    is_edited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    edited_at: Mapped[str] = mapped_column(String(100), nullable=False, default="")

    __table_args__ = (
        Index(
            "idx_forum_replies_content_trgm",
            func.immutable_unaccent(func.lower(content)).label(
                "reply_content_unaccent"
            ),
            postgresql_using="gin",
            postgresql_ops={"reply_content_unaccent": "gin_trgm_ops"},
        ),
    )

    thread: Mapped[ForumThreadORM] = relationship(
        "ForumThreadORM", back_populates="replies"
    )


class ForumVoteORM(Base):
    __tablename__ = "forum_votes"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_forum_user_post_vote"),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: str(uuid7())
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    post_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[str] = mapped_column(
        String(100), nullable=False, default=utc_now_str
    )
