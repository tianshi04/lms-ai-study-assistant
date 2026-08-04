from typing import Any

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.identity.v1 import identity_pb as pb
from src.gen.identity.v1.identity_connect import IdentityService
from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.domain.entities import (
    User,
    UserRole,
    InstructorApplication,
    ApplicationStatus,
)
from src.shared.auth import require_current_user


def _to_pb_application_status(
    status: ApplicationStatus,
) -> pb.InstructorApplicationStatus:
    mapping = {
        ApplicationStatus.PENDING_REVIEW: pb.InstructorApplicationStatus.PENDING_REVIEW,
        ApplicationStatus.APPROVED: pb.InstructorApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED: pb.InstructorApplicationStatus.REJECTED,
    }
    return mapping.get(status, pb.InstructorApplicationStatus.UNSPECIFIED)


def _to_pb_application(app: InstructorApplication) -> pb.InstructorApplication:
    return pb.InstructorApplication(
        id=app.id,
        user_id=app.user_id,
        title=app.title,
        bio=app.bio,
        linkedin_url=app.linkedin_url,
        cv_url=app.cv_url,
        demo_video_url=app.demo_video_url,
        status=_to_pb_application_status(app.status),
        rejection_reason=app.rejection_reason,
        created_at=app.created_at,
        reviewed_at=app.reviewed_at,
    )


def _to_pb_user_role(role: UserRole) -> pb.UserRole:
    mapping = {
        UserRole.UNSPECIFIED: pb.UserRole.UNSPECIFIED,
        UserRole.LEARNER: pb.UserRole.LEARNER,
        UserRole.INSTRUCTOR: pb.UserRole.INSTRUCTOR,
        UserRole.ADMIN: pb.UserRole.ADMIN,
    }
    return mapping.get(role, pb.UserRole.UNSPECIFIED)


def _pb_role_to_domain_str(role_val: Any) -> str:
    mapping = {
        pb.UserRole.UNSPECIFIED: "USER_ROLE_UNSPECIFIED",
        pb.UserRole.LEARNER: "USER_ROLE_LEARNER",
        pb.UserRole.INSTRUCTOR: "USER_ROLE_INSTRUCTOR",
        pb.UserRole.ADMIN: "USER_ROLE_ADMIN",
        pb.UserRole.TA: "USER_ROLE_TA",
        0: "USER_ROLE_UNSPECIFIED",
        1: "USER_ROLE_LEARNER",
        2: "USER_ROLE_INSTRUCTOR",
        3: "USER_ROLE_ADMIN",
        4: "USER_ROLE_TA",
    }
    if role_val not in mapping:
        raise ConnectError(Code.INVALID_ARGUMENT, f"Vai trò '{role_val}' không hợp lệ")
    return mapping[role_val]


def _to_pb_user(user: User) -> pb.User:
    return pb.User(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=_to_pb_user_role(user.role),
        avatar_url=user.avatar_url,
        enterprise_seat_key=user.enterprise_seat_key or "",
        signature_image_url=user.signature_image_url,
        title=user.title,
        is_identity_verified=user.is_identity_verified,
    )


