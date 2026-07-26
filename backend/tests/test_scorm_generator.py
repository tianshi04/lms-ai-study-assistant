"""Integration test for generated SCORM packages unpacking, processing, and tracking."""

import pytest

from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from scripts.generate_scorm_packages import (
    MODULAR_DIR,
    SINGLE_DIR,
    build_modular_scorm_packages,
    build_single_scorm_package,
)


@pytest.mark.asyncio(loop_scope="function")
async def test_generated_scorm_packages_exist_and_valid():
    """Verify that SCORM generator produces valid ZIP packages on disk."""
    build_single_scorm_package()
    build_modular_scorm_packages()

    single_zip = SINGLE_DIR / "javascript_basics_full_scorm12.zip"
    assert single_zip.exists()
    assert single_zip.stat().st_size > 0

    modular_zips = list(MODULAR_DIR.glob("*.zip"))
    assert len(modular_zips) == 2
    for zip_file in modular_zips:
        assert zip_file.stat().st_size > 0


@pytest.mark.asyncio(loop_scope="function")
async def test_scorm_unpack_and_tracking_flow():
    """Verify full end-to-end flow of uploading a generated modular SCORM ZIP package."""
    catalog_usecase = CatalogUseCase()
    learning_usecase = LearningUseCase()
    s3_service = get_s3_storage_service()
    await s3_service.ensure_bucket_exists()

    # 1. Create test course, module, and lesson
    import uuid

    rand_suffix = uuid.uuid4().hex[:6]
    course = await catalog_usecase.create_course(
        title=f"JS Basics SCORM Test Course {rand_suffix}",
        slug=f"js-basics-scorm-test-{rand_suffix}",
        description="Testing generated modular SCORM package upload.",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
        instructor_names=["Instructor Test"],
    )

    week_module = await catalog_usecase.create_week_module(
        course_id=course.id,
        week_number=1,
        title="Week 1: Foundations",
        summary="Introduction to JS",
    )

    lesson = await catalog_usecase.create_lesson(
        course_id=course.id,
        week_module_id=week_module.id,
        title="Lesson 1: Welcome & Course Guide",
        estimated_minutes=15,
    )

    # 2. Pick scorm_01_welcome.zip from generated samples
    welcome_zip_path = MODULAR_DIR / "scorm_01_welcome.zip"
    assert welcome_zip_path.exists()
    zip_bytes = welcome_zip_path.read_bytes()

    item_id = f"test-item-{uuid.uuid4().hex[:6]}"
    object_key = f"scorm/tmp/{item_id}_welcome.zip"

    # Upload temporary zip object to MinIO
    await s3_service.upload_file(
        file_bytes=zip_bytes,
        object_key=object_key,
        content_type="application/zip",
    )

    # 3. Process SCORM package (Unpack & Create Learning Item)
    item = await catalog_usecase.process_scorm_package(
        course_id=course.id,
        lesson_id=lesson.id,
        title="Welcome & Course Guide SCORM",
        estimated_minutes=15,
        object_key=object_key,
    )

    assert item is not None
    assert item.scorm_entry_html == "index.html"
    assert item.scorm_package_path.startswith("scorm/packages/")

    # Verify extracted index.html exists in S3/MinIO
    unpacked_html_key = f"{item.scorm_package_path}/index.html"
    extracted_bytes = await s3_service.download_file(unpacked_html_key)
    assert len(extracted_bytes) > 0
    assert b"SCORM 1.2" in extracted_bytes

    # 4. Test SCORM tracking save and get
    user_id = f"student-{uuid.uuid4().hex[:6]}"
    cmi_data = {
        "cmi.core.lesson_status": "passed",
        "cmi.core.score.raw": "100",
        "cmi.core.lesson_location": "1",
    }

    save_res = await learning_usecase.save_scorm_tracking(
        user_id=user_id,
        item_id=item.id,
        cmi_data=cmi_data,
    )
    assert save_res is not None

    tracking_entity = await learning_usecase.get_scorm_tracking(
        user_id=user_id,
        item_id=item.id,
    )
    assert tracking_entity is not None
    assert tracking_entity.cmi_data.get("cmi.core.lesson_status") == "passed"
    assert tracking_entity.cmi_data.get("cmi.core.score.raw") == "100"
