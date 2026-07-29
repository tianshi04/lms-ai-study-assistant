import pytest
from connectrpc.errors import ConnectError

from src.shared.auth import CurrentUser
from src.shared.auth_policy import AuthPolicyRegistry
from src.gen.auth.v1 import options_pb


def test_auth_policy_public():
    AuthPolicyRegistry._policy_map["/mock/PublicRoute"] = options_pb.AuthPolicy.PUBLIC
    AuthPolicyRegistry._initialized = True
    # Public route should not raise any error, even with no user
    AuthPolicyRegistry.authorize("/mock/PublicRoute", None)


def test_auth_policy_authenticated_success():
    # Inject a mock policy mapping for testing
    AuthPolicyRegistry._policy_map["/mock/AuthRoute"] = (
        options_pb.AuthPolicy.AUTHENTICATED
    )
    AuthPolicyRegistry._initialized = True

    user = CurrentUser(id="123", role="LEARNER")
    AuthPolicyRegistry.authorize("/mock/AuthRoute", user)


def test_auth_policy_authenticated_fail():
    AuthPolicyRegistry._policy_map["/mock/AuthRoute"] = (
        options_pb.AuthPolicy.AUTHENTICATED
    )
    AuthPolicyRegistry._initialized = True

    with pytest.raises(ConnectError) as exc_info:
        AuthPolicyRegistry.authorize("/mock/AuthRoute", None)

    assert "Vui lòng đăng nhập" in str(exc_info.value)


def test_auth_policy_admin_blocks_instructor():
    AuthPolicyRegistry._policy_map["/mock/AdminRoute"] = options_pb.AuthPolicy.ADMIN
    AuthPolicyRegistry._initialized = True

    # User is an instructor (staff), but NOT an admin
    user = CurrentUser(id="123", role="INSTRUCTOR")

    with pytest.raises(ConnectError) as exc_info:
        AuthPolicyRegistry.authorize("/mock/AdminRoute", user)

    assert "Bạn không có quyền thực hiện thao tác quản trị này" in str(exc_info.value)


def test_auth_policy_admin_allows_super_admin():
    AuthPolicyRegistry._policy_map["/mock/AdminRoute"] = options_pb.AuthPolicy.ADMIN
    AuthPolicyRegistry._initialized = True

    user = CurrentUser(id="123", role="SUPER_ADMIN")

    # Should not raise error
    AuthPolicyRegistry.authorize("/mock/AdminRoute", user)
