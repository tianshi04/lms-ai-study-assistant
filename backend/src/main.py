import asyncio
from contextlib import asynccontextmanager

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount

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
from src.shared.infrastructure.interceptors import AuthInterceptor


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
    """Lifespan context manager for database migrations and initial seeding."""
    try:
        await run_auto_migrations()
        from src.seed import seed_database

        await seed_database(auto_mode=True)
    except Exception as e:
        print(f"[STARTUP] Warning during startup: {e}")
    yield


# 1. Dependency Injection (Bootstrapping Use Cases & Handlers)
auth_interceptor = AuthInterceptor()

catalog_usecase = CatalogUseCase()
catalog_handler = CatalogHandler(use_case=catalog_usecase)
catalog_app = CatalogServiceASGIApplication(catalog_handler, interceptors=[auth_interceptor])

learning_usecase = LearningUseCase()
learning_handler = LearningHandler(use_case=learning_usecase)
learning_app = LearningServiceASGIApplication(learning_handler, interceptors=[auth_interceptor])

identity_usecase = IdentityUseCase()
identity_handler = IdentityHandler(use_case=identity_usecase)
identity_app = IdentityServiceASGIApplication(identity_handler, interceptors=[auth_interceptor])

certificate_usecase = CertificateUseCase()
certificate_handler = CertificateHandler(use_case=certificate_usecase)
certificate_app = CertificateServiceASGIApplication(certificate_handler, interceptors=[auth_interceptor])

assessment_usecase = AssessmentUseCase()
assessment_handler = AssessmentHandler(use_case=assessment_usecase)
assessment_app = AssessmentServiceASGIApplication(assessment_handler, interceptors=[auth_interceptor])

forum_usecase = ForumUseCase()
forum_handler = ForumHandler(use_case=forum_usecase)
forum_app = ForumServiceASGIApplication(forum_handler, interceptors=[auth_interceptor])

# 2. Register Routes & Middleware using Starlette
routes = [
    Mount("/catalog.v1.CatalogService", app=catalog_app),
    Mount("/learning.v1.LearningService", app=learning_app),
    Mount("/identity.v1.IdentityService", app=identity_app),
    Mount("/certificate.v1.CertificateService", app=certificate_app),
    Mount("/assessment.v1.AssessmentService", app=assessment_app),
    Mount("/forum.v1.ForumService", app=forum_app),
]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["connect-protocol-version", "content-type", "authorization"],
        expose_headers=["connect-error-info", "connect-protocol-version"],
        max_age=86400,
    )
]

app = Starlette(routes=routes, middleware=middleware, lifespan=lifespan)

