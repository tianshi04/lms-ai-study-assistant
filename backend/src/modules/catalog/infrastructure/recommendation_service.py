"""Hybrid Recommendation Service for Course Detail Page.

Formula:
  Score(A, B) = 0.55 * VectorSimilarity(A, B) + 0.30 * SameAuthor(A, B) + 0.15 * NormalizedRating(B)

Sections:
  1. Foundational Course: Identifies pedagogical prerequisite (Specialization sequence or high vector similarity foundational match).
  2. Recommended Courses: Curates up to 6 highly-relevant distinct courses.
"""

import logging
from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.domain.constants import (
    BEGINNER_LEVEL_ALIASES,
    COLD_START_DEFAULT_RATING_SCORE,
    DEFAULT_RECOMMENDED_COURSES_COUNT,
    FALLBACK_SIMILARITY_DIFF_SUBJECT,
    FALLBACK_SIMILARITY_SAME_SUBJECT,
    FOUNDATIONAL_PEDAGOGICAL_KEYWORDS,
    HIGH_SIMILARITY_CROSS_DOMAIN_THRESHOLD,
    HYBRID_WEIGHT_AUTHOR,
    HYBRID_WEIGHT_RATING,
    HYBRID_WEIGHT_VECTOR,
    MIN_FOUNDATIONAL_SIMILARITY_THRESHOLD,
    MIN_RECOMMENDATION_SCORE_THRESHOLD,
)
from src.modules.catalog.infrastructure.models import (
    CourseEmbeddingModel,
    CourseModel,
    SpecializationModel,
)

logger = logging.getLogger(__name__)


@dataclass
class RecommendedCourseDto:
    course: CourseModel
    score: float
    badge_label: str


