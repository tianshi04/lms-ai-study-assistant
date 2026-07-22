"""Database Seeding Script for Development & Demo Environment.

Best-Practice DDD Infrastructure Seeding Script:
- Default Execution (Upsert Mode): Uses session.merge() to safely insert missing seed records or update existing ones without destructive data wipes.
- Reset Execution (--reset Flag): Truncates catalog and learning progress tables when explicitly requested for a pristine environment reset.
- Dev Startup Integration: Auto-seeds initial catalog if the database contains no courses.

Usage:
  - Default / Upsert:  uv run python src/seed.py
  - Full Clean Reset:  uv run python src/seed.py --reset
"""

# ruff: noqa: E402, F401

import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from src.shared.infrastructure.database import Base, async_session_scope, get_engine
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    WeekModuleModel,
    LessonModel,
    LearningItemModel,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    SpecializationModel,
    ItemType,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.forum.infrastructure.models import ForumReplyORM, ForumThreadORM
from src.modules.identity.domain.entities import UserRole
from src.modules.identity.infrastructure.models import EnterpriseLicenseModel, UserModel
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
    WeeklyDeadlineModel,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("seed")


def build_sample_catalog() -> tuple[list[CourseModel], list[SpecializationModel]]:
    """Construct domain seed data objects for the initial catalog."""
    sample_url = (
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
    )
    deeplearning_logo = (
        "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg"
    )
    meta_logo = "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"

    # Course 1: Supervised Machine Learning
    course1 = CourseModel(
        id="course-python-ai",
        title="Supervised Machine Learning: Regression and Classification",
        slug="supervised-machine-learning",
        description="Build machine learning models in Python using NumPy and scikit-learn, train supervised models for prediction and binary classification.",
        partner_name="DeepLearning.AI",
        partner_logo_url=deeplearning_logo,
        instructor_names=["Andrew Ng", "Eddy Shyu"],
    )

    week1 = WeekModuleModel(
        id="week-1-ml",
        course_id=course1.id,
        week_number=1,
        title="Week 1: Introduction to Machine Learning & Regression",
        summary="Learn the core concepts of supervised learning and implement your first linear regression model.",
    )

    lesson1 = LessonModel(
        id="lesson-linear-regression",
        week_module_id=week1.id,
        title="Lesson 1: Linear Regression with One Variable",
        estimated_minutes=37,
    )

    item1 = LearningItemModel(
        id="item-ml-intro-video",
        lesson_id=lesson1.id,
        title="Lecture: Introduction to Linear Regression & Cost Function",
        type=ItemType.VIDEO,
        estimated_minutes=12,
        video_url=sample_url,
        vtt_subtitle_url="",
    )

    t1 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Welcome to Supervised Machine Learning! In this lesson, we will cover linear regression.",
    )
    t2 = InteractiveTranscriptModel(
        timestamp_seconds=5,
        text="Linear regression fits a straight line through dataset points to predict continuous numerical values.",
    )
    t3 = InteractiveTranscriptModel(
        timestamp_seconds=10,
        text="Let's look at the cost function, often represented as Mean Squared Error (MSE).",
    )
    t4 = InteractiveTranscriptModel(
        timestamp_seconds=15,
        text="Gradient descent updates model parameters iteratively until minimum cost is reached.",
    )

    q1 = InVideoQuizModel(
        timestamp_seconds=10,
        question="What cost function is commonly used for Linear Regression?",
        options=[
            "Cross-Entropy Loss",
            "Mean Squared Error (MSE)",
            "Hinge Loss",
            "Kullback-Leibler Divergence",
        ],
        correct_option_index=1,
        explanation="Mean Squared Error (MSE) measures the average squared difference between estimated values and actual values.",
    )

    item1.interactive_transcripts.extend([t1, t2, t3, t4])
    item1.in_video_quizzes.append(q1)

    item2 = LearningItemModel(
        id="item-ml-reading-1",
        lesson_id=lesson1.id,
        title="Reading: Math Foundations of Gradient Descent",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# Math Foundations of Gradient Descent\n\nGradient descent is an optimization algorithm used to minimize cost functions in machine learning models.\n\n## Key Concepts\n- **Learning Rate (alpha)**: Controls the step size at each iteration.\n- **Loss Function**: Measures the prediction error.\n\n> *Tip: Choosing an appropriate learning rate is crucial for convergence.*",
    )

    lesson1.items.extend([item1, item2])
    week1.lessons.append(lesson1)
    course1.week_modules.append(week1)

    # Course 2: Modern Fullstack Web Development
    course2 = CourseModel(
        id="course-web-dev",
        title="Modern Fullstack Web Development with Next.js & ConnectRPC",
        slug="modern-fullstack-web-dev",
        description="Master modern Web Development using Next.js 15 App Router, TypeScript, ConnectRPC gRPC web, and Tailwind CSS v4.",
        partner_name="Meta",
        partner_logo_url=meta_logo,
        instructor_names=["Jane Doe"],
    )

    week_web1 = WeekModuleModel(
        id="week-1-web",
        course_id=course2.id,
        week_number=1,
        title="Week 1: Next.js 15 App Router & Server Components",
        summary="Learn React Server Components, App Router routing, and ConnectRPC stub integration.",
    )

    lesson_web1 = LessonModel(
        id="lesson-nextjs-intro",
        week_module_id=week_web1.id,
        title="Lesson 1: Building Modern Web Apps with Next.js & Tailwind CSS v4",
        estimated_minutes=45,
    )

    item_web1 = LearningItemModel(
        id="item-web-video-1",
        lesson_id=lesson_web1.id,
        title="Lecture: Fullstack Web Architecture & ConnectRPC",
        type=ItemType.VIDEO,
        estimated_minutes=20,
        video_url=sample_url,
        vtt_subtitle_url="",
    )

    t_web1 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Welcome to Fullstack Web Development with Next.js 15 and ConnectRPC!",
    )
    t_web2 = InteractiveTranscriptModel(
        timestamp_seconds=10,
        text="We use Domain-Driven Design (DDD) to keep bounded contexts clean and scalable.",
    )
    item_web1.interactive_transcripts.extend([t_web1, t_web2])

    item_web2 = LearningItemModel(
        id="item-web-reading-1",
        lesson_id=lesson_web1.id,
        title="Reading: ConnectRPC gRPC-web Best Practices",
        type=ItemType.READING,
        estimated_minutes=15,
        reading_markdown="# ConnectRPC Best Practices\n\nConnectRPC provides lightweight, type-safe gRPC web protocol stubs for TypeScript and Python.\n\n## Key Features\n- **Type Safety**: Proto stubs generated automatically.\n- **Fast Serialization**: Binary Protobuf & JSON support.",
    )

    lesson_web1.items.extend([item_web1, item_web2])
    week_web1.lessons.append(lesson_web1)
    course2.week_modules.append(week_web1)

    # Specialization
    spec = SpecializationModel(
        id="spec-ai-eng",
        title="Machine Learning Specialization",
        description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
        partner_name="DeepLearning.AI",
        course_ids=[course1.id, course2.id],
    )

    return [course1, course2], [spec]


