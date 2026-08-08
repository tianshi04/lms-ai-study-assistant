"""ConnectRPC Presentation Handler for PaymentService."""

from connectrpc.request import RequestContext

from src.gen.payment.v1 import payment_pb as pb
from src.gen.payment.v1.payment_connect import PaymentService
from src.modules.payment.application.payment_usecase import PaymentUseCase
from src.modules.payment.domain.entities import PaymentTargetType, PlanType
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
        (
            success,
            msg,
            purchase,
        ) = await self._use_case.purchase_course(
            user_id=current_user.id,
            course_id=request.course_id,
            payment_method=request.payment_method,
        )

        pb_purchase = (
            pb.CoursePurchase(
                id=purchase.id,
                user_id=purchase.user_id,
                course_id=purchase.course_id,
                amount=purchase.amount,
                currency=purchase.currency,
                payment_method=purchase.payment_method,
                created_at=purchase.created_at,
            )
            if purchase
            else None
        )

        return pb.PurchaseCourseResponse(
            success=success,
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

        (
            success,
            msg,
            sub,
        ) = await self._use_case.subscribe_coursera_plus(
            user_id=current_user.id,
            plan_type=domain_plan,
            payment_method=request.payment_method,
        )

        pb_sub = (
            pb.UserSubscription(
                id=sub.id,
                user_id=sub.user_id,
                plan_type=pb.PlanType.YEARLY
                if sub.plan_type == PlanType.YEARLY
                else pb.PlanType.MONTHLY,
                starts_at=sub.starts_at,
                expires_at=sub.expires_at,
                created_at=sub.created_at,
            )
            if sub
            else None
        )

        return pb.SubscribeCourseraPlusResponse(
            success=success,
            message=msg,
            subscription=pb_sub,
        )

    async def create_vn_pay_payment_url(
        self,
        request: pb.CreateVNPayPaymentUrlRequest,
        ctx: RequestContext[
            pb.CreateVNPayPaymentUrlRequest, pb.CreateVNPayPaymentUrlResponse
        ],
    ) -> pb.CreateVNPayPaymentUrlResponse:
        current_user = require_current_user()

        domain_target = PaymentTargetType.COURSE
        if request.target_type == pb.PaymentTargetType.SYSTEM_SUBSCRIPTION:
            domain_target = PaymentTargetType.SYSTEM_SUBSCRIPTION

        domain_plan = PlanType.UNSPECIFIED
        if request.plan_type == pb.PlanType.MONTHLY:
            domain_plan = PlanType.MONTHLY
        elif request.plan_type == pb.PlanType.YEARLY:
            domain_plan = PlanType.YEARLY

        (
            success,
            msg,
            payment_url,
            order_id,
            vnp_txn_ref,
        ) = await self._use_case.create_vnpay_payment_url(
            user_id=current_user.id,
            target_type=domain_target,
            target_id=request.target_id,
            plan_type=domain_plan,
        )

        return pb.CreateVNPayPaymentUrlResponse(
            success=success,
            message=msg,
            payment_url=payment_url,
            order_id=order_id,
            vnp_txn_ref=vnp_txn_ref,
        )

    async def verify_vn_pay_payment(
        self,
        request: pb.VerifyVNPayPaymentRequest,
        ctx: RequestContext[
            pb.VerifyVNPayPaymentRequest, pb.VerifyVNPayPaymentResponse
        ],
    ) -> pb.VerifyVNPayPaymentResponse:
        current_user = require_current_user()
        query_dict = dict(request.query_params)

        (
            success,
            msg,
            order_id,
            target_type,
            target_id,
            plan_type,
            purchase,
            sub,
        ) = await self._use_case.verify_vnpay_payment(
            user_id=current_user.id,
            query_params=query_dict,
        )

        pb_purchase = (
            pb.CoursePurchase(
                id=purchase.id,
                user_id=purchase.user_id,
                course_id=purchase.course_id,
                amount=purchase.amount,
                currency=purchase.currency,
                payment_method=purchase.payment_method,
                created_at=purchase.created_at,
            )
            if purchase
            else None
        )

        pb_sub = (
            pb.UserSubscription(
                id=sub.id,
                user_id=sub.user_id,
                plan_type=pb.PlanType.YEARLY
                if sub.plan_type == PlanType.YEARLY
                else pb.PlanType.MONTHLY,
                status=pb.SubscriptionStatus.ACTIVE,
                starts_at=sub.starts_at,
                expires_at=sub.expires_at,
                created_at=sub.created_at,
            )
            if sub
            else None
        )

        pb_target_type = pb.PaymentTargetType.UNSPECIFIED
        if target_type == PaymentTargetType.COURSE:
            pb_target_type = pb.PaymentTargetType.COURSE
        elif target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION:
            pb_target_type = pb.PaymentTargetType.SYSTEM_SUBSCRIPTION

        pb_plan_type = pb.PlanType.UNSPECIFIED
        if plan_type == PlanType.MONTHLY:
            pb_plan_type = pb.PlanType.MONTHLY
        elif plan_type == PlanType.YEARLY:
            pb_plan_type = pb.PlanType.YEARLY

        return pb.VerifyVNPayPaymentResponse(
            success=success,
            message=msg,
            order_id=order_id,
            target_type=pb_target_type,
            target_id=target_id,
            plan_type=pb_plan_type,
            purchase=pb_purchase,
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
        (
            purchases,
            orders,
            titles_map,
            active_sub,
        ) = await self._use_case.list_user_purchases(current_user.id)

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

        pb_orders = []
        for o in orders:
            t_type = pb.PaymentTargetType.UNSPECIFIED
            if o.target_type == PaymentTargetType.COURSE:
                t_type = pb.PaymentTargetType.COURSE
            elif o.target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION:
                t_type = pb.PaymentTargetType.SYSTEM_SUBSCRIPTION

            p_type = pb.PlanType.UNSPECIFIED
            if o.plan_type == PlanType.MONTHLY:
                p_type = pb.PlanType.MONTHLY
            elif o.plan_type == PlanType.YEARLY:
                p_type = pb.PlanType.YEARLY

            st = pb.PaymentOrderStatus.UNSPECIFIED
            if o.status.value == "PENDING":
                st = pb.PaymentOrderStatus.PENDING
            elif o.status.value == "COMPLETED":
                st = pb.PaymentOrderStatus.COMPLETED
            elif o.status.value == "FAILED":
                st = pb.PaymentOrderStatus.FAILED
            elif o.status.value == "EXPIRED":
                st = pb.PaymentOrderStatus.EXPIRED

            title = "Sản phẩm LMS"
            if o.target_type == PaymentTargetType.COURSE:
                title = titles_map.get(o.target_id, f"Khóa học #{o.target_id[:8]}")
            elif o.target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION:
                title = (
                    "Gói Coursera Plus (Năm)"
                    if o.plan_type == PlanType.YEARLY
                    else "Gói Coursera Plus (Tháng)"
                )

            pb_orders.append(
                pb.PaymentOrderInfo(
                    id=o.id,
                    user_id=o.user_id,
                    target_type=t_type,
                    target_id=o.target_id,
                    plan_type=p_type,
                    amount=o.amount,
                    currency=o.currency,
                    status=st,
                    vnp_txn_ref=o.vnp_txn_ref,
                    created_at=o.created_at,
                    updated_at=o.updated_at,
                    target_title=title,
                )
            )

        pb_sub = None
        if active_sub:
            sub_plan_type = pb.PlanType.UNSPECIFIED
            if active_sub.plan_type == PlanType.MONTHLY:
                sub_plan_type = pb.PlanType.MONTHLY
            elif active_sub.plan_type == PlanType.YEARLY:
                sub_plan_type = pb.PlanType.YEARLY

            pb_sub = pb.UserSubscription(
                id=active_sub.id,
                user_id=active_sub.user_id,
                plan_type=sub_plan_type,
                status=pb.SubscriptionStatus.ACTIVE,
                starts_at=active_sub.starts_at,
                expires_at=active_sub.expires_at,
                created_at=active_sub.created_at,
            )

        return pb.ListUserPurchasesResponse(
            purchases=pb_purchases,
            orders=pb_orders,
            active_subscription=pb_sub,
        )
