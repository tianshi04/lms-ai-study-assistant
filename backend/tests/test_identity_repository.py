import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.identity.infrastructure.repository import IdentityRepository
from src.modules.identity.domain.entities import User, UserRole
from src.modules.identity.infrastructure.models import UserModel


@pytest.mark.asyncio
async def test_get_by_id_found():
    # Arrange
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_model = UserModel(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role="USER_ROLE_LEARNER",
        avatar_url="",
        enterprise_seat_key=None,
        password_hash="hash",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)

    # Act
    user = await repo.get_by_id("u1")

    # Assert
    assert user is not None
    assert user.id == "u1"
    assert user.email == "test@test.com"


@pytest.mark.asyncio
async def test_get_by_id_not_found():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)
    user = await repo.get_by_id("u1")
    assert user is None


@pytest.mark.asyncio
async def test_get_by_email_found():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_model = UserModel(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role="USER_ROLE_LEARNER",
        avatar_url="",
        enterprise_seat_key=None,
        password_hash="hash",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)
    user = await repo.get_by_email("test@test.com")

    assert user is not None
    assert user.email == "test@test.com"


@pytest.mark.asyncio
async def test_get_by_email_not_found():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)
    user = await repo.get_by_email("test@test.com")

    assert user is None


@pytest.mark.asyncio
async def test_save_new_user():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)
    new_user = User(
        id="u2",
        email="new@test.com",
        full_name="New",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="hash",
    )

    saved = await repo.save(new_user)

    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    assert saved.id == "u2"


@pytest.mark.asyncio
async def test_save_existing_user():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_model = UserModel(
        id="u1",
        email="test@test.com",
        full_name="Test",
        role="USER_ROLE_LEARNER",
        avatar_url="",
        enterprise_seat_key=None,
        password_hash="hash",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    repo = IdentityRepository(mock_session)
    existing_user = User(
        id="u1",
        email="updated@test.com",
        full_name="Updated",
        role=UserRole.LEARNER,
        avatar_url="",
        password_hash="newhash",
    )

    saved = await repo.save(existing_user)

    assert mock_model.email == "updated@test.com"
    assert mock_model.full_name == "Updated"
    mock_session.add.assert_not_called()
    mock_session.flush.assert_called_once()
    assert saved.email == "updated@test.com"
