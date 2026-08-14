from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain import ICatalogRepository
from src.modules.identity.domain import (
    InstructorApplication,
    User,
)
from src.modules.learning.domain import ILearningRepository
from src.shared.auth import (
    CurrentUser,
)

from .auth_usecase import AuthUseCase, hash_password, validate_password, verify_password
from .enterprise_usecase import EnterpriseLicenseUseCase
from .invitation_usecase import InvitationUseCase
from .organization_usecase import OrganizationUseCase
from .review_application_usecase import ReviewInstructorApplicationUseCase
from .submit_application_usecase import SubmitInstructorApplicationUseCase
from .user_profile_usecase import UserProfileUseCase

__all__ = [
    "AuthUseCase",
    "EnterpriseLicenseUseCase",
    "IdentityUseCase",
    "InvitationUseCase",
    "OrganizationUseCase",
    "ReviewInstructorApplicationUseCase",
    "SubmitInstructorApplicationUseCase",
    "UserProfileUseCase",
    "hash_password",
    "validate_password",
    "verify_password",
]


class IdentityUseCase:
    """Unified Facade for Identity & Access Management use cases."""

    def __init__(
        self,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
        catalog_repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.auth = AuthUseCase()
        self.user_profile = UserProfileUseCase()
        self.organization = OrganizationUseCase()
        self.enterprise = EnterpriseLicenseUseCase(
            learning_repo_factory=learning_repo_factory
        )
        self.invitation = InvitationUseCase(catalog_repo_factory=catalog_repo_factory)
        self.learning_repo_factory = self.enterprise.learning_repo_factory
        self.catalog_repo_factory = self.invitation.catalog_repo_factory

    # -------------------------------------------------------------------------
    # Authentication & Registration (AuthUseCase)
    # -------------------------------------------------------------------------

    async def login(
        self, email: str, password: str
    ) -> tuple[User | None, str, str, str]:
        return await self.auth.login(email=email, password=password)

    async def refresh_token(self, refresh_token_str: str) -> tuple[str, str, str]:
        return await self.auth.refresh_token(refresh_token_str=refresh_token_str)

    async def register(
        self, email: str, password: str, full_name: str, role_str: str
    ) -> tuple[User | None, str]:
        return await self.auth.register(
            email=email,
            password=password,
            full_name=full_name,
            role_str=role_str,
        )

    async def google_register_verify(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[str, str, str, str, bool, str]:
        return await self.auth.google_register_verify(
            authorization_code=authorization_code,
            nonce=nonce,
        )

    async def complete_google_registration(
        self, temp_token: str, password: str, full_name: str, role_str: str
    ) -> tuple[User | None, str, str, str]:
        return await self.auth.complete_google_registration(
            temp_token=temp_token,
            password=password,
            full_name=full_name,
            role_str=role_str,
        )

    async def google_login(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[User | None, str, str, str]:
        return await self.auth.google_login(
            authorization_code=authorization_code,
            nonce=nonce,
        )

    async def google_reset_password_verify(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[str, str, str, str]:
        return await self.auth.google_reset_password_verify(
            authorization_code=authorization_code,
            nonce=nonce,
        )

    async def complete_reset_password(
        self, temp_token: str, new_password: str
    ) -> tuple[User | None, str, str, str]:
        return await self.auth.complete_reset_password(
            temp_token=temp_token,
            new_password=new_password,
        )

    # -------------------------------------------------------------------------
    # User Profile & Identity Verification (UserProfileUseCase)
    # -------------------------------------------------------------------------

    async def get_user_profile(
        self, user_id: str, current_user: CurrentUser | None = None
    ) -> User | None:
        return await self.user_profile.get_user_profile(
            user_id=user_id,
            current_user=current_user,
        )

    async def verify_identity(
        self, user_id: str, id_card_number: str = ""
    ) -> tuple[bool, str]:
        return await self.user_profile.verify_identity(
            user_id=user_id,
            id_card_number=id_card_number,
        )

    async def update_instructor_profile(
        self, user_id: str, title: str, signature_image_url: str
    ) -> tuple[User | None, str]:
        return await self.user_profile.update_instructor_profile(
            user_id=user_id,
            title=title,
            signature_image_url=signature_image_url,
        )

    async def submit_instructor_application(
        self,
        user_id: str,
        title: str,
        bio: str,
        linkedin_url: str = "",
        cv_url: str = "",
        demo_video_url: str = "",
    ) -> InstructorApplication:
        return await self.user_profile.submit_instructor_application(
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
        return await self.user_profile.get_my_instructor_application(user_id=user_id)

    async def list_instructor_applications(
        self,
        status_filter: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[InstructorApplication]:
        return await self.user_profile.list_instructor_applications(
            status_filter=status_filter,
            current_user=current_user,
        )

    async def review_instructor_application(
        self,
        application_id: str,
        approve: bool,
        rejection_reason: str = "",
        current_user: CurrentUser | None = None,
    ) -> InstructorApplication:
        return await self.user_profile.review_instructor_application(
            application_id=application_id,
            approve=approve,
            rejection_reason=rejection_reason,
            current_user=current_user,
        )

    # -------------------------------------------------------------------------
    # Organization Management (OrganizationUseCase)
    # -------------------------------------------------------------------------

    async def add_organization_member(
        self,
        email: str,
        role_id: str,
        organization_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        return await self.organization.add_organization_member(
            email=email,
            role_id=role_id,
            organization_id=organization_id,
            current_user=current_user,
        )

    async def list_organization_members(
        self, organization_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        return await self.organization.list_organization_members(
            organization_id=organization_id,
            current_user=current_user,
        )

    async def remove_organization_member(
        self,
        user_id: str,
        organization_id: str,
        current_user: CurrentUser | None = None,
    ) -> bool:
        return await self.organization.remove_organization_member(
            user_id=user_id,
            organization_id=organization_id,
            current_user=current_user,
        )

    async def list_organization_audit_logs(
        self, organization_id: str, current_user: CurrentUser
    ) -> list[dict]:
        return await self.organization.list_organization_audit_logs(
            organization_id=organization_id,
            current_user=current_user,
        )

    async def list_my_organizations(
        self, current_user: CurrentUser
    ) -> list[dict[str, Any]]:
        return await self.organization.list_my_organizations(current_user=current_user)

    # -------------------------------------------------------------------------
    # Enterprise Licenses & Seats (EnterpriseLicenseUseCase)
    # -------------------------------------------------------------------------

    async def assign_enterprise_seat(
        self,
        user_id: str,
        enterprise_seat_key: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        return await self.enterprise.assign_enterprise_seat(
            user_id=user_id,
            enterprise_seat_key=enterprise_seat_key,
            current_user=current_user,
        )

    async def list_enterprise_seats(
        self,
        partner_name: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        return await self.enterprise.list_enterprise_seats(
            partner_name=partner_name,
            current_user=current_user,
        )

    async def create_enterprise_seat(
        self,
        partner_name: str,
        seat_key: str,
        scope_type: str = "ALL_COURSES",
        allowed_course_ids: list[str] | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict:
        return await self.enterprise.create_enterprise_seat(
            partner_name=partner_name,
            seat_key=seat_key,
            scope_type=scope_type,
            allowed_course_ids=allowed_course_ids,
            current_user=current_user,
        )

    async def revoke_enterprise_seat(
        self,
        user_id: str,
        course_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        return await self.enterprise.revoke_enterprise_seat(
            user_id=user_id,
            course_id=course_id,
            current_user=current_user,
        )

    # -------------------------------------------------------------------------
    # Invitations Management (InvitationUseCase)
    # -------------------------------------------------------------------------

    async def create_invitation(
        self,
        invitation_type: str,
        invitee_email: str,
        target_id: str,
        target_name: str = "",
        role_id: str = "",
        message: str = "",
        current_user: CurrentUser | None = None,
    ) -> dict:
        return await self.invitation.create_invitation(
            invitation_type=invitation_type,
            invitee_email=invitee_email,
            target_id=target_id,
            target_name=target_name,
            role_id=role_id,
            message=message,
            current_user=current_user,
        )

    async def list_sent_invitations(
        self,
        invitation_type: str = "",
        target_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        return await self.invitation.list_sent_invitations(
            invitation_type=invitation_type,
            target_id=target_id,
            current_user=current_user,
        )

    async def list_my_invitations(
        self,
        status_filter: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        return await self.invitation.list_my_invitations(
            status_filter=status_filter,
            current_user=current_user,
        )

    async def get_invitation_by_token(self, token: str) -> dict:
        return await self.invitation.get_invitation_by_token(token=token)

    async def respond_to_invitation(
        self,
        invitation_id: str,
        action: str,
        token: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[dict, bool, str]:
        return await self.invitation.respond_to_invitation(
            invitation_id=invitation_id,
            action=action,
            token=token,
            current_user=current_user,
        )

    async def cancel_invitation(
        self,
        invitation_id: str,
        current_user: CurrentUser | None = None,
    ) -> bool:
        return await self.invitation.cancel_invitation(
            invitation_id=invitation_id,
            current_user=current_user,
        )
