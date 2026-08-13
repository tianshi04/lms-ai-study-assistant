from typing import Any

from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.assessment.domain.constants import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_EASY_COUNT,
    DEFAULT_QUIZ_HARD_COUNT,
    DEFAULT_QUIZ_MEDIUM_COUNT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    QUIZ_COOLDOWN_HOURS,
)
from src.shared.infrastructure.database import Base


class HonorCodeModel(Base):
    __tablename__ = "honor_code_agreements"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:item_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    is_agreed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    agreed_at: Mapped[str] = mapped_column(String(64), nullable=False)


class QuizSubmissionModel(Base):
    __tablename__ = "quiz_submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    selected_option_indexes: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False
    )
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class QuizCooldownModel(Base):
    __tablename__ = "quiz_cooldowns"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:item_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    failed_attempts_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    last_attempt_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cooldown_until: Mapped[str | None] = mapped_column(String(64), nullable=True)


class LabSubmissionModel(Base):
    __tablename__ = "lab_submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False, default="python")
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    total_test_cases: Mapped[int] = mapped_column(Integer, nullable=False)
    passed_test_cases: Mapped[int] = mapped_column(Integer, nullable=False)
    test_logs: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class PeerAssignmentSubmissionModel(Base):
    __tablename__ = "peer_assignment_submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uq_peer_submission_user_item"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    submission_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    text_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    final_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    graded_by_staff: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )


class PeerReviewModel(Base):
    __tablename__ = "peer_reviews"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "reviewer_user_id",
            name="uq_peer_review_submission_reviewer",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    submission_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    reviewer_user_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rubric_criteria_json: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    total_score: Mapped[float] = mapped_column(Float, nullable=False)
    is_outlier: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class GradeAppealModel(Base):
    __tablename__ = "grade_appeals"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "submission_id", name="uq_grade_appeal_user_submission"
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    submission_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    appeal_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class QuestionBankModel(Base):
    __tablename__ = "question_banks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PRACTICE"
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)

    questions: Mapped[list["QuestionModel"]] = relationship(
        "QuestionModel", back_populates="bank", cascade="all, delete-orphan"
    )


class QuestionModel(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    bank_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("question_banks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="SINGLE_CHOICE"
    )
    difficulty: Mapped[str] = mapped_column(String(16), nullable=False, default="EASY")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)

    bank: Mapped["QuestionBankModel"] = relationship(
        "QuestionBankModel", back_populates="questions"
    )
    options: Mapped[list["QuestionOptionModel"]] = relationship(
        "QuestionOptionModel", back_populates="question", cascade="all, delete-orphan"
    )


class QuestionOptionModel(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    question_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question: Mapped["QuestionModel"] = relationship(
        "QuestionModel", back_populates="options"
    )


class QuizMatrixModel(Base):
    __tablename__ = "quiz_matrices"

    item_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    bank_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("question_banks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    time_limit_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_QUIZ_TIME_LIMIT_MINUTES
    )
    passing_threshold_percent: Mapped[float] = mapped_column(
        Float, nullable=False, default=DEFAULT_PASSING_THRESHOLD_PERCENT
    )
    easy_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_QUIZ_EASY_COUNT
    )
    medium_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_QUIZ_MEDIUM_COUNT
    )
    hard_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_QUIZ_HARD_COUNT
    )
    shuffle_options: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    max_attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
        server_default=str(MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN),
    )
    cooldown_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=QUIZ_COOLDOWN_HOURS,
        server_default=str(QUIZ_COOLDOWN_HOURS),
    )


class QuizSessionModel(Base):
    """Stores the immutable question order and answer key for one quiz attempt."""

    __tablename__ = "quiz_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    questions_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    started_at: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[str] = mapped_column(String(64), nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    passing_threshold_percent: Mapped[float] = mapped_column(Float, nullable=False)
    submitted_at: Mapped[str | None] = mapped_column(String(64), nullable=True)


class QuizActiveSessionModel(Base):
    """Stores the active quiz attempt session to prevent race conditions and cheat exploits."""

    __tablename__ = "quiz_active_sessions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:item_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    session_seed: Mapped[int] = mapped_column(Integer, nullable=False)
    questions_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    started_at: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[str] = mapped_column(String(64), nullable=False)
