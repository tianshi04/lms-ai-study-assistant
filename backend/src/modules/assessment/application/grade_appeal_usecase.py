import logging
import uuid
from datetime import UTC, datetime

from src.modules.assessment.domain import GradeAppeal
from src.shared.infrastructure.database import async_session_scope

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


class GradeAppealUseCase(BaseAssessmentUseCase):
    """Application Use Case for Grade Appeals handling."""

    async def submit_grade_appeal(
        self, user_id: str, submission_id: str, appeal_reason: str
    ) -> tuple[bool, str]:
        appeal_id = f"appeal-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(UTC).isoformat()
        appeal = GradeAppeal(
            id=appeal_id,
            user_id=user_id,
            submission_id=submission_id,
            appeal_reason=appeal_reason,
            status="PENDING",
            created_at=now_iso,
        )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if sub and sub.user_id != user_id:
                logger.warning(
                    "User %s attempted to submit grade appeal for submission %s belonging to another user",
                    user_id,
                    submission_id,
                )
                raise PermissionError(
                    "Bạn chỉ có quyền gửi khiếu nại điểm đối với bài nộp của chính mình."
                )

            await repo.save_grade_appeal(appeal)

        return True, "PENDING"
