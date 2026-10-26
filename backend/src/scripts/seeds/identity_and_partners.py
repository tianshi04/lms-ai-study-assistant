"""Seed data for Identity, Organizations, Partners, and Enterprise Licenses."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.application import hash_password
from src.modules.identity.domain import UserRole
from src.modules.identity.infrastructure.models import (
    EnterpriseLicenseModel,
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
)
from src.modules.partner.infrastructure.models import PartnerModel


async def seed_identity_and_partners(session: AsyncSession) -> None:
    """Seed partners, enterprise licenses, organizations, and standard role users."""
    partner_stanford = PartnerModel(
        id="partner-stanford",
        name="Stanford Online",
        slug="stanford-online",
        description="Stanford Online offers lifelong learning opportunities from Stanford University.",
        logo_url="https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg",
        banner_url="https://images.unsplash.com/photo-1541339907198-e08756dedf3f",
        website_url="https://online.stanford.edu",
        allowed_domains=["stanford.edu", "online.stanford.edu"],
        signature_image_url="https://example.com/signatures/stanford_dean.png",
        signer_name="Prof. Jennifer Widom",
        signer_title="Dean of Stanford Engineering",
        public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstanford...\n-----END PUBLIC KEY-----",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    partner_dl = PartnerModel(
        id="partner-deeplearning-ai",
        name="DeepLearning.AI",
        slug="deeplearning-ai",
        description="Empowering people to build an AI-powered future through world-class education.",
        logo_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        banner_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
        website_url="https://www.deeplearning.ai",
        allowed_domains=["deeplearning.ai"],
        signature_image_url="https://example.com/signatures/andrew_ng.png",
        signer_name="Andrew Ng",
        signer_title="Founder, DeepLearning.AI",
        public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAdeeplearning...\n-----END PUBLIC KEY-----",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    partner_gcp = PartnerModel(
        id="partner-google-cloud",
        name="Google Cloud",
        slug="google-cloud",
        description="Build your cloud skills with Google Cloud training and certifications.",
        logo_url="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
        banner_url="https://images.unsplash.com/photo-1573164713988-8665fc963095",
        website_url="https://cloud.google.com/training",
        allowed_domains=["cloud.google.com", "google.com"],
        signature_image_url="https://example.com/signatures/google_cloud_vp.png",
        signer_name="Thomas Kurian",
        signer_title="CEO, Google Cloud",
        public_key_pem="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgooglecloud...\n-----END PUBLIC KEY-----",
        created_at="2026-07-20T00:00:00Z",
        updated_at="2026-07-20T00:00:00Z",
    )
    for partner in (partner_stanford, partner_dl, partner_gcp):
        await session.merge(partner)

    # Enterprise Licenses
    licenses = [
        EnterpriseLicenseModel(
            key="ENT-DEMO-2026-X99",
            partner_name="DeepLearning.AI Partner Program",
            total_seats=500,
            used_seats=1,
            is_active=True,
        ),
        EnterpriseLicenseModel(
            key="ENT-UNI-HCMUT-2026",
            partner_name="Trường Đại học Bách Khoa TP.HCM",
            total_seats=1000,
            used_seats=1,
            is_active=True,
        ),
        EnterpriseLicenseModel(
            key="ENT-TECH-FPT-2026",
            partner_name="FPT Software Enterprise Academy",
            total_seats=250,
            used_seats=0,
            is_active=True,
        ),
    ]
    for lic in licenses:
        await session.merge(lic)

    # Standard Users across Roles (Password for all seed accounts: 123456)
    default_pw_hash = hash_password("123456")

    users = [
        UserModel(
            id="user_learner_demo",
            email="learner@coursera.ai",
            full_name="Nguyễn Văn A",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner@coursera.ai",
            enterprise_seat_key="ENT-DEMO-2026-X99",
            password_hash=default_pw_hash,
            is_identity_verified=False,
        ),
        UserModel(
            id="user_learner_02",
            email="learner2@coursera.ai",
            full_name="Trần Thu Hà",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner2@coursera.ai",
            enterprise_seat_key="ENT-UNI-HCMUT-2026",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        ),
        UserModel(
            id="user_learner_03",
            email="learner3@coursera.ai",
            full_name="Phạm Quốc Bảo",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner3@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=False,
        ),
        UserModel(
            id="user_phong_student",
            email="n22dccn158@student.ptithcm.edu.vn",
            full_name="NGUYEN THANH PHONG D22CQCN02-N",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=n22dccn158",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        ),
        UserModel(
            id="user_phong_instructor",
            email="phongnguyen.30604@gmail.com",
            full_name="Phong Nguyễn",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=phongnguyen",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        ),
        UserModel(
            id="user_phong_admin",
            email="ttxmath1110@gmail.com",
            full_name="Thanh Phong Admin",
            role=UserRole.ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ttxmath1110",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            is_identity_verified=True,
        ),
        UserModel(
            id="user_instructor_01",
            email="instructor@coursera.ai",
            full_name="Prof. Andrew Ng",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=instructor@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
            title="Founder, DeepLearning.AI & Adjunct Professor, Stanford University",
            signature_image_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        ),
        UserModel(
            id="user_ta_01",
            email="ta@coursera.ai",
            full_name="ThS. Nguyễn Hoàng Nam",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ta@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        ),
        UserModel(
            id="user_admin_01",
            email="admin@coursera.ai",
            full_name="Platform Admin",
            role=UserRole.ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        ),
        UserModel(
            id="user_partner_01",
            email="partner@coursera.ai",
            full_name="Stanford Organization Admin",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=partner@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        ),
    ]
    for user in users:
        await session.merge(user)

    organizations = [
        OrganizationModel(
            id="org_system_internal",
            name="System Internal Organization",
            slug="system-internal",
            avatar_url="",
        ),
        OrganizationModel(
            id="partner_stanford",
            name="Stanford University",
            slug="stanford",
            avatar_url="https://upload.wikimedia.org/wikipedia/commons/4/4b/Stanford_Cardinal_logo.svg",
        ),
        OrganizationModel(
            id="partner_community",
            name="Coursera Project Network",
            slug="coursera-project-network",
            avatar_url="",
        ),
    ]
    for org in organizations:
        await session.merge(org)

    org_members = [
        OrganizationMemberModel(
            id="member_admin_01",
            user_id="user_admin_01",
            organization_id="partner_community",
            role_id="OWNER",
            status="ACTIVE",
        ),
        OrganizationMemberModel(
            id="member_partner_01",
            user_id="user_partner_01",
            organization_id="partner_stanford",
            role_id="OWNER",
            status="ACTIVE",
        ),
        OrganizationMemberModel(
            id="member_instructor_01",
            user_id="user_instructor_01",
            organization_id="partner_stanford",
            role_id="INSTRUCTOR",
            status="ACTIVE",
        ),
        OrganizationMemberModel(
            id="member_ta_01",
            user_id="user_ta_01",
            organization_id="partner_stanford",
            role_id="INSTRUCTOR",
            status="ACTIVE",
        ),
    ]
    for member in org_members:
        await session.merge(member)
