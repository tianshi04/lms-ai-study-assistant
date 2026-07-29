"""ConnectRPC Presentation Handler for PaymentService."""

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.payment.v1 import payment_pb as pb
from src.gen.payment.v1.payment_connect import PaymentService
from src.modules.payment.application.payment_usecase import PaymentUseCase
from src.modules.payment.domain.entities import PlanType
from src.shared.access_policy import AccessPolicyService
from src.shared.auth import require_current_user
from src.shared.infrastructure.database import async_session_scope


class PaymentHandler(PaymentService):
    def __init__(self, use_case: PaymentUseCase):
        self._use_case = use_case

    async def purchase_course(
        self,
        request: pb.PurchaseCourseRequest,
        ctx: RequestContext[pb.PurchaseCourseRequest, pb.PurchaseCourseResponse],
    ) -> pb.PurchaseCourseResponse:
        current_user = require_current_user()
        if not request.course_id:
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Mã khóa học không được để trống."
            )

        success, msg, purchase = await self._use_case.purchase_course(
            user_id=current_user.id,
            course_id=request.course_id,
            payment_method=request.payment_method or "MOCK",
        )
        if not success:
            raise ConnectError(Code.FAILED_PRECONDITION, msg)

        pb_purchase = None
        if purchase:
            pb_purchase = pb.CoursePurchase(
                id=purchase.id,
                user_id=purchase.user_id,
                course_id=purchase.course_id,
                amount=purchase.amount,
                currency=purchase.currency,
                payment_method=purchase.payment_method,
                created_at=purchase.created_at,
            )

        return pb.PurchaseCourseResponse(
            success=True,
            message=msg,
            purchase=pb_purchase,
        )

    async def subscribe_coursera_plus(
        self,
        request: pb.SubscribeCourseraPlusRequest,
        ctx: RequestContext[
            pb.SubscribeCourseraPlusRequest, pb.SubscribeCourseraPlusResponse
        ],
    ) -> pb.SubscribeCourseraPlusResponse:
        current_user = require_current_user()
        domain_plan = (
            PlanType.YEARLY
            if request.plan_type == pb.PlanType.YEARLY
            else PlanType.MONTHLY
        )
        success, msg, sub = await self._use_case.subscribe_coursera_plus(
            user_id=current_user.id,
            plan_type=domain_plan,
            payment_method=request.payment_method or "MOCK",
        )
        if not success:
            raise ConnectError(Code.FAILED_PRECONDITION, msg)

        pb_sub = None
        if sub:
            pb_sub = pb.UserSubscription(
                id=sub.id,
                user_id=sub.user_id,
                plan_type=request.plan_type,
                starts_at=sub.starts_at,
                expires_at=sub.expires_at,
                created_at=sub.created_at,
            )

        return pb.SubscribeCourseraPlusResponse(
            success=True,
            message=msg,
            subscription=pb_sub,
        )

    async def get_user_payment_access(
        self,
        request: pb.GetUserPaymentAccessRequest,
        ctx: RequestContext[
            pb.GetUserPaymentAccessRequest, pb.GetUserPaymentAccessResponse
        ],
    ) -> pb.GetUserPaymentAccessResponse:
        current_user = require_current_user()
        async with async_session_scope() as session:
            is_paid, err = await AccessPolicyService.verify_paid_access(
                session=session,
                user_id=current_user.id,
                course_id=request.course_id,
            )
            return pb.GetUserPaymentAccessResponse(
                has_paid_access=is_paid,
                access_reason=err or "Quyền truy cập Paid Mode hợp lệ.",
            )

    async def list_user_purchases(
        self,
        request: pb.ListUserPurchasesRequest,
        ctx: RequestContext[pb.ListUserPurchasesRequest, pb.ListUserPurchasesResponse],
    ) -> pb.ListUserPurchasesResponse:
        current_user = require_current_user()
        purchases = await self._use_case.list_user_purchases(current_user.id)
        pb_purchases = [
            pb.CoursePurchase(
                id=p.id,
                user_id=p.user_id,
                course_id=p.course_id,
                amount=p.amount,
                currency=p.currency,
                payment_method=p.payment_method,
                created_at=p.created_at,
            )
            for p in purchases
        ]
        return pb.ListUserPurchasesResponse(purchases=pb_purchases)
