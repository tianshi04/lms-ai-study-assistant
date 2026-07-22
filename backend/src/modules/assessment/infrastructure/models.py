from typing import Any
from sqlalchemy import ARRAY, Boolean, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

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
    selected_option_indexes: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class QuizCooldownModel(Base):
    __tablename__ = "quiz_cooldowns"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)  # user_id:item_id
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    failed_attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
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

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    submission_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    text_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class PeerReviewModel(Base):
    __tablename__ = "peer_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    submission_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    reviewer_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rubric_criteria_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    total_score: Mapped[float] = mapped_column(Float, nullable=False)
    is_outlier: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class GradeAppealModel(Base):
    __tablename__ = "grade_appeals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    submission_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    appeal_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
