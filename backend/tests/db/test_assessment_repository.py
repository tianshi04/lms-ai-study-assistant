from datetime import UTC, datetime, timedelta

import pytest

from src.modules.assessment.domain import QuizActiveSession
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.shared.infrastructure.database import async_session_scope


@pytest.mark.asyncio
async def test_quiz_active_session_draft_persistence_and_atomic_update():
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=30)
    user_id = "user_db_draft_test"
    item_id = "item_db_draft_test"
    session_id = "qsess-db-test-1"

    sample_questions = [
        {
            "question_id": "q1",
            "text": "Câu 1",
            "options": ["A", "B", "C"],
            "shuffled_correct_indices": [0],
            "question_type": "SINGLE_CHOICE",
        },
        {
            "question_id": "q2",
            "text": "Câu 2",
            "options": ["A", "B", "C", "D"],
            "shuffled_correct_indices": [1, 2],
            "question_type": "MULTIPLE_CHOICE",
        },
    ]

    async with async_session_scope() as session:
        repo = SQLAlchemyAssessmentRepository(session)

        # 1. Save initial active session
        active = QuizActiveSession(
            user_id=user_id,
            item_id=item_id,
            session_id=session_id,
            session_seed=777,
            questions_json=sample_questions,
            started_at=now.isoformat(),
            expires_at=expires_at.isoformat(),
            draft_answers=[[], []],
            draft_updated_at="",
            draft_version=0,
        )
        await repo.save_quiz_active_session(active)

        loaded = await repo.get_quiz_active_session(user_id, item_id)
        assert loaded is not None
        assert loaded.session_id == session_id
        assert loaded.draft_answers == [[], []]
        assert loaded.draft_version == 0

        # 2. Atomic draft update v1 -> succeeds
        ts1 = (now + timedelta(seconds=10)).isoformat()
        saved1, ver1, upd1 = await repo.update_quiz_draft_answers(
            user_id=user_id,
            item_id=item_id,
            session_id=session_id,
            draft_answers=[[2], [1, 3]],
            updated_at=ts1,
            draft_version=1,
        )
        assert saved1 is True
        assert ver1 == 1
        assert upd1 == ts1

        # 3. Atomic draft update v2 -> succeeds
        ts2 = (now + timedelta(seconds=20)).isoformat()
        saved2, ver2, upd2 = await repo.update_quiz_draft_answers(
            user_id=user_id,
            item_id=item_id,
            session_id=session_id,
            draft_answers=[[0], [1, 2]],
            updated_at=ts2,
            draft_version=2,
        )
        assert saved2 is True
        assert ver2 == 2
        assert upd2 == ts2

        # 4. Stale version (v1 < v2) is rejected without overwriting
        saved_stale, ver_stale, upd_stale = await repo.update_quiz_draft_answers(
            user_id=user_id,
            item_id=item_id,
            session_id=session_id,
            draft_answers=[[], []],
            updated_at=ts1,
            draft_version=1,
        )
        assert saved_stale is False
        assert ver_stale == 2
        assert upd_stale == ts2

        # 5. Mismatched session_id is rejected
        saved_wrong, _, _ = await repo.update_quiz_draft_answers(
            user_id=user_id,
            item_id=item_id,
            session_id="qsess-other",
            draft_answers=[[1], [1]],
            updated_at=ts2,
            draft_version=3,
        )
        assert saved_wrong is False

        loaded_after = await repo.get_quiz_active_session(user_id, item_id)
        assert loaded_after is not None
        assert loaded_after.draft_answers == [[0], [1, 2]]
        assert loaded_after.draft_version == 2

        # 6. Delete with non-matching session_id does not delete
        await repo.delete_quiz_active_session(user_id, item_id, "qsess-other")
        assert await repo.get_quiz_active_session(user_id, item_id) is not None

        # 7. Delete with matching session_id removes record
        await repo.delete_quiz_active_session(user_id, item_id, session_id)
        assert await repo.get_quiz_active_session(user_id, item_id) is None
