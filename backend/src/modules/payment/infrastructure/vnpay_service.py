"""VNPay Gateway Helper Service (HMAC-SHA512 Checksum & URL Generator)."""

from datetime import datetime, timezone
import hashlib
import hmac
import logging
from typing import Any
import urllib.parse

from src.shared.config import settings

logger = logging.getLogger(__name__)


class VNPayService:
    """Utility helper for VNPay Sandbox payment gateway integration."""

    @staticmethod
    def calculate_hmac_sha512(secret_key: str, data: str) -> str:
        """Calculates HMAC-SHA512 signature string in hex format."""
        return hmac.new(
            secret_key.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

    @staticmethod
    def sanitize_order_info(text: str) -> str:
        """Removes Vietnamese accents and special characters to ensure valid vnp_OrderInfo."""
        import re
        import unicodedata

        # Convert accented Vietnamese characters to ASCII equivalents
        normalized = (
            unicodedata.normalize("NFKD", text)
            .encode("ASCII", "ignore")
            .decode("utf-8")
        )
        # Keep only alphanumeric characters and spaces
        cleaned = re.sub(r"[^a-zA-Z0-9 ]", "", normalized)
        # Collapse multiple spaces and trim
        result = re.sub(r"\s+", " ", cleaned).strip()
        return result or "Thanh toan don hang"

    @classmethod
    def generate_payment_url(
        cls,
        vnp_txn_ref: str,
        amount: float,
        order_info: str,
        ip_addr: str = "127.0.0.1",
        return_url: str = "",
        created_at: str | datetime | None = None,
    ) -> str:
        """Generates VNPay payment URL with signed vnp_SecureHash."""
        tmn_code = settings.VNPAY_TMN_CODE
        secret_key = settings.VNPAY_HASH_SECRET
        payment_endpoint = settings.VNPAY_PAYMENT_URL
        actual_return_url = return_url or settings.VNPAY_RETURN_URL

        # Sanitize order_info to avoid HMAC signature mismatches / Code 70 errors on VNPay
        safe_order_info = cls.sanitize_order_info(order_info)

        # VNPay requires amount in VND * 100 (e.g. 500,000 VND = 50000000)
        vnp_amount = int(round(amount * 100))

        from datetime import timedelta

        # Parse or use created_at to ensure re-generated URLs for pending orders use the original vnp_CreateDate
        if created_at:
            if isinstance(created_at, str):
                try:
                    now_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except ValueError:
                    now_dt = datetime.now(timezone.utc)
            else:
                now_dt = created_at
        else:
            now_dt = datetime.now(timezone.utc)

        # Ensure datetime is timezone-aware
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        # Offset to GMT+7 (Asia/Ho_Chi_Minh)
        vn_time = now_dt.astimezone(timezone.utc) + timedelta(hours=7)
        vnp_create_date = vn_time.strftime("%Y%m%d%H%M%S")
        vnp_expire_date = (vn_time + timedelta(minutes=15)).strftime("%Y%m%d%H%M%S")

        params: dict[str, Any] = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": tmn_code,
            "vnp_Amount": vnp_amount,
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": vnp_txn_ref,
            "vnp_OrderInfo": safe_order_info,
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": actual_return_url,
            "vnp_IpAddr": ip_addr,
            "vnp_CreateDate": vnp_create_date,
            "vnp_ExpireDate": vnp_expire_date,
        }

        # 1. Sort dictionary keys alphabetically
        sorted_params = sorted(params.items())

        # 2. Build query string (URL encoded) & hash data string (urllib.parse.quote_plus as required by VNPay 2.1.0)
        query_parts = []
        hash_parts = []
        for k, v in sorted_params:
            if v is not None and str(v) != "":
                encoded_key = urllib.parse.quote_plus(str(k))
                encoded_val = urllib.parse.quote_plus(str(v))
                query_parts.append(f"{encoded_key}={encoded_val}")
                hash_parts.append(f"{encoded_key}={encoded_val}")

        query_string = "&".join(query_parts)
        hash_data = "&".join(hash_parts)

        # 3. Calculate HMAC-SHA512
        secure_hash = cls.calculate_hmac_sha512(secret_key, hash_data)
        payment_url = f"{payment_endpoint}?{query_string}&vnp_SecureHash={secure_hash}"
        logger.info(
            "[VNPAY] Generated payment URL for TxnRef %s: %s",
            vnp_txn_ref,
            payment_url,
        )
        return payment_url

    @classmethod
    def verify_response_signature(
        cls, query_params: dict[str, str]
    ) -> tuple[bool, str]:
        """Verifies VNPay return/IPN callback signature (vnp_SecureHash)."""
        secret_key = settings.VNPAY_HASH_SECRET
        received_hash = query_params.get("vnp_SecureHash", "")
        if not received_hash:
            return False, "Thiếu tham số vnp_SecureHash trong phản hồi từ VNPay."

        # Filter out vnp_SecureHash and vnp_SecureHashType
        filtered_params = {
            k: v
            for k, v in query_params.items()
            if k not in ("vnp_SecureHash", "vnp_SecureHashType")
        }

        # Sort keys
        sorted_params = sorted(filtered_params.items())

        hash_parts = []
        for k, v in sorted_params:
            if v is not None and str(v) != "":
                encoded_key = urllib.parse.quote_plus(str(k))
                encoded_val = urllib.parse.quote_plus(str(v))
                hash_parts.append(f"{encoded_key}={encoded_val}")

        hash_data = "&".join(hash_parts)
        calculated_hash = cls.calculate_hmac_sha512(secret_key, hash_data)

        if received_hash.lower() == calculated_hash.lower():
            return True, "Chữ ký hợp lệ."

        logger.warning(
            "[VNPAY] Signature mismatch! Calculated: %s, Received: %s",
            calculated_hash,
            received_hash,
        )
        return False, "Chữ ký mã hóa (vnp_SecureHash) không khớp."

    @classmethod
    async def query_dr_transaction(
        cls,
        vnp_txn_ref: str,
        order_created_at_iso: str,
        ip_addr: str = "127.0.0.1",
    ) -> dict[str, Any]:
        """Queries transaction status via VNPay QueryDR API."""
        import httpx
        from datetime import timedelta

        tmn_code = settings.VNPAY_TMN_CODE
        secret_key = settings.VNPAY_HASH_SECRET
        api_url = settings.VNPAY_API_URL

        # Format dates to GMT+7 (YYYYMMDDHHmmss)
        now_dt = datetime.now(timezone.utc) + timedelta(hours=7)
        create_date_str = now_dt.strftime("%Y%m%d%H%M%S")

        try:
            order_dt = datetime.fromisoformat(order_created_at_iso)
            order_dt_gmt7 = order_dt + timedelta(hours=7)
            txn_date_str = order_dt_gmt7.strftime("%Y%m%d%H%M%S")
        except Exception:
            txn_date_str = create_date_str

        request_id = f"REQ-{now_dt.strftime('%Y%m%d%H%M%S')}-{vnp_txn_ref[:8]}"
        order_info = f"QueryDR {vnp_txn_ref}"

        # Hash data format for QueryDR in VNPay v2.1.0:
        # vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TxnRef|vnp_TransactionDate|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
        hash_data = f"{request_id}|2.1.0|querydr|{tmn_code}|{vnp_txn_ref}|{txn_date_str}|{create_date_str}|{ip_addr}|{order_info}"
        secure_hash = cls.calculate_hmac_sha512(secret_key, hash_data)

        payload = {
            "vnp_RequestId": request_id,
            "vnp_Version": "2.1.0",
            "vnp_Command": "querydr",
            "vnp_TmnCode": tmn_code,
            "vnp_TxnRef": vnp_txn_ref,
            "vnp_OrderInfo": order_info,
            "vnp_TransactionDate": txn_date_str,
            "vnp_CreateDate": create_date_str,
            "vnp_IpAddr": ip_addr,
            "vnp_SecureHash": secure_hash,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(api_url, json=payload)
                if res.status_code == 200:
                    return res.json()
                logger.error(
                    "[VNPAY QueryDR] API returned status code %s: %s",
                    res.status_code,
                    res.text,
                )
                return {
                    "vnp_ResponseCode": "99",
                    "vnp_Message": f"HTTP {res.status_code}",
                }
        except Exception as e:
            logger.error("[VNPAY QueryDR] Exception during API call: %s", e)
            return {"vnp_ResponseCode": "99", "vnp_Message": str(e)}
