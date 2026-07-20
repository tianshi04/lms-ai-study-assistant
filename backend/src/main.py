from typing import Any, Callable

from src.gen.greet.v1.greet_connect import GreetServiceASGIApplication
from src.modules.greet.application.greet_usecase import GreetUseCase
from src.modules.greet.presentation.greet_handler import GreetHandler


class CORSMiddleware:
    """Simple ASGI middleware to handle CORS preflight and headers for ConnectRPC."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(
        self, scope: dict[str, Any], receive: Callable, send: Callable
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Handle preflight (OPTIONS) requests
        if scope.get("method") == "OPTIONS":
            headers = [
                (b"access-control-allow-origin", b"*"),
                (b"access-control-allow-methods", b"POST, GET, OPTIONS"),
                (
                    b"access-control-allow-headers",
                    b"connect-protocol-version, content-type, authorization",
                ),
                (b"access-control-max-age", b"86400"),
                (b"content-length", b"0"),
            ]
            await send(
                {
                    "type": "http.response.start",
                    "status": 204,
                    "headers": headers,
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b"",
                }
            )
            return

        # For normal requests, inject access-control-allow-origin header
        async def cors_send(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                # Convert headers to list of tuples and append CORS headers
                headers = list(message.get("headers", []))
                # Remove existing CORS headers if any to avoid duplication
                headers = [
                    h
                    for h in headers
                    if h[0].lower()
                    not in (
                        b"access-control-allow-origin",
                        b"access-control-expose-headers",
                    )
                ]
                headers.append((b"access-control-allow-origin", b"*"))
                headers.append(
                    (
                        b"access-control-expose-headers",
                        b"connect-error-info, connect-protocol-version",
                    )
                )
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, cors_send)


# 1. Dependency Injection (Bootstrapping)
# Create use case and inject it into the handler
greet_usecase = GreetUseCase()
greet_handler = GreetHandler(use_case=greet_usecase)

# 2. Expose the ASGI Application
# In a modular monolith, you can mount this application under `/greet.v1.GreetService`
# using an ASGI router or dispatcher if you add more modules/services later.
app = CORSMiddleware(GreetServiceASGIApplication(greet_handler))
