from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.partner.domain.entities import Partner
from src.modules.partner.infrastructure.models import PartnerModel
from src.modules.partner.infrastructure.repository import SQLAlchemyPartnerRepository


@pytest.mark.asyncio
async def test_partner_repository_get_by_id_and_slug():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    model = PartnerModel(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        description="Desc",
        logo_url="https://example.com/logo.png",
        banner_url="https://example.com/banner.png",
        website_url="https://example.com",
        allowed_domains=["stanford.edu"],
        signature_image_url="",
        signer_name="Dean",
        signer_title="Dean",
        public_key_pem="pem",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    mock_result.scalar_one_or_none.return_value = model
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyPartnerRepository(mock_session)

    # Get by id
    p_by_id = await repo.get_by_id("p1")
    assert p_by_id is not None
    assert p_by_id.id == "p1"
    assert p_by_id.name == "Stanford Online"
    assert p_by_id.allowed_domains == ["stanford.edu"]

    # Get by slug
    p_by_slug = await repo.get_by_slug("stanford-online")
    assert p_by_slug is not None
    assert p_by_slug.slug == "stanford-online"

    # Not found
    mock_result.scalar_one_or_none.return_value = None
    assert await repo.get_by_id("nonexistent") is None
    assert await repo.get_by_slug("nonexistent") is None


@pytest.mark.asyncio
async def test_partner_repository_create():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()

    repo = SQLAlchemyPartnerRepository(mock_session)
    p = Partner(
        id="p2",
        name="DeepLearning.AI",
        slug="deeplearning-ai",
        description="AI education",
        allowed_domains=["deeplearning.ai"],
    )

    created = await repo.create(p)
    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
    assert created.id == "p2"
    assert created.name == "DeepLearning.AI"


@pytest.mark.asyncio
async def test_partner_repository_update_found_and_not_found():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    model = PartnerModel(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        description="Desc",
        logo_url="",
        banner_url="",
        website_url="",
        allowed_domains=[],
        signature_image_url="",
        signer_name="",
        signer_title="",
        public_key_pem="",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    mock_result.scalar_one_or_none.return_value = model
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyPartnerRepository(mock_session)
    p = Partner(
        id="p1",
        name="Stanford Online Updated",
        slug="stanford-online",
        description="Updated Desc",
    )

    updated = await repo.update(p)
    assert model.name == "Stanford Online Updated"
    assert model.description == "Updated Desc"
    mock_session.flush.assert_called_once()
    assert updated.name == "Stanford Online Updated"

    # Not found
    mock_result.scalar_one_or_none.return_value = None
    with pytest.raises(KeyError, match="Không tìm thấy đối tác với ID"):
        await repo.update(p)


@pytest.mark.asyncio
async def test_partner_repository_list_all():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    model = PartnerModel(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        description="",
        logo_url="",
        banner_url="",
        website_url="",
        allowed_domains=[],
        signature_image_url="",
        signer_name="",
        signer_title="",
        public_key_pem="",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [model]
    mock_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_result

    repo = SQLAlchemyPartnerRepository(mock_session)
    partners = await repo.list_all()
    assert len(partners) == 1
    assert partners[0].id == "p1"


@pytest.mark.asyncio
async def test_partner_repository_delete():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    model = PartnerModel(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        description="",
        logo_url="",
        banner_url="",
        website_url="",
        allowed_domains=[],
        signature_image_url="",
        signer_name="",
        signer_title="",
        public_key_pem="",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    mock_result.scalar_one_or_none.return_value = model
    mock_session.execute.return_value = mock_result
    mock_session.delete = AsyncMock()

    repo = SQLAlchemyPartnerRepository(mock_session)

    # Delete existing
    del_res = await repo.delete("p1")
    assert del_res is True
    mock_session.delete.assert_called_once_with(model)

    # Delete non-existent
    mock_result.scalar_one_or_none.return_value = None
    assert await repo.delete("p999") is False
