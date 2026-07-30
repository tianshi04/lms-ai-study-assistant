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
from src.shared.config import settings


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
        UserRole.TA: pb.UserRole.TA,
        UserRole.SUPER_ADMIN: pb.UserRole.SUPER_ADMIN,
        UserRole.PARTNER_ADMIN: pb.UserRole.PARTNER_ADMIN,
    }
    return mapping.get(role, pb.UserRole.UNSPECIFIED)


def _pb_role_to_domain_str(role_val: Any) -> str:
    mapping = {
        pb.UserRole.UNSPECIFIED: "USER_ROLE_UNSPECIFIED",
        pb.UserRole.LEARNER: "USER_ROLE_LEARNER",
        pb.UserRole.INSTRUCTOR: "USER_ROLE_INSTRUCTOR",
        pb.UserRole.TA: "USER_ROLE_TA",
        pb.UserRole.SUPER_ADMIN: "USER_ROLE_SUPER_ADMIN",
        pb.UserRole.PARTNER_ADMIN: "USER_ROLE_PARTNER_ADMIN",
        0: "USER_ROLE_UNSPECIFIED",
        1: "USER_ROLE_LEARNER",
        2: "USER_ROLE_INSTRUCTOR",
        3: "USER_ROLE_TA",
        4: "USER_ROLE_SUPER_ADMIN",
        5: "USER_ROLE_PARTNER_ADMIN",
    }
    return mapping.get(role_val, "USER_ROLE_LEARNER")


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

        resp_headers: Any = getattr(ctx, "response_headers", None)
        if resp_headers is not None and hasattr(resp_headers, "__setitem__"):
            access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            resp_headers["set-cookie"] = (
                f"access_token={access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={access_max_age}"
            )

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

        resp_headers: Any = getattr(ctx, "response_headers", None)
        if resp_headers is not None and hasattr(resp_headers, "__setitem__"):
            access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            resp_headers["set-cookie"] = (
                f"access_token={new_access}; Path=/; HttpOnly; SameSite=Lax; Max-Age={access_max_age}"
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

    async def get_user_profile(
        self,
        request: pb.GetUserProfileRequest,
        ctx: RequestContext[pb.GetUserProfileRequest, pb.GetUserProfileResponse],
    ) -> pb.GetUserProfileResponse:
        current_user = require_current_user()
        target_user_id = request.user_id or current_user.id
        if target_user_id != current_user.id:
            role_str = str(current_user.role).upper()
            is_staff_or_admin = any(
                r in role_str for r in ("ADMIN", "SUPER", "PARTNER", "INSTRUCTOR", "TA")
            )
            if not is_staff_or_admin:
                raise ConnectError(
                    Code.PERMISSION_DENIED,
                    "Bạn không có quyền xem hồ sơ cá nhân của người dùng khác.",
                )
        user = await self._use_case.get_user_profile(target_user_id)
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
            role_str = str(current_user.role).upper()
            is_admin = any(r in role_str for r in ("ADMIN", "SUPER", "PARTNER"))
            if not is_admin:
                raise ConnectError(
                    Code.PERMISSION_DENIED,
                    "Bạn không có quyền gán suất Enterprise Seat cho người dùng khác.",
                )
        success, msg = await self._use_case.assign_enterprise_seat(
            target_user_id, request.enterprise_seat_key
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
        role_str = str(current_user.role).upper()
        if not any(r in role_str for r in ("ADMIN", "SUPER", "PARTNER")):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên mới có quyền xem danh sách Enterprise Seats.",
            )
        items = await self._use_case.list_enterprise_seats(request.partner_name)
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
        role_str = str(current_user.role).upper()
        if not any(r in role_str for r in ("ADMIN", "SUPER", "PARTNER")):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên mới có quyền tạo Enterprise Seat key.",
            )
        item = await self._use_case.create_enterprise_seat(
            partner_name=request.partner_name,
            seat_key=request.seat_key,
            scope_type=request.scope_type or "ALL_COURSES",
            allowed_course_ids=list(request.allowed_course_ids),
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
        role_str = str(current_user.role).upper()
        if not any(r in role_str for r in ("ADMIN", "SUPER", "PARTNER")):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên mới có quyền thu hồi Enterprise Seat.",
            )
        success, msg = await self._use_case.revoke_enterprise_seat(
            request.user_id, request.course_id
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
        role_str = str(current_user.role).upper()
        if not any(r in role_str for r in ("ADMIN", "SUPER")):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên hệ thống mới có quyền xem danh sách đơn thẩm định.",
            )
        apps = await self._use_case.list_instructor_applications(request.status_filter)
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
        role_str = str(current_user.role).upper()
        if not any(r in role_str for r in ("ADMIN", "SUPER")):
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Quản trị viên hệ thống mới có quyền duyệt đơn Giảng viên.",
            )
        try:
            app = await self._use_case.review_instructor_application(
                application_id=request.application_id,
                approve=request.approve,
                rejection_reason=request.rejection_reason,
            )
            return pb.ReviewInstructorApplicationResponse(
                application=_to_pb_application(app)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e))
