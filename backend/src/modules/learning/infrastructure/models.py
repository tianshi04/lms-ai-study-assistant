from datetime import UTC, date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    Date,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.learning.domain import DeadlineStatus
from src.shared.infrastructure.database import Base


def utc_now_str() -> str:
    return datetime.now(UTC).isoformat()


class LearningProgressModel(Base):
    __tablename__ = "learning_progresses"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:course_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    overall_progress_percent: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    completed_item_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )
    last_reset_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_accessed_at: Mapped[str | None] = mapped_column(
        String(64), nullable=True, default=None
    )
    last_accessed_item_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, default=None
    )
    enrolled_at: Mapped[str] = mapped_column(
        String(64), nullable=False, default=utc_now_str, server_default=""
    )
    completed_at: Mapped[str | None] = mapped_column(
        String(64), nullable=True, default=None
    )

    weekly_deadlines: Mapped[list["WeeklyDeadlineModel"]] = relationship(
        "WeeklyDeadlineModel",
        back_populates="progress",
        cascade="all, delete-orphan",
        order_by="WeeklyDeadlineModel.week_number",
        lazy="selectin",
    )


class WeeklyDeadlineModel(Base):
    __tablename__ = "weekly_deadlines"
    __table_args__ = (
        UniqueConstraint(
            "progress_id", "week_number", name="uq_weekly_deadline_progress_week"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    progress_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("learning_progresses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[DeadlineStatus] = mapped_column(
        SQLEnum(DeadlineStatus), nullable=False, default=DeadlineStatus.UNSPECIFIED
    )

    progress: Mapped["LearningProgressModel"] = relationship(
        "LearningProgressModel", back_populates="weekly_deadlines"
    )


class PersonalNoteModel(Base):
    __tablename__ = "personal_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    highlighted_text: Mapped[str] = mapped_column(Text, nullable=False)
    note_comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    timestamp_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(64), nullable=False, default=utc_now_str, server_default=""
    )


class LearningItemProgressModel(Base):
    __tablename__ = "learning_item_progresses"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    item_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    time_spent_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    last_studied_at: Mapped[str] = mapped_column(
        String(64), nullable=False, default=utc_now_str, server_default=""
    )


class DailyLearningRecordModel(Base):
    __tablename__ = "daily_learning_records"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    study_date: Mapped[date] = mapped_column(Date, primary_key=True)
    total_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    is_streak_qualified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )


class UserLearningStreakModel(Base):
    __tablename__ = "user_learning_streaks"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    current_streak: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    longest_streak: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    last_active_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, default=None
    )
    total_study_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    updated_at: Mapped[str] = mapped_column(
        String(64), nullable=False, default=utc_now_str, server_default=""
    )
