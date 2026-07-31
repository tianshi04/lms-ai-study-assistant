import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.gen.partner.v1 import partner_pb as pb
from src.modules.partner.application.partner_usecase import PartnerUseCase
from src.modules.partner.domain.entities import Partner
from src.modules.partner.presentation.partner_handler import (
    PartnerHandler,
    _to_pb_partner,
)
from src.shared.auth import CurrentUser, set_current_user, clear_current_user


def test_partner_entity_validation():
    # Valid initialization
    p = Partner(id="p1", name="Test Partner", slug="test-partner")
    assert p.id == "p1"
    assert p.name == "Test Partner"
    assert p.slug == "test-partner"
    assert p.created_at != ""
    assert p.updated_at != ""

    # Invalid name
    with pytest.raises(ValueError, match="Tên đối tác không được để trống"):
        Partner(id="p2", name="", slug="valid-slug")

    # Invalid slug
    with pytest.raises(ValueError, match="Slug đối tác không được để trống"):
        Partner(id="p3", name="Valid Name", slug="   ")


def test_partner_entity_update_details():
    p = Partner(id="p1", name="Original Name", slug="original-slug")
    p.update_details(name="Updated Name", description="New description")
    assert p.name == "Updated Name"
    assert p.description == "New description"
    assert p.slug == "original-slug"

    with pytest.raises(ValueError, match="Tên đối tác không được để trống"):
        p.update_details(name="   ")

    with pytest.raises(ValueError, match="Slug đối tác không được để trống"):
        p.update_details(slug="")


@pytest.mark.asyncio
async def test_usecase_create_partner_permission_denied():
    usecase = PartnerUseCase()
    non_admin = CurrentUser(id="u1", role="LEARNER")
    with pytest.raises(PermissionError, match="Quyền truy cập bị từ chối"):
        await usecase.create_partner(
            name="New Partner", slug="new-partner", current_user=non_admin
        )


@pytest.mark.asyncio
async def test_usecase_create_partner_success():
    mock_repo = AsyncMock()
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.side_effect = lambda p: p

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")
    test_slug = f"stanford-test-{uuid.uuid4().hex[:6]}"

    res = await usecase.create_partner(
        name="Stanford Test Partner",
        slug=test_slug,
        description="Stanford Univ",
        current_user=admin,
    )
    assert res.name == "Stanford Test Partner"
    assert res.slug == test_slug
    mock_repo.create.assert_called_once()


@pytest.mark.asyncio
async def test_usecase_create_partner_duplicate_slug():
    existing_p = Partner(id="p-existing", name="Existing", slug="stanford-online")
    mock_repo = AsyncMock()
    mock_repo.get_by_slug.return_value = existing_p

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")

    with pytest.raises(ValueError, match="đã tồn tại trong hệ thống"):
        await usecase.create_partner(
            name="Stanford", slug="stanford-online", current_user=admin
        )


@pytest.mark.asyncio
async def test_usecase_update_partner_not_found():
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")

    with pytest.raises(KeyError, match="Không tìm thấy đối tác"):
        await usecase.update_partner(
            partner_id="nonexistent", name="New Name", current_user=admin
        )


@pytest.mark.asyncio
async def test_usecase_update_partner_duplicate_slug():
    p1 = Partner(id="p1", name="Partner 1", slug="p1-slug")
    p2 = Partner(id="p2", name="Partner 2", slug="p2-slug")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = p1
    mock_repo.get_by_slug.return_value = p2

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")

    with pytest.raises(ValueError, match="đã tồn tại trong hệ thống"):
        await usecase.update_partner(
            partner_id="p1", slug="p2-slug", current_user=admin
        )


@pytest.mark.asyncio
async def test_usecase_get_and_list_and_delete_partner():
    p1 = Partner(id="p1", name="Partner 1", slug="p1-slug")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = p1
    mock_repo.get_by_slug.return_value = None
    mock_repo.list_all.return_value = [p1]
    mock_repo.delete.return_value = True

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")

    got = await usecase.get_partner("p1")
    assert got.id == "p1"

    all_p = await usecase.list_partners()
    assert len(all_p) == 1

    deleted = await usecase.delete_partner("p1", current_user=admin)
    assert deleted is True


