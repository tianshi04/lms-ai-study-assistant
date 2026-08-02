"""Demo Notifications Seeding Script.

Creates realistic sample notifications for the 4 core approved notification types across all users in PostgreSQL.

Usage:
    uv run python src/seed_demo_notifications.py
"""

import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import delete, select  # noqa: E402
from src.modules.catalog.infrastructure.models import CourseModel  # noqa: E402
from src.modules.identity.infrastructure.models import UserModel  # noqa: E402
from src.modules.notification.domain.constants import NotificationCategory  # noqa: E402
from src.modules.notification.domain.entities import Notification  # noqa: E402
from src.modules.notification.infrastructure.models import (  # noqa: E402
    NotificationModel,
)
from src.modules.notification.infrastructure.repository import (  # noqa: E402
    PostgresNotificationRepository,
)
from src.shared.infrastructure.database import async_session_scope  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_notifications():
    async with async_session_scope() as session:
        # Clear existing demo notifications
        await session.execute(
            delete(NotificationModel).where(NotificationModel.id.like("notif_demo_%"))
        )
        # Fetch real course ID from DB
        course_res = await session.execute(select(CourseModel.id))
        existing_course_ids = list(course_res.scalars().all())
        demo_course_id = (
            existing_course_ids[0] if existing_course_ids else "course-python-ai"
        )

        sample_notifications = [
            {
                "category": NotificationCategory.ANNOUNCEMENT,
                "title": "Thông báo từ Giảng viên: Lịch Live Q&A Tuần này",
                "content": "Buổi giải đáp thắc mắc trực tuyến Tuần 4 sẽ được dời sang 20:00 tối thứ 6. Mời các học viên tham gia.",
                "action_url": f"/courses/{demo_course_id}",
            },
            {
                "category": NotificationCategory.COMMUNITY,
                "title": "Giảng viên Andrew Ng đã phản hồi thảo luận của bạn",
                "content": "Giảng viên: 'Thuật toán Gradient Descent trong trường hợp này nên sử dụng Learning Rate là 0.01...'",
                "action_url": f"/learn/{demo_course_id}?tab=forum&threadId=demo_thread_1",
            },
            {
                "category": NotificationCategory.SYSTEM,
                "title": "Đơn đăng ký Giảng viên đã được phê duyệt",
                "content": "Chúc mừng! Hồ sơ thẩm định năng lực giảng dạy của bạn đã được Super Admin phê duyệt.",
                "action_url": "/become-an-instructor",
            },
            {
                "category": NotificationCategory.ACADEMIC,
                "title": "Đơn xin Hỗ trợ Tài chính (Financial Aid) đã chấp thuận",
                "content": "Yêu cầu xin trợ cấp học bổng 100% cho khóa học Machine Learning đã được chấp thuận.",
                "action_url": "/financial-aid",
            },
        ]

        # Fetch all existing users
        result = await session.execute(select(UserModel))
        users = list(result.scalars().all())

        user_ids = [u.id for u in users] if users else ["demo_user_1", "user_learner"]

        repo = PostgresNotificationRepository(session)
        count = 0

        now = datetime.now(timezone.utc)
        for user_id in user_ids:
            for sample in sample_notifications:
                cat = sample["category"]
                category_enum: NotificationCategory = (
                    cat
                    if isinstance(cat, NotificationCategory)
                    else NotificationCategory(str(cat))
                )
                notif = Notification(
                    id=f"notif_demo_{uuid.uuid4().hex[:10]}",
                    recipient_id=user_id,
                    category=category_enum,
                    title=str(sample["title"]),
                    content=str(sample["content"]),
                    action_url=str(sample["action_url"]),
                    actor_avatar_url="",
                    is_read=False,
                    created_at=now,
                )
                await repo.create(notif)
                count += 1

        logger.info(
            f"[SEED] Created {count} sample notifications for {len(user_ids)} users!"
        )


if __name__ == "__main__":
    asyncio.run(seed_notifications())
