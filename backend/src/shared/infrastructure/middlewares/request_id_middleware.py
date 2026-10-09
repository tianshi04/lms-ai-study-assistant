from collections.abc import Callable
from typing import Any

from uuid6 import uuid7

from src.shared.infrastructure.logging import reset_request_id, set_request_id


class RequestIDMiddleware:
    """Pure ASGI Middleware for handling x-request-id header propagation and contextvars scope."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[..., Any],
        send: Callable[..., Any],
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. Extract or generate request ID
        headers = dict(scope.get("headers", []))
        request_id_bytes = headers.get(b"x-request-id")
        if request_id_bytes:
            request_id = request_id_bytes.decode("utf-8", errors="replace")
        else:
            request_id = str(uuid7())

        # 2. Set request_id in contextvars
        token = set_request_id(request_id)

        # 3. Intercept response headers to inject x-request-id
        async def send_with_request_id(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                resp_headers = list(message.get("headers", []))
                resp_headers.append((b"x-request-id", request_id.encode("utf-8")))
                message["headers"] = resp_headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            reset_request_id(token)
