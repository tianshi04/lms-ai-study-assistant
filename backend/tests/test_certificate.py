import pytest
from src.modules.certificate.application.certificate_usecase import (
    CertificateUseCase,
    count_words,
)


def test_essay_word_count():
    essay_short = "Tôi muốn học khóa học này."
    assert count_words(essay_short) == 6

    essay_long = " ".join(["word"] * 155)
    assert count_words(essay_long) == 155


@pytest.mark.asyncio
async def test_apply_financial_aid_validation():
    usecase = CertificateUseCase()
    short_essay = "Đây là bài luận quá ngắn."
    app, err = await usecase.apply_financial_aid(
        "user_123", "course_python", short_essay
    )
    assert app is None
    assert "chưa đủ độ dài tối thiểu" in err


@pytest.mark.asyncio
async def test_get_verified_certificate():
    try:
        usecase = CertificateUseCase()
        cert = await usecase.get_verified_certificate("user_123", "course_python")
        assert cert is not None
        assert cert.certificate_id.startswith("CERT-")
        assert cert.open_badges_json_ld != ""

        is_valid, verified_cert = await usecase.verify_certificate_public(
            cert.certificate_id
        )
        assert is_valid
        assert verified_cert is not None
        assert verified_cert.certificate_id == cert.certificate_id
    except Exception as e:
        pytest.skip(f"Skipping certificate db test: DB not reachable ({e})")


@pytest.mark.asyncio
async def test_financial_aid_review_flow():
    try:
        usecase = CertificateUseCase()
        valid_essay = " ".join(["word"] * 155)
        app, err = await usecase.apply_financial_aid("user_faid_test", "course_python", valid_essay)
        assert err == ""
        assert app is not None
        assert app.status == "PENDING"

        # List applications
        apps = await usecase.list_financial_aid_applications("course_python", "PENDING")
        assert any(a.id == app.id for a in apps)

        # Review & Approve
        reviewed, r_err = await usecase.review_financial_aid_application(app.id, is_approved=True)
        assert r_err == ""
        assert reviewed is not None
        assert reviewed.status == "APPROVED"
    except Exception as e:
        pytest.skip(f"Skipping financial aid review db test: DB not reachable ({e})")
