import asyncio
import logging
import posixpath
from contextlib import asynccontextmanager
from typing import Any, cast

from connectrpc_otel import OpenTelemetryInterceptor
from opentelemetry.instrumentation.starlette import StarletteInstrumentor
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse, Response
from starlette.routing import Mount, Route

from src.gen.assessment.v1.assessment_connect import AssessmentServiceASGIApplication
from src.gen.catalog.v1.catalog_connect import CatalogServiceASGIApplication
from src.gen.certificate.v1.certificate_connect import CertificateServiceASGIApplication
from src.gen.forum.v1.forum_connect import ForumServiceASGIApplication
from src.gen.identity.v1.identity_connect import IdentityServiceASGIApplication
from src.gen.learning.v1.learning_connect import LearningServiceASGIApplication
from src.gen.notification.v1.notification_connect import (
    NotificationServiceASGIApplication,
)
from src.gen.partner.v1.partner_connect import PartnerServiceASGIApplication
from src.gen.payment.v1.payment_connect import PaymentServiceASGIApplication
from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
from src.modules.catalog.application import CatalogUseCase
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application import CertificateUseCase
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.forum.application import ForumUseCase
from src.modules.forum.presentation.forum_handler import ForumHandler
from src.modules.identity.application import IdentityUseCase
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.learning.application import LearningUseCase
from src.modules.learning.presentation.learning_handler import LearningHandler
from src.modules.notification.application import (
    NotificationUseCase,
)
from src.modules.notification.presentation.notification_handler import (
    NotificationHandler,
)
from src.modules.partner.application import PartnerUseCase
from src.modules.partner.presentation.partner_handler import PartnerHandler
from src.modules.payment.application import PaymentUseCase
from src.modules.payment.presentation.payment_handler import PaymentHandler
from src.shared.config import VERCEL_ORIGIN_REGEX, settings
from src.shared.infrastructure.interceptors import AuthInterceptor, ErrorInterceptor
from src.shared.infrastructure.logging import setup_logging
from src.shared.infrastructure.middlewares import (
    AssetAuthMiddleware,
    RequestIDMiddleware,
)
from src.shared.infrastructure.telemetry import setup_telemetry

setup_logging()
setup_telemetry()
logger = logging.getLogger("main")


async def run_auto_migrations() -> None:
    """Run Alembic upgrade head automatically on application startup (Dev mode only)."""
    if settings.ENV.lower() not in ("development", "dev"):
        logger.info(
            "[AUTO MIGRATION] Skipped auto-migration in '%s' environment mode.",
            settings.ENV,
        )
        return

    try:
        from alembic.config import Config

        from alembic import command

        alembic_cfg = Config("alembic.ini")

        def _upgrade():
            command.upgrade(alembic_cfg, "head")

        await asyncio.to_thread(_upgrade)
        logger.info(
            "[AUTO MIGRATION] Alembic migrations upgraded to head successfully (Dev mode)."
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("[AUTO MIGRATION] Warning during auto-migration: %s", e)


@asynccontextmanager
async def lifespan(_app: Starlette):
    """Lifespan context manager for AuthPolicy pre-initialization, database migrations and initial seeding."""
    try:
        from src.modules.notification.application.event_handlers import (
            register_notification_event_handlers,
        )
        from src.shared.auth_policy import AuthPolicyRegistry

        register_notification_event_handlers()
        AuthPolicyRegistry.initialize()
        logger.info(
            "[STARTUP] Pre-initialized AuthPolicyRegistry and EventBus handlers successfully."
        )

        await run_auto_migrations()
        from src.seed import seed_database

        await seed_database(auto_mode=True)
    except Exception as e:  # noqa: BLE001
        logger.warning("[STARTUP] Warning during startup: %s", e)

    yield

    # --- GRACEFUL SHUTDOWN ---
    logger.info("[SHUTDOWN] Initiating graceful shutdown...")

    try:
        from src.shared.infrastructure.database import dispose_engine
        from src.shared.infrastructure.redis import close_redis_client

        async def _shutdown_db() -> None:
            await dispose_engine()
            logger.info("[SHUTDOWN] Database connection pool disposed.")

        async def _shutdown_redis() -> None:
            await close_redis_client()
            logger.info("[SHUTDOWN] Redis connection pool closed.")

        await asyncio.gather(_shutdown_db(), _shutdown_redis(), return_exceptions=True)
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "[SHUTDOWN] Error disposing database engine or redis client: %s", e
        )

    try:
        from opentelemetry import metrics, trace

        trace.get_tracer_provider().shutdown()  # type: ignore
        metrics.get_meter_provider().shutdown()  # type: ignore
        logger.info("[SHUTDOWN] OpenTelemetry providers flushed and shut down.")
    except Exception as e:  # noqa: BLE001
        logger.warning("[SHUTDOWN] Error shutting down OpenTelemetry providers: %s", e)

    logger.info("[SHUTDOWN] Graceful shutdown complete.")


