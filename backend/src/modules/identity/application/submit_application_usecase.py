import uuid
from datetime import UTC, datetime

from src.modules.identity.domain.constants import (
    INSTRUCTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS,
)
from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
)
from src.modules.identity.infrastructure.repository import (
    InstructorApplicationRepository,
)


class SubmitInstructorApplicationUseCase:
    def __init__(self, repository: InstructorApplicationRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        user_id: str,
        title: str,
        bio: str,
        linkedin_url: str = "",
        cv_url: str = "",
        demo_video_url: str = "",
    ) -> InstructorApplication:
        clean_title = title.strip()
        clean_bio = bio.strip()

        if not clean_title:
            raise ValueError("Chức danh chuyên môn không được để trống.")

        if not clean_bio:
            raise ValueError("Bài viết tiểu sử năng lực không được để trống.")

        # Check existing application for user
        existing_app = await self._repository.get_latest_by_user_id(user_id)
        if existing_app:
            if existing_app.status == ApplicationStatus.PENDING_REVIEW:
                raise ValueError(
                    "Bạn đã có đơn xin cấp quyền Giảng viên đang chờ duyệt."
                )
            elif (
                existing_app.status == ApplicationStatus.REJECTED
                and existing_app.reviewed_at
            ):
                reviewed_dt = None
                try:
                    reviewed_dt = datetime.fromisoformat(existing_app.reviewed_at)
                    if reviewed_dt.tzinfo is None:
                        reviewed_dt = reviewed_dt.replace(tzinfo=UTC)
                except (ValueError, TypeError):
                    reviewed_dt = None

                if reviewed_dt is not None:
                    now_dt = datetime.now(UTC)
                    days_since_rejected = (now_dt - reviewed_dt).days
                    if (
                        days_since_rejected
                        < INSTRUCTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS
                    ):
                        remaining_days = max(
                            1,
                            INSTRUCTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS
                            - days_since_rejected,
                        )
                        raise ValueError(
                            f"Đơn đăng ký trước đó của bạn đã bị từ chối. Vui lòng chờ thêm {remaining_days} ngày để nộp lại đơn mới."
                        )

        now_str = datetime.now(UTC).isoformat()
        application = InstructorApplication(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=clean_title,
            bio=clean_bio,
            linkedin_url=linkedin_url.strip(),
            cv_url=cv_url.strip(),
            demo_video_url=demo_video_url.strip(),
            status=ApplicationStatus.PENDING_REVIEW,
            rejection_reason="",
            created_at=now_str,
            reviewed_at="",
        )

        return await self._repository.save(application)
