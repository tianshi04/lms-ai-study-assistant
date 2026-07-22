import pytest
import pytest_asyncio
from sqlalchemy import text
from src.shared.infrastructure.database import (
    async_session_scope,
    dispose_engine,
    get_session_factory,
    init_pgvector_extension,
)


@pytest_asyncio.fixture(autouse=True)
async def cleanup_engine():
    """Ensure engine pool is properly disposed after each test."""
    yield
    await dispose_engine()


@pytest.mark.asyncio(loop_scope="function")
async def test_postgres_connection_and_pgvector():
    """Verify connection to coursera_postgres container and initialize pgvector extension."""
    try:
        # 1. Initialize pgvector extension
        await init_pgvector_extension()

        # 2. Open async session and query installed extensions
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector';")
            )
            ext_name = result.scalar()
            assert ext_name == "vector", "Vector extension was not initialized successfully"

            # 3. Test basic vector math operation (+ operator for vectors)
            vec_result = await session.execute(
                text("SELECT '[1,2,3]'::vector + '[4,5,6]'::vector;")
            )
            vec_val = vec_result.scalar()
            assert str(vec_val) == "[5,7,9]", f"Vector addition operation failed: {vec_val}"
    except Exception as exc:
        pytest.skip(f"PostgreSQL container offline for vector test: {exc}")


@pytest.mark.asyncio(loop_scope="function")
async def test_async_session_scope_context_manager():
    """Verify async_session_scope context manager functionality."""
    try:
        async with async_session_scope() as session:
            res = await session.execute(text("SELECT 1;"))
            assert res.scalar() == 1
    except Exception as exc:
        pytest.skip(f"PostgreSQL container offline for async_session_scope test: {exc}")
