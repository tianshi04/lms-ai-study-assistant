import html
import threading
from io import BytesIO
from pathlib import Path

import segno
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

from src.modules.certificate.domain import (
    CERTIFICATE_PDF_BORDER_INSET_PT,
    CERTIFICATE_PDF_PAGE_MARGIN_PT,
    CERTIFICATE_PDF_QR_SIZE_PT,
    CertificatePdfRenderInput,
    ICertificatePdfRenderer,
)

_FONTS_DIR = Path(__file__).resolve().parent / "assets" / "fonts"
_FONT_REGULAR = "BeVietnamPro"
_FONT_BOLD = "BeVietnamPro-Bold"
_FONT_ITALIC = "BeVietnamPro-Italic"
_FONT_LOCK = threading.Lock()

_PRIMARY_HEX = "#0056D2"
_DARK_HEX = "#0F172A"
_MUTED_HEX = "#475569"
_BORDER_HEX = "#CBD5E1"
_SURFACE_HEX = "#F8FAFC"


def _ensure_fonts_registered() -> None:
    with _FONT_LOCK:
        registered = set(pdfmetrics.getRegisteredFontNames())
        font_files = {
            _FONT_REGULAR: _FONTS_DIR / "BeVietnamPro-Regular.ttf",
            _FONT_BOLD: _FONTS_DIR / "BeVietnamPro-Bold.ttf",
            _FONT_ITALIC: _FONTS_DIR / "BeVietnamPro-Italic.ttf",
        }
        for font_name, font_path in font_files.items():
            if font_name not in registered:
                pdfmetrics.registerFont(TTFont(font_name, str(font_path)))


def _truncate_text(text: str, max_chars: int) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[: max_chars - 1].rstrip()}…"


def _build_qr_png_bytes(verification_url: str) -> bytes:
    qr = segno.make(verification_url, error="m")
    buf = BytesIO()
    qr.save(buf, kind="png", scale=5, border=1, dark="#0F172A", light="#FFFFFF")
    return buf.getvalue()


def _draw_fitted_image(
    canvas: Canvas,
    image_bytes: bytes,
    x: float,
    y: float,
    max_width: float,
    max_height: float,
    *,
    align_right: bool = False,
) -> None:
    reader = ImageReader(BytesIO(image_bytes))
    img_w, img_h = reader.getSize()
    if img_w <= 0 or img_h <= 0:
        return
    scale = min(max_width / img_w, max_height / img_h)
    draw_w = img_w * scale
    draw_h = img_h * scale
    draw_x = (x + max_width - draw_w) if align_right else x
    draw_y = y + (max_height - draw_h) / 2.0
    canvas.drawImage(
        reader,
        draw_x,
        draw_y,
        width=draw_w,
        height=draw_h,
        preserveAspectRatio=True,
        mask="auto",
    )


def _measure_wrapped(
    text: str,
    *,
    max_width: float,
    font_name: str,
    font_size: float,
    leading: float,
    text_color: colors.Color,
) -> tuple[Paragraph, float]:
    style = ParagraphStyle(
        name="CertWrapped",
        fontName=font_name,
        fontSize=font_size,
        leading=leading,
        alignment=TA_CENTER,
        textColor=text_color,
    )
    paragraph = Paragraph(html.escape(text or ""), style)
    _, height = paragraph.wrap(max_width, 200)
    return paragraph, height


def _draw_wrapped_fit(
    canvas: Canvas,
    text: str,
    *,
    center_x: float,
    top_y: float,
    max_width: float,
    max_height: float,
    font_name: str,
    font_size: float,
    min_font_size: float,
    text_color: colors.Color,
) -> float:
    """Wrap centered text and shrink font size if needed so it never overflows max_height."""
    current_size = font_size
    paragraph, height = _measure_wrapped(
        text,
        max_width=max_width,
        font_name=font_name,
        font_size=current_size,
        leading=current_size * 1.28,
        text_color=text_color,
    )
    while height > max_height and current_size > min_font_size:
        current_size = max(min_font_size, current_size - 2.0)
        paragraph, height = _measure_wrapped(
            text,
            max_width=max_width,
            font_name=font_name,
            font_size=current_size,
            leading=current_size * 1.28,
            text_color=text_color,
        )

    bottom_y = top_y - min(height, max_height)
    paragraph.drawOn(canvas, center_x - max_width / 2.0, bottom_y)
    return bottom_y


