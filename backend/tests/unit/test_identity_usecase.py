from datetime import UTC
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.identity.application.identity_usecase import (
    IdentityUseCase,
    hash_password,
    verify_password,
)
from src.modules.identity.domain.entities import User, UserRole
from src.shared.auth import CurrentUser


def test_hash_and_verify_password():
    password = "MySecurePassword123"
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    assert verify_password(password, "invalidhash") is False


def test_enterprise_license_scope_filtering_domain():
    from src.modules.identity.domain.entities import EnterpriseLicense, ScopeType

    # ALL_COURSES Scope
    lic_all = EnterpriseLicense(
        key="KEY-ALL",
        partner_name="Partner A",
        total_seats=100,
        used_seats=5,
        is_active=True,
        scope_type=ScopeType.ALL_COURSES,
    )
    assert lic_all.is_course_allowed("course_python") is True
    assert lic_all.is_course_allowed("course_react") is True

    # CURATED_COURSES Scope
    lic_curated = EnterpriseLicense(
        key="KEY-CURATED",
        partner_name="Partner B",
        total_seats=50,
        used_seats=10,
        is_active=True,
        scope_type=ScopeType.CURATED_COURSES,
        allowed_course_ids={"course_python", "course_ai"},
    )
    assert lic_curated.is_course_allowed("course_python") is True
    assert lic_curated.is_course_allowed("course_ai") is True
    assert lic_curated.is_course_allowed("course_react") is False

    # Inactive License
    lic_inactive = EnterpriseLicense(
        key="KEY-INACTIVE",
        partner_name="Partner C",
        total_seats=10,
        used_seats=10,
        is_active=False,
        scope_type=ScopeType.ALL_COURSES,
    )
    assert lic_inactive.is_course_allowed("course_python") is False


@pytest.fixture
def mock_session_scope():
    with patch("src.shared.infrastructure.database.async_session_scope") as mock:
        yield mock


@pytest.fixture
def mock_identity_repo():
    with patch(
        "src.modules.identity.infrastructure.repository.IdentityRepository"
    ) as mock:
        yield mock


@pytest.fixture
def mock_tokens():
    with (
        patch("src.shared.auth.create_access_token") as mock_acc,
        patch("src.shared.auth.create_refresh_token") as mock_ref,
        patch("src.shared.auth.decode_token") as mock_dec,
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
    res_user, _acc_token, _ref_token, err = await usecase.login(
        "wrong@test.com", "password123"
    )

    assert res_user is None
    assert "ch" in err and "x" in err


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
    res_user, _acc_token, _ref_token, err = await usecase.login(
        "test@test.com", "wrongpass"
    )

    assert res_user is None
    assert "ch" in err and "x" in err


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
        "new@test.com", "Password1", "New User", "learner"
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
        "exist@test.com", "Password123", "New User", "learner"
    )

    assert user is None
    assert "t" in err and "t" in err


@pytest.mark.asyncio
async def test_refresh_token_success(
    mock_session_scope, mock_identity_repo, mock_tokens
):
    _mock_acc, _mock_ref, mock_dec = mock_tokens
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
    _mock_acc, _mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = None

    usecase = IdentityUseCase()
    _acc, _ref, err = await usecase.refresh_token("invalid")

    assert err == "Refresh Token không hợp lệ hoặc đã hết hạn"


@pytest.mark.asyncio
async def test_refresh_token_no_sub(mock_tokens):
    _mock_acc, _mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = {"type": "refresh"}

    usecase = IdentityUseCase()
    _acc, _ref, err = await usecase.refresh_token("invalid")

    assert err == "Refresh Token chứa thông tin không hợp lệ"


@pytest.mark.asyncio
async def test_refresh_token_user_not_found(
    mock_session_scope, mock_identity_repo, mock_tokens
):
    _mock_acc, _mock_ref, mock_dec = mock_tokens
    mock_dec.return_value = {"type": "refresh", "sub": "u1"}

    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_id.return_value = None

    usecase = IdentityUseCase()
    _acc, _ref, err = await usecase.refresh_token("valid_refresh_token")

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
    assert "d" in msg or "dùng" in msg


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


@pytest.mark.asyncio
async def test_list_enterprise_seats(mock_session_scope):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    from src.modules.identity.infrastructure.models import EnterpriseLicenseModel

    mock_license = EnterpriseLicenseModel(
        key="KEY_1",
        partner_name="Google",
        total_seats=100,
        used_seats=10,
        is_active=True,
    )
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = [mock_license]
    mock_session.execute.return_value = mock_res

    usecase = IdentityUseCase()
    res = await usecase.list_enterprise_seats("Google")
    assert len(res) == 1
    assert res[0]["partner_name"] == "Google"


