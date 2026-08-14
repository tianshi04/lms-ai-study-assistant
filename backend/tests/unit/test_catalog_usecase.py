from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.catalog.application import CatalogUseCase
from src.modules.catalog.domain import Course, Lesson, Specialization
from src.shared.auth import CurrentUser


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    # Mock methods returning specific types
    repo.list_courses.return_value = (
        [
            Course(
                id="c1",
                title="Course 1",
                slug="c-1",
                description="",
                partner_name="",
                partner_logo_url="",
                instructor_names=[],
                week_modules=[],
            )
        ],
        "token",
    )
    repo.get_course_detail.return_value = Course(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=[],
        week_modules=[],
    )
    repo.get_lesson_detail.return_value = Lesson(
        id="l1", title="Lesson 1", estimated_minutes=10, items=[]
    )
    repo.get_specialization.return_value = (
        Specialization(
            id="s1",
            title="Spec 1",
            description="",
            partner_name="",
            partner_logo_url="",
            course_ids=[],
        ),
        [],
    )
    repo.seed_if_empty = AsyncMock()
    return repo


@pytest.fixture
def repo_factory(mock_repo):
    return lambda session: mock_repo


@pytest.fixture
def catalog_usecase(repo_factory):
    return CatalogUseCase(repo_factory=repo_factory)


