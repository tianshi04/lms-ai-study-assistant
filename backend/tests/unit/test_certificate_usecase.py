from unittest.mock import AsyncMock, patch

import pytest

from src.modules.certificate.application import (
    CertificateUseCase,
    count_words,
)
from src.modules.certificate.domain import (
    FinancialAidApplication,
    FinancialAidStatus,
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
        status=FinancialAidStatus.PENDING,
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
@patch("src.modules.certificate.application.certificate_usecase.uuid7")
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_apply_financial_aid_new(
    mock_session_scope, mock_repo_class, mock_uuid7, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session

    mock_uuid7.return_value.hex = "1234567890123456"

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
    existing_app = FinancialAidApplication(
        id="faid_1",
        user_id="u1",
        course_id="c1",
        essay_150_words="word " * 150,
        status=FinancialAidStatus.APPROVED,
        review_deadline_days_left=0,
    )
    mock_repo.get_financial_aid = AsyncMock(return_value=existing_app)

    res = await usecase.get_financial_aid_status("u1", "c1")
    assert res == existing_app
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
        open_badges_json_ld={},
    )
    mock_repo.get_course_details_by_id_or_slug = AsyncMock(
        return_value=("c1", "T", "P", "L")
    )
    mock_repo.get_certificate = AsyncMock(return_value=existing_cert)

    cert, err = await usecase.get_verified_certificate("u1", "c1")
    assert cert == existing_cert
    assert err == ""
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

    mock_repo.get_course_details_by_id_or_slug = AsyncMock(
        return_value=("c1", "Python Basics", "TechPartner", "logo")
    )
    mock_repo.get_certificate = AsyncMock(return_value=None)
    mock_repo.get_learning_progress_percent = AsyncMock(return_value=100.0)
    mock_repo.check_graded_items_and_appeals_eligibility = AsyncMock(
        return_value=(True, "")
    )
    mock_repo.get_user_kyc_info = AsyncMock(
        return_value=("alice@example.com", "Alice", True)
    )
    mock_repo.get_course_signer_info = AsyncMock(
        return_value=("Prof. Andrew Ng", "Instructor", "https://example.com/sig.png")
    )

    def save_side_effect(c):
        return c

    mock_repo.save_certificate = AsyncMock(side_effect=save_side_effect)

    cert, err = await usecase.get_verified_certificate("u1", "c1")

    assert err == ""
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

    mock_repo.get_course_details_by_id_or_slug = AsyncMock(
        return_value=(
            "c2",
            "Specialization Course",
            "DeepLearning.AI",
            "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        )
    )
    mock_repo.get_certificate = AsyncMock(return_value=None)
    mock_repo.get_learning_progress_percent = AsyncMock(return_value=100.0)
    mock_repo.check_graded_items_and_appeals_eligibility = AsyncMock(
        return_value=(True, "")
    )
    mock_repo.get_user_kyc_info = AsyncMock(
        return_value=("learner@coursera.ai", "Học viên Coursera", True)
    )
    mock_repo.get_course_signer_info = AsyncMock(
        return_value=(
            "DeepLearning.AI",
            "DeepLearning.AI",
            "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        )
    )

    def save_side_effect(c):
        return c

    mock_repo.save_certificate = AsyncMock(side_effect=save_side_effect)

    cert, err = await usecase.get_verified_certificate("u2", "c2")

    assert err == ""
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
        open_badges_json_ld={},
    )
    mock_repo.get_certificate_by_id = AsyncMock(return_value=existing_cert)

    valid, cert, _msg = await usecase.verify_certificate_public("cert_1")
    assert valid is True
    assert cert == existing_cert

    mock_repo.get_certificate_by_id = AsyncMock(return_value=None)
    valid, cert, _msg = await usecase.verify_certificate_public("cert_2")
    assert valid is False
    assert cert is None


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_list_financial_aid_applications(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value

    app1 = FinancialAidApplication(
        id="fa1",
        user_id="u1",
        course_id="c1",
        essay_150_words="test " * 150,
        status=FinancialAidStatus.APPROVED,
    )
    mock_repo.list_financial_aids = AsyncMock(return_value=[app1])

    apps = await usecase.list_financial_aid_applications("c1", "APPROVED")
    assert len(apps) == 1
    assert apps[0].id == "fa1"


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_review_financial_aid_application(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value

    app1 = FinancialAidApplication(
        id="fa1",
        user_id="u1",
        course_id="c1",
        essay_150_words="test " * 150,
        status=FinancialAidStatus.PENDING,
    )
    mock_repo.get_financial_aid_by_id = AsyncMock(return_value=app1)
    mock_repo.save_financial_aid = AsyncMock(side_effect=lambda a: a)

    updated, err = await usecase.review_financial_aid_application("fa1", True)
    assert err == ""
    assert updated is not None
    assert updated.status == FinancialAidStatus.APPROVED

    mock_repo.get_financial_aid_by_id = AsyncMock(return_value=None)
    updated, err = await usecase.review_financial_aid_application("fa2", False)
    assert updated is None
    assert "Không tìm thấy" in err


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_revoke_certificate(mock_session_scope, mock_repo_class, usecase):
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
        open_badges_json_ld={},
        is_revoked=False,
    )
    mock_repo.get_certificate_by_id = AsyncMock(return_value=existing_cert)
    mock_repo.save_certificate = AsyncMock(side_effect=lambda c: c)

    success, msg = await usecase.revoke_certificate("cert_1", "violation")
    assert success is True
    assert existing_cert.is_revoked is True

    # Test revoking already revoked cert
    success, msg = await usecase.revoke_certificate("cert_1", "violation")
    assert success is False
    assert "đã bị thu hồi" in msg

    # Test revoking non-existent cert
    mock_repo.get_certificate_by_id = AsyncMock(return_value=None)
    success, msg = await usecase.revoke_certificate("cert_none", "violation")
    assert success is False
    assert "Không tìm thấy" in msg


@pytest.mark.asyncio
@patch("src.modules.certificate.application.certificate_usecase.CertificateRepository")
@patch("src.modules.certificate.application.certificate_usecase.async_session_scope")
async def test_issue_specialization_certificate(
    mock_session_scope, mock_repo_class, usecase
):
    mock_session = AsyncMock()
    mock_session_scope.return_value.__aenter__.return_value = mock_session
    mock_repo = mock_repo_class.return_value

    mock_repo.get_specialization_details = AsyncMock(
        return_value=("Deep Learning Spec", "DeepLearning.AI", "logo", ["c1", "c2"])
    )
    cert1 = VerifiedCertificate(
        certificate_id="cert_c1",
        user_id="u1",
        course_id="c1",
        learner_name="Alice",
        course_title="C1",
        partner_name="P",
        partner_logo_url="L",
        issue_date="01/01",
        verification_url="V",
        qr_code_url="Q",
        open_badges_json_ld={},
    )
    cert2 = VerifiedCertificate(
        certificate_id="cert_c2",
        user_id="u1",
        course_id="c2",
        learner_name="Alice",
        course_title="C2",
        partner_name="P",
        partner_logo_url="L",
        issue_date="01/01",
        verification_url="V",
        qr_code_url="Q",
        open_badges_json_ld={},
    )
    mock_repo.get_certificates_by_user = AsyncMock(return_value=[cert1, cert2])
    mock_repo.get_certificate = AsyncMock(return_value=None)
    mock_repo.get_user_kyc_info = AsyncMock(
        return_value=("alice@example.com", "Alice", True)
    )
    mock_repo.get_course_signer_info = AsyncMock(
        return_value=("DeepLearning.AI", "DeepLearning.AI", "logo.svg")
    )
    mock_repo.save_certificate = AsyncMock(side_effect=lambda c: c)

    spec_cert, _msg = await usecase.issue_specialization_certificate("u1", "spec_1")
    assert spec_cert is not None
    assert spec_cert.specialization_id == "spec_1"
    assert spec_cert.learner_name == "Alice"
