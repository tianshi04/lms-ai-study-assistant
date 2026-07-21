"""Database Seeding Script for Development & Demo Environment.

Best-Practice DDD Infrastructure Seeding Script:
- Default Execution (Upsert Mode): Uses session.merge() to safely insert missing seed records or update existing ones without destructive data wipes.
- Reset Execution (--reset Flag): Truncates catalog and learning progress tables when explicitly requested for a pristine environment reset.
- Dev Startup Integration: Auto-seeds initial catalog if the database contains no courses.

Usage:
  - Default / Upsert:  uv run python src/seed.py
  - Full Clean Reset:  uv run python src/seed.py --reset
"""

# ruff: noqa: E402, F401

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from src.shared.infrastructure.database import Base, async_session_scope, get_engine
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    WeekModuleModel,
    LessonModel,
    LearningItemModel,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    SpecializationModel,
    ItemType,
)
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    WeeklyDeadlineModel,
    PersonalNoteModel,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")


def build_sample_catalog() -> tuple[list[CourseModel], list[SpecializationModel]]:
    """Construct domain seed data objects for the initial catalog."""
    sample_url = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
    deeplearning_logo = "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg"
    meta_logo = "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"

    # Course 1: Supervised Machine Learning
    course1 = CourseModel(
        id="course-python-ai",
        title="Supervised Machine Learning: Regression and Classification",
        slug="supervised-machine-learning",
        description="Build machine learning models in Python using NumPy and scikit-learn, train supervised models for prediction and binary classification.",
        partner_name="DeepLearning.AI",
        partner_logo_url=deeplearning_logo,
        instructor_names=["Andrew Ng", "Eddy Shyu"],
    )

    week1 = WeekModuleModel(
        id="week-1-ml",
        course_id=course1.id,
        week_number=1,
        title="Week 1: Introduction to Machine Learning & Regression",
        summary="Learn the core concepts of supervised learning and implement your first linear regression model.",
    )

    lesson1 = LessonModel(
        id="lesson-linear-regression",
        week_module_id=week1.id,
        title="Lesson 1: Linear Regression with One Variable",
        estimated_minutes=37,
    )

    item1 = LearningItemModel(
        id="item-ml-intro-video",
        lesson_id=lesson1.id,
        title="Lecture: Introduction to Linear Regression & Cost Function",
        type=ItemType.VIDEO,
        estimated_minutes=12,
        video_url=sample_url,
        vtt_subtitle_url="",
    )

    t1 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Welcome to Supervised Machine Learning! In this lesson, we will cover linear regression.",
    )
    t2 = InteractiveTranscriptModel(
        timestamp_seconds=5,
        text="Linear regression fits a straight line through dataset points to predict continuous numerical values.",
    )
    t3 = InteractiveTranscriptModel(
        timestamp_seconds=10,
        text="Let's look at the cost function, often represented as Mean Squared Error (MSE).",
    )
    t4 = InteractiveTranscriptModel(
        timestamp_seconds=15,
        text="Gradient descent updates model parameters iteratively until minimum cost is reached.",
    )

    q1 = InVideoQuizModel(
        timestamp_seconds=10,
        question="What cost function is commonly used for Linear Regression?",
        options=[
            "Cross-Entropy Loss",
            "Mean Squared Error (MSE)",
            "Hinge Loss",
            "Kullback-Leibler Divergence",
        ],
        correct_option_index=1,
        explanation="Mean Squared Error (MSE) measures the average squared difference between estimated values and actual values.",
    )

    item1.interactive_transcripts.extend([t1, t2, t3, t4])
    item1.in_video_quizzes.append(q1)

    item2 = LearningItemModel(
        id="item-ml-reading-1",
        lesson_id=lesson1.id,
        title="Reading: Math Foundations of Gradient Descent",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# Math Foundations of Gradient Descent\n\nGradient descent is an optimization algorithm used to minimize cost functions in machine learning models.\n\n## Key Concepts\n- **Learning Rate (alpha)**: Controls the step size at each iteration.\n- **Loss Function**: Measures the prediction error.\n\n> *Tip: Choosing an appropriate learning rate is crucial for convergence.*",
    )

    lesson1.items.extend([item1, item2])
    week1.lessons.append(lesson1)
    course1.week_modules.append(week1)

    # Course 2: Modern Fullstack Web Development
    course2 = CourseModel(
        id="course-web-dev",
        title="Modern Fullstack Web Development with Next.js & ConnectRPC",
        slug="modern-fullstack-web-dev",
        description="Master modern Web Development using Next.js 15 App Router, TypeScript, ConnectRPC gRPC web, and Tailwind CSS v4.",
        partner_name="Meta",
        partner_logo_url=meta_logo,
        instructor_names=["Jane Doe"],
    )

    week_web1 = WeekModuleModel(
        id="week-1-web",
        course_id=course2.id,
        week_number=1,
        title="Week 1: Next.js 15 App Router & Server Components",
        summary="Learn React Server Components, App Router routing, and ConnectRPC stub integration.",
    )

    lesson_web1 = LessonModel(
        id="lesson-nextjs-intro",
        week_module_id=week_web1.id,
        title="Lesson 1: Building Modern Web Apps with Next.js & Tailwind CSS v4",
        estimated_minutes=45,
    )

    item_web1 = LearningItemModel(
        id="item-web-video-1",
        lesson_id=lesson_web1.id,
        title="Lecture: Fullstack Web Architecture & ConnectRPC",
        type=ItemType.VIDEO,
        estimated_minutes=20,
        video_url=sample_url,
        vtt_subtitle_url="",
    )

    t_web1 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Welcome to Fullstack Web Development with Next.js 15 and ConnectRPC!",
    )
    t_web2 = InteractiveTranscriptModel(
        timestamp_seconds=10,
        text="We use Domain-Driven Design (DDD) to keep bounded contexts clean and scalable.",
    )
    item_web1.interactive_transcripts.extend([t_web1, t_web2])

    item_web2 = LearningItemModel(
        id="item-web-reading-1",
        lesson_id=lesson_web1.id,
        title="Reading: ConnectRPC gRPC-web Best Practices",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# ConnectRPC Best Practices\n\nConnectRPC provides lightweight, type-safe gRPC web protocol stubs for TypeScript and Python.\n\n## Key Features\n- **Type Safety**: Proto stubs generated automatically.\n- **Fast Serialization**: Binary Protobuf & JSON support.",
    )

    lesson_web1.items.extend([item_web1, item_web2])
    week_web1.lessons.append(lesson_web1)
    course2.week_modules.append(week_web1)

    # Specialization
    spec = SpecializationModel(
        id="spec-ai-eng",
        title="Machine Learning Specialization",
        description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
        partner_name="DeepLearning.AI",
        course_ids=[course1.id, course2.id],
    )

    return [course1, course2], [spec]


