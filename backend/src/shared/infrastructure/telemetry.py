import logging
import sys
from typing import Optional

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from src.shared.config import settings

logger = logging.getLogger(__name__)


def setup_telemetry(
    service_name: str = "lms-ai-study-assistant",
    otlp_endpoint: Optional[str] = None,
) -> None:
    """Configures OpenTelemetry TracerProvider, MeterProvider, OTLP Exporters, and Auto-Instrumentations."""
    resource = Resource.create(
        {
            SERVICE_NAME: service_name,
            "service.environment": settings.ENV,
        }
    )

    # 1. Configure OpenTelemetry Tracing
    tracer_provider = TracerProvider(resource=resource)
    endpoint = otlp_endpoint or settings.OTEL_EXPORTER_OTLP_ENDPOINT
    is_testing = "pytest" in sys.modules or settings.ENV.lower() in ("testing", "test")

    if endpoint and not is_testing:
        try:
            otlp_trace_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
            tracer_provider.add_span_processor(BatchSpanProcessor(otlp_trace_exporter))
            logger.info(
                "OpenTelemetry OTLP Trace Exporter configured for endpoint: %s",
                endpoint,
            )
        except Exception as err:
            logger.warning("Could not initialize OTLPSpanExporter: %s", err)

    trace.set_tracer_provider(tracer_provider)

    # 2. Configure OpenTelemetry Metrics
    if endpoint and not is_testing:
        try:
            otlp_metric_exporter = OTLPMetricExporter(endpoint=endpoint, insecure=True)
            metric_reader = PeriodicExportingMetricReader(
                exporter=otlp_metric_exporter,
                export_interval_millis=15000,  # Export metrics every 15s
            )
            meter_provider = MeterProvider(
                resource=resource,
                metric_readers=[metric_reader],
            )
            metrics.set_meter_provider(meter_provider)
            logger.info(
                "OpenTelemetry OTLP Metric Exporter configured for endpoint: %s",
                endpoint,
            )
        except Exception as err:
            logger.warning("Could not initialize OTLPMetricExporter: %s", err)
    else:
        meter_provider = MeterProvider(resource=resource)
        metrics.set_meter_provider(meter_provider)

    # 3. Instrument Python Logging without overriding custom formatters
    LoggingInstrumentor().instrument(set_logging_format=False)

    # 4. Instrument SQLAlchemy Database Queries
    try:
        SQLAlchemyInstrumentor().instrument()
        logger.info("SQLAlchemy OpenTelemetry Auto-Instrumentation enabled.")
    except Exception as err:
        logger.warning("SQLAlchemy Auto-Instrumentation skipped or failed: %s", err)
