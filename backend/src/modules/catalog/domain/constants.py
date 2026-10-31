"""Domain constants for the Catalog bounded context."""

MIN_RATING_STARS: int = 1
MAX_RATING_STARS: int = 5
MAX_REVIEW_COMMENT_LENGTH: int = 2000
MIN_PROGRESS_PERCENT_FOR_REVIEW: float = 50.0
VERIFIED_COMPLETER_PROGRESS_PERCENT: float = 100.0

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
