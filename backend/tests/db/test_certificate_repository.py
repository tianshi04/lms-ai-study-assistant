from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.certificate.domain import (
    FinancialAidApplication,
    FinancialAidStatus,
    VerifiedCertificate,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.certificate.infrastructure.repository import CertificateRepository


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


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
    mock_result.scalars().first.return_value = mock_model
    mock_session.execute.return_value = mock_result

    app = await repo.get_financial_aid("user_1", "course_1")

    assert app is not None
    assert app.id == "faid_123"
    assert app.user_id == "user_1"
    mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_financial_aid_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalars().first.return_value = None
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
        status=FinancialAidStatus.PENDING,
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
        status=FinancialAidStatus.APPROVED,
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
        open_badges_json_ld={},
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
        open_badges_json_ld={},
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
        open_badges_json_ld={},
    )

    saved_cert = await repo.save_certificate(cert)

    assert saved_cert == cert
    mock_session.add.assert_not_called()
    mock_session.flush.assert_called_once()


@pytest.mark.asyncio
async def test_check_graded_items_and_appeals_eligibility_peer_review_guards(
    repo, mock_session
):
    from src.modules.assessment.infrastructure.models import (
        PeerAssignmentSubmissionModel,
    )
    from src.modules.catalog.domain import ItemType
    from src.modules.catalog.infrastructure.models import LearningItemModel

    peer_item = LearningItemModel(
        id="item_peer_1",
        lesson_id="lesson_1",
        title="Final Essay",
        type=ItemType.PEER_REVIEW,
    )

    def _mock_execute_sequence(peer_subs, pending_appeal_ids):
        req_res = MagicMock()
        req_res.scalars.return_value.all.return_value = [peer_item]

        quiz_res = MagicMock()
        quiz_res.scalars.return_value.all.return_value = []

        lab_res = MagicMock()
        lab_res.scalars.return_value.all.return_value = []

        peer_res = MagicMock()
        peer_res.scalars.return_value.all.return_value = peer_subs

        appeal_res = MagicMock()
        appeal_res.scalars.return_value.all.return_value = pending_appeal_ids

        return [req_res, quiz_res, lab_res, peer_res, appeal_res]

    # Case 1: Score >= 80 and PUBLISHED, but review_duty_status == PENDING -> MUST REJECT
    sub_pending = PeerAssignmentSubmissionModel(
        id="sub_1",
        user_id="u1",
        item_id="item_peer_1",
        submission_url="https://example.com",
        text_content="Essay",
        created_at="2026-11-01T00:00:00Z",
        final_score=95.0,
        status="PUBLISHED",
        review_duty_status="PENDING",
    )
    mock_session.execute.side_effect = _mock_execute_sequence([sub_pending], [])
    ok, err = await repo.check_graded_items_and_appeals_eligibility("u1", "c1")
    assert ok is False
    assert "nghĩa vụ chấm bài" in err

    # Case 2: Score >= 80 and COMPLETED, but status != PUBLISHED (e.g. SUBMITTED after resubmit) -> MUST REJECT
    sub_unpublished = PeerAssignmentSubmissionModel(
        id="sub_1",
        user_id="u1",
        item_id="item_peer_1",
        submission_url="https://example.com",
        text_content="Essay v2",
        created_at="2026-11-02T00:00:00Z",
        final_score=95.0,
        status="SUBMITTED",
        review_duty_status="COMPLETED",
    )
    mock_session.execute.side_effect = _mock_execute_sequence([sub_unpublished], [])
    ok, err = await repo.check_graded_items_and_appeals_eligibility("u1", "c1")
    assert ok is False
    assert "PUBLISHED" in err

    # Case 3: PUBLISHED + 95 + COMPLETED, but PENDING_STAFF_REVIEW report/appeal exists -> MUST REJECT
    sub_ok = PeerAssignmentSubmissionModel(
        id="sub_1",
        user_id="u1",
        item_id="item_peer_1",
        submission_url="https://example.com",
        text_content="Essay",
        created_at="2026-11-01T00:00:00Z",
        final_score=95.0,
        status="PUBLISHED",
        review_duty_status="COMPLETED",
    )
    mock_session.execute.side_effect = _mock_execute_sequence([sub_ok], ["sub_1"])
    ok, err = await repo.check_graded_items_and_appeals_eligibility("u1", "c1")
    assert ok is False
    assert "khiếu nại" in err

    # Case 4: PUBLISHED + 95 + WAIVED_EMPTY_POOL (or NOT_APPLICABLE / COMPLETED) + no appeal -> MUST PASS
    for valid_duty in ("COMPLETED", "WAIVED_EMPTY_POOL", "NOT_APPLICABLE"):
        sub_valid = PeerAssignmentSubmissionModel(
            id="sub_1",
            user_id="u1",
            item_id="item_peer_1",
            submission_url="https://example.com",
            text_content="Essay",
            created_at="2026-11-01T00:00:00Z",
            final_score=95.0,
            status="PUBLISHED",
            review_duty_status=valid_duty,
        )
        mock_session.execute.side_effect = _mock_execute_sequence([sub_valid], [])
        ok, err = await repo.check_graded_items_and_appeals_eligibility("u1", "c1")
        assert ok is True
        assert err == ""
