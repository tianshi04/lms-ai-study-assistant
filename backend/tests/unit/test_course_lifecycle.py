import pytest
from src.modules.catalog.domain.entities import (
    Course,
    CourseStatus,
    ItemType,
    LearningItem,
    Lesson,
    WeekModule,
)


def test_course_initial_status():
    course = Course(id="c1", title="Test Course", slug="test-course")
    assert course.status == CourseStatus.DRAFT
    assert course.rejection_reason == ""


def test_submit_for_launch_without_owner():
    course = Course(id="c1", title="Test Course", slug="test-course", owner_id="")
    with pytest.raises(ValueError, match="Giảng viên phụ trách chính"):
        course.submit_for_launch()


def test_submit_for_launch_missing_vtt():
    item = LearningItem(
        id="i1",
        title="Video 1",
        type=ItemType.VIDEO,
        video_url="http://video.mp4",
        vtt_subtitle_url="",
    )
    lesson = Lesson(id="l1", title="Lesson 1", items=[item])
    week = WeekModule(id="w1", week_number=1, title="Week 1", lessons=[lesson])
    course = Course(
        id="c1",
        title="Test Course",
        slug="test-course",
        owner_id="user-1",
        week_modules=[week],
    )

    with pytest.raises(ValueError, match="chưa có tệp phụ đề VTT"):
        course.submit_for_launch()


def test_submit_for_launch_success_and_review_flow():
    item = LearningItem(
        id="i1",
        title="Video 1",
        type=ItemType.VIDEO,
        video_url="http://video.mp4",
        vtt_subtitle_url="http://sub.vtt",
    )
    lesson = Lesson(id="l1", title="Lesson 1", items=[item])
    week = WeekModule(id="w1", week_number=1, title="Week 1", lessons=[lesson])
    course = Course(
        id="c1",
        title="Test Course",
        slug="test-course",
        owner_id="user-1",
        week_modules=[week],
    )

    # 1. Submit for launch
    course.submit_for_launch()
    assert course.status == CourseStatus.PENDING_REVIEW

    # 2. Reject
    course.reject(reason="Nội dung chưa đủ chất lượng")
    assert course.status == CourseStatus.REJECTED
    assert course.rejection_reason == "Nội dung chưa đủ chất lượng"


def test_course_can_edit_permissions():
    from src.shared.auth import CurrentUserContext

    admin = CurrentUserContext(id="admin", role="USER_ROLE_ADMIN")
    owner = CurrentUserContext(id="inst-1", role="USER_ROLE_INSTRUCTOR")
    co_inst = CurrentUserContext(id="inst-2", role="USER_ROLE_INSTRUCTOR")
    stranger = CurrentUserContext(id="inst-3", role="USER_ROLE_INSTRUCTOR")

    course = Course(
        id="c1",
        title="Test",
        slug="test",
        owner_id="inst-1",
        co_instructor_ids=["inst-2"],
        status=CourseStatus.DRAFT,
    )

    assert course.can_edit(admin) is True
    assert course.can_edit(owner) is True
    assert course.can_edit(co_inst) is True
    assert course.can_edit(stranger) is False

    # Pending review locks editing for instructors unless allow_read_only_pending is True
    course.status = CourseStatus.PENDING_REVIEW
    assert course.can_edit(owner) is False
    assert course.can_edit(owner, allow_read_only_pending=True) is True
    assert course.can_edit(admin) is True


def test_pb_course_status_mapping():
    from src.gen.catalog.v1 import catalog_pb as pb
    from src.modules.catalog.presentation.catalog_handler import _to_pb_course_status

    assert _to_pb_course_status(CourseStatus.DRAFT) == pb.CourseStatus.DRAFT
    assert (
        _to_pb_course_status(CourseStatus.PENDING_REVIEW)
        == pb.CourseStatus.PENDING_REVIEW
    )
    assert _to_pb_course_status(CourseStatus.PUBLISHED) == pb.CourseStatus.PUBLISHED
    assert _to_pb_course_status(CourseStatus.REJECTED) == pb.CourseStatus.REJECTED
    assert _to_pb_course_status("DRAFT") == pb.CourseStatus.DRAFT
    assert _to_pb_course_status("CourseStatus.DRAFT") == pb.CourseStatus.DRAFT