@pytest.mark.asyncio
async def test_create_enterprise_seat(mock_session_scope):
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    usecase = IdentityUseCase()
    res = await usecase.create_enterprise_seat("Meta", "META_KEY_1")
    assert res["seat_key"] == "META_KEY_1"
    assert res["partner_name"] == "Meta"
    mock_session.add.assert_called_once()


@pytest.mark.asyncio
async def test_verify_identity(mock_session_scope, mock_identity_repo):
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
        is_identity_verified=False,
    )
    mock_repo_instance.get_by_id.return_value = user

    usecase = IdentityUseCase()
    ok, msg = await usecase.verify_identity("u1", "123456789")
    assert ok is True
    assert user.is_identity_verified is True
    mock_repo_instance.save.assert_called_once()

    # User not found case
    mock_repo_instance.get_by_id.return_value = None
    ok, msg = await usecase.verify_identity("u2", "123456789")
    assert ok is False
    assert "Không tìm thấy" in msg


@pytest.mark.asyncio
async def test_revoke_enterprise_seat(mock_session_scope, mock_identity_repo):
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
        enterprise_seat_key="KEY_1",
    )
    mock_repo_instance.get_by_id.return_value = user

    usecase = IdentityUseCase()
    ok, msg = await usecase.revoke_enterprise_seat("u1")
    assert ok is True
    assert user.enterprise_seat_key is None
    assert "thu hồi" in msg

    # No seat key assigned case
    user.enterprise_seat_key = None
    ok, msg = await usecase.revoke_enterprise_seat("u1")
    assert ok is False
    assert "chưa được gán" in msg


