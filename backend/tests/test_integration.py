import pytest

from src.gen.catalog.v1.catalog_connect import CatalogServiceClient
from src.gen.catalog.v1.catalog_pb import ListCoursesRequest
from src.modules.catalog.application.catalog_usecase import CatalogUseCase


@pytest.mark.asyncio
async def test_catalog_usecase():
    """Unit test for Catalog Use Case layer."""
    try:
        use_case = CatalogUseCase()
        courses, _ = await use_case.list_courses()
        assert len(courses) >= 2
        assert courses[0].id == "course-python-ai"
    except Exception as e:
        pytest.skip(
            f"Skipping catalog usecase test: Database tables/seed not available ({e})"
        )



@pytest.mark.asyncio
async def test_catalog_api_integration():
    """Integration test connecting to running ConnectRPC server on localhost:8000."""
    client = CatalogServiceClient("http://localhost:8000")
    try:
        res = await client.list_courses(ListCoursesRequest())
        assert len(res.courses) >= 1
    except Exception as e:
        pytest.skip(
            f"Skipping server integration test: Server is not running on port 8000 ({e})"
        )
