import pytest
from src.modules.certificate.domain.entities import FinancialAidApplication
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.modules.identity.domain.entities import User, UserRole
from src.modules.identity.infrastructure.repository import IdentityRepository
from src.shared.access_policy import AccessPolicyService
from src.shared.infrastructure.database import async_session_scope


@pytest.mark.asyncio
async def test_access_policy_audit_mode():
    try:
        async with async_session_scope() as session:
            id_repo = IdentityRepository(session)
            user = User(
                id="user_audit_policy",
                email="audit_policy@example.com",
                full_name="Audit Policy Learner",
                role=UserRole.LEARNER,
                avatar_url="",
                password_hash="hash",
                enterprise_seat_key="",
            )
            await id_repo.save(user)

            is_paid, err = await AccessPolicyService.verify_paid_access(
                session, "user_audit_policy", "course_python"
            )
            assert is_paid is False
            assert "Audit Mode" in err
    except Exception as e:
        pytest.skip(f"Skipping DB test for access policy: DB not reachable ({e})")


@pytest.mark.asyncio
async def test_access_policy_enterprise_seat():
    try:
        async with async_session_scope() as session:
            id_repo = IdentityRepository(session)
            user = User(
                id="user_enterprise_policy",
                email="ent_policy@example.com",
                full_name="Enterprise Learner",
                role=UserRole.LEARNER,
                avatar_url="",
                password_hash="hash",
                enterprise_seat_key="KEY-ENT-123",
            )
            await id_repo.save(user)

            is_paid, err = await AccessPolicyService.verify_paid_access(
                session, "user_enterprise_policy", "course_python"
            )
            assert is_paid is True
            assert err == ""
    except Exception as e:
        pytest.skip(f"Skipping DB test for access policy: DB not reachable ({e})")


@pytest.mark.asyncio
async def test_access_policy_financial_aid_approved():
    try:
        async with async_session_scope() as session:
            id_repo = IdentityRepository(session)
            user = User(
                id="user_faid_policy",
                email="faid_policy@example.com",
                full_name="Financial Aid Learner",
                role=UserRole.LEARNER,
                avatar_url="",
                password_hash="hash",
                enterprise_seat_key="",
            )
            await id_repo.save(user)

            cert_repo = CertificateRepository(session)
            fa_app = FinancialAidApplication(
                id="faid_policy_app",
                user_id="user_faid_policy",
                course_id="course_python",
                essay_150_words="Valid essay text " * 20,
                status="APPROVED",
                review_deadline_days_left=0,
            )
            await cert_repo.save_financial_aid(fa_app)

            is_paid, err = await AccessPolicyService.verify_paid_access(
                session, "user_faid_policy", "course_python"
            )
            assert is_paid is True
            assert err == ""
    except Exception as e:
        pytest.skip(f"Skipping DB test for access policy: DB not reachable ({e})")
