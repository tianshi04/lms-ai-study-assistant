"""Starlette middleware xác thực JWT và kiểm tra quyền truy cập cho HTTP route /coursera-assets/.

- File public (prefix public/ hoặc folder public như thumbnails, banners, avatars) -> cho qua không cần auth.
- File private/ hoặc file legacy -> yêu cầu JWT hợp lệ và kiểm tra quyền truy cập.
- Trả về CORS headers đầy đủ cho response lỗi (401/403/400) để browser HTML5 video player hỗ trợ crossOrigin="use-credentials" với HttpOnly cookie.
"""

import logging
import posixpath
from http.cookies import SimpleCookie

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from src.modules.catalog.domain.constants import (
    PUBLIC_ASSET_FOLDERS,
    PUBLIC_ASSET_PREFIXES,
)
from src.shared.auth import decode_token
from src.shared.config import settings

logger = logging.getLogger(__name__)

# Route áp dụng middleware này
PROTECTED_ROUTE_PREFIX = "/coursera-assets/"


class AssetAuthMiddleware:
    """Middleware kiểm tra JWT token và authorization cho route /coursera-assets/ trước khi vào proxy_media()."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")

        # Chỉ áp dụng cho route /coursera-assets/
        if not path.startswith(PROTECTED_ROUTE_PREFIX):
            await self.app(scope, receive, send)
            return

        # Lấy phần path sau "/coursera-assets/" và chuẩn hóa
        raw_asset_path = path[len(PROTECTED_ROUTE_PREFIX) :]
        asset_path = posixpath.normpath(raw_asset_path).lstrip("/")
        request = Request(scope, receive, send)

        # Nếu phát hiện path traversal độc hại ra khỏi root
        if ".." in raw_asset_path:
            response = self._make_error_response(request, "Invalid path", 400)
            await response(scope, receive, send)
            return

        # HTTP OPTIONS preflight requests -> cho qua để proxy_media() xử lý CORS headers
        if request.method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # File public (prefix "public/" hoặc thuộc folder thumbnails, banners, avatars) -> cho qua không cần auth
        first_segment = asset_path.split("/")[0] if asset_path else ""
        if (
            any(asset_path.startswith(prefix) for prefix in PUBLIC_ASSET_PREFIXES)
            or first_segment in PUBLIC_ASSET_FOLDERS
        ):
            await self.app(scope, receive, send)
            return

        # File private hoặc file legacy -> yêu cầu JWT
        token = self._extract_token(request)

        if not token:
            response = self._make_error_response(
                request, "Yêu cầu đăng nhập để truy cập tài nguyên này", 401
            )
            await response(scope, receive, send)
            return

        payload = decode_token(token)
        if not payload or payload.get("type") != "access" or not payload.get("sub"):
            response = self._make_error_response(
                request, "Token không hợp lệ hoặc đã hết hạn", 401
            )
            await response(scope, receive, send)
            return

        # Token hợp lệ -> cho qua
        await self.app(scope, receive, send)

    @staticmethod
    def _make_error_response(
        request: Request, detail: str, status_code: int
    ) -> JSONResponse:
        """Tạo error response chứa đầy đủ CORS headers để browser HTML5 video player xử lý HttpOnly cookie."""
        origin = request.headers.get("origin", "")
        headers = {}
        if origin and origin in settings.CORS_ORIGINS:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(
            {"detail": detail}, status_code=status_code, headers=headers
        )

    @staticmethod
    def _extract_token(request: Request) -> str | None:
        """Lấy JWT token từ Authorization header hoặc cookie access_token."""
        # 1. Thử Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header:
            raw = auth_header.strip()
            if raw.lower().startswith("bearer "):
                return raw[7:].strip()
            return raw

        # 2. Thử cookie
        cookie_header = request.headers.get("cookie", "")
        if cookie_header:
            try:
                cookie = SimpleCookie()
                cookie.load(cookie_header)
                if "access_token" in cookie:
                    return cookie["access_token"].value
            except Exception:  # noqa: BLE001, S110
                pass

        return None
