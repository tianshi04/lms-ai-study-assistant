from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.catalog.v1 import catalog_pb as pb
from src.modules.catalog.application.course_usecase import CourseUseCase
from src.modules.catalog.domain.constants import (
    MAX_SEARCH_QUERY_LENGTH,
)
from src.modules.catalog.infrastructure.models import UserSearchHistoryModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.shared.auth import CurrentUser


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_record_search_query_too_short(mock_session):
    repo = SQLAlchemyCatalogRepository(mock_session)
    result = await repo.record_search_query(user_id="user_123", query="a")
    assert result is False
    assert not mock_session.add.called
    assert not mock_session.commit.called


@pytest.mark.asyncio
async def test_record_search_query_empty_or_whitespace(mock_session):
    repo = SQLAlchemyCatalogRepository(mock_session)
    result = await repo.record_search_query(user_id="user_123", query="   ")
    assert result is False
    assert not mock_session.add.called

    result_none_user = await repo.record_search_query(user_id="", query="valid query")
    assert result_none_user is False


@pytest.mark.asyncio
async def test_record_search_query_insert_new(mock_session):
    # Mock no prior search entry
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyCatalogRepository(mock_session)
    result = await repo.record_search_query(
        user_id="user_123",
        query="  Python for Beginners  ",
        filters_json='{"level": "beginner"}',
        result_count=15,
    )

    assert result is True
    assert mock_session.add.called
    added_obj = mock_session.add.call_args[0][0]
    assert isinstance(added_obj, UserSearchHistoryModel)
    assert added_obj.user_id == "user_123"
    assert added_obj.search_query == "Python for Beginners"
    assert added_obj.filters_json == '{"level": "beginner"}'
    assert added_obj.result_count == 15
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_record_search_query_truncates_long_query(mock_session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyCatalogRepository(mock_session)
    long_query = "a" * (MAX_SEARCH_QUERY_LENGTH + 50)
    result = await repo.record_search_query(user_id="user_123", query=long_query)

    assert result is True
    added_obj = mock_session.add.call_args[0][0]
    assert len(added_obj.search_query) == MAX_SEARCH_QUERY_LENGTH


@pytest.mark.asyncio
async def test_record_search_query_negative_result_count_clamped(mock_session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyCatalogRepository(mock_session)
    result = await repo.record_search_query(
        user_id="user_123", query="Data Science", result_count=-5
    )

    assert result is True
    added_obj = mock_session.add.call_args[0][0]
    assert added_obj.result_count == 0


@pytest.mark.asyncio
async def test_record_search_query_prefix_update_throttling(mock_session):
    # Previous search 2 seconds ago
    now = datetime.now(UTC)
    two_secs_ago = (now - timedelta(seconds=2)).isoformat()

    existing_history = UserSearchHistoryModel(
        id="hist_1",
        user_id="user_123",
        search_query="Pyth",
        filters_json="",
        result_count=5,
        created_at=two_secs_ago,
    )

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = existing_history
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyCatalogRepository(mock_session)
    # User continues typing: "Python" (starts with "Pyth")
    result = await repo.record_search_query(
        user_id="user_123",
        query="Python",
        filters_json='{"subject": "cs"}',
        result_count=12,
    )

    assert result is True
    # Should update existing instead of adding a new one
    assert not mock_session.add.called
    assert existing_history.search_query == "Python"
    assert existing_history.filters_json == '{"subject": "cs"}'
    assert existing_history.result_count == 12
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_record_search_query_expired_throttle_inserts_new(mock_session):
    # Previous search 10 seconds ago (exceeds SEARCH_HISTORY_THROTTLE_SECONDS = 5s)
    now = datetime.now(UTC)
    ten_secs_ago = (now - timedelta(seconds=10)).isoformat()

    existing_history = UserSearchHistoryModel(
        id="hist_old",
        user_id="user_123",
        search_query="Pyth",
        filters_json="",
        result_count=5,
        created_at=ten_secs_ago,
    )

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = existing_history
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyCatalogRepository(mock_session)
    result = await repo.record_search_query(
        user_id="user_123",
        query="Python",
    )

    assert result is True
    assert mock_session.add.called


@pytest.mark.asyncio
async def test_usecase_record_course_search():
    mock_repo = AsyncMock()
    mock_repo.record_search_query.return_value = True

    uc = CourseUseCase(repo_factory=lambda _: mock_repo)

    with patch(
        "src.modules.catalog.application.course_usecase.async_session_scope"
    ) as mock_scope:
        mock_scope.return_value.__aenter__.return_value = AsyncMock()

        success = await uc.record_course_search(
            user_id="u_456",
            query="Deep Learning",
            filters_json='{"level": "adv"}',
            result_count=8,
        )
        assert success is True
        mock_repo.record_search_query.assert_called_once_with(
            user_id="u_456",
            query="Deep Learning",
            filters_json='{"level": "adv"}',
            result_count=8,
        )


@pytest.mark.asyncio
async def test_handler_record_course_search_authenticated():
    usecase_mock = AsyncMock()
    usecase_mock.record_course_search.return_value = True

    handler = CatalogHandler(usecase_mock)
    req = pb.RecordCourseSearchRequest(
        search_query="Docker Kubernetes",
        filters_json='{"sort_by": "popular"}',
        result_count=20,
    )
    ctx = MagicMock()

    current_user = CurrentUser(
        id="u_auth_1",
        email="auth1@example.com",
        full_name="Auth User",
        role="STUDENT",
    )

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=current_user,
    ):
        res = await handler.record_course_search(req, ctx)
        assert res.success is True
        usecase_mock.record_course_search.assert_called_once_with(
            user_id="u_auth_1",
            query="Docker Kubernetes",
            filters_json='{"sort_by": "popular"}',
            result_count=20,
        )


@pytest.mark.asyncio
async def test_handler_record_course_search_unauthenticated_fails():
    usecase_mock = AsyncMock()
    handler = CatalogHandler(usecase_mock)
    req = pb.RecordCourseSearchRequest(search_query="React")
    ctx = MagicMock()

    with (
        patch(
            "src.modules.catalog.presentation.catalog_handler.require_current_user",
            side_effect=ConnectError(Code.UNAUTHENTICATED, "Unauthenticated"),
        ),
        pytest.raises(ConnectError),
    ):
        await handler.record_course_search(req, ctx)
