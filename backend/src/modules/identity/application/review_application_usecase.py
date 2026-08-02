from datetime import datetime, timezone
from typing import Optional
from src.modules.identity.domain.constants import INTERNAL_SYSTEM_ORG_ID
from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
    UserRole,
)
from src.modules.identity.infrastructure.repository import (
    IdentityRepository,
    InstructorApplicationRepository,
    OrganizationRepository,
)


class ReviewInstructorApplicationUseCase:
    def __init__(
        self,
        application_repo: InstructorApplicationRepository,
        identity_repo: IdentityRepository,
        org_repo: Optional[OrganizationRepository] = None,
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

        now_str = datetime.now(timezone.utc).isoformat()
        application.reviewed_at = now_str

        if approve:
            application.status = ApplicationStatus.APPROVED
            application.rejection_reason = ""

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
                    role_id="role_org_instructor",
                    status="ACTIVE",
                )
        else:
            application.status = ApplicationStatus.REJECTED
            application.rejection_reason = (
                rejection_reason.strip()
                or "Hồ sơ chưa đáp ứng tiêu chuẩn thẩm định năng lực giảng dạy."
            )

        saved_app = await self._application_repo.save(application)

        # Trigger notification
        try:
            from src.modules.notification.application.use_cases import (
                NotificationUseCase,
            )
            from src.modules.notification.domain.constants import NotificationCategory

            notif_uc = NotificationUseCase()
            if approve:
                await notif_uc.send_notification(
                    recipient_id=application.user_id,
                    category=NotificationCategory.SYSTEM,
                    title="Đơn đăng ký Giảng viên đã được phê duyệt",
                    content="Chúc mừng! Tài khoản của bạn đã được nâng cấp lên vai trò Giảng viên và gán vào Coursera Project Network.",
                    action_url="/instructor/courses",
                )
            else:
                await notif_uc.send_notification(
                    recipient_id=application.user_id,
                    category=NotificationCategory.SYSTEM,
                    title="Đơn đăng ký Giảng viên chưa được chấp thuận",
                    content=f"Lý do: {application.rejection_reason}",
                    action_url="/become-an-instructor",
                )
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning("Failed to send notification: %s", e)

        return saved_app