def raw_cosine_similarity(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Calculate raw cosine similarity between two normalized or arbitrary vectors with epsilon guard."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = sum(a * a for a in v1) ** 0.5
    norm_b = sum(b * b for b in v2) ** 0.5
    denominator = norm_a * norm_b
    if denominator <= 1e-12:
        return 0.0
    val = dot / denominator
    return max(-1.0, min(1.0, val))


def cosine_similarity(v1: Sequence[float], v2: Sequence[float]) -> float:
    """Calculate normalized cosine similarity mapped to [0.0, 1.0]."""
    val = raw_cosine_similarity(v1, v2)
    return max(0.0, min(1.0, (val + 1.0) / 2.0))


async def get_foundational_course(
    session: AsyncSession, current_course: CourseModel
) -> CourseModel | None:
    """Identify foundational / prerequisite course using Specialization sequence or semantic match."""
    # Introductory/Beginner courses are entry points and do not require foundational prerequisites
    level_normalized = (current_course.level or "").strip().lower()
    if level_normalized in BEGINNER_LEVEL_ALIASES:
        return None

    # 1. Check if course belongs to a Specialization sequence
    spec_stmt = select(SpecializationModel)
    specs = (await session.execute(spec_stmt)).scalars().all()
    for spec in specs:
        if current_course.id in spec.course_ids:
            idx = spec.course_ids.index(current_course.id)
            if idx == 0:
                # First course in specialization sequence is the foundational root; do not search further
                return None
            if idx > 0:
                # Predecessor course in specialization is the foundational prerequisite
                prereq_id = spec.course_ids[idx - 1]
                prereq = await session.get(CourseModel, prereq_id)
                if prereq and prereq.status == CourseStatus.PUBLISHED:
                    return prereq

    # 2. Semantic vector fallback: find published course with foundational concepts & high similarity
    current_emb = await session.get(CourseEmbeddingModel, current_course.id)
    if not current_emb:
        return None

    emb_stmt = (
        select(CourseEmbeddingModel, CourseModel)
        .join(CourseModel, CourseModel.id == CourseEmbeddingModel.course_id)
        .where(
            CourseModel.id != current_course.id,
            CourseModel.status == CourseStatus.PUBLISHED,
        )
    )
    candidates = (await session.execute(emb_stmt)).all()

    best_match: CourseModel | None = None
    best_sim = 0.0

    for emb_rec, course in candidates:
        raw_sim = raw_cosine_similarity(current_emb.embedding, emb_rec.embedding)
        title_lower = course.title.lower()
        is_foundational = any(
            kw in title_lower for kw in FOUNDATIONAL_PEDAGOGICAL_KEYWORDS
        )
        is_relevant_domain = (course.subject == current_course.subject) or (
            raw_sim >= HIGH_SIMILARITY_CROSS_DOMAIN_THRESHOLD
        )
        if (
            is_foundational
            and is_relevant_domain
            and raw_sim >= MIN_FOUNDATIONAL_SIMILARITY_THRESHOLD
            and raw_sim > best_sim
        ):
            best_sim = raw_sim
            best_match = course

    return best_match


async def get_recommended_courses(
    session: AsyncSession,
    current_course: CourseModel,
    target_count: int = DEFAULT_RECOMMENDED_COURSES_COUNT,
    exclude_ids: set[str] | None = None,
) -> list[RecommendedCourseDto]:
    """Retrieve exactly `target_count` recommended courses using hybrid scoring formula."""
    if exclude_ids is None:
        exclude_ids = set()
    exclude_ids.add(current_course.id)

    # Load current course embedding
    current_emb = await session.get(CourseEmbeddingModel, current_course.id)
    current_vector = current_emb.embedding if current_emb else None

    # Load all published candidates
    all_courses_stmt = select(CourseModel).where(
        CourseModel.id.notin_(exclude_ids),
        CourseModel.status == CourseStatus.PUBLISHED,
    )
    candidate_courses = (await session.execute(all_courses_stmt)).scalars().all()

    if not candidate_courses:
        return []

    # Pre-fetch embeddings for candidates if current vector exists
    candidate_vectors: dict[str, list[float]] = {}
    if current_vector:
        cand_ids = [c.id for c in candidate_courses]
        cand_emb_stmt = select(CourseEmbeddingModel).where(
            CourseEmbeddingModel.course_id.in_(cand_ids)
        )
        cand_embs = (await session.execute(cand_emb_stmt)).scalars().all()
        for ce in cand_embs:
            candidate_vectors[ce.course_id] = ce.embedding

    scored_candidates: list[RecommendedCourseDto] = []

    for course in candidate_courses:
        # 1. Vector similarity (55%)
        cand_vec = candidate_vectors.get(course.id)
        if current_vector and cand_vec:
            sim = cosine_similarity(current_vector, cand_vec)
        else:
            sim = (
                FALLBACK_SIMILARITY_SAME_SUBJECT
                if course.subject == current_course.subject
                else FALLBACK_SIMILARITY_DIFF_SUBJECT
            )

        # 2. Same author / partner (30%)
        is_same_author = (
            course.owner_id and course.owner_id == current_course.owner_id
        ) or (
            course.partner_name and course.partner_name == current_course.partner_name
        )
        author_score = 1.0 if is_same_author else 0.0

        # 3. Rating score (15%) - only apply rating if course has actual reviews, else cold-start
        if (
            course.review_count
            and course.review_count > 0
            and course.average_rating is not None
        ):
            rating_score = min(5.0, max(0.0, course.average_rating)) / 5.0
        else:
            rating_score = COLD_START_DEFAULT_RATING_SCORE

        total_score = (
            (HYBRID_WEIGHT_VECTOR * sim)
            + (HYBRID_WEIGHT_AUTHOR * author_score)
            + (HYBRID_WEIGHT_RATING * rating_score)
        )

        # Confidence filter: Only retain courses meeting the minimum relevance threshold or from same author
        if total_score >= MIN_RECOMMENDATION_SCORE_THRESHOLD or is_same_author:
            scored_candidates.append(
                RecommendedCourseDto(course=course, score=total_score, badge_label="")
            )

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x.score, reverse=True)
    return scored_candidates[:target_count]
