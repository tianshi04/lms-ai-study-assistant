import pytest
from unittest.mock import AsyncMock, patch
from src.modules.identity.application.identity_usecase import IdentityUseCase
from src.modules.identity.domain.entities import User, UserRole
from src.shared.auth import CurrentUserContext


@pytest.mark.asyncio
async def test_add_organization_member_success():
    use_case = IdentityUseCase()
    admin_user = CurrentUserContext(id="admin_1", role="ADMIN")
    mock_user = User(
        id="user_123",
        email="testmember@example.com",
        full_name="Test Member",
        role=UserRole.INSTRUCTOR,
    )

    with (
        patch(
            "src.modules.identity.infrastructure.repository.IdentityRepository.get_by_email",
            new_callable=AsyncMock,
            return_value=mock_user,
        ),
        patch(
            "src.modules.identity.infrastructure.repository.OrganizationRepository.add_member",
            new_callable=AsyncMock,
        ) as mock_add_member,
        patch(
            "src.modules.identity.infrastructure.repository.OrganizationRepository.list_members_with_details",
            new_callable=AsyncMock,
            return_value=[
                {
                    "member_id": "member_001",
                    "user_id": "user_123",
                    "email": "testmember@example.com",
                    "full_name": "Test Member",
                    "avatar_url": "",
                    "role_id": "role_org_instructor",
                    "role_name": "Giảng viên Org",
                    "status": "ACTIVE",
                    "joined_at": "2026-08-03",
                }
            ],
        ),
    ):
        result = await use_case.add_organization_member(
            email="testmember@example.com",
            role_id="role_org_instructor",
            organization_id="org_default",
            current_user=admin_user,
        )

        assert result["user_id"] == "user_123"
        assert result["email"] == "testmember@example.com"
        assert result["role_id"] == "role_org_instructor"
        mock_add_member.assert_called_once_with(
            user_id="user_123",
            org_id="org_default",
            role_id="role_org_instructor",
            status="ACTIVE",
        )


@pytest.mark.asyncio
async def test_add_organization_member_permission_denied():
    use_case = IdentityUseCase()
    learner_user = CurrentUserContext(id="learner_1", role="LEARNER")

    with (
        patch(
            "src.modules.identity.infrastructure.repository.OrganizationRepository.get_effective_permissions",
            new_callable=AsyncMock,
            return_value=(None, set()),
        ),
        patch(
            "src.modules.identity.infrastructure.repository.OrganizationRepository.get_member",
            new_callable=AsyncMock,
            return_value=None,
        ),
    ):
        with pytest.raises(PermissionError, match="chưa thuộc"):
            await use_case.add_organization_member(
                email="test@example.com",
                role_id="role_org_instructor",
                organization_id="org_default",
                current_user=learner_user,
            )


@pytest.mark.asyncio
async def test_add_organization_member_user_not_found():
    use_case = IdentityUseCase()
    admin_user = CurrentUserContext(id="admin_1", role="ADMIN")

    with patch(
        "src.modules.identity.infrastructure.repository.IdentityRepository.get_by_email",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(ValueError, match="Không tìm thấy người dùng với email"):
            await use_case.add_organization_member(
                email="nonexistent@example.com",
                role_id="role_org_instructor",
                organization_id="org_default",
                current_user=admin_user,
            )


@pytest.mark.asyncio
async def test_list_and_remove_organization_members():
    use_case = IdentityUseCase()
    admin_user = CurrentUserContext(id="admin_1", role="ADMIN")

    with patch(
        "src.modules.identity.infrastructure.repository.OrganizationRepository.list_members_with_details",
        new_callable=AsyncMock,
        return_value=[
            {
                "member_id": "member_001",
                "user_id": "user_123",
                "email": "testmember@example.com",
                "full_name": "Test Member",
                "avatar_url": "",
                "role_id": "role_org_instructor",
                "role_name": "Giảng viên Org",
                "status": "ACTIVE",
                "joined_at": "2026-08-03",
            }
        ],
    ):
        members = await use_case.list_organization_members(
            "org_default", current_user=admin_user
        )
        assert len(members) == 1
        assert members[0]["user_id"] == "user_123"

    with patch(
        "src.modules.identity.infrastructure.repository.OrganizationRepository.remove_member",
        new_callable=AsyncMock,
        return_value=True,
    ):
        success = await use_case.remove_organization_member(
            "user_123", "org_default", current_user=admin_user
        )
        assert success is True


@pytest.mark.asyncio
async def test_list_my_organizations_success():
    use_case = IdentityUseCase()
    current_user = CurrentUserContext(id="user_123", role="INSTRUCTOR")

    expected_orgs = [
        {
            "id": "partner_community",
            "name": "Coursera Project Network",
            "slug": "partner_community",
            "avatar_url": "",
            "role_in_org": "INSTRUCTOR",
            "status": "ACTIVE",
            "joined_at": "2026-08-01",
        }
    ]

    with patch(
        "src.modules.identity.infrastructure.repository.OrganizationRepository.list_user_organization_details",
        new_callable=AsyncMock,
        return_value=expected_orgs,
    ):
        result = await use_case.list_my_organizations(current_user=current_user)
        assert len(result) == 1
        assert result[0]["id"] == "partner_community"
        assert result[0]["role_in_org"] == "INSTRUCTOR"
