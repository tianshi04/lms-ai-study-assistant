from dataclasses import dataclass
from typing import Any
import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.auth import (
    CurrentUser,
    clear_current_user,
    create_access_token,
    get_current_user,
    require_current_user,
)
from src.shared.infrastructure.interceptors import AuthInterceptor


@dataclass
class MockCtx:
    path: str
    invocation_metadata: dict[str, str]


@pytest.mark.asyncio
async def test_auth_interceptor_public_endpoint() -> None:
    clear_current_user()
    interceptor = AuthInterceptor()
    ctx = MockCtx(path="/identity.v1.IdentityService/Login", invocation_metadata={})

    called = False

    async def call_next(req: Any, c: Any) -> str:
        nonlocal called
        called = True
        assert get_current_user() is None
        return "success"

    res = await interceptor.intercept_unary(call_next, "dummy_req", ctx)
    assert res == "success"
    assert called is True


@pytest.mark.asyncio
async def test_auth_interceptor_missing_header_raises_unauthenticated() -> None:
    clear_current_user()
    interceptor = AuthInterceptor()
    ctx = MockCtx(
        path="/learning.v1.LearningService/GetProgress", invocation_metadata={}
    )

    async def call_next(req: Any, c: Any) -> str:
        return "should_not_reach"

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_next, "dummy_req", ctx)

    assert exc_info.value.code == Code.UNAUTHENTICATED
    assert "Thiếu header Authorization" in exc_info.value.message


@pytest.mark.asyncio
async def test_auth_interceptor_valid_token_sets_context() -> None:
    clear_current_user()
    token = create_access_token(user_id="user_123", email="user123@example.com")
    interceptor = AuthInterceptor()
    ctx = MockCtx(
        path="/learning.v1.LearningService/GetProgress",
        invocation_metadata={"authorization": f"Bearer {token}"},
    )

    captured_user: CurrentUser | None = None

    async def call_next(req: Any, c: Any) -> str:
        nonlocal captured_user
        captured_user = require_current_user()
        return "success"

    res = await interceptor.intercept_unary(call_next, "dummy_req", ctx)
    assert res == "success"
    assert captured_user is not None
    assert captured_user.id == "user_123"
    assert captured_user.email == "user123@example.com"
    # Context should be cleaned up after request ends
    assert get_current_user() is None


@pytest.mark.asyncio
async def test_require_current_user_raises_when_unauthenticated() -> None:
    clear_current_user()
    with pytest.raises(ConnectError) as exc_info:
        require_current_user()

    assert exc_info.value.code == Code.UNAUTHENTICATED


@pytest.mark.asyncio
async def test_auth_interceptor_authenticated_endpoint_hydrates_context() -> None:
    clear_current_user()
    token = create_access_token(user_id="user_learner", email="learner@example.com")
    interceptor = AuthInterceptor()
    ctx = MockCtx(
        path="/identity.v1.IdentityService/AssignEnterpriseSeat",
        invocation_metadata={"authorization": f"Bearer {token}"},
    )

    async def call_next(req: Any, c: Any) -> str:
        current = get_current_user()
        assert current is not None
        assert current.id == "user_learner"
        return "success"

    res = await interceptor.intercept_unary(call_next, "dummy_req", ctx)
    assert res == "success"


@pytest.mark.asyncio
async def test_auth_interceptor_valid_cookie_token_sets_context() -> None:
    clear_current_user()
    token = create_access_token(user_id="user_cookie", email="cookie@example.com")
    interceptor = AuthInterceptor()
    ctx = MockCtx(
        path="/learning.v1.LearningService/GetProgress",
        invocation_metadata={"cookie": f"access_token={token}; Path=/"},
    )

    captured_user: CurrentUser | None = None

    async def call_next(req: Any, c: Any) -> str:
        nonlocal captured_user
        captured_user = require_current_user()
        return "success"

    res = await interceptor.intercept_unary(call_next, "dummy_req", ctx)
    assert res == "success"
    assert captured_user is not None
    assert captured_user.id == "user_cookie"
    assert captured_user.email == "cookie@example.com"


def test_token_resolvers_unit() -> None:
    from src.shared.infrastructure.auth import (
        BearerTokenResolver,
        CookieTokenResolver,
        TokenResolverChain,
    )

    bearer_resolver = BearerTokenResolver()
    assert bearer_resolver.resolve({"authorization": "Bearer token_123"}) == "token_123"
    assert bearer_resolver.resolve({"authorization": "raw_token"}) == "raw_token"
    assert bearer_resolver.resolve({}) is None

    cookie_resolver = CookieTokenResolver()
    assert (
        cookie_resolver.resolve({"cookie": "access_token=token_456; Path=/"})
        == "token_456"
    )
    assert cookie_resolver.resolve({"cookie": "other=123"}) is None
    assert cookie_resolver.resolve({}) is None

    chain = TokenResolverChain([bearer_resolver, cookie_resolver])
    assert chain.resolve({"authorization": "Bearer b_tok"}) == "b_tok"
    assert chain.resolve({"cookie": "access_token=c_tok"}) == "c_tok"
    assert (
        chain.resolve({"authorization": "Bearer b_tok", "cookie": "access_token=c_tok"})
        == "b_tok"
    )
    assert chain.resolve({}) is None