# 1. Dependency Injection (Bootstrapping Use Cases & Handlers)
error_interceptor = ErrorInterceptor()
auth_interceptor = AuthInterceptor()
otel_interceptor = OpenTelemetryInterceptor()
interceptors = [error_interceptor, auth_interceptor, otel_interceptor]


catalog_usecase = CatalogUseCase()
catalog_handler = CatalogHandler(use_case=catalog_usecase)
catalog_app = CatalogServiceASGIApplication(catalog_handler, interceptors=interceptors)

learning_usecase = LearningUseCase()
learning_handler = LearningHandler(use_case=learning_usecase)
learning_app = LearningServiceASGIApplication(
    learning_handler, interceptors=interceptors
)

identity_usecase = IdentityUseCase()
identity_handler = IdentityHandler(use_case=identity_usecase)
identity_app = IdentityServiceASGIApplication(
    identity_handler, interceptors=interceptors
)

certificate_usecase = CertificateUseCase()
certificate_handler = CertificateHandler(use_case=certificate_usecase)
certificate_app = CertificateServiceASGIApplication(
    certificate_handler, interceptors=interceptors
)

assessment_usecase = AssessmentUseCase()
assessment_handler = AssessmentHandler(use_case=assessment_usecase)
assessment_app = AssessmentServiceASGIApplication(
    assessment_handler, interceptors=interceptors
)

forum_usecase = ForumUseCase()
forum_handler = ForumHandler(use_case=forum_usecase)
forum_app = ForumServiceASGIApplication(forum_handler, interceptors=interceptors)

partner_usecase = PartnerUseCase()
partner_handler = PartnerHandler(use_case=partner_usecase)
partner_app = PartnerServiceASGIApplication(partner_handler, interceptors=interceptors)

payment_usecase = PaymentUseCase()
payment_handler = PaymentHandler(use_case=payment_usecase)
payment_app = PaymentServiceASGIApplication(payment_handler, interceptors=interceptors)

notification_usecase = NotificationUseCase()
notification_handler = NotificationHandler(use_case=notification_usecase)
notification_app = NotificationServiceASGIApplication(
    notification_handler, interceptors=interceptors
)


def _get_cors_origin(request) -> str:
    """Return the request origin only if it is allow-listed, otherwise empty string."""
    origin = request.headers.get("origin", "")
    return origin if settings.is_allowed_origin(origin) else ""


