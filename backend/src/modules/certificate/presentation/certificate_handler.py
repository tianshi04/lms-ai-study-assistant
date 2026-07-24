from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.certificate.v1 import certificate_pb as pb
from src.gen.certificate.v1.certificate_connect import CertificateService
from src.modules.certificate.application.certificate_usecase import CertificateUseCase
from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    VerifiedCertificate,
)
from src.shared.auth import require_current_user


def _to_pb_financial_aid(
    app: FinancialAidApplication,
) -> pb.FinancialAidApplication:
    return pb.FinancialAidApplication(
        id=app.id,
        user_id=app.user_id,
        course_id=app.course_id,
        essay_150_words=app.essay_150_words,
        status=app.status,
        review_deadline_days_left=app.review_deadline_days_left,
    )


def _to_pb_certificate(
    cert: VerifiedCertificate,
) -> pb.VerifiedCertificate:
    return pb.VerifiedCertificate(
        certificate_id=cert.certificate_id,
        user_id=cert.user_id,
        learner_name=cert.learner_name,
        course_title=cert.course_title,
        partner_name=cert.partner_name,
        partner_logo_url=cert.partner_logo_url,
        issue_date=cert.issue_date,
        verification_url=cert.verification_url,
        qr_code_url=cert.qr_code_url,
        open_badges_json_ld=cert.open_badges_json_ld,
    )


class CertificateHandler(CertificateService):
    def __init__(self, use_case: CertificateUseCase) -> None:
        self._use_case = use_case

    async def apply_financial_aid(
        self,
        request: pb.ApplyFinancialAidRequest,
        ctx: RequestContext[pb.ApplyFinancialAidRequest, pb.ApplyFinancialAidResponse],
    ) -> pb.ApplyFinancialAidResponse:
        current_user = require_current_user()
        app, err = await self._use_case.apply_financial_aid(
            user_id=current_user.id,
            course_id=request.course_id,
            essay_150_words=request.essay_150_words,
        )
        if err or not app:
            raise ConnectError(Code.INVALID_ARGUMENT, err or "Nộp đơn thất bại")
        return pb.ApplyFinancialAidResponse(application=_to_pb_financial_aid(app))

    async def get_financial_aid_status(
        self,
        request: pb.GetFinancialAidStatusRequest,
        ctx: RequestContext[
            pb.GetFinancialAidStatusRequest, pb.GetFinancialAidStatusResponse
        ],
    ) -> pb.GetFinancialAidStatusResponse:
        current_user = require_current_user()
        app = await self._use_case.get_financial_aid_status(
            current_user.id, request.course_id
        )
        if not app:
            return pb.GetFinancialAidStatusResponse(application=None)
        return pb.GetFinancialAidStatusResponse(application=_to_pb_financial_aid(app))

    async def list_financial_aid_applications(
        self,
        request: pb.ListFinancialAidApplicationsRequest,
        ctx: RequestContext[
            pb.ListFinancialAidApplicationsRequest,
            pb.ListFinancialAidApplicationsResponse,
        ],
    ) -> pb.ListFinancialAidApplicationsResponse:
        require_current_user()
        apps = await self._use_case.list_financial_aid_applications(
            course_id=request.course_id or None,
            status=request.status or None,
        )
        return pb.ListFinancialAidApplicationsResponse(
            applications=[_to_pb_financial_aid(a) for a in apps]
        )

    async def review_financial_aid_application(
        self,
        request: pb.ReviewFinancialAidApplicationRequest,
        ctx: RequestContext[
            pb.ReviewFinancialAidApplicationRequest,
            pb.ReviewFinancialAidApplicationResponse,
        ],
    ) -> pb.ReviewFinancialAidApplicationResponse:
        require_current_user()
        app, err = await self._use_case.review_financial_aid_application(
            application_id=request.application_id,
            is_approved=request.is_approved,
        )
        if err or not app:
            raise ConnectError(Code.NOT_FOUND, err or "Duyệt đơn thất bại")
        return pb.ReviewFinancialAidApplicationResponse(
            application=_to_pb_financial_aid(app)
        )

    async def get_verified_certificate(
        self,
        request: pb.GetVerifiedCertificateRequest,
        ctx: RequestContext[
            pb.GetVerifiedCertificateRequest, pb.GetVerifiedCertificateResponse
        ],
    ) -> pb.GetVerifiedCertificateResponse:
        current_user = require_current_user()
        cert = await self._use_case.get_verified_certificate(
            current_user.id, request.course_id
        )
        if not cert:
            raise ConnectError(Code.NOT_FOUND, "Không tìm thấy chứng chỉ")
        return pb.GetVerifiedCertificateResponse(certificate=_to_pb_certificate(cert))

    async def verify_certificate_public(
        self,
        request: pb.VerifyCertificatePublicRequest,
        ctx: RequestContext[
            pb.VerifyCertificatePublicRequest, pb.VerifyCertificatePublicResponse
        ],
    ) -> pb.VerifyCertificatePublicResponse:
        is_valid, cert = await self._use_case.verify_certificate_public(
            request.certificate_id
        )
        if not is_valid or not cert:
            return pb.VerifyCertificatePublicResponse(is_valid=False, certificate=None)
        return pb.VerifyCertificatePublicResponse(
            is_valid=True, certificate=_to_pb_certificate(cert)
        )
