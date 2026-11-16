"""Domain constants for the Forum bounded context."""

DEFAULT_FORUM_AUTHOR_ROLE: str = "Learner"

MIN_FORUM_TITLE_LEN: int = 5
MAX_FORUM_TITLE_LEN: int = 200
MIN_FORUM_CONTENT_LEN: int = 10
MAX_FORUM_CONTENT_LEN: int = 10000

MAX_FORUM_SEARCH_QUERY_LEN: int = 200
MAX_FORUM_SEARCH_TOKENS: int = 8

FORUM_FILTER_SOLVED: str = "SOLVED"
FORUM_FILTER_UNSOLVED: str = "UNSOLVED"

STAFF_FORUM_ROLES: frozenset[str] = frozenset(
    {
        "INSTRUCTOR",
        "TEACHER",
        "TA",
        "STAFF",
        "ADMIN",
        "SUPER_ADMIN",
        "ORG_ADMIN",
        "USER_ROLE_INSTRUCTOR",
        "USER_ROLE_TA",
        "USER_ROLE_ADMIN",
        "USER_ROLE_SUPER_ADMIN",
        "USER_ROLE_ORG_ADMIN",
    }
)
