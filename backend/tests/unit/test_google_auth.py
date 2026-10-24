import hashlib

import pytest
from uuid6 import uuid7

from src.modules.identity.application import IdentityUseCase, auth_usecase
from src.modules.identity.domain import UserRole
from src.shared.config import settings
from tests.conftest import check_postgres_available

FAKE_CODE_PREFIX = "fake_google_"


@pytest.fixture
def fake_google(monkeypatch):
    """Stand-in for Google's token endpoint, living in the TEST only.

    Production code has no mock/bypass path: `_exchange_google_code` always
    talks to Google.
    """

    async def fake_exchange(code, nonce="", redirect_uri=""):
        email, name = code.removeprefix(FAKE_CODE_PREFIX).rsplit("_", 1)
        return {
            "google_id": f"google_id_{hashlib.md5(email.encode()).hexdigest()[:12]}",
            "email": email,
            "name": name,
            "picture": "",
            "email_verified": True,
        }

    monkeypatch.setattr(auth_usecase, "_exchange_google_code", fake_exchange)


@pytest.mark.asyncio
async def test_google_register_and_fallback_login_flow(fake_google):
    check_postgres_available()
    usecase = IdentityUseCase()
    unique_email = f"student_{uuid7().hex}@gmail.com"

    # Step 1: Google Register Verification
    test_code = f"{FAKE_CODE_PREFIX}{unique_email}_Student Name"
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


@pytest.mark.asyncio
async def test_google_login_auto_provisions_new_user(fake_google):
    check_postgres_available()
    usecase = IdentityUseCase()
    brand_new_email = f"brand_new_{uuid7().hex}@gmail.com"
    test_code = f"{FAKE_CODE_PREFIX}{brand_new_email}_Brand New User"

    user, access_token, refresh_token, err = await usecase.google_login(test_code)

    assert err == ""
    assert user is not None
    assert user.email == brand_new_email
    assert user.full_name == "Brand New User"
    assert user.role == UserRole.LEARNER
    assert access_token != ""
    assert refresh_token != ""


@pytest.mark.asyncio
async def test_google_login_account_linking_requires_email_verified(monkeypatch):
    check_postgres_available()
    usecase = IdentityUseCase()
    existing_email = f"unverified_link_{uuid7().hex}@gmail.com"

    # Register standard account first
    reg_user, reg_err = await usecase.register(
        email=existing_email,
        password="ValidPassword123",
        full_name="Existing Local User",
        role_str=UserRole.LEARNER.value,
    )
    assert reg_err == ""
    assert reg_user is not None

    # Fake Google returning email_verified = False
    async def mock_exchange_unverified(code, nonce="", redirect_uri=""):
        return {
            "google_id": "google_id_unverified_123",
            "email": existing_email,
            "name": "Unverified Attacker",
            "picture": "",
            "email_verified": False,
        }

    monkeypatch.setattr(auth_usecase, "_exchange_google_code", mock_exchange_unverified)

    # Attempt Google login with unverified email on matching existing email account
    user, access_token, _refresh_token, err = await usecase.google_login(
        "unverified_code"
    )

    assert user is None
    assert access_token == ""
    assert "chưa được Google xác minh" in err


@pytest.mark.asyncio
@pytest.mark.parametrize("env", ["development", "test", "staging", "production"])
@pytest.mark.parametrize("configured", [False, True])
async def test_legacy_mock_code_is_never_accepted(monkeypatch, env, configured):
    """The old `mock_google_<email>_<name>` backdoor must not work in any ENV."""
    monkeypatch.setattr(settings, "ENV", env)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id" if configured else "")
    monkeypatch.setattr(
        settings, "GOOGLE_CLIENT_SECRET", "secret" if configured else ""
    )

    class RejectingGoogleClient:
        """Google rejects a made-up authorization code; never reach the real network."""

        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *args, **kwargs):
            class Response:
                status_code = 400
                text = "invalid_grant"

            return Response()

    monkeypatch.setattr(auth_usecase.httpx, "AsyncClient", RejectingGoogleClient)

    usecase = IdentityUseCase()
    with pytest.raises(ValueError, match="chưa được cấu hình|Đổi Authorization Code"):
        await usecase.google_login("mock_google_victim@gmail.com_Victim")


def _fake_google_token_endpoint(monkeypatch, id_token_claims):
    class FakeResponse:
        status_code = 200
        text = ""

        def json(self):
            return {"id_token": "signed.by.google"}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "secret")
    monkeypatch.setattr(auth_usecase.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(
        auth_usecase.id_token, "verify_oauth2_token", lambda *a, **k: id_token_claims
    )


@pytest.mark.asyncio
async def test_exchange_accepts_matching_nonce(monkeypatch):
    _fake_google_token_endpoint(
        monkeypatch, {"sub": "1", "email": "a@gmail.com", "nonce": "n-123"}
    )
    claims = await auth_usecase._exchange_google_code("auth-code", nonce="n-123")
    assert claims["email"] == "a@gmail.com"


@pytest.mark.asyncio
@pytest.mark.parametrize("token_claims", [{"nonce": "other"}, {}])
async def test_exchange_rejects_wrong_or_missing_nonce(monkeypatch, token_claims):
    _fake_google_token_endpoint(
        monkeypatch, {"sub": "1", "email": "a@gmail.com", **token_claims}
    )
    with pytest.raises(ValueError, match="Nonce không khớp"):
        await auth_usecase._exchange_google_code("auth-code", nonce="n-123")


@pytest.mark.asyncio
async def test_nonce_literal_mock_is_not_a_bypass(monkeypatch):
    _fake_google_token_endpoint(
        monkeypatch, {"sub": "1", "email": "a@gmail.com", "nonce": "real"}
    )
    with pytest.raises(ValueError, match="Nonce không khớp"):
        await auth_usecase._exchange_google_code("auth-code", nonce="mock")


def test_redirect_uri_allow_list(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://app.example.com")
    monkeypatch.setattr(settings, "CORS_ORIGINS", "https://app.example.com")
    resolve = auth_usecase._resolve_google_redirect_uri

    assert resolve("") == "https://app.example.com/auth/google/callback"
    assert (
        resolve("https://app.example.com/auth/google/callback")
        == "https://app.example.com/auth/google/callback"
    )
    assert (
        resolve("http://localhost:3000/auth/google/callback")
        == "http://localhost:3000/auth/google/callback"
    )

    for bad in [
        "https://evil.example.net/auth/google/callback",
        "https://app.example.com.evil.net/auth/google/callback",
        "https://app.example.com/other/path",
        "https://app.example.com/auth/google/callback?x=1",
        "https://app.example.com/auth/google/callback#frag",
        "javascript:alert(1)",
    ]:
        with pytest.raises(ValueError, match="redirect_uri không hợp lệ"):
            resolve(bad)
