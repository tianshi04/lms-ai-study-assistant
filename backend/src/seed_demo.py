"""Database Seeding Script for Clean Demo Environment.

Usage:
  - Full Clean Reset:  uv run python src/seed_demo.py --reset
"""

# ruff: noqa: E402, F401

import argparse
import asyncio
import json
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import delete, select, text
from src.shared.infrastructure.database import Base, async_session_scope
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    CategoryModel,
    WeekModuleModel,
    LessonModel,
    LearningItemModel,
    ItemType,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    CourseReviewModel
)
from src.modules.forum.infrastructure.models import ForumThreadORM, ForumReplyORM
from src.modules.identity.application.identity_usecase import hash_password
from src.modules.identity.domain.entities import UserRole
from src.modules.identity.infrastructure.models import UserModel
from src.modules.partner.infrastructure.models import PartnerModel
from src.modules.learning.infrastructure.models import LearningProgressModel
from src.modules.certificate.infrastructure.models import FinancialAidModel
from src.modules.assessment.infrastructure.models import (
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizMatrixModel,
    QuizSubmissionModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel
)

from src.shared.infrastructure.logging import setup_logging

setup_logging()
logger = logging.getLogger("seed_demo")


async def load_demo_data(session):
    data_dir = Path(__file__).resolve().parent.parent / "data" / "demo_data"
    
    # Load users
    with open(data_dir / "users.json", "r") as f:
        users_data = json.load(f)
        
    default_pw = hash_password("123456")
    for u in users_data:
        role = UserRole.LEARNER
        if u["role"] == "INSTRUCTOR": role = UserRole.INSTRUCTOR
        elif u["role"] == "ADMIN": role = UserRole.ADMIN
        
        user = UserModel(
            id=u["id"],
            email=u["email"],
            full_name=u["full_name"],
            role=role,
            avatar_url=u["avatar_url"],
            password_hash=default_pw,
            title=u.get("title", ""),
            signature_image_url=u.get("signature_image_url", "")
        )
        await session.merge(user)
        logger.info(f"Loaded User: {u['full_name']} ({u['role']})")

    # Load catalog
    with open(data_dir / "catalog.json", "r") as f:
        catalog_data = json.load(f)

    for cat in catalog_data.get("categories", []):
        await session.merge(CategoryModel(**cat))

    for p in catalog_data.get("partners", []):
        await session.merge(PartnerModel(**p))

    for c in catalog_data.get("courses", []):
        course = CourseModel(
            id=c["id"],
            title=c["title"],
            slug=c["slug"],
            description=c["description"],
            partner_name=c["partner_name"],
            partner_logo_url=c["partner_logo_url"],
            instructor_names=c["instructor_names"],
            owner_id=c["owner_id"],
            subject=c["subject"],
            level=c["level"],
            status=c["status"]
        )
        
        for w in c.get("weeks", []):
            week = WeekModuleModel(
                id=w["id"],
                course_id=course.id,
                week_number=w["week_number"],
                title=w["title"],
                summary=w["summary"]
            )
            for l in w.get("lessons", []):
                lesson = LessonModel(
                    id=l["id"],
                    week_module_id=week.id,
                    title=l["title"],
                    estimated_minutes=l["estimated_minutes"]
                )
                for item_data in l.get("items", []):
                    itype = getattr(ItemType, item_data["type"])
                    item = LearningItemModel(
                        id=item_data["id"],
                        lesson_id=lesson.id,
                        title=item_data["title"],
                        type=itype,
                        estimated_minutes=item_data.get("estimated_minutes", 10),
                        video_url=item_data.get("video_url", ""),
                        reading_markdown=item_data.get("reading_markdown", ""),
                        quiz_matrix_id=item_data.get("quiz_matrix_id", ""),
                        language=item_data.get("language", ""),
                        starter_code=item_data.get("starter_code", ""),
                        test_cases_json=item_data.get("test_cases_json", "")
                    )
                    
                    for t in item_data.get("transcripts", []):
                        item.interactive_transcripts.append(InteractiveTranscriptModel(**t))
                    for q in item_data.get("quizzes", []):
                        item.in_video_quizzes.append(InVideoQuizModel(**q))

                    lesson.items.append(item)
                week.lessons.append(lesson)
            course.week_modules.append(week)
        
        await session.merge(course)
        logger.info(f"Loaded Course: {c['title']}")

    for prog in catalog_data.get("progress", []):
        progress = LearningProgressModel(
            id=f"{prog['user_id']}:{prog['course_id']}",
            user_id=prog["user_id"],
            course_id=prog["course_id"],
            overall_progress_percent=prog["overall_progress_percent"],
            completed_item_ids=prog["completed_item_ids"]
        )
        await session.merge(progress)
        logger.info(f"Loaded Progress for {prog['user_id']} on {prog['course_id']}")

        # Grant Financial Aid to bypass Audit Mode
        fa = FinancialAidModel(
            id=f"fa-{prog['user_id']}-{prog['course_id']}",
            user_id=prog["user_id"],
            course_id=prog["course_id"],
            essay_150_words="Demo Auto-Approved Financial Aid for bypassing Audit Mode.",
            status="APPROVED",
            review_deadline_days_left=0
        )
        await session.merge(fa)

    # Load social data
    social_file = data_dir / "social.json"
    if social_file.exists():
        with open(social_file, "r") as f:
            social_data = json.load(f)
            
        now_str = datetime.now(timezone.utc).isoformat()
        
        for rev in social_data.get("reviews", []):
            review = CourseReviewModel(
                id=uuid.uuid4().hex,
                course_id=rev["course_id"],
                user_id=rev["user_id"],
                user_name="Demo User",  # Fallback since we don't look up the name here
                rating_stars=rev["rating"],
                comment_text=rev["comment"],
                created_at=now_str
            )
            await session.merge(review)
            
        for thread in social_data.get("threads", []):
            t_model = ForumThreadORM(
                id=uuid.uuid4().hex,
                course_id=thread["course_id"],
                item_id=thread["item_id"],
                title=thread["title"],
                content=thread["content"],
                author_user_id=thread["author_id"],
                author_name="Demo User",
                upvote_count=5,
                created_at=now_str
            )
            for r_idx, reply in enumerate(thread.get("replies", [])):
                r_model = ForumReplyORM(
                    id=uuid.uuid4().hex,
                    thread_id=t_model.id,
                    content=reply["content"],
                    author_user_id=reply["author_id"],
                    author_name="Demo Instructor",
                    upvote_count=2,
                    created_at=now_str
                )
                t_model.replies.append(r_model)
            await session.merge(t_model)
            
        logger.info("[SEED DEMO] Loaded Social Data (Reviews & Forum Threads)")

    # Load assessment data
    assessment_file = data_dir / "assessment.json"
    if assessment_file.exists():
        with open(assessment_file, "r") as f:
            assessment_data = json.load(f)
            
        for qb_data in assessment_data.get("question_banks", []):
            qb = QuestionBankModel(
                id=qb_data["id"],
                course_id=qb_data["course_id"],
                title=qb_data["title"],
                category=qb_data["category"],
                description=qb_data["description"],
                created_at=now_str
            )
            for q_data in qb_data.get("questions", []):
                q = QuestionModel(
                    id=q_data["id"],
                    bank_id=qb.id,
                    text=q_data["text"],
                    question_type=q_data["question_type"],
                    difficulty=q_data["difficulty"],
                    explanation=q_data["explanation"],
                    created_at=now_str
                )
                for opt_data in q_data.get("options", []):
                    opt = QuestionOptionModel(
                        id=opt_data["id"],
                        question_id=q.id,
                        option_text=opt_data["option_text"],
                        is_correct=opt_data["is_correct"],
                        order_index=opt_data["order_index"]
                    )
                    q.options.append(opt)
                qb.questions.append(q)
            await session.merge(qb)
            
        for matrix_data in assessment_data.get("quiz_matrices", []):
            matrix = QuizMatrixModel(
                item_id=matrix_data["item_id"],
                bank_id=matrix_data["bank_id"],
                time_limit_minutes=matrix_data["time_limit_minutes"],
                passing_threshold_percent=matrix_data["passing_threshold_percent"],
                easy_count=matrix_data["easy_count"],
                medium_count=matrix_data["medium_count"],
                hard_count=matrix_data["hard_count"],
                shuffle_options=matrix_data["shuffle_options"],
                max_attempts=matrix_data["max_attempts"],
                cooldown_hours=matrix_data["cooldown_hours"]
            )
            await session.merge(matrix)
            
        for qsub in assessment_data.get("quiz_submissions", []):
            qsub["created_at"] = now_str
            await session.merge(QuizSubmissionModel(**qsub))
            
        for lsub in assessment_data.get("lab_submissions", []):
            lsub["created_at"] = now_str
            await session.merge(LabSubmissionModel(**lsub))
            
        for psub in assessment_data.get("peer_assignments", []):
            psub["created_at"] = now_str
            await session.merge(PeerAssignmentSubmissionModel(**psub))
            
        for prev in assessment_data.get("peer_reviews", []):
            # Map JSON key to Model Field
            prev["rubric_criteria_json"] = prev.pop("rubric_criteria", [])
            prev["created_at"] = now_str
            await session.merge(PeerReviewModel(**prev))
            
        logger.info("[SEED DEMO] Loaded Assessment Data (Quizzes & Submissions)")

async def seed_database(reset: bool = False) -> None:
    async with async_session_scope() as session:
        if reset:
            logger.info("[SEED DEMO] Truncating ALL database tables for full clean reset...")
            tables = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
            if tables:
                await session.execute(
                    text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE")
                )
                await session.commit()

        logger.info("[SEED DEMO] Loading JSON Demo Data...")
        await load_demo_data(session)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean Demo Data Seeder")
    parser.add_argument("--reset", action="store_true", help="Truncate tables before seeding")
    args = parser.parse_args()

    asyncio.run(seed_database(reset=args.reset))
