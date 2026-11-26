import asyncio
import ipaddress
import logging
import posixpath
import socket
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import httpx
from PIL import Image

from src.modules.certificate.domain import (
    CERTIFICATE_ASSET_FETCH_TIMEOUT_SECONDS,
    CERTIFICATE_ASSET_MAX_BYTES,
    ICertificateAssetLoader,
)
from src.shared.infrastructure.s3_storage import get_s3_storage_service

logger = logging.getLogger(__name__)

_INTERNAL_ASSET_PREFIX = "/coursera-assets/"
_LOCAL_PARTNER_IMAGES_PREFIX = "/images/partners/"
_LOCAL_PARTNER_ASSETS_DIR = Path(__file__).resolve().parent / "assets" / "partners"
_MAX_IMAGE_PIXELS = 25_000_000
_STREAM_CHUNK_BYTES = 64 * 1024


def _is_global_ip(raw_ip: str) -> bool:
    """Return True only when raw_ip parses as a globally routable IP address."""
    try:
        ip = ipaddress.ip_address(raw_ip.split("%", 1)[0])
    except ValueError:
        return False
    return ip.is_global


async def _is_safe_public_http_url(url: str) -> bool:
    """Reject non-HTTP(S) schemes and any hostname resolving to non-global IPs."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return False

    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "127.0.0.1", "::1"} or hostname.endswith(".local"):
        return False

    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        return _is_global_ip(hostname)

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        loop = asyncio.get_running_loop()
        addr_infos = await loop.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except OSError:
        return False

    resolved_ips = [str(info[4][0]) for info in addr_infos]
    return bool(resolved_ips) and all(_is_global_ip(ip) for ip in resolved_ips)


def _normalize_raster_to_png(raw_bytes: bytes) -> bytes | None:
    """Validate raster image bytes with Pillow and convert to PNG for ReportLab."""
    if not raw_bytes or len(raw_bytes) > CERTIFICATE_ASSET_MAX_BYTES:
        return None
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            if img.width * img.height > _MAX_IMAGE_PIXELS:
                logger.warning(
                    "Skipped oversized certificate image (%dx%d)",
                    img.width,
                    img.height,
                )
                return None

            if img.mode in {"RGBA", "LA"} or (
                img.mode == "P" and "transparency" in img.info
            ):
                rgba = img.convert("RGBA")
                background = Image.new("RGB", rgba.size, (255, 255, 255))
                background.paste(rgba, mask=rgba.split()[3])
                output_img = background
            elif img.mode != "RGB":
                output_img = img.convert("RGB")
            else:
                output_img = img

            buf = BytesIO()
            output_img.save(buf, format="PNG")
            return buf.getvalue()
    except Exception as exc:  # noqa: BLE001
        logger.debug("Skipping non-raster or unreadable certificate asset: %s", exc)
        return None


class CertificateAssetLoader(ICertificateAssetLoader):
    """Best-effort loader for partner logos and signature images."""

    async def load_image_bytes(self, asset_url: str) -> bytes | None:
        cleaned = (asset_url or "").strip()
        if not cleaned:
            return None

        if cleaned.startswith(_INTERNAL_ASSET_PREFIX):
            return await self._load_from_s3(cleaned[len(_INTERNAL_ASSET_PREFIX) :])

        if cleaned.startswith(_LOCAL_PARTNER_IMAGES_PREFIX):
            return await self._load_local_partner_asset(
                cleaned[len(_LOCAL_PARTNER_IMAGES_PREFIX) :]
            )

        if cleaned.lower().split("?", 1)[0].endswith(".svg"):
            return None

        if not await _is_safe_public_http_url(cleaned):
            logger.debug("Blocked non-public certificate asset URL: %s", cleaned)
            return None

        return await self._fetch_public_image(cleaned)

    async def _load_local_partner_asset(self, raw_name: str) -> bytes | None:
        safe_name = raw_name.split("?", 1)[0].strip()
        if not safe_name or "/" in safe_name or "\\" in safe_name or ".." in safe_name:
            return None
        base_dir = _LOCAL_PARTNER_ASSETS_DIR.resolve()
        candidate = (base_dir / safe_name).resolve()
        if not candidate.is_relative_to(base_dir) or not candidate.is_file():
            return None
        raw_bytes = await asyncio.to_thread(candidate.read_bytes)
        return await asyncio.to_thread(_normalize_raster_to_png, raw_bytes)

    async def _load_from_s3(self, raw_key: str) -> bytes | None:
        normalized = posixpath.normpath(raw_key).lstrip("/")
        if not normalized or ".." in normalized:
            return None
        try:
            s3 = get_s3_storage_service()
            raw_bytes = await s3.download_file(normalized)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to load S3 certificate asset '%s': %s", normalized, exc
            )
            return None
        return await asyncio.to_thread(_normalize_raster_to_png, raw_bytes)

    async def _fetch_public_image(self, url: str) -> bytes | None:
        try:
            async with (
                httpx.AsyncClient(
                    timeout=CERTIFICATE_ASSET_FETCH_TIMEOUT_SECONDS,
                    follow_redirects=False,
                ) as client,
                client.stream("GET", url) as response,
            ):
                if response.status_code != 200:
                    return None
                content_type = response.headers.get("content-type", "").lower()
                if "svg" in content_type:
                    return None

                content_length = response.headers.get("content-length")
                if (
                    content_length
                    and content_length.isdigit()
                    and int(content_length) > CERTIFICATE_ASSET_MAX_BYTES
                ):
                    return None

                chunks = bytearray()
                async for chunk in response.aiter_bytes(_STREAM_CHUNK_BYTES):
                    chunks.extend(chunk)
                    if len(chunks) > CERTIFICATE_ASSET_MAX_BYTES:
                        return None
                raw_bytes = bytes(chunks)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Failed to fetch certificate asset '%s': %s", url, exc)
            return None

        return await asyncio.to_thread(_normalize_raster_to_png, raw_bytes)
