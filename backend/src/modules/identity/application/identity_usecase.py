import hashlib
import os
import uuid
from typing import Optional

from sqlalchemy import select

from src.modules.identity.domain.entities import User, UserRole
from src.modules.identity.infrastructure.models import EnterpriseLicenseModel
from src.modules.identity.infrastructure.repository import IdentityRepository
from src.shared.infrastructure.database import async_session_scope


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}:{hashed.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if ":" not in password_hash:
        return False
    salt_hex, hash_hex = password_hash.split(":", 1)
    salt = bytes.fromhex(salt_hex)
    new_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000).hex()
    return new_hash == hash_hex


class IdentityUseCase:
    async def login(self, email: str, password: str) -> tuple[Optional[User], str, str]:
        """Returns (user, access_token, error_message)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                return None, "", "Email hoặc mật khẩu không chính xác"

            if not verify_password(password, user.password_hash):
                return None, "", "Email hoặc mật khẩu không chính xác"

            token = f"bearer-token-{user.id}-{uuid.uuid4().hex[:8]}"
            return user, token, ""

    async def register(
        self, email: str, password: str, full_name: str, role_str: str
    ) -> tuple[Optional[User], str]:
        """Returns (user, error_message)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            existing = await repo.get_by_email(email)
            if existing:
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
            return saved_user, ""

    async def get_user_profile(self, user_id: str) -> Optional[User]:
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            return await repo.get_by_id(user_id)

    async def assign_enterprise_seat(
        self, user_id: str, enterprise_seat_key: str
    ) -> tuple[bool, str]:
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return False, "Không tìm thấy người dùng"

            # Strict Enterprise Seat Key Validation
            clean_key = enterprise_seat_key.strip()
            stmt = select(EnterpriseLicenseModel).where(EnterpriseLicenseModel.key == clean_key)
            res = await session.execute(stmt)
            license_model = res.scalar_one_or_none()

            if not license_model or not license_model.is_active:
                return False, f"Mã Enterprise Key '{clean_key}' không tồn tại hoặc đã bị vô hiệu hóa."

            if license_model.used_seats >= license_model.total_seats:
                return False, f"Mã Enterprise Key '{clean_key}' đã hết suất kích hoạt ({license_model.used_seats}/{license_model.total_seats} seats)."

            # Update used seats count and assign key
            license_model.used_seats += 1
            user.enterprise_seat_key = clean_key
            await repo.save(user)
            return True, f"Kích hoạt thành công suất học từ đối tác {license_model.partner_name}!"
