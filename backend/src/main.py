import asyncio
from contextlib import asynccontextmanager

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route

from src.gen.assessment.v1.assessment_connect import AssessmentServiceASGIApplication
from src.gen.catalog.v1.catalog_connect import CatalogServiceASGIApplication
from src.gen.certificate.v1.certificate_connect import CertificateServiceASGIApplication
from src.gen.forum.v1.forum_connect import ForumServiceASGIApplication
from src.gen.identity.v1.identity_connect import IdentityServiceASGIApplication
from src.gen.learning.v1.learning_connect import LearningServiceASGIApplication
from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application.certificate_usecase import CertificateUseCase
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.forum.application.forum_usecase import ForumUseCase
from src.modules.forum.presentation.forum_handler import ForumHandler
from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.modules.learning.presentation.learning_handler import LearningHandler
from src.shared.config import settings
from src.shared.infrastructure.interceptors import AuthInterceptor, ErrorInterceptor


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


@asynccontextmanager
async def lifespan(app: Starlette):
    """Lifespan context manager for AuthPolicy pre-initialization, database migrations and initial seeding."""
    try:
        from src.shared.auth_policy import AuthPolicyRegistry

        AuthPolicyRegistry._initialize()
        print("[STARTUP] Pre-initialized AuthPolicyRegistry successfully.")

        await run_auto_migrations()
        from src.seed import seed_database

        await seed_database(auto_mode=True)
    except Exception as e:
        print(f"[STARTUP] Warning during startup: {e}")
    yield


# 1. Dependency Injection (Bootstrapping Use Cases & Handlers)
error_interceptor = ErrorInterceptor()
auth_interceptor = AuthInterceptor()
interceptors = [error_interceptor, auth_interceptor]

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


from starlette.responses import StreamingResponse, Response

async def proxy_media(request):
    path = request.path_params["path"]
    from src.shared.infrastructure.s3_storage import get_s3_storage_service
    s3 = get_s3_storage_service()
    
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
                "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
            }
        )
        
    if request.method == "PUT":
        try:
            body = await request.body()
            async with s3._get_client() as s3_client:
                await s3_client.put_object(
                    Bucket=s3.bucket_name,
                    Key=path,
                    Body=body,
                    ContentType=request.headers.get("content-type", "application/octet-stream")
                )
            return Response(
                status_code=200,
                content="Upload success",
                headers={"Access-Control-Allow-Origin": "*"}
            )
        except Exception as e:
            return Response(status_code=500, content=str(e), headers={"Access-Control-Allow-Origin": "*"})
            
    s3_client_ctx = s3._get_client()
    s3_client = await s3_client_ctx.__aenter__()
    
    params = {
        "Bucket": s3.bucket_name,
        "Key": path
    }
    range_header = request.headers.get("range")
    if range_header:
        params["Range"] = range_header
        
    try:
        s3_resp = await s3_client.get_object(**params)
    except Exception as e:
        await s3_client_ctx.__aexit__(None, None, None)
        return Response(status_code=404, content=str(e))
        
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
    headers["Access-Control-Allow-Origin"] = "*"
    
    async def generate():
        try:
            body = s3_resp["Body"]
            while True:
                chunk = await body.read(256 * 1024)  # 256KB chunks
                if not chunk:
                    break
                yield chunk
        finally:
            await s3_client_ctx.__aexit__(None, None, None)
            
    return StreamingResponse(generate(), status_code=status_code, headers=headers)


# 2. Register Routes & Middleware using Starlette
routes = [
    Mount("/catalog.v1.CatalogService", app=catalog_app),
    Mount("/learning.v1.LearningService", app=learning_app),
    Mount("/identity.v1.IdentityService", app=identity_app),
    Mount("/certificate.v1.CertificateService", app=certificate_app),
    Mount("/assessment.v1.AssessmentService", app=assessment_app),
    Mount("/forum.v1.ForumService", app=forum_app),
    Route("/coursera-assets/{path:path}", endpoint=proxy_media, methods=["GET", "HEAD", "PUT", "OPTIONS"]),
]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["connect-protocol-version", "content-type", "authorization", "range"],
        expose_headers=["connect-error-info", "connect-protocol-version", "accept-ranges", "content-range", "content-length"],
        max_age=86400,
    )
]

app = Starlette(routes=routes, middleware=middleware, lifespan=lifespan)
