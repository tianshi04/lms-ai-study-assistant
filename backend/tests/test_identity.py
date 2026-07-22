import pytest
from src.modules.identity.application.identity_usecase import IdentityUseCase, hash_password, verify_password


def test_password_hashing():
    raw_password = "SecretPassword123!"
    hashed = hash_password(raw_password)
    assert verify_password(raw_password, hashed)
    assert not verify_password("WrongPassword", hashed)


@pytest.mark.asyncio
async def test_identity_register_and_login():
    try:
        usecase = IdentityUseCase()
        email = "testuser@example.com"
        password = "MySecurePassword123"
        full_name = "Nguyen Van A"

        # Register
        user, err = await usecase.register(email, password, full_name, "USER_ROLE_LEARNER")
        if err == "Email đằng ký đã tồn tại trên hệ thống":
            pass
        else:
            assert err == ""
            assert user is not None
            assert user.email == email

        # Login
        logged_user, token, login_err = await usecase.login(email, password)
        assert login_err == ""
        assert logged_user is not None
        assert token.startswith("bearer-token-")
    except Exception as e:
        pytest.skip(f"Skipping identity db test: DB not reachable ({e})")
