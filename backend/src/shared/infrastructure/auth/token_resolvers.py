from abc import ABC, abstractmethod
from http.cookies import SimpleCookie
from typing import Optional


class TokenResolver(ABC):
    """Base class for credential extraction strategies."""

    @abstractmethod
    def resolve(self, metadata: dict) -> Optional[str]:
        """Extract raw token string from request metadata. Returns None if not found."""
        ...


class BearerTokenResolver(TokenResolver):
    """Extracts JWT from Authorization: Bearer <token> header."""

    def resolve(self, metadata: dict) -> Optional[str]:
        auth_header = ""
        if hasattr(metadata, "get"):
            auth_header = metadata.get("authorization", "") or metadata.get(
                "Authorization", ""
            )
        if not auth_header:
            return None
        raw_header = str(auth_header).strip()
        if raw_header.lower().startswith("bearer "):
            return raw_header[7:].strip()
        return raw_header


class CookieTokenResolver(TokenResolver):
    """Extracts JWT from access_token cookie."""

    def resolve(self, metadata: dict) -> Optional[str]:
        cookie_header = ""
        if hasattr(metadata, "get"):
            cookie_header = metadata.get("cookie", "") or metadata.get("Cookie", "")
        if not cookie_header:
            return None

        try:
            cookie = SimpleCookie()
            cookie.load(str(cookie_header))
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
