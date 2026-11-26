"""Unit tests for Partner / Organization Dashboard domain invariants, use cases, and handlers."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.catalog.v1 import catalog_pb
from src.gen.certificate.v1 import certificate_pb as cert_pb
from src.gen.identity.v1 import identity_pb
from src.gen.partner.v1 import partner_pb
from src.modules.catalog.application.admin_catalog_usecase import AdminCatalogUseCase
from src.modules.catalog.application.course_usecase import CourseUseCase
from src.modules.catalog.domain import (
    AdminCourseSummaryRow,
    Course,
    CourseStatus,
    OrganizationCatalogStats,
)
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application.certificate_usecase import CertificateUseCase
from src.modules.certificate.domain import (
    AdminCertificatesPage,
    AdminCertificateSummary,
    OrganizationCertificateStats,
)
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.identity.application.auth_usecase import AuthUseCase
from src.modules.identity.application.enterprise_usecase import EnterpriseLicenseUseCase
from src.modules.identity.application.organization_usecase import OrganizationUseCase
from src.modules.identity.domain import (
    EnterpriseLicense,
    Organization,
    OrganizationIdentityStats,
    SeatHolderUserRow,
)
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.partner.application.partner_usecase import PartnerUseCase
from src.modules.partner.domain import Partner
from src.modules.partner.presentation.partner_handler import PartnerHandler
from src.shared.auth import CurrentUser, clear_current_user, set_current_user


def test_partner_rotate_public_key_archives_previous_and_rejects_empty():
    partner = Partner(
        id="partner-stanford",
        name="Stanford Online",
        slug="stanford-online",
        public_key_pem="-----BEGIN PUBLIC KEY-----\nOLD_KEY\n-----END PUBLIC KEY-----",
    )

    with pytest.raises(ValueError, match="Khóa công khai"):
        partner.rotate_public_key("   ")

    partner.rotate_public_key(
        "-----BEGIN PUBLIC KEY-----\nNEW_KEY\n-----END PUBLIC KEY-----",
        rotated_at="2026-11-11T00:00:00+00:00",
    )
    assert "NEW_KEY" in partner.public_key_pem
    assert len(partner.historical_public_keys) == 1
    assert "OLD_KEY" in partner.historical_public_keys[0]
    assert partner.updated_at == "2026-11-11T00:00:00+00:00"


def test_partner_matches_email_domain_strict_subdomain_boundary():
    partner = Partner(
        id="partner-stanford",
        name="Stanford Online",
        slug="stanford-online",
        allowed_domains=["@stanford.edu", "alumni.stanford.org"],
    )
    assert partner.matches_email_domain("alice@stanford.edu") is True
    assert partner.matches_email_domain("bob@cs.stanford.edu") is True
    assert partner.matches_email_domain("carol@alumni.stanford.org") is True
    assert partner.matches_email_domain("mallory@evilstanford.edu") is False
    assert partner.matches_email_domain("invalid-email") is False


def test_enterprise_license_revocation_eligibility_br_access_003():
    now = datetime(2026, 11, 11, 12, 0, tzinfo=UTC)
    recent_iso = (now - timedelta(days=5)).isoformat()
    expired_grace_iso = (now - timedelta(days=35)).isoformat()

    eligible = EnterpriseLicense.evaluate_revocation_eligibility(
        seat_assigned_at=recent_iso,
        max_progress_percent=19.9,
        now=now,
    )
    assert eligible.can_revoke is True

    blocked = EnterpriseLicense.evaluate_revocation_eligibility(
        seat_assigned_at=recent_iso,
        max_progress_percent=20.0,
        now=now,
    )
    assert blocked.can_revoke is False
    assert ">= 20% trong 30 ngày đầu" in blocked.reason

    after_grace = EnterpriseLicense.evaluate_revocation_eligibility(
        seat_assigned_at=expired_grace_iso,
        max_progress_percent=85.0,
        now=now,
    )
    assert after_grace.can_revoke is True


@pytest.mark.asyncio
async def test_partner_usecase_org_owner_self_service_and_handler_not_found():
    partner = Partner(
        id="partner-stanford",
        name="Stanford Online",
        slug="stanford-online",
        public_key_pem="-----BEGIN PUBLIC KEY-----\nINITIAL\n-----END PUBLIC KEY-----",
    )
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = partner
    mock_repo.get_by_slug.return_value = partner
    mock_repo.update.side_effect = lambda p: p

    mock_org_repo = AsyncMock()
    mock_org_repo.get_organization_by_id.return_value = Organization(
        id="partner-stanford", name="Stanford Online", slug="stanford-online"
    )

    org_owner = CurrentUser(
        id="owner-stanford",
        email="owner@stanford.edu",
        role="USER_ROLE_INSTRUCTOR",
    )

    with patch(
        "src.modules.partner.application.partner_usecase.enforce_strict_organization_permission",
        new_callable=AsyncMock,
    ) as mock_enforce:
        usecase = PartnerUseCase(
            repo=mock_repo,
            org_repo_factory=lambda _s: mock_org_repo,
        )
        updated = await usecase.update_partner(
            partner_id="stanford-online",
            name="Stanford Online Updated",
            signer_name="Prof. Andrew",
            current_user=org_owner,
        )
        assert updated.name == "Stanford Online Updated"
        assert updated.signer_name == "Prof. Andrew"
        mock_enforce.assert_awaited_once()
        mock_org_repo.save_organization.assert_awaited_once()

        new_pem = await usecase.rotate_key_pair(
            "stanford-online", current_user=org_owner
        )
        assert new_pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert len(partner.historical_public_keys) == 1

    mock_uc = AsyncMock()
    mock_uc.get_partner.side_effect = KeyError("Không tìm thấy đối tác")
    handler = PartnerHandler(use_case=mock_uc)
    with pytest.raises(ConnectError) as exc_info:
        await handler.get_partner(
            partner_pb.GetPartnerRequest(id="missing"), MagicMock()
        )
    assert exc_info.value.code == Code.NOT_FOUND


@pytest.mark.asyncio
async def test_auth_register_auto_assigns_enterprise_seat_for_allowed_domain():
    mock_session = AsyncMock()
    mock_scope = MagicMock()
    mock_scope.return_value.__aenter__.return_value = mock_session

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_email.return_value = None
    mock_user_repo.save.side_effect = lambda u: u

    mock_org_repo = AsyncMock()
    mock_org_repo.get_organization_by_id.return_value = Organization(
        id="partner-stanford",
        name="Stanford Online",
        slug="stanford-online",
    )

    mock_license_repo = AsyncMock()
    mock_license_repo.get_active_available_license_for_org.return_value = (
        EnterpriseLicense(
            key="ENT-STANFORD-2026",
            partner_name="Stanford Online",
            organization_id="partner-stanford",
            total_seats=300,
            used_seats=5,
            is_active=True,
        )
    )
    mock_license_repo.increment_enterprise_seat.return_value = True

    mock_partner_repo = AsyncMock()
    mock_partner_repo.list_all.return_value = [
        Partner(
            id="partner-stanford",
            name="Stanford Online",
            slug="stanford-online",
            allowed_domains=["stanford.edu"],
        )
    ]

    with (
        patch(
            "src.modules.identity.application.auth_usecase.database.async_session_scope",
            mock_scope,
        ),
        patch(
            "src.modules.identity.application.auth_usecase.repo_module.IdentityRepository",
            return_value=mock_user_repo,
        ),
        patch(
            "src.modules.identity.application.auth_usecase.repo_module.OrganizationRepository",
            return_value=mock_org_repo,
        ),
        patch(
            "src.modules.identity.application.auth_usecase.repo_module.EnterpriseLicenseRepository",
            return_value=mock_license_repo,
        ),
        patch(
            "src.modules.identity.application.auth_usecase.EventBus.publish",
            new_callable=AsyncMock,
        ) as mock_publish,
    ):
        auth_uc = AuthUseCase(partner_repo_factory=lambda _s: mock_partner_repo)
        user, err_msg = await auth_uc.register(
            email="student@cs.stanford.edu",
            password="Password1",
            full_name="Stanford Student",
            role_str="USER_ROLE_LEARNER",
        )

    assert err_msg == ""
    assert user is not None
    assert user.enterprise_seat_key == "ENT-STANFORD-2026"
    assert user.seat_assigned_at is not None
    mock_org_repo.add_member.assert_not_awaited()
    mock_license_repo.increment_enterprise_seat.assert_awaited_once_with(
        "ENT-STANFORD-2026"
    )
    assert mock_publish.await_count == 2


@pytest.mark.asyncio
async def test_course_review_unlocked_for_org_owner_and_blocks_cross_tenant():
    org_owner = CurrentUser(
        id="owner-stanford",
        email="owner@stanford.edu",
        role="USER_ROLE_INSTRUCTOR",
    )
    partner_course = Course(
        id="course-stanford-1",
        title="CS229 Machine Learning",
        slug="cs229-ml",
        description="ML",
        partner_name="Stanford Online",
        partner_logo_url="",
        instructor_names=["Andrew Ng"],
        owner_id="inst-1",
        organization_id="partner_community",
        issuer_partner_id="partner-stanford",
        status=CourseStatus.PENDING_REVIEW,
    )
    community_course = Course(
        id="course-indie-1",
        title="Indie Course",
        slug="indie-course",
        description="Indie",
        partner_name="Coursera Project Network",
        partner_logo_url="",
        instructor_names=["Indie"],
        owner_id="inst-2",
        organization_id="partner_community",
        issuer_partner_id="",
        status=CourseStatus.PENDING_REVIEW,
    )

    mock_repo = AsyncMock()
    mock_repo.get_course_detail.return_value = partner_course
    mock_repo.update_course_status.return_value = partner_course

    with (
        patch(
            "src.modules.catalog.application.course_usecase.enforce_strict_organization_permission",
            new_callable=AsyncMock,
        ) as mock_enforce,
        patch("src.modules.catalog.application.course_usecase.async_session_scope"),
    ):
        uc = CourseUseCase(repo_factory=lambda _s: mock_repo)
        await uc.review_course(
            course_id="course-stanford-1",
            action="APPROVE",
            current_user=org_owner,
        )
        mock_enforce.assert_awaited_once()
        mock_repo.update_course_status.assert_awaited_once()

        # Indie course without issuer_partner_id cannot be reviewed by ORG_OWNER
        mock_repo.get_course_detail.return_value = community_course
        with pytest.raises(PermissionError, match="Quản trị viên hệ thống"):
            await uc.review_course(
                course_id="course-indie-1",
                action="APPROVE",
                current_user=org_owner,
            )


@pytest.mark.asyncio
async def test_organization_dashboard_usecases_and_handlers():
    org_owner = CurrentUser(id="owner-stanford", role="USER_ROLE_INSTRUCTOR")
    org = Organization(
        id="partner-stanford", name="Stanford Online", slug="stanford-online"
    )

    # 1. Identity Organization Stats & Seat Holders
    mock_org_repo = AsyncMock()
    mock_org_repo.get_organization_by_id.return_value = org
    mock_org_repo.get_organization_identity_stats.return_value = (
        OrganizationIdentityStats(
            member_count=12,
            instructor_count=4,
            pending_invitation_count=2,
            active_license_count=1,
            total_seats=300,
            used_seats=25,
        )
    )
    now_iso = datetime.now(UTC).isoformat()
    mock_org_repo.list_organization_seat_holder_users.return_value = (
        [
            SeatHolderUserRow(
                user_id="u-1",
                full_name="Learner One",
                email="l1@stanford.edu",
                avatar_url="",
                seat_key="ENT-STANFORD-2026",
                seat_assigned_at=now_iso,
            )
        ],
        1,
    )
    mock_learning_repo = AsyncMock()
    mock_learning_repo.get_user_progress_summaries.return_value = {"u-1": (2, 25.0)}

    with (
        patch(
            "src.modules.identity.application.organization_usecase.database.async_session_scope"
        ),
        patch(
            "src.modules.identity.application.organization_usecase.repo_module.OrganizationRepository",
            return_value=mock_org_repo,
        ),
        patch(
            "src.modules.identity.application.organization_usecase.enforce_strict_organization_permission",
            new_callable=AsyncMock,
        ),
        patch(
            "src.modules.identity.application.enterprise_usecase.database.async_session_scope"
        ),
        patch(
            "src.modules.identity.application.enterprise_usecase.repo_module.OrganizationRepository",
            return_value=mock_org_repo,
        ),
        patch(
            "src.modules.identity.application.enterprise_usecase.enforce_strict_organization_permission",
            new_callable=AsyncMock,
        ),
    ):
        org_uc = OrganizationUseCase()
        stats = await org_uc.get_organization_identity_stats(
            "stanford-online", org_owner
        )
        assert stats.member_count == 12
        assert stats.used_seats == 25

        ent_uc = EnterpriseLicenseUseCase(
            learning_repo_factory=lambda _s: mock_learning_repo
        )
        holders = await ent_uc.list_organization_seat_holders(
            "stanford-online", org_owner, page=1, page_size=10
        )
        assert holders.total_count == 1
        assert holders.holders[0].enrolled_courses_count == 2
        assert holders.holders[0].can_revoke is False

    # 2. Catalog Organization Stats & Course Metrics
    mock_cat_repo = AsyncMock()
    mock_cat_repo.get_organization_catalog_stats.return_value = (
        OrganizationCatalogStats(
            total_courses=5,
            published_courses=3,
            pending_review_courses=1,
            draft_courses=1,
            rejected_courses=0,
            total_reviews=10,
            average_rating=4.8,
        )
    )
    mock_cat_repo.list_organization_course_summaries.return_value = [
        AdminCourseSummaryRow(
            course_id="c-1",
            title="CS229",
            partner_name="Stanford Online",
            status=CourseStatus.PUBLISHED,
            average_rating=4.9,
            review_count=10,
        )
    ]
    mock_learn_agg = AsyncMock()
    mock_learn_agg.get_course_enrollment_counts.return_value = {"c-1": (50, 20)}
    mock_pay_agg = AsyncMock()
    mock_pay_agg.get_completed_revenue_by_course.return_value = {"c-1": 15000000.0}

    with (
        patch(
            "src.modules.catalog.application.admin_catalog_usecase.async_session_scope"
        ),
        patch(
            "src.modules.catalog.application.admin_catalog_usecase.enforce_strict_organization_permission",
            new_callable=AsyncMock,
        ),
    ):
        cat_uc = AdminCatalogUseCase(
            repo_factory=lambda _s: mock_cat_repo,
            learning_repo_factory=lambda _s: mock_learn_agg,
            payment_repo_factory=lambda _s: mock_pay_agg,
            org_repo_factory=lambda _s: mock_org_repo,
        )
        c_stats = await cat_uc.get_organization_catalog_stats(
            org_owner, "stanford-online"
        )
        assert c_stats.total_courses == 5
        c_metrics = await cat_uc.list_organization_course_metrics(
            org_owner, "stanford-online"
        )
        assert c_metrics.total_count == 1
        assert c_metrics.courses[0].enrolled_count == 50
        assert c_metrics.courses[0].revenue == 15000000.0

    # 3. Certificate Organization Stats & Certificates
    mock_cert_repo = AsyncMock()
    mock_cert_repo.get_organization_certificate_stats.return_value = (
        OrganizationCertificateStats(
            certificates_issued=42,
            certificates_revoked=1,
        )
    )
    mock_cert_repo.list_organization_certificates.return_value = AdminCertificatesPage(
        certificates=(
            AdminCertificateSummary(
                certificate_id="CERT-001",
                learner_name="Learner One",
                course_title="CS229",
                partner_name="Stanford Online",
                issue_date="2026-11-11",
                is_revoked=False,
                revoked_reason="",
            ),
        ),
        total_count=1,
    )
    mock_cat_repo.list_organization_course_ids.return_value = ["c-1"]

    with (
        patch(
            "src.modules.certificate.application.certificate_usecase.async_session_scope"
        ),
        patch(
            "src.modules.certificate.application.certificate_usecase.enforce_strict_organization_permission",
            new_callable=AsyncMock,
        ),
    ):
        cert_uc = CertificateUseCase(
            repo=mock_cert_repo,
            catalog_repo_factory=lambda _s: mock_cat_repo,
            org_repo_factory=lambda _s: mock_org_repo,
        )
        cert_stats = await cert_uc.get_organization_certificate_stats(
            org_owner, "stanford-online"
        )
        assert cert_stats.certificates_issued == 42
        certs = await cert_uc.list_organization_certificates(
            org_owner, "stanford-online"
        )
        assert certs.total_count == 1
        assert certs.certificates[0].certificate_id == "CERT-001"

    # 4. Verify ConnectRPC Handler NOT_FOUND mappings
    set_current_user(org_owner)
    try:
        id_uc_mock = MagicMock()
        id_uc_mock.get_organization_identity_stats = AsyncMock(
            side_effect=KeyError("Org missing")
        )
        id_handler = IdentityHandler(use_case=id_uc_mock)
        with pytest.raises(ConnectError) as id_err:
            await id_handler.get_organization_identity_stats(
                identity_pb.GetOrganizationIdentityStatsRequest(
                    organization_id="missing"
                ),
                MagicMock(),
            )
        assert id_err.value.code == Code.NOT_FOUND

        cat_uc_mock = MagicMock()
        cat_uc_mock.get_organization_catalog_stats = AsyncMock(
            side_effect=KeyError("Org missing")
        )
        cat_handler = CatalogHandler(use_case=cat_uc_mock)
        with pytest.raises(ConnectError) as cat_err:
            await cat_handler.get_organization_catalog_stats(
                catalog_pb.GetOrganizationCatalogStatsRequest(
                    organization_id="missing"
                ),
                MagicMock(),
            )
        assert cat_err.value.code == Code.NOT_FOUND

        cert_uc_mock = MagicMock()
        cert_uc_mock.get_organization_certificate_stats = AsyncMock(
            side_effect=KeyError("Org missing")
        )
        cert_handler = CertificateHandler(use_case=cert_uc_mock)
        with pytest.raises(ConnectError) as cert_err:
            await cert_handler.get_organization_certificate_stats(
                cert_pb.GetOrganizationCertificateStatsRequest(
                    organization_id="missing"
                ),
                MagicMock(),
            )
        assert cert_err.value.code == Code.NOT_FOUND
    finally:
        clear_current_user()
