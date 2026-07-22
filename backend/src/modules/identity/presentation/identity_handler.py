from typing import Any

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.identity.v1 import identity_pb as pb
from src.gen.identity.v1.identity_connect import IdentityService
from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.domain.entities import User, UserRole


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
            raise ConnectError(Code.UNAUTHENTICATED, err or "Refresh token không hợp lệ")
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
        user = await self._use_case.get_user_profile(request.user_id)
        if not user:
            raise ConnectError(Code.NOT_FOUND, "Không tìm thấy người dùng")
        return pb.GetUserProfileResponse(user=_to_pb_user(user))

    async def assign_enterprise_seat(
        self,
        request: pb.AssignEnterpriseSeatRequest,
        ctx: RequestContext[pb.AssignEnterpriseSeatRequest, pb.AssignEnterpriseSeatResponse],
    ) -> pb.AssignEnterpriseSeatResponse:
        success, msg = await self._use_case.assign_enterprise_seat(
            request.user_id, request.enterprise_seat_key
        )
        return pb.AssignEnterpriseSeatResponse(success=success, message=msg)
