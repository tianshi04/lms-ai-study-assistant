import logging
import random
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from uuid6 import uuid7

from src.modules.assessment.domain import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    QUIZ_COOLDOWN_HOURS,
    AssessmentRepositoryInterface,
    HonorCodeAgreement,
    Question,
    QuestionBank,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    QuizSubmittedDomainEvent,
)
from src.shared.access_policy import require_paid_access
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.event_bus import EventBus

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


def _clean_explanation(raw_exp: str | None) -> str:
    if not raw_exp:
        return ""
    cleaned = raw_exp.strip()
    cleaned = re.sub(r"Đã đạt|Chưa đạt", "", cleaned)
    cleaned = re.sub(r"\s*\(\d+(\.\d+)?%\)\.?,?", "", cleaned).strip()
    if len(cleaned) <= 3 or cleaned.lower() in (
        "a",
        "b",
        "c",
        "d",
        "e",
        "t",
        "f",
        "true",
        "false",
        "correct",
        "incorrect",
        "option_1",
        "option_2",
        "option_3",
        "option_4",
    ):
        return ""
    return cleaned


class QuizUseCase(BaseAssessmentUseCase):
    """Application Use Case for Quiz sessions, grading, question banks, and matrix configurations."""

    async def submit_honor_code(
        self, user_id: str, item_id: str, is_agreed: bool
    ) -> tuple[bool, str]:
        now_iso = datetime.now(UTC).isoformat()
        agreement = HonorCodeAgreement(
            user_id=user_id, item_id=item_id, is_agreed=is_agreed, agreed_at=now_iso
        )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            await repo.save_honor_code(agreement)
        msg = (
            "Academic Honor Code agreed successfully."
            if is_agreed
            else "Academic Honor Code rejected."
        )
        logger.info(
            "User %s %s for item %s",
            user_id,
            "agreed to honor code" if is_agreed else "rejected honor code",
            item_id,
        )
        return is_agreed, msg

    async def _get_quiz_matrix(
        self, repo: AssessmentRepositoryInterface, item_id: str
    ) -> QuizMatrix | None:
        return await repo.get_quiz_matrix(item_id)

    async def generate_quiz_session_questions(
        self,
        repo: AssessmentRepositoryInterface,
        item_id: str,
        seed: int,
    ) -> list[dict[str, Any]]:
        """Enforces BR_QUIZ_002: Samples N questions from a Pool of M and shuffles options reproducibly."""
        # 1. Fetch Quiz Matrix
        matrix = await self._get_quiz_matrix(repo, item_id)

        if not matrix:
            return []

        # 2. Fetch Questions in Bank
        bank_questions = await repo.get_questions_by_bank(matrix.bank_id)
        if not bank_questions:
            return []

        # 3. Categorize by difficulty
        easy_qs = [q for q in bank_questions if q.difficulty == "EASY"]
        medium_qs = [q for q in bank_questions if q.difficulty == "MEDIUM"]
        hard_qs = [q for q in bank_questions if q.difficulty == "HARD"]

        # 4. Sample according to matrix configuration
        rng = random.Random(seed)
        sampled_easy = rng.sample(easy_qs, min(matrix.easy_count, len(easy_qs)))
        sampled_medium = rng.sample(medium_qs, min(matrix.medium_count, len(medium_qs)))
        sampled_hard = rng.sample(hard_qs, min(matrix.hard_count, len(hard_qs)))

        sampled = sampled_easy + sampled_medium + sampled_hard
        if matrix.shuffle_options:
            rng.shuffle(sampled)

        # 5. Format and optionally shuffle options
        result: list[dict[str, Any]] = []
        for q in sampled:
            # Gather options
            opts_data = [
                {
                    "option_text": opt.option_text,
                    "is_correct": opt.is_correct,
                }
                for opt in q.options
            ]

            if matrix.shuffle_options:
                rng.shuffle(opts_data)

            # Build final options list and correct index
            options_text = [opt["option_text"] for opt in opts_data]

            correct_indices = [
                idx for idx, opt in enumerate(opts_data) if opt["is_correct"]
            ]

            result.append(
                {
                    "question_id": q.id,
                    "text": q.text,
                    "options": options_text,
                    "shuffled_correct_indices": correct_indices,
                    "explanation": q.explanation or "",
                    "question_type": q.question_type,
                    "difficulty": q.difficulty,
                }
            )

        return result

    async def start_graded_quiz_session(
        self,
        user_id: str,
        item_id: str,
        duration_minutes: int = DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
        preview: bool = False,
        force_new: bool = False,
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            matrix = await self._get_quiz_matrix(repo, item_id)
            if matrix:
                duration_minutes = matrix.time_limit_minutes
            passing_threshold = (
                matrix.passing_threshold_percent
                if matrix
                else DEFAULT_PASSING_THRESHOLD_PERCENT
            )

            now = datetime.now(UTC)
            expires_at = now + timedelta(minutes=duration_minutes)

            max_attempts = (
                matrix.max_attempts if matrix else MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
            )

            # Check Cooldown status
            cooldown = await repo.get_quiz_cooldown(user_id, item_id)
            cooldown_seconds_left = 0
            attempts_count = cooldown.failed_attempts_count if cooldown else 0

            if cooldown and not preview and cooldown.cooldown_until:
                if cooldown.is_in_cooldown(now):
                    can_att, reason, _ = cooldown.can_attempt(now)
                    if not can_att:
                        raise ValueError(reason)
                else:
                    attempts_count = 0

            attempts_left = max(0, max_attempts - attempts_count)

            # Check previous submissions for state persistence
            prev_submissions = await repo.get_quiz_submissions(user_id, item_id)
            has_passed = (
                any(s.passed for s in prev_submissions) if prev_submissions else False
            )

            if prev_submissions and not force_new and not preview:
                questions = await self.generate_quiz_session_questions(
                    repo, item_id, seed=42
                )
                target_sub = (
                    max(prev_submissions, key=lambda s: s.score_percent)
                    if has_passed
                    else max(prev_submissions, key=lambda s: s.created_at)
                )
                explanations = []
                for idx, q in enumerate(questions):
                    corr_indices = set(q.get("shuffled_correct_indices", []))
                    user_ans_idx = (
                        target_sub.selected_option_indexes[idx]
                        if target_sub
                        and target_sub.selected_option_indexes
                        and idx < len(target_sub.selected_option_indexes)
                        else -1
                    )
                    is_corr = bool(user_ans_idx >= 0 and {user_ans_idx} == corr_indices)
                    clean_exp = _clean_explanation(q.get("explanation"))
                    exp_suffix = f" — {clean_exp}" if clean_exp else ""
                    if is_corr:
                        explanations.append(f"Câu {idx + 1}: Đúng{exp_suffix}")
                    else:
                        explanations.append(f"Câu {idx + 1}: Sai{exp_suffix}")

                prev_result = {
                    "score_percent": target_sub.score_percent,
                    "passed": has_passed,
                    "attempts_left": attempts_left,
                    "cooldown_seconds_left": 0,
                    "answer_explanations": explanations,
                    "max_attempts": max_attempts,
                    "cooldown_hours": matrix.cooldown_hours
                    if matrix
                    else QUIZ_COOLDOWN_HOURS,
                }

                return {
                    "session_id": f"qsess-prev-{uuid7().hex[:8]}",
                    "start_time_iso": now.isoformat(),
                    "expires_at_iso": expires_at.isoformat(),
                    "duration_minutes": duration_minutes,
                    "passing_threshold_percent": passing_threshold,
                    "session_seed": 42,
                    "questions": questions,
                    "cooldown_seconds_left": 0,
                    "attempts_left": attempts_left,
                    "max_attempts": max_attempts,
                    "cooldown_hours": matrix.cooldown_hours
                    if matrix
                    else QUIZ_COOLDOWN_HOURS,
                    "has_previous_result": True,
                    "previous_result": prev_result,
                }

            if attempts_left <= 0 and not preview:
                if cooldown and cooldown.is_in_cooldown(now):
                    can_att, reason, _ = cooldown.can_attempt(now)
                    if not can_att:
                        raise ValueError(reason)
                cooldown_hours = (
                    matrix.cooldown_hours if matrix else QUIZ_COOLDOWN_HOURS
                )
                cooldown_until_dt = now + timedelta(hours=cooldown_hours)
                cooldown_until_iso = cooldown_until_dt.isoformat()
                new_cooldown = QuizCooldown(
                    user_id=user_id,
                    item_id=item_id,
                    failed_attempts_count=attempts_count,
                    last_attempt_at=now.isoformat(),
                    cooldown_until=cooldown_until_iso,
                )
                await repo.save_quiz_cooldown(new_cooldown)
                raise ValueError(
                    "Bạn đã hết lượt làm bài thi này. Vui lòng quay lại sau."
                )

            # BR_QUIZ_002: Generate N-sampled and option-shuffled questions using unique user/attempt seed
            seed_val = (
                abs(hash(f"{user_id}:{item_id}:{now.isoformat()}:{uuid7().hex}"))
                % (2**31 - 1)
                + 1
            )
            questions = await self.generate_quiz_session_questions(
                repo, item_id, seed=seed_val
            )

            active_session = QuizActiveSession(
                user_id=user_id,
                item_id=item_id,
                session_seed=seed_val,
                questions_json=questions,
                started_at=now.isoformat(),
                expires_at=expires_at.isoformat(),
            )
            await repo.save_quiz_active_session(active_session)

            return {
                "session_id": f"qsess-{uuid7().hex[:8]}",
                "start_time_iso": now.isoformat(),
                "expires_at_iso": expires_at.isoformat(),
                "duration_minutes": duration_minutes,
                "passing_threshold_percent": passing_threshold,
                "session_seed": seed_val,
                "questions": questions,
                "cooldown_seconds_left": cooldown_seconds_left,
                "attempts_left": attempts_left,
                "max_attempts": max_attempts,
                "cooldown_hours": matrix.cooldown_hours
                if matrix
                else QUIZ_COOLDOWN_HOURS,
            }

    @require_paid_access()
    async def submit_graded_quiz(
        self,
        user_id: str,
        item_id: str,
        start_time_iso: str | None = None,
        duration_minutes: int = DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
        session_seed: int | None = None,
        preview: bool = False,
        question_answers: list[list[int]] | None = None,
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)

            # 0. Fetch Quiz Matrix to get dynamic settings
            matrix = await self._get_quiz_matrix(repo, item_id)
            max_attempts = (
                matrix.max_attempts if matrix else MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
            )
            cooldown_hours = matrix.cooldown_hours if matrix else QUIZ_COOLDOWN_HOURS
            duration_minutes = (
                matrix.time_limit_minutes if matrix else DEFAULT_QUIZ_TIME_LIMIT_MINUTES
            )
            passing_threshold = (
                matrix.passing_threshold_percent
                if matrix and matrix.passing_threshold_percent > 0
                else DEFAULT_PASSING_THRESHOLD_PERCENT
            )

            # 1. Verify Honor Code
            honor = await repo.get_honor_code(user_id, item_id)
            if (not honor or not honor.is_agreed) and not preview:
                logger.warning(
                    "User %s attempted to submit quiz %s without agreeing to honor code",
                    user_id,
                    item_id,
                )
                return {
                    "score_percent": 0.0,
                    "passed": False,
                    "attempts_left": 0,
                    "cooldown_seconds_left": 0,
                    "answer_explanations": [
                        "Bạn phải xác nhận Cam kết Trung thực trước khi thực hiện bài thi."
                    ],
                    "max_attempts": max_attempts,
                    "cooldown_hours": cooldown_hours,
                }

            # 2. Check Cooldown timer
            now = datetime.now(UTC)
            cooldown = await repo.get_quiz_cooldown(user_id, item_id)
            if (
                cooldown
                and not preview
                and cooldown.is_in_cooldown(now)
                and cooldown.cooldown_until
            ):
                until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                if until_dt.tzinfo is None:
                    until_dt = until_dt.replace(tzinfo=UTC)
                seconds_left = int((until_dt - now).total_seconds())
                logger.warning(
                    "User %s attempted to submit quiz %s while in cooldown",
                    user_id,
                    item_id,
                )
                return {
                    "score_percent": 0.0,
                    "passed": False,
                    "attempts_left": 0,
                    "cooldown_seconds_left": seconds_left,
                    "answer_explanations": [
                        f"Bài thi đang trong thời gian giãn cách {cooldown_hours} giờ. Vui lòng đợi {seconds_left} giây."
                    ],
                    "max_attempts": max_attempts,
                    "cooldown_hours": cooldown_hours,
                }

            # 3. Grade Quiz (BR_QUIZ_002: Dynamic shuffled options grading)
            if session_seed is None:
                session_seed = 42

            generated_qs = await self.generate_quiz_session_questions(
                repo, item_id, seed=session_seed
            )

            total_questions = len(generated_qs)
            correct_count = 0

            answers = question_answers or []
            for idx, q in enumerate(generated_qs):
                corr_indices = set(q.get("shuffled_correct_indices", []))
                user_ans_set = set(answers[idx]) if idx < len(answers) else set()

                if user_ans_set and user_ans_set == corr_indices:
                    correct_count += 1

            if total_questions == 0:
                score_percent = 0.0
            else:
                score_percent = round((correct_count / total_questions) * 100.0, 2)

            prev_submissions = await repo.get_quiz_submissions(user_id, item_id)
            all_scores = [sub.score_percent for sub in prev_submissions] + [
                score_percent
            ]
            highest_score = max(all_scores)
            passed = highest_score >= passing_threshold

            explanations: list[str] = []
            if total_questions == 0:
                explanations.append(
                    "Kho câu hỏi rỗng hoặc chưa được cấu hình câu hỏi cho bài thi này."
                )
            else:
                answers = question_answers or []
                for idx, q in enumerate(generated_qs):
                    corr_indices = set(q.get("shuffled_correct_indices", []))
                    user_ans_set = set(answers[idx]) if idx < len(answers) else set()

                    is_corr = bool(user_ans_set and user_ans_set == corr_indices)
                    clean_exp = _clean_explanation(q.get("explanation"))
                    exp_suffix = f" — {clean_exp}" if clean_exp else ""

                    if is_corr:
                        explanations.append(f"Câu {idx + 1}: Đúng{exp_suffix}")
                    else:
                        explanations.append(f"Câu {idx + 1}: Sai{exp_suffix}")

            if start_time_iso:
                try:
                    start_dt = datetime.fromisoformat(start_time_iso)
                    if (now - start_dt).total_seconds() > duration_minutes * 60:
                        explanations.insert(
                            0,
                            f"Hết thời gian làm bài ({duration_minutes} phút). Hệ thống tự động nộp bài và chấm điểm.",
                        )
                except ValueError:
                    pass

            # 4. Handle Cooldown & Attempts tracking
            cd_count = cooldown.failed_attempts_count if cooldown else 0
            if cd_count > len(prev_submissions):
                failed_count = cd_count
            else:
                failed_count = max(cd_count, len(prev_submissions)) + 1

            attempts_left = max(0, max_attempts - failed_count)

            if failed_count >= max_attempts and not preview:
                if cooldown and cooldown.cooldown_until:
                    until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                    if now < until_dt:
                        seconds_left = int((until_dt - now).total_seconds())
                    else:
                        cooldown_until_dt = now + timedelta(hours=cooldown_hours)
                        cooldown_until_iso = cooldown_until_dt.isoformat()
                        seconds_left = int(cooldown_hours * 3600)
                else:
                    cooldown_until_dt = now + timedelta(hours=cooldown_hours)
                    cooldown_until_iso = cooldown_until_dt.isoformat()
                    seconds_left = int(cooldown_hours * 3600)
                attempts_left = 0
            else:
                cooldown_until_iso = cooldown.cooldown_until if cooldown else None
                seconds_left = 0

            # Save submission (only if not preview)
            if not preview:
                submission_id = f"sub-{uuid7().hex[:8]}"
                attempt_number = len(prev_submissions) + 1

                first_selected = [ans[0] if ans else -1 for ans in answers]
                submission = QuizSubmission(
                    id=submission_id,
                    user_id=user_id,
                    item_id=item_id,
                    selected_option_indexes=first_selected,
                    score_percent=score_percent,
                    passed=score_percent >= passing_threshold,
                    attempt_number=attempt_number,
                    created_at=now.isoformat(),
                )
                await repo.save_quiz_submission(submission)

                # Trigger domain event
                target_course_id = ""
                try:
                    found_cid = await repo.get_course_id_by_item_id(item_id)
                    if found_cid:
                        target_course_id = found_cid
                except Exception:  # noqa: BLE001, S110
                    pass

                await EventBus.publish(
                    QuizSubmittedDomainEvent(
                        user_id=user_id,
                        course_id=target_course_id,
                        item_id=item_id,
                        score_percent=score_percent,
                        passed=score_percent >= passing_threshold,
                        attempt_number=attempt_number,
                    )
                )

                # Update Cooldown entity
                new_cooldown = QuizCooldown(
                    user_id=user_id,
                    item_id=item_id,
                    failed_attempts_count=failed_count,
                    last_attempt_at=now.isoformat(),
                    cooldown_until=cooldown_until_iso,
                )
                await repo.save_quiz_cooldown(new_cooldown)

            logger.info(
                "User %s submitted quiz %s with score %s (Passed: %s) [Preview: %s]",
                user_id,
                item_id,
                score_percent,
                passed,
                preview,
            )
            return {
                "score_percent": score_percent,
                "passed": passed,
                "attempts_left": max_attempts if preview else max(0, attempts_left),
                "cooldown_seconds_left": 0 if preview else seconds_left,
                "answer_explanations": explanations,
                "max_attempts": max_attempts,
                "cooldown_hours": cooldown_hours,
            }

    async def create_question_bank(
        self,
        course_id: str,
        title: str,
        category: str,
        description: str,
        current_user: CurrentUser | None = None,
    ) -> QuestionBank:
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.create_question_bank(
                course_id=course_id,
                title=title,
                category=category,
                description=description,
            )

    async def list_question_banks(self, course_id: str) -> list[QuestionBank]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.list_question_banks(course_id=course_id)

    async def add_question_to_bank(
        self,
        bank_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        current_user: CurrentUser | None = None,
    ) -> Question:
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.add_question_to_bank(
                bank_id=bank_id,
                text=text,
                question_type=question_type,
                difficulty=difficulty,
                explanation=explanation,
                options_data=options_data,
            )

    async def configure_quiz_matrix(
        self,
        item_id: str,
        bank_id: str,
        time_limit_minutes: int,
        passing_threshold_percent: float,
        easy_count: int,
        medium_count: int,
        hard_count: int,
        shuffle_options: bool,
        max_attempts: int,
        cooldown_hours: int,
        current_user: CurrentUser | None = None,
    ) -> QuizMatrix:
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.configure_quiz_matrix(
                item_id=item_id,
                bank_id=bank_id,
                time_limit_minutes=time_limit_minutes,
                passing_threshold_percent=passing_threshold_percent,
                easy_count=easy_count,
                medium_count=medium_count,
                hard_count=hard_count,
                shuffle_options=shuffle_options,
                max_attempts=max_attempts,
                cooldown_hours=cooldown_hours,
            )

    async def get_quiz_matrix(self, item_id: str) -> QuizMatrix | None:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.get_quiz_matrix(item_id=item_id)

    async def delete_question(
        self, question_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.delete_question(question_id=question_id)

    async def update_question(
        self,
        question_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        current_user: CurrentUser | None = None,
    ) -> Question:
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            return await repo.update_question(
                question_id=question_id,
                text=text,
                question_type=question_type,
                difficulty=difficulty,
                explanation=explanation,
                options_data=options_data,
            )
