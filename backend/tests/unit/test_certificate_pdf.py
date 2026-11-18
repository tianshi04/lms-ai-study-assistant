import socket
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image
from starlette.routing import Route
from starlette.testclient import TestClient

from src.modules.certificate.application import CertificateUseCase
from src.modules.certificate.domain import (
    CertificateNotFoundError,
    CertificatePdfRenderInput,
    CertificateRevokedError,
    InvalidCertificateIdError,
    VerifiedCertificate,
)
from src.modules.certificate.infrastructure.asset_loader import CertificateAssetLoader
from src.modules.certificate.infrastructure.pdf_renderer import (
    ReportLabCertificatePdfRenderer,
)
from src.modules.certificate.presentation.pdf_handler import (
    make_certificate_pdf_endpoint,
)


def _make_png_bytes(color: tuple[int, int, int, int] = (0, 86, 210, 255)) -> bytes:
    img = Image.new("RGBA", (60, 24), color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _sample_cert(
    *,
    certificate_id: str = "CERT-DEMO12345",
    is_revoked: bool = False,
    specialization_id: str | None = None,
    partner_logo_url: str = "https://example.com/logo.svg",
    signature_image_url: str = "",
) -> VerifiedCertificate:
    return VerifiedCertificate(
        certificate_id=certificate_id,
        user_id="user_1",
        course_id="course-python-ai",
        learner_name="Nguyễn Trần Minh Khôi",
        course_title="Lập trình Python & Trí tuệ nhân tạo <Phiên bản 2026> — Chuyên sâu",
        partner_name="Đại học Bách Khoa & DeepLearning.AI",
        partner_logo_url=partner_logo_url,
        issue_date="22/07/2026",
        verification_url=f"/verify/{certificate_id}",
        qr_code_url="",
        open_badges_json_ld={},
        is_revoked=is_revoked,
        specialization_id=specialization_id,
        signer_name="GS. Nguyễn Văn An",
        signer_title="Giám đốc Học thuật",
        signature_image_url=signature_image_url,
    )


def test_reportlab_renderer_produces_valid_pdf_with_vietnamese_and_fallback() -> None:
    renderer = ReportLabCertificatePdfRenderer()
    payload = CertificatePdfRenderInput(
        certificate=_sample_cert(),
        verification_url="https://lms.example.com/verify/CERT-DEMO12345",
        partner_logo_bytes=None,
        signature_image_bytes=None,
    )
    pdf_bytes = renderer.render(payload)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000


def test_reportlab_renderer_specialization_with_raster_assets() -> None:
    renderer = ReportLabCertificatePdfRenderer()
    png = _make_png_bytes()
    payload = CertificatePdfRenderInput(
        certificate=_sample_cert(
            certificate_id="CERT-SPEC-12345678",
            specialization_id="spec-ai",
        ),
        verification_url="https://lms.example.com/verify/CERT-SPEC-12345678",
        partner_logo_bytes=png,
        signature_image_bytes=png,
    )
    pdf_bytes = renderer.render(payload)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000


def test_reportlab_renderer_long_text_autoshrink_and_truncation() -> None:
    renderer = ReportLabCertificatePdfRenderer()
    long_cert = _sample_cert(
        partner_logo_url="",
        signature_image_url="",
    )
    long_cert.learner_name = (
        "Nguyễn Trần Hoàng Phúc Bảo Ngọc Khang Minh Anh Tuấn Kiệt" * 2
    )
    long_cert.course_title = (
        "Chương trình Chuyên sâu Kiến trúc Hệ thống Phân tán, Học máy Quy mô lớn, "
        "Tối ưu Hóa Dữ liệu & Bảo mật Ứng dụng Doanh nghiệp Toàn diện 2026 " * 2
    )
    long_cert.signer_title = (
        "Phó Chủ tịch Cấp cao phụ trách Đào tạo & Nghiên cứu Quốc tế " * 2
    )

    payload = CertificatePdfRenderInput(
        certificate=long_cert,
        verification_url="https://lms.example.com/verify/CERT-DEMO12345",
    )
    pdf_bytes = renderer.render(payload)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000


@pytest.mark.asyncio
async def test_asset_loader_blocks_ssrf_and_skips_svg() -> None:
    loader = CertificateAssetLoader()
    assert await loader.load_image_bytes("") is None
    assert await loader.load_image_bytes("https://example.com/logo.svg") is None
    assert await loader.load_image_bytes("http://127.0.0.1:9000/secret.png") is None
    assert await loader.load_image_bytes("http://10.0.0.5/internal.png") is None

    fake_loop = MagicMock()
    fake_loop.getaddrinfo = AsyncMock(
        return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 80))
        ]
    )
    with patch(
        "src.modules.certificate.infrastructure.asset_loader.asyncio.get_running_loop",
        return_value=fake_loop,
    ):
        assert (
            await loader.load_image_bytes("https://metadata-alias.example.com/a.png")
            is None
        )


