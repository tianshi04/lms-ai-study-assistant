from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.catalog.v1 import catalog_pb as pb
from src.modules.catalog.application.course_review_usecase import CourseReviewUseCase
from src.modules.catalog.domain import CourseReview
from src.modules.catalog.domain.constants import ERR_MSG_SELF_UPVOTE
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.shared.auth import CurrentUser


@pytest.fixture
def mock_repo():
    return AsyncMock()


@pytest.fixture
def mock_session_scope(mock_repo):
    class DummyContext:
        async def __aenter__(self):
            return AsyncMock()

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    return DummyContext


@pytest.mark.asyncio
async def test_toggle_review_helpful_not_found(mock_repo):
    mock_repo.get_review_by_id.return_value = None

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        with pytest.raises(ValueError, match="Nhận xét không tồn tại"):
            await uc.toggle_course_review_helpful(
                user_id="user_1", review_id="rev_nonexistent"
            )


@pytest.mark.asyncio
async def test_toggle_review_helpful_self_upvote_forbidden(mock_repo):
    author_id = "user_author_1"
    review = CourseReview(
        id="rev_1",
        course_id="course_1",
        user_id=author_id,
        user_name="Author",
        rating_stars=5,
        comment_text="Great course",
        created_at="2026-11-04T00:00:00Z",
    )
    mock_repo.get_review_by_id.return_value = review

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        with pytest.raises(ValueError, match=ERR_MSG_SELF_UPVOTE):
            await uc.toggle_course_review_helpful(user_id=author_id, review_id="rev_1")


@pytest.mark.asyncio
async def test_toggle_review_helpful_success(mock_repo):
    review = CourseReview(
        id="rev_1",
        course_id="course_1",
        user_id="user_author_1",
        user_name="Author",
        rating_stars=5,
        comment_text="Great course",
        created_at="2026-11-04T00:00:00Z",
        helpful_count=0,
    )
    mock_repo.get_review_by_id.return_value = review
    mock_repo.toggle_course_review_helpful.return_value = (True, 1)

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        is_helpful, count = await uc.toggle_course_review_helpful(
            user_id="user_voter_2", review_id="rev_1"
        )
        assert is_helpful is True
        assert count == 1
        mock_repo.toggle_course_review_helpful.assert_called_once_with(
            user_id="user_voter_2", review_id="rev_1"
        )


@pytest.mark.asyncio
async def test_handler_toggle_course_review_helpful_success():
    usecase_mock = AsyncMock()
    usecase_mock.toggle_course_review_helpful.return_value = (True, 5)

    handler = CatalogHandler(usecase_mock)
    req = pb.ToggleCourseReviewHelpfulRequest(review_id="rev_123")
    ctx = MagicMock()

    user = CurrentUser(
        id="user_456",
        email="test@example.com",
        full_name="Tester",
        role="STUDENT",
    )

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=user,
    ):
        res = await handler.toggle_course_review_helpful(req, ctx)
        assert res.review_id == "rev_123"
        assert res.is_helpful is True
        assert res.helpful_count == 5
        usecase_mock.toggle_course_review_helpful.assert_called_once_with(
            user_id="user_456", review_id="rev_123"
        )


@pytest.mark.asyncio
async def test_handler_toggle_course_review_helpful_self_upvote_error():
    usecase_mock = AsyncMock()
    usecase_mock.toggle_course_review_helpful.side_effect = ValueError(
        ERR_MSG_SELF_UPVOTE
    )

    handler = CatalogHandler(usecase_mock)
    req = pb.ToggleCourseReviewHelpfulRequest(review_id="rev_123")
    ctx = MagicMock()

    user = CurrentUser(
        id="user_456",
        email="test@example.com",
        full_name="Tester",
        role="STUDENT",
    )

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=user,
    ):
        with pytest.raises(ConnectError) as exc_info:
            await handler.toggle_course_review_helpful(req, ctx)
        assert exc_info.value.code == Code.INVALID_ARGUMENT
        assert ERR_MSG_SELF_UPVOTE in exc_info.value.message


@pytest.mark.asyncio
async def test_handler_list_course_reviews_maps_helpful_fields():
    usecase_mock = AsyncMock()
    rev = CourseReview(
        id="rev_1",
        course_id="c_1",
        user_id="u_1",
        user_name="User 1",
        rating_stars=5,
        comment_text="Super useful",
        created_at="2026-11-04T00:00:00Z",
        is_verified_completer=True,
        helpful_count=12,
        is_helpful_by_me=True,
    )
    usecase_mock.list_course_reviews.return_value = ([rev], 5.0, 1, "")

    handler = CatalogHandler(usecase_mock)
    req = pb.ListCourseReviewsRequest(course_id="c_1", page_size=10)
    ctx = MagicMock()

    user = CurrentUser(
        id="u_2",
        email="u2@example.com",
        full_name="User Two",
        role="STUDENT",
    )

    with patch(
        "src.modules.catalog.presentation.catalog_handler.get_current_user",
        return_value=user,
    ):
        res = await handler.list_course_reviews(req, ctx)
        assert len(res.reviews) == 1
        pb_rev = res.reviews[0]
        assert pb_rev.helpful_count == 12
        assert pb_rev.is_helpful_by_me is True
        usecase_mock.list_course_reviews.assert_called_once_with(
            course_id="c_1",
            page_size=10,
            page_token="",
            current_user_id="u_2",
        )
