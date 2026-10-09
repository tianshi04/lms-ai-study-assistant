"""Domain constants for the Assessment bounded context."""

DEFAULT_PASSING_THRESHOLD_PERCENT: float = 80.0
DEFAULT_QUIZ_TIME_LIMIT_MINUTES: int = 15
DEFAULT_QUIZ_EASY_COUNT: int = 4
DEFAULT_QUIZ_MEDIUM_COUNT: int = 4
DEFAULT_QUIZ_HARD_COUNT: int = 2
DEFAULT_FALLBACK_QUESTION_LIMIT: int = 20

EASY_DIFFICULTY_ALIASES: tuple[str, ...] = ("EASY", "EASY_QUESTION", "1")
MEDIUM_DIFFICULTY_ALIASES: tuple[str, ...] = ("MEDIUM", "MEDIUM_QUESTION", "2")
HARD_DIFFICULTY_ALIASES: tuple[str, ...] = ("HARD", "HARD_QUESTION", "3")

MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN: int = 3
QUIZ_COOLDOWN_HOURS: int = 8
UNLIMITED_ATTEMPTS_SENTINEL: int = 999

PRACTICE_QUIZ_ITEM_TYPES: tuple[str, ...] = (
    "PRACTICE_QUIZ",
    "ITEM_TYPE_PRACTICE_QUIZ",
    "3",
)
GRADED_QUIZ_ITEM_TYPES: tuple[str, ...] = ("GRADED_QUIZ", "ITEM_TYPE_GRADED_QUIZ", "4")


def is_practice_quiz_item(item_type_str: str) -> bool:
    if not item_type_str:
        return False
    val = item_type_str.upper()
    return "PRACTICE" in val or val in PRACTICE_QUIZ_ITEM_TYPES


def is_graded_quiz_item(item_type_str: str) -> bool:
    if not item_type_str:
        return False
    val = item_type_str.upper()
    if is_practice_quiz_item(item_type_str):
        return False
    return "GRADED" in val or val in GRADED_QUIZ_ITEM_TYPES


REQUIRED_PEER_REVIEWS_COUNT: int = 3
OUTLIER_SCORE_DELTA_THRESHOLD: float = 30.0
PEER_REVIEW_COLD_START_HOURS: int = 48

DEFAULT_SANDBOX_TIMEOUT_SECONDS: float = 5.0
MAX_SANDBOX_TIMEOUT_SECONDS: float = 30.0
DEFAULT_SANDBOX_MEMORY_LIMIT_MB: int = 512
