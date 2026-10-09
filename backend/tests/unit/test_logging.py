import json
import logging

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.responses import JSONResponse
from starlette.routing import Route

from src.shared.infrastructure.logging.config import (
    ContextAwareFormatter,
    JSONContextAwareFormatter,
    setup_logging,
)
from src.shared.infrastructure.logging.context import (
    get_request_id,
    get_user_id,
    reset_request_id,
    reset_user_id,
    set_request_id,
    set_user_id,
)
from src.shared.infrastructure.middlewares import RequestIDMiddleware


def test_logging_contextvars_isolation():
    token_req = set_request_id("req-123")
    token_user = set_user_id("user-456")

    assert get_request_id() == "req-123"
    assert get_user_id() == "user-456"

    reset_request_id(token_req)
    reset_user_id(token_user)

    assert get_request_id() is None
    assert get_user_id() is None


def test_context_aware_formatter():
    formatter = ContextAwareFormatter(
        "%(asctime)s [%(levelname)s] [%(ctx)s] %(name)s: %(message)s"
    )
    token_req = set_request_id("test-req-999")

    try:
        record = logging.LogRecord(
            name="test_logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Hello logging",
            args=(),
            exc_info=None,
        )
        output = formatter.format(record)
        assert "[req_id=test-req-999]" in output
        assert "Hello logging" in output
    finally:
        reset_request_id(token_req)


def test_json_context_aware_formatter():
    formatter = JSONContextAwareFormatter()
    token_req = set_request_id("json-req-111")
    token_user = set_user_id("user-222")

    try:
        record = logging.LogRecord(
            name="json_logger",
            level=logging.ERROR,
            pathname="test.py",
            lineno=20,
            msg="Database error",
            args=(),
            exc_info=None,
        )
        record.extra_field = "extra_value"  # type: ignore[attr-defined]

        output = formatter.format(record)
        data = json.loads(output)

        assert data["level"] == "ERROR"
        assert data["logger"] == "json_logger"
        assert data["message"] == "Database error"
        assert data["request_id"] == "json-req-111"
        assert data["user_id"] == "user-222"
        assert data["extra_field"] == "extra_value"
    finally:
        reset_request_id(token_req)
        reset_user_id(token_user)


def test_setup_logging_runs_without_error():
    setup_logging()
    logger = logging.getLogger("test_setup")
    logger.info("Setup logging test message")


@pytest.mark.asyncio
async def test_request_id_middleware():
    async def homepage(request):
        return JSONResponse({"request_id": get_request_id()})

    app = Starlette(
        routes=[Route("/", endpoint=homepage)],
        middleware=[Middleware(RequestIDMiddleware)],
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        # 1. Custom x-request-id
        resp = await client.get("/", headers={"x-request-id": "custom-id-007"})
        assert resp.status_code == 200
        assert resp.headers["x-request-id"] == "custom-id-007"
        assert resp.json()["request_id"] == "custom-id-007"

        # 2. Auto-generated x-request-id
        resp_auto = await client.get("/")
        assert resp_auto.status_code == 200
        assert "x-request-id" in resp_auto.headers
        assert resp_auto.json()["request_id"] == resp_auto.headers["x-request-id"]
