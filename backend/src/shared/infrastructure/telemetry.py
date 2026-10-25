import logging
import sys

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from src.shared.config import settings

logger = logging.getLogger(__name__)

_logger_provider: LoggerProvider | None = None
_tracer_provider: TracerProvider | None = None
_meter_provider: MeterProvider | None = None


def setup_telemetry(
    service_name: str = "lms-ai-study-assistant",
    otlp_endpoint: str | None = None,
) -> None:
    """Configures OpenTelemetry TracerProvider, MeterProvider, LoggerProvider, OTLP Exporters, and Auto-Instrumentations."""
    global _logger_provider, _tracer_provider, _meter_provider

    resource = Resource.create(
        {
            SERVICE_NAME: service_name,
            "service.environment": settings.ENV,
        }
    )

    endpoint = otlp_endpoint or settings.OTEL_EXPORTER_OTLP_ENDPOINT
    otlp_headers = settings.otlp_headers
    is_testing = "pytest" in sys.modules or settings.ENV.lower() in ("testing", "test")

    # 1. Configure OpenTelemetry Tracing
    tracer_provider = TracerProvider(resource=resource)
    _tracer_provider = tracer_provider
    if endpoint and not is_testing:
        try:
            otlp_trace_exporter = OTLPSpanExporter(
                endpoint=endpoint,
                insecure=True,
                headers=otlp_headers,
            )
            tracer_provider.add_span_processor(BatchSpanProcessor(otlp_trace_exporter))
            logger.info(
                "OpenTelemetry OTLP Trace Exporter configured for endpoint: %s",
                endpoint,
            )
        except Exception as err:  # noqa: BLE001
            logger.warning("Could not initialize OTLPSpanExporter: %s", err)

    trace.set_tracer_provider(tracer_provider)

    # 2. Configure OpenTelemetry Metrics
    if endpoint and not is_testing:
        try:
            otlp_metric_exporter = OTLPMetricExporter(
                endpoint=endpoint,
                insecure=True,
                headers=otlp_headers,
            )
            metric_reader = PeriodicExportingMetricReader(
                exporter=otlp_metric_exporter,
                export_interval_millis=15000,
            )
            meter_provider = MeterProvider(
                resource=resource,
                metric_readers=[metric_reader],
            )
            metrics.set_meter_provider(meter_provider)
            _meter_provider = meter_provider
            logger.info(
                "OpenTelemetry OTLP Metric Exporter configured for endpoint: %s",
                endpoint,
            )
        except Exception as err:  # noqa: BLE001
            logger.warning("Could not initialize OTLPMetricExporter: %s", err)
    else:
        meter_provider = MeterProvider(resource=resource)
        metrics.set_meter_provider(meter_provider)
        _meter_provider = meter_provider

    # 3. Configure OpenTelemetry Logging via OTLP Batch Exporter
    if endpoint and not is_testing:
        try:
            logger_provider = LoggerProvider(resource=resource)
            otlp_log_exporter = OTLPLogExporter(
                endpoint=endpoint,
                insecure=True,
                headers=otlp_headers,
            )
            logger_provider.add_log_record_processor(
                BatchLogRecordProcessor(otlp_log_exporter)
            )
            set_logger_provider(logger_provider)
            _logger_provider = logger_provider

            otel_log_handler = LoggingHandler(
                level=logging.NOTSET,
                logger_provider=logger_provider,
            )
            logging.getLogger().addHandler(otel_log_handler)
            logger.info(
                "OpenTelemetry OTLP Log Exporter configured for endpoint: %s",
                endpoint,
            )
        except Exception as err:  # noqa: BLE001
            logger.warning("Could not initialize OTLPLogExporter: %s", err)
    else:
        logger_provider = LoggerProvider(resource=resource)
        set_logger_provider(logger_provider)
        _logger_provider = logger_provider

    # 4. Instrument Python Logging without overriding custom formatters
    LoggingInstrumentor().instrument(set_logging_format=False)

    # 5. Instrument SQLAlchemy Database Queries
    try:
        SQLAlchemyInstrumentor().instrument()
        logger.info("SQLAlchemy OpenTelemetry Auto-Instrumentation enabled.")
    except Exception as err:  # noqa: BLE001
        logger.warning("SQLAlchemy Auto-Instrumentation skipped or failed: %s", err)


def shutdown_telemetry() -> None:
    """Flushes and shuts down all OpenTelemetry providers cleanly."""
    global _logger_provider, _tracer_provider, _meter_provider
    if _logger_provider:
        try:
            _logger_provider.shutdown()
        except Exception as err:  # noqa: BLE001
            logger.warning("Error shutting down LoggerProvider: %s", err)
        _logger_provider = None
    if _tracer_provider:
        try:
            _tracer_provider.shutdown()
        except Exception as err:  # noqa: BLE001
            logger.warning("Error shutting down TracerProvider: %s", err)
        _tracer_provider = None
    if _meter_provider:
        try:
            _meter_provider.shutdown()
        except Exception as err:  # noqa: BLE001
            logger.warning("Error shutting down MeterProvider: %s", err)
        _meter_provider = None
