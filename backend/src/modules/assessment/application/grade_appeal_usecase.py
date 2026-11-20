import logging
from datetime import UTC, datetime, timedelta

from uuid6 import uuid7

from src.modules.assessment.domain import (
    MAX_APPEAL_WINDOW_DAYS,
    PEER_SUBMISSION_STATUS_PUBLISHED,
    GradeAppeal,
)
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


class GradeAppealUseCase(BaseAssessmentUseCase):
    """Application Use Case for Grade Appeals handling (BR_PEER_007)."""

    async def submit_grade_appeal(
        self,
        user_id: str,
        submission_id: str,
        appeal_reason: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        if not appeal_reason or not appeal_reason.strip():
            raise ValueError("Lý do khiếu nại không được để trống.")

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
            if sub.user_id != user_id:
                logger.warning(
                    "User %s attempted to submit grade appeal for submission %s belonging to another user",
                    user_id,
                    submission_id,
                )
                raise PermissionError(
                    "Bạn chỉ có quyền gửi khiếu nại điểm đối với bài nộp của chính mình."
                )

            await self._verify_learner_item_access(
                session,
                repo,
                user_id,
                sub.item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )

            # BR_PEER_007: Appeal is only allowed after official grade publication
            if (
                sub.status != PEER_SUBMISSION_STATUS_PUBLISHED
                or sub.final_score is None
            ):
                raise ValueError(
                    "Chỉ có thể gửi khiếu nại sau khi bài nộp đã được công bố điểm chính thức."
                )

            # BR_PEER_007: Check if already appealed (max 1 appeal per submission)
            existing_appeal = await repo.get_grade_appeal(submission_id)
            if existing_appeal:
                raise ValueError(
                    "Bài nộp này đã có đơn khiếu nại trước đó (Mỗi bài chỉ được khiếu nại tối đa 1 lần)."
                )

            # BR_PEER_007: Check appeal window (7 days strictly from published_at)
            if sub.published_at:
                ref_dt = None
                try:
                    ref_dt = datetime.fromisoformat(sub.published_at)
                except (ValueError, TypeError):
                    pass
                if ref_dt is not None:
                    if ref_dt.tzinfo is None:
                        ref_dt = ref_dt.replace(tzinfo=UTC)
                    now = datetime.now(UTC)
                    if now > ref_dt + timedelta(days=MAX_APPEAL_WINDOW_DAYS):
                        raise ValueError(
                            f"Đã quá thời hạn khiếu nại {MAX_APPEAL_WINDOW_DAYS} ngày kể từ khi công bố điểm."
                        )

            appeal_id = f"appeal-{uuid7().hex}"
            now_iso = datetime.now(UTC).isoformat()
            appeal = GradeAppeal(
                id=appeal_id,
                user_id=user_id,
                submission_id=submission_id,
                appeal_reason=appeal_reason.strip(),
                status="PENDING",
                created_at=now_iso,
            )
            await repo.save_grade_appeal(appeal)

        return True, "PENDING"