async def seed_database(reset: bool = False, auto_mode: bool = False) -> None:
    """Execute database seeding with best-practice options.
    
    :param reset: If True, truncates all catalog & progress tables before re-seeding.
    :param auto_mode: If True (e.g. dev startup), skips seeding if database already contains courses.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_scope() as session:
        if auto_mode:
            stmt = select(CourseModel).limit(1)
            res = await session.execute(stmt)
            if res.scalar_one_or_none() is not None:
                logger.info("[SEED] Database already contains courses. Auto-seeding skipped.")
                return

        if reset:
            logger.info("[SEED] Truncating catalog and progress tables for full clean reset...")
            await session.execute(
                text(
                    "TRUNCATE courses, week_modules, lessons, learning_items, interactive_transcripts, in_video_quizzes, specializations, learning_progresses, weekly_deadlines, personal_notes RESTART IDENTITY CASCADE"
                )
            )
            await session.commit()

        logger.info("[SEED] Seeding demonstration catalog into PostgreSQL...")
        courses, specializations = build_sample_catalog()

        # Idempotent Upsert using session.merge()
        for course in courses:
            await session.merge(course)
        for spec in specializations:
            await session.merge(spec)

        await session.commit()
        logger.info("[SEED] Database seeding completed successfully!")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments for CLI execution."""
    parser = argparse.ArgumentParser(description="Database Seeding Script for Coursera Clone")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate existing tables before seeding for a 100%% clean reset.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_database(reset=args.reset, auto_mode=False))
