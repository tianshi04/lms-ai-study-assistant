from datetime import UTC, datetime

from src.modules.identity.domain.constants import INTERNAL_SYSTEM_ORG_ID
from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
    UserRole,
)
from src.modules.identity.domain.events import (
    InstructorApplicationReviewedDomainEvent,
)
from src.modules.identity.infrastructure.repository import (
    IdentityRepository,
    InstructorApplicationRepository,
    OrganizationRepository,
)
from src.shared.infrastructure.event_bus import EventBus
from src.shared.permissions import OrgRole


class ReviewInstructorApplicationUseCase:
    def __init__(
        self,
        application_repo: InstructorApplicationRepository,
        identity_repo: IdentityRepository,
        org_repo: OrganizationRepository | None = None,
    ) -> None:
        self._application_repo = application_repo
        self._identity_repo = identity_repo
        self._org_repo = org_repo

    async def execute(
        self,
        application_id: str,
        approve: bool,
        rejection_reason: str = "",
    ) -> InstructorApplication:
        application = await self._application_repo.get_by_id(application_id)
        if not application:
            raise ValueError("Không tìm thấy đơn đăng ký Giảng viên.")

        if application.status != ApplicationStatus.PENDING_REVIEW:
            raise ValueError("Đơn đăng ký này đã được xử lý trước đó.")

        now_str = datetime.now(UTC).isoformat()

        if approve:
            application.approve(reviewed_at=now_str)

            # Promote applicant user role to INSTRUCTOR
            applicant = await self._identity_repo.get_by_id(application.user_id)
            if applicant:
                applicant.role = UserRole.INSTRUCTOR
                if application.title and not applicant.title:
                    applicant.title = application.title
                await self._identity_repo.save(applicant)

            # Auto-link applicant to system default organization
            if self._org_repo:
                await self._org_repo.add_member(
                    user_id=application.user_id,
                    org_id=INTERNAL_SYSTEM_ORG_ID,
                    role_id=OrgRole.INSTRUCTOR.value,
                    status="ACTIVE",
                )
        else:
            reason = (
                rejection_reason.strip()
                or "Hồ sơ chưa đáp ứng tiêu chuẩn thẩm định năng lực giảng dạy."
            )
            application.reject(reason=reason, reviewed_at=now_str)

        saved_app = await self._application_repo.save(application)

        # Trigger domain event
        await EventBus.publish(
            InstructorApplicationReviewedDomainEvent(
                application_id=saved_app.id,
                user_id=saved_app.user_id,
                is_approved=approve,
                status=saved_app.status.value,
                reviewer_notes=saved_app.rejection_reason,
            )
        )

        return saved_app
