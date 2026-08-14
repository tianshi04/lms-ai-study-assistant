import asyncio
import hashlib
import hmac
import logging
import os
import uuid

import httpx
from google.auth.transport import requests
from google.oauth2 import id_token

from src.modules.identity.domain.constants import (
    DEFAULT_PBKDF2_ITERATIONS,
    PASSWORD_MIN_LENGTH,
)
from src.modules.identity.domain.entities import (
    User,
    UserRole,
)
from src.modules.identity.domain.events import (
    UserRegisteredDomainEvent,
)
from src.modules.identity.infrastructure import repository as repo_module
from src.shared import auth
from src.shared.infrastructure import database, rate_limiter
from src.shared.infrastructure.event_bus import EventBus

logger = logging.getLogger(__name__)


async def _exchange_google_code(code: str, nonce: str = "") -> dict[str, str]:
    """Exchange Google Authorization Code for user claims via back-channel HTTPS."""
    # Dev Mode Mock
    from src.shared.config import settings

    if code.startswith("mock_google_") and (
        not settings.GOOGLE_CLIENT_ID or settings.ENV != "production"
    ):
        raw = code[len("mock_google_") :]
        parts = raw.rsplit("_", 1)
        email = parts[0] if parts else "user@gmail.com"
        name = parts[1] if len(parts) > 1 else "Google User"
        google_id = f"google_id_{hashlib.md5(email.encode()).hexdigest()[:12]}"
        return {
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}",
        }

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET

    if not client_id:
        raise ValueError("GOOGLE_CLIENT_ID chưa được cấu hình trên server")

    # If code is a direct JWT ID Token (from Google One Tap credential response)
    if code.count(".") == 2:
        try:
            payload = await asyncio.to_thread(
                id_token.verify_oauth2_token, code, requests.Request(), client_id
            )
        except ValueError as e:
            logger.error("Google ID Token verification failed: %s", e)
            raise ValueError("Token Google không hợp lệ hoặc đã hết hạn.")
        return {
            "google_id": payload.get("sub", ""),
            "email": payload.get("email", ""),
            "name": payload.get("name", payload.get("email", "").split("@")[0]),
            "picture": payload.get("picture", ""),
        }

    if not client_secret:
        raise ValueError("GOOGLE_CLIENT_SECRET chưa được cấu hình trên server")

    # Exchange code via server-to-server HTTPS
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        token_response = await http_client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": "postmessage",
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        logger.error("Google token exchange failed: %s", token_response.text)
        raise ValueError("Đổi Authorization Code thất bại. Vui lòng thử lại.")

    token_data = token_response.json()
    id_token_jwt = token_data.get("id_token")
    if not id_token_jwt:
        raise ValueError("Google không trả về ID Token trong phản hồi.")

    # Verify RS256 signature and audience (blocking I/O → offload to thread)
    try:
        payload = await asyncio.to_thread(
            id_token.verify_oauth2_token, id_token_jwt, requests.Request(), client_id
        )
    except ValueError as e:
        logger.error("Google ID Token verification failed: %s", e)
        raise ValueError("Token Google không hợp lệ hoặc đã hết hạn.")

    # Validate nonce to prevent replay attacks (only when nonce is provided
    # and the token actually contains one — Authorization Code Flow may not
    # include nonce in the ID Token)
    if nonce and nonce != "mock":
        token_nonce = payload.get("nonce", "")
        if token_nonce and token_nonce != nonce:
            logger.warning("Nonce mismatch! Expected=%s, Got=%s", nonce, token_nonce)
            raise ValueError("Nonce không khớp — nghi ngờ tấn công Replay!")

    return {
        "google_id": payload.get("sub", ""),
        "email": payload.get("email", ""),
        "name": payload.get("name", payload.get("email", "").split("@")[0]),
        "picture": payload.get("picture", ""),
    }


def hash_password(password: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, DEFAULT_PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}:{hashed.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if ":" not in password_hash:
        return False
    salt_hex, hash_hex = password_hash.split(":", 1)
    salt = bytes.fromhex(salt_hex)
    new_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, DEFAULT_PBKDF2_ITERATIONS
    ).hex()
    return hmac.compare_digest(new_hash, hash_hex)


