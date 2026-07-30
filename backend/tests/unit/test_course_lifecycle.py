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
    course.reject(reason="Thiếu mô tả bài đọc")
    assert course.status == CourseStatus.REJECTED
    assert course.rejection_reason == "Thiếu mô tả bài đọc"

    # 3. Approve
    course.approve()
    assert course.status == CourseStatus.PUBLISHED
    assert course.rejection_reason == ""
