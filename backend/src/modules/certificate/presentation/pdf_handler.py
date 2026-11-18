from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from src.modules.certificate.application import CertificateUseCase
from src.modules.certificate.domain import (
    CertificateNotFoundError,
    CertificateRevokedError,
    InvalidCertificateIdError,
)


def make_certificate_pdf_endpoint(use_case: CertificateUseCase):
    """Build Starlette HTTP endpoint for downloading/previewing certificate PDFs."""

    async def download_certificate_pdf(request: Request) -> Response:
        certificate_id = request.path_params.get("certificate_id", "")
        is_download = request.query_params.get("download", "").lower() in {
            "1",
            "true",
            "yes",
        }
        disposition = "attachment" if is_download else "inline"

        try:
            pdf_bytes, filename = await use_case.generate_certificate_pdf(
                certificate_id
            )
        except InvalidCertificateIdError as exc:
            return JSONResponse({"detail": str(exc)}, status_code=400)
        except CertificateNotFoundError as exc:
            return JSONResponse({"detail": str(exc)}, status_code=404)
        except CertificateRevokedError as exc:
            return JSONResponse({"detail": str(exc)}, status_code=403)

        return Response(
            content=pdf_bytes,
            status_code=200,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"',
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )

    return download_certificate_pdf
