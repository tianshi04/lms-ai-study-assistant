import json
import logging
import logging.config
import sys
from typing import Any, Dict

from src.shared.config import settings
from src.shared.infrastructure.logging.context import get_request_id, get_user_id


class ContextAwareFormatter(logging.Formatter):
    """Console formatter adding request_id and user_id to log records."""

    def format(self, record: logging.LogRecord) -> str:
        req_id = get_request_id() or "-"
        user_id = get_user_id()
        ctx_str = f"req_id={req_id}"
        if user_id:
            ctx_str += f" user_id={user_id}"

        record.ctx = ctx_str
        return super().format(record)


class JSONContextAwareFormatter(logging.Formatter):
    """Dynamic JSON Formatter for Production & OTel Readiness."""

    RESERVED_ATTRS = {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "thread",
        "threadName",
        "ctx",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_request_id(),
            "user_id": get_user_id(),
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Dynamically capture extra attributes (including future OTel trace_id/span_id)
        for key, value in record.__dict__.items():
            if key not in self.RESERVED_ATTRS and not key.startswith("_"):
                log_obj[key] = value

        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging() -> None:
    """Configures centralized python logging using dictConfig."""
    is_dev = settings.ENV.lower() in ("development", "dev", "local")
    formatter_name = "console" if is_dev else "json"
    log_level = "DEBUG" if is_dev else "INFO"

    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "console": {
                "()": ContextAwareFormatter,
                "format": "%(asctime)s [%(levelname)s] [%(ctx)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": JSONContextAwareFormatter,
                "datefmt": "%Y-%m-%dT%H:%M:%S%z",
            },
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": formatter_name,
            },
        },
        "loggers": {
            "": {
                "handlers": ["default"],
                "level": log_level,
            },
            "alembic": {
                "handlers": ["default"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["default"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["default"],
                "level": log_level,
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(logging_config)