class ReportLabCertificatePdfRenderer(ICertificatePdfRenderer):
    """Render official A4 Landscape Verified Certificates in pure Python."""

    def render(self, payload: CertificatePdfRenderInput) -> bytes:
        _ensure_fonts_registered()

        cert = payload.certificate
        page_w, page_h = landscape(A4)
        margin = CERTIFICATE_PDF_PAGE_MARGIN_PT
        inset = CERTIFICATE_PDF_BORDER_INSET_PT
        content_left = inset + 28.0
        content_right = page_w - inset - 28.0
        content_width = content_right - content_left
        center_x = page_w / 2.0

        buffer = BytesIO()
        canvas = Canvas(buffer, pagesize=(page_w, page_h))
        canvas.setTitle(f"Chung chi {cert.certificate_id}")
        canvas.setAuthor("Coursera AI LMS")

        self._draw_frame(canvas, page_w, page_h, margin, inset)
        is_spec = bool(cert.specialization_id) or (
            bool(cert.course_id) and cert.course_id.startswith("spec:")
        )
        divider_y = self._draw_header(
            canvas,
            cert=cert,
            is_spec=is_spec,
            partner_logo_bytes=payload.partner_logo_bytes,
            page_h=page_h,
            inset=inset,
            content_left=content_left,
            content_right=content_right,
        )

        # Anchor footer & metadata/signer section first so center body always fits cleanly above them
        footer_divider_y = inset + 96.0
        meta_y = footer_divider_y + 28.0
        body_bottom_limit = meta_y + 72.0

        self._draw_center_body(
            canvas,
            cert=cert,
            is_spec=is_spec,
            center_x=center_x,
            top_y=divider_y - 26.0,
            bottom_limit=body_bottom_limit,
            content_width=content_width,
        )
        self._draw_metadata_and_signer(
            canvas,
            cert=cert,
            signature_image_bytes=payload.signature_image_bytes,
            content_left=content_left,
            content_right=content_right,
            meta_y=meta_y,
        )
        self._draw_footer(
            canvas,
            verification_url=payload.verification_url,
            inset=inset,
            content_left=content_left,
            content_right=content_right,
            footer_divider_y=footer_divider_y,
        )

        canvas.showPage()
        canvas.save()
        return buffer.getvalue()

    @staticmethod
    def _draw_frame(
        canvas: Canvas, page_w: float, page_h: float, margin: float, inset: float
    ) -> None:
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, page_w, page_h, stroke=0, fill=1)

        canvas.setStrokeColor(colors.HexColor(_PRIMARY_HEX))
        canvas.setLineWidth(3.0)
        canvas.rect(
            margin,
            margin,
            page_w - 2 * margin,
            page_h - 2 * margin,
            stroke=1,
            fill=0,
        )

        canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
        canvas.setLineWidth(1.0)
        canvas.rect(
            inset,
            inset,
            page_w - 2 * inset,
            page_h - 2 * inset,
            stroke=1,
            fill=0,
        )

        canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
        canvas.rect(
            inset,
            page_h - inset - 8.0,
            page_w - 2 * inset,
            8.0,
            stroke=0,
            fill=1,
        )

    @staticmethod
    def _draw_header(
        canvas: Canvas,
        *,
        cert,
        is_spec: bool,
        partner_logo_bytes: bytes | None,
        page_h: float,
        inset: float,
        content_left: float,
        content_right: float,
    ) -> float:
        badge_label = (
            "CHỨNG CHỈ CHUYÊN NGÀNH (SPECIALIZATION)"
            if is_spec
            else "CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC"
        )
        header_top_y = page_h - inset - 36.0
        canvas.setFont(_FONT_BOLD, 10)
        canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
        canvas.drawString(content_left, header_top_y, badge_label)

        partner_display = _truncate_text(cert.partner_name or "Coursera AI LMS", 54)
        canvas.setFont(_FONT_BOLD, 17)
        canvas.setFillColor(colors.HexColor(_DARK_HEX))
        canvas.drawString(content_left, header_top_y - 22.0, partner_display)

        if partner_logo_bytes:
            _draw_fitted_image(
                canvas,
                partner_logo_bytes,
                content_right - 120.0,
                header_top_y - 26.0,
                120.0,
                40.0,
                align_right=True,
            )
        else:
            initials = (cert.partner_name or "LM")[:2].upper()
            canvas.setFillColor(colors.HexColor(_SURFACE_HEX))
            canvas.setStrokeColor(colors.HexColor(_PRIMARY_HEX))
            canvas.setLineWidth(1.0)
            canvas.roundRect(
                content_right - 40.0,
                header_top_y - 24.0,
                40.0,
                36.0,
                6.0,
                stroke=1,
                fill=1,
            )
            canvas.setFont(_FONT_BOLD, 13)
            canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
            canvas.drawCentredString(
                content_right - 20.0, header_top_y - 11.0, initials
            )

        divider_y = header_top_y - 42.0
        canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
        canvas.setLineWidth(0.75)
        canvas.line(content_left, divider_y, content_right, divider_y)
        return divider_y

    @staticmethod
    def _draw_center_body(
        canvas: Canvas,
        *,
        cert,
        is_spec: bool,
        center_x: float,
        top_y: float,
        bottom_limit: float,
        content_width: float,
    ) -> None:
        canvas.setFont(_FONT_BOLD, 10)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawCentredString(center_x, top_y, "CHỨNG NHẬN RẰNG HỌC VIÊN")

        learner_bottom = _draw_wrapped_fit(
            canvas,
            cert.learner_name or "Học viên",
            center_x=center_x,
            top_y=top_y - 12.0,
            max_width=content_width - 40.0,
            max_height=72.0,
            font_name=_FONT_BOLD,
            font_size=26,
            min_font_size=16,
            text_color=colors.HexColor(_PRIMARY_HEX),
        )

        subtitle_y = learner_bottom - 18.0
        completion_subtitle = (
            "Đã hoàn thành xuất sắc toàn bộ các khóa học trong chuyên ngành"
            if is_spec
            else "Đã hoàn thành xuất sắc toàn bộ yêu cầu của khóa học"
        )
        canvas.setFont(_FONT_REGULAR, 11.5)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawCentredString(center_x, subtitle_y, completion_subtitle)

        course_top_y = subtitle_y - 14.0
        remaining_height = max(36.0, course_top_y - bottom_limit)
        _draw_wrapped_fit(
            canvas,
            cert.course_title,
            center_x=center_x,
            top_y=course_top_y,
            max_width=content_width - 60.0,
            max_height=remaining_height,
            font_name=_FONT_BOLD,
            font_size=18,
            min_font_size=12,
            text_color=colors.HexColor(_DARK_HEX),
        )

    @staticmethod
    def _draw_metadata_and_signer(
        canvas: Canvas,
        *,
        cert,
        signature_image_bytes: bytes | None,
        content_left: float,
        content_right: float,
        meta_y: float,
    ) -> None:
        canvas.setFont(_FONT_REGULAR, 10)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawString(content_left, meta_y + 18.0, f"Ngày cấp: {cert.issue_date}")
        canvas.setFont(_FONT_BOLD, 10)
        canvas.setFillColor(colors.HexColor(_DARK_HEX))
        canvas.drawString(content_left, meta_y, f"Mã xác thực: {cert.certificate_id}")

        signer_name = _truncate_text(
            cert.signer_name or cert.partner_name or "Ban Giám Hiệu", 44
        )
        signer_title = _truncate_text(
            cert.signer_title or "Đại diện đơn vị cấp chứng chỉ", 54
        )

        if signature_image_bytes:
            _draw_fitted_image(
                canvas,
                signature_image_bytes,
                content_right - 150.0,
                meta_y + 22.0,
                150.0,
                36.0,
                align_right=True,
            )
        else:
            canvas.setFont(_FONT_ITALIC, 14)
            canvas.setFillColor(colors.HexColor(_MUTED_HEX))
            canvas.drawRightString(content_right, meta_y + 28.0, signer_name)

        canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
        canvas.setLineWidth(0.8)
        canvas.line(content_right - 170.0, meta_y + 20.0, content_right, meta_y + 20.0)

        canvas.setFont(_FONT_BOLD, 10.5)
        canvas.setFillColor(colors.HexColor(_DARK_HEX))
        canvas.drawRightString(content_right, meta_y + 5.0, signer_name)

        canvas.setFont(_FONT_REGULAR, 9)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawRightString(content_right, meta_y - 9.0, signer_title)

    @staticmethod
    def _draw_footer(
        canvas: Canvas,
        *,
        verification_url: str,
        inset: float,
        content_left: float,
        content_right: float,
        footer_divider_y: float,
    ) -> None:
        canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
        canvas.setLineWidth(0.75)
        canvas.line(content_left, footer_divider_y, content_right, footer_divider_y)

        qr_size = CERTIFICATE_PDF_QR_SIZE_PT
        qr_y = inset + 14.0
        qr_bytes = _build_qr_png_bytes(verification_url)
        canvas.drawImage(
            ImageReader(BytesIO(qr_bytes)),
            content_left,
            qr_y,
            width=qr_size,
            height=qr_size,
            preserveAspectRatio=True,
        )

        text_x = content_left + qr_size + 14.0
        canvas.setFont(_FONT_BOLD, 10)
        canvas.setFillColor(colors.HexColor(_DARK_HEX))
        canvas.drawString(
            text_x,
            qr_y + qr_size - 16.0,
            "Được xác thực bởi Coursera AI LMS Platform",
        )
        canvas.setFont(_FONT_REGULAR, 9)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawString(
            text_x,
            qr_y + qr_size - 32.0,
            "Quét mã QR hoặc truy cập đường dẫn bên dưới để kiểm tra tính hợp lệ:",
        )
        canvas.setFont(_FONT_BOLD, 9)
        canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
        canvas.drawString(
            text_x, qr_y + qr_size - 48.0, _truncate_text(verification_url, 88)
        )
