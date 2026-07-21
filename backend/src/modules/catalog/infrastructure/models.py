from sqlalchemy import ARRAY, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.catalog.domain.entities import ItemType
from src.shared.infrastructure.database import Base


class SpecializationModel(Base):
    __tablename__ = "specializations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    partner_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    partner_logo_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    course_ids: Mapped[list[str]] = mapped_column(ARRAY(String(64)), nullable=False, default=list)


class CourseModel(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    partner_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    partner_logo_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    instructor_names: Mapped[list[str]] = mapped_column(ARRAY(String(128)), nullable=False, default=list)

    week_modules: Mapped[list["WeekModuleModel"]] = relationship(
        "WeekModuleModel", back_populates="course", cascade="all, delete-orphan", order_by="WeekModuleModel.week_number"
    )


class WeekModuleModel(Base):
    __tablename__ = "week_modules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")

    course: Mapped["CourseModel"] = relationship("CourseModel", back_populates="week_modules")
    lessons: Mapped[list["LessonModel"]] = relationship(
        "LessonModel", back_populates="week_module", cascade="all, delete-orphan"
    )


class LessonModel(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    week_module_id: Mapped[str] = mapped_column(String(64), ForeignKey("week_modules.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)

    week_module: Mapped["WeekModuleModel"] = relationship("WeekModuleModel", back_populates="lessons")
    items: Mapped[list["LearningItemModel"]] = relationship(
        "LearningItemModel", back_populates="lesson", cascade="all, delete-orphan"
    )


class LearningItemModel(Base):
    __tablename__ = "learning_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(String(64), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ItemType] = mapped_column(SQLEnum(ItemType), nullable=False, default=ItemType.UNSPECIFIED)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    video_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    vtt_subtitle_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    reading_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")

    lesson: Mapped["LessonModel"] = relationship("LessonModel", back_populates="items")
    interactive_transcripts: Mapped[list["InteractiveTranscriptModel"]] = relationship(
        "InteractiveTranscriptModel", back_populates="item", cascade="all, delete-orphan", order_by="InteractiveTranscriptModel.timestamp_seconds"
    )
    in_video_quizzes: Mapped[list["InVideoQuizModel"]] = relationship(
        "InVideoQuizModel", back_populates="item", cascade="all, delete-orphan", order_by="InVideoQuizModel.timestamp_seconds"
    )


class InteractiveTranscriptModel(Base):
    __tablename__ = "interactive_transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(64), ForeignKey("learning_items.id", ondelete="CASCADE"), nullable=False)
    timestamp_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    item: Mapped["LearningItemModel"] = relationship("LearningItemModel", back_populates="interactive_transcripts")


class InVideoQuizModel(Base):
    __tablename__ = "in_video_quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(64), ForeignKey("learning_items.id", ondelete="CASCADE"), nullable=False)
    timestamp_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")

    item: Mapped["LearningItemModel"] = relationship("LearningItemModel", back_populates="in_video_quizzes")