def validate_password(password: str) -> str | None:
    """Validate password strength against policy.

    Returns error message string if invalid, None if valid.
    Rules:
      - Minimum PASSWORD_MIN_LENGTH characters
      - At least 1 uppercase letter
      - At least 1 digit
    """
    if not password or len(password) < PASSWORD_MIN_LENGTH:
        return f"Mật khẩu phải chứa ít nhất {PASSWORD_MIN_LENGTH} ký tự."
    if not any(c.isupper() for c in password):
        return "Mật khẩu phải chứa ít nhất 1 chữ in hoa."
    if not any(c.isdigit() for c in password):
        return "Mật khẩu phải chứa ít nhất 1 chữ số."
    return None


class AuthUseCase:
    async def login(
        self, email: str, password: str
    ) -> tuple[User | None, str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        is_allowed, remaining = await rate_limiter.check_login_rate_limit(email)
        if not is_allowed:
            mins = max(1, remaining // 60)
            return (
                None,
                "",
                "",
                f"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau {mins} phút.",
            )

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                logger.warning("Login failed for email %s: User not found", email)
                await rate_limiter.record_failed_login(email)
                return None, "", "", "Email hoặc mật khẩu không chính xác"

            if not verify_password(password, user.password_hash):
                logger.warning("Login failed for email %s: Invalid password", email)
                await rate_limiter.record_failed_login(email)
                return None, "", "", "Email hoặc mật khẩu không chính xác"

            await rate_limiter.clear_login_attempts(email)
            logger.info("User %s successfully logged in", user.id)
            access_token = auth.create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            refresh_token = auth.create_refresh_token(user.id)
            return user, access_token, refresh_token, ""

    async def refresh_token(self, refresh_token_str: str) -> tuple[str, str, str]:
        """Returns (new_access_token, new_refresh_token, error_message)."""
        payload = auth.decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            return "", "", "Refresh Token không hợp lệ hoặc đã hết hạn"

        user_id = payload.get("sub")
        if not user_id:
            return "", "", "Refresh Token chứa thông tin không hợp lệ"

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return "", "", "Không tìm thấy người dùng sở hữu token"

            new_access_token = auth.create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            new_refresh_token = auth.create_refresh_token(user.id)
            return new_access_token, new_refresh_token, ""

    async def register(
        self, email: str, password: str, full_name: str, role_str: str
    ) -> tuple[User | None, str]:
        val_err = validate_password(password)
        if val_err:
            return None, val_err

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            existing = await repo.get_by_email(email)
            if existing:
                logger.warning("Registration failed: Email %s already exists", email)
                return None, "Email đằng ký đã tồn tại trên hệ thống"

            user_role = UserRole.LEARNER
            try:
                if role_str:
                    user_role = UserRole(role_str)
            except ValueError:
                user_role = UserRole.LEARNER

            new_id = f"user_{uuid.uuid4().hex[:12]}"
            hashed_pw = hash_password(password)

            user = User(
                id=new_id,
                email=email,
                full_name=full_name,
                role=user_role,
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}",
                password_hash=hashed_pw,
            )

            saved_user = await repo.save(user)
            logger.info(
                "Successfully registered new user %s with email %s", new_id, email
            )

            # Trigger domain event
            await EventBus.publish(
                UserRegisteredDomainEvent(
                    user_id=new_id,
                    email=email,
                    full_name=full_name,
                )
            )

            return saved_user, ""

    async def google_register_verify(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[str, str, str, str, bool, str]:
        """Returns (temp_token, email, full_name, avatar_url, is_already_registered, error_message)."""
        if not authorization_code:
            return "", "", "", "", False, "Mã Google Authorization Code không hợp lệ"

        claims = await _exchange_google_code(authorization_code, nonce)
        email = claims["email"]
        google_id = claims["google_id"]
        full_name = claims["name"]
        avatar_url = claims["picture"]

        if not email or not google_id:
            return "", "", "", "", False, "Không thể xác thực thông tin từ Google"

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            existing_user = await repo.get_by_google_id(google_id)
            if not existing_user:
                existing_user = await repo.get_by_email(email)

            if existing_user:
                return (
                    "",
                    existing_user.email,
                    existing_user.full_name,
                    existing_user.avatar_url,
                    True,
                    "Tài khoản với email này đã tồn tại. Vui lòng chuyển sang Đăng nhập!",
                )

            temp_token = auth.create_google_temp_token(
                email=email,
                google_id=google_id,
                full_name=full_name,
                avatar_url=avatar_url,
            )
            return temp_token, email, full_name, avatar_url, False, ""

    async def complete_google_registration(
        self, temp_token: str, password: str, full_name: str, role_str: str
    ) -> tuple[User | None, str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        payload = auth.decode_token(temp_token)
        if not payload or payload.get("type") != "google_temp_registration":
            return (
                None,
                "",
                "",
                "Phiên xác thực Google đã hết hạn. Vui lòng thử lại từ bước 1.",
            )

        email = payload.get("email")
        google_id = payload.get("sub")
        avatar_url = payload.get("avatar_url", "")
        if not email or not google_id:
            return None, "", "", "Thông tin Google không hợp lệ."

        if not password or len(password) < 6:
            return None, "", "", "Mật khẩu phải chứa ít nhất 6 ký tự."

        try:
            role = UserRole(role_str)
        except ValueError:
            role = UserRole.LEARNER

        final_name = (
            full_name or payload.get("full_name") or email.split("@")[0]
        ).strip()
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        password_hash = hash_password(password)

        new_user = User(
            id=user_id,
            email=email,
            full_name=final_name,
            role=role,
            avatar_url=avatar_url,
            password_hash=password_hash,
            google_id=google_id,
            is_identity_verified=False,
        )

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            existing = await repo.get_by_email(email)
            if existing:
                return None, "", "", "Tài khoản với email này đã tồn tại."

            saved_user = await repo.save(new_user)
            access_token = auth.create_access_token(
                user_id=saved_user.id,
                email=saved_user.email,
                full_name=saved_user.full_name,
                role=str(saved_user.role),
                avatar_url=saved_user.avatar_url,
            )
            refresh_token = auth.create_refresh_token(saved_user.id)
            return saved_user, access_token, refresh_token, ""

    async def google_login(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[User | None, str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        if not authorization_code:
            return None, "", "", "Mã Google Authorization Code không hợp lệ"

        claims = await _exchange_google_code(authorization_code, nonce)
        email = claims["email"]
        google_id = claims["google_id"]

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_google_id(google_id)
            if not user:
                user = await repo.get_by_email(email)

            if not user:
                return (
                    None,
                    "",
                    "",
                    "Tài khoản chưa được đăng ký trong hệ thống. Vui lòng Đăng ký bằng Google trước!",
                )

            if not user.google_id:
                user.google_id = google_id
                user = await repo.save(user)

            access_token = auth.create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            refresh_token = auth.create_refresh_token(user.id)
            return user, access_token, refresh_token, ""

    async def google_reset_password_verify(
        self, authorization_code: str, nonce: str = ""
    ) -> tuple[str, str, str, str]:
        """Returns (temp_token, email, full_name, error_message)."""
        payload = await _exchange_google_code(authorization_code, nonce)
        if not payload:
            return "", "", "", "Mã xác thực Google không hợp lệ hoặc đã hết hạn."

        email = payload.get("email", "").strip().lower()
        full_name = payload.get("name", "").strip()

        if not email:
            return "", "", "", "Không tìm thấy email trong thông tin Google."

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                return (
                    "",
                    "",
                    "",
                    "Tài khoản chưa được đăng ký trong hệ thống. Vui lòng tạo tài khoản mới!",
                )

            temp_token = auth.create_google_temp_token(
                email=email,
                google_id=payload.get("google_id", ""),
                full_name=full_name or user.full_name,
                avatar_url=payload.get("picture", "") or user.avatar_url,
            )
            return temp_token, email, user.full_name, ""

    async def complete_reset_password(
        self, temp_token: str, new_password: str
    ) -> tuple[User | None, str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        payload = auth.decode_token(temp_token)
        if not payload:
            return (
                None,
                "",
                "",
                "Mã xác thực quá hạn hoặc không hợp lệ. Vui lòng bấm Quên mật khẩu lại!",
            )

        email = payload.get("email", "").strip().lower()
        if not email:
            return None, "", "", "Thông tin xác thực không hợp lệ."

        if not new_password or len(new_password) < 6:
            return None, "", "", "Mật khẩu mới phải chứa ít nhất 6 ký tự."

        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                return None, "", "", "Không tìm thấy tài khoản để đặt lại mật khẩu."

            user.password_hash = hash_password(new_password)
            google_id = payload.get("sub")
            if google_id and not user.google_id:
                user.google_id = google_id

            saved_user = await repo.save(user)

            access_token = auth.create_access_token(
                user_id=saved_user.id,
                email=saved_user.email,
                full_name=saved_user.full_name,
                role=str(saved_user.role),
                avatar_url=saved_user.avatar_url,
            )
            refresh_token = auth.create_refresh_token(saved_user.id)
            return saved_user, access_token, refresh_token, ""
