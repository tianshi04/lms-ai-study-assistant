"""Real-PostgreSQL tests for Partner & Organization Dashboard repositories."""

import uuid

import pytest

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.models import CourseModel, CourseReviewModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.certificate.infrastructure.models import CertificateModel
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.modules.identity.domain import UserRole
from src.modules.identity.infrastructure.models import (
    EnterpriseLicenseModel,
    InvitationModel,
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
)
from src.modules.identity.infrastructure.repository import OrganizationRepository
from src.modules.partner.infrastructure.models import PartnerModel
from src.shared.infrastructure import database


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


@pytest.mark.asyncio(loop_scope="function")
async def test_partner_dashboard_repositories_end_to_end_on_postgres():
    org_id = _uid("partner-org")
    org_slug = _uid("org-slug")
    seat_key = _uid("ENT-KEY").upper()
    owner_id = _uid("owner")
    holder_id = _uid("holder")
    course_public_id = _uid("course-pub")
    course_pending_id = _uid("course-pend")
    cert_valid_id = _uid("CERT-VAL")
    cert_revoked_id = _uid("CERT-REV")

    async with database.async_session_scope() as session:
        # Ensure partner_community exists for public B2C course visibility
        community_org = await session.get(OrganizationModel, "partner_community")
        if not community_org:
            session.add(
                OrganizationModel(
                    id="partner_community",
                    name="Coursera Project Network",
                    slug="coursera-project-network",
                    avatar_url="",
                )
            )

        session.add(
            PartnerModel(
                id=org_id,
                name="Test Partner University",
                slug=org_slug,
                description="B2B Test Partner",
                logo_url="https://example.edu/logo.png",
                banner_url="",
                website_url="https://example.edu",
                allowed_domains=["example.edu"],
                signature_image_url="https://example.edu/sig.png",
                signer_name="Dr. Default Signer",
                signer_title="University President",
                public_key_pem="-----BEGIN PUBLIC KEY-----\nTEST\n-----END PUBLIC KEY-----",
                created_at="2026-11-11T00:00:00Z",
                updated_at="2026-11-11T00:00:00Z",
                historical_public_keys=[],
            )
        )
        session.add(
            OrganizationModel(
                id=org_id,
                name="Test Partner University",
                slug=org_slug,
                avatar_url="https://example.edu/logo.png",
            )
        )
        await session.flush()

        session.add(
            EnterpriseLicenseModel(
                key=seat_key,
                partner_name="Test Partner University",
                organization_id=org_id,
                total_seats=100,
                used_seats=1,
                is_active=True,
            )
        )
        session.add_all(
            [
                UserModel(
                    id=owner_id,
                    email=f"{owner_id}@example.edu",
                    full_name="Partner Owner",
                    role=UserRole.INSTRUCTOR,
                    avatar_url="",
                    password_hash="hash",
                    signature_image_url="",
                    title="",
                ),
                UserModel(
                    id=holder_id,
                    email=f"{holder_id}@example.edu",
                    full_name="Sponsored Student",
                    role=UserRole.LEARNER,
                    avatar_url="",
                    password_hash="hash",
                    enterprise_seat_key=seat_key,
                    seat_assigned_at="2026-11-10T00:00:00+00:00",
                ),
            ]
        )
        await session.flush()

        session.add(
            OrganizationMemberModel(
                id=_uid("mem"),
                user_id=owner_id,
                organization_id=org_id,
                role_id="OWNER",
                status="ACTIVE",
            )
        )
        session.add(
            InvitationModel(
                id=_uid("inv"),
                token_hash=_uid("tokhash"),
                type="INVITATION_TYPE_ORGANIZATION_MEMBER",
                inviter_id=owner_id,
                invitee_email="newprof@example.edu",
                target_id=org_id,
                target_name="Test Partner University",
                role_id="INSTRUCTOR",
                status="INVITATION_STATUS_PENDING",
                expires_at="2099-01-01T00:00:00+00:00",
                created_at="2026-11-11T00:00:00+00:00",
            )
        )
        session.add_all(
            [
                # Public B2C course issued by Partner (organization_id='partner_community', issuer_partner_id=org_id)
                CourseModel(
                    id=course_public_id,
                    title="Distributed Systems 101",
                    slug=_uid("dist-sys"),
                    description="Public partner course",
                    partner_name="Test Partner University",
                    partner_logo_url="https://example.edu/logo.png",
                    owner_id=owner_id,
                    organization_id="partner_community",
                    issuer_partner_id=org_id,
                    status=CourseStatus.PUBLISHED.value,
                    average_rating=5.0,
                    review_count=1,
                ),
                # Private/pending course directly under org_id
                CourseModel(
                    id=course_pending_id,
                    title="Internal AI Bootcamp",
                    slug=_uid("ai-bootcamp"),
                    description="Pending review course",
                    partner_name="Test Partner University",
                    partner_logo_url="https://example.edu/logo.png",
                    owner_id=owner_id,
                    organization_id=org_id,
                    issuer_partner_id=org_id,
                    status=CourseStatus.PENDING_REVIEW.value,
                ),
            ]
        )
        await session.flush()

        session.add(
            CourseReviewModel(
                id=_uid("rev"),
                course_id=course_public_id,
                user_id=holder_id,
                user_name="Sponsored Student",
                rating_stars=5,
                comment_text="Great partner course!",
                is_verified_completer=True,
                created_at="2026-11-11T00:00:00Z",
            )
        )
        session.add_all(
            [
                CertificateModel(
                    certificate_id=cert_valid_id,
                    user_id=holder_id,
                    learner_name="Sponsored Student",
                    course_id=course_public_id,
                    course_title="Distributed Systems 101",
                    partner_name="Test Partner University",
                    partner_logo_url="https://example.edu/logo.png",
                    issue_date="2026-11-11",
                    verification_url=f"https://coursera.ai/verify/{cert_valid_id}",
                    qr_code_url="https://coursera.ai/qr/valid.png",
                    open_badges_json_ld={},
                    is_revoked=False,
                    revoked_reason="",
                ),
                CertificateModel(
                    certificate_id=cert_revoked_id,
                    user_id=owner_id,
                    learner_name="Partner Owner",
                    course_id=course_public_id,
                    course_title="Distributed Systems 101",
                    partner_name="Test Partner University",
                    partner_logo_url="https://example.edu/logo.png",
                    issue_date="2026-11-11",
                    verification_url=f"https://coursera.ai/verify/{cert_revoked_id}",
                    qr_code_url="https://coursera.ai/qr/revoked.png",
                    open_badges_json_ld={},
                    is_revoked=True,
                    revoked_reason="Duplicate test",
                ),
            ]
        )
        await session.flush()

        # 1. Verify Identity Repository stats & seat holders
        org_repo = OrganizationRepository(session)
        id_stats = await org_repo.get_organization_identity_stats(org_id)
        assert id_stats.member_count == 1
        assert id_stats.instructor_count == 1
        assert id_stats.pending_invitation_count == 1
        assert id_stats.active_license_count == 1
        assert id_stats.total_seats == 100
        assert id_stats.used_seats == 1

        seat_rows, seat_total = await org_repo.list_organization_seat_holder_users(
            org_id, page=1, page_size=10, search_query="Sponsored"
        )
        assert seat_total == 1
        assert seat_rows[0].user_id == holder_id
        assert seat_rows[0].seat_key == seat_key

        # 2. Verify Catalog Repository stats, summaries & course IDs (matches both organization_id and issuer_partner_id)
        cat_repo = SQLAlchemyCatalogRepository(session)
        course_ids = await cat_repo.list_organization_course_ids(org_id)
        assert set(course_ids) == {course_public_id, course_pending_id}

        cat_stats = await cat_repo.get_organization_catalog_stats(org_id)
        assert cat_stats.total_courses == 2
        assert cat_stats.published_courses == 1
        assert cat_stats.pending_review_courses == 1
        assert cat_stats.total_reviews == 1
        assert cat_stats.average_rating == 5.0

        summaries = await cat_repo.list_organization_course_summaries(
            org_id,
            search_query="Distributed",
            status=CourseStatus.PUBLISHED,
        )
        assert len(summaries) == 1
        assert summaries[0].course_id == course_public_id

        # 3. Verify Certificate Repository stats, paged list, and Partner signer fallback via issuer_partner_id
        cert_repo = CertificateRepository(session)
        cert_stats = await cert_repo.get_organization_certificate_stats(course_ids)
        assert cert_stats.certificates_issued == 2
        assert cert_stats.certificates_revoked == 1

        valid_certs = await cert_repo.list_organization_certificates(
            course_ids,
            page=1,
            page_size=10,
            search_query="Sponsored",
            is_revoked=False,
        )
        assert valid_certs.total_count == 1
        assert valid_certs.certificates[0].certificate_id == cert_valid_id

        (
            signer_name,
            signer_title,
            signature_image_url,
        ) = await cert_repo.get_course_signer_info(course_public_id)
        assert signer_name == "Dr. Default Signer"
        assert signer_title == "University President"
        assert signature_image_url == "https://example.edu/sig.png"
