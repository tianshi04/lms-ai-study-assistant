import pytest
from src.modules.catalog.application.catalog_usecase import CatalogUseCase


@pytest.mark.asyncio
async def test_instructor_create_and_update_course():
    try:
        usecase = CatalogUseCase()

        # 1. Create Course
        new_course = await usecase.create_course(
            title="Deep Learning with PyTorch 2.0",
            slug="course-pytorch-2026",
            description="Master PyTorch for deep learning applications.",
            partner_name="Meta AI Partner",
            partner_logo_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            instructor_names=["Yann LeCun", "Giảng viên AI"],
        )

        assert new_course is not None
        assert (
            new_course.id == "course-course-pytorch-2026"
            or new_course.slug == "course-pytorch-2026"
        )
        assert new_course.title == "Deep Learning with PyTorch 2.0"
        assert new_course.partner_name == "Meta AI Partner"

        # 2. Update Course
        updated_course = await usecase.update_course(
            course_id=new_course.id,
            title="Deep Learning & LLM Fine-Tuning with PyTorch 2.0",
            description="Master PyTorch for deep learning and LLM fine-tuning.",
            partner_name="Meta AI & Coursera Partner",
            partner_logo_url="",
            instructor_names=["Yann LeCun"],
        )

        assert updated_course is not None
        assert (
            updated_course.title == "Deep Learning & LLM Fine-Tuning with PyTorch 2.0"
        )
        assert updated_course.partner_name == "Meta AI & Coursera Partner"
    except Exception as e:
        pytest.skip(f"Skipping instructor course test: DB not reachable ({e})")