@pytest.mark.asyncio
@patch("src.modules.catalog.application.course_usecase.async_session_scope")
async def test_list_courses(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    courses, token = await catalog_usecase.list_courses(page_size=5, page_token="pt")

    mock_scope.assert_called_once()
    mock_repo.list_courses.assert_awaited_once_with(
        5, "pt", "", "", "", "", "", organization_id=None
    )
    assert len(courses) == 1
    assert courses[0].id == "c1"
    assert token == "token"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.course_usecase.async_session_scope")
async def test_get_course_detail(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    course = await catalog_usecase.get_course_detail("c1")

    mock_scope.assert_called_once()
    mock_repo.get_course_detail.assert_awaited_once_with("c1")
    assert course is not None
    assert course.id == "c1"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.curriculum_usecase.async_session_scope")
async def test_get_lesson_detail(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    lesson = await catalog_usecase.get_lesson_detail("c1", "l1")

    mock_scope.assert_called_once()
    mock_repo.get_lesson_detail.assert_awaited_once_with("c1", "l1")
    assert lesson is not None
    assert lesson.id == "l1"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.course_usecase.async_session_scope")
async def test_get_specialization(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    spec, courses = await catalog_usecase.get_specialization("s1")

    mock_scope.assert_called_once()
    mock_repo.get_specialization.assert_awaited_once_with("s1")
    assert spec is not None
    assert spec.id == "s1"
    assert isinstance(courses, list)


@pytest.mark.asyncio
@patch("src.modules.catalog.application.course_usecase.async_session_scope")
async def test_without_repo_factory(mock_scope, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    with patch(
        "src.modules.catalog.application.catalog_usecase.SQLAlchemyCatalogRepository"
    ) as mock_repo_class:
        mock_repo_instance = AsyncMock()
        mock_repo_instance.list_courses.return_value = ([], "")
        # Remove seed_if_empty from the mock to test the `if callable(seed_fn)` logic branch
        del mock_repo_instance.seed_if_empty

        mock_repo_class.return_value = mock_repo_instance

        usecase = CatalogUseCase()
        courses, _token = await usecase.list_courses()

        mock_repo_class.assert_called_once_with(mock_session)
        mock_repo_instance.list_courses.assert_awaited_once()
        assert courses == []


@pytest.mark.asyncio
@patch("src.modules.catalog.application.course_usecase.async_session_scope")
async def test_create_and_update_course_financial_aid_toggle(
    mock_scope, catalog_usecase, mock_repo, mock_session
):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    mock_repo.create_course.return_value = Course(
        id="c2",
        title="AI Course",
        slug="ai-course",
        financial_aid_enabled=False,
    )
    mock_repo.update_course.return_value = Course(
        id="c2",
        title="AI Course Updated",
        slug="ai-course",
        financial_aid_enabled=True,
    )

    created = await catalog_usecase.create_course(
        title="AI Course",
        slug="ai-course",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="",
        instructor_names=["Instructor"],
        financial_aid_enabled=False,
    )
    assert created.financial_aid_enabled is False

    updated = await catalog_usecase.update_course(
        course_id="c2",
        title="AI Course Updated",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="",
        instructor_names=["Instructor"],
        financial_aid_enabled=True,
    )
    assert updated.financial_aid_enabled is True


@pytest.mark.asyncio
@patch("src.modules.catalog.application.scorm_usecase.async_session_scope")
@patch("src.modules.catalog.application.scorm_usecase.get_s3_storage_service")
async def test_export_course_to_scorm(
    mock_s3_service, mock_scope, catalog_usecase, mock_repo, mock_session
):
    # 1. Setup mock storage service
    from unittest.mock import MagicMock

    from src.modules.catalog.domain import (
        Course,
        ItemType,
        LearningItem,
        Lesson,
        WeekModule,
    )

    mock_s3 = MagicMock()
    mock_s3.endpoint_url = "http://localhost:9000"
    mock_s3.bucket_name = "lms-bucket"
    mock_s3._to_public_url.return_value = "http://public-url/file.zip"
    mock_s3.ensure_bucket_exists = AsyncMock()
    mock_s3.upload_file = AsyncMock()
    mock_s3.generate_presigned_download_url = AsyncMock(
        return_value="http://public-url/file.zip"
    )
    mock_s3_service.return_value = mock_s3

    # 2. Setup mock scope & session
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    mock_result = AsyncMock()
    mock_result.fetchall.return_value = []
    mock_session.execute.return_value = mock_result

    # 3. Setup mock course with modules, lessons, items
    item_video = LearningItem(
        id="item-video",
        title="Video Item",
        type=ItemType.VIDEO,
        video_url="http://test.com/video.mp4",
    )
    lesson = Lesson(id="l1", title="Lesson 1", items=[item_video])
    wm = WeekModule(id="wm1", week_number=1, title="Week 1", lessons=[lesson])

    mock_repo.get_course_detail.return_value = Course(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="http://logo.png",
        instructor_names=["Instr 1"],
        week_modules=[wm],
        owner_id="instructor-id",
    )

    # 4. Patch ownership verification to bypass
    with patch.object(catalog_usecase, "_verify_ownership", AsyncMock()):
        # 5. Call export
        download_url, object_key = await catalog_usecase.export_course_to_scorm(
            course_id="c1", current_user=None
        )

    # 6. Assertions
    assert download_url == "http://public-url/file.zip"
    assert "scorm/exports/" in object_key
    mock_s3.upload_file.assert_called_once()


@pytest.mark.asyncio
@patch("src.modules.catalog.application.scorm_usecase.get_s3_storage_service")
async def test_parse_scorm_package_native(mock_s3_service, catalog_usecase):
    import io
    import json
    import zipfile

    # Create mock zip with openlms-course.json
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        course_data = {
            "exporter": "OpenLMS",
            "course": {"id": "c1", "title": "Restored Course", "weekModules": []},
        }
        z.writestr("openlms-course.json", json.dumps(course_data))

    mock_s3 = AsyncMock()
    mock_s3.download_file.return_value = zip_buffer.getvalue()
    mock_s3_service.return_value = mock_s3

    course_preview, is_single, item_preview = await catalog_usecase.parse_scorm_package(
        scorm_object_key="some-key", target_course_id="target-id"
    )

    assert course_preview is not None
    assert course_preview.title == "Restored Course"
    assert is_single is False
    assert item_preview is None


@pytest.mark.asyncio
@patch("src.modules.catalog.application.scorm_usecase.get_s3_storage_service")
async def test_parse_scorm_package_standard(mock_s3_service, catalog_usecase):
    import io
    import zipfile

    # Create mock zip with imsmanifest.xml
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        manifest_xml = """<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="standard_scorm" version="1.2" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <organizations>
    <organization>
      <title>Standard SCORM Title</title>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r1" href="index_lms.html" />
  </resources>
</manifest>"""
        z.writestr("imsmanifest.xml", manifest_xml)

    mock_s3 = AsyncMock()
    mock_s3.download_file.return_value = zip_buffer.getvalue()
    mock_s3_service.return_value = mock_s3

    with pytest.raises(ValueError, match="Level 2"):
        await catalog_usecase.parse_scorm_package(
            scorm_object_key="some-key", target_course_id="target-id"
        )


@pytest.mark.asyncio
@patch("src.modules.catalog.application.scorm_usecase.async_session_scope")
@patch("src.modules.catalog.application.scorm_usecase.get_s3_storage_service")
async def test_import_course_from_scorm_native(
    mock_s3_service, mock_scope, catalog_usecase, mock_repo, mock_session
):
    import io
    import json
    import zipfile

    # Create mock zip with openlms-course.json
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        course_data = {
            "exporter": "OpenLMS",
            "course": {
                "id": "c1",
                "title": "Restored Course",
                "weekModules": [
                    {
                        "id": "w1",
                        "weekNumber": 1,
                        "title": "Week 1",
                        "summary": "Summary 1",
                        "lessons": [
                            {
                                "id": "l1",
                                "title": "Lesson 1",
                                "estimatedMinutes": 15,
                                "items": [
                                    {
                                        "id": "i1",
                                        "title": "Item 1",
                                        "type": 1,
                                        "estimatedMinutes": 10,
                                        "videoUrl": "http://youtube.com/v1",
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }
        z.writestr("openlms-course.json", json.dumps(course_data))

    mock_s3 = AsyncMock()
    mock_s3.download_file.return_value = zip_buffer.getvalue()
    mock_s3_service.return_value = mock_s3

    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    # Setup repo mocks
    mock_repo.get_course_detail.return_value = Course(
        id="c1",
        title="Original",
        slug="orig",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=[],
        week_modules=[],
    )
    mock_repo.create_week_module.return_value = AsyncMock(id="w1_new")
    mock_repo.create_lesson.return_value = AsyncMock(id="l1_new")

    course, item = await catalog_usecase.import_course_from_scorm(
        scorm_object_key="some-key", course_id="c1", current_user=None
    )

    assert course is not None
    assert item is None
    mock_repo.create_week_module.assert_called_once()
    mock_repo.create_lesson.assert_called_once()
    mock_repo.create_learning_item.assert_called_once()


@pytest.mark.asyncio
@patch("src.modules.catalog.application.scorm_usecase.async_session_scope")
@patch("src.modules.catalog.application.scorm_usecase.get_s3_storage_service")
async def test_import_course_from_scorm_standard(
    mock_s3_service, mock_scope, catalog_usecase, mock_repo, mock_session
):
    import io
    import zipfile

    # Create mock zip with imsmanifest.xml
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        manifest_xml = """<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="standard_scorm" version="1.2" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <organizations>
    <organization>
      <title>Standard SCORM Title</title>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r1" href="index_lms.html" />
  </resources>
</manifest>"""
        z.writestr("imsmanifest.xml", manifest_xml)
        z.writestr("index_lms.html", "<html></html>")

    mock_s3 = AsyncMock()
    mock_s3.download_file.return_value = zip_buffer.getvalue()
    mock_s3.endpoint_url = "http://localhost:9000"
    mock_s3.bucket_name = "lms-media"
    mock_s3._to_public_url = lambda url: url
    mock_s3_service.return_value = mock_s3

    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    with pytest.raises(ValueError, match="Level 2"):
        await catalog_usecase.import_course_from_scorm(
            scorm_object_key="some-key", course_id="c1", current_user=None
        )


@pytest.mark.asyncio
@patch("src.modules.catalog.application.collaborator_usecase.async_session_scope")
async def test_remove_course_collaborator_audit_log(
    mock_scope, catalog_usecase, mock_repo, mock_session
):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    mock_repo.get_course_detail.return_value = MagicMock(
        owner_id="owner_1", co_instructor_ids=[]
    )
    mock_repo.remove_course_collaborator.return_value = True

    owner = CurrentUser(
        id="owner_1", email="owner@test.com", full_name="Owner", role="INSTRUCTOR"
    )
    res = await catalog_usecase.remove_course_collaborator(
        course_id="c1", user_id="user_2", current_user=owner
    )
    assert res["success"] is True
    mock_repo.create_audit_log.assert_called_once()
    call_kwargs = mock_repo.create_audit_log.call_args[1]
    assert call_kwargs["action"] == "COURSE_AUDIT_ACTION_COLLABORATOR_REMOVED"
    assert call_kwargs["target_user_id"] == "user_2"
