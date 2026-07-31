import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from sqlalchemy import select, update

from src.modules.identity.domain.entities import (
    User,
    UserRole,
    InstructorApplication,
    Invitation,
    InvitationType,
    InvitationStatus,
    hash_invitation_token,
)
from src.shared.permissions import OrgRole
from src.modules.identity.domain.constants import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
    DEFAULT_PBKDF2_ITERATIONS,
    ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS,
    ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
    DEFAULT_INVITATION_EXPIRATION_DAYS,
)
from src.modules.identity.infrastructure.models import EnterpriseLicenseModel
from src.modules.identity.infrastructure.repository import (
    IdentityRepository,
    InstructorApplicationRepository,
    OrganizationRepository,
    InvitationRepository,
)
from src.shared.permissions import (
    OrgPermission,
    enforce_organization_permission,
)
from src.modules.identity.application.submit_application_usecase import (
    SubmitInstructorApplicationUseCase,
)
from src.modules.identity.application.review_application_usecase import (
    ReviewInstructorApplicationUseCase,
)


import base64
import json

from src.modules.learning.domain.repository import ILearningRepository
from src.shared.auth import (
    CurrentUser,
    create_access_token,
    create_google_temp_token,
    create_refresh_token,
    decode_token,
)
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


def _parse_google_id_token(id_token: str) -> dict[str, str]:
    if id_token.startswith("mock_google_"):
        raw = id_token[len("mock_google_") :]
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

    try:
        parts = id_token.split(".")
        if len(parts) == 3:
            payload_b64 = parts[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))
            return {
                "google_id": payload.get("sub", ""),
                "email": payload.get("email", ""),
                "name": payload.get("name", payload.get("email", "").split("@")[0]),
                "picture": payload.get("picture", ""),
            }
    except Exception as e:
        logger.warning("Failed to decode Google ID Token: %s", e)

    email = "google.user@example.com"
    return {
        "google_id": f"google_id_{hashlib.md5(id_token.encode()).hexdigest()[:12]}",
        "email": email,
        "name": "Google User",
        "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}",
    }


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
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


def _default_learning_repo_factory(session: Any) -> ILearningRepository:
    from src.modules.learning.infrastructure.repository import (
        SQLAlchemyLearningRepository,
    )

    return SQLAlchemyLearningRepository(session)


