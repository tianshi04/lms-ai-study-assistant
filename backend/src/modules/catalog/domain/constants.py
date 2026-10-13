"""Domain constants for the Catalog bounded context."""

MIN_RATING_STARS: int = 1
MAX_RATING_STARS: int = 5
MAX_REVIEW_COMMENT_LENGTH: int = 2000
MIN_PROGRESS_PERCENT_FOR_REVIEW: float = 50.0
VERIFIED_COMPLETER_PROGRESS_PERCENT: float = 100.0

# Public S3 Storage Asset Folders & Prefixes (bypass JWT auth)
PUBLIC_ASSET_FOLDERS: set[str] = {"thumbnails", "banners", "avatars"}
PUBLIC_ASSET_PREFIXES: tuple[str, ...] = ("public/",)
