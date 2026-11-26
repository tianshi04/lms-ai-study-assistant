import html
import math
import threading
from io import BytesIO
from pathlib import Path

import segno
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
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
_NAVY_HEX = "#1E293B"
_MUTED_HEX = "#475569"
_SUBTLE_HEX = "#64748B"
_BORDER_HEX = "#CBD5E1"
_INNER_BORDER_HEX = "#E2E8F0"
_GOLD_HEX = "#C89B3C"
_RIBBON_BG_HEX = "#EEF3F9"
_SEAL_TRACK_HEX = "#F8FAFC"
_GUILLOCHE_WARM_HEX = "#ECE0C9"
_GUILLOCHE_COOL_HEX = "#E5EDF8"


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
    qr.save(buf, kind="png", scale=5, border=1, dark=_DARK_HEX, light="#FFFFFF")
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
) -> float:
    """Draw image fitted inside ``max_width x max_height`` and return rendered width."""
    reader = ImageReader(BytesIO(image_bytes))
    img_w, img_h = reader.getSize()
    if img_w <= 0 or img_h <= 0:
        return 0.0
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
    return draw_w


def _measure_wrapped(
    text: str,
    *,
    max_width: float,
    font_name: str,
    font_size: float,
    leading: float,
    text_color: colors.Color,
    alignment: int = TA_LEFT,
) -> tuple[Paragraph, float]:
    style = ParagraphStyle(
        name="CertWrapped",
        fontName=font_name,
        fontSize=font_size,
        leading=leading,
        alignment=alignment,
        textColor=text_color,
    )
    paragraph = Paragraph(html.escape(text or ""), style)
    _, height = paragraph.wrap(max_width, 240)
    return paragraph, height


def _draw_wrapped_fit(
    canvas: Canvas,
    text: str,
    *,
    left_x: float,
    top_y: float,
    max_width: float,
    max_height: float,
    font_name: str,
    font_size: float,
    min_font_size: float,
    text_color: colors.Color,
    alignment: int = TA_LEFT,
) -> float:
    """Wrap text within bounds, shrinking font size cleanly if needed."""
    current_size = font_size
    paragraph, height = _measure_wrapped(
        text,
        max_width=max_width,
        font_name=font_name,
        font_size=current_size,
        leading=current_size * 1.24,
        text_color=text_color,
        alignment=alignment,
    )
    while height > max_height and current_size > min_font_size:
        current_size = max(min_font_size, current_size - 1.5)
        paragraph, height = _measure_wrapped(
            text,
            max_width=max_width,
            font_name=font_name,
            font_size=current_size,
            leading=current_size * 1.24,
            text_color=text_color,
            alignment=alignment,
        )

    bottom_y = top_y - min(height, max_height)
    paragraph.drawOn(canvas, left_x, bottom_y)
    return bottom_y


def _draw_spaced_centred_string(
    canvas: Canvas,
    cx: float,
    y: float,
    text: str,
    *,
    font_name: str,
    font_size: float,
    char_space: float,
    text_color: colors.Color,
) -> None:
    """Draw horizontally centered uppercase tracking without splitting Vietnamese clusters."""
    glyph_w = pdfmetrics.stringWidth(text, font_name, font_size)
    extra_w = max(0, len(text) - 1) * char_space
    tx = canvas.beginText(cx - (glyph_w + extra_w) / 2.0, y)
    tx.setFont(font_name, font_size)
    tx.setFillColor(text_color)
    tx.setCharSpace(char_space)
    tx.textOut(text)
    canvas.drawText(tx)