class IdentityHandler(IdentityService):
    def __init__(self, use_case: IdentityUseCase) -> None:
        self._use_case = use_case

    async def login(
        self,
        request: pb.LoginRequest,
        ctx: RequestContext[pb.LoginRequest, pb.LoginResponse],
    ) -> pb.LoginResponse:
        user, access_token, refresh_token, err = await self._use_case.login(
            request.email, request.password
        )
        if err or not user:
            raise ConnectError(Code.UNAUTHENTICATED, err or "Đăng nhập thất bại")

        return pb.LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_pb_user(user),
        )

    async def refresh_token(
        self,
        request: pb.RefreshTokenRequest,
        ctx: RequestContext[pb.RefreshTokenRequest, pb.RefreshTokenResponse],
    ) -> pb.RefreshTokenResponse:
        new_access, new_refresh, err = await self._use_case.refresh_token(
            request.refresh_token
        )
        if err or not new_access:
            raise ConnectError(
                Code.UNAUTHENTICATED, err or "Refresh token không hợp lệ"
            )

        return pb.RefreshTokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
        )

    async def register(
        self,
        request: pb.RegisterRequest,
        ctx: RequestContext[pb.RegisterRequest, pb.RegisterResponse],
    ) -> pb.RegisterResponse:
        role_str = _pb_role_to_domain_str(request.role)
        user, err = await self._use_case.register(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role_str=role_str,
        )
        if err or not user:
            raise ConnectError(Code.ALREADY_EXISTS, err or "Đăng ký thất bại")
        return pb.RegisterResponse(user=_to_pb_user(user))

    async def google_register_verify(
        self,
        request: pb.GoogleRegisterVerifyRequest,
        ctx: RequestContext[
            pb.GoogleRegisterVerifyRequest, pb.GoogleRegisterVerifyResponse
        ],
    ) -> pb.GoogleRegisterVerifyResponse:
        (
            temp_token,
            email,
            full_name,
            avatar_url,
            is_already_registered,
            err,
        ) = await self._use_case.google_register_verify(request.google_id_token)
        if err and not is_already_registered:
            raise ConnectError(Code.INVALID_ARGUMENT, err)

        return pb.GoogleRegisterVerifyResponse(
            temp_token=temp_token,
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            is_already_registered=is_already_registered,
        )

    async def complete_google_registration(
        self,
        request: pb.CompleteGoogleRegistrationRequest,
        ctx: RequestContext[
            pb.CompleteGoogleRegistrationRequest, pb.CompleteGoogleRegistrationResponse
        ],
    ) -> pb.CompleteGoogleRegistrationResponse:
        role_str = _pb_role_to_domain_str(request.role)
        (
            user,
            access_token,
            refresh_token,
            err,
        ) = await self._use_case.complete_google_registration(
            temp_token=request.temp_token,
            password=request.password,
            full_name=request.full_name,
            role_str=role_str,
        )
        if err or not user:
            raise ConnectError(
                Code.INVALID_ARGUMENT, err or "Hoàn tất đăng ký thất bại"
            )

        return pb.CompleteGoogleRegistrationResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_pb_user(user),
        )

    async def google_login(
        self,
        request: pb.GoogleLoginRequest,
        ctx: RequestContext[pb.GoogleLoginRequest, pb.GoogleLoginResponse],
    ) -> pb.GoogleLoginResponse:
        user, access_token, refresh_token, err = await self._use_case.google_login(
            request.google_id_token
        )
        if err or not user:
            raise ConnectError(Code.UNAUTHENTICATED, err or "Đăng nhập Google thất bại")

        return pb.GoogleLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_pb_user(user),
        )

    async def google_reset_password_verify(
        self,
        request: pb.GoogleResetPasswordVerifyRequest,
        ctx: RequestContext[
            pb.GoogleResetPasswordVerifyRequest, pb.GoogleResetPasswordVerifyResponse
        ],
    ) -> pb.GoogleResetPasswordVerifyResponse:
        (
            temp_token,
            email,
            full_name,
            err,
        ) = await self._use_case.google_reset_password_verify(request.google_id_token)
        if err:
            raise ConnectError(Code.INVALID_ARGUMENT, err)

        return pb.GoogleResetPasswordVerifyResponse(
            temp_token=temp_token,
            email=email,
            full_name=full_name,
        )

    async def complete_reset_password(
        self,
        request: pb.CompleteResetPasswordRequest,
        ctx: RequestContext[
            pb.CompleteResetPasswordRequest, pb.CompleteResetPasswordResponse
        ],
    ) -> pb.CompleteResetPasswordResponse:
        (
            user,
            access_token,
            refresh_token,
            err,
        ) = await self._use_case.complete_reset_password(
            request.temp_token, request.new_password
        )
        if err or not user:
            raise ConnectError(
                Code.INVALID_ARGUMENT, err or "Đặt lại mật khẩu thất bại"
            )

        return pb.CompleteResetPasswordResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_pb_user(user),
        )

    async def get_user_profile(
        self,
        request: pb.GetUserProfileRequest,
        ctx: RequestContext[pb.GetUserProfileRequest, pb.GetUserProfileResponse],
    ) -> pb.GetUserProfileResponse:
        current_user = require_current_user()
        target_user_id = request.user_id or current_user.id
        if target_user_id != current_user.id:
            if not current_user.is_admin:
                raise ConnectError(
                    Code.PERMISSION_DENIED,
                    "Bạn không có quyền xem hồ sơ cá nhân của người dùng khác.",
                )
        user = await self._use_case.get_user_profile(
            target_user_id, current_user=current_user
        )
        if not user:
            raise ConnectError(Code.NOT_FOUND, "Không tìm thấy người dùng")
        return pb.GetUserProfileResponse(user=_to_pb_user(user))

    async def assign_enterprise_seat(
        self,
        request: pb.AssignEnterpriseSeatRequest,
        ctx: RequestContext[
            pb.AssignEnterpriseSeatRequest, pb.AssignEnterpriseSeatResponse
        ],
    ) -> pb.AssignEnterpriseSeatResponse:
        current_user = require_current_user()
        target_user_id = request.user_id or current_user.id
        if target_user_id != current_user.id:
            if not current_user.is_admin:
                raise ConnectError(
                    Code.PERMISSION_DENIED,
                    "Bạn không có quyền gán suất Enterprise Seat cho người dùng khác.",
                )
        success, msg = await self._use_case.assign_enterprise_seat(
            target_user_id, request.enterprise_seat_key, current_user=current_user
        )
        return pb.AssignEnterpriseSeatResponse(success=success, message=msg)

    async def list_enterprise_seats(
        self,
        request: pb.ListEnterpriseSeatsRequest,
        ctx: RequestContext[
            pb.ListEnterpriseSeatsRequest, pb.ListEnterpriseSeatsResponse
        ],
    ) -> pb.ListEnterpriseSeatsResponse:
        current_user = require_current_user()
        if not current_user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên mới có quyền xem danh sách Enterprise Seats.",
            )
        items = await self._use_case.list_enterprise_seats(
            request.partner_name, current_user=current_user
        )
        pb_seats = [
            pb.EnterpriseSeat(
                id=item["id"],
                partner_name=item["partner_name"],
                seat_key=item["seat_key"],
                assigned_user_id=item["assigned_user_id"],
                assigned_user_email=item["assigned_user_email"],
                status=item["status"],
                created_at=item["created_at"],
                scope_type=item.get("scope_type", "ALL_COURSES"),
                allowed_course_ids=item.get("allowed_course_ids", []),
            )
            for item in items
        ]
        return pb.ListEnterpriseSeatsResponse(seats=pb_seats)

    async def create_enterprise_seat(
        self,
        request: pb.CreateEnterpriseSeatRequest,
        ctx: RequestContext[
            pb.CreateEnterpriseSeatRequest, pb.CreateEnterpriseSeatResponse
        ],
    ) -> pb.CreateEnterpriseSeatResponse:
        current_user = require_current_user()
        if not current_user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED, "Yêu cầu quyền quản lý Suất học Enterprise"
            )
        item = await self._use_case.create_enterprise_seat(
            partner_name=request.partner_name,
            seat_key=request.seat_key,
            scope_type=request.scope_type or "ALL_COURSES",
            allowed_course_ids=list(request.allowed_course_ids),
            current_user=current_user,
        )
        pb_seat = pb.EnterpriseSeat(
            id=item["id"],
            partner_name=item["partner_name"],
            seat_key=item["seat_key"],
            assigned_user_id=item["assigned_user_id"],
            assigned_user_email=item["assigned_user_email"],
            status=item["status"],
            created_at=item["created_at"],
            scope_type=item.get("scope_type", "ALL_COURSES"),
            allowed_course_ids=item.get("allowed_course_ids", []),
        )
        return pb.CreateEnterpriseSeatResponse(seat=pb_seat)

    async def revoke_enterprise_seat(
        self,
        request: pb.RevokeEnterpriseSeatRequest,
        ctx: RequestContext[
            pb.RevokeEnterpriseSeatRequest, pb.RevokeEnterpriseSeatResponse
        ],
    ) -> pb.RevokeEnterpriseSeatResponse:
        current_user = require_current_user()
        if not current_user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED, "Yêu cầu quyền quản lý Suất học Enterprise"
            )
        success, msg = await self._use_case.revoke_enterprise_seat(
            request.user_id, request.course_id, current_user=current_user
        )
        return pb.RevokeEnterpriseSeatResponse(success=success, message=msg)

    async def update_instructor_profile(
        self,
        request: pb.UpdateInstructorProfileRequest,
        ctx: RequestContext[
            pb.UpdateInstructorProfileRequest, pb.UpdateInstructorProfileResponse
        ],
    ) -> pb.UpdateInstructorProfileResponse:
        current_user = require_current_user()
        user, err = await self._use_case.update_instructor_profile(
            user_id=current_user.id,
            title=request.title,
            signature_image_url=request.signature_image_url,
        )
        if err or not user:
            raise ConnectError(Code.INVALID_ARGUMENT, err or "Cập nhật hồ sơ thất bại")
        return pb.UpdateInstructorProfileResponse(user=_to_pb_user(user))

    async def verify_identity(
        self,
        request: pb.VerifyIdentityRequest,
        ctx: RequestContext[pb.VerifyIdentityRequest, pb.VerifyIdentityResponse],
    ) -> pb.VerifyIdentityResponse:
        current_user = require_current_user()
        target_user_id = request.user_id or current_user.id
        success, msg = await self._use_case.verify_identity(
            user_id=target_user_id,
            id_card_number=request.id_card_number,
        )
        return pb.VerifyIdentityResponse(success=success, message=msg)

    async def submit_instructor_application(
        self,
        request: pb.SubmitInstructorApplicationRequest,
        ctx: RequestContext[
            pb.SubmitInstructorApplicationRequest,
            pb.SubmitInstructorApplicationResponse,
        ],
    ) -> pb.SubmitInstructorApplicationResponse:
        current_user = require_current_user()
        try:
            app = await self._use_case.submit_instructor_application(
                user_id=current_user.id,
                title=request.title,
                bio=request.bio,
                linkedin_url=request.linkedin_url,
                cv_url=request.cv_url,
                demo_video_url=request.demo_video_url,
            )
            return pb.SubmitInstructorApplicationResponse(
                application=_to_pb_application(app)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def get_my_instructor_application(
        self,
        request: pb.GetMyInstructorApplicationRequest,
        ctx: RequestContext[
            pb.GetMyInstructorApplicationRequest,
            pb.GetMyInstructorApplicationResponse,
        ],
    ) -> pb.GetMyInstructorApplicationResponse:
        current_user = require_current_user()
        app = await self._use_case.get_my_instructor_application(current_user.id)
        pb_app = _to_pb_application(app) if app else None
        return pb.GetMyInstructorApplicationResponse(application=pb_app)

    async def list_instructor_applications(
        self,
        request: pb.ListInstructorApplicationsRequest,
        ctx: RequestContext[
            pb.ListInstructorApplicationsRequest,
            pb.ListInstructorApplicationsResponse,
        ],
    ) -> pb.ListInstructorApplicationsResponse:
        current_user = require_current_user()
        if not current_user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED, "Yêu cầu quyền Quản trị viên hệ thống"
            )
        apps = await self._use_case.list_instructor_applications(
            request.status_filter, current_user=current_user
        )
        return pb.ListInstructorApplicationsResponse(
            applications=[_to_pb_application(a) for a in apps]
        )

    async def review_instructor_application(
        self,
        request: pb.ReviewInstructorApplicationRequest,
        ctx: RequestContext[
            pb.ReviewInstructorApplicationRequest,
            pb.ReviewInstructorApplicationResponse,
        ],
    ) -> pb.ReviewInstructorApplicationResponse:
        current_user = require_current_user()
        if not current_user.is_admin:
            raise ConnectError(
                Code.PERMISSION_DENIED, "Yêu cầu quyền Quản trị viên hệ thống"
            )
        try:
            app = await self._use_case.review_instructor_application(
                application_id=request.application_id,
                approve=request.approve,
                rejection_reason=request.rejection_reason,
                current_user=current_user,
            )
            return pb.ReviewInstructorApplicationResponse(
                application=_to_pb_application(app)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def add_organization_member(
        self,
        request: pb.AddOrganizationMemberRequest,
        ctx: RequestContext[
            pb.AddOrganizationMemberRequest,
            pb.AddOrganizationMemberResponse,
        ],
    ) -> pb.AddOrganizationMemberResponse:
        current_user = require_current_user()
        org_id = request.organization_id.strip()
        try:
            m = await self._use_case.add_organization_member(
                email=request.email,
                role_id=request.role_id,
                organization_id=org_id,
                current_user=current_user,
            )
            detail = pb.OrganizationMemberDetail(
                member_id=m["member_id"],
                user_id=m["user_id"],
                email=m["email"],
                full_name=m["full_name"],
                avatar_url=m["avatar_url"],
                role_id=m["role_id"],
                role_name=m["role_name"],
                status=m["status"],
                joined_at=m["joined_at"],
            )
            return pb.AddOrganizationMemberResponse(member=detail)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def list_organization_members(
        self,
        request: pb.ListOrganizationMembersRequest,
        ctx: RequestContext[
            pb.ListOrganizationMembersRequest,
            pb.ListOrganizationMembersResponse,
        ],
    ) -> pb.ListOrganizationMembersResponse:
        current_user = require_current_user()
        org_id = request.organization_id.strip()
        try:
            members_data = await self._use_case.list_organization_members(
                organization_id=org_id, current_user=current_user
            )
            pb_members = [
                pb.OrganizationMemberDetail(
                    member_id=m["member_id"],
                    user_id=m["user_id"],
                    email=m["email"],
                    full_name=m["full_name"],
                    avatar_url=m["avatar_url"],
                    role_id=m["role_id"],
                    role_name=m["role_name"],
                    status=m["status"],
                    joined_at=m["joined_at"],
                )
                for m in members_data
            ]
            return pb.ListOrganizationMembersResponse(members=pb_members)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def list_organization_audit_logs(
        self,
        request: pb.ListOrganizationAuditLogsRequest,
        ctx: RequestContext[
            pb.ListOrganizationAuditLogsRequest,
            pb.ListOrganizationAuditLogsResponse,
        ],
    ) -> pb.ListOrganizationAuditLogsResponse:
        current_user = require_current_user()
        org_id = request.organization_id.strip()
        try:
            logs = await self._use_case.list_organization_audit_logs(
                organization_id=org_id, current_user=current_user
            )
            pb_logs = []
            for item in logs:
                action_str = item.get("action", "")
                action_enum = pb.OrganizationAuditAction.UNSPECIFIED
                if "JOINED" in action_str:
                    action_enum = pb.OrganizationAuditAction.MEMBER_JOINED
                elif "LEFT" in action_str:
                    action_enum = pb.OrganizationAuditAction.MEMBER_LEFT
                elif "KICKED" in action_str:
                    action_enum = pb.OrganizationAuditAction.MEMBER_KICKED
                elif "ROLE" in action_str:
                    action_enum = pb.OrganizationAuditAction.ROLE_CHANGED

                pb_logs.append(
                    pb.OrganizationAuditLog(
                        id=item.get("id", ""),
                        organization_id=item.get("organization_id", ""),
                        actor_id=item.get("actor_id", ""),
                        actor_name=item.get("actor_name", ""),
                        target_user_id=item.get("target_user_id", ""),
                        target_user_name=item.get("target_user_name", ""),
                        action=action_enum,
                        details=item.get("details", ""),
                        created_at=item.get("created_at", ""),
                    )
                )
            return pb.ListOrganizationAuditLogsResponse(logs=pb_logs)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def remove_organization_member(
        self,
        request: pb.RemoveOrganizationMemberRequest,
        ctx: RequestContext[
            pb.RemoveOrganizationMemberRequest,
            pb.RemoveOrganizationMemberResponse,
        ],
    ) -> pb.RemoveOrganizationMemberResponse:
        current_user = require_current_user()
        org_id = request.organization_id.strip()
        try:
            success = await self._use_case.remove_organization_member(
                user_id=request.user_id,
                organization_id=org_id,
                current_user=current_user,
            )
            return pb.RemoveOrganizationMemberResponse(success=success)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))

    async def list_my_organizations(
        self,
        request: pb.ListMyOrganizationsRequest,
        ctx: RequestContext[
            pb.ListMyOrganizationsRequest,
            pb.ListMyOrganizationsResponse,
        ],
    ) -> pb.ListMyOrganizationsResponse:
        current_user = require_current_user()
        org_details = await self._use_case.list_my_organizations(
            current_user=current_user
        )
        pb_orgs = [
            pb.UserOrganizationDetail(
                id=o["id"],
                name=o["name"],
                slug=o["slug"],
                avatar_url=o["avatar_url"],
                role_in_org=o["role_in_org"],
                status=o["status"],
                joined_at=o["joined_at"],
            )
            for o in org_details
        ]
        return pb.ListMyOrganizationsResponse(organizations=pb_orgs)

    async def create_invitation(
        self,
        request: pb.CreateInvitationRequest,
        ctx: RequestContext[
            pb.CreateInvitationRequest,
            pb.CreateInvitationResponse,
        ],
    ) -> pb.CreateInvitationResponse:
        current_user = require_current_user()
        type_str = (
            _pb_type_to_str(request.type)
            if request.type != pb.InvitationType.UNSPECIFIED
            else ""
        )
        try:
            res = await self._use_case.create_invitation(
                type=type_str,
                invitee_email=request.invitee_email,
                target_id=request.target_id,
                target_name=request.target_name,
                role_id=request.role_id,
                message=request.message,
                current_user=current_user,
            )
            return pb.CreateInvitationResponse(invitation=_dict_to_pb_invitation(res))
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def list_sent_invitations(
        self,
        request: pb.ListSentInvitationsRequest,
        ctx: RequestContext[
            pb.ListSentInvitationsRequest,
            pb.ListSentInvitationsResponse,
        ],
    ) -> pb.ListSentInvitationsResponse:
        current_user = require_current_user()
        type_str = (
            _pb_type_to_str(request.type)
            if request.type != pb.InvitationType.UNSPECIFIED
            else ""
        )
        invs = await self._use_case.list_sent_invitations(
            type=type_str,
            target_id=request.target_id,
            current_user=current_user,
        )
        return pb.ListSentInvitationsResponse(
            invitations=[_dict_to_pb_invitation(inv) for inv in invs]
        )

    async def list_my_invitations(
        self,
        request: pb.ListMyInvitationsRequest,
        ctx: RequestContext[
            pb.ListMyInvitationsRequest,
            pb.ListMyInvitationsResponse,
        ],
    ) -> pb.ListMyInvitationsResponse:
        current_user = require_current_user()
        status_str = (
            _pb_status_to_str(request.status_filter)
            if request.status_filter != pb.InvitationStatus.UNSPECIFIED
            else ""
        )
        invs = await self._use_case.list_my_invitations(
            status_filter=status_str,
            current_user=current_user,
        )
        return pb.ListMyInvitationsResponse(
            invitations=[_dict_to_pb_invitation(inv) for inv in invs]
        )

    async def get_invitation_by_token(
        self,
        request: pb.GetInvitationByTokenRequest,
        ctx: RequestContext[
            pb.GetInvitationByTokenRequest,
            pb.GetInvitationByTokenResponse,
        ],
    ) -> pb.GetInvitationByTokenResponse:
        try:
            res = await self._use_case.get_invitation_by_token(request.token)
            return pb.GetInvitationByTokenResponse(
                invitation=_dict_to_pb_invitation(res)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def respond_to_invitation(
        self,
        request: pb.RespondToInvitationRequest,
        ctx: RequestContext[
            pb.RespondToInvitationRequest,
            pb.RespondToInvitationResponse,
        ],
    ) -> pb.RespondToInvitationResponse:
        current_user = require_current_user()
        try:
            inv_dict, success, msg = await self._use_case.respond_to_invitation(
                invitation_id=request.invitation_id,
                action=str(request.action),
                token=request.token,
                current_user=current_user,
            )
            return pb.RespondToInvitationResponse(
                invitation=_dict_to_pb_invitation(inv_dict) if inv_dict else None,
                success=success,
                message=msg,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))

    async def cancel_invitation(
        self,
        request: pb.CancelInvitationRequest,
        ctx: RequestContext[
            pb.CancelInvitationRequest,
            pb.CancelInvitationResponse,
        ],
    ) -> pb.CancelInvitationResponse:
        current_user = require_current_user()
        try:
            success = await self._use_case.cancel_invitation(
                invitation_id=request.invitation_id,
                current_user=current_user,
            )
            return pb.CancelInvitationResponse(success=success)
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))


