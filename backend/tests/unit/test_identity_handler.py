import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from connectrpc.errors import ConnectError

from src.gen.identity.v1 import identity_pb as pb
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.identity.domain.entities import User, UserRole


@pytest.mark.asyncio
@patch("src.modules.identity.presentation.identity_handler.require_current_user")
async def test_update_user_profile_handler_success(mock_require_current_user):
    usecase_mock = AsyncMock()

    # Setup mock current user
    mock_user = MagicMock()
    mock_user.id = "u1"
    mock_require_current_user.return_value = mock_user

    # Setup mock usecase return
    updated_user = User(
        id="u1",
        email="test@test.com",
        full_name="New Name",
        role=UserRole.LEARNER,
        avatar_url="new.png",
        password_hash="",
    )
    usecase_mock.update_user_profile.return_value = (updated_user, "")

    handler = IdentityHandler(usecase_mock)

    request = pb.UpdateUserProfileRequest(full_name="New Name", avatar_url="new.png")
    context_mock = MagicMock()

    response = await handler.update_user_profile(request, context_mock)

    assert response is not None
    assert response.user is not None
    assert response.user.id == "u1"
    assert response.user.full_name == "New Name"
    assert response.user.avatar_url == "new.png"

    usecase_mock.update_user_profile.assert_called_once_with(
        user_id="u1", full_name="New Name", avatar_url="new.png"
    )


@pytest.mark.asyncio
@patch("src.modules.identity.presentation.identity_handler.require_current_user")
async def test_update_user_profile_handler_failure(mock_require_current_user):
    usecase_mock = AsyncMock()

    mock_user = MagicMock()
    mock_user.id = "u1"
    mock_require_current_user.return_value = mock_user

    # Setup mock usecase return failure
    usecase_mock.update_user_profile.return_value = (None, "Some error")

    handler = IdentityHandler(usecase_mock)

    request = pb.UpdateUserProfileRequest(full_name="New Name", avatar_url="new.png")
    context_mock = MagicMock()

    with pytest.raises(ConnectError) as exc:
        await handler.update_user_profile(request, context_mock)

    assert "Some error" in str(exc.value)