def _draw_guilloche_rosette(
    canvas: Canvas,
    cx: float,
    cy: float,
    *,
    inner_radius: float,
    outer_radius: float,
    layers: int,
    petals: int,
    stroke_hex: str,
    line_width: float = 0.45,
) -> None:
    """Draw a fine concentric mathematical guilloche rosette watermark."""
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor(stroke_hex))
    canvas.setLineWidth(line_width)
    steps = 180
    for layer in range(layers):
        t = layer / max(1, layers - 1)
        base_r = inner_radius + (outer_radius - inner_radius) * t
        amp = (0.085 + 0.035 * math.sin(t * math.pi)) * base_r
        phase = layer * (math.pi / (petals * 1.5))
        path = canvas.beginPath()
        for step in range(steps + 1):
            theta = (2.0 * math.pi * step) / steps
            r = (
                base_r
                + amp * math.cos(petals * theta + phase)
                + (amp * 0.25) * math.sin((petals // 2) * theta)
            )
            px = cx + r * math.cos(theta)
            py = cy + r * math.sin(theta)
            if step == 0:
                path.moveTo(px, py)
            else:
                path.lineTo(px, py)
        path.close()
        canvas.drawPath(path, stroke=1, fill=0)
    canvas.restoreState()


def _draw_arc_text(
    canvas: Canvas,
    text: str,
    cx: float,
    cy: float,
    radius: float,
    *,
    font_name: str,
    font_size: float,
    text_color: colors.Color,
    top: bool = True,
    step_deg: float = 9.0,
) -> None:
    """Render characters cleanly along a circular arc (top reads L->R, bottom upright)."""
    if not text:
        return
    total_span = (len(text) - 1) * step_deg
    canvas.saveState()
    canvas.setFont(font_name, font_size)
    canvas.setFillColor(text_color)
    for idx, ch in enumerate(text):
        offset_deg = -total_span / 2.0 + idx * step_deg
        if top:
            theta_deg = 90.0 - offset_deg
            rotate_deg = theta_deg - 90.0
        else:
            theta_deg = 270.0 + offset_deg
            rotate_deg = theta_deg + 90.0
        theta_rad = math.radians(theta_deg)
        px = cx + radius * math.cos(theta_rad)
        py = cy + radius * math.sin(theta_rad)
        canvas.saveState()
        canvas.translate(px, py)
        canvas.rotate(rotate_deg)
        canvas.drawCentredString(0, -font_size * 0.34, ch)
        canvas.restoreState()
    canvas.restoreState()


def _draw_four_point_star(
    canvas: Canvas, cx: float, cy: float, radius: float, fill_color: colors.Color
) -> None:
    canvas.saveState()
    canvas.setFillColor(fill_color)
    p = canvas.beginPath()
    inner = radius * 0.28
    coords = [
        (cx, cy + radius),
        (cx + inner, cy + inner),
        (cx + radius, cy),
        (cx + inner, cy - inner),
        (cx, cy - radius),
        (cx - inner, cy - inner),
        (cx - radius, cy),
        (cx - inner, cy + inner),
    ]
    p.moveTo(*coords[0])
    for x, y in coords[1:]:
        p.lineTo(x, y)
    p.close()
    canvas.drawPath(p, stroke=0, fill=1)
    canvas.restoreState()


def _draw_graduation_cap(
    canvas: Canvas, cx: float, cy: float, scale: float = 1.0
) -> None:
    """Draw a minimal crisp graduation cap + gold tassel emblem inside the seal."""
    canvas.saveState()
    canvas.translate(cx, cy)
    canvas.scale(scale, scale)

    canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
    diamond = canvas.beginPath()
    diamond.moveTo(0, 7.5)
    diamond.lineTo(13.5, 1.5)
    diamond.lineTo(0, -4.5)
    diamond.lineTo(-13.5, 1.5)
    diamond.close()
    canvas.drawPath(diamond, stroke=0, fill=1)

    canvas.setFillColor(colors.HexColor(_NAVY_HEX))
    base = canvas.beginPath()
    base.moveTo(-7.5, -2.5)
    base.lineTo(-7.5, -7.2)
    base.curveTo(-3.0, -9.8, 3.0, -9.8, 7.5, -7.2)
    base.lineTo(7.5, -2.5)
    base.lineTo(0, -5.8)
    base.close()
    canvas.drawPath(base, stroke=0, fill=1)

    canvas.setStrokeColor(colors.HexColor(_GOLD_HEX))
    canvas.setLineWidth(1.2)
    canvas.line(11.0, 1.0, 11.0, -6.8)
    canvas.setFillColor(colors.HexColor(_GOLD_HEX))
    canvas.circle(11.0, -7.5, 1.4, stroke=0, fill=1)
    canvas.restoreState()


def _draw_notched_frame(
    canvas: Canvas, page_w: float, page_h: float, margin: float, inset: float
) -> None:
    """Draw white certificate paper and classic Coursera-style notched diplomatic borders."""
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, page_w, page_h, stroke=0, fill=1)

    notch = 11.0
    left = margin
    right = page_w - margin
    bottom = margin
    top = page_h - margin

    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
    canvas.setLineWidth(1.25)
    p = canvas.beginPath()
    p.moveTo(left + notch, bottom)
    p.lineTo(right - notch, bottom)
    p.lineTo(right - notch, bottom + notch)
    p.lineTo(right, bottom + notch)
    p.lineTo(right, top - notch)
    p.lineTo(right - notch, top - notch)
    p.lineTo(right - notch, top)
    p.lineTo(left + notch, top)
    p.lineTo(left + notch, top - notch)
    p.lineTo(left, top - notch)
    p.lineTo(left, bottom + notch)
    p.lineTo(left + notch, bottom + notch)
    p.close()
    canvas.drawPath(p, stroke=1, fill=0)

    canvas.setStrokeColor(colors.HexColor(_INNER_BORDER_HEX))
    canvas.setLineWidth(0.6)
    canvas.rect(
        inset,
        inset,
        page_w - 2 * inset,
        page_h - 2 * inset,
        stroke=1,
        fill=0,
    )

    # Small antique-gold diamond pips inside the 4 notched corners
    pip_color = colors.HexColor(_GOLD_HEX)
    for px, py in (
        (left + notch / 2.0, bottom + notch / 2.0),
        (right - notch / 2.0, bottom + notch / 2.0),
        (left + notch / 2.0, top - notch / 2.0),
        (right - notch / 2.0, top - notch / 2.0),
    ):
        _draw_four_point_star(canvas, px, py, 2.8, pip_color)
    canvas.restoreState()


def _draw_right_ribbon_and_seal(
    canvas: Canvas,
    *,
    is_spec: bool,
    ribbon_left: float,
    ribbon_right: float,
    top_y: float,
    shoulder_y: float,
    tip_y: float,
) -> None:
    cx = (ribbon_left + ribbon_right) / 2.0

    # Pennant ribbon body
    canvas.saveState()
    canvas.setFillColor(colors.HexColor(_RIBBON_BG_HEX))
    canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
    canvas.setLineWidth(1.0)
    ribbon = canvas.beginPath()
    ribbon.moveTo(ribbon_left, top_y)
    ribbon.lineTo(ribbon_right, top_y)
    ribbon.lineTo(ribbon_right, shoulder_y)
    ribbon.lineTo(cx, tip_y)
    ribbon.lineTo(ribbon_left, shoulder_y)
    ribbon.close()
    canvas.drawPath(ribbon, stroke=1, fill=1)

    # Personal LMS AI crown accent bars along top edge of ribbon
    canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
    canvas.rect(
        ribbon_left + 0.5,
        top_y - 5.0,
        ribbon_right - ribbon_left - 1.0,
        4.8,
        stroke=0,
        fill=1,
    )
    canvas.setFillColor(colors.HexColor(_GOLD_HEX))
    canvas.rect(
        ribbon_left + 0.5,
        top_y - 7.0,
        ribbon_right - ribbon_left - 1.0,
        1.5,
        stroke=0,
        fill=1,
    )

    # Spaced uppercase title near ribbon top
    line_two = "CHUYÊN NGÀNH" if is_spec else "KHÓA HỌC"
    sub_eng = "SPECIALIZATION CERTIFICATE" if is_spec else "COURSE CERTIFICATE"
    _draw_spaced_centred_string(
        canvas,
        cx,
        top_y - 46.0,
        "CHỨNG CHỈ",
        font_name=_FONT_BOLD,
        font_size=11.0,
        char_space=1.8,
        text_color=colors.HexColor(_NAVY_HEX),
    )
    _draw_spaced_centred_string(
        canvas,
        cx,
        top_y - 63.0,
        line_two,
        font_name=_FONT_BOLD,
        font_size=11.0,
        char_space=1.8,
        text_color=colors.HexColor(_NAVY_HEX),
    )
    _draw_spaced_centred_string(
        canvas,
        cx,
        top_y - 79.0,
        sub_eng,
        font_name=_FONT_BOLD,
        font_size=6.2,
        char_space=1.1,
        text_color=colors.HexColor(_SUBTLE_HEX),
    )

    # Circular Embossed LMS AI Medallion Seal centered in ribbon
    seal_cy = (top_y - 96.0 + shoulder_y + 24.0) / 2.0
    bead_r = 69.0
    outer_r = 63.0
    gold_r = 59.5
    inner_r = 43.0
    bead_color = colors.HexColor(_NAVY_HEX)
    for idx in range(56):
        angle = math.radians((360.0 / 56.0) * idx)
        bx = cx + bead_r * math.cos(angle)
        by = seal_cy + bead_r * math.sin(angle)
        canvas.setFillColor(bead_color)
        canvas.circle(bx, by, 1.15, stroke=0, fill=1)

    canvas.setFillColor(colors.HexColor(_SEAL_TRACK_HEX))
    canvas.setStrokeColor(colors.HexColor(_NAVY_HEX))
    canvas.setLineWidth(1.5)
    canvas.circle(cx, seal_cy, outer_r, stroke=1, fill=1)

    canvas.setStrokeColor(colors.HexColor(_GOLD_HEX))
    canvas.setLineWidth(0.9)
    canvas.circle(cx, seal_cy, gold_r, stroke=1, fill=0)

    canvas.setFillColor(colors.white)
    canvas.setStrokeColor(colors.HexColor(_PRIMARY_HEX))
    canvas.setLineWidth(1.0)
    canvas.circle(cx, seal_cy, inner_r, stroke=1, fill=1)

    _draw_arc_text(
        canvas,
        "OPENBADGES 3.0 VERIFIED",
        cx,
        seal_cy,
        51.2,
        font_name=_FONT_BOLD,
        font_size=5.6,
        text_color=colors.HexColor(_NAVY_HEX),
        top=True,
        step_deg=6.9,
    )
    _draw_arc_text(
        canvas,
        "AI-POWERED LEARNING",
        cx,
        seal_cy,
        51.2,
        font_name=_FONT_BOLD,
        font_size=5.6,
        text_color=colors.HexColor(_NAVY_HEX),
        top=False,
        step_deg=7.6,
    )
    _draw_four_point_star(canvas, cx - 51.2, seal_cy, 2.5, colors.HexColor(_GOLD_HEX))
    _draw_four_point_star(canvas, cx + 51.2, seal_cy, 2.5, colors.HexColor(_GOLD_HEX))

    _draw_graduation_cap(canvas, cx, seal_cy + 14.0, scale=0.95)
    _draw_four_point_star(
        canvas, cx + 14.5, seal_cy + 20.5, 3.6, colors.HexColor(_GOLD_HEX)
    )

    canvas.setFont(_FONT_BOLD, 15.0)
    canvas.setFillColor(colors.HexColor(_DARK_HEX))
    canvas.drawCentredString(cx, seal_cy - 10.0, "LMS AI")
    _draw_spaced_centred_string(
        canvas,
        cx,
        seal_cy - 22.0,
        "PLATFORM",
        font_name=_FONT_BOLD,
        font_size=5.8,
        char_space=1.6,
        text_color=colors.HexColor(_SUBTLE_HEX),
    )

    # Personal ornament right above V-tip
    ornament_y = shoulder_y + 18.0
    canvas.setStrokeColor(colors.HexColor(_GOLD_HEX))
    canvas.setLineWidth(0.75)
    canvas.line(cx - 24.0, ornament_y, cx - 7.0, ornament_y)
    canvas.line(cx + 7.0, ornament_y, cx + 24.0, ornament_y)
    _draw_four_point_star(canvas, cx, ornament_y, 3.4, colors.HexColor(_GOLD_HEX))
    canvas.restoreState()


class ReportLabCertificatePdfRenderer(ICertificatePdfRenderer):
    """Render official A4 Landscape Verified Certificates in pure Python."""

    def render(self, payload: CertificatePdfRenderInput) -> bytes:
        _ensure_fonts_registered()

        cert = payload.certificate
        page_w, page_h = landscape(A4)
        margin = CERTIFICATE_PDF_PAGE_MARGIN_PT
        inset = CERTIFICATE_PDF_BORDER_INSET_PT

        ribbon_w = 182.0
        ribbon_right = page_w - inset - 28.0
        ribbon_left = ribbon_right - ribbon_w
        ribbon_cx = (ribbon_left + ribbon_right) / 2.0
        ribbon_top = page_h - margin - 1.0
        ribbon_shoulder_y = inset + 122.0
        ribbon_tip_y = inset + 86.0

        left_x = inset + 36.0
        left_max_w = ribbon_left - left_x - 32.0

        buffer = BytesIO()
        canvas = Canvas(buffer, pagesize=(page_w, page_h))
        canvas.setTitle(f"Chung chi {cert.certificate_id}")
        canvas.setAuthor("LMS AI Platform")

        _draw_notched_frame(canvas, page_w, page_h, margin, inset)

        # Clip delicate guilloche rosettes strictly inside the inner diploma frame
        canvas.saveState()
        clip = canvas.beginPath()
        clip.rect(inset, inset, page_w - 2 * inset, page_h - 2 * inset)
        canvas.clipPath(clip, stroke=0, fill=0)
        _draw_guilloche_rosette(
            canvas,
            inset + 195.0,
            inset + 145.0,
            inner_radius=62.0,
            outer_radius=178.0,
            layers=13,
            petals=12,
            stroke_hex=_GUILLOCHE_WARM_HEX,
            line_width=0.42,
        )
        _draw_guilloche_rosette(
            canvas,
            ribbon_cx,
            (ribbon_top - 96.0 + ribbon_shoulder_y + 24.0) / 2.0,
            inner_radius=74.0,
            outer_radius=172.0,
            layers=12,
            petals=12,
            stroke_hex=_GUILLOCHE_COOL_HEX,
            line_width=0.45,
        )
        canvas.restoreState()

        is_spec = bool(cert.specialization_id) or (
            bool(cert.course_id) and cert.course_id.startswith("spec:")
        )
        _draw_right_ribbon_and_seal(
            canvas,
            is_spec=is_spec,
            ribbon_left=ribbon_left,
            ribbon_right=ribbon_right,
            top_y=ribbon_top,
            shoulder_y=ribbon_shoulder_y,
            tip_y=ribbon_tip_y,
        )

        self._draw_partner_header(
            canvas,
            cert=cert,
            partner_logo_bytes=payload.partner_logo_bytes,
            left_x=left_x,
            left_max_w=left_max_w,
            page_h=page_h,
            inset=inset,
        )

        sig_base_y = inset + 60.0
        body_bottom_limit = sig_base_y + 68.0
        self._draw_editorial_body(
            canvas,
            cert=cert,
            is_spec=is_spec,
            left_x=left_x,
            left_max_w=left_max_w,
            top_y=page_h - inset - 104.0,
            bottom_limit=body_bottom_limit,
        )

        self._draw_signer_block(
            canvas,
            cert=cert,
            signature_image_bytes=payload.signature_image_bytes,
            left_x=left_x,
            sig_base_y=sig_base_y,
        )

        self._draw_bottom_verification(
            canvas,
            verification_url=payload.verification_url,
            inset=inset,
            right_edge=ribbon_right,
        )

        canvas.showPage()
        canvas.save()
        return buffer.getvalue()

    @staticmethod
    def _draw_partner_header(
        canvas: Canvas,
        *,
        cert,
        partner_logo_bytes: bytes | None,
        left_x: float,
        left_max_w: float,
        page_h: float,
        inset: float,
    ) -> None:
        header_y = page_h - inset - 54.0
        partner_display = _truncate_text(cert.partner_name or "LMS AI Platform", 48)
        if partner_logo_bytes:
            logo_w = _draw_fitted_image(
                canvas,
                partner_logo_bytes,
                left_x,
                header_y - 6.0,
                116.0,
                36.0,
                align_right=False,
            )
            text_x = left_x + (logo_w + 12.0 if logo_w > 0 else 0.0)
            max_name_w = max(140.0, left_max_w - (text_x - left_x))
            _draw_wrapped_fit(
                canvas,
                partner_display,
                left_x=text_x,
                top_y=header_y + 22.0,
                max_width=max_name_w,
                max_height=36.0,
                font_name=_FONT_BOLD,
                font_size=13.5,
                min_font_size=10.5,
                text_color=colors.HexColor(_DARK_HEX),
            )
        else:
            words = [w for w in (cert.partner_name or "LA").split() if w]
            initials = (
                f"{words[0][0]}{words[1][0]}".upper()
                if len(words) >= 2
                else (cert.partner_name or "LA")[:2].upper()
            )
            canvas.saveState()
            canvas.setFillColor(colors.HexColor(_SEAL_TRACK_HEX))
            canvas.setStrokeColor(colors.HexColor(_PRIMARY_HEX))
            canvas.setLineWidth(1.0)
            canvas.roundRect(left_x, header_y - 4.0, 30.0, 30.0, 6.0, stroke=1, fill=1)
            canvas.setFont(_FONT_BOLD, 10.5)
            canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
            canvas.drawCentredString(left_x + 15.0, header_y + 7.2, initials)
            canvas.restoreState()

            _draw_wrapped_fit(
                canvas,
                partner_display,
                left_x=left_x + 40.0,
                top_y=header_y + 23.0,
                max_width=left_max_w - 40.0,
                max_height=34.0,
                font_name=_FONT_BOLD,
                font_size=14.0,
                min_font_size=10.5,
                text_color=colors.HexColor(_DARK_HEX),
            )

    @staticmethod
    def _draw_editorial_body(
        canvas: Canvas,
        *,
        cert,
        is_spec: bool,
        left_x: float,
        left_max_w: float,
        top_y: float,
        bottom_limit: float,
    ) -> None:
        canvas.setFont(_FONT_REGULAR, 9.5)
        canvas.setFillColor(colors.HexColor(_SUBTLE_HEX))
        canvas.drawString(left_x, top_y, f"Ngày cấp: {cert.issue_date}")

        learner_name_upper = (cert.learner_name or "Học viên").upper()
        learner_bottom = _draw_wrapped_fit(
            canvas,
            learner_name_upper,
            left_x=left_x,
            top_y=top_y - 14.0,
            max_width=left_max_w,
            max_height=68.0,
            font_name=_FONT_BOLD,
            font_size=24.0,
            min_font_size=14.0,
            text_color=colors.HexColor(_DARK_HEX),
        )

        # Personal antique-gold accent bar below learner name
        accent_y = learner_bottom - 10.0
        canvas.setFillColor(colors.HexColor(_GOLD_HEX))
        canvas.rect(left_x, accent_y, 40.0, 2.2, stroke=0, fill=1)

        subtitle_y = accent_y - 20.0
        completion_subtitle = (
            "đã hoàn thành xuất sắc chương trình chuyên ngành"
            if is_spec
            else "đã hoàn thành xuất sắc khóa học"
        )
        canvas.setFont(_FONT_REGULAR, 10.5)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawString(left_x, subtitle_y, completion_subtitle)

        course_top_y = subtitle_y - 10.0
        auth_reserve = 38.0
        course_max_h = max(34.0, course_top_y - bottom_limit - auth_reserve)
        course_bottom = _draw_wrapped_fit(
            canvas,
            cert.course_title,
            left_x=left_x,
            top_y=course_top_y,
            max_width=left_max_w,
            max_height=course_max_h,
            font_name=_FONT_BOLD,
            font_size=18.0,
            min_font_size=11.5,
            text_color=colors.HexColor(_DARK_HEX),
        )

        partner_display = _truncate_text(cert.partner_name or "LMS AI Platform", 64)
        kind_noun = "chương trình chuyên ngành" if is_spec else "khóa học trực tuyến"
        auth_line = (
            f"một {kind_noun} được bảo chứng bởi {partner_display} "
            f"và cấp chứng nhận trên nền tảng LMS AI Platform."
        )
        _draw_wrapped_fit(
            canvas,
            auth_line,
            left_x=left_x,
            top_y=course_bottom - 10.0,
            max_width=left_max_w,
            max_height=34.0,
            font_name=_FONT_REGULAR,
            font_size=9.2,
            min_font_size=8.0,
            text_color=colors.HexColor(_SUBTLE_HEX),
        )

    @staticmethod
    def _draw_signer_block(
        canvas: Canvas,
        *,
        cert,
        signature_image_bytes: bytes | None,
        left_x: float,
        sig_base_y: float,
    ) -> None:
        raw_signer = (cert.signer_name or "").strip()
        if raw_signer:
            signature_fallback = _truncate_text(raw_signer, 30)
            signer_name = _truncate_text(raw_signer, 46)
            signer_title = _truncate_text(
                cert.signer_title or "Đại diện đơn vị cấp chứng chỉ", 58
            )
        else:
            signature_fallback = "Ban Giám Hiệu"
            signer_name = _truncate_text(cert.partner_name or "Ban Giám Hiệu", 54)
            signer_title = _truncate_text(
                cert.signer_title or "Đơn vị cấp chứng chỉ", 58
            )

        if signature_image_bytes:
            _draw_fitted_image(
                canvas,
                signature_image_bytes,
                left_x,
                sig_base_y + 5.0,
                155.0,
                36.0,
                align_right=False,
            )
        else:
            sig_font_size = 14.5
            while (
                sig_font_size > 10.5
                and pdfmetrics.stringWidth(
                    signature_fallback, _FONT_ITALIC, sig_font_size
                )
                > 188.0
            ):
                sig_font_size -= 0.5
            canvas.setFont(_FONT_ITALIC, sig_font_size)
            canvas.setFillColor(colors.HexColor(_NAVY_HEX))
            canvas.drawString(left_x + 2.0, sig_base_y + 11.0, signature_fallback)

        canvas.setStrokeColor(colors.HexColor(_BORDER_HEX))
        canvas.setLineWidth(0.85)
        canvas.line(left_x, sig_base_y, left_x + 195.0, sig_base_y)
        canvas.setFillColor(colors.HexColor(_GOLD_HEX))
        canvas.circle(left_x, sig_base_y, 1.5, stroke=0, fill=1)

        canvas.setFont(_FONT_BOLD, 9.5)
        canvas.setFillColor(colors.HexColor(_DARK_HEX))
        canvas.drawString(left_x, sig_base_y - 13.0, signer_name)

        canvas.setFont(_FONT_REGULAR, 8.2)
        canvas.setFillColor(colors.HexColor(_SUBTLE_HEX))
        canvas.drawString(left_x, sig_base_y - 25.0, signer_title)

        canvas.setFont(_FONT_BOLD, 7.8)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawString(
            left_x, sig_base_y - 38.0, f"Mã chứng chỉ: {cert.certificate_id}"
        )

    @staticmethod
    def _draw_bottom_verification(
        canvas: Canvas,
        *,
        verification_url: str,
        inset: float,
        right_edge: float,
    ) -> None:
        qr_size = min(float(CERTIFICATE_PDF_QR_SIZE_PT), 54.0)
        qr_x = right_edge - qr_size
        qr_y = inset + 14.0
        qr_bytes = _build_qr_png_bytes(verification_url)
        canvas.drawImage(
            ImageReader(BytesIO(qr_bytes)),
            qr_x,
            qr_y,
            width=qr_size,
            height=qr_size,
            preserveAspectRatio=True,
        )

        text_right = qr_x - 10.0
        canvas.setFont(_FONT_REGULAR, 7.8)
        canvas.setFillColor(colors.HexColor(_MUTED_HEX))
        canvas.drawRightString(text_right, qr_y + 42.0, "Xác thực tại:")

        url_display = _truncate_text(verification_url, 68)
        canvas.setFont(_FONT_BOLD, 7.8)
        canvas.setFillColor(colors.HexColor(_PRIMARY_HEX))
        canvas.drawRightString(text_right, qr_y + 30.0, url_display)
        url_w = pdfmetrics.stringWidth(url_display, _FONT_BOLD, 7.8)
        canvas.setStrokeColor(colors.HexColor(_PRIMARY_HEX))
        canvas.setLineWidth(0.55)
        canvas.line(text_right - url_w, qr_y + 28.2, text_right, qr_y + 28.2)
        if verification_url.startswith(("http://", "https://", "/")):
            canvas.linkURL(
                verification_url,
                (text_right - url_w, qr_y + 26.0, text_right, qr_y + 39.0),
                relative=0,
            )

        canvas.setFont(_FONT_REGULAR, 7.0)
        canvas.setFillColor(colors.HexColor(_SUBTLE_HEX))
        canvas.drawRightString(
            text_right,
            qr_y + 17.0,
            "LMS AI Platform đã xác nhận danh tính học viên",
        )
        canvas.drawRightString(
            text_right,
            qr_y + 8.0,
            "và quá trình hoàn thành khóa học.",
        )
