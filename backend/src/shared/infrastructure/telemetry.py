import logging
import sys
from typing import Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from src.shared.config import settings

logger = logging.getLogger(__name__)


def setup_telemetry(
    service_name: str = "lms-ai-study-assistant",
    otlp_endpoint: Optional[str] = None,
) -> None:
    """Configures OpenTelemetry TracerProvider, OTLP Exporter, and Auto-Instrumentations."""
    resource = Resource.create(
        {
            SERVICE_NAME: service_name,
            "service.environment": settings.ENV,
        }
    )
    provider = TracerProvider(resource=resource)

    endpoint = otlp_endpoint or settings.OTEL_EXPORTER_OTLP_ENDPOINT
    is_testing = "pytest" in sys.modules or settings.ENV.lower() in ("testing", "test")

    if endpoint and not is_testing:
        try:
            otlp_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info(
                "OpenTelemetry OTLP Exporter configured for endpoint: %s", endpoint
            )
        except Exception as err:
            logger.warning("Could not initialize OTLPSpanExporter: %s", err)

    trace.set_tracer_provider(provider)

    # 1. Instrument Python Logging without overriding custom formatters
    LoggingInstrumentor().instrument(set_logging_format=False)

    # 2. Instrument SQLAlchemy Database Queries
    try:
        SQLAlchemyInstrumentor().instrument()
        logger.info("SQLAlchemy OpenTelemetry Auto-Instrumentation enabled.")
    except Exception as err:
        logger.warning("SQLAlchemy Auto-Instrumentation skipped or failed: %s", err)
