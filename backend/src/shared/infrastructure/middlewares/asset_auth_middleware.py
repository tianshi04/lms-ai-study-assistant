"""Starlette middleware xác thực JWT cho HTTP route /coursera-assets/.

File public/ → cho qua không cần auth.
File private/ hoặc file cũ (không có prefix) → yêu cầu JWT hợp lệ.
"""

import logging
from http.cookies import SimpleCookie

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from src.shared.auth import decode_token

logger = logging.getLogger(__name__)

# Các prefix KHÔNG cần xác thực
PUBLIC_PREFIXES = ("public/",)

# Các route cần áp dụng middleware này
PROTECTED_ROUTE_PREFIX = "/coursera-assets/"


class AssetAuthMiddleware:
    """Middleware kiểm tra JWT token cho route /coursera-assets/ trước khi vào proxy_media().

    - Path bắt đầu bằng public/ → cho qua (thumbnail, banner, avatar)
    - Path bắt đầu bằng private/ hoặc không có prefix → yêu cầu JWT
    """

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

        import posixpath

        # Lấy phần path sau "/coursera-assets/" và chuẩn hóa
        raw_asset_path = path[len(PROTECTED_ROUTE_PREFIX) :]
        asset_path = posixpath.normpath(raw_asset_path).lstrip("/")

        # Nếu phát hiện path traversal độc hại ra khỏi root
        if ".." in raw_asset_path:
            response = JSONResponse(
                {"detail": "Invalid path"},
                status_code=400,
            )
            await response(scope, receive, send)
            return

        # File public → cho qua, không cần auth
        if any(asset_path.startswith(prefix) for prefix in PUBLIC_PREFIXES):
            await self.app(scope, receive, send)
            return

        # File private hoặc file cũ (không có prefix) → yêu cầu JWT
        request = Request(scope, receive, send)

        token = self._extract_token(request)

        if not token:
            response = JSONResponse(
                {"detail": "Yêu cầu đăng nhập để truy cập tài nguyên này"},
                status_code=401,
            )
            await response(scope, receive, send)
            return

        payload = decode_token(token)
        if not payload or payload.get("type") != "access" or not payload.get("sub"):
            response = JSONResponse(
                {"detail": "Token không hợp lệ hoặc đã hết hạn"},
                status_code=401,
            )
            await response(scope, receive, send)
            return

        # Token hợp lệ → cho qua
        await self.app(scope, receive, send)

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
            except Exception:
                pass

        return None
