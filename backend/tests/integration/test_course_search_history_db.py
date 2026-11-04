import pytest
from sqlalchemy import select

import src.shared.infrastructure.database as db_module
from src.modules.catalog.infrastructure.models import UserSearchHistoryModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.identity.domain import UserRole
from src.modules.identity.infrastructure.models import UserModel
from tests.conftest import check_postgres_available


@pytest.mark.asyncio
async def test_db_user_search_history_lifecycle():
    check_postgres_available()

    async with db_module.async_session_scope() as session:
        # Create a test user in DB for Foreign Key requirement
        test_user = UserModel(
            id="test_search_user_1",
            email="search_user_1@test.com",
            password_hash="dummy_hash",
            full_name="Search User One",
            role=UserRole.LEARNER,
        )
        session.add(test_user)
        await session.commit()

    try:
        async with db_module.async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)

            # 1. First search: "python"
            success1 = await repo.record_search_query(
                user_id="test_search_user_1",
                query="python",
                filters_json='{"level": "beginner"}',
                result_count=10,
            )
            assert success1 is True

        # Check DB has exactly 1 row
        async with db_module.async_session_scope() as session:
            stmt = select(UserSearchHistoryModel).where(
                UserSearchHistoryModel.user_id == "test_search_user_1"
            )
            rows = (await session.execute(stmt)).scalars().all()
            assert len(rows) == 1
            assert rows[0].search_query == "python"
            assert rows[0].result_count == 10
            initial_id = rows[0].id

        # 2. Immediate prefix update (within 5 seconds throttle window): "python web"
        async with db_module.async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            success2 = await repo.record_search_query(
                user_id="test_search_user_1",
                query="python web",
                filters_json='{"level": "beginner", "subject": "cs"}',
                result_count=6,
            )
            assert success2 is True

        # Check DB STILL has exactly 1 row and was updated
        async with db_module.async_session_scope() as session:
            stmt = select(UserSearchHistoryModel).where(
                UserSearchHistoryModel.user_id == "test_search_user_1"
            )
            rows = (await session.execute(stmt)).scalars().all()
            assert len(rows) == 1
            assert rows[0].id == initial_id
            assert rows[0].search_query == "python web"
            assert rows[0].result_count == 6

        # 3. Completely different query: "machine learning" -> should insert new row
        async with db_module.async_session_scope() as session:
            repo = SQLAlchemyCatalogRepository(session)
            success3 = await repo.record_search_query(
                user_id="test_search_user_1",
                query="machine learning",
                result_count=4,
            )
            assert success3 is True

        async with db_module.async_session_scope() as session:
            stmt = (
                select(UserSearchHistoryModel)
                .where(UserSearchHistoryModel.user_id == "test_search_user_1")
                .order_by(UserSearchHistoryModel.created_at.asc())
            )
            rows = (await session.execute(stmt)).scalars().all()
            assert len(rows) == 2
            assert rows[0].search_query == "python web"
            assert rows[1].search_query == "machine learning"

    finally:
        # Cleanup test data (Cascades to user_search_history via ondelete="CASCADE")
        async with db_module.async_session_scope() as session:
            user = await session.get(UserModel, "test_search_user_1")
            if user:
                await session.delete(user)
                await session.commit()
