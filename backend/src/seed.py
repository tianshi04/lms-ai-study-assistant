"""Database Seeding Script for Development & Demo Environment.

Best-Practice DDD Infrastructure Seeding Script:
- Default Execution (Upsert Mode): Uses session.merge() to safely insert missing seed records or update existing ones without destructive data wipes.
- Reset Execution (--reset Flag): Dynamically truncates all database tables when explicitly requested for a pristine environment reset.
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
from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuizCooldownModel,
    QuizSubmissionModel,
)
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    CourseReviewModel,
    InVideoQuizModel,
    InteractiveTranscriptModel,
    ItemType,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.forum.infrastructure.models import (
    ForumReplyORM,
    ForumThreadORM,
    ForumVoteORM,
)
from src.modules.identity.application.identity_usecase import hash_password
from src.modules.identity.domain.entities import UserRole
from src.modules.identity.infrastructure.models import EnterpriseLicenseModel, UserModel
from src.modules.learning.domain.entities import DeadlineStatus
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
    """Construct rich domain seed data objects for the initial catalog."""
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

    # Week 1
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

    item3 = LearningItemModel(
        id="item-ml-quiz-1",
        lesson_id=lesson1.id,
        title="Graded Quiz: Supervised Learning & Regression Basics",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=20,
    )

    item4 = LearningItemModel(
        id="item-ml-lab-1",
        lesson_id=lesson1.id,
        title="Auto-Graded Lab: Implementing Array Sum Solution in Python",
        type=ItemType.AUTO_GRADED_LAB,
        estimated_minutes=30,
    )

    item5 = LearningItemModel(
        id="item-ml-peer-1",
        lesson_id=lesson1.id,
        title="Peer-Graded Assignment: Supervised Machine Learning Model Design",
        type=ItemType.PEER_REVIEW,
        estimated_minutes=45,
    )

    lesson1.items.extend([item1, item2, item3, item4, item5])
    week1.lessons.append(lesson1)

    # Week 2
    week2 = WeekModuleModel(
        id="week-2-ml",
        course_id=course1.id,
        week_number=2,
        title="Week 2: Classification & Logistic Regression",
        summary="Master binary classification algorithms, Sigmoid decision boundaries, and regularized cost functions.",
    )
    lesson2 = LessonModel(
        id="lesson-logistic-regression",
        week_module_id=week2.id,
        title="Lesson 2: Logistic Regression & Overfitting Prevention",
        estimated_minutes=40,
    )
    item6 = LearningItemModel(
        id="item-ml-video-2",
        lesson_id=lesson2.id,
        title="Lecture: Sigmoid Function & Decision Boundaries",
        type=ItemType.VIDEO,
        estimated_minutes=18,
        video_url=sample_url,
    )
    t5 = InteractiveTranscriptModel(
        timestamp_seconds=0,
        text="Classification maps input features to discrete category labels using the Sigmoid function.",
    )
    t6 = InteractiveTranscriptModel(
        timestamp_seconds=8,
        text="The Sigmoid activation outputs probability values strictly bounded between 0 and 1.",
    )
    item6.interactive_transcripts.extend([t5, t6])

    item7 = LearningItemModel(
        id="item-ml-quiz-2",
        lesson_id=lesson2.id,
        title="Graded Quiz: Classification & Logistic Regression",
        type=ItemType.GRADED_QUIZ,
        estimated_minutes=22,
    )
    lesson2.items.extend([item6, item7])
    week2.lessons.append(lesson2)
    course1.week_modules.extend([week1, week2])

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
        title="Lesson 1: Building Modern Web Apps with Next.js & ConnectRPC",
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

    week_web2 = WeekModuleModel(
        id="week-2-web",
        course_id=course2.id,
        week_number=2,
        title="Week 2: Styling & Component Libraries with Tailwind CSS v4",
        summary="Design stunning UI components with CSS Grid, Glassmorphism, dynamic animations, and Tailwind v4.",
    )
    lesson_web2 = LessonModel(
        id="lesson-tailwind-ui",
        week_module_id=week_web2.id,
        title="Lesson 2: Modern CSS Architecture & Responsive Design",
        estimated_minutes=35,
    )
    item_web3 = LearningItemModel(
        id="item-web-lab-2",
        lesson_id=lesson_web2.id,
        title="Auto-Graded Lab: Building Responsive Card Components",
        type=ItemType.AUTO_GRADED_LAB,
        estimated_minutes=30,
    )
    lesson_web2.items.append(item_web3)
    week_web2.lessons.append(lesson_web2)
    course2.week_modules.extend([week_web1, week_web2])

    # Course 3: Neural Networks & Deep Learning
    course3 = CourseModel(
        id="course-deep-learning",
        title="Neural Networks and Deep Learning",
        slug="neural-networks-deep-learning",
        description="Master deep learning fundamentals, build deep neural networks using Python and Vectorization, and understand forward and backward propagation.",
        partner_name="DeepLearning.AI",
        partner_logo_url=deeplearning_logo,
        instructor_names=["Andrew Ng", "Kian Katanforoosh"],
    )
    week_dl1 = WeekModuleModel(
        id="week-1-dl",
        course_id=course3.id,
        week_number=1,
        title="Week 1: Introduction to Deep Learning",
        summary="Understand how neural networks learn complex pattern representations from large-scale data.",
    )
    lesson_dl1 = LessonModel(
        id="lesson-dl-intro",
        week_module_id=week_dl1.id,
        title="Lesson 1: Introduction to Neural Networks",
        estimated_minutes=30,
    )
    item_dl1 = LearningItemModel(
        id="item-dl-video-1",
        lesson_id=lesson_dl1.id,
        title="Lecture: What is a Neural Network?",
        type=ItemType.VIDEO,
        estimated_minutes=15,
        video_url=sample_url,
    )
    lesson_dl1.items.append(item_dl1)
    week_dl1.lessons.append(lesson_dl1)
    course3.week_modules.append(week_dl1)

    # Specializations
    spec1 = SpecializationModel(
        id="spec-ai-eng",
        title="Machine Learning Specialization",
        description="Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program.",
        partner_name="DeepLearning.AI",
        course_ids=[course1.id, course3.id],
    )

    spec2 = SpecializationModel(
        id="spec-fullstack-web",
        title="Fullstack Web Engineering Specialization",
        description="Build high-performance web applications with Next.js 15, ConnectRPC, and microservice architectures.",
        partner_name="Meta",
        course_ids=[course2.id],
    )

    return [course1, course2, course3], [spec1, spec2]


async def seed_database(reset: bool = False, auto_mode: bool = False) -> None:
    """Execute database seeding with best-practice options.

    :param reset: If True, truncates all database tables before re-seeding.
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
            logger.info("[SEED] Truncating ALL database tables for full clean reset...")
            tables = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
            if tables:
                await session.execute(
                    text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE")
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
            used_seats=1,
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

        # Seed Demo Users for ALL 5 Roles (Password for all accounts: 123456)
        default_pw_hash = hash_password("123456")

        learner_user1 = UserModel(
            id="user_learner_demo",
            email="learner@coursera.ai",
            full_name="Nguyễn Văn A (Learner)",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner@coursera.ai",
            enterprise_seat_key="ENT-DEMO-2026-X99",
            password_hash=default_pw_hash,
        )

        learner_user2 = UserModel(
            id="user_learner_02",
            email="learner2@coursera.ai",
            full_name="Trần Thu Hà (Learner)",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner2@coursera.ai",
            enterprise_seat_key="ENT-UNI-HCMUT-2026",
            password_hash=default_pw_hash,
        )

        learner_user3 = UserModel(
            id="user_learner_03",
            email="learner3@coursera.ai",
            full_name="Phạm Quốc Bảo (Learner)",
            role=UserRole.LEARNER,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=learner3@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        instructor_user = UserModel(
            id="user_instructor_01",
            email="instructor@coursera.ai",
            full_name="Prof. Andrew Ng (Instructor)",
            role=UserRole.INSTRUCTOR,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=instructor@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        ta_user = UserModel(
            id="user_ta_01",
            email="ta@coursera.ai",
            full_name="ThS. Nguyễn Hoàng Nam (TA)",
            role=UserRole.TA,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=ta@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        admin_user = UserModel(
            id="user_admin_01",
            email="admin@coursera.ai",
            full_name="Platform Admin (Super Admin)",
            role=UserRole.SUPER_ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        partner_user = UserModel(
            id="user_partner_01",
            email="partner@coursera.ai",
            full_name="Stanford Partner Admin",
            role=UserRole.PARTNER_ADMIN,
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=partner@coursera.ai",
            enterprise_seat_key="",
            password_hash=default_pw_hash,
        )

        await session.merge(learner_user1)
        await session.merge(learner_user2)
        await session.merge(learner_user3)
        await session.merge(instructor_user)
        await session.merge(ta_user)
        await session.merge(admin_user)
        await session.merge(partner_user)

        # Seed Learning Progress & Deadlines
        prog1 = LearningProgressModel(
            id="user_learner_demo:course-python-ai",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
        )
        await session.merge(prog1)

        deadline1 = WeeklyDeadlineModel(
            progress_id="user_learner_demo:course-python-ai",
            week_number=1,
            due_date="2026-07-20T23:59:59Z",
            status=DeadlineStatus.COMPLETED,
        )
        deadline2 = WeeklyDeadlineModel(
            progress_id="user_learner_demo:course-python-ai",
            week_number=2,
            due_date="2026-07-27T23:59:59Z",
            status=DeadlineStatus.ON_TRACK,
        )
        await session.merge(deadline1)
        await session.merge(deadline2)

        # Seed Personal Notes
        note1 = PersonalNoteModel(
            id="note-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            highlighted_text="Mean Squared Error (MSE)",
            note_comment="Formula: J(w,b) = (1/2m) * sum((h(x) - y)^2). Standard loss function for regression.",
            created_at="2026-07-22T09:15:00Z",
        )
        note2 = PersonalNoteModel(
            id="note-demo-02",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-reading-1",
            highlighted_text="Learning Rate (alpha)",
            note_comment="If alpha is too large, gradient descent may fail to converge or even diverge.",
            created_at="2026-07-22T09:40:00Z",
        )
        await session.merge(note1)
        await session.merge(note2)

        # Seed Assessment Submissions & Appeals
        honor1 = HonorCodeModel(
            id="user_learner_demo:item-ml-quiz-1",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            is_agreed=True,
            agreed_at="2026-07-22T09:00:00Z",
        )
        await session.merge(honor1)

        qsub1 = QuizSubmissionModel(
            id="quiz_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            selected_option_indexes=[1, 0, 2],
            score_percent=100.0,
            passed=True,
            attempt_number=1,
            created_at="2026-07-22T09:30:00Z",
        )
        await session.merge(qsub1)

        lsub1 = LabSubmissionModel(
            id="lab_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-lab-1",
            source_code="def array_sum(arr):\n    return sum(arr)",
            language="python",
            score_percent=100.0,
            passed=True,
            total_test_cases=3,
            passed_test_cases=3,
            test_logs="[PASS] Test 1: Array sum positive integers\n[PASS] Test 2: Empty array\n[PASS] Test 3: Array sum with negative values",
            created_at="2026-07-22T10:00:00Z",
        )
        await session.merge(lsub1)

        psub1 = PeerAssignmentSubmissionModel(
            id="peer_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/learner-demo/housing-price-regression",
            text_content="Supervised ML model architecture design for housing price prediction.",
            created_at="2026-07-22T10:30:00Z",
        )
        await session.merge(psub1)

        preview1 = PeerReviewModel(
            id="peer_rev_01",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_learner_02",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "problem_formulation": 5,
                "feature_selection": 5,
                "model_evaluation": 4,
            },
            total_score=93.3,
            is_outlier=False,
            created_at="2026-07-22T11:00:00Z",
        )
        preview2 = PeerReviewModel(
            id="peer_rev_02",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_ta_01",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "problem_formulation": 5,
                "feature_selection": 5,
                "model_evaluation": 5,
            },
            total_score=100.0,
            is_outlier=False,
            created_at="2026-07-22T11:20:00Z",
        )
        await session.merge(preview1)
        await session.merge(preview2)

        appeal1 = GradeAppealModel(
            id="appeal_demo_01",
            user_id="user_learner_03",
            submission_id="peer_sub_demo_02",
            appeal_reason="The reviewer marked point deduction for missing documentation, but inline comments were included in code blocks.",
            status="PENDING",
            created_at="2026-07-22T14:00:00Z",
        )
        await session.merge(appeal1)

        # Seed Verified Certificates
        demo_cert1 = CertificateModel(
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
        demo_cert2 = CertificateModel(
            certificate_id="CERT-DEMO67890",
            user_id="user_learner_02",
            course_id="course-web-dev",
            learner_name="Trần Thu Hà",
            course_title="Modern Fullstack Web Development with Next.js & ConnectRPC",
            partner_name="Meta",
            partner_logo_url="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
            issue_date="23/07/2026",
            verification_url="/verify/CERT-DEMO67890",
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-DEMO67890",
            open_badges_json_ld='{"@context":"https://w3id.org/openbadges/v2","type":"BadgeClass","name":"Fullstack Web Development Verified Certificate"}',
        )
        await session.merge(demo_cert1)
        await session.merge(demo_cert2)

        # Seed Financial Aid Applications
        faid1 = FinancialAidModel(
            id="faid_seed_01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            essay_150_words=(
                "Kính gửi Ban Giảng viên và Quản trị viên khóa học, Em hiện là sinh viên chuyên ngành Công nghệ thông tin đang rất khao khát tiếp cận tri thức chuyên sâu về Lập trình Python và AI Agent. Tuy nhiên do hoàn cảnh gia đình thuộc diện khó khăn và chưa có thu nhập độc lập, em chưa có khả năng chi trả học phí đầy đủ cho chứng chỉ khóa học. Em cam kết sẽ học tập nghiêm túc 100% thời lượng, hoàn thành đầy đủ các bài tập thực hành, bài thi Graded Quiz và bài nộp chấm chéo Peer Review đúng hạn. Kiến thức từ khóa học này sẽ là nền tảng quan trọng giúp em chuẩn bị cho đồ án tốt nghiệp và ứng tuyển vị trí thực tập sinh AI Engineer trong tương lai. Em rất mong nhận được sự hỗ trợ tài chính từ nhà trường để tiếp tục con đường học vấn của mình. Em chân thành cảm ơn!"
            ),
            status="PENDING",
            review_deadline_days_left=14,
        )
        faid2 = FinancialAidModel(
            id="faid_seed_02",
            user_id="user_learner_02",
            course_id="course-web-dev",
            essay_150_words=(
                "Kính gửi Ban Xét duyệt Hỗ trợ Tài chính, Tôi hiện là học viên tự học mong muốn chuyển hướng nghề nghiệp sang lĩnh vực Lập trình Web Fullstack với Next.js và ConnectRPC. Hiện tại mức thu nhập nhập môn còn hạn chế nên việc nâng cấp tài khoản có chứng chỉ xác minh là một thử thách tài chính lớn đối với tôi."
            ),
            status="APPROVED",
            review_deadline_days_left=0,
        )
        faid3 = FinancialAidModel(
            id="faid_seed_03",
            user_id="user_learner_03",
            course_id="course-deep-learning",
            essay_150_words=(
                "Em muốn xin học bổng để học khóa Deep Learning nhằm phát triển các dự án cá nhân."
            ),
            status="REJECTED",
            review_deadline_days_left=0,
        )
        await session.merge(faid1)
        await session.merge(faid2)
        await session.merge(faid3)

        # Seed Forum Sample Threads, Replies & Votes
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

        thread3 = ForumThreadORM(
            id="thread-dl-01",
            course_id="course-deep-learning",
            item_id="item-dl-video-1",
            title="[Thông báo] Tài liệu hướng dẫn cài đặt PyTorch và CUDA 12 cho bài thực hành Neural Networks",
            author_name="Prof. Andrew Ng",
            author_role="Instructor",
            author_user_id="user_instructor_01",
            created_at="2026-07-23T08:00:00Z",
            upvote_count=24,
            is_staff_pinned=True,
        )

        await session.merge(thread1)
        await session.merge(reply1_1)
        await session.merge(reply1_2)
        await session.merge(thread2)
        await session.merge(reply2_1)
        await session.merge(thread3)

        vote1 = ForumVoteORM(
            id="vote-01",
            user_id="user_learner_demo",
            post_id="thread-ml-01",
            created_at="2026-07-22T10:16:00Z",
        )
        vote2 = ForumVoteORM(
            id="vote-02",
            user_id="user_learner_demo",
            post_id="reply-ml-01-1",
            created_at="2026-07-22T10:31:00Z",
        )
        vote3 = ForumVoteORM(
            id="vote-03",
            user_id="user_learner_02",
            post_id="thread-web-01",
            created_at="2026-07-22T12:05:00Z",
        )
        await session.merge(vote1)
        await session.merge(vote2)
        await session.merge(vote3)

        rev1 = CourseReviewModel(
            id="rev-demo-01",
            user_id="user_learner_demo",
            user_name="Nguyễn Văn A",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Khóa học cực kỳ chất lượng! Thầy Andrew Ng giảng rất dễ hiểu và chi tiết.",
            created_at="2026-07-22T14:30:00Z",
        )
        rev2 = CourseReviewModel(
            id="rev-demo-02",
            user_id="user_learner_02",
            user_name="Trần Thị B",
            course_id="course-python-ai",
            rating_stars=5,
            comment_text="Bài tập lập trình trên Jupyter notebook chuẩn thực tế, giao diện dễ dùng.",
            created_at="2026-07-23T09:15:00Z",
        )
        rev3 = CourseReviewModel(
            id="rev-demo-03",
            user_id="user_learner_03",
            user_name="Lê Hoàng C",
            course_id="course-deep-learning",
            rating_stars=4,
            comment_text="Nội dung chuyên sâu về Deep Learning và PyTorch. Rất đáng học!",
            created_at="2026-07-23T11:45:00Z",
        )
        await session.merge(rev1)
        await session.merge(rev2)
        await session.merge(rev3)

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