@pytest.mark.asyncio
async def test_partner_handler():
    mock_usecase = AsyncMock()
    p1 = Partner(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        description="Desc",
        allowed_domains=["stanford.edu"],
    )
    mock_usecase.create_partner.return_value = p1
    mock_usecase.get_partner.return_value = p1
    mock_usecase.list_partners.return_value = [p1]
    mock_usecase.update_partner.return_value = p1
    mock_usecase.delete_partner.return_value = True

    handler = PartnerHandler(use_case=mock_usecase)
    mock_ctx = MagicMock()

    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")
    set_current_user(admin)
    try:
        # Create
        req_create = pb.CreatePartnerRequest(
            name="Stanford Online", slug="stanford-online"
        )
        res_create = await handler.create_partner(req_create, mock_ctx)
        assert res_create.partner is not None
        assert res_create.partner.name == "Stanford Online"
        assert list(res_create.partner.allowed_domains) == ["stanford.edu"]

        # Get
        req_get = pb.GetPartnerRequest(id="p1")
        res_get = await handler.get_partner(req_get, mock_ctx)
        assert res_get.partner is not None
        assert res_get.partner.id == "p1"

        # List
        req_list = pb.ListPartnersRequest()
        res_list = await handler.list_partners(req_list, mock_ctx)
        assert len(res_list.partners) == 1

        # Update
        req_update = pb.UpdatePartnerRequest(id="p1", name="Updated")
        res_update = await handler.update_partner(req_update, mock_ctx)
        assert res_update.partner is not None
        assert res_update.partner.id == "p1"

        # Rotate Key Pair
        mock_usecase.rotate_key_pair.return_value = (
            "-----BEGIN PUBLIC KEY-----\nNEW_KEY\n-----END PUBLIC KEY-----"
        )
        req_rotate = pb.RotatePartnerKeyPairRequest(partner_id="p1")
        res_rotate = await handler.rotate_partner_key_pair(req_rotate, mock_ctx)
        assert res_rotate.public_key_pem.startswith("-----BEGIN PUBLIC KEY-----")

        # Delete
        req_del = pb.DeletePartnerRequest(id="p1")
        res_del = await handler.delete_partner(req_del, mock_ctx)
        assert res_del.success is True

        # Helper
        pb_obj = _to_pb_partner(p1)
        assert pb_obj.id == "p1"
    finally:
        clear_current_user()


@pytest.mark.asyncio
async def test_usecase_rotate_key_pair_success():
    p1 = Partner(id="p1", name="Stanford Online", slug="stanford-online")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = p1
    mock_repo.update.side_effect = lambda p: p

    usecase = PartnerUseCase(repo=mock_repo)
    admin = CurrentUser(id="admin1", role="SUPER_ADMIN")

    new_pem = await usecase.rotate_key_pair("p1", current_user=admin)
    assert new_pem.startswith("-----BEGIN PUBLIC KEY-----")
    assert new_pem.endswith("-----END PUBLIC KEY-----\n") or new_pem.endswith(
        "-----END PUBLIC KEY-----"
    )
    mock_repo.update.assert_called_once()


@pytest.mark.asyncio
async def test_usecase_rotate_key_pair_auto_resolve_domain():
    p1 = Partner(
        id="p1",
        name="Stanford Online",
        slug="stanford-online",
        allowed_domains=["stanford.edu"],
    )
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None
    mock_repo.get_by_slug.return_value = None
    mock_repo.list_all.return_value = [p1]
    mock_repo.update.side_effect = lambda p: p

    usecase = PartnerUseCase(repo=mock_repo)
    org_admin = CurrentUser(
        id="p_admin1",
        email="alice@stanford.edu",
        role="INSTRUCTOR",
        active_org_id="partner_stanford",
        org_role="Organization Admin",
    )

    new_pem = await usecase.rotate_key_pair("", current_user=org_admin)
    assert new_pem.startswith("-----BEGIN PUBLIC KEY-----")
    mock_repo.update.assert_called_once()
