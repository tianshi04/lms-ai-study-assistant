import pytest
import io
import zipfile
from src.modules.catalog.application.catalog_usecase import CatalogUseCase


@pytest.mark.asyncio
async def test_scorm_export_and_import_flow(monkeypatch):
    """Test full cycle: Exporting a Native Course to SCORM ZIP and importing it back."""
    usecase = CatalogUseCase()
    import uuid

    rand_suffix = uuid.uuid4().hex[:6]
    course = await usecase.create_course(
        title="Python Fullstack Masterclass",
        slug=f"python-fullstack-masterclass-{rand_suffix}",
        description="Master Python from zero to hero",
        partner_name="AI Academy",
        partner_logo_url="",
        instructor_names=["Dr. AI"],
    )

    module = await usecase.create_week_module(
        course_id=course.id,
        week_number=1,
        title="Module 1: Getting Started",
        summary="Introduction to Python syntax",
    )

    lesson = await usecase.create_lesson(
        course_id=course.id,
        week_module_id=module.id,
        title="Lesson 1.1: Hello World",
        estimated_minutes=15,
    )

    item1 = await usecase.create_learning_item(
        course_id=course.id,
        lesson_id=lesson.id,
        title="Overview Article",
        item_type=2,  # READING
        estimated_minutes=10,
        video_url="",
        reading_markdown="# Welcome to Python\nPython is awesome!",
    )

    item2 = await usecase.create_learning_item(
        course_id=course.id,
        lesson_id=lesson.id,
        title="Setup Guide Video",
        item_type=1,  # VIDEO
        estimated_minutes=5,
        video_url="https://sample.com/setup.mp4",
        reading_markdown="",
    )

    _ = await usecase.create_learning_item(
        course_id=course.id,
        lesson_id=lesson.id,
        title="Practice Quiz Item",
        item_type=3,  # PRACTICE_QUIZ
        estimated_minutes=10,
        video_url="",
        reading_markdown="",
    )

    _ = await usecase.create_learning_item(
        course_id=course.id,
        lesson_id=lesson.id,
        title="Graded Exam",
        item_type=4,  # GRADED_QUIZ
        estimated_minutes=20,
        video_url="",
        reading_markdown="",
    )

    # Mock S3 storage download & upload in memory
    storage_mock = {}

    class MockS3Service:
        async def ensure_bucket_exists(self, bucket_name=None):
            pass

        async def upload_file(
            self, file_bytes, object_key, content_type=None, bucket_name=None
        ):
            storage_mock[object_key] = file_bytes
            return object_key

        async def download_file(self, object_key, bucket_name=None):
            if object_key not in storage_mock:
                raise ValueError(f"Object {object_key} not found")
            return storage_mock[object_key]

        async def generate_presigned_download_url(self, object_key):
            return f"https://mock-s3.local/{object_key}"

    mock_s3 = MockS3Service()
    monkeypatch.setattr(
        "src.modules.catalog.application.catalog_usecase.get_s3_storage_service",
        lambda: mock_s3,
    )

    # 2. Test Export Course to SCORM 1.2 ZIP
    download_url, object_key = await usecase.export_course_to_scorm(course.id)
    assert object_key == f"scorm/exports/{course.id}_scorm12.zip"
    assert object_key in storage_mock

    # Inspect generated ZIP content
    zip_bytes = storage_mock[object_key]
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        namelist = zf.namelist()
        assert "imsmanifest.xml" in namelist
        assert f"item_{item1.id}.html" in namelist
        assert f"item_{item2.id}.html" in namelist

        manifest_xml = zf.read("imsmanifest.xml").decode("utf-8")
        assert "Python Fullstack Masterclass" in manifest_xml
        assert "Overview Article" in manifest_xml

    # 3. Test Import Course from SCORM ZIP back into LMS
    imported_course, _ = await usecase.import_course_from_scorm(
        scorm_object_key=object_key,
        course_id="",
    )

    assert imported_course.title == "Python Fullstack Masterclass"
    assert len(imported_course.week_modules) >= 1
    imported_module = imported_course.week_modules[0]
    assert len(imported_module.lessons) >= 1
