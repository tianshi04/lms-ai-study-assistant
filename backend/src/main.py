import asyncio
from typing import Any, Callable

from src.gen.assessment.v1.assessment_connect import AssessmentServiceASGIApplication
from src.gen.catalog.v1.catalog_connect import CatalogServiceASGIApplication
from src.gen.certificate.v1.certificate_connect import CertificateServiceASGIApplication
from src.gen.identity.v1.identity_connect import IdentityServiceASGIApplication
from src.gen.learning.v1.learning_connect import LearningServiceASGIApplication
from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application.certificate_usecase import CertificateUseCase
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.modules.learning.presentation.learning_handler import LearningHandler
from src.shared.config import settings


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


async def run_auto_migrations() -> None:
    """Run Alembic upgrade head automatically on application startup (Dev mode only)."""
    if settings.ENV.lower() not in ("development", "dev"):
        print(
            f"[AUTO MIGRATION] Skipped auto-migration in '{settings.ENV}' environment mode."
        )
        return

    try:
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config("alembic.ini")

        def _upgrade():
            command.upgrade(alembic_cfg, "head")

        await asyncio.to_thread(_upgrade)
        print(
            "[AUTO MIGRATION] Alembic migrations upgraded to head successfully (Dev mode)."
        )
    except Exception as e:
        print(f"[AUTO MIGRATION] Warning during auto-migration: {e}")


class ModularRouterASGIApp:
    """ASGI Application that routes ConnectRPC requests to appropriate module applications based on path prefix."""

    def __init__(self, routes: dict[str, Any]) -> None:
        self.routes = routes

    async def __call__(
        self, scope: dict[str, Any], receive: Callable, send: Callable
    ) -> None:
        # Handle ASGI lifespan startup event for automatic database migration and seeding
        if scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    try:
                        await run_auto_migrations()
                        from src.seed import seed_database

                        await seed_database(auto_mode=True)
                    except Exception as e:
                        print(f"[STARTUP] Warning during startup: {e}")
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    break
            return

        if scope["type"] == "http":
            path = scope.get("path", "")
            for prefix, sub_app in self.routes.items():
                if path.startswith(prefix):
                    await sub_app(scope, receive, send)
                    return

        # Fallback 404 response
        await send(
            {
                "type": "http.response.start",
                "status": 404,
                "headers": [(b"content-type", b"text/plain")],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b"Not Found",
            }
        )


# 1. Dependency Injection (Bootstrapping Use Cases & Handlers)
catalog_usecase = CatalogUseCase()
catalog_handler = CatalogHandler(use_case=catalog_usecase)
catalog_app = CatalogServiceASGIApplication(catalog_handler)

learning_usecase = LearningUseCase()
learning_handler = LearningHandler(use_case=learning_usecase)
learning_app = LearningServiceASGIApplication(learning_handler)

identity_usecase = IdentityUseCase()
identity_handler = IdentityHandler(use_case=identity_usecase)
identity_app = IdentityServiceASGIApplication(identity_handler)

certificate_usecase = CertificateUseCase()
certificate_handler = CertificateHandler(use_case=certificate_usecase)
certificate_app = CertificateServiceASGIApplication(certificate_handler)

assessment_usecase = AssessmentUseCase()
assessment_handler = AssessmentHandler(use_case=assessment_usecase)
assessment_app = AssessmentServiceASGIApplication(assessment_handler)

# 2. Register Routes by service path prefix
router = ModularRouterASGIApp(
    {
        "/catalog.v1.CatalogService": catalog_app,
        "/learning.v1.LearningService": learning_app,
        "/identity.v1.IdentityService": identity_app,
        "/certificate.v1.CertificateService": certificate_app,
        "/assessment.v1.AssessmentService": assessment_app,
    }
)

app = CORSMiddleware(router)
