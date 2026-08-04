"""CLI Script for VNPay QueryDR Reconciliation Worker.

Usage:
    python -m src.scripts.reconcile_vnpay_orders
"""

import asyncio
import logging
import sys

from src.modules.payment.application.payment_usecase import PaymentUseCase
from src.modules.payment.domain.constants import (
    RECONCILIATION_BATCH_SIZE,
    RECONCILIATION_PENDING_WINDOW_MINUTES,
)
from src.modules.payment.domain.entities import PaymentOrderStatus
from src.modules.payment.infrastructure.repository import PaymentRepository
from src.modules.payment.infrastructure.vnpay_service import VNPayService
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


async def reconcile_pending_orders() -> int:
    """Queries pending VNPay orders and reconciles status via QueryDR API."""
    logger.info("[RECONCILE WORKER] Starting VNPay order reconciliation task...")
    reconciled_count = 0

    use_case = PaymentUseCase()

    async with async_session_scope() as session:
        repo = PaymentRepository(session)
        pending_orders = await repo.list_pending_orders_older_than(
            window_minutes=RECONCILIATION_PENDING_WINDOW_MINUTES,
            limit=RECONCILIATION_BATCH_SIZE,
        )

        if not pending_orders:
            logger.info(
                "[RECONCILE WORKER] No pending orders requiring reconciliation."
            )
            return 0

        logger.info(
            "[RECONCILE WORKER] Found %d pending order(s) older than %d minutes.",
            len(pending_orders),
            RECONCILIATION_PENDING_WINDOW_MINUTES,
        )

        for order in pending_orders:
            logger.info(
                "[RECONCILE WORKER] Querying VNPay QueryDR for order %s (TxnRef: %s)",
                order.id,
                order.vnp_txn_ref,
            )
            res = await VNPayService.query_dr_transaction(
                vnp_txn_ref=order.vnp_txn_ref,
                order_created_at_iso=order.created_at,
            )

            resp_code = res.get("vnp_ResponseCode", "")
            txn_status = res.get("vnp_TransactionStatus", "")

            logger.info(
                "[RECONCILE WORKER] QueryDR response for order %s: ResponseCode=%s, TxnStatus=%s",
                order.id,
                resp_code,
                txn_status,
            )

            if resp_code == "00" or txn_status == "00":
                await repo.update_order_status(order.id, PaymentOrderStatus.COMPLETED)
                await use_case._fulfill_access(
                    repo,
                    order.user_id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    order.amount,
                )
                reconciled_count += 1
                logger.info(
                    "[RECONCILE WORKER] Successfully auto-completed order %s and fulfilled access.",
                    order.id,
                )
            elif resp_code in ("01", "02", "24") or txn_status in ("01", "02"):
                await repo.update_order_status(order.id, PaymentOrderStatus.FAILED)
                logger.info(
                    "[RECONCILE WORKER] Marked order %s as FAILED based on QueryDR response.",
                    order.id,
                )
            else:
                logger.warning(
                    "[RECONCILE WORKER] Order %s QueryDR result ambiguous (ResponseCode=%s), keeping PENDING.",
                    order.id,
                    resp_code,
                )

    logger.info(
        "[RECONCILE WORKER] Task finished. Reconciled %d order(s).", reconciled_count
    )
    return reconciled_count


def main():
    try:
        asyncio.run(reconcile_pending_orders())
        sys.exit(0)
    except Exception as e:
        logger.exception(
            "[RECONCILE WORKER] Unexpected error during reconciliation: %s", e
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
