import pytest
from sqlalchemy import delete
from uuid6 import uuid7

from src.modules.forum.domain import (
    FORUM_FILTER_SOLVED,
    FORUM_FILTER_UNSOLVED,
    ForumReplyEntity,
    ForumThreadEntity,
)
from src.modules.forum.infrastructure.models import ForumThreadORM
from src.modules.forum.infrastructure.repository import ForumRepository
from src.shared.infrastructure.database import async_session_scope
from tests.conftest import check_postgres_available


@pytest.mark.asyncio(loop_scope="function")
async def test_forum_repository_vietnamese_search_and_solved_lifecycle():
    """Verify PostgreSQL unaccent/trigram search, resolution filters, and is_solved transitions."""
    check_postgres_available()

    test_course_a = f"test-forum-a-{uuid7()}"
    test_course_b = f"test-forum-b-{uuid7()}"

    try:
        async with async_session_scope() as session:
            repo = ForumRepository(session)

            # 1. Thread A: Vietnamese diacritics + Đ/đ + solved via staff reply
            thread_a = await repo.create_thread(
                ForumThreadEntity(
                    id=str(uuid7()),
                    course_id=test_course_a,
                    item_id="item-1",
                    title="Làm sao tối ưu Gradient Descent cho đồ thị hàm lồi?",
                    content="Em bị phân kỳ khi đặt learning rate tại Đà Nẵng",
                    author_name="Nguyễn Văn Đạt",
                    author_role="Learner",
                    created_at="2026-11-14T10:00:00Z",
                )
            )
            assert thread_a.is_solved is False

            # Learner reply keeps is_solved = False
            await repo.create_reply(
                ForumReplyEntity(
                    id=str(uuid7()),
                    thread_id=thread_a.id,
                    author_name="Bạn học",
                    author_role="Learner",
                    content="Mình cũng đang thử nghiệm trên PyTorch",
                    is_staff_answer=False,
                    created_at="2026-11-14T10:05:00Z",
                )
            )
            reloaded_a = await repo.get_thread_by_id(thread_a.id)
            assert reloaded_a is not None
            assert reloaded_a.is_solved is False

            # Two staff replies mark thread_a as solved
            staff_reply_1 = await repo.create_reply(
                ForumReplyEntity(
                    id=str(uuid7()),
                    thread_id=thread_a.id,
                    author_name="Giảng viên Nam",
                    author_role="Instructor",
                    content="Hãy giảm hệ số học xuống 0.001 và dùng Adam",
                    is_staff_answer=True,
                    created_at="2026-11-14T10:10:00Z",
                )
            )
            staff_reply_2 = await repo.create_reply(
                ForumReplyEntity(
                    id=str(uuid7()),
                    thread_id=thread_a.id,
                    author_name="Trợ giảng An",
                    author_role="TA",
                    content="Bổ sung thêm thuật toán Momentum rất hữu ích",
                    is_staff_answer=True,
                    created_at="2026-11-14T10:12:00Z",
                )
            )
            reloaded_a = await repo.get_thread_by_id(thread_a.id)
            assert reloaded_a is not None
            assert reloaded_a.is_solved is True

            # 2. Thread B: Separate course, unsolved initially, special LIKE wildcard chars
            thread_b = await repo.create_thread(
                ForumThreadEntity(
                    id=str(uuid7()),
                    course_id=test_course_b,
                    item_id="item-2",
                    title="Tỷ lệ 100%_test về ConnectRPC API",
                    content="Phân biệt Protobuf v3",
                    author_name="Trần Minh Khôi",
                    author_role="Learner",
                    created_at="2026-11-14T11:00:00Z",
                )
            )
            assert thread_b.is_solved is False

            # Search: Accent-insensitive Vietnamese + Đ/đ + multi-token
            matches_title = await repo.list_threads(
                course_id=test_course_a,
                search_query="toi uu do thi",
            )
            assert [t.id for t in matches_title] == [thread_a.id]

            # Search by author_name without accents (Đạt -> dat)
            matches_author = await repo.list_threads(
                course_id=test_course_a,
                search_query="van dat",
            )
            assert [t.id for t in matches_author] == [thread_a.id]

            # Search across reply content (EXISTS/UNION on forum_replies) + deduplicate repeated tokens
            matches_reply = await repo.list_threads(
                course_id=test_course_a,
                search_query="da da da da da da da nang momentum",
            )
            assert [t.id for t in matches_reply] == [thread_a.id]

            # Search with LIKE wildcard characters must treat % and _ literally
            matches_literal_pct = await repo.list_threads(
                course_id=test_course_b,
                search_query="100%_test",
            )
            assert [t.id for t in matches_literal_pct] == [thread_b.id]

            no_wildcard_leak = await repo.list_threads(
                course_id=test_course_a,
                search_query="%_test",
            )
            assert no_wildcard_leak == []

            # Resolution filter + course_id="ALL" normalization
            all_solved = await repo.list_threads(
                course_id="ALL",
                search_query="gradient",
                resolution_filter=FORUM_FILTER_SOLVED,
            )
            assert thread_a.id in [t.id for t in all_solved]
            assert thread_b.id not in [t.id for t in all_solved]

            all_unsolved = await repo.list_threads(
                course_id="ALL",
                search_query="ConnectRPC",
                resolution_filter=FORUM_FILTER_UNSOLVED,
            )
            assert [t.id for t in all_unsolved] == [thread_b.id]

            # Deleting 1 of 2 staff replies keeps thread_a solved
            assert await repo.delete_reply(staff_reply_1.id) is True
            reloaded_after_first_del = await repo.get_thread_by_id(thread_a.id)
            assert reloaded_after_first_del is not None
            assert reloaded_after_first_del.is_solved is True

            # Deleting the last staff reply flips thread_a back to unsolved
            assert await repo.delete_reply(staff_reply_2.id) is True
            reloaded_after_last_del = await repo.get_thread_by_id(thread_a.id)
            assert reloaded_after_last_del is not None
            assert reloaded_after_last_del.is_solved is False

            # Pinning a learner reply sets both is_staff_pinned and is_solved
            learner_reply_id = reloaded_after_last_del.replies[0].id
            assert await repo.pin_staff_answer(learner_reply_id, "ta_admin") is True
            reloaded_pinned = await repo.get_thread_by_id(thread_a.id)
            assert reloaded_pinned is not None
            assert reloaded_pinned.is_staff_pinned is True
            assert reloaded_pinned.is_solved is True
    finally:
        async with async_session_scope() as cleanup_session:
            await cleanup_session.execute(
                delete(ForumThreadORM).where(
                    ForumThreadORM.course_id.in_([test_course_a, test_course_b])
                )
            )
            await cleanup_session.commit()
