import base64
import json
import uuid

import pytest

from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.domain.entities import UserRole
from src.shared.config import settings


def _make_google_jwt(sub: str, email: str, name: str) -> str:
    header = (
        base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode())
        .decode()
        .rstrip("=")
    )
    payload = (
        base64.urlsafe_b64encode(
            json.dumps({"sub": sub, "email": email, "name": name}).encode()
        )
        .decode()
        .rstrip("=")
    )
    return f"{header}.{payload}.signature"


def _make_google_jwt(sub: str, email: str, name: str) -> str:
    header = (
        base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode())
        .decode()
        .rstrip("=")
    )
    payload = (
        base64.urlsafe_b64encode(
            json.dumps({"sub": sub, "email": email, "name": name}).encode()
        )
        .decode()
        .rstrip("=")
    )
    return f"{header}.{payload}.signature"


@pytest.mark.asyncio
async def test_google_register_and_fallback_login_flow(monkeypatch):
    monkeypatch.setattr(settings, "ENV", "development")
    usecase = IdentityUseCase()
    unique_email = f"student_{uuid.uuid4().hex[:8]}@gmail.com"

    # Step 1: Google Register Verification
    test_code = f"mock_google_{unique_email}_Student Name"
    (
        temp_token,
        email,
        _full_name,
        _,
        is_already_reg,
        err,
    ) = await usecase.google_register_verify(test_code)

    assert err == ""
    assert is_already_reg is False
    assert email == unique_email
    assert temp_token != ""

    # Step 2: Complete Registration by Setting Password Fallback
    user, access_token, refresh_token, err = await usecase.complete_google_registration(
        temp_token=temp_token,
        password="MySecretPassword123",
        full_name="Student Name",
        role_str=UserRole.LEARNER.value,
    )

    assert err == ""
    assert user is not None
    assert user.email == unique_email
    assert user.google_id is not None
    assert access_token != ""
    assert refresh_token != ""

    # Step 3: Test Login via Google 1-Click
    g_user, _, _, g_err = await usecase.google_login(test_code)
    assert g_err == ""
    assert g_user is not None
    assert g_user.id == user.id

    # Step 4: Test Fallback Login via Email & Password
    pass_user, _, _, pass_err = await usecase.login(unique_email, "MySecretPassword123")
    assert pass_err == ""
    assert pass_user is not None
    assert pass_user.id == user.id

    # Step 5: Test Google Reset Password Flow
    (
        reset_temp_token,
        reset_email,
        _,
        reset_err,
    ) = await usecase.google_reset_password_verify(test_code)
    assert reset_err == ""
    assert reset_email == unique_email
    assert reset_temp_token != ""

    # Step 6: Complete Password Reset
    (
        updated_user,
        _,
        _,
        reset_comp_err,
    ) = await usecase.complete_reset_password(reset_temp_token, "NewUpdatedSecret456")
    assert reset_comp_err == ""
    assert updated_user is not None
    assert updated_user.id == user.id

    # Step 7: Verify login with new password succeeds and old password fails
    _, _, _, old_fail_err = await usecase.login(unique_email, "MySecretPassword123")
    assert old_fail_err != ""

    new_user, _, _, new_success_err = await usecase.login(
        unique_email, "NewUpdatedSecret456"
    )
    assert new_success_err == ""
    assert new_user is not None
    assert new_user.id == user.id