async def seed_database(reset: bool = False, auto_mode: bool = False) -> None:
    """Execute database seeding with best-practice options.

    :param reset: If True, truncates all catalog & progress tables before re-seeding.
    :param auto_mode: If True (e.g. dev startup), skips seeding if database already contains courses.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_scope() as session:
        if auto_mode:
            stmt = select(CourseModel).limit(1)
            res = await session.execute(stmt)
            if res.scalar_one_or_none() is not None:
                logger.info(
                    "[SEED] Database already contains courses. Auto-seeding skipped."
                )
                return

        if reset:
            logger.info(
                "[SEED] Truncating catalog and progress tables for full clean reset..."
            )
            await session.execute(
                text(
                    "TRUNCATE courses, week_modules, lessons, learning_items, interactive_transcripts, in_video_quizzes, specializations, learning_progresses, weekly_deadlines, personal_notes RESTART IDENTITY CASCADE"
                )
            )
            await session.commit()

        logger.info("[SEED] Seeding demonstration catalog into PostgreSQL...")
        courses, specializations = build_sample_catalog()

        # Idempotent Upsert using session.merge()
        for course in courses:
            await session.merge(course)
        for spec in specializations:
            await session.merge(spec)

        # Seed Valid Enterprise Licenses
        lic1 = EnterpriseLicenseModel(
            key="ENT-DEMO-2026-X99",
            partner_name="DeepLearning.AI Partner Program",
            total_seats=500,
            used_seats=1,
            is_active=True,
        )
        lic2 = EnterpriseLicenseModel(
            key="ENT-UNI-HCMUT-2026",
            partner_name="Trường Đại học Bách Khoa TP.HCM",
            total_seats=1000,
            used_seats=0,
            is_active=True,
        )
        lic3 = EnterpriseLicenseModel(
            key="ENT-TECH-FPT-2026",
            partner_name="FPT Software Enterprise Academy",
            total_seats=250,
            used_seats=0,
            is_active=True,
        )
        await session.merge(lic1)
        await session.merge(lic2)
        await session.merge(lic3)

        # Seed Demo User
        demo_user = UserModel(
            id="user_learner_demo",
            email="learner@coursera.ai",
            full_name="Nguyễn Văn A",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner@coursera.ai",
            enterprise_seat_key="ENT-DEMO-2026-X99",
            password_hash="73616c743132333435363738:39323537333333333333333333333333",
        )
        await session.merge(demo_user)

        # Seed Demo Verified Certificate
        demo_cert = CertificateModel(
            certificate_id="CERT-DEMO12345",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            learner_name="Nguyễn Văn A",
            course_title="Supervised Machine Learning: Regression and Classification",
            partner_name="DeepLearning.AI",
            partner_logo_url="https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            issue_date="22/07/2026",
            verification_url="/verify/CERT-DEMO12345",
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-DEMO12345",
            open_badges_json_ld='{"@context":"https://w3id.org/openbadges/v2","type":"BadgeClass","name":"Supervised Machine Learning Verified Certificate"}',
        )
        await session.merge(demo_cert)

        # Seed Forum Sample Threads & Replies
        thread1 = ForumThreadORM(
            id="thread-ml-01",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            title="Làm thế nào để chọn Learning Rate (Alpha) tối ưu cho Gradient Descent?",
            author_name="Lê Minh Trí",
            author_role="Student",
            author_user_id="user_learner_demo",
            created_at="2026-07-22T10:15:00Z",
            upvote_count=5,
            is_staff_pinned=True,
        )
        reply1_1 = ForumReplyORM(
            id="reply-ml-01-1",
            thread_id="thread-ml-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="Teaching Assistant",
            author_user_id="user_ta_01",
            content="Chào bạn Trí! Bạn nên thử các giá trị theo quy tắc lũy thừa của 10 như 0.001, 0.01, 0.1 và vẽ đồ thị Cost Function theo từng Iteration. Nếu Cost Function tăng dần nghĩa là Alpha quá lớn!",
            is_staff_answer=True,
            upvote_count=12,
            created_at="2026-07-22T10:30:00Z",
        )
        reply1_2 = ForumReplyORM(
            id="reply-ml-01-2",
            thread_id="thread-ml-01",
            author_name="Trần Thu Hà",
            author_role="Student",
            author_user_id="user_learner_02",
            content="Cảm ơn thầy Nam, em cũng thử vẽ plot J(theta) theo lời khuyên của thầy và thấy học rất nhanh!",
            is_staff_answer=False,
            upvote_count=3,
            created_at="2026-07-22T11:05:00Z",
        )

        thread2 = ForumThreadORM(
            id="thread-web-01",
            course_id="course-web-dev",
            item_id="item-web-video-1",
            title="Thắc mắc về ưu điểm của ConnectRPC so với REST API truyền thống",
            author_name="Phạm Quốc Bảo",
            author_role="Student",
            author_user_id="user_learner_03",
            created_at="2026-07-22T12:00:00Z",
            upvote_count=8,
            is_staff_pinned=False,
        )
        reply2_1 = ForumReplyORM(
            id="reply-web-01-1",
            thread_id="thread-web-01",
            author_name="ThS. Nguyễn Hoàng Nam",
            author_role="Teaching Assistant",
            author_user_id="user_ta_01",
            content="ConnectRPC sinh mã nguồn Type-Safe stubs tự động cho cả Frontend lẫn Backend từ tệp .proto, giúp hạn chế lỗi runtime gõ sai tên trường API và tối ưu tốc độ nhờ Protobuf binary serialization!",
            is_staff_answer=True,
            upvote_count=9,
            created_at="2026-07-22T12:45:00Z",
        )

        await session.merge(thread1)
        await session.merge(reply1_1)
        await session.merge(reply1_2)
        await session.merge(thread2)
        await session.merge(reply2_1)

        await session.commit()
        logger.info("[SEED] Database seeding completed successfully!")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments for CLI execution."""
    parser = argparse.ArgumentParser(
        description="Database Seeding Script for Coursera Clone"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate existing tables before seeding for a 100%% clean reset.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_database(reset=args.reset, auto_mode=False))
