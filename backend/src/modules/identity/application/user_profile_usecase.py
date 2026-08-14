import logging

from src.modules.identity.application.review_application_usecase import (
    ReviewInstructorApplicationUseCase,
)
from src.modules.identity.application.submit_application_usecase import (
    SubmitInstructorApplicationUseCase,
)
from src.modules.identity.domain.entities import (
    InstructorApplication,
    User,
)
from src.modules.identity.infrastructure import repository as repo_module
from src.shared.auth import (
    CurrentUser,
)
from src.shared.infrastructure import database

logger = logging.getLogger(__name__)


class UserProfileUseCase:
    def _verify_admin(self, current_user: CurrentUser | None) -> None:
        if current_user is not None and not current_user.is_admin:
            raise PermissionError(
                "Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này."
            )

    async def get_user_profile(
        self, user_id: str, current_user: CurrentUser | None = None
    ) -> User | None:
        if current_user and user_id != current_user.id and not current_user.is_admin:
            raise PermissionError(
                "Bạn không có quyền xem hồ sơ cá nhân của người dùng khác."
            )
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            return await repo.get_by_id(user_id)

    async def verify_identity(
        self, user_id: str, id_card_number: str = ""
    ) -> tuple[bool, str]:
        """Completes biometric / ID card verification for learner (BR_CERT_003)."""
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return False, "Không tìm thấy người dùng"

            user.is_identity_verified = True
            await repo.save(user)
            logger.info("User %s successfully verified identity", user_id)
            return True, "Xác minh danh tính sinh trắc học & CCCD thành công!"

    async def update_instructor_profile(
        self, user_id: str, title: str, signature_image_url: str
    ) -> tuple[User | None, str]:
        """Updates instructor title and signature_image_url. Returns (user, error_message)."""
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return None, "Không tìm thấy người dùng"

            user.title = title
            user.signature_image_url = signature_image_url
            saved_user = await repo.save(user)
            logger.info("Updated instructor profile for user %s", user_id)
            return saved_user, ""

    async def submit_instructor_application(
        self,
        user_id: str,
        title: str,
        bio: str,
        linkedin_url: str = "",
        cv_url: str = "",
        demo_video_url: str = "",
    ) -> InstructorApplication:
        async with database.async_session_scope() as session:
            repo = repo_module.InstructorApplicationRepository(session)
            use_case = SubmitInstructorApplicationUseCase(repo)
            return await use_case.execute(
                user_id=user_id,
                title=title,
                bio=bio,
                linkedin_url=linkedin_url,
                cv_url=cv_url,
                demo_video_url=demo_video_url,
            )

    async def get_my_instructor_application(
        self, user_id: str
    ) -> InstructorApplication | None:
        async with database.async_session_scope() as session:
            repo = repo_module.InstructorApplicationRepository(session)
            return await repo.get_latest_by_user_id(user_id)

    async def list_instructor_applications(
        self,
        status_filter: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[InstructorApplication]:
        self._verify_admin(current_user)
        async with database.async_session_scope() as session:
            repo = repo_module.InstructorApplicationRepository(session)
            return await repo.list_applications(status_filter)

    async def review_instructor_application(
        self,
        application_id: str,
        approve: bool,
        rejection_reason: str = "",
        current_user: CurrentUser | None = None,
    ) -> InstructorApplication:
        self._verify_admin(current_user)
        async with database.async_session_scope() as session:
            app_repo = repo_module.InstructorApplicationRepository(session)
            identity_repo = repo_module.IdentityRepository(session)
            org_repo = repo_module.OrganizationRepository(session)
            use_case = ReviewInstructorApplicationUseCase(
                app_repo, identity_repo, org_repo
            )
            return await use_case.execute(
                application_id=application_id,
                approve=approve,
                rejection_reason=rejection_reason,
            )