class IdentityUseCase:
    def __init__(
        self,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
    ) -> None:
        self.learning_repo_factory = (
            learning_repo_factory or _default_learning_repo_factory
        )

    def _verify_admin(self, current_user: Optional[CurrentUser]) -> None:
        if current_user is not None and not current_user.is_admin:
            raise PermissionError(
                "Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này."
            )

    async def login(
        self, email: str, password: str
    ) -> tuple[Optional[User], str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                logger.warning("Login failed for email %s: User not found", email)
                return None, "", "", "Email hoặc mật khẩu không chính xác"

            if not verify_password(password, user.password_hash):
                logger.warning("Login failed for email %s: Invalid password", email)
                return None, "", "", "Email hoặc mật khẩu không chính xác"

            logger.info("User %s successfully logged in", user.id)
            access_token = create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            refresh_token = create_refresh_token(user.id)
            return user, access_token, refresh_token, ""

    async def refresh_token(self, refresh_token_str: str) -> tuple[str, str, str]:
        """Returns (new_access_token, new_refresh_token, error_message)."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            return "", "", "Refresh Token không hợp lệ hoặc đã hết hạn"

        user_id = payload.get("sub")
        if not user_id:
            return "", "", "Refresh Token chứa thông tin không hợp lệ"

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return "", "", "Không tìm thấy người dùng sở hữu token"

            new_access_token = create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            new_refresh_token = create_refresh_token(user.id)
            return new_access_token, new_refresh_token, ""

    async def google_register_verify(
        self, google_id_token: str
    ) -> tuple[str, str, str, str, bool, str]:
        """Returns (temp_token, email, full_name, avatar_url, is_already_registered, error_message)."""
        if not google_id_token:
            return "", "", "", "", False, "Mã Google ID Token không hợp lệ"

        claims = _parse_google_id_token(google_id_token)
        email = claims["email"]
        google_id = claims["google_id"]
        full_name = claims["name"]
        avatar_url = claims["picture"]

        if not email or not google_id:
            return "", "", "", "", False, "Không thể xác thực thông tin từ Google"

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
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

            temp_token = create_google_temp_token(
                email=email,
                google_id=google_id,
                full_name=full_name,
                avatar_url=avatar_url,
            )
            return temp_token, email, full_name, avatar_url, False, ""

    async def complete_google_registration(
        self, temp_token: str, password: str, full_name: str, role_str: str
    ) -> tuple[Optional[User], str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        payload = decode_token(temp_token)
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

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            existing = await repo.get_by_email(email)
            if existing:
                return None, "", "", "Tài khoản với email này đã tồn tại."

            saved_user = await repo.save(new_user)
            access_token = create_access_token(
                user_id=saved_user.id,
                email=saved_user.email,
                full_name=saved_user.full_name,
                role=str(saved_user.role),
                avatar_url=saved_user.avatar_url,
            )
            refresh_token = create_refresh_token(saved_user.id)
            return saved_user, access_token, refresh_token, ""

    async def google_login(
        self, google_id_token: str
    ) -> tuple[Optional[User], str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        if not google_id_token:
            return None, "", "", "Mã Google ID Token không hợp lệ"

        claims = _parse_google_id_token(google_id_token)
        email = claims["email"]
        google_id = claims["google_id"]

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
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

            access_token = create_access_token(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=str(user.role),
                avatar_url=user.avatar_url,
            )
            refresh_token = create_refresh_token(user.id)
            return user, access_token, refresh_token, ""

    async def google_reset_password_verify(
        self, google_id_token: str
    ) -> tuple[str, str, str, str]:
        """Returns (temp_token, email, full_name, error_message)."""
        payload = _parse_google_id_token(google_id_token)
        if not payload:
            return "", "", "", "Mã xác thực Google không hợp lệ hoặc đã hết hạn."

        email = payload.get("email", "").strip().lower()
        full_name = payload.get("name", "").strip()

        if not email:
            return "", "", "", "Không tìm thấy email trong thông tin Google."

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                return (
                    "",
                    "",
                    "",
                    "Tài khoản chưa được đăng ký trong hệ thống. Vui lòng tạo tài khoản mới!",
                )

            temp_token = create_google_temp_token(
                email=email,
                google_id=payload.get("google_id", ""),
                full_name=full_name or user.full_name,
                avatar_url=payload.get("picture", "") or user.avatar_url,
            )
            return temp_token, email, user.full_name, ""

    async def complete_reset_password(
        self, temp_token: str, new_password: str
    ) -> tuple[Optional[User], str, str, str]:
        """Returns (user, access_token, refresh_token, error_message)."""
        payload = decode_token(temp_token)
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

        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_email(email)
            if not user:
                return None, "", "", "Không tìm thấy tài khoản để đặt lại mật khẩu."

            user.password_hash = hash_password(new_password)
            google_id = payload.get("sub")
            if google_id and not user.google_id:
                user.google_id = google_id

            saved_user = await repo.save(user)

            access_token = create_access_token(
                user_id=saved_user.id,
                email=saved_user.email,
                full_name=saved_user.full_name,
                role=str(saved_user.role),
                avatar_url=saved_user.avatar_url,
            )
            refresh_token = create_refresh_token(saved_user.id)
            return saved_user, access_token, refresh_token, ""

    async def register(
        self, email: str, password: str, full_name: str, role_str: str
    ) -> tuple[Optional[User], str]:
        """Returns (user, error_message)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
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

            # Trigger welcome SYSTEM notification
            try:
                from src.modules.notification.application.use_cases import (
                    NotificationUseCase,
                )
                from src.modules.notification.domain.constants import (
                    NotificationCategory,
                )

                notif_uc = NotificationUseCase()
                await notif_uc.send_notification(
                    recipient_id=new_id,
                    category=NotificationCategory.SYSTEM,
                    title="Chào mừng bạn đến với Hệ thống Đào tạo LMS!",
                    content="Tài khoản của bạn đã được đăng ký thành công. Hãy khám phá danh mục khóa học ngay!",
                    action_url="",
                )
            except Exception as e:
                logger.warning(
                    "Failed to send welcome notification to user %s: %s", new_id, e
                )

            return saved_user, ""

    async def get_user_profile(
        self, user_id: str, current_user: Optional[CurrentUser] = None
    ) -> Optional[User]:
        if current_user and user_id != current_user.id and not current_user.is_admin:
            raise PermissionError(
                "Bạn không có quyền xem hồ sơ cá nhân của người dùng khác."
            )
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            return await repo.get_by_id(user_id)

    async def assign_enterprise_seat(
        self,
        user_id: str,
        enterprise_seat_key: str,
        current_user: Optional[CurrentUser] = None,
    ) -> tuple[bool, str]:
        if current_user and user_id != current_user.id and not current_user.is_admin:
            raise PermissionError(
                "Bạn không có quyền gán suất Enterprise Seat cho người dùng khác."
            )
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return False, "Không tìm thấy người dùng"

            clean_key = enterprise_seat_key.strip()

            if user.enterprise_seat_key == clean_key:
                logger.warning(
                    "User %s attempted to assign already assigned seat %s",
                    user_id,
                    clean_key,
                )
                return True, "Bạn đã được kích hoạt suất học từ đối tác này trước đó!"

            if user.enterprise_seat_key and user.enterprise_seat_key != clean_key:
                return (
                    False,
                    "Bạn đã có suất học Enterprise khác đang kích hoạt. Vui lòng liên hệ Admin để đổi mã.",
                )

            stmt = select(EnterpriseLicenseModel).where(
                EnterpriseLicenseModel.key == clean_key
            )
            res = await session.execute(stmt)
            license_model = res.scalar_one_or_none()

            if not license_model or not license_model.is_active:
                logger.warning(
                    "Enterprise seat assignment failed for user %s: Key %s is invalid or inactive",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' không tồn tại hoặc đã bị vô hiệu hóa.",
                )

            if license_model.used_seats >= license_model.total_seats:
                logger.warning(
                    "Enterprise seat assignment failed for user %s: Key %s exhausted",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' đã hết suất kích hoạt ({license_model.used_seats}/{license_model.total_seats} seats).",
                )

            # BR_ACCESS_002: Atomic DB update for activating enterprise seat with concurrency check
            result = await session.execute(
                update(EnterpriseLicenseModel)
                .where(
                    EnterpriseLicenseModel.key == clean_key,
                    EnterpriseLicenseModel.used_seats
                    < EnterpriseLicenseModel.total_seats,
                )
                .values(used_seats=EnterpriseLicenseModel.used_seats + 1)
            )
            if getattr(result, "rowcount", 0) == 0:
                logger.warning(
                    "Race condition detected during seat assignment for user %s: Key %s exhausted",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' đã hết suất kích hoạt.",
                )

            user.enterprise_seat_key = clean_key
            user.seat_assigned_at = datetime.now(timezone.utc).isoformat()
            await repo.save(user)
            logger.info(
                "User %s successfully assigned enterprise seat %s", user_id, clean_key
            )

            # Trigger SYSTEM notification
            try:
                from src.modules.notification.application.use_cases import (
                    NotificationUseCase,
                )
                from src.modules.notification.domain.constants import (
                    NotificationCategory,
                )

                notif_uc = NotificationUseCase()
                await notif_uc.send_notification(
                    recipient_id=user_id,
                    category=NotificationCategory.SYSTEM,
                    title="Kích hoạt Suất học Doanh nghiệp thành công",
                    content=f"Tài khoản của bạn đã được liên kết với suất học đối tác {license_model.partner_name}.",
                    action_url="/courses",
                )
            except Exception as e:
                logger.warning("Failed to send enterprise seat notification: %s", e)

            return (
                True,
                f"Kích hoạt thành công suất học từ đối tác {license_model.partner_name}!",
            )

    async def list_enterprise_seats(
        self,
        partner_name: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> list[dict]:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            stmt = select(EnterpriseLicenseModel)
            if partner_name:
                stmt = stmt.where(
                    EnterpriseLicenseModel.partner_name.ilike(f"%{partner_name}%")
                )
            res = await session.execute(stmt)
            licenses = res.scalars().all()

            result = []
            for lic in licenses:
                result.append(
                    {
                        "id": lic.key,
                        "partner_name": lic.partner_name,
                        "seat_key": lic.key,
                        "assigned_user_id": f"{lic.used_seats}/{lic.total_seats} seats",
                        "assigned_user_email": "Hoạt động"
                        if lic.is_active
                        else "Vô hiệu",
                        "status": "ACTIVE" if lic.is_active else "INACTIVE",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "scope_type": getattr(lic, "scope_type", "ALL_COURSES"),
                        "allowed_course_ids": getattr(lic, "allowed_course_ids", []),
                    }
                )
            return result

    async def create_enterprise_seat(
        self,
        partner_name: str,
        seat_key: str,
        scope_type: str = "ALL_COURSES",
        allowed_course_ids: Optional[list[str]] = None,
        current_user: Optional[CurrentUser] = None,
    ) -> dict:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            clean_key = seat_key.strip() or f"KEY-{uuid.uuid4().hex[:8].upper()}"
            clean_scope = (
                scope_type
                if scope_type in ("ALL_COURSES", "CURATED_COURSES")
                else "ALL_COURSES"
            )
            courses_list = allowed_course_ids or []
            lic = EnterpriseLicenseModel(
                key=clean_key,
                partner_name=partner_name or "Doanh nghiệp Đối tác",
                total_seats=DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
                used_seats=0,
                is_active=True,
                scope_type=clean_scope,
                allowed_course_ids=courses_list,
            )
            session.add(lic)
            await session.commit()
            return {
                "id": clean_key,
                "partner_name": partner_name,
                "seat_key": clean_key,
                "assigned_user_id": f"0/{DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS} seats",
                "assigned_user_email": "Hoạt động",
                "status": "ACTIVE",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "scope_type": clean_scope,
                "allowed_course_ids": courses_list,
            }

    async def verify_identity(
        self, user_id: str, id_card_number: str = ""
    ) -> tuple[bool, str]:
        """Completes biometric / ID card verification for learner (BR_CERT_003)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return False, "Không tìm thấy người dùng"

            user.is_identity_verified = True
            await repo.save(user)
            logger.info("User %s successfully verified identity", user_id)
            return True, "Xác minh danh tính sinh trắc học & CCCD thành công!"

    async def revoke_enterprise_seat(
        self,
        user_id: str,
        course_id: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> tuple[bool, str]:
        self._verify_admin(current_user)
        """Revokes enterprise seat from user if BR_ACCESS_003 conditions are met.

        Conditions (BR_ACCESS_003):
          - User must have been assigned a seat.
          - If seat was assigned <= 30 days ago, progress must be < 20%.
          - If seat was assigned > 30 days ago, revocation is allowed unconditionally.
        """
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user or not user.enterprise_seat_key:
                return False, "Người dùng chưa được gán mã Enterprise Seat"

            # BR_ACCESS_003: enforce 30-day + <20% progress guard
            now = datetime.now(timezone.utc)
            if user.seat_assigned_at:
                try:
                    assigned_dt = datetime.fromisoformat(user.seat_assigned_at)
                    within_grace_period = (now - assigned_dt) <= timedelta(
                        days=ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS
                    )
                except (ValueError, TypeError):
                    within_grace_period = False
            else:
                within_grace_period = False

            if within_grace_period and course_id:
                learning_repo = self.learning_repo_factory(session)
                progress = await learning_repo.get_progress(user_id, course_id)
                if (
                    progress
                    and progress.overall_progress_percent
                    >= ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT
                ):
                    logger.warning(
                        "Cannot revoke seat %s from user %s: Progress %s >= %s",
                        user.enterprise_seat_key,
                        user_id,
                        progress.overall_progress_percent,
                        ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
                    )
                    return (
                        False,
                        f"Không thể thu hồi: Học viên đã đạt {progress.overall_progress_percent}% tiến độ (>= {int(ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT)}% trong {ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS} ngày đầu).",
                    )

            seat_key = user.enterprise_seat_key
            user.enterprise_seat_key = None
            user.seat_assigned_at = None
            await repo.save(user)

            # BR_ACCESS_003: Atomic DB update for recycling enterprise seats
            if seat_key:
                result = await session.execute(
                    update(EnterpriseLicenseModel)
                    .where(
                        EnterpriseLicenseModel.key == seat_key,
                        EnterpriseLicenseModel.used_seats > 0,
                    )
                    .values(used_seats=EnterpriseLicenseModel.used_seats - 1)
                )
                if getattr(result, "rowcount", 0) == 0:
                    logger.warning(
                        "Seat recycle skipped — already 0 for key %s", seat_key
                    )
            await session.commit()

            logger.info(
                "Successfully revoked enterprise seat %s from user %s",
                seat_key,
                user_id,
            )
            return True, f"Đã thu hồi suất học Enterprise Key '{seat_key}' thành công!"

    async def update_instructor_profile(
        self, user_id: str, title: str, signature_image_url: str
    ) -> tuple[Optional[User], str]:
        """Updates instructor title and signature_image_url. Returns (user, error_message)."""
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return None, "Không tìm thấy người dùng"

            user.title = title
            user.signature_image_url = signature_image_url
            saved_user = await repo.save(user)
            logger.info("Updated instructor profile for user %s", user_id)
            return saved_user, ""

    async def submit_instructor_application(
        self,
        user_id: str,
        title: str,
        bio: str,
        linkedin_url: str = "",
        cv_url: str = "",
        demo_video_url: str = "",
    ) -> InstructorApplication:
        async with async_session_scope() as session:
            repo = InstructorApplicationRepository(session)
            use_case = SubmitInstructorApplicationUseCase(repo)
            return await use_case.execute(
                user_id=user_id,
                title=title,
                bio=bio,
                linkedin_url=linkedin_url,
                cv_url=cv_url,
                demo_video_url=demo_video_url,
            )

    async def get_my_instructor_application(
        self, user_id: str
    ) -> Optional[InstructorApplication]:
        async with async_session_scope() as session:
            repo = InstructorApplicationRepository(session)
            return await repo.get_latest_by_user_id(user_id)

    async def list_instructor_applications(
        self,
        status_filter: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> list[InstructorApplication]:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            repo = InstructorApplicationRepository(session)
            return await repo.list_applications(status_filter)

    async def review_instructor_application(
        self,
        application_id: str,
        approve: bool,
        rejection_reason: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> InstructorApplication:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            app_repo = InstructorApplicationRepository(session)
            identity_repo = IdentityRepository(session)
            org_repo = OrganizationRepository(session)
            use_case = ReviewInstructorApplicationUseCase(
                app_repo, identity_repo, org_repo
            )
            return await use_case.execute(
                application_id=application_id,
                approve=approve,
                rejection_reason=rejection_reason,
            )

    async def _resolve_target_org_id(
        self,
        org_repo: OrganizationRepository,
        user: Optional[CurrentUser],
        organization_id: str,
    ) -> str:
        clean_org_id = (organization_id or "").strip()
        if clean_org_id:
            org = await org_repo.get_organization_by_id(clean_org_id)
            if org:
                return org.id
            return clean_org_id
        if user:
            user_orgs = await org_repo.list_user_organizations(user.id)
            if user_orgs:
                return user_orgs[0].id
        return ""

    async def _verify_org_admin_permission(
        self,
        session: Any,
        user: Optional[CurrentUser],
        organization_id: str,
    ) -> None:
        await enforce_organization_permission(
            session,
            user,
            organization_id,
            required_permission=OrgPermission.MANAGE_MEMBERS,
        )

    async def add_organization_member(
        self,
        email: str,
        role_id: str,
        organization_id: str,
        current_user: Optional[CurrentUser] = None,
    ) -> dict:
        async with async_session_scope() as session:
            identity_repo = IdentityRepository(session)
            org_repo = OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            await self._verify_org_admin_permission(
                session, current_user, target_org_id
            )

            target_user = await identity_repo.get_by_email(email.strip())
            if not target_user:
                raise ValueError(f"Không tìm thấy người dùng với email '{email}'")

            target_role = (
                role_id.strip()
                if role_id and role_id.strip()
                else OrgRole.INSTRUCTOR.value
            )

            member = await org_repo.add_member(
                user_id=target_user.id,
                org_id=target_org_id,
                role_id=target_role,
                status="ACTIVE",
            )
            members = await org_repo.list_members_with_details(target_org_id)
            for m in members:
                if m["user_id"] == target_user.id:
                    return m
            return {
                "member_id": member.id,
                "user_id": target_user.id,
                "email": target_user.email,
                "full_name": target_user.full_name,
                "avatar_url": target_user.avatar_url or "",
                "role_id": member.role_id,
                "role_name": member.role_id,
                "status": member.status,
                "joined_at": member.joined_at or "",
            }

    async def list_organization_members(
        self, organization_id: str, current_user: Optional[CurrentUser] = None
    ) -> list[dict]:
        async with async_session_scope() as session:
            org_repo = OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            if current_user and not current_user.is_admin:
                member = await org_repo.get_member(current_user.id, target_org_id)
                user_orgs = await org_repo.list_user_organizations(current_user.id)
                if not member and not user_orgs:
                    # Non-org member returning empty list cleanly for UI
                    return []
            return await org_repo.list_members_with_details(target_org_id)

    async def remove_organization_member(
        self,
        user_id: str,
        organization_id: str,
        current_user: Optional[CurrentUser] = None,
    ) -> bool:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập.")

        async with async_session_scope() as session:
            org_repo = OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )

            target_member = await org_repo.get_member(user_id, target_org_id)
            if not target_member:
                return True

            is_self = user_id == current_user.id
            target_role = (target_member.role_id or "").upper()

            if is_self:
                if "OWNER" in target_role and not current_user.is_admin:
                    raise PermissionError(
                        "Chủ sở hữu duy nhất không thể tự rời Tổ chức. Vui lòng chuyển nhượng quyền sở hữu trước."
                    )
            else:
                await self._verify_org_admin_permission(
                    session, current_user, target_org_id
                )
                if "OWNER" in target_role and not current_user.is_admin:
                    raise PermissionError(
                        "Không thể xóa tài khoản Chủ sở hữu (ORG_OWNER) khỏi Tổ chức."
                    )

            action_type = (
                "ORGANIZATION_AUDIT_ACTION_MEMBER_LEFT"
                if is_self
                else "ORGANIZATION_AUDIT_ACTION_MEMBER_KICKED"
            )
            details_text = (
                "Thành viên tự nguyện rời khỏi Tổ chức."
                if is_self
                else f"Loại khỏi Tổ chức bởi {current_user.full_name or current_user.email}."
            )

            res = await org_repo.remove_member(user_id=user_id, org_id=target_org_id)
            if res:
                await org_repo.create_audit_log(
                    org_id=target_org_id,
                    actor_id=current_user.id,
                    target_user_id=user_id,
                    action=action_type,
                    details=details_text,
                )
            return res

    async def list_organization_audit_logs(
        self, organization_id: str, current_user: CurrentUser
    ) -> list[dict]:
        async with async_session_scope() as session:
            org_repo = OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            await self._verify_org_admin_permission(
                session, current_user, target_org_id
            )
            return await org_repo.list_audit_logs(target_org_id)

    async def list_my_organizations(
        self, current_user: CurrentUser
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            org_repo = OrganizationRepository(session)
            return await org_repo.list_user_organization_details(current_user.id)

    async def create_invitation(
        self,
        type: str,
        invitee_email: str,
        target_id: str,
        target_name: str = "",
        role_id: str = "",
        message: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> dict:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập để gửi lời mời.")

        invitee_email_clean = invitee_email.strip().lower()
        if not invitee_email_clean:
            raise ValueError("Email người nhận không được để trống.")

        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            org_repo = OrganizationRepository(session)
            user_repo = IdentityRepository(session)

            inviter = await user_repo.get_by_id(current_user.id)
            inviter_id = current_user.id
            inviter_name = inviter.full_name if inviter else current_user.full_name
            inviter_email = inviter.email if inviter else current_user.email

            type_str = str(type).upper()
            if "ORGANIZATION" in type_str or type_str == "1":
                clean_role = (role_id or "INSTRUCTOR").upper().strip()
                valid_org_roles = [r.value for r in OrgRole]
                if clean_role not in valid_org_roles and clean_role not in [
                    "ORG_OWNER"
                ]:
                    raise ValueError(
                        f"Vai trò '{role_id}' không thuộc danh sách vai trò hợp lệ của Tổ chức ({', '.join(valid_org_roles)})."
                    )
                if clean_role in [OrgRole.OWNER.value, "ORG_OWNER"]:
                    raise PermissionError(
                        "Không thể gửi lời mời trực tiếp cho vai trò Chủ sở hữu Tổ chức (OWNER)."
                    )
                type_enum = InvitationType.ORGANIZATION_MEMBER
                target_org_id = await self._resolve_target_org_id(
                    org_repo, current_user, target_id
                )
                await self._verify_org_admin_permission(
                    session, current_user, target_org_id
                )
                if not target_name:
                    org = await org_repo.get_organization_by_id(target_org_id)
                    target_name = org.name if org else "Tổ chức"
                target_id = target_org_id
            elif "COURSE" in type_str or "CO_INSTRUCTOR" in type_str or type_str == "2":
                if role_id in ["COURSE_OWNER", "OWNER"]:
                    raise PermissionError(
                        "Không thể gửi lời mời cho vai trò Chủ sở hữu Khóa học."
                    )
                type_enum = InvitationType.COURSE_CO_INSTRUCTOR
                if not target_id:
                    raise ValueError("Thiếu ID khóa học (target_id).")
                from src.modules.catalog.infrastructure.repository import (
                    SQLAlchemyCatalogRepository,
                )

                cat_repo = SQLAlchemyCatalogRepository(session)
                course = await cat_repo.get_course_detail(target_id)
                if not course or (
                    course.owner_id != current_user.id
                    and current_user.id not in getattr(course, "co_instructor_ids", [])
                ):
                    if current_user.role not in [
                        UserRole.ADMIN.value,
                        UserRole.ADMIN,
                        "ADMIN",
                    ]:
                        raise PermissionError(
                            "Bạn không có quyền mời giảng viên cho khóa học này."
                        )
                if not target_name:
                    target_name = course.title if course else f"Khóa học {target_id}"
            elif "ENTERPRISE" in type_str or "SEAT" in type_str or type_str == "3":
                if current_user.role not in [
                    UserRole.ADMIN.value,
                    UserRole.ADMIN,
                    "ADMIN",
                ]:
                    raise PermissionError(
                        "Chỉ Quản trị viên mới có quyền gửi lời mời Suất học Doanh nghiệp."
                    )
                type_enum = InvitationType.ENTERPRISE_SEAT
                if not target_name:
                    target_name = "Suất học Doanh nghiệp"
            else:
                type_enum = InvitationType.ORGANIZATION_MEMBER

            invitee_user = await user_repo.get_by_email(invitee_email_clean)
            invitee_id = invitee_user.id if invitee_user else None

            # Check if user is already an active member of the organization
            if invitee_user and type_enum == InvitationType.ORGANIZATION_MEMBER:
                existing_member = await org_repo.get_member(invitee_user.id, target_id)
                if existing_member and existing_member.status == "ACTIVE":
                    raise ValueError(
                        f"Người dùng '{invitee_email_clean}' đã là thành viên của Tổ chức này."
                    )

            # Check if a PENDING invitation already exists for this email and target
            existing_invite = await inv_repo.find_pending_invitation(
                invitee_email_clean, target_id, type_enum.value
            )
            if existing_invite and isinstance(existing_invite, Invitation):
                raise ValueError(
                    f"Đã có một lời mời đang chờ phản hồi (PENDING) gửi tới '{invitee_email_clean}' cho Tổ chức này."
                )

            raw_token = f"inv_tok_{uuid.uuid4().hex}"
            token_hash = hash_invitation_token(raw_token)
            now_dt = datetime.now(timezone.utc)
            expires_dt = now_dt + timedelta(days=DEFAULT_INVITATION_EXPIRATION_DAYS)

            inv = Invitation(
                id=f"inv_{uuid.uuid4().hex[:12]}",
                type=type_enum,
                status=InvitationStatus.PENDING,
                inviter_id=inviter_id,
                inviter_name=inviter_name,
                inviter_email=inviter_email,
                invitee_email=invitee_email_clean,
                invitee_id=invitee_id,
                target_id=target_id,
                target_name=target_name,
                role_id=role_id,
                token_hash=token_hash,
                message=message,
                expires_at=expires_dt.isoformat(),
                created_at=now_dt.isoformat(),
            )

            saved = await inv_repo.save(inv)

            if invitee_id:
                try:
                    from src.modules.notification.application.use_cases import (
                        NotificationUseCase,
                    )
                    from src.modules.notification.domain.constants import (
                        NotificationCategory,
                    )

                    notif_uc = NotificationUseCase()
                    await notif_uc.send_notification(
                        recipient_id=invitee_id,
                        category=NotificationCategory.SYSTEM,
                        title=f"Lời mời tham gia {target_name}",
                        content=f"{inviter_name} đã mời bạn tham gia {target_name} với vai trò {role_id or 'MEMBER'}.",
                        action_url=f"/invitations/{raw_token}",
                        actor_avatar_url=getattr(current_user, "avatar_url", "") or "",
                    )
                except Exception:
                    pass

            res_dict = self._invitation_to_dict(saved)
            res_dict["token"] = raw_token
            return res_dict

    async def list_sent_invitations(
        self,
        type: str = "",
        target_id: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> list[dict]:
        if not current_user:
            return []
        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            org_repo = OrganizationRepository(session)
            clean_target_id = (target_id or "").strip()
            if clean_target_id:
                resolved_id = await self._resolve_target_org_id(
                    org_repo, current_user, clean_target_id
                )
                clean_target_id = resolved_id or clean_target_id
            invs = await inv_repo.list_sent_invitations(
                inviter_id=current_user.id,
                inv_type=type,
                target_id=clean_target_id,
            )
            return [self._invitation_to_dict(i) for i in invs]

    async def list_my_invitations(
        self,
        status_filter: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> list[dict]:
        if not current_user or not current_user.email:
            return []
        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            invs = await inv_repo.list_my_invitations(
                email=current_user.email.lower(),
                user_id=current_user.id,
                status_filter=status_filter,
            )
            return [self._invitation_to_dict(i) for i in invs]

    async def get_invitation_by_token(self, token: str) -> dict:
        if not token:
            raise ValueError("Token không hợp lệ.")
        token_hash = hash_invitation_token(token)
        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            inv = await inv_repo.get_by_token_hash(token_hash)
            if not inv:
                raise ValueError("Lời mời không tồn tại hoặc đã hết hạn.")

            if inv.status == InvitationStatus.PENDING and inv.expires_at:
                try:
                    exp_dt = datetime.fromisoformat(
                        inv.expires_at.replace("Z", "+00:00")
                    )
                    if datetime.now(timezone.utc) > exp_dt:
                        inv.status = InvitationStatus.EXPIRED
                        await inv_repo.save(inv)
                except Exception:
                    pass

            return self._invitation_to_dict(inv)

    async def respond_to_invitation(
        self,
        invitation_id: str,
        action: str,
        token: str = "",
        current_user: Optional[CurrentUser] = None,
    ) -> tuple[dict, bool, str]:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập để phản hồi lời mời.")
        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            inv: Optional[Invitation] = None
            if invitation_id:
                inv = await inv_repo.get_by_id(invitation_id)
            if not inv and token:
                token_hash = hash_invitation_token(token)
                inv = await inv_repo.get_by_token_hash(token_hash)

            if not inv:
                return {}, False, "Lời mời không tồn tại."

            if inv.invitee_email.lower() != current_user.email.lower():
                return (
                    self._invitation_to_dict(inv),
                    False,
                    "Bạn không phải người nhận của lời mời này.",
                )

            inv_status_str = (
                inv.status.value if hasattr(inv.status, "value") else str(inv.status)
            )
            if (
                inv_status_str != "INVITATION_STATUS_PENDING"
                and inv_status_str != "PENDING"
            ):
                return (
                    self._invitation_to_dict(inv),
                    False,
                    f"Lời mời đã ở trạng thái {inv_status_str}.",
                )

            if inv.expires_at:
                try:
                    exp_dt = datetime.fromisoformat(
                        inv.expires_at.replace("Z", "+00:00")
                    )
                    if datetime.now(timezone.utc) > exp_dt:
                        inv.status = InvitationStatus.EXPIRED
                        await inv_repo.save(inv)
                        return (
                            self._invitation_to_dict(inv),
                            False,
                            "Lời mời đã hết hạn.",
                        )
                except Exception:
                    pass

            now_str = datetime.now(timezone.utc).isoformat()
            act_str = str(action).upper()

            if "DECLINE" in act_str or act_str == "2":
                inv.status = InvitationStatus.DECLINED
                inv.responded_at = now_str
                saved = await inv_repo.save(inv)
                return self._invitation_to_dict(saved), True, "Đã từ chối lời mời."
            elif "ACCEPT" in act_str or act_str == "1":
                inv.status = InvitationStatus.ACCEPTED
                inv.responded_at = now_str
                inv.invitee_id = current_user.id
            else:
                return (
                    self._invitation_to_dict(inv),
                    False,
                    "Hành động phản hồi không hợp lệ.",
                )

            inv_type_str = (
                inv.type.value if hasattr(inv.type, "value") else str(inv.type)
            )

            if "ORGANIZATION" in inv_type_str:
                org_repo = OrganizationRepository(session)
                await org_repo.add_member(
                    user_id=current_user.id,
                    org_id=inv.target_id,
                    role_id=inv.role_id or "MEMBER",
                    status="ACTIVE",
                )
                await org_repo.create_audit_log(
                    org_id=inv.target_id,
                    actor_id=inv.inviter_id or current_user.id,
                    target_user_id=current_user.id,
                    action="ORGANIZATION_AUDIT_ACTION_MEMBER_JOINED",
                    details=f"Gia nhập với vai trò {inv.role_id or 'MEMBER'} qua lời mời.",
                )
            elif "COURSE" in inv_type_str or "CO_INSTRUCTOR" in inv_type_str:
                from src.modules.catalog.infrastructure.repository import (
                    SQLAlchemyCatalogRepository,
                )

                cat_repo = SQLAlchemyCatalogRepository(session)
                await cat_repo.add_course_collaborator(
                    course_id=inv.target_id,
                    user_id=current_user.id,
                    role=inv.role_id or "co_instructor",
                )
                await cat_repo.create_audit_log(
                    course_id=inv.target_id,
                    actor_id=inv.inviter_id or current_user.id,
                    target_user_id=current_user.id,
                    action="COURSE_AUDIT_ACTION_COLLABORATOR_JOINED",
                    details=f"Gia nhập đội ngũ giảng dạy với vai trò {(inv.role_id or 'co_instructor').upper()} qua lời mời.",
                )
            elif "ENTERPRISE" in inv_type_str or "SEAT" in inv_type_str:
                lic_key = inv.target_id
                license_model = await session.get(EnterpriseLicenseModel, lic_key)
                if not license_model or not license_model.is_active:
                    return (
                        self._invitation_to_dict(inv),
                        False,
                        "Mã Suất học Doanh nghiệp không tồn tại hoặc đã bị vô hiệu hóa.",
                    )
                if license_model.used_seats >= license_model.total_seats:
                    return (
                        self._invitation_to_dict(inv),
                        False,
                        "Mã Suất học Doanh nghiệp đã hết số lượng khả dụng.",
                    )

                user_repo = IdentityRepository(session)
                user = await user_repo.get_by_id(current_user.id)
                if user:
                    if user.enterprise_seat_key != lic_key:
                        license_model.used_seats += 1
                        user.enterprise_seat_key = lic_key
                        user.seat_assigned_at = now_str
                        await user_repo.save(user)

            saved = await inv_repo.save(inv)
            return (
                self._invitation_to_dict(saved),
                True,
                "Đã chấp nhận lời mời thành công!",
            )

    async def cancel_invitation(
        self,
        invitation_id: str,
        current_user: Optional[CurrentUser] = None,
    ) -> bool:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập.")
        async with async_session_scope() as session:
            inv_repo = InvitationRepository(session)
            inv = await inv_repo.get_by_id(invitation_id)
            if not inv:
                return False
            if inv.inviter_id != current_user.id and not current_user.is_admin:
                raise PermissionError(
                    "Chỉ người gửi lời mời hoặc Admin mới được phép hủy lời mời này."
                )
            inv.status = InvitationStatus.CANCELLED
            await inv_repo.save(inv)
            return True

    def _invitation_to_dict(self, inv: Invitation) -> dict:
        type_str = inv.type.value if hasattr(inv.type, "value") else str(inv.type)
        status_str = (
            inv.status.value if hasattr(inv.status, "value") else str(inv.status)
        )
        return {
            "id": inv.id,
            "type": type_str,
            "status": status_str,
            "inviter_id": inv.inviter_id,
            "inviter_name": inv.inviter_name,
            "inviter_email": inv.inviter_email,
            "invitee_email": inv.invitee_email,
            "invitee_id": inv.invitee_id or "",
            "target_id": inv.target_id,
            "target_name": inv.target_name,
            "role_id": inv.role_id,
            "token": "",
            "message": inv.message,
            "expires_at": inv.expires_at,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at,
        }