@pytest.mark.asyncio
async def test_asset_loader_rejects_oversized_content_length() -> None:
    loader = CertificateAssetLoader()

    class _FakeStreamResponse:
        def __init__(self) -> None:
            self.status_code = 200
            self.headers = {
                "content-type": "image/png",
                "content-length": str(10 * 1024 * 1024),
            }

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

    fake_client = MagicMock()
    fake_client.stream.return_value = _FakeStreamResponse()
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch(
            "src.modules.certificate.infrastructure.asset_loader._is_safe_public_http_url",
            AsyncMock(return_value=True),
        ),
        patch(
            "src.modules.certificate.infrastructure.asset_loader.httpx.AsyncClient",
            return_value=fake_client,
        ),
    ):
        assert await loader.load_image_bytes("https://cdn.example.com/huge.png") is None


@pytest.mark.asyncio
async def test_asset_loader_loads_internal_s3_png() -> None:
    loader = CertificateAssetLoader()
    mock_s3 = MagicMock()
    mock_s3.download_file = AsyncMock(return_value=_make_png_bytes())

    with patch(
        "src.modules.certificate.infrastructure.asset_loader.get_s3_storage_service",
        return_value=mock_s3,
    ):
        result = await loader.load_image_bytes("/coursera-assets/public/logo.png")

    assert result is not None
    assert result.startswith(b"\x89PNG")
    mock_s3.download_file.assert_awaited_once_with("public/logo.png")


@pytest.mark.asyncio
async def test_generate_certificate_pdf_validation_and_revocation() -> None:
    repo = AsyncMock()
    renderer = ReportLabCertificatePdfRenderer()
    uc = CertificateUseCase(repo=repo, pdf_renderer=renderer)

    with pytest.raises(InvalidCertificateIdError):
        await uc.generate_certificate_pdf("../etc/passwd")

    repo.get_certificate_by_id.return_value = None
    with pytest.raises(CertificateNotFoundError):
        await uc.generate_certificate_pdf("CERT-MISSING1")

    repo.get_certificate_by_id.return_value = _sample_cert(is_revoked=True)
    with pytest.raises(CertificateRevokedError):
        await uc.generate_certificate_pdf("CERT-DEMO12345")


@pytest.mark.asyncio
async def test_generate_certificate_pdf_skips_duplicate_signature_logo() -> None:
    logo_url = "https://cdn.example.com/logo.png"
    cert = _sample_cert(partner_logo_url=logo_url, signature_image_url=logo_url)

    repo = AsyncMock()
    repo.get_certificate_by_id.return_value = cert

    asset_loader = AsyncMock()
    asset_loader.load_image_bytes.return_value = _make_png_bytes()

    renderer = MagicMock()
    renderer.render.return_value = b"%PDF-1.4 mock"

    uc = CertificateUseCase(
        repo=repo,
        pdf_renderer=renderer,
        asset_loader=asset_loader,
    )
    pdf_bytes, filename = await uc.generate_certificate_pdf("CERT-DEMO12345")

    assert pdf_bytes == b"%PDF-1.4 mock"
    assert filename == "Chung-chi-CERT-DEMO12345.pdf"
    asset_loader.load_image_bytes.assert_awaited_once_with(logo_url)
    render_arg: CertificatePdfRenderInput = renderer.render.call_args[0][0]
    assert render_arg.partner_logo_bytes is not None
    assert render_arg.signature_image_bytes is None


def test_certificate_pdf_http_endpoint_responses() -> None:
    use_case = AsyncMock()
    endpoint = make_certificate_pdf_endpoint(use_case)
    client = TestClient(
        Route(
            "/api/v1/certificates/{certificate_id}/pdf",
            endpoint=endpoint,
            methods=["GET"],
        )
    )

    use_case.generate_certificate_pdf.return_value = (
        b"%PDF-1.4 ok",
        "Chung-chi-CERT-DEMO12345.pdf",
    )
    res_dl = client.get("/api/v1/certificates/CERT-DEMO12345/pdf?download=1")
    assert res_dl.status_code == 200
    assert res_dl.headers["content-type"] == "application/pdf"
    assert (
        res_dl.headers["content-disposition"]
        == 'attachment; filename="Chung-chi-CERT-DEMO12345.pdf"'
    )
    assert res_dl.headers["cache-control"] == "no-store"
    assert res_dl.content == b"%PDF-1.4 ok"

    res_inline = client.get("/api/v1/certificates/CERT-DEMO12345/pdf")
    assert res_inline.status_code == 200
    assert (
        res_inline.headers["content-disposition"]
        == 'inline; filename="Chung-chi-CERT-DEMO12345.pdf"'
    )

    use_case.generate_certificate_pdf.side_effect = CertificateRevokedError(
        "Đã thu hồi"
    )
    res_revoked = client.get("/api/v1/certificates/CERT-REVOKED/pdf")
    assert res_revoked.status_code == 403
    assert res_revoked.json()["detail"] == "Đã thu hồi"

    use_case.generate_certificate_pdf.side_effect = CertificateNotFoundError(
        "Không tìm thấy"
    )
    res_not_found = client.get("/api/v1/certificates/CERT-404/pdf")
    assert res_not_found.status_code == 404

    use_case.generate_certificate_pdf.side_effect = InvalidCertificateIdError(
        "Không hợp lệ"
    )
    res_invalid = client.get("/api/v1/certificates/bad!id/pdf")
    assert res_invalid.status_code == 400
