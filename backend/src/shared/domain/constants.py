"""Shared domain constants and pure pagination/search helpers across bounded contexts."""

ADMIN_PAGE_SIZE_DEFAULT = 10
ADMIN_PAGE_SIZE_MAX = 50
ADMIN_SEARCH_MAX_LENGTH = 100
ADMIN_REQUIRED_MESSAGE = "Yêu cầu quyền Quản trị viên (Admin) để xem thống kê hệ thống."


def normalize_admin_paging(page: int, page_size: int) -> tuple[int, int]:
    """Clamp client-supplied 1-based paging arguments to safe bounds."""
    effective_page = max(page, 1)
    effective_page_size = (
        ADMIN_PAGE_SIZE_DEFAULT
        if page_size <= 0
        else min(page_size, ADMIN_PAGE_SIZE_MAX)
    )
    return effective_page, effective_page_size


def normalize_admin_search(search_query: str) -> str:
    """Trim a client-supplied search term and cap its length."""
    return search_query.strip()[:ADMIN_SEARCH_MAX_LENGTH]


def escape_like_pattern(term: str) -> str:
    """Build an ILIKE pattern that matches ``term`` literally (wildcards escaped)."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
