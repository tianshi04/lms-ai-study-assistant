"""Seed data for Learning Progress, Deadlines, Notes, and Assessments (Quizzes, Question Banks, Labs, Peer Reviews)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizMatrixModel,
    QuizSubmissionModel,
)
from src.modules.learning.domain import DeadlineStatus
from src.modules.learning.infrastructure.models import (
    DailyLearningRecordModel,
    LearningItemProgressModel,
    LearningProgressModel,
    PersonalNoteModel,
    UserLearningStreakModel,
    WeeklyDeadlineModel,
)


async def _seed_question_with_options(
    session: AsyncSession,
    question: QuestionModel,
    options: list[tuple[str, str, bool]],
) -> None:
    """Helper to upsert a QuestionModel and its ordered QuestionOptionModels."""
    await session.merge(question)
    for idx, (opt_id, opt_text, is_correct) in enumerate(options):
        await session.merge(
            QuestionOptionModel(
                id=opt_id,
                question_id=question.id,
                option_text=opt_text,
                is_correct=is_correct,
                order_index=idx,
            )
        )


async def seed_learning_and_assessments(session: AsyncSession) -> None:
    """Seed learning progress, deadlines, personal notes, submissions, question banks, and quiz matrices."""
    now = datetime.now(UTC)
    d4_ago = (now - timedelta(days=4)).isoformat()
    d3_ago = (now - timedelta(days=3)).isoformat()
    d2_ago = (now - timedelta(days=2)).isoformat()
    d1_ago = (now - timedelta(days=1)).isoformat()
    h6_ago = (now - timedelta(hours=6)).isoformat()
    m5_ago = (now - timedelta(minutes=5)).isoformat()

    enrolled_date = (now - timedelta(days=14)).isoformat()
    d1_ago_comp = (now - timedelta(days=1)).isoformat()

    progresses = [
        # Student Demo (Nguyễn Văn A)
        LearningProgressModel(
            id="user_learner_demo:course-python-ai",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            overall_progress_percent=100.0,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
                "item-ml-video-2",
                "item-ml-quiz-2",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=h6_ago,
            last_accessed_item_id="item-ml-quiz-2",
            completed_at=d1_ago_comp,
        ),
        LearningProgressModel(
            id="user_learner_demo:course-web-dev",
            user_id="user_learner_demo",
            course_id="course-web-dev",
            overall_progress_percent=100.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-quiz-1",
                "item-web-lab-2",
                "item-web-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=h6_ago,
            last_accessed_item_id="item-web-peer-1",
            completed_at=d1_ago_comp,
        ),
        LearningProgressModel(
            id="user_learner_demo:course-deep-learning",
            user_id="user_learner_demo",
            course_id="course-deep-learning",
            overall_progress_percent=33.3,
            completed_item_ids=["item-dl-video-1"],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-dl-video-1",
        ),
        LearningProgressModel(
            id="user_learner_demo:course-microeconomics-foundations",
            user_id="user_learner_demo",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=100.0,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-r3",
                "item-micro-q2",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=h6_ago,
            last_accessed_item_id="item-micro-peer-1",
            completed_at=d1_ago_comp,
        ),
        LearningProgressModel(
            id="user_learner_demo:course-applied-econometrics",
            user_id="user_learner_demo",
            course_id="course-applied-econometrics",
            overall_progress_percent=50.0,
            completed_item_ids=[
                "item-econ-v1",
                "item-econ-r1",
                "item-econ-v2",
                "item-econ-r2",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d4_ago,
            last_accessed_item_id="item-econ-r2",
        ),
        LearningProgressModel(
            id="user_learner_demo:course-behavioral-pricing-strategy",
            user_id="user_learner_demo",
            course_id="course-behavioral-pricing-strategy",
            overall_progress_percent=0.0,
            completed_item_ids=[],
            enrolled_at=enrolled_date,
        ),
        # Student 02 (Trần Thu Hà)
        LearningProgressModel(
            id="user_learner_02:course-python-ai",
            user_id="user_learner_02",
            course_id="course-python-ai",
            overall_progress_percent=85.7,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
                "item-ml-video-2",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=h6_ago,
            last_accessed_item_id="item-ml-video-2",
        ),
        LearningProgressModel(
            id="user_learner_02:course-web-dev",
            user_id="user_learner_02",
            course_id="course-web-dev",
            overall_progress_percent=100.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-quiz-1",
                "item-web-lab-2",
                "item-web-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-web-peer-1",
            completed_at=d1_ago_comp,
        ),
        # Student 03 (Phạm Quốc Bảo)
        LearningProgressModel(
            id="user_learner_03:course-python-ai",
            user_id="user_learner_03",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-ml-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_03:course-web-dev",
            user_id="user_learner_03",
            course_id="course-web-dev",
            overall_progress_percent=80.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-quiz-1",
                "item-web-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-web-peer-1",
        ),
        # Student 04 (Lê Thị Mai Linh)
        LearningProgressModel(
            id="user_learner_04:course-python-ai",
            user_id="user_learner_04",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-ml-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_04:course-web-dev",
            user_id="user_learner_04",
            course_id="course-web-dev",
            overall_progress_percent=60.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-lab-2",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-web-lab-2",
        ),
        # Student 05 (Hoàng Minh Đức)
        LearningProgressModel(
            id="user_learner_05:course-python-ai",
            user_id="user_learner_05",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-ml-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_05:course-web-dev",
            user_id="user_learner_05",
            course_id="course-web-dev",
            overall_progress_percent=40.0,
            completed_item_ids=["item-web-video-1", "item-web-reading-1"],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-web-reading-1",
        ),
        # Student 06 (Vũ Hải Đăng - OVERDUE GRADING ON ML)
        LearningProgressModel(
            id="user_learner_06:course-python-ai",
            user_id="user_learner_06",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-ml-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_06:course-web-dev",
            user_id="user_learner_06",
            course_id="course-web-dev",
            overall_progress_percent=40.0,
            completed_item_ids=["item-web-video-1", "item-web-reading-1"],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-web-reading-1",
        ),
        # Student 07 (Đỗ Thùy Trang - OVERDUE GRADING ON WEB)
        LearningProgressModel(
            id="user_learner_07:course-python-ai",
            user_id="user_learner_07",
            course_id="course-python-ai",
            overall_progress_percent=71.4,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
                "item-ml-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-ml-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_07:course-web-dev",
            user_id="user_learner_07",
            course_id="course-web-dev",
            overall_progress_percent=80.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-quiz-1",
                "item-web-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-web-peer-1",
        ),
        # Student 08 (Bùi Thanh Tùng - APPEAL ON WEB)
        LearningProgressModel(
            id="user_learner_08:course-python-ai",
            user_id="user_learner_08",
            course_id="course-python-ai",
            overall_progress_percent=57.1,
            completed_item_ids=[
                "item-ml-intro-video",
                "item-ml-reading-1",
                "item-ml-quiz-1",
                "item-ml-lab-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-ml-lab-1",
        ),
        LearningProgressModel(
            id="user_learner_08:course-web-dev",
            user_id="user_learner_08",
            course_id="course-web-dev",
            overall_progress_percent=80.0,
            completed_item_ids=[
                "item-web-video-1",
                "item-web-reading-1",
                "item-web-quiz-1",
                "item-web-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-web-peer-1",
        ),
        # Microeconomics Foundations - Other Students
        LearningProgressModel(
            id="user_learner_02:course-microeconomics-foundations",
            user_id="user_learner_02",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=100.0,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-r3",
                "item-micro-q2",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=h6_ago,
            last_accessed_item_id="item-micro-peer-1",
            completed_at=d1_ago_comp,
        ),
        LearningProgressModel(
            id="user_learner_03:course-microeconomics-foundations",
            user_id="user_learner_03",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=88.9,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-r3",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-micro-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_04:course-microeconomics-foundations",
            user_id="user_learner_04",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=88.9,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-r3",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d1_ago,
            last_accessed_item_id="item-micro-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_05:course-microeconomics-foundations",
            user_id="user_learner_05",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=77.8,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-micro-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_06:course-microeconomics-foundations",
            user_id="user_learner_06",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=77.8,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d3_ago,
            last_accessed_item_id="item-micro-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_07:course-microeconomics-foundations",
            user_id="user_learner_07",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=77.8,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
                "item-micro-v3",
                "item-micro-peer-1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-micro-peer-1",
        ),
        LearningProgressModel(
            id="user_learner_08:course-microeconomics-foundations",
            user_id="user_learner_08",
            course_id="course-microeconomics-foundations",
            overall_progress_percent=55.6,
            completed_item_ids=[
                "item-micro-v1",
                "item-micro-r1",
                "item-micro-v2",
                "item-micro-r2",
                "item-micro-q1",
            ],
            enrolled_at=enrolled_date,
            last_accessed_at=d2_ago,
            last_accessed_item_id="item-micro-q1",
        ),
    ]
    for prog in progresses:
        await session.merge(prog)

    # -------------------------------------------------------------------------
    # Learning Streaks, Daily Records & Item Progresses (Dashboard Analytics)
    # -------------------------------------------------------------------------
    today_date = now.date()
    learners_streak_info = [
        ("user_learner_demo", 5, 12, 28800),
        ("user_learner_02", 7, 15, 36000),
        ("user_learner_03", 4, 6, 18000),
        ("user_learner_04", 3, 8, 14400),
        ("user_learner_05", 6, 9, 21600),
        ("user_learner_06", 2, 5, 10800),
        ("user_learner_07", 4, 7, 16200),
        ("user_learner_08", 3, 4, 12600),
    ]

    for uid, c_streak, l_streak, tot_secs in learners_streak_info:
        await session.merge(
            UserLearningStreakModel(
                user_id=uid,
                current_streak=c_streak,
                longest_streak=l_streak,
                last_active_date=today_date,
                total_study_seconds=tot_secs,
                updated_at=now.isoformat(),
            )
        )
        for day_offset in range(7):
            d = today_date - timedelta(days=6 - day_offset)
            secs = (
                1800
                + ((day_offset + int(uid[-1] if uid[-1].isdigit() else 0)) * 300) % 2400
            )
            await session.merge(
                DailyLearningRecordModel(
                    user_id=uid,
                    study_date=d,
                    total_seconds=secs,
                    is_streak_qualified=True,
                )
            )

    # Item-level study records
    item_time_map = {
        "item-ml-intro-video": (900, "course-python-ai"),
        "item-ml-reading-1": (600, "course-python-ai"),
        "item-ml-quiz-1": (1200, "course-python-ai"),
        "item-ml-lab-1": (2400, "course-python-ai"),
        "item-ml-peer-1": (3600, "course-python-ai"),
        "item-ml-video-2": (1000, "course-python-ai"),
        "item-ml-quiz-2": (1500, "course-python-ai"),
        "item-web-video-1": (950, "course-web-dev"),
        "item-web-reading-1": (650, "course-web-dev"),
        "item-web-quiz-1": (1200, "course-web-dev"),
        "item-web-lab-2": (2700, "course-web-dev"),
        "item-web-peer-1": (3900, "course-web-dev"),
        "item-micro-v1": (900, "course-microeconomics-foundations"),
        "item-micro-r1": (1200, "course-microeconomics-foundations"),
        "item-micro-v2": (900, "course-microeconomics-foundations"),
        "item-micro-r2": (1000, "course-microeconomics-foundations"),
        "item-micro-q1": (1500, "course-microeconomics-foundations"),
        "item-micro-v3": (900, "course-microeconomics-foundations"),
        "item-micro-r3": (1400, "course-microeconomics-foundations"),
        "item-micro-q2": (1800, "course-microeconomics-foundations"),
        "item-micro-peer-1": (2700, "course-microeconomics-foundations"),
    }
    for p in progresses:
        for i_id in p.completed_item_ids:
            if i_id in item_time_map:
                secs, c_id = item_time_map[i_id]
                await session.merge(
                    LearningItemProgressModel(
                        user_id=p.user_id,
                        item_id=i_id,
                        course_id=c_id,
                        time_spent_seconds=secs,
                        last_studied_at=p.last_accessed_at or h6_ago,
                    )
                )

        deadlines = [
            WeeklyDeadlineModel(
                id=1,
                progress_id="user_learner_demo:course-python-ai",
                week_number=1,
                due_date=d4_ago,
                status=DeadlineStatus.COMPLETED,
            ),
            WeeklyDeadlineModel(
                id=2,
                progress_id="user_learner_demo:course-python-ai",
                week_number=2,
                due_date=(now + timedelta(days=7)).isoformat(),
                status=DeadlineStatus.ON_TRACK,
            ),
            WeeklyDeadlineModel(
                id=3,
                progress_id="user_learner_06:course-python-ai",
                week_number=1,
                due_date=d2_ago,
                status=DeadlineStatus.OVERDUE,
            ),
            WeeklyDeadlineModel(
                id=4,
                progress_id="user_learner_07:course-web-dev",
                week_number=2,
                due_date=d3_ago,
                status=DeadlineStatus.OVERDUE,
            ),
            WeeklyDeadlineModel(
                id=5,
                progress_id="user_learner_demo:course-microeconomics-foundations",
                week_number=1,
                due_date=d4_ago,
                status=DeadlineStatus.COMPLETED,
            ),
            WeeklyDeadlineModel(
                id=6,
                progress_id="user_learner_demo:course-microeconomics-foundations",
                week_number=2,
                due_date=d2_ago,
                status=DeadlineStatus.COMPLETED,
            ),
            WeeklyDeadlineModel(
                id=7,
                progress_id="user_learner_06:course-microeconomics-foundations",
                week_number=2,
                due_date=d3_ago,
                status=DeadlineStatus.OVERDUE,
            ),
        ]
    for dl in deadlines:
        await session.merge(dl)

    notes = [
        PersonalNoteModel(
            id="note-demo-01",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-intro-video",
            highlighted_text="Mean Squared Error (MSE)",
            note_comment="Formula: J(w,b) = (1/2m) * sum((h(x) - y)^2). Standard loss function for regression.",
            created_at=d4_ago,
        ),
        PersonalNoteModel(
            id="note-demo-02",
            user_id="user_learner_demo",
            course_id="course-python-ai",
            item_id="item-ml-reading-1",
            highlighted_text="Learning Rate (alpha)",
            note_comment="If alpha is too large, gradient descent may fail to converge or even diverge.",
            created_at=d3_ago,
        ),
    ]
    for note in notes:
        await session.merge(note)

    # Honor Code Agreements
    honor_codes = [
        HonorCodeModel(
            id="user_learner_demo:item-ml-quiz-1",
            user_id="user_learner_demo",
            item_id="item-ml-quiz-1",
            is_agreed=True,
            agreed_at=d4_ago,
        ),
        HonorCodeModel(
            id="user_learner_demo:item-ml-peer-1",
            user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            is_agreed=True,
            agreed_at=d4_ago,
        ),
        HonorCodeModel(
            id="user_learner_02:item-ml-peer-1",
            user_id="user_learner_02",
            item_id="item-ml-peer-1",
            is_agreed=True,
            agreed_at=d4_ago,
        ),
        HonorCodeModel(
            id="user_learner_03:item-ml-peer-1",
            user_id="user_learner_03",
            item_id="item-ml-peer-1",
            is_agreed=True,
            agreed_at=d4_ago,
        ),
        HonorCodeModel(
            id="user_learner_06:item-ml-peer-1",
            user_id="user_learner_06",
            item_id="item-ml-peer-1",
            is_agreed=True,
            agreed_at=d4_ago,
        ),
        HonorCodeModel(
            id="user_learner_07:item-web-peer-1",
            user_id="user_learner_07",
            item_id="item-web-peer-1",
            is_agreed=True,
            agreed_at=d3_ago,
        ),
    ]
    for hc in honor_codes:
        await session.merge(hc)

    # Quizzes and Labs (Seeded for Gradebook and Syllabus completeness)
    quiz_specs = [
        # ML Quiz 1
        (
            "quiz_sub_demo_01",
            "user_learner_demo",
            "item-ml-quiz-1",
            100.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_02_ml_1",
            "user_learner_02",
            "item-ml-quiz-1",
            95.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_03_ml_1",
            "user_learner_03",
            "item-ml-quiz-1",
            85.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_04_ml_1",
            "user_learner_04",
            "item-ml-quiz-1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_05_ml_1",
            "user_learner_05",
            "item-ml-quiz-1",
            80.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_06_ml_1",
            "user_learner_06",
            "item-ml-quiz-1",
            85.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_07_ml_1",
            "user_learner_07",
            "item-ml-quiz-1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_08_ml_1",
            "user_learner_08",
            "item-ml-quiz-1",
            85.0,
            True,
            1,
            d2_ago,
        ),
        # ML Quiz 2
        (
            "quiz_sub_demo_ml_2",
            "user_learner_demo",
            "item-ml-quiz-2",
            100.0,
            True,
            1,
            d2_ago,
        ),
        (
            "quiz_sub_02_ml_2",
            "user_learner_02",
            "item-ml-quiz-2",
            90.0,
            True,
            1,
            d2_ago,
        ),
        # Web Quiz 1
        (
            "quiz_sub_demo_web_1",
            "user_learner_demo",
            "item-web-quiz-1",
            100.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_02_web_1",
            "user_learner_02",
            "item-web-quiz-1",
            95.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_03_web_1",
            "user_learner_03",
            "item-web-quiz-1",
            85.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_07_web_1",
            "user_learner_07",
            "item-web-quiz-1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_08_web_1",
            "user_learner_08",
            "item-web-quiz-1",
            85.0,
            True,
            1,
            d2_ago,
        ),
        # Microeconomics Quiz 1
        (
            "quiz_sub_demo_micro_1",
            "user_learner_demo",
            "item-micro-q1",
            100.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_02_micro_1",
            "user_learner_02",
            "item-micro-q1",
            95.0,
            True,
            1,
            d4_ago,
        ),
        (
            "quiz_sub_03_micro_1",
            "user_learner_03",
            "item-micro-q1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_04_micro_1",
            "user_learner_04",
            "item-micro-q1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_05_micro_1",
            "user_learner_05",
            "item-micro-q1",
            85.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_06_micro_1",
            "user_learner_06",
            "item-micro-q1",
            85.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_07_micro_1",
            "user_learner_07",
            "item-micro-q1",
            90.0,
            True,
            1,
            d3_ago,
        ),
        (
            "quiz_sub_08_micro_1",
            "user_learner_08",
            "item-micro-q1",
            80.0,
            True,
            1,
            d2_ago,
        ),
        # Microeconomics Final Quiz 2
        (
            "quiz_sub_demo_micro_2",
            "user_learner_demo",
            "item-micro-q2",
            100.0,
            True,
            1,
            d2_ago,
        ),
        (
            "quiz_sub_02_micro_2",
            "user_learner_02",
            "item-micro-q2",
            95.0,
            True,
            1,
            d2_ago,
        ),
        (
            "quiz_sub_03_micro_2",
            "user_learner_03",
            "item-micro-q2",
            90.0,
            True,
            1,
            d2_ago,
        ),
        (
            "quiz_sub_04_micro_2",
            "user_learner_04",
            "item-micro-q2",
            90.0,
            True,
            1,
            d2_ago,
        ),
    ]
    for q_id, q_uid, q_item, q_score, q_passed, q_att, q_created in quiz_specs:
        await session.merge(
            QuizSubmissionModel(
                id=q_id,
                user_id=q_uid,
                item_id=q_item,
                selected_option_indexes=[0, 1, 0],
                score_percent=q_score,
                passed=q_passed,
                attempt_number=q_att,
                created_at=q_created,
            )
        )

    # Lab submissions
    lab_specs = [
        # ML Lab 1
        ("lab_sub_demo_01", "user_learner_demo", "item-ml-lab-1", 100.0, True, d4_ago),
        ("lab_sub_02_ml_1", "user_learner_02", "item-ml-lab-1", 100.0, True, d4_ago),
        ("lab_sub_03_ml_1", "user_learner_03", "item-ml-lab-1", 90.0, True, d3_ago),
        ("lab_sub_04_ml_1", "user_learner_04", "item-ml-lab-1", 95.0, True, d3_ago),
        ("lab_sub_05_ml_1", "user_learner_05", "item-ml-lab-1", 85.0, True, d3_ago),
        ("lab_sub_06_ml_1", "user_learner_06", "item-ml-lab-1", 90.0, True, d3_ago),
        ("lab_sub_07_ml_1", "user_learner_07", "item-ml-lab-1", 90.0, True, d3_ago),
        ("lab_sub_08_ml_1", "user_learner_08", "item-ml-lab-1", 85.0, True, d2_ago),
        # Web Lab 2
        (
            "lab_sub_demo_web_2",
            "user_learner_demo",
            "item-web-lab-2",
            100.0,
            True,
            d4_ago,
        ),
        ("lab_sub_02_web_2", "user_learner_02", "item-web-lab-2", 100.0, True, d4_ago),
        ("lab_sub_04_web_2", "user_learner_04", "item-web-lab-2", 90.0, True, d3_ago),
        ("lab_sub_05_web_2", "user_learner_05", "item-web-lab-2", 85.0, True, d3_ago),
    ]
    for l_id, l_uid, l_item, l_score, l_passed, l_created in lab_specs:
        await session.merge(
            LabSubmissionModel(
                id=l_id,
                user_id=l_uid,
                item_id=l_item,
                source_code="""def solve(): return True""",
                language="python" if "ml" in l_item else "typescript",
                score_percent=l_score,
                passed=l_passed,
                total_test_cases=4,
                passed_test_cases=4 if l_passed else 3,
                test_logs="""[PASS] Test 1: Initialization
