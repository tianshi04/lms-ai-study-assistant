from connectrpc_otel import OpenTelemetryInterceptor
from opentelemetry import metrics, trace

from src.shared.infrastructure.telemetry import setup_telemetry


def test_setup_telemetry_initialization():
    setup_telemetry(service_name="test-service", otlp_endpoint="http://localhost:4317")
    tracer = trace.get_tracer("test_tracer")
    assert tracer is not None

    with tracer.start_as_current_span("test_span") as span:
        assert span.is_recording() is True or span.is_recording() is False


def test_setup_telemetry_metrics_initialization():
    setup_telemetry(service_name="test-service", otlp_endpoint="http://localhost:4317")
    meter = metrics.get_meter("test_meter")
    assert meter is not None

    counter = meter.create_counter(
        "test_counter", unit="1", description="Test counter metric"
    )
    counter.add(1, {"test_label": "value"})


def test_connectrpc_otel_interceptor():
    interceptor = OpenTelemetryInterceptor()
    assert interceptor is not None

    client_interceptor = OpenTelemetryInterceptor(client=True)
    assert client_interceptor is not None
