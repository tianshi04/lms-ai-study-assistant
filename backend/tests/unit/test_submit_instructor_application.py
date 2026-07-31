import pytest
from unittest.mock import AsyncMock

from src.modules.identity.application.submit_application_usecase import (
    SubmitInstructorApplicationUseCase,
)
from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
)


@pytest.mark.asyncio
async def test_submit_instructor_application_success():
    repo = AsyncMock()
    repo.get_latest_by_user_id.return_value = None
    repo.save.side_effect = lambda app: app

    use_case = SubmitInstructorApplicationUseCase(repo)
    result = await use_case.execute(
        user_id="user_123",
        title="Giảng viên Chuyên ngành AI & Data",
        bio="10 năm kinh nghiệm nghiên cứu Machine Learning và giảng dạy.",
        linkedin_url="https://linkedin.com/in/test",
        cv_url="https://example.com/cv.pdf",
        demo_video_url="https://youtube.com/watch?v=demo",
    )

    assert result.user_id == "user_123"
    assert result.title == "Giảng viên Chuyên ngành AI & Data"
    assert result.status == ApplicationStatus.PENDING_REVIEW
    assert repo.save.called


@pytest.mark.asyncio
async def test_submit_instructor_application_empty_title_raises():
    repo = AsyncMock()
    use_case = SubmitInstructorApplicationUseCase(repo)

    with pytest.raises(ValueError, match="Chức danh chuyên môn không được để trống"):
        await use_case.execute(
            user_id="user_123",
            title="   ",
            bio="Tiểu sử năng lực...",
        )


@pytest.mark.asyncio
async def test_submit_instructor_application_empty_bio_raises():
    repo = AsyncMock()
    use_case = SubmitInstructorApplicationUseCase(repo)

    with pytest.raises(
        ValueError, match="Bài viết tiểu sử năng lực không được để trống"
    ):
        await use_case.execute(
            user_id="user_123",
            title="Giảng viên AI",
            bio="",
        )


@pytest.mark.asyncio
async def test_submit_instructor_application_duplicate_pending_raises():
    repo = AsyncMock()
    repo.get_latest_by_user_id.return_value = InstructorApplication(
        id="app_1",
        user_id="user_123",
        title="Cựu giảng viên",
        bio="Tiểu sử cũ",
        linkedin_url="",
        cv_url="",
        demo_video_url="",
        status=ApplicationStatus.PENDING_REVIEW,
    )
    use_case = SubmitInstructorApplicationUseCase(repo)

    with pytest.raises(
        ValueError, match="Bạn đã có đơn xin cấp quyền Giảng viên đang chờ duyệt"
    ):
        await use_case.execute(
            user_id="user_123",
            title="Giảng viên Mới",
            bio="Tiểu sử mới",
        )


@pytest.mark.asyncio
async def test_submit_instructor_application_rejected_cooldown_raises():
    from datetime import datetime, timezone

    repo = AsyncMock()
    now_str = datetime.now(timezone.utc).isoformat()
    repo.get_latest_by_user_id.return_value = InstructorApplication(
        id="app_rejected",
        user_id="user_123",
        title="Tiến sĩ AI",
        bio="Tiểu sử...",
        linkedin_url="",
        cv_url="",
        demo_video_url="",
        status=ApplicationStatus.REJECTED,
        reviewed_at=now_str,
    )
    use_case = SubmitInstructorApplicationUseCase(repo)

    with pytest.raises(ValueError, match="Đơn đăng ký trước đó của bạn đã bị từ chối"):
        await use_case.execute(
            user_id="user_123",
            title="Giảng viên Mới",
            bio="Tiểu sử mới",
        )


@pytest.mark.asyncio
async def test_review_instructor_application_approve():
    from src.modules.identity.application.review_application_usecase import (
        ReviewInstructorApplicationUseCase,
    )
    from src.modules.identity.domain.entities import User, UserRole

    app_repo = AsyncMock()
    identity_repo = AsyncMock()

    app = InstructorApplication(
        id="app_99",
        user_id="user_learner_1",
        title="Tiến sĩ AI",
        bio="Tiểu sử...",
        linkedin_url="",
        cv_url="",
        demo_video_url="",
        status=ApplicationStatus.PENDING_REVIEW,
    )
    app_repo.get_by_id.return_value = app
    app_repo.save.side_effect = lambda a: a

    applicant = User(
        id="user_learner_1",
        email="learner@example.com",
        full_name="Learner One",
        role=UserRole.LEARNER,
    )
    identity_repo.get_by_id.return_value = applicant

    use_case = ReviewInstructorApplicationUseCase(app_repo, identity_repo)
    result = await use_case.execute(application_id="app_99", approve=True)

    assert result.status == ApplicationStatus.APPROVED
    assert applicant.role == UserRole.INSTRUCTOR
    assert applicant.title == "Tiến sĩ AI"
    assert identity_repo.save.called


@pytest.mark.asyncio
async def test_review_instructor_application_reject():
    from src.modules.identity.application.review_application_usecase import (
        ReviewInstructorApplicationUseCase,
    )

    app_repo = AsyncMock()
    identity_repo = AsyncMock()

    app = InstructorApplication(
        id="app_99",
        user_id="user_learner_1",
        title="Tiến sĩ AI",
        bio="Tiểu sử...",
        linkedin_url="",
        cv_url="",
        demo_video_url="",
        status=ApplicationStatus.PENDING_REVIEW,
    )
    app_repo.get_by_id.return_value = app
    app_repo.save.side_effect = lambda a: a

    use_case = ReviewInstructorApplicationUseCase(app_repo, identity_repo)
    result = await use_case.execute(
        application_id="app_99",
        approve=False,
        rejection_reason="Chưa đủ tài liệu chứng minh",
    )

    assert result.status == ApplicationStatus.REJECTED
    assert result.rejection_reason == "Chưa đủ tài liệu chứng minh"
    assert app_repo.save.called