async def proxy_media(request):
    """Proxy streaming endpoint for S3 media assets (/coursera-assets/{path:path}).

    - Supports range requests (206 Partial Content) for smooth HTML5 video scrubbing.
    - Streams content in 256KB chunks using StreamingResponse to avoid memory explosion.
    - Manages S3 async client lifecycle cleanly to prevent resource leaks.
    - Includes Access-Control-Allow-Credentials: true for cross-origin cookie authentication.
    """
    path = request.path_params["path"]

    # --- Sanitize path: block path traversal attacks ("../../etc/passwd") ---
    normalized = posixpath.normpath(path).lstrip("/")
    if ".." in normalized or not normalized:
        return Response(status_code=400, content="Invalid path")

    from starlette.responses import StreamingResponse

    from src.shared.infrastructure.s3_storage import get_s3_storage_service

    s3 = get_s3_storage_service()
    cors_origin = _get_cors_origin(request)

    if request.method == "OPTIONS":
        resp_headers = {
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
            "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
        }
        if cors_origin:
            resp_headers["Access-Control-Allow-Origin"] = cors_origin
            resp_headers["Access-Control-Allow-Credentials"] = "true"
        return Response(status_code=204, headers=resp_headers)

    s3_client_ctx = s3.get_client()
    s3_client = await s3_client_ctx.__aenter__()

    params = {"Bucket": s3.bucket_name, "Key": normalized}
    range_header = request.headers.get("range")
    if range_header:
        params["Range"] = range_header

    try:
        s3_resp = await s3_client.get_object(**params)
    except Exception as e:  # noqa: BLE001
        await s3_client_ctx.__aexit__(None, None, None)
        logger.warning("S3 proxy error for key '%s': %s", normalized, e)
        headers = {}
        if cors_origin:
            headers["Access-Control-Allow-Origin"] = cors_origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return Response(status_code=404, content="File not found", headers=headers)

    headers = {}
    if "ContentType" in s3_resp:
        headers["Content-Type"] = s3_resp["ContentType"]
    if "ContentLength" in s3_resp:
        headers["Content-Length"] = str(s3_resp["ContentLength"])
    if "ContentRange" in s3_resp:
        headers["Content-Range"] = s3_resp["ContentRange"]
        status_code = 206
    else:
        status_code = 200

    headers["Accept-Ranges"] = "bytes"
    if cors_origin:
        headers["Access-Control-Allow-Origin"] = cors_origin
        headers["Access-Control-Allow-Credentials"] = "true"

    if request.method == "HEAD":
        await s3_client_ctx.__aexit__(None, None, None)
        return Response(status_code=status_code, headers=headers)

    body_stream = s3_resp["Body"]

    async def generate_chunks():
        try:
            async with body_stream as stream:
                while chunk := await stream.read(256 * 1024):
                    yield chunk
        finally:
            await s3_client_ctx.__aexit__(None, None, None)

    return StreamingResponse(
        generate_chunks(),
        status_code=status_code,
        headers=headers,
    )


async def health_check(_request):
    return JSONResponse({"status": "ok"})


async def vnpay_ipn_endpoint(request):
    query_params = dict(request.query_params)
    res = await payment_usecase.process_vnpay_ipn(query_params)
    return JSONResponse(res)


routes = [
    Route("/health", endpoint=health_check, methods=["GET"]),
    Route("/healthz", endpoint=health_check, methods=["GET"]),
    Route("/api/v1/vnpay/ipn", endpoint=vnpay_ipn_endpoint, methods=["GET"]),
    Mount("/catalog.v1.CatalogService", app=cast(Any, catalog_app)),
    Mount("/learning.v1.LearningService", app=cast(Any, learning_app)),
    Mount("/identity.v1.IdentityService", app=cast(Any, identity_app)),
    Mount("/certificate.v1.CertificateService", app=cast(Any, certificate_app)),
    Mount("/assessment.v1.AssessmentService", app=cast(Any, assessment_app)),
    Mount("/forum.v1.ForumService", app=cast(Any, forum_app)),
    Mount("/partner.v1.PartnerService", app=cast(Any, partner_app)),
    Mount("/payment.v1.PaymentService", app=cast(Any, payment_app)),
    Mount("/notification.v1.NotificationService", app=cast(Any, notification_app)),
    Route(
        "/coursera-assets/{path:path}",
        endpoint=proxy_media,
        methods=["GET", "HEAD", "OPTIONS"],
    ),
]


middleware = [
    Middleware(AssetAuthMiddleware),
    Middleware(RequestIDMiddleware),
    Middleware(
        CORSMiddleware,
        allow_origins=sorted(settings.allowed_cors_origins),
        allow_origin_regex=VERCEL_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "connect-protocol-version",
            "content-type",
            "authorization",
            "cookie",
            "x-request-id",
        ],
        expose_headers=[
            "connect-error-info",
            "connect-protocol-version",
            "set-cookie",
            "x-request-id",
        ],
        max_age=86400,
    ),
]


app = Starlette(routes=routes, middleware=middleware, lifespan=lifespan)
StarletteInstrumentor().instrument_app(app)
