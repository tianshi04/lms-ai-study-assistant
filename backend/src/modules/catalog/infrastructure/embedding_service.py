"""Course Content Embedding Service using FastEmbed (ONNX Runtime, CPU-optimized).

This service converts course titles, partner names, subjects, levels, descriptions,
and detailed syllabus lesson titles into 384-dimensional dense vectors for semantic similarity.
"""

import logging
from collections.abc import Sequence
from datetime import UTC, datetime

from fastembed import TextEmbedding
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.models import (
    CourseEmbeddingModel,
    CourseModel,
    WeekModuleModel,
)

logger = logging.getLogger(__name__)

# Canonical lightweight sentence transformer (384 dimensions, sub-20ms latency on CPU)
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

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

_embedding_model: TextEmbedding | None = None


def get_embedding_model() -> TextEmbedding:
    """Lazy-load the singleton FastEmbed model instance."""
    global _embedding_model
    if _embedding_model is None:
        logger.info(
            "[EMBEDDING] Loading FastEmbed model: %s...", DEFAULT_EMBEDDING_MODEL
        )
        _embedding_model = TextEmbedding(model_name=DEFAULT_EMBEDDING_MODEL)
    return _embedding_model


def build_course_payload(course: CourseModel) -> str:
    """Construct structured text representation of a course for semantic vectorization."""
    lines: list[str] = [
        f"Khóa học: {course.title}",
        f"Đối tác: {course.partner_name or 'Hệ thống'}",
        f"Lĩnh vực: {CATEGORY_LABEL_MAP.get(course.subject, course.subject or 'Đại cương')} | Cấp độ: {CATEGORY_LABEL_MAP.get(course.level, course.level or 'Mọi cấp độ')}",
        f"Mô tả: {course.description}",
    ]

    if course.week_modules:
        lines.append("Đề cương bài học chi tiết:")
        for week in course.week_modules:
            lesson_titles = [lesson.title for lesson in week.lessons]
            lessons_str = (
                ", ".join(lesson_titles) if lesson_titles else "Nội dung đang cập nhật"
            )
            lines.append(f"- Tuần {week.week_number} ({week.title}): {lessons_str}")

    return "\n".join(lines)


def generate_embedding(text: str) -> list[float]:
    """Generate 384-dimensional vector embedding for a single text."""
    model = get_embedding_model()
    vectors = list(model.embed([text]))
    return [float(x) for x in vectors[0]]


def generate_embeddings_batch(texts: Sequence[str]) -> list[list[float]]:
    """Generate vector embeddings for a batch of texts efficiently."""
    if not texts:
        return []
    model = get_embedding_model()
    vectors = list(model.embed(texts))
    return [[float(x) for x in v] for v in vectors]


async def sync_course_embedding(
    session: AsyncSession, course: CourseModel
) -> CourseEmbeddingModel:
    """Compute and upsert vector embedding for a published course."""
    # Ensure week modules and lessons are loaded
    if not course.week_modules:
        stmt = (
            select(CourseModel)
            .where(CourseModel.id == course.id)
            .options(
                selectinload(CourseModel.week_modules).selectinload(
                    WeekModuleModel.lessons
                )
            )
        )
        loaded = (await session.execute(stmt)).scalar_one_or_none()
        if loaded:
            course = loaded

    payload = build_course_payload(course)
    vector = generate_embedding(payload)
    now_iso = datetime.now(UTC).isoformat()

    embedding_record = CourseEmbeddingModel(
        course_id=course.id,
        embedding=vector,
        payload_text=payload,
        updated_at=now_iso,
    )
    await session.merge(embedding_record)
    return embedding_record


async def sync_all_course_embeddings(session: AsyncSession) -> int:
    """Batch compute and persist vector embeddings for all published courses."""
    stmt = (
        select(CourseModel)
        .where(CourseModel.status == CourseStatus.PUBLISHED)
        .options(
            selectinload(CourseModel.week_modules).selectinload(WeekModuleModel.lessons)
        )
    )
    courses = (await session.execute(stmt)).scalars().all()
    count = 0
    for course in courses:
        await sync_course_embedding(session, course)
        count += 1
    await session.commit()
    logger.info(
        "[EMBEDDING] Successfully synchronized embeddings for %d courses", count
    )
    return count
