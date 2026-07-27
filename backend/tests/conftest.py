import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
import src.shared.infrastructure.database as db_module


@pytest_asyncio.fixture(autouse=True)
async def auto_rollback_db():
    """Ensure every DB operation in tests runs inside a Savepoint transaction

    that is automatically rolled back after the test completes.
    """
    engine = db_module.get_engine()
    connection = await engine.connect()
    transaction = await connection.begin()

    test_sessionmaker = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    old_factory = db_module._session_factory
    db_module._session_factory = test_sessionmaker

    try:
        yield
    finally:
        db_module._session_factory = old_factory
        if transaction.is_active:
            await transaction.rollback()
        await connection.close()
        await db_module.dispose_engine()
