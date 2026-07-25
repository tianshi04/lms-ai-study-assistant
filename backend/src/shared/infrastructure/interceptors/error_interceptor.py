import logging
from typing import Any, Awaitable, Callable

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.interceptor import UnaryInterceptor

logger = logging.getLogger(__name__)


class ErrorInterceptor(UnaryInterceptor):
    """ConnectRPC interceptor that maps unhandled domain exceptions into standard ConnectError codes."""

    async def intercept_unary(
        self,
        call_next: Callable[[Any, Any], Awaitable[Any]],
        request: Any,
        ctx: Any,
    ) -> Any:
        try:
            return await call_next(request, ctx)
        except ConnectError:
            raise
        except ValueError as err:
            raise ConnectError(Code.INVALID_ARGUMENT, str(err)) from err
        except PermissionError as err:
            raise ConnectError(Code.PERMISSION_DENIED, str(err)) from err
        except (KeyError, FileNotFoundError) as err:
            raise ConnectError(Code.NOT_FOUND, str(err)) from err
        except Exception as err:
            logger.exception("Unhandled server error in ConnectRPC handler: %s", err)
            raise ConnectError(Code.INTERNAL, "Lỗi hệ thống nội bộ") from err
