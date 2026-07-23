import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    VerifiedCertificate,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    return session


@pytest.fixture
def repo(mock_session):
    return CertificateRepository(mock_session)


@pytest.mark.asyncio
async def test_get_financial_aid_found(repo, mock_session):
    mock_result = MagicMock()
    mock_model = FinancialAidModel(
        id="faid_123",
        user_id="user_1",
        course_id="course_1",
        essay_150_words="test " * 150,
        status="PENDING",
        review_deadline_days_left=14,
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    app = await repo.get_financial_aid("user_1", "course_1")

    assert app is not None
    assert app.id == "faid_123"
    assert app.user_id == "user_1"
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_financial_aid_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    app = await repo.get_financial_aid("user_1", "course_1")

    assert app is None
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_save_financial_aid_new(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    app = FinancialAidApplication(
        id="faid_123",
        user_id="user_1",
        course_id="course_1",
        essay_150_words="test " * 150,
        status="PENDING",
        review_deadline_days_left=14,
    )

    saved_app = await repo.save_financial_aid(app)

    assert saved_app == app
    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_save_financial_aid_update(repo, mock_session):
    mock_result = MagicMock()
    mock_model = FinancialAidModel(
        id="faid_123",
        user_id="user_1",
        course_id="course_1",
        essay_150_words="test " * 150,
        status="PENDING",
        review_deadline_days_left=14,
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    app = FinancialAidApplication(
        id="faid_123",
        user_id="user_1",
        course_id="course_1",
        essay_150_words="test " * 150,
        status="APPROVED",
        review_deadline_days_left=0,
    )

    saved_app = await repo.save_financial_aid(app)

    assert saved_app == app
    assert mock_model.status == "APPROVED"
    assert mock_model.review_deadline_days_left == 0
    mock_session.add.assert_not_called()
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_get_certificate_found(repo, mock_session):
    mock_result = MagicMock()
    mock_model = CertificateModel(
        certificate_id="cert_123",
        user_id="user_1",
        course_id="course_1",
        learner_name="John Doe",
        course_title="Python 101",
        partner_name="DeepLearning.AI",
        partner_logo_url="logo_url",
        issue_date="01/01/2026",
        verification_url="/verify/cert_123",
        qr_code_url="qr_url",
        open_badges_json_ld="{}",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    cert = await repo.get_certificate("user_1", "course_1")

    assert cert is not None
    assert cert.certificate_id == "cert_123"
    assert cert.learner_name == "John Doe"
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_certificate_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    cert = await repo.get_certificate("user_1", "course_1")

    assert cert is None
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_certificate_by_id_found(repo, mock_session):
    mock_result = MagicMock()
    mock_model = CertificateModel(
        certificate_id="cert_123",
        user_id="user_1",
        course_id="course_1",
        learner_name="John Doe",
        course_title="Python 101",
        partner_name="DeepLearning.AI",
        partner_logo_url="logo_url",
        issue_date="01/01/2026",
        verification_url="/verify/cert_123",
        qr_code_url="qr_url",
        open_badges_json_ld="{}",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    cert = await repo.get_certificate_by_id("cert_123")

    assert cert is not None
    assert cert.certificate_id == "cert_123"
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_certificate_by_id_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    cert = await repo.get_certificate_by_id("cert_123")

    assert cert is None
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_save_certificate_new(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    cert = VerifiedCertificate(
        certificate_id="cert_123",
        user_id="user_1",
        course_id="course_1",
        learner_name="John Doe",
        course_title="Python 101",
        partner_name="DeepLearning.AI",
        partner_logo_url="logo_url",
        issue_date="01/01/2026",
        verification_url="/verify/cert_123",
        qr_code_url="qr_url",
        open_badges_json_ld="{}",
    )

    saved_cert = await repo.save_certificate(cert)

    assert saved_cert == cert
    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_save_certificate_existing(repo, mock_session):
    mock_result = MagicMock()
    mock_model = CertificateModel(
        certificate_id="cert_123",
        user_id="user_1",
        course_id="course_1",
        learner_name="John Doe",
        course_title="Python 101",
        partner_name="DeepLearning.AI",
        partner_logo_url="logo_url",
        issue_date="01/01/2026",
        verification_url="/verify/cert_123",
        qr_code_url="qr_url",
        open_badges_json_ld="{}",
    )
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    cert = VerifiedCertificate(
        certificate_id="cert_123",
        user_id="user_1",
        course_id="course_1",
        learner_name="John Doe",
        course_title="Python 101",
        partner_name="DeepLearning.AI",
        partner_logo_url="logo_url",
        issue_date="01/01/2026",
        verification_url="/verify/cert_123",
        qr_code_url="qr_url",
        open_badges_json_ld="{}",
    )

    saved_cert = await repo.save_certificate(cert)

    assert saved_cert == cert
    mock_session.add.assert_not_called()
    mock_session.flush.assert_called_once()
