from contextvars import ContextVar, Token

_request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
_user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


def set_request_id(request_id: str) -> Token[str | None]:
    """Set the current request_id and return a reset token."""
    return _request_id_var.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    """Reset the request_id back to its previous state using token."""
    _request_id_var.reset(token)


def get_request_id() -> str | None:
    """Retrieve the current request_id."""
    return _request_id_var.get()


def set_user_id(user_id: str) -> Token[str | None]:
    """Set the current user_id and return a reset token."""
    return _user_id_var.set(user_id)


def reset_user_id(token: Token[str | None]) -> None:
    """Reset the user_id back to its previous state using token."""
    _user_id_var.reset(token)


def get_user_id() -> str | None:
    """Retrieve the current user_id."""
    return _user_id_var.get()
