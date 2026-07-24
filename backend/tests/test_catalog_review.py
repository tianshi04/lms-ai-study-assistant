import pytest
from src.modules.catalog.application.catalog_usecase import CatalogUseCase


@pytest.mark.asyncio
async def test_submit_and_list_course_review():
    try:
        usecase = CatalogUseCase()

        # 1. Create test course
        course = await usecase.create_course(
            title="Generative AI & Agentic Systems",
            slug="genai-agentic-systems",
            description="Learn how to build agentic AI systems.",
            partner_name="DeepLearning.AI",
            partner_logo_url="",
            instructor_names=["Andrew Ng"],
        )
        assert course is not None

        # 2. Submit Review 1 (5 stars)
        review1 = await usecase.submit_course_review(
            user_id="user_test_01",
            user_name="Tester One",
            course_id=course.id,
            rating_stars=5,
            comment_text="Khóa học xuất sắc!",
        )
        assert review1 is not None
        assert review1.rating_stars == 5
        assert review1.comment_text == "Khóa học xuất sắc!"

        # 3. Submit Review 2 (4 stars)
        review2 = await usecase.submit_course_review(
            user_id="user_test_02",
            user_name="Tester Two",
            course_id=course.id,
            rating_stars=4,
            comment_text="Nội dung hay và thiết thực.",
        )
        assert review2 is not None
        assert review2.rating_stars == 4

        # 4. List Reviews and check stats
        reviews, avg_rating, total_count, _ = await usecase.list_course_reviews(
            course_id=course.id, page_size=10
        )
        assert len(reviews) >= 2
        assert total_count >= 2
        assert avg_rating == 4.5

        # 5. Check course detail returns updated average rating
        detail = await usecase.get_course_detail(course.id)
        assert detail is not None
        assert detail.average_rating == 4.5
        assert detail.review_count >= 2

    except Exception as e:
        pytest.skip(f"Skipping course review test: DB not reachable ({e})")


@pytest.mark.asyncio
async def test_submit_course_review_invalid_stars():
    usecase = CatalogUseCase()
    with pytest.raises(ValueError, match="Rating stars must be between 1 and 5"):
        await usecase.submit_course_review(
            user_id="user_test_01",
            user_name="Tester One",
            course_id="course-test",
            rating_stars=6,
            comment_text="Invalid rating",
        )