def _pb_type_to_str(type_enum: pb.InvitationType) -> str:
    mapping = {
        pb.InvitationType.ORGANIZATION_MEMBER: "INVITATION_TYPE_ORGANIZATION_MEMBER",
        pb.InvitationType.COURSE_CO_INSTRUCTOR: "INVITATION_TYPE_COURSE_CO_INSTRUCTOR",
        pb.InvitationType.ENTERPRISE_SEAT: "INVITATION_TYPE_ENTERPRISE_SEAT",
    }
    return mapping.get(type_enum, "")


def _pb_status_to_str(status_enum: pb.InvitationStatus) -> str:
    mapping = {
        pb.InvitationStatus.PENDING: "INVITATION_STATUS_PENDING",
        pb.InvitationStatus.ACCEPTED: "INVITATION_STATUS_ACCEPTED",
        pb.InvitationStatus.DECLINED: "INVITATION_STATUS_DECLINED",
        pb.InvitationStatus.CANCELLED: "INVITATION_STATUS_CANCELLED",
        pb.InvitationStatus.EXPIRED: "INVITATION_STATUS_EXPIRED",
    }
    return mapping.get(status_enum, "")


def _dict_to_pb_invitation(d: dict) -> pb.Invitation:
    type_val = str(d.get("type", "")).upper()
    type_enum = pb.InvitationType.UNSPECIFIED
    if "ORGANIZATION" in type_val:
        type_enum = pb.InvitationType.ORGANIZATION_MEMBER
    elif "COURSE" in type_val or "CO_INSTRUCTOR" in type_val:
        type_enum = pb.InvitationType.COURSE_CO_INSTRUCTOR
    elif "ENTERPRISE" in type_val or "SEAT" in type_val:
        type_enum = pb.InvitationType.ENTERPRISE_SEAT

    status_val = str(d.get("status", "")).upper()
    status_enum = pb.InvitationStatus.UNSPECIFIED
    if "PENDING" in status_val:
        status_enum = pb.InvitationStatus.PENDING
    elif "ACCEPTED" in status_val:
        status_enum = pb.InvitationStatus.ACCEPTED
    elif "DECLINED" in status_val:
        status_enum = pb.InvitationStatus.DECLINED
    elif "CANCELLED" in status_val:
        status_enum = pb.InvitationStatus.CANCELLED
    elif "EXPIRED" in status_val:
        status_enum = pb.InvitationStatus.EXPIRED

    return pb.Invitation(
        id=d.get("id", ""),
        type=type_enum,
        status=status_enum,
        inviter_id=d.get("inviter_id", ""),
        inviter_name=d.get("inviter_name", ""),
        inviter_email=d.get("inviter_email", ""),
        invitee_email=d.get("invitee_email", ""),
        invitee_id=d.get("invitee_id", ""),
        target_id=d.get("target_id", ""),
        target_name=d.get("target_name", ""),
        role_id=d.get("role_id", ""),
        token=d.get("token", ""),
        message=d.get("message", ""),
        expires_at=d.get("expires_at", ""),
        created_at=d.get("created_at", ""),
        responded_at=d.get("responded_at", ""),
    )
