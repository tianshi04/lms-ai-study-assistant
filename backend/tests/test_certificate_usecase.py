import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.modules.certificate.application.certificate_usecase import (
    CertificateUseCase,
    count_words,
)
from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    VerifiedCertificate,
)


@pytest.fixture
def usecase():
    return CertificateUseCase()


def test_count_words():
    assert count_words("hello world") == 2
    assert count_words("  one two  three  ") == 3
    assert count_words("") == 0


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_apply_financial_aid_short_essay(
    mock_session_scope, mock_repo_class, usecase
):
    essay = "Short essay."
    app, err = await usecase.apply_financial_aid("u1", "c1", essay)
    assert app is None
    assert "chưa đủ độ dài tối thiểu" in err


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_apply_financial_aid_existing(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_repo = mock_repo_class.return_value
    existing_app = FinancialAidApplication(
        id="faid_1",
        user_id="u1",
        course_id="c1",
        essay_150_words="word " * 150,
        status="PENDING",
        review_deadline_days_left=14,
    )
    mock_repo.get_financial_aid = AsyncMock(return_value=existing_app)
    mock_repo.save_financial_aid = AsyncMock()

    essay = "word " * 150
    app, err = await usecase.apply_financial_aid("u1", "c1", essay)

    assert app == existing_app
    assert err == ""
    mock_repo.get_financial_aid.assert_called_once_with("u1", "c1")
    mock_repo.save_financial_aid.assert_not_called()


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.uuid")
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_apply_financial_aid_new(
    mock_session_scope, mock_repo_class, mock_uuid, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_uuid.uuid4.return_value.hex = "1234567890123456"

    mock_repo = mock_repo_class.return_value
    mock_repo.get_financial_aid = AsyncMock(return_value=None)

    def save_side_effect(app):
        return app

    mock_repo.save_financial_aid = AsyncMock(side_effect=save_side_effect)

    essay = "word " * 150
    app, err = await usecase.apply_financial_aid("u1", "c1", essay)

    assert err == ""
    assert app is not None
    assert app.id == "faid_123456789012"
    assert app.user_id == "u1"
    assert app.course_id == "c1"
    assert app.essay_150_words == essay
    mock_repo.save_financial_aid.assert_called_once()


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_get_financial_aid_status(mock_session_scope, mock_repo_class, usecase):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value
    mock_repo.get_financial_aid = AsyncMock(return_value="fake_app")

    res = await usecase.get_financial_aid_status("u1", "c1")
    assert res == "fake_app"
    mock_repo.get_financial_aid.assert_called_once_with("u1", "c1")


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_get_verified_certificate_existing(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value

    existing_cert = VerifiedCertificate(
        certificate_id="cert_1",
        user_id="u1",
        course_id="c1",
        learner_name="A",
        course_title="T",
        partner_name="P",
        partner_logo_url="L",
        issue_date="01/01",
        verification_url="V",
        qr_code_url="Q",
        open_badges_json_ld="{}",
    )
    mock_repo.get_certificate = AsyncMock(return_value=existing_cert)

    cert = await usecase.get_verified_certificate("u1", "c1")
    assert cert == existing_cert
    mock_repo.get_certificate.assert_called_once_with("u1", "c1")


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_get_verified_certificate_new(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value
    mock_repo.get_certificate = AsyncMock(return_value=None)

    mock_user_model = MagicMock(full_name="Alice")
    mock_course_model = MagicMock(
        title="Python Basics", partner_name="TechPartner", partner_logo_url="logo"
    )

    mock_user_res = MagicMock()
    mock_user_res.scalar_one_or_none.return_value = mock_user_model

    mock_course_res = MagicMock()
    mock_course_res.scalar_one_or_none.return_value = mock_course_model

    mock_session.execute = AsyncMock(side_effect=[mock_user_res, mock_course_res])

    def save_side_effect(c):
        return c

    mock_repo.save_certificate = AsyncMock(side_effect=save_side_effect)

    cert = await usecase.get_verified_certificate("u1", "c1")

    assert cert is not None
    assert cert.learner_name == "Alice"
    assert cert.course_title == "Python Basics"
    assert cert.partner_name == "TechPartner"
    assert cert.partner_logo_url == "logo"
    assert cert.certificate_id.startswith("CERT-")
    assert cert.user_id == "u1"
    assert cert.course_id == "c1"

    mock_repo.save_certificate.assert_called_once()


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_get_verified_certificate_new_defaults(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value
    mock_repo.get_certificate = AsyncMock(return_value=None)

    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_res)

    def save_side_effect(c):
        return c

    mock_repo.save_certificate = AsyncMock(side_effect=save_side_effect)

    cert = await usecase.get_verified_certificate("u2", "c2")

    assert cert is not None
    assert cert.learner_name == "Học viên Coursera"
    assert cert.course_title == "Specialization Course"
    assert cert.partner_name == "DeepLearning.AI"
    assert (
        cert.partner_logo_url
        == "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg"
    )
    mock_repo.save_certificate.assert_called_once()


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_verify_certificate_public(mock_session_scope, mock_repo_class, usecase):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value

    existing_cert = VerifiedCertificate(
        certificate_id="cert_1",
        user_id="u1",
        course_id="c1",
        learner_name="A",
        course_title="T",
        partner_name="P",
        partner_logo_url="L",
        issue_date="01/01",
        verification_url="V",
        qr_code_url="Q",
        open_badges_json_ld="{}",
    )
    mock_repo.get_certificate_by_id = AsyncMock(return_value=existing_cert)

    valid, cert = await usecase.verify_certificate_public("cert_1")
    assert valid is True
    assert cert == existing_cert

    mock_repo.get_certificate_by_id = AsyncMock(return_value=None)
    valid, cert = await usecase.verify_certificate_public("cert_2")
    assert valid is False
    assert cert is None
