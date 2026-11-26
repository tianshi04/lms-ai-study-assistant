"""Domain constants for the Catalog bounded context."""

DEFAULT_ESSAY_MAX_ATTEMPTS: int = 3
MIN_RATING_STARS: int = 1
MAX_RATING_STARS: int = 5
MAX_REVIEW_COMMENT_LENGTH: int = 2000
MIN_PROGRESS_PERCENT_FOR_REVIEW: float = 50.0
VERIFIED_COMPLETER_PROGRESS_PERCENT: float = 100.0
ERR_MSG_SELF_UPVOTE: str = (
    "Bạn không thể tự đánh giá nhận xét của chính mình là hữu ích."
)

# Course Recommendation defaults
DEFAULT_RECOMMENDED_COURSES_COUNT: int = 6
MIN_RECOMMENDATION_SCORE_THRESHOLD: float = 0.55
MAX_FOUNDATIONAL_COURSES_COUNT: int = 10

HYBRID_WEIGHT_VECTOR: float = 0.55
HYBRID_WEIGHT_AUTHOR: float = 0.30
HYBRID_WEIGHT_RATING: float = 0.15
COLD_START_DEFAULT_RATING_SCORE: float = 0.8

FALLBACK_SIMILARITY_SAME_SUBJECT: float = 0.5
FALLBACK_SIMILARITY_DIFF_SUBJECT: float = 0.2


# Human-readable labels for category IDs to enrich vector semantics
CATEGORY_LABEL_MAP: dict[str, str] = {
    "cat-subj-cs": "Khoa học Máy tính",
    "cat-subj-ds": "Khoa học Dữ liệu",
    "cat-subj-biz": "Kinh doanh & Kinh tế",
    "cat-subj-ai": "Trí tuệ Nhân tạo & Machine Learning",
    "cat-subj-it": "Công nghệ Thông tin",
    "cat-lvl-beg": "Cơ bản / Sơ cấp",
    "cat-lvl-int": "Trung cấp",
    "cat-lvl-adv": "Nâng cao",
}

# Specialization Bundle defaults
DEFAULT_SPECIALIZATION_DISCOUNT_PERCENT: int = 25

# Public S3 Storage Asset Folders & Prefixes (bypass JWT auth)
PUBLIC_ASSET_FOLDERS: set[str] = {"thumbnails", "banners", "avatars"}
PUBLIC_ASSET_PREFIXES: tuple[str, ...] = ("public/",)

MIN_SEARCH_QUERY_LENGTH: int = 2
MAX_SEARCH_QUERY_LENGTH: int = 200
SEARCH_HISTORY_THROTTLE_SECONDS: int = 5
# Instructor Activity Timeline & Heatmap constants
DEFAULT_TIMELINE_DATE_RANGE: str = "7d"
VALID_TIMELINE_DATE_RANGES: set[str] = {
    "today",
    "7d",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
    "custom",
}
VALID_TIMELINE_LEARNER_FILTERS: set[str] = {
    "all",
    "paid",
    "audit",
    "in_progress",
    "completed",
    "paid_in_progress",
    "paid_completed",
}
HEATMAP_DAYS: list[str] = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
HEATMAP_TIME_SLOTS: list[str] = [
    "Sáng (06h-12h)",
    "Chiều (12h-18h)",
    "Tối (18h-22h)",
    "Đêm (22h-02h)",
    "Rạng sáng (02h-06h)",
]

# Admin Catalog Moderation & Quality Analytics
ADMIN_LOW_RATING_MAX_STARS: int = 2
ADMIN_LOW_REVIEW_ALERT_LIMIT: int = 20
RATING_ROUND_DECIMALS: int = 2

# Instructor Dashboard Analytics & Student Activity Constants
STUDENT_DAILY_ACTIVITY_DAYS_WINDOW: int = 30
AT_RISK_INACTIVE_DAYS_THRESHOLD: int = 7
SECONDS_PER_HOUR: float = 3600.0
QUIZ_PERCENT_TO_SCORE_DIVISOR: float = 10.0
MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK: int = 3
FAST_PACE_MIN_ESTIMATED_RATIO: float = 0.25
DEFAULT_ESTIMATED_ITEM_MINUTES: int = 10
SECONDS_PER_MINUTE: int = 60
DEFAULT_ASSESSMENT_MAX_SCORE_QUIZ: float = 10.0
DEFAULT_ASSESSMENT_MAX_SCORE_HUNDRED: float = 100.0
