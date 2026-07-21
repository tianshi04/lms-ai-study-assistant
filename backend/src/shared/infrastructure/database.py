from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.shared.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


def get_database_url() -> str:
    """Retrieve database URL from configuration settings."""
    return settings.async_database_url


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Get or create singleton SQLAlchemy AsyncEngine instance."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            get_database_url(),
            echo=False,
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create singleton async_sessionmaker factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def dispose_engine() -> None:
    """Dispose singleton engine and reset session factory (useful for tests and shutdown)."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield async database session for dependency injection or use case execution."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def async_session_scope() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional scope around a series of operations with auto-commit/rollback."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_pgvector_extension() -> None:
    """Initialize pgvector extension in PostgreSQL if not already created."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
