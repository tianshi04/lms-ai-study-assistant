"""Database Seeding Script for Development & Testing Environment.

Best-Practice DDD Infrastructure Seeding Entrypoint:
- Default Execution (Upsert Mode): Uses session.merge() to safely insert missing seed records or update existing ones without destructive data wipes.
- Reset Execution (--reset Flag): Dynamically truncates all database tables when explicitly requested for a pristine environment reset (blocked in production).

Usage:
  - Default / Upsert:  uv run python -m src.seed
  - Full Clean Reset:  uv run python -m src.seed --reset
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import text

from src.scripts.seeds import (
    build_categories,
    build_sample_catalog,
    seed_catalog_and_reviews,
    seed_commerce_and_community,
    seed_identity_and_partners,
    seed_learning_and_assessments,
)
from src.shared.config import settings
from src.shared.infrastructure.database import Base, async_session_scope
from src.shared.infrastructure.logging import setup_logging

setup_logging()
logger = logging.getLogger("seed")

__all__ = [
    "build_categories",
    "build_sample_catalog",
    "seed_database",
]


async def seed_database(reset: bool = False) -> None:
    """Execute database seeding across all bounded contexts.

    :param reset: If True, truncates all database tables before re-seeding.
    """
    if reset and settings.ENV.lower() in ("production", "prod"):
        msg = "Refusing to run destructive seed (--reset) in production environment!"
        raise RuntimeError(msg)

    async with async_session_scope() as session:
        if reset:
            logger.info("[SEED] Truncating ALL database tables for full clean reset...")
            tables = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
            if tables:
                await session.execute(
                    text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE")
                )
                await session.commit()

        logger.info(
            "[SEED] Seeding initial catalog and system entities into PostgreSQL..."
        )
        await seed_identity_and_partners(session)
        await seed_catalog_and_reviews(session)
        await seed_learning_and_assessments(session)
        await seed_commerce_and_community(session)

        await session.commit()
        logger.info("[SEED] Database seeding completed successfully!")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments for CLI execution."""
    parser = argparse.ArgumentParser(
        description="Database Seeding Script for Coursera LMS"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate existing tables before seeding for a 100%% clean reset.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_database(reset=args.reset))
