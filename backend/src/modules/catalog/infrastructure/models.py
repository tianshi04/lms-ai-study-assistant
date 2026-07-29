from sqlalchemy import (
    ARRAY,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Float,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.catalog.domain.entities import ItemType
from src.shared.infrastructure.database import Base


class SpecializationModel(Base):
    __tablename__ = "specializations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    partner_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    partner_logo_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    course_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )


class CategoryModel(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    type: Mapped[str] = mapped_column(String(32), nullable=False)  # SUBJECT or LEVEL
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class CourseModel(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    partner_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    partner_logo_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    instructor_names: Mapped[list[str]] = mapped_column(
        ARRAY(String(128)), nullable=False, default=list
    )
    subject: Mapped[str] = mapped_column(
        String(64), nullable=False, server_default="UNSPECIFIED"
    )
    level: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="UNSPECIFIED"
    )
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    co_instructor_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )
    average_rating: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0"
    )
    review_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    financial_aid_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    price: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="1190000.0"
    )
    currency: Mapped[str] = mapped_column(
        String(8), nullable=False, server_default="VND"
    )
    is_plus_eligible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    week_modules: Mapped[list["WeekModuleModel"]] = relationship(
        "WeekModuleModel",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="WeekModuleModel.week_number",
    )


class WeekModuleModel(Base):
    __tablename__ = "week_modules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")

    course: Mapped["CourseModel"] = relationship(
        "CourseModel", back_populates="week_modules"
    )
    lessons: Mapped[list["LessonModel"]] = relationship(
        "LessonModel",
        back_populates="week_module",
        cascade="all, delete-orphan",
        order_by="LessonModel.order_index",
    )


class LessonModel(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    week_module_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("week_modules.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    week_module: Mapped["WeekModuleModel"] = relationship(
        "WeekModuleModel", back_populates="lessons"
    )
    items: Mapped[list["LearningItemModel"]] = relationship(
        "LearningItemModel",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LearningItemModel.order_index",
    )


class LearningItemModel(Base):
    __tablename__ = "learning_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ItemType] = mapped_column(
        SQLEnum(ItemType), nullable=False, default=ItemType.UNSPECIFIED
    )
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    video_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    vtt_subtitle_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    reading_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    order_index: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    test_cases_json: Mapped[str] = mapped_column(Text, nullable=False, default="")
    language: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    rubric_criteria_json: Mapped[str] = mapped_column(Text, nullable=False, default="")
    quiz_matrix_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    auto_transcribe: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    lesson: Mapped["LessonModel"] = relationship("LessonModel", back_populates="items")
    interactive_transcripts: Mapped[list["InteractiveTranscriptModel"]] = relationship(
        "InteractiveTranscriptModel",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="InteractiveTranscriptModel.timestamp_seconds",
    )
    in_video_quizzes: Mapped[list["InVideoQuizModel"]] = relationship(
        "InVideoQuizModel",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="InVideoQuizModel.timestamp_seconds",
    )


class InteractiveTranscriptModel(Base):
    __tablename__ = "interactive_transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("learning_items.id", ondelete="CASCADE"), nullable=False
    )
    timestamp_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    item: Mapped["LearningItemModel"] = relationship(
        "LearningItemModel", back_populates="interactive_transcripts"
    )


class InVideoQuizModel(Base):
    __tablename__ = "in_video_quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("learning_items.id", ondelete="CASCADE"), nullable=False
    )
    timestamp_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(
        JSON().with_variant(ARRAY(Text), "postgresql"), nullable=False
    )
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")

    item: Mapped["LearningItemModel"] = relationship(
        "LearningItemModel", back_populates="in_video_quizzes"
    )


class CourseReviewModel(Base):
    __tablename__ = "course_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_course_reviews_user_course"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    course_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating_stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    is_verified_completer: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )


class CourseAnnouncementModel(Base):
    __tablename__ = "course_announcements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    author_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