[PASS] Test 2: Execution validation
[PASS] Test 3: Edge cases handled
[PASS] Test 4: Performance within limits""",
                created_at=l_created,
            )
        )

    # -------------------------------------------------------------------------
    # Peer Assignment Submissions & Reviews: COURSE 1 (item-ml-peer-1)
    # -------------------------------------------------------------------------

    # 1. Nguyễn Văn A: Graded by Staff (Andrew Ng) -> STATUS: GRADED (INSTRUCTOR)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_demo_01",
            user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/nguyenvana/housing-price-regression-ml",
            text_content="Báo cáo thiết kế kiến trúc mô hình học máy có giám sát (Supervised ML) dự đoán giá nhà ở. Đã triển khai chuẩn hóa dữ liệu Z-Score, hàm mất mát MSE với regularization L2, và thuật toán Gradient Descent tự cài đặt bằng NumPy thuần.",
            created_at=d4_ago,
            final_score=96.0,
            graded_by_staff=True,
            staff_feedback="Giải pháp xuất sắc! Trình bày đạo hàm toán học rất trực quan, code NumPy vector hóa tối ưu và phân tích độ hội tụ chi tiết.",
            graded_by_user_id="user_instructor_01",
            grader_role="INSTRUCTOR",
            grade_source="INSTRUCTOR",
            rubric_scores_json={
                "crit-ml-1": 39.0,
                "crit-ml-2": 29.0,
                "crit-ml-3": 28.0,
            },
            status="GRADED",
            attempt_number=1,
            published_at=d3_ago,
        )
    )

    # 2. Trần Thu Hà: Graded by Peers (3 reviews, avg 88.0) -> STATUS: GRADED (PEER)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_02",
            user_id="user_learner_02",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/tranthuha/linear-regression-from-scratch",
            text_content="Triển khai Linear Regression đa biến dự đoán mức tiêu thụ năng lượng. Đã thử nghiệm Learning Rate từ 0.001 đến 0.1 và phân tích hiện tượng Overfitting.",
            created_at=d4_ago,
            final_score=88.0,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="GRADED",
            attempt_number=1,
            published_at=d3_ago,
        )
    )

    # 3. Phạm Quốc Bảo: Appealed after low peer grade -> STATUS: APPEALED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_03",
            user_id="user_learner_03",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/phamquocbao/california-housing-ml",
            text_content="Dự án phân tích và dự báo giá bất động sản California Housing Dataset. Sử dụng kỹ thuật Polynomial Regression bậc 2 kết hợp Ridge Regularization.",
            created_at=d3_ago,
            final_score=62.5,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="APPEALED",
            attempt_number=1,
        )
    )

    # 4. Lê Thị Mai Linh: Claimed/Locked by TA (ThS. Nguyễn Hoàng Nam) -> STATUS: CLAIMED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_04",
            user_id="user_learner_04",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/mailinh-le/patient-heart-disease-prediction",
            text_content="Mô hình phân loại nhị phân Logistic Regression dự đoán nguy cơ bệnh tim mạch dựa trên chỉ số lâm sàng. Tối ưu hóa F1-Score và Precision.",
            created_at=d2_ago,
            final_score=None,
            locked_by_user_id="user_ta_01",
            locked_at=m5_ago,
            status="CLAIMED",
            attempt_number=1,
        )
    )

    # 5. Hoàng Minh Đức: Review variance outlier (40 vs 95, 92) -> STATUS: PENDING (OUTLIER)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_05",
            user_id="user_learner_05",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/duc-hoang/credit-card-fraud-detection",
            text_content="Xây dựng hệ thống phát hiện gian lận thẻ tín dụng bằng hồi quy Logistic và kỹ thuật SMOTE Oversampling.",
            created_at=d3_ago,
            final_score=None,
            status="PENDING",
            attempt_number=1,
        )
    )

    # 6. Vũ Hải Đăng: OVERDUE > 48h (Nộp 4 ngày trước chưa có bạn chấm) -> STATUS: PENDING (OVERDUE!)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_06",
            user_id="user_learner_06",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/haidang-vu/car-price-regression-analysis",
            text_content="Mô hình hồi quy dự đoán giá xe ô tô cũ theo số dặm đã đi, năm sản xuất và hãng xe. Đã nộp từ 4 ngày trước nhưng chưa có bạn học nào chấm bài, cần Giảng viên can thiệp chấm.",
            created_at=d4_ago,
            final_score=None,
            status="PENDING",
            attempt_number=1,
        )
    )

    # 7. Đỗ Thùy Trang: Mới nộp gần đây, 1 review -> STATUS: PENDING
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_ml_07",
            user_id="user_learner_07",
            item_id="item-ml-peer-1",
            submission_url="https://github.com/thuytrang-do/telecom-customer-churn",
            text_content="Dự đoán tỷ lệ khách hàng rời bỏ mạng viễn thông (Customer Churn) bằng mô hình Logistic Regression chuẩn hóa.",
            created_at=h6_ago,
            final_score=None,
            status="PENDING",
            attempt_number=1,
        )
    )

    # -------------------------------------------------------------------------
    # Peer Assignment Submissions & Reviews: COURSE 2 (item-web-peer-1)
    # -------------------------------------------------------------------------

    # 8. Nguyễn Văn A: Graded by Staff (Lê Quang Dũng / Andrew Ng) -> STATUS: GRADED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_web_demo",
            user_id="user_learner_demo",
            item_id="item-web-peer-1",
            submission_url="https://github.com/nguyenvana/nextjs-lms-dashboard-connectrpc",
            text_content="Dashboard quản lý khóa học fullstack sử dụng Next.js 15 App Router, TypeScript và ConnectRPC. Tích hợp TanStack Query quản lý cache server-state, giao diện thiết kế chuẩn 3-tier Semantic Tokens Tailwind CSS v4.",
            created_at=d4_ago,
            final_score=95.0,
            graded_by_staff=True,
            staff_feedback="Dự án hoàn thiện rất cao. Cấu trúc component rõ ràng, áp dụng đúng pattern TanStack Query và ConnectRPC.",
            graded_by_user_id="user_instructor_01",
            grader_role="INSTRUCTOR",
            grade_source="INSTRUCTOR",
            rubric_scores_json={
                "crit-web-1": 34.0,
                "crit-web-2": 33.0,
                "crit-web-3": 28.0,
            },
            status="GRADED",
            attempt_number=1,
            published_at=d3_ago,
        )
    )

    # 9. Trần Thu Hà: Peer graded (avg 91.0) -> STATUS: GRADED (PEER)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_web_02",
            user_id="user_learner_02",
            item_id="item-web-peer-1",
            submission_url="https://github.com/tranthuha/nextjs-cockpit-connectrpc",
            text_content="Bản nộp đồ án Capstone: Xây dựng Cockpit Chấm bài cho Trợ giảng với giao diện 2 cột Dual-Pane Modal.",
            created_at=d4_ago,
            final_score=91.0,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="GRADED",
            attempt_number=1,
            published_at=d3_ago,
        )
    )

    # 10. Phạm Quốc Bảo: Đang chờ hoàn tất chấm -> STATUS: PENDING
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_web_03",
            user_id="user_learner_03",
            item_id="item-web-peer-1",
            submission_url="https://github.com/phamquocbao/web-dev-capstone",
            text_content="Đồ án kết thúc khóa học: Tối ưu hiệu năng Web Vitals với Next.js 15 và Tailwind CSS v4.",
            created_at=d1_ago,
            final_score=None,
            status="PENDING",
            attempt_number=1,
        )
    )

    # 11. Đỗ Thùy Trang: OVERDUE > 48h (Nộp 3 ngày trước chưa ai chấm) -> STATUS: PENDING (OVERDUE!)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_web_07",
            user_id="user_learner_07",
            item_id="item-web-peer-1",
            submission_url="https://github.com/thuytrang-do/e-learning-platform-capstone",
            text_content="Ứng dụng web học tập trực tuyến tích hợp streaming video bài giảng, danh sách tuần học và nộp bài kiểm tra. Đã nộp 3 ngày trước nhưng chưa đủ đánh giá.",
            created_at=d3_ago,
            final_score=None,
            status="PENDING",
            attempt_number=1,
        )
    )

    # 12. Bùi Thanh Tùng: Appealed on responsive mobile review -> STATUS: APPEALED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_web_08",
            user_id="user_learner_08",
            item_id="item-web-peer-1",
            submission_url="https://github.com/thanhtung-bui/coursera-clone-fullstack",
            text_content="Capstone dự án LMS Clone: Thiết kế Responsive Mobile-first, Dark/Light mode tự động chuyển theo hệ thống, API ConnectRPC endpoint an toàn với JWT Interceptor.",
            created_at=d3_ago,
            final_score=69.0,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="APPEALED",
            attempt_number=1,
        )
    )

    # -------------------------------------------------------------------------
    # Peer Reviews (Detailed Rubric Items with Feedback in Vietnamese)
    # -------------------------------------------------------------------------
    peer_reviews = [
        # Reviews for peer_sub_demo_01 (Nguyễn Văn A)
        PeerReviewModel(
            id="peer_rev_ml_01_a",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_learner_02",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 38.0,
                        "feedback": "Phân tích giả thuyết và hàm mất mát rất chi tiết, có biểu đồ minh họa rõ ràng.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Kỹ thuật chuẩn hóa MinMax áp dụng chính xác.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Code sạch, Markdown trình bày đẹp.",
                    },
                ]
            },
            total_score=94.0,
            is_outlier=False,
            created_at=d4_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_01_b",
            submission_id="peer_sub_demo_01",
            reviewer_user_id="user_learner_03",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 39.0,
                        "feedback": "Công thức toán Latex trực quan và lập luận chặt chẽ.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 29.0,
                        "feedback": "Xử lý missing value bằng median rất chuẩn.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Tài liệu hướng dẫn dễ hiểu.",
                    },
                ]
            },
            total_score=95.0,
            is_outlier=False,
            created_at=d4_ago,
        ),
        # Reviews for peer_sub_ml_02 (Trần Thu Hà)
        PeerReviewModel(
            id="peer_rev_ml_02_a",
            submission_id="peer_sub_ml_02",
            reviewer_user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 35.0,
                        "feedback": "Hàm cost function cài đặt đúng, nên giải thích thêm về learning rate.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Đầy đủ các bước tiền xử lý cơ bản.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 26.0,
                        "feedback": "Code rõ ràng.",
                    },
                ]
            },
            total_score=88.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_02_b",
            submission_id="peer_sub_ml_02",
            reviewer_user_id="user_learner_04",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 36.0,
                        "feedback": "Lập luận logic, biểu đồ contour loss trực quan.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Chuẩn hóa Z-score chuẩn xác.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Code có type annotations đầy đủ.",
                    },
                ]
            },
            total_score=90.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_02_c",
            submission_id="peer_sub_ml_02",
            reviewer_user_id="user_learner_05",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 34.0,
                        "feedback": "Bài làm đạt yêu cầu.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 26.0,
                        "feedback": "Có phân chia tập train/test hợp lý.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 26.0,
                        "feedback": "Trình bày dễ hiểu.",
                    },
                ]
            },
            total_score=86.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        # Reviews for peer_sub_ml_03 (Phạm Quốc Bảo - Khiếu nại)
        PeerReviewModel(
            id="peer_rev_ml_03_a",
            submission_id="peer_sub_ml_03",
            reviewer_user_id="user_learner_02",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 28.0,
                        "feedback": "Phần toán hơi sơ sài, thiếu chứng minh đạo hàm.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 22.0,
                        "feedback": "Chưa thấy giải thích chọn biến đặc trưng.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 15.0,
                        "feedback": "Không thấy file README hướng dẫn chạy dự án.",
                    },
                ]
            },
            total_score=65.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_03_b",
            submission_id="peer_sub_ml_03",
            reviewer_user_id="user_learner_06",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 26.0,
                        "feedback": "Nên bổ sung thêm đồ án phân tích sâu hơn.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 20.0,
                        "feedback": "Tiền xử lý còn thiếu bước kiểm tra ngoại lai (outliers).",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 14.0,
                        "feedback": "Chưa thấy file requirements.txt cài đặt thư viện.",
                    },
                ]
            },
            total_score=60.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        # Reviews for peer_sub_ml_04 (Lê Thị Mai Linh - Đang chấm)
        PeerReviewModel(
            id="peer_rev_ml_04_a",
            submission_id="peer_sub_ml_04",
            reviewer_user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 34.0,
                        "feedback": "Phân tích Logistic Regression tốt.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 26.0,
                        "feedback": "Xử lý mất cân bằng dữ liệu bằng kỹ thuật thích hợp.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 25.0,
                        "feedback": "Bố cục đẹp, code mạch lạc.",
                    },
                ]
            },
            total_score=85.0,
            is_outlier=False,
            created_at=d2_ago,
        ),
        # Reviews for peer_sub_ml_05 (Hoàng Minh Đức - Outlier)
        PeerReviewModel(
            id="peer_rev_ml_05_a",
            submission_id="peer_sub_ml_05",
            reviewer_user_id="user_learner_demo",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 38.0,
                        "feedback": "Bài làm xuất sắc, AUC-ROC curve rất đẹp.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 29.0,
                        "feedback": "SMOTE áp dụng chuẩn chỉ.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Tài liệu rất chi tiết.",
                    },
                ]
            },
            total_score=95.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_05_b",
            submission_id="peer_sub_ml_05",
            reviewer_user_id="user_learner_02",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 37.0,
                        "feedback": "Mô hình rất công phu, tính toán chi tiết.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Tách train/val/test cẩn thận.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Code sạch sẽ theo chuẩn PEP8.",
                    },
                ]
            },
            total_score=92.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_ml_05_c",
            submission_id="peer_sub_ml_05",
            reviewer_user_id="user_learner_08",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 16.0,
                        "feedback": "Chưa thích cách tiếp cận này.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 12.0,
                        "feedback": "Không đồng ý với SMOTE.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 12.0,
                        "feedback": "Tài liệu dài quá.",
                    },
                ]
            },
            total_score=40.0,
            is_outlier=True,  # Outlier trigger!
            created_at=d2_ago,
        ),
        # Review for peer_sub_ml_07 (Đỗ Thùy Trang)
        PeerReviewModel(
            id="peer_rev_ml_07_a",
            submission_id="peer_sub_ml_07",
            reviewer_user_id="user_learner_04",
            item_id="item-ml-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-ml-1",
                        "title": "Kiến trúc Mô hình & Nền tảng Toán học",
                        "max_score": 40.0,
                        "score_given": 35.0,
                        "feedback": "Phân tích Logistic Regression tốt.",
                    },
                    {
                        "criteria_id": "crit-ml-2",
                        "title": "Chiến lược Tiền xử lý & Feature Engineering",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Xử lý dữ liệu phân loại bằng One-Hot Encoding rất chuẩn.",
                    },
                    {
                        "criteria_id": "crit-ml-3",
                        "title": "Chất lượng Mã nguồn, Trình bày & Tài liệu",
                        "max_score": 30.0,
                        "score_given": 26.0,
                        "feedback": "Code dễ theo dõi.",
                    },
                ]
            },
            total_score=88.0,
            is_outlier=False,
            created_at=h6_ago,
        ),
        # Reviews for peer_sub_web_demo (Nguyễn Văn A - Web Capstone)
        PeerReviewModel(
            id="peer_rev_web_demo_a",
            submission_id="peer_sub_web_demo",
            reviewer_user_id="user_learner_02",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 33.0,
                        "feedback": "Sử dụng RSC rất mượt, tách client boundary chuẩn xác.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Gọi rpc client chuẩn, xử lý cache query hook rất tốt.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Dark/Light mode mượt mà, không dùng màu hex cứng.",
                    },
                ]
            },
            total_score=92.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_web_demo_b",
            submission_id="peer_sub_web_demo",
            reviewer_user_id="user_learner_03",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 34.0,
                        "feedback": "Cấu trúc thư mục module cực kỳ chuyên nghiệp.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 33.0,
                        "feedback": "Xử lý loading và toast thông báo rất chỉn chu.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Giao diện đẹp mắt, tương thích mobile tốt.",
                    },
                ]
            },
            total_score=94.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        # Reviews for peer_sub_web_02 (Trần Thu Hà - Web Capstone)
        PeerReviewModel(
            id="peer_rev_web_02_a",
            submission_id="peer_sub_web_02",
            reviewer_user_id="user_learner_demo",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Modal chấm bài 2 cột thiết kế xuất sắc.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Mutation lock task hoạt động trơn tru.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Tailwind v4 tokens được áp dụng triệt để.",
                    },
                ]
            },
            total_score=92.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        PeerReviewModel(
            id="peer_rev_web_02_b",
            submission_id="peer_sub_web_02",
            reviewer_user_id="user_learner_04",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Tổ chức code tốt.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 31.0,
                        "feedback": "Tích hợp API chuẩn xác.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Responsive rất tốt trên iPad và điện thoại.",
                    },
                ]
            },
            total_score=90.0,
            is_outlier=False,
            created_at=d3_ago,
        ),
        # Review for peer_sub_web_03 (Phạm Quốc Bảo - Web Capstone)
        PeerReviewModel(
            id="peer_rev_web_03_a",
            submission_id="peer_sub_web_03",
            reviewer_user_id="user_learner_02",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 31.0,
                        "feedback": "Tối ưu Web Vitals tốt.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 30.0,
                        "feedback": "ConnectRPC hoạt động ổn định.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Giao diện trực quan.",
                    },
                ]
            },
            total_score=88.0,
            is_outlier=False,
            created_at=d1_ago,
        ),
        # Reviews for peer_sub_web_08 (Bùi Thanh Tùng - Web Capstone Khiếu nại)
        PeerReviewModel(
            id="peer_rev_web_08_a",
            submission_id="peer_sub_web_08",
            reviewer_user_id="user_learner_02",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 28.0,
                        "feedback": "Code Next.js viết ổn định.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 26.0,
                        "feedback": "Có kết nối RPC backend.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 16.0,
                        "feedback": "Giao diện hiển thị trên màn hình nhỏ chưa tối ưu, các nút bấm bị tràn mép.",
                    },
                ]
            },
            total_score=70.0,
            is_outlier=False,
            created_at=d2_ago,
        ),
        PeerReviewModel(
            id="peer_rev_web_08_b",
            submission_id="peer_sub_web_08",
            reviewer_user_id="user_learner_03",
            item_id="item-web-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-web-1",
                        "title": "Kiến trúc Frontend Next.js App Router & Server Components",
                        "max_score": 35.0,
                        "score_given": 27.0,
                        "feedback": "Bố cục các trang khá đầy đủ.",
                    },
                    {
                        "criteria_id": "crit-web-2",
                        "title": "Tích hợp ConnectRPC & Quản lý Server State với TanStack Query",
                        "max_score": 35.0,
                        "score_given": 25.0,
                        "feedback": "Cần thêm xử lý lỗi mạng khi mất kết nối.",
                    },
                    {
                        "criteria_id": "crit-web-3",
                        "title": "Giao diện Responsive & Chuẩn Semantic Design Tokens Tailwind v4",
                        "max_score": 30.0,
                        "score_given": 16.0,
                        "feedback": "Cỡ chữ mobile quá to gây tràn ngang (horizontal overflow).",
                    },
                ]
            },
            total_score=68.0,
            is_outlier=False,
            created_at=d2_ago,
        ),
    ]
    for rev in peer_reviews:
        await session.merge(rev)

    # Grade Appeals
    appeals = [
        GradeAppealModel(
            id="appeal_ml_03",
            user_id="user_learner_03",
            submission_id="peer_sub_ml_03",
            appeal_reason="Kính gửi Thầy/Cô: Bạn cùng lớp chấm bài nhận xét thiếu file README và requirements.txt, nhưng thực tế em đã gom tất cả cấu hình môi trường vào file pyproject.toml và Dockerfile ở nhánh main. Điểm số bị trừ 25 điểm chưa thỏa đáng. Em xin gửi khiếu nại kính mong Thầy/Cô xem xét và chấm lại giúp em!",
            status="PENDING",
            created_at=d2_ago,
        ),
        GradeAppealModel(
            id="appeal_web_08",
            user_id="user_learner_08",
            submission_id="peer_sub_web_08",
            appeal_reason="Bạn học chấm điểm nhận xét giao diện bị vỡ trên điện thoại và trừ 14 điểm mục Responsive. Nhưng em đã test kỹ bằng Chrome DevTools trên iPhone 14 Pro và iPad Pro đều hiển thị hoàn hảo. Kính mong thầy cô kiểm tra lại trên thiết bị thực tế giúp em.",
            status="PENDING",
            created_at=d1_ago,
        ),
    ]
    for appeal in appeals:
        await session.merge(appeal)

    # -------------------------------------------------------------------------
    # Peer Assignment Submissions & Reviews: COURSE 3 (item-micro-peer-1)
    # -------------------------------------------------------------------------

    # 15. Nguyễn Văn A: Graded by Instructor (PGS. TS. Trần Minh Tuấn) -> STATUS: GRADED (INSTRUCTOR)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_demo_micro",
            user_id="user_learner_demo",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/nguyenvana/airline-pricing-microeconomics",
            text_content="Báo cáo Phân tích Thực nghiệm: Đánh giá Tác động của Chính sách Giá trần Vé Máy bay Nội địa & Mô hình Hóa Tổn thất Vô ích (DWL). Số liệu chuyến bay chặng TP.HCM - Hà Nội dịp Tết cho hàm Cầu Qd = 1200 - 0.2P và hàm Cung Qs = -200 + 0.15P. Điểm cân bằng tự do đạt P* = 4.000.000 VNĐ với Q* = 400.000 lượt ghế. Hệ số co giãn theo phương pháp trung điểm |PED| = 0.65 (nhu cầu kém co giãn vào mùa Tết). Việc áp giá trần P_max = 3.500.000 VNĐ dẫn tới lượng cung sụt giảm còn Qs = 325.000 vé trong khi lượng cầu Qd = 500.000 vé, gây thiếu hụt 175.000 chỗ ngồi và tổn thất vô ích 18.75 tỷ đồng.",
            created_at=d4_ago,
            final_score=96.0,
            graded_by_staff=True,
            staff_feedback="Bài làm xuất sắc! Mô hình toán học về thặng dư tiêu dùng (CS) và tổn thất vô ích (DWL) được tính toán chuẩn xác, viện dẫn số liệu thực tế thuyết phục.",
            graded_by_user_id="user_instructor_econ",
            grader_role="INSTRUCTOR",
            grade_source="INSTRUCTOR",
            rubric_scores_json={
                "crit-micro-1": 29.0,
                "crit-micro-2": 34.0,
                "crit-micro-3": 33.0,
            },
            status="GRADED",
            published_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_demo_01",
            submission_id="peer_sub_demo_micro",
            reviewer_user_id="user_instructor_econ",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 29.0,
                        "feedback": "Mô hình hóa hàm cung cầu xuất sắc.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 34.0,
                        "feedback": "Tính toán hệ số co giãn PED chuẩn xác theo phương pháp trung điểm.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 33.0,
                        "feedback": "Phân tích DWL 18.75 tỷ đồng rất thuyết phục.",
                    },
                ]
            },
            total_score=96.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )

    # 16. Trần Thu Hà: Graded by Peers -> STATUS: GRADED (PEER)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_02_micro",
            user_id="user_learner_02",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/tranthuha/swine-fever-market-analysis",
            text_content="Case Study: Tác động của Dịch tả Lợn Châu Phi tới Cân bằng Cung Cầu Thịt Heo & Khuyến nghị Chính sách Bình ổn Giá. Dịch tả lợn làm sụt giảm 25% đàn nái, dịch chuyển đường Cung sang trái S -> S'. Mức giá cân bằng nhảy vọt từ 45.000đ lên 90.000đ/kg. Hệ số co giãn |PED| = 0.58. Nhu cầu thịt heo là thực phẩm thiết yếu khó thay thế hoàn toàn trong ngắn hạn. Giải pháp nhập khẩu thịt heo đông lạnh giúp bổ sung lượng cung kịp thời, thu hẹp DWL khoảng 42% sau 6 tháng.",
            created_at=d3_ago,
            final_score=91.0,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            rubric_scores_json={
                "crit-micro-1": 27.5,
                "crit-micro-2": 32.5,
                "crit-micro-3": 31.0,
            },
            status="GRADED",
            published_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_02_a",
            submission_id="peer_sub_02_micro",
            reviewer_user_id="user_learner_demo",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 28.0,
                        "feedback": "Mô hình dịch chuyển đường cung rõ ràng.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Giải thích tính co giãn thiết yếu rất chuẩn.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 30.0,
                        "feedback": "Đề xuất mở hạn ngạch nhập khẩu thịt heo khả thi.",
                    },
                ]
            },
            total_score=90.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_02_b",
            submission_id="peer_sub_02_micro",
            reviewer_user_id="user_learner_03",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Bài làm tốt, có phân tích thực tế sinh động.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 33.0,
                        "feedback": "Hệ số co giãn tính đúng công thức trung điểm.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Khuyến nghị chính sách hay.",
                    },
                ]
            },
            total_score=92.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_02_c",
            submission_id="peer_sub_02_micro",
            reviewer_user_id="user_learner_05",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 27.5,
                        "feedback": "Phần phân tích đường cung rõ ràng, logic.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 32.5,
                        "feedback": "Tính toán độ co giãn chuẩn xác.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 31.0,
                        "feedback": "Đề xuất chính sách rất thực tế.",
                    },
                ]
            },
            total_score=91.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )

    # 17. Phạm Quốc Bảo: Harsh Graded -> STATUS: APPEALED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_03_micro",
            user_id="user_learner_03",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/bao-pham/grab-surge-pricing-analysis",
            text_content="Đo lường Độ co giãn của Cầu đối với Dịch vụ Gọi xe Công nghệ Grab/Be & Phân tích Thuật toán Surge Pricing. Thuật toán Surge Pricing điều chỉnh giá tự động theo thời gian thực khi cung thiếu hụt cục bộ vào giờ cao điểm mưa gió. Hệ số PED giờ cao điểm đạt |PED| = 0.42 (ít co giãn do nhu cầu khẩn cấp), trong khi giờ thấp điểm |PED| = 1.45.",
            created_at=d2_ago,
            final_score=64.0,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            rubric_scores_json={
                "crit-micro-1": 20.0,
                "crit-micro-2": 15.0,
                "crit-micro-3": 29.0,
            },
            status="APPEALED",
            published_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_03_a",
            submission_id="peer_sub_03_micro",
            reviewer_user_id="user_learner_04",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 20.0,
                        "feedback": "Mô hình surge pricing cần thêm đồ thị so sánh hai trạng thái thời tiết.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 15.0,
                        "feedback": "Phần tính toán hệ số co giãn PED chưa nêu rõ nguồn thu thập mẫu dữ liệu thực nghiệm, trừ điểm mục 2.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 29.0,
                        "feedback": "Phân tích thặng dư tài xế và hành khách khá tốt.",
                    },
                ]
            },
            total_score=64.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_03_b",
            submission_id="peer_sub_03_micro",
            reviewer_user_id="user_learner_demo",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 20.0,
                        "feedback": "Cần vẽ rõ đường cung hơn.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 16.0,
                        "feedback": "Chấm theo barem thì mục 2 chưa đủ dẫn chứng.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 28.0,
                        "feedback": "Đề xuất tương đối ổn.",
                    },
                ]
            },
            total_score=64.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )
    await session.merge(
        GradeAppealModel(
            id="appeal_micro_03",
            user_id="user_learner_03",
            submission_id="peer_sub_03_micro",
            appeal_reason="Em đã phân tích rất chi tiết cả 2 trường hợp hệ số co giãn giờ cao điểm và giờ thấp điểm từ khảo sát 200 cuốc xe thực tế tại Hà Nội. Bạn chấm chỉ cho 15/35 điểm ở tiêu chí 2 là quá khắt khe và thiếu công bằng. Kính mong thầy cô thẩm định lại giúp em.",
            status="PENDING",
            created_at=d1_ago,
        )
    )

    # 18. Lê Thị Mai Linh: Discrepant Grading -> STATUS: PENDING (OUTLIER 95 vs 55)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_04_micro",
            user_id="user_learner_04",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/mailinh-le/coffee-export-surplus",
            text_content="Phân tích Thặng dư Người Tiêu dùng và Tổn thất Xã hội trong Thị trường Cà phê Xuất khẩu Đắk Lắk. Khảo sát thị trường cà phê Robusta với biến động sản lượng do hiện tượng El Nino và cơ chế thu mua của các thương lái. Độ co giãn cung dài hạn Es = 1.2 cao hơn nhiều so với ngắn hạn Es = 0.2.",
            created_at=d2_ago,
            final_score=None,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            rubric_scores_json={
                "crit-micro-1": 24.0,
                "crit-micro-2": 25.5,
                "crit-micro-3": 25.5,
            },
            status="PENDING",
            published_at=None,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_04_a",
            submission_id="peer_sub_04_micro",
            reviewer_user_id="user_learner_demo",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 30.0,
                        "feedback": "Bài viết phân tích chuyên sâu, hiểu rõ bản chất co giãn cung cầu trong nông sản.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 33.0,
                        "feedback": "Số liệu thống kê xuất khẩu thuyết phục.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 32.0,
                        "feedback": "Kiến nghị hỗ trợ vốn bảo hiểm mùa màng rất hay.",
                    },
                ]
            },
            total_score=95.0,
            is_outlier=True,
            created_at=d1_ago,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_04_b",
            submission_id="peer_sub_04_micro",
            reviewer_user_id="user_learner_05",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 18.0,
                        "feedback": "Nội dung trình bày còn sơ sài.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 18.0,
                        "feedback": "Chưa có công thức toán chi tiết.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 19.0,
                        "feedback": "Đề xuất chưa rõ ràng.",
                    },
                ]
            },
            total_score=55.0,
            is_outlier=True,
            created_at=d1_ago,
        )
    )

    # 19. Hoàng Minh Đức: Claimed by TA Nam -> STATUS: CLAIMED
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_05_micro",
            user_id="user_learner_05",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/duc-hoang/evn-progressive-tariff",
            text_content="Nghiên cứu Tính nhạy cảm Giá Điện sinh hoạt theo Biểu giá Bậc thang tại TP.HCM. Đánh giá chính sách định giá bậc thang lũy tiến của EVN và phản ứng tiêu dùng của các nhóm hộ gia đình có mức thu nhập khác nhau. Đề xuất cải tiến bậc 1 và bậc 2 để bảo đảm an sinh xã hội.",
            created_at=d2_ago,
            final_score=None,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            locked_by_user_id="user_ta_01",
            locked_at=m5_ago,
            status="CLAIMED",
            published_at=None,
        )
    )

    # 20. Vũ Hải Đăng: Overdue >48h awaiting grading -> STATUS: PENDING (OVERDUE)
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_06_micro",
            user_id="user_learner_06",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/dangvu/sugar-tax-deadweight-loss",
            text_content="Chính sách Thuế Tiêu thụ Đặc biệt với Đồ uống có Đường & Ước tính Tổn thất Vô ích (DWL). Đánh giá đề xuất đánh thuế 10% với nước ngọt có ga và tác động chuyển dịch tiêu dùng sang trà đóng chai hoặc nước tinh khiết. Tính toán tổn thất vô ích tam giác Harberger khi áp thuế.",
            created_at=d3_ago,
            final_score=None,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="PENDING",
            published_at=None,
        )
    )

    # 21. Đỗ Thùy Trang: 1 Review received -> STATUS: PENDING
    await session.merge(
        PeerAssignmentSubmissionModel(
            id="peer_sub_07_micro",
            user_id="user_learner_07",
            item_id="item-micro-peer-1",
            submission_url="https://github.com/trangdo/water-utility-pricing-welfare",
            text_content="Định giá Nước sạch Đô thị và Bài toán Phân bổ Phúc lợi Xã hội tại Hà Nội. Phân tích đặc thù độc quyền tự nhiên trong ngành cấp nước sạch đô thị. Đánh giá hai phương án định giá: Định giá theo chi phí cận biên MC kết hợp trợ cấp ngân sách vs Định giá theo chi phí trung bình AC.",
            created_at=d2_ago,
            final_score=None,
            graded_by_staff=False,
            grade_source="PEER_REVIEW",
            status="PENDING",
            published_at=None,
        )
    )
    await session.merge(
        PeerReviewModel(
            id="peer_rev_micro_07_a",
            submission_id="peer_sub_07_micro",
            reviewer_user_id="user_learner_02",
            item_id="item-micro-peer-1",
            rubric_criteria_json={
                "items": [
                    {
                        "criteria_id": "crit-micro-1",
                        "title": "Mô hình Hóa Cung - Cầu & Điểm Cân Bằng Thị Trường",
                        "max_score": 30.0,
                        "score_given": 27.0,
                        "feedback": "Phân tích độc quyền tự nhiên và đường AC dốc xuống chuẩn xác.",
                    },
                    {
                        "criteria_id": "crit-micro-2",
                        "title": "Lượng Hóa Độ Co Giãn Của Cầu (PED) & Tác Động Doanh Thu",
                        "max_score": 35.0,
                        "score_given": 31.0,
                        "feedback": "Độ co giãn nước sinh hoạt ít co giãn hơn nước kinh doanh.",
                    },
                    {
                        "criteria_id": "crit-micro-3",
                        "title": "Đánh Giá Phúc Lợi Xã Hội, Tổn Thất Vô Ích (DWL) & Đề Xuất Chính Sách",
                        "max_score": 35.0,
                        "score_given": 30.0,
                        "feedback": "Phương án định giá hai phần (Two-part tariff) rất khả thi.",
                    },
                ]
            },
            total_score=88.0,
            is_outlier=False,
            created_at=d1_ago,
        )
    )

    # 1. Question Bank & Quiz Matrices for Course 1 (ML)
    await session.merge(
        QuestionBankModel(
            id="qb-ml-01",
            course_id="course-python-ai",
            title="Ngân hàng câu hỏi Máy học cơ bản (ML Fundamentals)",
            category="PRACTICE",
            description="Tập hợp câu hỏi trắc nghiệm lý thuyết và bài tập Máy học cơ bản.",
            created_at="2026-07-25T12:00:00Z",
        )
    )

    ml_questions = [
        (
            QuestionModel(
                id="q-ml-01",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Thuật toán nào dưới đây thuộc nhóm Học có giám sát (Supervised Learning)?",
                explanation="Hồi quy tuyến tính (Linear Regression) yêu cầu nhãn dữ liệu đầu ra (Target label) để huấn luyện.",
                created_at="2026-07-25T12:05:00Z",
            ),
            [
                ("opt-q1-1", "Hồi quy tuyến tính (Linear Regression)", True),
                ("opt-q1-2", "Phân cụm K-Means", False),
                ("opt-q1-3", "Phân tích thành phần chính (PCA)", False),
                ("opt-q1-4", "Thuật toán DBSCAN", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-02",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Hàm mất mát phổ biến nhất được dùng cho bài toán Hồi quy tuyến tính là gì?",
                explanation="Mean Squared Error (MSE - Sai số bình phương trung bình) đo lường khoảng cách giữa dự đoán và thực tế.",
                created_at="2026-07-25T12:10:00Z",
            ),
            [
                ("opt-q2-1", "Mean Squared Error (MSE)", True),
                ("opt-q2-2", "Cross-Entropy Loss", False),
                ("opt-q2-3", "Hinge Loss", False),
                ("opt-q2-4", "Binary Cross-Entropy", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-03",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Phương pháp nào được dùng để tránh hiện tượng Overfitting trong mô hình Deep Learning?",
                explanation="Dropout và L2 Regularization giúp giảm bớt sự phụ thuộc quá mức vào các trọng số cụ thể.",
                created_at="2026-07-25T12:15:00Z",
            ),
            [
                ("opt-q3-1", "Kỹ thuật Dropout & L2 Regularization", True),
                ("opt-q3-2", "Tăng tốc độ học (Learning Rate) quá lớn", False),
                ("opt-q3-3", "Xóa tập dữ liệu Validation", False),
                ("opt-q3-4", "Bỏ qua hàm kích hoạt (Activation Function)", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-04",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Mạng Nơ-ron Nhân tạo (ANN) sử dụng thuật toán nào để cập nhật trọng số theo độ dốc đạo hàm?",
                explanation="Backpropagation (Lan truyền ngược) tính toán gradient của hàm mất mát theo từng trọng số trong mạng.",
                created_at="2026-07-25T12:20:00Z",
            ),
            [
                ("opt-q4-1", "Backpropagation (Lan truyền ngược)", True),
                ("opt-q4-2", "Forward Propagation", False),
                ("opt-q4-3", "K-Fold Cross Validation", False),
                ("opt-q4-4", "Principal Component Analysis", False),
            ],
        ),
        (
            QuestionModel(
                id="q-ml-05",
                bank_id="qb-ml-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Đánh giá hiệu năng mô hình Phân loại (Classification) với dữ liệu mất cân bằng (Imbalanced Data) nên ưu tiên chỉ số nào?",
                explanation="F1-Score (dung hòa Precision & Recall) và AUC-ROC đánh giá chính xác hơn chỉ số Accuracy khi dữ liệu lệch nặng.",
                created_at="2026-07-25T12:25:00Z",
            ),
            [
                ("opt-q5-1", "F1-Score & AUC-ROC", True),
                ("opt-q5-2", "Accuracy (Tỷ lệ chính xác tổng thể)", False),
                ("opt-q5-3", "Hệ số R-Squared", False),
                ("opt-q5-4", "Mean Absolute Error (MAE)", False),
            ],
        ),
    ]
    for q, opts in ml_questions:
        await _seed_question_with_options(session, q, opts)

    for qm in (
        QuizMatrixModel(
            item_id="item-ml-quiz-1",
            bank_id="qb-ml-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        ),
        QuizMatrixModel(
            item_id="item-ml-practice-1",
            bank_id="qb-ml-01",
            time_limit_minutes=15,
            passing_threshold_percent=60.0,
            easy_count=2,
            medium_count=1,
            hard_count=0,
            shuffle_options=True,
        ),
        QuizMatrixModel(
            item_id="item-ml-quiz-2",
            bank_id="qb-ml-01",
            time_limit_minutes=45,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        ),
    ):
        await session.merge(qm)

    # 2. Question Bank & Quiz Matrix for Course 2 (Web Dev)
    await session.merge(
        QuestionBankModel(
            id="qb-web-01",
            course_id="course-web-dev",
            title="Ngân hàng câu hỏi Lập trình Web Fullstack Next.js & ConnectRPC",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến trúc Next.js App Router, RSC, Tailwind v4 và ConnectRPC.",
            created_at="2026-07-25T13:00:00Z",
        )
    )

    web_questions = [
        (
            QuestionModel(
                id="q-web-01",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Ưu điểm vượt trội nhất của React Server Components (RSC) trong Next.js là gì?",
                explanation="RSC render trực tiếp trên máy chủ và không gửi mã JavaScript bundle thừa về trình duyệt của người dùng.",
                created_at="2026-07-25T13:05:00Z",
            ),
            [
                (
                    "opt-qw1-1",
                    "Giảm kích thước JavaScript bundle gửi xuống client về 0",
                    True,
                ),
                ("opt-qw1-2", "Bắt buộc mọi component phải dùng useState", False),
                ("opt-qw1-3", "Chỉ chạy được trên trình duyệt Chrome", False),
                ("opt-qw1-4", "Thay thế hoàn toàn cơ sở dữ liệu SQL", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-02",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Giao thức ConnectRPC sử dụng định dạng schema nào để đảm bảo type-safety hai đầu Frontend - Backend?",
                explanation="ConnectRPC dùng Protocol Buffers (.proto) để tự động sinh ra client stubs type-safe cho TypeScript và Python.",
                created_at="2026-07-25T13:10:00Z",
            ),
            [
                ("opt-qw2-1", "Protocol Buffers (Protobuf v3)", True),
                ("opt-qw2-2", "XML DTD Schema", False),
                ("opt-qw2-3", "Raw CSV Tables", False),
                ("opt-qw2-4", "HTML5 Web Forms", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-03",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Trong Domain-Driven Design (DDD), tầng nào trực tiếp chứa nghiệp vụ cốt lõi không phụ thuộc framework?",
                explanation="Tầng Domain Entity chứa các quy tắc nghiệp vụ bất biến, độc lập hoàn toàn với framework và database.",
                created_at="2026-07-25T13:15:00Z",
            ),
            [
                ("opt-qw3-1", "Domain Layer (Thực thể & Luật nghiệp vụ cốt lõi)", True),
                ("opt-qw3-2", "Infrastructure Layer (SQL queries)", False),
                ("opt-qw3-3", "Presentation Layer (React components)", False),
                ("opt-qw3-4", "Docker Compose config", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-04",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Lợi ích chính của việc sử dụng TanStack Query (React Query) trong ứng dụng Single Page là gì?",
                explanation="React Query tự động quản lý bộ nhớ đệm, deduplication requests và đồng bộ trạng thái ngầm khi tab active.",
                created_at="2026-07-25T13:20:00Z",
            ),
            [
                (
                    "opt-qw4-1",
                    "Tự động quản lý Cache, Refetch ngầm và Optimistic UI",
                    True,
                ),
                ("opt-qw4-2", "Biên dịch mã nguồn sang WebAssembly", False),
                ("opt-qw4-3", "Tự động mã hóa HTTPS cho server", False),
                ("opt-qw4-4", "Thay thế hoàn toàn Tailwind CSS", False),
            ],
        ),
        (
            QuestionModel(
                id="q-web-05",
                bank_id="qb-web-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Khi giải mã JWT Token trên Edge Runtime (Next.js Middleware), phương pháp nào an toàn và không gây lỗi crash?",
                explanation="Edge Runtime không hỗ trợ thư viện Node.js Buffer, bắt buộc phải dùng Web Standard atob + TextDecoder.",
                created_at="2026-07-25T13:25:00Z",
            ),
            [
                ("opt-qw5-1", "Sử dụng Web Standard atob và TextDecoder UTF-8", True),
                ("opt-qw5-2", "Import thư viện Node.js Buffer.from", False),
                ("opt-qw5-3", "Lưu private key trực tiếp vào LocalStorage", False),
                ("opt-qw5-4", "Tắt hoàn toàn cơ chế xác thực JWT", False),
            ],
        ),
    ]
    for q, opts in web_questions:
        await _seed_question_with_options(session, q, opts)

    await session.merge(
        QuizMatrixModel(
            item_id="item-web-quiz-1",
            bank_id="qb-web-01",
            time_limit_minutes=25,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
    )

    # 3. Question Bank & Quiz Matrix for Course 3 (Deep Learning)
    await session.merge(
        QuestionBankModel(
            id="qb-dl-01",
            course_id="course-deep-learning",
            title="Ngân hàng câu hỏi Deep Learning & Mạng Nơ-ron Sâu",
            category="GRADED",
            description="Tập hợp câu hỏi trắc nghiệm kiến thức Vectorization, He Initialization, Vanishing Gradient và Backpropagation.",
            created_at="2026-07-25T14:00:00Z",
        )
    )

    dl_questions = [
        (
            QuestionModel(
                id="q-dl-01",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Hàm kích hoạt nào được ưu tiên hàng đầu để khắc phục hiện tượng Triệt tiêu Đạo hàm (Vanishing Gradient) trong Deep Learning?",
                explanation="ReLU (Rectified Linear Unit) có đạo hàm bằng 1 khi x > 0, giúp dòng đạo hàm truyền nguyên vẹn qua hàng chục tầng ẩn.",
                created_at="2026-07-25T14:05:00Z",
            ),
            [
                ("opt-qd1-1", "ReLU (Rectified Linear Unit)", True),
                ("opt-qd1-2", "Sigmoid", False),
                ("opt-qd1-3", "Tanh", False),
                ("opt-qd1-4", "Step Function", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-02",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="EASY",
                text="Lợi ích cốt lõi của kỹ thuật Vectorization trong lập trình Deep Learning là gì?",
                explanation="Vectorization tận dụng các tập lệnh song song SIMD trên CPU/GPU để tính toán ma trận nhanh hơn hàng trăm lần so với vòng lặp.",
                created_at="2026-07-25T14:10:00Z",
            ),
            [
                (
                    "opt-qd2-1",
                    "Tận dụng tính toán song song phần cứng (SIMD/GPU) với tốc độ vượt trội",
                    True,
                ),
                ("opt-qd2-2", "Tự động sửa lỗi cú pháp Python", False),
                ("opt-qd2-3", "Giảm độ sâu của mạng nơ-ron về 1 tầng", False),
                ("opt-qd2-4", "Không cần dữ liệu đầu vào", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-03",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Khi sử dụng hàm kích hoạt ReLU, kỹ thuật khởi tạo trọng số nào được khuyến nghị tốt nhất?",
                explanation="He Initialization (khởi tạo He/Kaiming) với phương sai 2/n_in được thiết kế đặc thù cho các tầng phi tuyến ReLU.",
                created_at="2026-07-25T14:15:00Z",
            ),
            [
                ("opt-qd3-1", "He Initialization (Kaiming Init)", True),
                ("opt-qd3-1a", "Khởi tạo tất cả trọng số bằng 0", False),
                ("opt-qd3-2", "Khởi tạo tất cả trọng số bằng 1", False),
                ("opt-qd3-3", "Random Uniform trong khoảng [-1000, 1000]", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-04",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="MEDIUM",
                text="Quy tắc toán học nền tảng nào được áp dụng để tính toán Lan truyền ngược (Backpropagation)?",
                explanation="Quy tắc chuỗi (Chain Rule) trong giải tích nhiều biến cho phép tính đạo hàm riêng của hàm mất mát qua từng tầng liên tiếp.",
                created_at="2026-07-25T14:20:00Z",
            ),
            [
                (
                    "opt-qd4-1",
                    "Quy tắc chuỗi trong giải tích đạo hàm (Chain Rule)",
                    True,
                ),
                ("opt-qd4-2", "Định lý Pythagoras", False),
                ("opt-qd4-3", "Quy tắc L'Hopital", False),
                ("opt-qd4-4", "Công thức nhị thức Newton", False),
            ],
        ),
        (
            QuestionModel(
                id="q-dl-05",
                bank_id="qb-dl-01",
                question_type="SINGLE_CHOICE",
                difficulty="HARD",
                text="Mục đích chính của kỹ thuật Chuẩn hóa theo lô (Batch Normalization) trong mạng nơ-ron sâu là gì?",
                explanation="Batch Normalization ổn định phân phối đầu vào của các tầng ẩn (giảm Internal Covariate Shift), cho phép dùng Learning Rate cao hơn.",
                created_at="2026-07-25T14:25:00Z",
            ),
            [
                (
                    "opt-qd5-1",
                    "Giảm Internal Covariate Shift, ổn định và tăng tốc quá trình huấn luyện",
                    True,
                ),
                ("opt-qd5-2", "Tăng kích thước file checkpoint mô hình", False),
                ("opt-qd5-3", "Loại bỏ hoàn toàn bước tính đạo hàm", False),
                ("opt-qd5-4", "Chỉ dùng được cho bài toán xử lý ảnh", False),
            ],
        ),
    ]
    for q, opts in dl_questions:
        await _seed_question_with_options(session, q, opts)

    await session.merge(
        QuizMatrixModel(
            item_id="item-dl-quiz-1",
            bank_id="qb-dl-01",
            time_limit_minutes=30,
            passing_threshold_percent=80.0,
            easy_count=2,
            medium_count=2,
            hard_count=1,
            shuffle_options=True,
        )
    )

    # =====================================================================
    # Question Banks & Quizzes for Course 4: Microeconomics
    # =====================================================================
    qb_micro_1 = QuestionBankModel(
        id="qb-micro-01",
        course_id="course-microeconomics-foundations",
        title="Ngân hàng câu hỏi: Độ co giãn & Cân bằng Thị trường",
        category="GRADED",
        description="Bộ câu hỏi kiểm tra năng lực tính toán PED và xác định cân bằng cung cầu.",
        created_at="2026-07-25T12:00:00Z",
    )
    await session.merge(qb_micro_1)

    # qb-micro-01 Questions (5 questions: 2 Easy, 2 Medium, 1 Hard)
    q_m1_1 = QuestionModel(
        id="q-m1-01",
        bank_id="qb-micro-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Khi đường Cung và đường Cầu của một hàng hóa cắt nhau trên đồ thị P-Q, trạng thái này được gọi là gì?",
        explanation="Giao điểm giữa đường Cung và đường Cầu là điểm Cân bằng Thị trường (Market Equilibrium), tại đó lượng cung bằng đúng lượng cầu (Qs = Qd) và không có dư thừa hay thiếu hụt hàng hóa.",
        created_at="2026-07-25T12:05:00Z",
    )
    await session.merge(q_m1_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-1-1",
            question_id="q-m1-01",
            option_text="Cân bằng thị trường (Market Equilibrium)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-1-2",
            question_id="q-m1-01",
            option_text="Thị trường độc quyền nhóm (Oligopoly)",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-1-3",
            question_id="q-m1-01",
            option_text="Trạng thái dư thừa hàng hóa (Surplus)",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-1-4",
            question_id="q-m1-01",
            option_text="Trạng thái thiếu hụt hàng hóa (Shortage)",
            is_correct=False,
            order_index=3,
        )
    )

    q_m1_2 = QuestionModel(
        id="q-m1-02",
        bank_id="qb-micro-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Theo Quy luật Cầu (Law of Demand), trong điều kiện các yếu tố khác không đổi (ceteris paribus), điều gì xảy ra khi giá bán của sản phẩm tăng lên?",
        explanation="Quy luật Cầu xác lập mối quan hệ nghịch biến giữa giá và lượng: khi giá tăng, lượng cầu về hàng hóa đó sẽ giảm do hiệu ứng thay thế và hiệu ứng thu nhập.",
        created_at="2026-07-25T12:06:00Z",
    )
    await session.merge(q_m1_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-2-1",
            question_id="q-m1-02",
            option_text="Lượng cầu về hàng hóa đó giảm xuống",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-2-2",
            question_id="q-m1-02",
            option_text="Lượng cầu về hàng hóa đó tăng lên",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-2-3",
            question_id="q-m1-02",
            option_text="Đường cầu dịch chuyển sang bên phải",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-2-4",
            question_id="q-m1-02",
            option_text="Lượng cung về hàng hóa đó giảm xuống",
            is_correct=False,
            order_index=3,
        )
    )

    q_m1_3 = QuestionModel(
        id="q-m1-03",
        bank_id="qb-micro-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Nếu độ co giãn của cầu theo giá là |PED| = 0.4 (cầu kém co giãn), điều gì sẽ xảy ra với Tổng doanh thu (TR = P * Q) của doanh nghiệp khi quyết định tăng giá bán?",
        explanation="Khi cầu kém co giãn (|PED| < 1), tỷ lệ tăng giá lớn hơn tỷ lệ sụt giảm của lượng mua. Do đó, tích số P * Q (Tổng doanh thu TR) chắc chắn sẽ TĂNG lên.",
        created_at="2026-07-25T12:07:00Z",
    )
    await session.merge(q_m1_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-3-1",
            question_id="q-m1-03",
            option_text="Tổng doanh thu sẽ tăng lên",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-3-2",
            question_id="q-m1-03",
            option_text="Tổng doanh thu sẽ giảm đi",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-3-3",
            question_id="q-m1-03",
            option_text="Tổng doanh thu hoàn toàn không đổi",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-3-4",
            question_id="q-m1-03",
            option_text="Lợi nhuận chắc chắn giảm xuống âm",
            is_correct=False,
            order_index=3,
        )
    )

    q_m1_4 = QuestionModel(
        id="q-m1-04",
        bank_id="qb-micro-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Khi giá vé xe buýt tăng từ 7.000 VNĐ lên 9.000 VNĐ, lượng hành khách đi xe buýt giảm từ 1.000 người xuống 800 người. Áp dụng phương pháp Trung điểm (Midpoint Formula), hệ số co giãn |PED| xấp xỉ bằng bao nhiêu?",
        explanation="% delta Q = (800 - 1000) / 900 = -200/900 = -22.2%. % delta P = (9000 - 7000) / 8000 = 2000/8000 = +25.0%. |PED| = |-22.2% / 25.0%| = 0.89. Cầu kém co giãn.",
        created_at="2026-07-25T12:08:00Z",
    )
    await session.merge(q_m1_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-4-1",
            question_id="q-m1-04",
            option_text="0.89 (Cầu kém co giãn)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-4-2",
            question_id="q-m1-04",
            option_text="1.50 (Cầu co giãn nhiều)",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-4-3",
            question_id="q-m1-04",
            option_text="0.45 (Cầu hoàn toàn không co giãn)",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-4-4",
            question_id="q-m1-04",
            option_text="2.25 (Cầu co giãn đơn vị)",
            is_correct=False,
            order_index=3,
        )
    )

    q_m1_5 = QuestionModel(
        id="q-m1-05",
        bank_id="qb-micro-01",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Hàm cầu thị trường của một sản phẩm là Qd = 120 - 3P. Tại mức giá P = 20 VNĐ, hệ số co giãn điểm của cầu theo giá (Point Elasticity of Demand) là bao nhiêu?",
        explanation="Tại P = 20 => Q = 120 - 3(20) = 60. Đạo hàm dQ/dP = -3. Hệ số co giãn điểm PED = (dQ/dP) * (P/Q) = -3 * (20 / 60) = -3 * (1/3) = -1.0. Trị tuyệt đối |PED| = 1.0 (Co giãn đơn vị).",
        created_at="2026-07-25T12:09:00Z",
    )
    await session.merge(q_m1_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-5-1",
            question_id="q-m1-05",
            option_text="-1.00 (Co giãn đơn vị)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-5-2",
            question_id="q-m1-05",
            option_text="-0.50 (Kém co giãn)",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-5-3",
            question_id="q-m1-05",
            option_text="-2.00 (Co giãn nhiều)",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm1-5-4",
            question_id="q-m1-05",
            option_text="-3.00 (Hoàn toàn co giãn)",
            is_correct=False,
            order_index=3,
        )
    )

    qm_micro_1 = QuizMatrixModel(
        item_id="item-micro-q1",
        bank_id="qb-micro-01",
        time_limit_minutes=25,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_micro_1)

    # qb-micro-02 (Final exam Course 4: 5 questions)
    qb_micro_2 = QuestionBankModel(
        id="qb-micro-02",
        course_id="course-microeconomics-foundations",
        title="Ngân hàng câu hỏi: Đề thi Kinh tế Vi mô Toàn diện",
        category="GRADED",
        description="Đề thi tổng hợp kiến thức Cung Cầu, Thặng dư và Độ co giãn.",
        created_at="2026-07-25T12:20:00Z",
    )
    await session.merge(qb_micro_2)

    q_m2_1 = QuestionModel(
        id="q-m2-01",
        bank_id="qb-micro-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Thặng dư Người Tiêu dùng (Consumer Surplus - CS) phản ánh điều gì trên thị trường?",
        explanation="Thặng dư tiêu dùng là chênh lệch giữa mức giá cao nhất người mua sẵn sàng trả (WTP) và mức giá thực tế họ phải trả trên thị trường (P*).",
        created_at="2026-07-25T12:21:00Z",
    )
    await session.merge(q_m2_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-1-1",
            question_id="q-m2-01",
            option_text="Chênh lệch giữa giá sẵn lòng trả và giá thị trường thực tế",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-1-2",
            question_id="q-m2-01",
            option_text="Tổng lợi nhuận ròng của các doanh nghiệp sản xuất",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-1-3",
            question_id="q-m2-01",
            option_text="Khoản tiền hoàn thuế giá trị gia tăng từ chính phủ",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-1-4",
            question_id="q-m2-01",
            option_text="Chi phí cơ hội của việc sản xuất hàng hóa",
            is_correct=False,
            order_index=3,
        )
    )

    q_m2_2 = QuestionModel(
        id="q-m2-02",
        bank_id="qb-micro-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Thặng dư Nhà Sản xuất (Producer Surplus - PS) được tính bằng diện tích vùng hình học nào trên đồ thị Cung - Cầu?",
        explanation="Thặng dư nhà sản xuất là diện tích nằm phía trên đường cung và phía dưới đường giá thị trường P*.",
        created_at="2026-07-25T12:22:00Z",
    )
    await session.merge(q_m2_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-2-1",
            question_id="q-m2-02",
            option_text="Nằm phía trên đường Cung và phía dưới đường Giá thị trường",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-2-2",
            question_id="q-m2-02",
            option_text="Nằm phía dưới đường Cầu và phía dưới trục hoành",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-2-3",
            question_id="q-m2-02",
            option_text="Nằm phía trên đường Cầu và phía trên đường Giá thị trường",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-2-4",
            question_id="q-m2-02",
            option_text="Nằm hoàn toàn bên ngoài giao điểm cân bằng thị trường",
            is_correct=False,
            order_index=3,
        )
    )

    q_m2_3 = QuestionModel(
        id="q-m2-03",
        bank_id="qb-micro-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Khi chính phủ can thiệp áp đặt Giá trần (Price Ceiling) thấp hơn mức giá cân bằng tự do, hậu quả kinh tế trực tiếp là gì?",
        explanation="Giá trần thấp hơn giá cân bằng (Pc < P*) kích thích lượng cầu tăng cao nhưng lại hạn chế người bán sản xuất (Qs < Qd), dẫn đến tình trạng khan hiếm hàng hóa và tổn thất vô ích DWL.",
        created_at="2026-07-25T12:23:00Z",
    )
    await session.merge(q_m2_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-3-1",
            question_id="q-m2-03",
            option_text="Tạo ra tình trạng thiếu hụt hàng hóa (Shortage) và tổn thất phúc lợi xã hội (DWL)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-3-2",
            question_id="q-m2-03",
            option_text="Tạo ra tình trạng dư thừa hàng hóa tồn kho khổng lồ",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-3-3",
            question_id="q-m2-03",
            option_text="Làm tăng tổng phúc lợi xã hội lên mức tối ưu Pareto",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-3-4",
            question_id="q-m2-03",
            option_text="Giúp tất cả các nhà sản xuất gia tăng biên lợi nhuận",
            is_correct=False,
            order_index=3,
        )
    )

    q_m2_4 = QuestionModel(
        id="q-m2-04",
        bank_id="qb-micro-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Tại sao chính sách giá trần vé máy bay nội địa dịp Tết Nguyên đán lại khiến người tiêu dùng vẫn phải chịu chi phí tìm kiếm (Search Cost) rất cao?",
        explanation="Vì giá trần gây ra thiếu hụt vé chính thức trầm trọng, người tiêu dùng phải tốn thời gian thức đêm canh vé, trả phí chênh lệch cho đại lý chợ đen hoặc chuyển sang phương tiện kém an toàn hơn.",
        created_at="2026-07-25T12:24:00Z",
    )
    await session.merge(q_m2_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-4-1",
            question_id="q-m2-04",
            option_text="Sự thiếu hụt vé giá rẻ buộc khách hàng phải xếp hàng, canh giờ và mua lại qua trung gian chợ đen với phí ngầm",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-4-2",
            question_id="q-m2-04",
            option_text="Các hãng hàng không phát miễn phí vé cho tất cả mọi người",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-4-3",
            question_id="q-m2-04",
            option_text="Máy bay bị thừa ghế trống nên hãng phải hủy chuyến",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-4-4",
            question_id="q-m2-04",
            option_text="Chi phí nhiên liệu bay giảm về 0",
            is_correct=False,
            order_index=3,
        )
    )

    q_m2_5 = QuestionModel(
        id="q-m2-05",
        bank_id="qb-micro-02",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Cho hàm cầu P = 100 - 2Q và mức giá cân bằng thị trường là P* = 40 (sản lượng Q* = 30). Thặng dư Người Tiêu dùng (Consumer Surplus) bằng bao nhiêu?",
        explanation="Đường cầu cắt trục tung tại P_max = 100. Khoảng cách (P_max - P*) = 100 - 40 = 60. Sản lượng Q* = 30. Thặng dư tiêu dùng CS = 1/2 * đáy * cao = 1/2 * 30 * 60 = 900 đơn vị tiền tệ.",
        created_at="2026-07-25T12:25:00Z",
    )
    await session.merge(q_m2_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-5-1",
            question_id="q-m2-05",
            option_text="900",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-5-2",
            question_id="q-m2-05",
            option_text="1,800",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-5-3",
            question_id="q-m2-05",
            option_text="450",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qm2-5-4",
            question_id="q-m2-05",
            option_text="1,200",
            is_correct=False,
            order_index=3,
        )
    )

    qm_micro_2 = QuizMatrixModel(
        item_id="item-micro-q2",
        bank_id="qb-micro-02",
        time_limit_minutes=30,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_micro_2)

    # =====================================================================
    # Question Banks & Quizzes for Course 5: Applied Econometrics
    # =====================================================================
    qb_econ_1 = QuestionBankModel(
        id="qb-econ-01",
        course_id="course-applied-econometrics",
        title="Ngân hàng câu hỏi: Hồi quy Ước lượng Hàm Cầu",
        category="GRADED",
        description="Bộ câu hỏi về phương pháp OLS và mô hình Log-Log.",
        created_at="2026-07-25T12:30:00Z",
    )
    await session.merge(qb_econ_1)

    # qb-econ-01 Questions (5 questions: 2 Easy, 2 Medium, 1 Hard)
    q_e1_1 = QuestionModel(
        id="q-e1-01",
        bank_id="qb-econ-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Mục tiêu tối ưu hóa cơ bản của phương pháp Hồi quy Tuyến tính Bình phương Tối thiểu (OLS) là gì?",
        explanation="OLS tìm kiếm đường thẳng hồi quy sao cho tổng bình phương các phần dư (Residual Sum of Squares - RSS) giữa giá trị thực tế y và giá trị dự báo y_hat là nhỏ nhất.",
        created_at="2026-07-25T12:31:00Z",
    )
    await session.merge(q_e1_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-1-1",
            question_id="q-e1-01",
            option_text="Tối thiểu hóa Tổng bình phương phần dư (RSS)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-1-2",
            question_id="q-e1-01",
            option_text="Tối đa hóa phương sai của sai số",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-1-3",
            question_id="q-e1-01",
            option_text="Tối thiểu hóa số lượng mẫu quan sát",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-1-4",
            question_id="q-e1-01",
            option_text="Tối đa hóa khoảng cách giữa các điểm dữ liệu",
            is_correct=False,
            order_index=3,
        )
    )

    q_e1_2 = QuestionModel(
        id="q-e1-02",
        bank_id="qb-econ-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Tại sao các nhà kinh tế lượng thường áp dụng phép biến đổi Logarit tự nhiên (ln) đối với dữ liệu giá và sản lượng?",
        explanation="Biến đổi Logarit giúp biến quan hệ phi tuyến thành tuyến tính, làm mềm phân phối lệch phải và cho phép diễn giải các hệ số ước lượng dưới dạng độ co giãn đàn hồi theo tỷ lệ phần trăm.",
        created_at="2026-07-25T12:32:00Z",
    )
    await session.merge(q_e1_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-2-1",
            question_id="q-e1-02",
            option_text="Để hệ số góc beta trực tiếp biểu diễn độ co giãn phần trăm (Elasticity)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-2-2",
            question_id="q-e1-02",
            option_text="Để biến số tiền tệ luôn nhận giá trị âm",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-2-3",
            question_id="q-e1-02",
            option_text="Để loại bỏ hoàn toàn nhu cầu thu thập dữ liệu",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-2-4",
            question_id="q-e1-02",
            option_text="Để tăng số lượng quan sát lên gấp đôi",
            is_correct=False,
            order_index=3,
        )
    )

    q_e1_3 = QuestionModel(
        id="q-e1-03",
        bank_id="qb-econ-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Trong mô hình hồi quy Log-Log: ln(Q) = 5.2 - 1.65 * ln(P) + epsilon, nếu giá bán tăng 10%, lượng cầu dự kiến sẽ thay đổi như thế nào?",
        explanation="Trong mô hình Log-Log, hệ số -1.65 chính là độ co giãn PED. Lượng cầu thay đổi % delta Q = beta1 * % delta P = -1.65 * 10% = -16.5% (giảm 16.5%).",
        created_at="2026-07-25T12:33:00Z",
    )
    await session.merge(q_e1_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-3-1",
            question_id="q-e1-03",
            option_text="Lượng cầu giảm 16.5%",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-3-2",
            question_id="q-e1-03",
            option_text="Lượng cầu tăng 16.5%",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-3-3",
            question_id="q-e1-03",
            option_text="Lượng cầu giảm đúng 1.65 đơn vị sản phẩm",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-3-4",
            question_id="q-e1-03",
            option_text="Lượng cầu không thay đổi",
            is_correct=False,
            order_index=3,
        )
    )

    q_e1_4 = QuestionModel(
        id="q-e1-04",
        bank_id="qb-econ-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Một hệ số hồi quy beta có giá trị p-value = 0.002 với mức ý nghĩa alpha = 0.05. Kết luận nào sau đây là chính xác?",
        explanation="Vì p-value (0.002) nhỏ hơn alpha (0.05), chúng ta bác bỏ giả thuyết vô hiệu H0: beta = 0. Biến độc lập có ý nghĩa thống kê giải thích cho biến phụ thuộc.",
        created_at="2026-07-25T12:34:00Z",
    )
    await session.merge(q_e1_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-4-1",
            question_id="q-e1-04",
            option_text="Bác bỏ H0; biến độc lập có ý nghĩa thống kê cao đối với biến phụ thuộc",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-4-2",
            question_id="q-e1-04",
            option_text="Chấp nhận H0; biến độc lập không ảnh hưởng gì tới mô hình",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-4-3",
            question_id="q-e1-04",
            option_text="Mô hình bị sai lệch hoàn toàn và cần loại bỏ biến này",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-4-4",
            question_id="q-e1-04",
            option_text="Độ chính xác của thuật toán chỉ đạt 0.2%",
            is_correct=False,
            order_index=3,
        )
    )

    q_e1_5 = QuestionModel(
        id="q-e1-05",
        bank_id="qb-econ-01",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Khi kiểm định Breusch-Pagan phát hiện dữ liệu bán lẻ vi phạm giả định phương sai đồng nhất (Heteroskedasticity), biện pháp khắc phục chuẩn mực nhất trong kinh tế lượng hiện đại là gì?",
        explanation="Để giải quyết phương sai thay đổi mà không làm thay đổi tính không chệch của hệ số OLS, người ta sử dụng Sai số chuẩn vững White (White Robust Standard Errors / HC1 covariance matrix).",
        created_at="2026-07-25T12:35:00Z",
    )
    await session.merge(q_e1_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-5-1",
            question_id="q-e1-05",
            option_text="Sử dụng Sai số chuẩn Vững White (White Robust Standard Errors / HC1)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-5-2",
            question_id="q-e1-05",
            option_text="Xóa bỏ một nửa tập dữ liệu một cách ngẫu nhiên",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-5-3",
            question_id="q-e1-05",
            option_text="Đảo ngược biến phụ thuộc thành biến độc lập",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe1-5-4",
            question_id="q-e1-05",
            option_text="Bỏ qua và coi như không có chuyện gì xảy ra",
            is_correct=False,
            order_index=3,
        )
    )

    qm_econ_1 = QuizMatrixModel(
        item_id="item-econ-q1",
        bank_id="qb-econ-01",
        time_limit_minutes=25,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_econ_1)

    # qb-econ-02 (Final exam Course 5: 5 questions)
    qb_econ_2 = QuestionBankModel(
        id="qb-econ-02",
        course_id="course-applied-econometrics",
        title="Ngân hàng câu hỏi: Đề thi Kinh tế lượng Ứng dụng",
        category="GRADED",
        description="Đề thi cuối khóa Kinh tế lượng và phân tích dữ liệu bán lẻ.",
        created_at="2026-07-25T12:40:00Z",
    )
    await session.merge(qb_econ_2)

    q_e2_1 = QuestionModel(
        id="q-e2-01",
        bank_id="qb-econ-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Hệ số Xác định R-squared (R2) bằng 0.784 trong mô hình hàm cầu có ý nghĩa gì?",
        explanation="R2 đo lường tỷ lệ phần trăm biến thiên của biến phụ thuộc (lượng cầu) được giải thích bởi các biến độc lập trong mô hình (78.4%).",
        created_at="2026-07-25T12:41:00Z",
    )
    await session.merge(q_e2_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-1-1",
            question_id="q-e2-01",
            option_text="78.4% sự biến thiên của lượng cầu được giải thích bởi các biến trong mô hình",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-1-2",
            question_id="q-e2-01",
            option_text="Mô hình có 78.4% khả năng bị sai sót dữ liệu",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-1-3",
            question_id="q-e2-01",
            option_text="Hệ số co giãn của cầu đúng bằng 0.784",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-1-4",
            question_id="q-e2-01",
            option_text="Lợi nhuận của doanh nghiệp tăng 78.4%",
            is_correct=False,
            order_index=3,
        )
    )

    q_e2_2 = QuestionModel(
        id="q-e2-02",
        bank_id="qb-econ-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Biến giả (Dummy Variable) nhận giá trị nhị phân nào để thể hiện trạng thái đối tượng?",
        explanation="Biến giả (Dummy Variable) nhận giá trị 1 khi có sự hiện diện của đặc tính/sự kiện và nhận giá trị 0 khi không có.",
        created_at="2026-07-25T12:42:00Z",
    )
    await session.merge(q_e2_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-2-1",
            question_id="q-e2-02",
            option_text="Nhận giá trị 0 hoặc 1",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-2-2",
            question_id="q-e2-02",
            option_text="Nhận giá trị liên tục từ -1 đến +1",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-2-3",
            question_id="q-e2-02",
            option_text="Chỉ nhận giá trị phần trăm từ 0% đến 100%",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-2-4",
            question_id="q-e2-02",
            option_text="Nhận bất kỳ giá trị thực dương nào",
            is_correct=False,
            order_index=3,
        )
    )

    q_e2_3 = QuestionModel(
        id="q-e2-03",
        bank_id="qb-econ-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Ưu điểm vượt trội của phương pháp Sai biệt kép (Difference-in-Differences - DiD) so với việc chỉ so sánh Trước - Sau là gì?",
        explanation="DiD loại bỏ được các yếu tố gây nhiễu biến thiên theo thời gian (như xu hướng tăng trưởng tự nhiên, yếu tố mùa vụ Tết) nhờ có Nhóm Đối chứng (Control Group).",
        created_at="2026-07-25T12:43:00Z",
    )
    await session.merge(q_e2_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-3-1",
            question_id="q-e2-03",
            option_text="Triệt tiêu yếu tố xu hướng thị trường và mùa vụ nhờ nhóm đối chứng, bóc tách tác động nhân quả thuần túy",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-3-2",
            question_id="q-e2-03",
            option_text="Không cần phải thu thập dữ liệu nhóm can thiệp",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-3-3",
            question_id="q-e2-03",
            option_text="Đảm bảo hệ số hồi quy luôn mang giá trị dương",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-3-4",
            question_id="q-e2-03",
            option_text="Cho phép bỏ qua các giả định của OLS",
            is_correct=False,
            order_index=3,
        )
    )

    q_e2_4 = QuestionModel(
        id="q-e2-04",
        bank_id="qb-econ-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Trong mô hình DiD: Y = beta0 + beta1*Treat + beta2*Post + beta3*(Treat*Post) + e, hệ số beta3 đại diện cho điều gì?",
        explanation="Hệ số tương tác beta3 là ước lượng Sai biệt kép (Difference-in-Differences estimator), đại diện cho tác động can thiệp nhân quả thuần túy của chương trình đối với nhóm đối tượng tham gia.",
        created_at="2026-07-25T12:44:00Z",
    )
    await session.merge(q_e2_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-4-1",
            question_id="q-e2-04",
            option_text="Tác động nhân quả thực sự của chiến dịch can thiệp (Causal Treatment Effect)",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-4-2",
            question_id="q-e2-04",
            option_text="Chênh lệch ban đầu giữa hai nhóm trước khi can thiệp",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-4-3",
            question_id="q-e2-04",
            option_text="Mức tăng trưởng tự nhiên của nhóm đối chứng",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-4-4",
            question_id="q-e2-04",
            option_text="Mức giá khởi điểm trung bình của thị trường",
            is_correct=False,
            order_index=3,
        )
    )

    q_e2_5 = QuestionModel(
        id="q-e2-05",
        bank_id="qb-econ-02",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Giả định Xu hướng Song song (Parallel Trends Assumption) trong phương pháp DiD đòi hỏi điều gì?",
        explanation="Giả định này yêu cầu nếu không có can thiệp diễn ra, khoảng cách sai biệt giữa nhóm Treatment và nhóm Control phải giữ nguyên không đổi theo thời gian (hai nhóm biến thiên song song).",
        created_at="2026-07-25T12:45:00Z",
    )
    await session.merge(q_e2_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-5-1",
            question_id="q-e2-05",
            option_text="Nếu không có can thiệp, xu hướng biến thiên theo thời gian của nhóm Can thiệp và Đối chứng phải song song với nhau",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-5-2",
            question_id="q-e2-05",
            option_text="Hai nhóm phải có cùng mức giá tuyệt đối bằng nhau tại mọi thời điểm",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-5-3",
            question_id="q-e2-05",
            option_text="Số lượng quan sát của hai nhóm bắt buộc phải bằng chẵn 10.000",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qe2-5-4",
            question_id="q-e2-05",
            option_text="Đường hồi quy phải nằm ngang song song trục hoành",
            is_correct=False,
            order_index=3,
        )
    )

    qm_econ_2 = QuizMatrixModel(
        item_id="item-econ-q2",
        bank_id="qb-econ-02",
        time_limit_minutes=30,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_econ_2)

    # =====================================================================
    # Question Banks & Quizzes for Course 6: Behavioral Pricing Strategy
    # =====================================================================
    qb_pricing_1 = QuestionBankModel(
        id="qb-pricing-01",
        course_id="course-behavioral-pricing-strategy",
        title="Ngân hàng câu hỏi: Tâm lý Học Hành vi trong Định giá",
        category="GRADED",
        description="Câu hỏi về hiệu ứng chim mồi, mỏ neo và ác cảm mất mát.",
        created_at="2026-07-25T12:50:00Z",
    )
    await session.merge(qb_pricing_1)

    # qb-pricing-01 Questions (5 questions: 2 Easy, 2 Medium, 1 Hard)
    q_p1_1 = QuestionModel(
        id="q-p1-01",
        bank_id="qb-pricing-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Theo Lý thuyết Triển vọng (Prospect Theory), con người có xu hướng 'Ác cảm mất mát' (Loss Aversion). Điều này có nghĩa là gì?",
        explanation="Nỗi đau tâm lý khi mất một số tiền lớn hơn gấp 2 đến 2.5 lần niềm vui khi nhận được một khoản tiền có giá trị tương đương.",
        created_at="2026-07-25T12:51:00Z",
    )
    await session.merge(q_p1_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-1-1",
            question_id="q-p1-01",
            option_text="Nỗi đau khi mất một số tiền đau đớn gấp 2 đến 2.5 lần niềm vui khi kiếm được số tiền đó",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-1-2",
            question_id="q-p1-01",
            option_text="Con người luôn sẵn sàng đánh đổi mọi thứ để nhận rủi ro",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-1-3",
            question_id="q-p1-01",
            option_text="Cảm xúc con người hoàn toàn đối xứng giữa lãi và lỗ",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-1-4",
            question_id="q-p1-01",
            option_text="Con người chỉ quan tâm đến giá trị tài sản ròng tuyệt đối",
            is_correct=False,
            order_index=3,
        )
    )

    q_p1_2 = QuestionModel(
        id="q-p1-02",
        bank_id="qb-pricing-01",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Hiệu ứng Mỏ neo (Anchoring Effect) trong định giá bán lẻ hoạt động như thế nào?",
        explanation="Con số đầu tiên người tiêu dùng tiếp cận (mỏ neo ban đầu) sẽ chi phối toàn bộ đánh giá giá trị và sự sẵn sàng chi trả của họ cho các sản phẩm kế tiếp.",
        created_at="2026-07-25T12:52:00Z",
    )
    await session.merge(q_p1_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-2-1",
            question_id="q-p1-02",
            option_text="Con số đầu tiên xuất hiện sẽ trở thành điểm tham chiếu tâm lý cho mọi phán xét sau đó",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-2-2",
            question_id="q-p1-02",
            option_text="Giá bán luôn bị neo cố định bởi cơ quan quản lý giá nhà nước",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-2-3",
            question_id="q-p1-02",
            option_text="Tàu thuyền phải thả neo trước khi giao dịch thương mại",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-2-4",
            question_id="q-p1-02",
            option_text="Người tiêu dùng chỉ mua hàng có mức giá thấp nhất có thể",
            is_correct=False,
            order_index=3,
        )
    )

    q_p1_3 = QuestionModel(
        id="q-p1-03",
        bank_id="qb-pricing-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Mục đích cốt lõi của 'Gói Chim Mồi' (Decoy Option) trong cấu trúc bảng giá 3 tầng là gì?",
        explanation="Gói chim mồi là một lựa chọn bất đối xứng kém hấp dẫn, tồn tại chỉ để tôn vinh và thúc đẩy khách hàng chọn gói mục tiêu cao cấp mà doanh nghiệp muốn bán.",
        created_at="2026-07-25T12:53:00Z",
    )
    await session.merge(q_p1_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-3-1",
            question_id="q-p1-03",
            option_text="Làm cho gói mục tiêu cao cấp trở nên hấp dẫn vượt trội trong mắt người mua",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-3-2",
            question_id="q-p1-03",
            option_text="Bán được thật nhiều sản phẩm chim mồi để thu tiền lẻ",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-3-3",
            question_id="q-p1-03",
            option_text="Giảm thiểu chi phí sản xuất phần mềm xuống mức 0",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-3-4",
            question_id="q-p1-03",
            option_text="Tránh bị đối thủ cạnh tranh kiện tụng bán phá giá",
            is_correct=False,
            order_index=3,
        )
    )

    q_p1_4 = QuestionModel(
        id="q-p1-04",
        bank_id="qb-pricing-01",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Tại sao chiến lược Cho dùng thử Miễn phí 30 ngày (30-day Free Trial) lại mang lại tỷ lệ chuyển đổi trả phí rất cao cho các ứng dụng SaaS?",
        explanation="Kích hoạt Hiệu ứng Sở hữu (Endowment Effect). Khi đã quen thuộc và cá nhân hóa tài khoản sau 30 ngày, việc hủy bỏ bị tâm lý xem như là một tổn thất mất mát tài sản cá nhân.",
        created_at="2026-07-25T12:54:00Z",
    )
    await session.merge(q_p1_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-4-1",
            question_id="q-p1-04",
            option_text="Kích hoạt Hiệu ứng Sở hữu (Endowment Effect), biến việc dừng dịch vụ thành nỗi đau mất mát tài sản",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-4-2",
            question_id="q-p1-04",
            option_text="Khách hàng bị khóa thẻ ngân hàng bắt buộc phải trả tiền",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-4-3",
            question_id="q-p1-04",
            option_text="Phần mềm tự động hết hạn và xóa sạch máy tính",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-4-4",
            question_id="q-p1-04",
            option_text="Người dùng quên mất mình đã từng đăng ký tài khoản",
            is_correct=False,
            order_index=3,
        )
    )

    q_p1_5 = QuestionModel(
        id="q-p1-05",
        bank_id="qb-pricing-01",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Trong thí nghiệm tạp chí The Economist của Dan Ariely, khi loại bỏ gói 'Báo in 125 USD' (Chim mồi), tỷ lệ lựa chọn gói 'Cả báo in và điện tử 125 USD' thay đổi như thế nào?",
        explanation="Khi bỏ chim mồi, tỷ lệ chọn gói 125 USD tụt dốc thảm hại từ 84% xuống chỉ còn 32%, đa số người dùng (68%) quay về chọn gói rẻ nhất 59 USD.",
        created_at="2026-07-25T12:55:00Z",
    )
    await session.merge(q_p1_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-5-1",
            question_id="q-p1-05",
            option_text="Sụt giảm mạnh từ 84% xuống còn 32%",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-5-2",
            question_id="q-p1-05",
            option_text="Tăng vọt từ 84% lên 100%",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-5-3",
            question_id="q-p1-05",
            option_text="Hoàn toàn không thay đổi",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp1-5-4",
            question_id="q-p1-05",
            option_text="Giảm nhẹ từ 84% xuống 80%",
            is_correct=False,
            order_index=3,
        )
    )

    qm_pricing_1 = QuizMatrixModel(
        item_id="item-pricing-q1",
        bank_id="qb-pricing-01",
        time_limit_minutes=25,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_pricing_1)

    # qb-pricing-02 (Final exam Course 6: 5 questions)
    qb_pricing_2 = QuestionBankModel(
        id="qb-pricing-02",
        course_id="course-behavioral-pricing-strategy",
        title="Ngân hàng câu hỏi: Đề thi Chiến lược Định giá Toàn diện",
        category="GRADED",
        description="Đề thi cuối khóa về định giá động và chỉ số Lerner.",
        created_at="2026-07-25T13:00:00Z",
    )
    await session.merge(qb_pricing_2)

    q_p2_1 = QuestionModel(
        id="q-p2-01",
        bank_id="qb-pricing-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Chiến lược Đóng gói Giá trị (Price Bundling) dạng Combo hỗn hợp (Mixed Bundling) cho phép khách hàng làm gì?",
        explanation="Mixed Bundling cho phép khách hàng được tự do lựa chọn mua riêng lẻ từng món theo giá niêm yết hoặc mua trọn gói combo với mức giá ưu đãi.",
        created_at="2026-07-25T13:01:00Z",
    )
    await session.merge(q_p2_1)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-1-1",
            question_id="q-p2-01",
            option_text="Lựa chọn mua lẻ từng món hoặc mua trọn gói combo với mức giá chiết khấu",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-1-2",
            question_id="q-p2-01",
            option_text="Bắt buộc phải mua tất cả các sản phẩm của cửa hàng",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-1-3",
            question_id="q-p2-01",
            option_text="Chỉ được phép mua tối đa một sản phẩm duy nhất",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-1-4",
            question_id="q-p2-01",
            option_text="Đổi sản phẩm lấy hàng hóa của người khác không dùng tiền",
            is_correct=False,
            order_index=3,
        )
    )

    q_p2_2 = QuestionModel(
        id="q-p2-02",
        bank_id="qb-pricing-02",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        text="Chỉ số Lerner (Lerner Index: L = (P - MC) / P) đo lường điều gì của doanh nghiệp trên thị trường?",
        explanation="Chỉ số Lerner đo lường mức độ sức mạnh thị trường (Market Power) của doanh nghiệp: khả năng định giá vượt lên trên chi phí sản xuất biên MC.",
        created_at="2026-07-25T13:02:00Z",
    )
    await session.merge(q_p2_2)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-2-1",
            question_id="q-p2-02",
            option_text="Sức mạnh thị trường và mức độ định giá vượt chi phí cận biên MC",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-2-2",
            question_id="q-p2-02",
            option_text="Tỷ lệ nợ trên vốn chủ sở hữu của doanh nghiệp",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-2-3",
            question_id="q-p2-02",
            option_text="Số lượng nhân sự đang làm việc trong công ty",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-2-4",
            question_id="q-p2-02",
            option_text="Chi phí khấu hao tài sản cố định hàng năm",
            is_correct=False,
            order_index=3,
        )
    )

    q_p2_3 = QuestionModel(
        id="q-p2-03",
        bank_id="qb-pricing-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Mối liên hệ giữa Chỉ số Lerner (L) và Độ co giãn Cầu theo Giá (PED) được xác lập qua công thức nào?",
        explanation="Theo lý thuyết định giá tối ưu, L = (P - MC)/P = -1 / PED.",
        created_at="2026-07-25T13:03:00Z",
    )
    await session.merge(q_p2_3)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-3-1",
            question_id="q-p2-03",
            option_text="L = -1 / PED",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-3-2",
            question_id="q-p2-03",
            option_text="L = PED^2",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-3-3",
            question_id="q-p2-03",
            option_text="L = 1 + PED",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-3-4",
            question_id="q-p2-03",
            option_text="L = PED / (1 - PED)",
            is_correct=False,
            order_index=3,
        )
    )

    q_p2_4 = QuestionModel(
        id="q-p2-04",
        bank_id="qb-pricing-02",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        text="Khi hệ số co giãn cầu theo giá của khách hàng trở nên ít co giãn hơn (|PED| giảm từ 2.5 xuống 1.2 vào giờ mưa bão), thuật toán Surge Pricing của Grab sẽ làm gì?",
        explanation="Hệ số Markup = PED / (PED + 1). Khi |PED| giảm (khách hàng ít nhạy cảm với giá hơn), hệ số nhân giá Markup tăng lên, thuật toán sẽ tăng giá cước chuyến đi.",
        created_at="2026-07-25T13:04:00Z",
    )
    await session.merge(q_p2_4)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-4-1",
            question_id="q-p2-04",
            option_text="Tăng giá cước (Surge Pricing) vì người dùng ít nhạy cảm với giá hơn",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-4-2",
            question_id="q-p2-04",
            option_text="Giảm giá cước để thu hút thêm người đi xe",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-4-3",
            question_id="q-p2-04",
            option_text="Giữ nguyên giá cước không thay đổi",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-4-4",
            question_id="q-p2-04",
            option_text="Ngừng cung cấp toàn bộ dịch vụ xe",
            is_correct=False,
            order_index=3,
        )
    )

    q_p2_5 = QuestionModel(
        id="q-p2-05",
        bank_id="qb-pricing-02",
        question_type="SINGLE_CHOICE",
        difficulty="HARD",
        text="Một công ty dịch vụ đám mây có chi phí cận biên cung cấp thêm 1 GB dung lượng là MC = 60.000 VNĐ. Kết quả hồi quy kinh tế lượng cho thấy độ co giãn cầu của nhóm khách hàng doanh nghiệp là PED = -1.5. Áp dụng quy tắc định giá tối ưu P* = MC * [PED / (PED + 1)], mức giá tối ưu P* là bao nhiêu?",
        explanation="Markup Factor = -1.5 / (-1.5 + 1) = -1.5 / -0.5 = 3.0. Mức giá tối ưu P* = MC * 3.0 = 60.000 * 3.0 = 180.000 VNĐ.",
        created_at="2026-07-25T13:05:00Z",
    )
    await session.merge(q_p2_5)
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-5-1",
            question_id="q-p2-05",
            option_text="180.000 VNĐ",
            is_correct=True,
            order_index=0,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-5-2",
            question_id="q-p2-05",
            option_text="120.000 VNĐ",
            is_correct=False,
            order_index=1,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-5-3",
            question_id="q-p2-05",
            option_text="90.000 VNĐ",
            is_correct=False,
            order_index=2,
        )
    )
    await session.merge(
        QuestionOptionModel(
            id="opt-qp2-5-4",
            question_id="q-p2-05",
            option_text="240.000 VNĐ",
            is_correct=False,
            order_index=3,
        )
    )

    qm_pricing_2 = QuizMatrixModel(
        item_id="item-pricing-q2",
        bank_id="qb-pricing-02",
        time_limit_minutes=30,
        passing_threshold_percent=80.0,
        easy_count=2,
        medium_count=2,
        hard_count=1,
        shuffle_options=True,
    )
    await session.merge(qm_pricing_2)
