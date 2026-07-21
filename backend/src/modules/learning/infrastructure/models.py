from sqlalchemy import ARRAY, Enum as SQLEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.learning.domain.entities import DeadlineStatus
from src.shared.infrastructure.database import Base


class LearningProgressModel(Base):
    __tablename__ = "learning_progresses"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:course_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False)
    overall_progress_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    completed_item_ids: Mapped[list[str]] = mapped_column(ARRAY(String(64)), nullable=False, default=list)

    weekly_deadlines: Mapped[list["WeeklyDeadlineModel"]] = relationship(
        "WeeklyDeadlineModel", back_populates="progress", cascade="all, delete-orphan", order_by="WeeklyDeadlineModel.week_number"
    )


class WeeklyDeadlineModel(Base):
    __tablename__ = "weekly_deadlines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    progress_id: Mapped[str] = mapped_column(String(128), ForeignKey("learning_progresses.id", ondelete="CASCADE"), nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[DeadlineStatus] = mapped_column(SQLEnum(DeadlineStatus), nullable=False, default=DeadlineStatus.UNSPECIFIED)

    progress: Mapped["LearningProgressModel"] = relationship("LearningProgressModel", back_populates="weekly_deadlines")


class PersonalNoteModel(Base):
    __tablename__ = "personal_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    highlighted_text: Mapped[str] = mapped_column(Text, nullable=False)
    note_comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
