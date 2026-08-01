from abc import ABC, abstractmethod
from http.cookies import SimpleCookie
from typing import Any, Optional

from starlette.datastructures import Headers


class TokenResolver(ABC):
    """Base class for credential extraction strategies."""

    @abstractmethod
    def resolve(self, metadata: dict) -> Optional[str]:
        """Extract raw token string from request metadata. Returns None if not found."""
        ...


def extract_header(metadata: Any, name: str) -> str:
    """Extract a header value case-insensitively using Starlette's Headers wrapper."""
    if not metadata:
        return ""
    if isinstance(metadata, Headers):
        return metadata.get(name, "")
    if hasattr(metadata, "items"):
        return Headers(headers={str(k): str(v) for k, v in metadata.items()}).get(
            name, ""
        )
    if isinstance(metadata, (list, tuple)):
        raw_tuples = []
        for item in metadata:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                k = (
                    item[0].decode("utf-8")
                    if isinstance(item[0], bytes)
                    else str(item[0])
                )
                v = (
                    item[1].decode("utf-8")
                    if isinstance(item[1], bytes)
                    else str(item[1])
                )
                raw_tuples.append((k.encode("latin-1"), v.encode("latin-1")))
        return Headers(raw=raw_tuples).get(name, "")
    if hasattr(metadata, "get"):
        val = metadata.get(name) or metadata.get(name.lower())
        if val:
            return str(val)
    return ""


class BearerTokenResolver(TokenResolver):
    """Extracts JWT from Authorization: Bearer <token> header."""

    def resolve(self, metadata: Any) -> Optional[str]:
        auth_header = extract_header(metadata, "authorization")
        if not auth_header:
            return None
        raw_header = auth_header.strip()
        if raw_header.lower().startswith("bearer "):
            return raw_header[7:].strip()
        return raw_header


class CookieTokenResolver(TokenResolver):
    """Extracts JWT from access_token cookie."""

    def resolve(self, metadata: Any) -> Optional[str]:
        cookie_header = extract_header(metadata, "cookie")
        if not cookie_header:
            return None

        try:
            cookie = SimpleCookie()
            cookie.load(cookie_header)
            if "access_token" in cookie:
                return cookie["access_token"].value
        except Exception:
            pass
        return None


class TokenResolverChain:
    """Tries resolvers in priority order, returning the first non-None token found."""

    def __init__(self, resolvers: list[TokenResolver]) -> None:
        self._resolvers = resolvers

    def resolve(self, metadata: dict) -> Optional[str]:
        for resolver in self._resolvers:
            token = resolver.resolve(metadata)
            if token:
                return token
        return None
