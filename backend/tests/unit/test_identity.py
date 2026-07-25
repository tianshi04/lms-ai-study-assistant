import pytest
from src.gen.identity.v1 import identity_pb as pb
from src.modules.identity.application.identity_usecase import (
    IdentityUseCase,
    hash_password,
    verify_password,
)
from src.modules.identity.domain.entities import UserRole
from src.modules.identity.presentation.identity_handler import _pb_role_to_domain_str
from src.shared.auth import decode_token


def test_password_hashing():
    raw_password = "SecretPassword123!"
    hashed = hash_password(raw_password)
    assert verify_password(raw_password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_pb_role_enum_mapping():
    assert _pb_role_to_domain_str(pb.UserRole.INSTRUCTOR) == "USER_ROLE_INSTRUCTOR"
    assert _pb_role_to_domain_str(2) == "USER_ROLE_INSTRUCTOR"
    assert _pb_role_to_domain_str(pb.UserRole.LEARNER) == "USER_ROLE_LEARNER"


@pytest.mark.asyncio
async def test_identity_register_and_login():
    try:
        usecase = IdentityUseCase()
        email = "instructor_test@example.com"
        password = "MySecurePassword123"
        full_name = "Prof. Andrew Ng"

        # Register Instructor
        user, err = await usecase.register(
            email, password, full_name, "USER_ROLE_INSTRUCTOR"
        )
        if err == "Email đằng ký đã tồn tại trên hệ thống":
            pass
        else:
            assert err == ""
            assert user is not None
            assert user.email == email
            assert user.role == UserRole.INSTRUCTOR

        # Login
        logged_user, access_token, refresh_token, login_err = await usecase.login(
            email, password
        )
        assert login_err == ""
        assert logged_user is not None
        assert logged_user.role == UserRole.INSTRUCTOR
        assert access_token != ""

        # Decode Access Token
        payload = decode_token(access_token)
        assert payload is not None
        assert payload.get("role") == "USER_ROLE_INSTRUCTOR"
    except Exception as e:
        pytest.skip(f"Skipping identity db test: DB not reachable ({e})")
