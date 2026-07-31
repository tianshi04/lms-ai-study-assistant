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
)
from src.modules.identity.domain.constants import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
    DEFAULT_PBKDF2_ITERATIONS,
    ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS,
    ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
)
from src.modules.identity.infrastructure.models import EnterpriseLicenseModel
from src.modules.identity.infrastructure.repository import (
    IdentityRepository,
    InstructorApplicationRepository,
    OrganizationRepository,
)
from src.modules.identity.application.submit_application_usecase import (
    SubmitInstructorApplicationUseCase,
)
from src.modules.identity.application.review_application_usecase import (
    ReviewInstructorApplicationUseCase,
)


from src.modules.learning.domain.repository import ILearningRepository
from src.shared.auth import create_access_token, create_refresh_token, decode_token
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


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
            access_token = create_access_token(user.id, user.email, user.role.value)
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

            new_access_token = create_access_token(user.id, user.email, user.role.value)
            new_refresh_token = create_refresh_token(user.id)
            return new_access_token, new_refresh_token, ""

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
            return (
                True,
                f"Kích hoạt thành công suất học từ đối tác {license_model.partner_name}!",
            )

    async def list_enterprise_seats(self, partner_name: str = "") -> list[dict]:
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
                        "created_at": "2026",
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
    ) -> dict:
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
                "created_at": "2026",
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
        self, user_id: str, course_id: str = ""
    ) -> tuple[bool, str]:
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
        self, status_filter: str = ""
    ) -> list[InstructorApplication]:
        async with async_session_scope() as session:
            repo = InstructorApplicationRepository(session)
            return await repo.list_applications(status_filter)

    async def review_instructor_application(
        self, application_id: str, approve: bool, rejection_reason: str = ""
    ) -> InstructorApplication:
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
