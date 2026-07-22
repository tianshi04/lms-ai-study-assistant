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
        user, token, err = await self._use_case.login(request.email, request.password)
        if err or not user:
            raise ConnectError(Code.UNAUTHENTICATED, err or "Đăng nhập thất bại")
        return pb.LoginResponse(access_token=token, user=_to_pb_user(user))

    async def register(
        self,
        request: pb.RegisterRequest,
        ctx: RequestContext[pb.RegisterRequest, pb.RegisterResponse],
    ) -> pb.RegisterResponse:
        role_enum = request.role if request.role is not None else pb.UserRole.LEARNER
        user, err = await self._use_case.register(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role_str=role_enum.name if hasattr(role_enum, "name") else "USER_ROLE_LEARNER",
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
