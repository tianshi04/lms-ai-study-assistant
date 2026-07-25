import pytest
from src.modules.catalog.application.catalog_usecase import CatalogUseCase


@pytest.fixture
def catalog_usecase():
    return CatalogUseCase()


@pytest.mark.asyncio
async def test_category_crud(catalog_usecase: CatalogUseCase):
    # 1. Create a category
    cat = await catalog_usecase.create_category(
        name="New Subject Test", category_type="SUBJECT"
    )
    assert cat is not None
    assert cat.name == "New Subject Test"
    assert cat.slug == "new-subject-test"
    assert cat.type == "SUBJECT"

    # 2. List categories
    cats = await catalog_usecase.list_categories(type_filter="SUBJECT")
    assert len(cats) >= 1
    assert any(c.id == cat.id for c in cats)

    # 3. List categories with no filter
    all_cats = await catalog_usecase.list_categories()
    assert len(all_cats) >= len(cats)

    # 4. Delete category
    success = await catalog_usecase.delete_category(cat.id)
    assert success is True

    # 5. Verify deletion
    cats_after = await catalog_usecase.list_categories(type_filter="SUBJECT")
    assert not any(c.id == cat.id for c in cats_after)
