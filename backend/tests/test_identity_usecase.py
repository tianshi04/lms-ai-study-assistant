import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.modules.identity.application.identity_usecase import (
    IdentityUseCase,
    hash_password,
    verify_password,
)
from src.modules.identity.domain.entities import User, UserRole


def test_hash_and_verify_password():
    password = "MySecurePassword123"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    assert verify_password(password, "invalidhash") is False


@pytest.fixture
def mock_session_scope():
    with patch(
        "src.modules.identity.application.identity_usecase.async_session_scope"
    ) as mock:
        yield mock


@pytest.fixture
def mock_identity_repo():
    with patch(
        "src.modules.identity.application.identity_usecase.IdentityRepository"
    ) as mock:
        yield mock


@pytest.fixture
def mock_tokens():
    with (
        patch(
            "src.modules.identity.application.identity_usecase.create_access_token"
        ) as mock_acc,
        patch(
            "src.modules.identity.application.identity_usecase.create_refresh_token"
        ) as mock_ref,
        patch(
            "src.modules.identity.application.identity_usecase.decode_token"
        ) as mock_dec,
    ):
        mock_acc.return_value = "access_token"
        mock_ref.return_value = "refresh_token"
        yield mock_acc, mock_ref, mock_dec


@pytest.mark.asyncio
async def test_login_success(mock_session_scope, mock_identity_repo, mock_tokens):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance

    hashed_pw = hash_password("password123")
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash=hashed_pw,
    )
    mock_repo_instance.get_by_email.return_value = user

    usecase = IdentityUseCase()
    res_user, acc_token, ref_token, err = await usecase.login(
        "test@test.com", "password123"
    )

    assert err == ""
    assert res_user == user
    assert acc_token == "access_token"
    assert ref_token == "refresh_token"


@pytest.mark.asyncio
async def test_login_wrong_email(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_email.return_value = None

    usecase = IdentityUseCase()
    res_user, acc_token, ref_token, err = await usecase.login(
        "wrong@test.com", "password123"
    )

    assert res_user is None
    assert err == "Email hoặc mật khẩu không chính xác"


@pytest.mark.asyncio
async def test_login_wrong_password(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance

    hashed_pw = hash_password("password123")
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash=hashed_pw,
    )
    mock_repo_instance.get_by_email.return_value = user

    usecase = IdentityUseCase()
    res_user, acc_token, ref_token, err = await usecase.login(
        "test@test.com", "wrongpass"
    )

    assert res_user is None
    assert err == "Email hoặc mật khẩu không chính xác"


@pytest.mark.asyncio
async def test_register_success(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_email.return_value = None

    def mock_save(user):
        return user

    mock_repo_instance.save.side_effect = mock_save

    usecase = IdentityUseCase()
    user, err = await usecase.register(
        "new@test.com", "password123", "New User", "learner"
    )

    assert err == ""
    assert user is not None
    assert user.email == "new@test.com"
    mock_repo_instance.save.assert_called_once()


@pytest.mark.asyncio
async def test_register_existing_email(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_email.return_value = User(
        id="u1",
        email="exist@test.com",
        full_name="E",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )

    usecase = IdentityUseCase()
    user, err = await usecase.register(
        "exist@test.com", "password123", "New User", "learner"
    )

    assert user is None
    assert err == "Email đằng ký đã tồn tại trên hệ thống"


@pytest.mark.asyncio
async def test_refresh_token_success(
    mock_session_scope, mock_identity_repo, mock_tokens
):
    mock_acc, mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = {"type": "refresh", "sub": "u1"}

    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user

    usecase = IdentityUseCase()
    acc, ref, err = await usecase.refresh_token("valid_refresh_token")

    assert err == ""
    assert acc == "access_token"
    assert ref == "refresh_token"


@pytest.mark.asyncio
async def test_refresh_token_invalid_token(mock_tokens):
    mock_acc, mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = None

    usecase = IdentityUseCase()
    acc, ref, err = await usecase.refresh_token("invalid")

    assert err == "Refresh Token không hợp lệ hoặc đã hết hạn"


@pytest.mark.asyncio
async def test_refresh_token_no_sub(mock_tokens):
    mock_acc, mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = {"type": "refresh"}

    usecase = IdentityUseCase()
    acc, ref, err = await usecase.refresh_token("invalid")

    assert err == "Refresh Token chứa thông tin không hợp lệ"


@pytest.mark.asyncio
async def test_refresh_token_user_not_found(
    mock_session_scope, mock_identity_repo, mock_tokens
):
    mock_acc, mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = {"type": "refresh", "sub": "u1"}

    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_id.return_value = None

    usecase = IdentityUseCase()
    acc, ref, err = await usecase.refresh_token("valid_refresh_token")

    assert err == "Không tìm thấy người dùng sở hữu token"


@pytest.mark.asyncio
async def test_get_user_profile(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user

    usecase = IdentityUseCase()
    res = await usecase.get_user_profile("u1")

    assert res == user


@pytest.mark.asyncio
async def test_assign_enterprise_seat_success(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user

    from src.modules.identity.infrastructure.models import EnterpriseLicenseModel

    mock_license = EnterpriseLicenseModel(
        key="VALID_KEY",
        is_active=True,
        used_seats=0,
        total_seats=10,
        partner_name="Partner",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_license
    mock_session.execute.return_value = mock_result

    usecase = IdentityUseCase()
    res, msg = await usecase.assign_enterprise_seat("u1", "VALID_KEY")

    assert res is True
    assert "Kích hoạt thành công suất học từ đối tác" in msg
    mock_repo_instance.save.assert_called_once()
    assert user.enterprise_seat_key == "VALID_KEY"


@pytest.mark.asyncio
async def test_assign_enterprise_seat_user_not_found(
    mock_session_scope, mock_identity_repo
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_id.return_value = None

    usecase = IdentityUseCase()
    res, msg = await usecase.assign_enterprise_seat("u1", "VALID_KEY")

    assert res is False
    assert msg == "Không tìm thấy người dùng"


@pytest.mark.asyncio
async def test_assign_enterprise_seat_invalid_key(
    mock_session_scope, mock_identity_repo
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    usecase = IdentityUseCase()
    res, msg = await usecase.assign_enterprise_seat("u1", "INVALID_KEY")

    assert res is False
    assert "không tồn tại hoặc đã bị vô hiệu hóa" in msg


@pytest.mark.asyncio
async def test_assign_enterprise_seat_exhausted(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    user = User(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user

    from src.modules.identity.infrastructure.models import EnterpriseLicenseModel

    mock_license = EnterpriseLicenseModel(
        key="VALID_KEY",
        is_active=True,
        used_seats=10,
        total_seats=10,
        partner_name="Partner",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_license
    mock_session.execute.return_value = mock_result

    usecase = IdentityUseCase()
    res, msg = await usecase.assign_enterprise_seat("u1", "VALID_KEY")

    assert res is False
    assert "đã hết suất kích hoạt" in msg
