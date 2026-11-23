import uuid

import pytest

from src.modules.catalog.application import CatalogUseCase
from src.modules.learning.application import LearningUseCase


@pytest.mark.asyncio
async def test_list_enrolled_courses():
    catalog_uc = CatalogUseCase()
    learning_uc = LearningUseCase()

    # 1. Create a course to enroll in
    test_slug = f"learning-test-course-{uuid.uuid4().hex[:8]}"
    course = await catalog_uc.create_course(
        title="Learning Test Course",
        slug=test_slug,
        description="Test course for learning enrollment.",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
    )
    assert course is not None

    # 2. Mark progress to enroll (0% initially, but mark_item_complete adds progress)
    user_id = f"test_learner_01_{uuid.uuid4().hex[:8]}"

    # Check initial empty
    courses = await learning_uc.list_enrolled_courses(user_id)
    assert len(courses) == 0

    # Trigger progress creation (0%) by accessing a learning item
    await learning_uc.get_progress(user_id, course.id, current_item_id="item_1")
    courses = await learning_uc.list_enrolled_courses(user_id)
    assert len(courses) == 1
    assert courses[0].progress_percent == 0.0
    assert courses[0].status == "NOT_STARTED"

    from unittest.mock import AsyncMock, patch

    from src.modules.catalog.domain import (
        ItemType,
        LearningItem,
        Lesson,
        WeekModule,
    )

    mock_course_with_items = course
    mock_course_with_items.week_modules = [
        WeekModule(
            id="w1",
            week_number=1,
            title="W1",
            lessons=[
                Lesson(
                    id="l1",
                    title="L1",
                    items=[
                        LearningItem(id="item_1", title="i1", type=ItemType.VIDEO),
                        LearningItem(id="item_2", title="i2", type=ItemType.VIDEO),
                    ],
                )
            ],
        )
    ]

    with patch(
        "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.get_course_detail",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.return_value = mock_course_with_items
        # Mark 50% progress
        await learning_uc.mark_item_complete(user_id, course.id, "item_1")

        courses = await learning_uc.list_enrolled_courses(user_id)
        assert len(courses) == 1
        assert courses[0].course_id == course.id
        assert courses[0].course_title == "Learning Test Course"
        assert courses[0].progress_percent == 50.0
        assert courses[0].status == "IN_PROGRESS"

        # Mark 100% progress
        await learning_uc.mark_item_complete(user_id, course.id, "item_2")

        courses = await learning_uc.list_enrolled_courses(user_id)
        assert len(courses) == 1
        assert courses[0].progress_percent == 100.0
        assert courses[0].status == "COMPLETED"


@pytest.mark.asyncio
async def test_learning_handler_list_enrolled_courses():
    from unittest.mock import AsyncMock, patch

    from src.gen.learning.v1 import learning_pb as pb
    from src.modules.learning.presentation.learning_handler import LearningHandler

    learning_uc = LearningUseCase()
    # Mock list_enrolled_courses
    learning_uc.list_enrolled_courses = AsyncMock(return_value=[])

    handler = LearningHandler(use_case=learning_uc)

    class MockUser:
        id = "test_user"

    mock_user = MockUser()
    with patch(
        "src.modules.learning.presentation.learning_handler.require_current_user",
        return_value=mock_user,
    ):
        req = pb.ListMyEnrolledCoursesRequest()
        ctx = AsyncMock()
        res = await handler.list_my_enrolled_courses(req, ctx)
        assert res is not None
        assert len(res.courses) == 0
        learning_uc.list_enrolled_courses.assert_called_once_with(
            user_id="test_user", current_user=mock_user
        )


@pytest.mark.asyncio
async def test_learning_handler_get_progress_and_save_video_position():
    from unittest.mock import AsyncMock, patch

    from connectrpc.code import Code
    from connectrpc.errors import ConnectError

    from src.gen.learning.v1 import learning_pb as pb
    from src.modules.learning.domain import LearningItemProgress, LearningProgress
    from src.modules.learning.presentation.learning_handler import LearningHandler

    learning_uc = LearningUseCase()
    learning_uc.get_progress_with_video_positions = AsyncMock(
        return_value=(
            LearningProgress(user_id="u1", course_id="c1", last_accessed_item_id="i1"),
            [
                LearningItemProgress(
                    user_id="u1",
                    item_id="i1",
                    course_id="c1",
                    last_position_seconds=95,
                    video_duration_seconds=300,
                    position_updated_at="2026-11-17T10:00:00Z",
                )
            ],
        )
    )
    learning_uc.save_video_position = AsyncMock(
        return_value=(95, "2026-11-17T10:00:00Z")
    )
    handler = LearningHandler(use_case=learning_uc)

    class MockUser:
        id = "u1"

    with patch(
        "src.modules.learning.presentation.learning_handler.require_current_user",
        return_value=MockUser(),
    ):
        ctx = AsyncMock()
        progress_res = await handler.get_progress(
            pb.GetProgressRequest(course_id="c1"), ctx
        )
        assert len(progress_res.video_positions) == 1
        assert progress_res.video_positions[0].item_id == "i1"
        assert progress_res.video_positions[0].position_seconds == 95
        assert progress_res.video_positions[0].duration_seconds == 300

        save_res = await handler.save_video_position(
            pb.SaveVideoPositionRequest(
                course_id="c1",
                item_id="i1",
                position_seconds=95,
                duration_seconds=300,
            ),
            ctx,
        )
        assert save_res.success is True
        assert save_res.saved_position_seconds == 95

        learning_uc.save_video_position = AsyncMock(
            side_effect=ValueError("bad argument")
        )
        with pytest.raises(ConnectError) as exc_invalid:
            await handler.save_video_position(
                pb.SaveVideoPositionRequest(
                    course_id="c1", item_id="i1", position_seconds=-1
                ),
                ctx,
            )
        assert exc_invalid.value.code == Code.INVALID_ARGUMENT

        learning_uc.save_video_position = AsyncMock(
            side_effect=PermissionError("not enrolled")
        )
        with pytest.raises(ConnectError) as exc_perm:
            await handler.save_video_position(
                pb.SaveVideoPositionRequest(
                    course_id="c1", item_id="i1", position_seconds=10
                ),
                ctx,
            )
        assert exc_perm.value.code == Code.PERMISSION_DENIED