@pytest.mark.asyncio
async def test_assign_enterprise_seat_same_key(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_user = User(
        id="user_1",
        email="test@test.com",
        password_hash="hash",
        full_name="Test",
        role=UserRole.LEARNER,
        enterprise_seat_key="VALID-KEY",
    )
    mock_repo_instance.get_by_id.return_value = mock_user

    usecase = IdentityUseCase()
    success, msg = await usecase.assign_enterprise_seat("user_1", "VALID-KEY")

    assert success is True
    assert msg == "Bạn đã được kích hoạt suất học từ đối tác này trước đó!"


@pytest.mark.asyncio
async def test_assign_enterprise_seat_different_key(
    mock_session_scope, mock_identity_repo
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_user = User(
        id="user_1",
        email="test@test.com",
        password_hash="hash",
        full_name="Test",
        role=UserRole.LEARNER,
        enterprise_seat_key="OTHER-KEY",
    )
    mock_repo_instance.get_by_id.return_value = mock_user

    usecase = IdentityUseCase()
    success, msg = await usecase.assign_enterprise_seat("user_1", "VALID-KEY")

    assert success is False
    assert (
        msg
        == "Bạn đã có suất học Enterprise khác đang kích hoạt. Vui lòng liên hệ Admin để đổi mã."
    )


@pytest.mark.asyncio
async def test_revoke_enterprise_seat_progress_guard(
    mock_session_scope, mock_identity_repo
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance

    from datetime import datetime

    now_iso = datetime.now(UTC).isoformat()
    user = User(
        id="u1",
        email="test@test.com",
        password_hash="hash",
        full_name="Test",
        role=UserRole.LEARNER,
        enterprise_seat_key="KEY_1",
        seat_assigned_at=now_iso,
    )
    mock_repo_instance.get_by_id.return_value = user

    from src.modules.learning.domain.entities import LearningProgress

    progress = LearningProgress(
        user_id="u1", course_id="c1", overall_progress_percent=25.0
    )

    mock_learning_repo = AsyncMock()
    mock_learning_repo.get_progress = AsyncMock(return_value=progress)

    usecase = IdentityUseCase(learning_repo_factory=lambda s: mock_learning_repo)
    ok, msg = await usecase.revoke_enterprise_seat("u1", course_id="c1")
    assert ok is False
    assert "tiến độ (>= 20% trong 30 ngày đầu)" in msg


@pytest.mark.asyncio
async def test_revoke_enterprise_seat_invalid_date(
    mock_session_scope, mock_identity_repo
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance

    user = User(
        id="u1",
        email="test@test.com",
        password_hash="hash",
        full_name="Test",
        role=UserRole.LEARNER,
        enterprise_seat_key="KEY_1",
        seat_assigned_at="invalid-date",
    )
    mock_repo_instance.get_by_id.return_value = user

    usecase = IdentityUseCase()
    ok, msg = await usecase.revoke_enterprise_seat("u1", course_id="c1")
    assert ok is True
    assert "thu hồi" in msg


@pytest.mark.asyncio
async def test_update_instructor_profile(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance

    user = User(
        id="u1",
        email="instructor@test.com",
        full_name="Prof. Andrew Ng",
        role=UserRole.INSTRUCTOR,
        avatar_url="",
        password_hash="",
    )
    mock_repo_instance.get_by_id.return_value = user
    mock_repo_instance.save.side_effect = lambda u: u

    usecase = IdentityUseCase()
    updated_user, err = await usecase.update_instructor_profile(
        "u1",
        title="Professor of Computer Science",
        signature_image_url="https://example.com/sig.png",
    )

    assert err == ""
    assert updated_user is not None
    assert updated_user.title == "Professor of Computer Science"
    assert updated_user.signature_image_url == "https://example.com/sig.png"
    mock_repo_instance.save.assert_called_once()


@pytest.mark.asyncio
async def test_create_and_get_invitation(mock_session_scope):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    inviter = CurrentUser(
        id="user_admin_001",
        email="admin@test.com",
        full_name="Admin Test",
        role="ADMIN",
    )

    with (
        patch(
            "src.modules.identity.infrastructure.repository.InvitationRepository"
        ) as mock_inv_repo,
        patch(
            "src.modules.identity.infrastructure.repository.IdentityRepository"
        ) as mock_user_repo,
    ):
        mock_inv_repo_instance = AsyncMock()
        mock_user_repo_instance = AsyncMock()
        mock_inv_repo.return_value = mock_inv_repo_instance
        mock_user_repo.return_value = mock_user_repo_instance
        mock_inv_repo_instance.save.side_effect = lambda inv: inv

        mock_user_repo_instance.get_by_id.return_value = User(
            id="user_admin_001",
            email="admin@test.com",
            full_name="Admin Test",
            role=UserRole.ADMIN,
        )

        uc = IdentityUseCase()
        res = await uc.create_invitation(
            type="INVITATION_TYPE_ORGANIZATION_MEMBER",
            invitee_email="learner1@test.com",
            target_id="org_test_001",
            target_name="Test Organization",
            role_id="MEMBER",
            message="Mời bạn tham gia tổ chức",
            current_user=inviter,
        )

        assert res["id"].startswith("inv_")
        assert res["status"] == "INVITATION_STATUS_PENDING"
        assert res["invitee_email"] == "learner1@test.com"
        assert res["token"].startswith("inv_tok_")
        mock_inv_repo_instance.save.assert_called_once()


@pytest.mark.asyncio
async def test_respond_to_invitation(mock_session_scope):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    invitee = CurrentUser(
        id="user_learner_002",
        email="invitee2@test.com",
        full_name="Learner 2",
        role="LEARNER",
    )

    with (
        patch(
            "src.modules.identity.infrastructure.repository.InvitationRepository"
        ) as mock_inv_repo,
        patch(
            "src.modules.identity.infrastructure.repository.OrganizationRepository"
        ) as mock_org_repo,
    ):
        mock_inv_repo_instance = AsyncMock()
        mock_org_repo_instance = AsyncMock()
        mock_inv_repo.return_value = mock_inv_repo_instance
        mock_org_repo.return_value = mock_org_repo_instance
        mock_inv_repo_instance.save.side_effect = lambda inv: inv

        from src.modules.identity.domain.entities import (
            Invitation,
            InvitationStatus,
            InvitationType,
        )

        inv = Invitation(
            id="inv_123",
            type=InvitationType.ORGANIZATION_MEMBER,
            status=InvitationStatus.PENDING,
            inviter_id="user_admin_002",
            inviter_name="Admin",
            inviter_email="admin@test.com",
            invitee_email="invitee2@test.com",
            target_id="org_123",
            target_name="Test Org 123",
            role_id="MEMBER",
            token_hash="hash123",
        )
        mock_inv_repo_instance.get_by_id.return_value = inv

        uc = IdentityUseCase()
        resp, success, _msg = await uc.respond_to_invitation(
            invitation_id="inv_123",
            action="INVITATION_ACTION_ACCEPT",
            current_user=invitee,
        )

        assert success is True
        assert resp["status"] == "INVITATION_STATUS_ACCEPTED"
        mock_org_repo_instance.add_member.assert_called_once_with(
            user_id=invitee.id,
            org_id="org_123",
            role_id="MEMBER",
            status="ACTIVE",
        )


@pytest.mark.asyncio
async def test_cancel_invitation(mock_session_scope):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    inviter = CurrentUser(
        id="user_admin_003",
        email="admin3@test.com",
        full_name="Admin 3",
        role="ADMIN",
    )

    with patch(
        "src.modules.identity.infrastructure.repository.InvitationRepository"
    ) as mock_inv_repo:
        mock_inv_repo_instance = AsyncMock()
        mock_inv_repo.return_value = mock_inv_repo_instance
        mock_inv_repo_instance.save.side_effect = lambda inv: inv

        from src.modules.identity.domain.entities import (
            Invitation,
            InvitationStatus,
            InvitationType,
        )

        inv = Invitation(
            id="inv_cancel_123",
            type=InvitationType.COURSE_CO_INSTRUCTOR,
            status=InvitationStatus.PENDING,
            inviter_id="user_admin_003",
            inviter_name="Admin 3",
            inviter_email="admin3@test.com",
            invitee_email="instructor3@test.com",
            target_id="course_123",
            target_name="Test Course 123",
            role_id="co_instructor",
            token_hash="hash_cancel",
        )
        mock_inv_repo_instance.get_by_id.return_value = inv

        uc = IdentityUseCase()
        cancel_success = await uc.cancel_invitation(
            invitation_id="inv_cancel_123",
            current_user=inviter,
        )
        assert cancel_success is True
        assert inv.status == InvitationStatus.CANCELLED
        mock_inv_repo_instance.save.assert_called_once()


@pytest.mark.asyncio
async def test_remove_organization_member_audit_logging():
    with patch(
        "src.modules.identity.infrastructure.repository.OrganizationRepository"
    ) as mock_org_repo:
        mock_repo = AsyncMock()
        mock_org_repo.return_value = mock_repo
        mock_repo.get_member.return_value = MagicMock(role_id="MEMBER")
        mock_repo.remove_member.return_value = True

        uc = IdentityUseCase()
        owner = CurrentUser(
            id="user_owner",
            email="owner@test.com",
            full_name="Owner Test",
            role="ADMIN",
        )
        res = await uc.remove_organization_member(
            user_id="user_member", organization_id="org_123", current_user=owner
        )
        assert res is True
        mock_repo.create_audit_log.assert_called_once()
        call_kwargs = mock_repo.create_audit_log.call_args[1]
        assert call_kwargs["action"] == "ORGANIZATION_AUDIT_ACTION_MEMBER_KICKED"
        assert call_kwargs["target_user_id"] == "user_member"


def test_validate_password_policy():
    from src.modules.identity.application.identity_usecase import validate_password

    # Empty / None
    assert validate_password("") == "Mật khẩu phải chứa ít nhất 6 ký tự."

    # Short password (<6 chars)
    assert validate_password("Ab1") == "Mật khẩu phải chứa ít nhất 6 ký tự."

    # Missing uppercase
    assert validate_password("abc1234") == "Mật khẩu phải chứa ít nhất 1 chữ in hoa."

    # Missing digit
    assert validate_password("Abcdefgh") == "Mật khẩu phải chứa ít nhất 1 chữ số."

    # Valid password
    assert validate_password("Password123") is None
    assert validate_password("Abc123") is None


@pytest.mark.asyncio
async def test_register_weak_passwords(mock_session_scope, mock_identity_repo):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo_instance = AsyncMock()
    mock_identity_repo.return_value = mock_repo_instance
    mock_repo_instance.get_by_email.return_value = None

    usecase = IdentityUseCase()

    # Try weak password without uppercase
    user, err = await usecase.register(
        "new@test.com", "password123", "New User", "learner"
    )
    assert user is None
    assert "chữ in hoa" in err

    # Try weak password without digit
    user, err = await usecase.register(
        "new@test.com", "Password", "New User", "learner"
    )
    assert user is None
    assert "chữ số" in err

    # Try short password
    user, err = await usecase.register("new@test.com", "Ab1", "New User", "learner")
    assert user is None
    assert "tối thiểu 6 ký tự" in err.lower() or "ít nhất 6 ký tự" in err.lower()


@pytest.mark.asyncio
async def test_login_rate_limit_blocking():
    with patch(
        "src.shared.infrastructure.rate_limiter.check_login_rate_limit"
    ) as mock_check:
        mock_check.return_value = (False, 900)  # Blocked, 900s remaining

        usecase = IdentityUseCase()
        user, acc_token, ref_token, err = await usecase.login(
            "target@test.com", "Password123"
        )

        assert user is None
        assert acc_token == ""
        assert ref_token == ""
        assert "khóa" in err
        assert "15 phút" in err
