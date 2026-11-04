import logging
import random
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from uuid6 import uuid7

from src.modules.assessment.domain import (
    DEFAULT_FALLBACK_QUESTION_LIMIT,
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_EASY_COUNT,
    DEFAULT_QUIZ_HARD_COUNT,
    DEFAULT_QUIZ_MEDIUM_COUNT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    EASY_DIFFICULTY_ALIASES,
    HARD_DIFFICULTY_ALIASES,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    MEDIUM_DIFFICULTY_ALIASES,
    QUIZ_COOLDOWN_HOURS,
    UNLIMITED_ATTEMPTS_SENTINEL,
    AssessmentRepositoryInterface,
    HonorCodeAgreement,
    Question,
    QuestionBank,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    QuizSubmissionAnswer,
    QuizSubmittedDomainEvent,
    calculate_topic_mastery,
    is_graded_quiz_item,
)
from src.shared.access_policy import AccessPolicyService
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

        bank_questions = (
            await repo.get_questions_by_bank(matrix.bank_id) if matrix else []
        )
        if not bank_questions:
            bank_questions = await repo.get_any_questions(
                limit=DEFAULT_FALLBACK_QUESTION_LIMIT
            )

        if not bank_questions:
            return []

        shuffle_options = matrix.shuffle_options if matrix else True
        easy_count = matrix.easy_count if matrix else DEFAULT_QUIZ_EASY_COUNT
        medium_count = matrix.medium_count if matrix else DEFAULT_QUIZ_MEDIUM_COUNT
        hard_count = matrix.hard_count if matrix else DEFAULT_QUIZ_HARD_COUNT

        # 3. Categorize by difficulty (case-insensitive)
        easy_qs = [
            q
            for q in bank_questions
            if str(q.difficulty).upper() in EASY_DIFFICULTY_ALIASES
        ]
        medium_qs = [
            q
            for q in bank_questions
            if str(q.difficulty).upper() in MEDIUM_DIFFICULTY_ALIASES
        ]
        hard_qs = [
            q
            for q in bank_questions
            if str(q.difficulty).upper() in HARD_DIFFICULTY_ALIASES
        ]

        # 4. Sample according to matrix configuration
        rng = random.Random(seed)
        sampled_easy = rng.sample(easy_qs, min(easy_count, len(easy_qs)))
        sampled_medium = rng.sample(medium_qs, min(medium_count, len(medium_qs)))
        sampled_hard = rng.sample(hard_qs, min(hard_count, len(hard_qs)))

        sampled = sampled_easy + sampled_medium + sampled_hard
        if not sampled:
            total_needed = max(1, easy_count + medium_count + hard_count)
            sampled = rng.sample(bank_questions, min(total_needed, len(bank_questions)))

        if shuffle_options:
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

            if shuffle_options:
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
                    "topic": getattr(q, "topic", "Tổng quan") or "Tổng quan",
                }
            )

        return result

    async def start_graded_quiz_session(
        self,
        user_id: str,
        item_id: str,
        duration_minutes: int = 0,
        preview: bool = False,
        force_new: bool = False,
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            matrix = await self._get_quiz_matrix(repo, item_id)

            duration_minutes = (
                duration_minutes
                if duration_minutes > 0
                else (
                    matrix.time_limit_minutes
                    if (matrix and matrix.time_limit_minutes > 0)
                    else DEFAULT_QUIZ_TIME_LIMIT_MINUTES
                )
            )
            passing_threshold = (
                matrix.passing_threshold_percent
                if (matrix and matrix.passing_threshold_percent > 0)
                else DEFAULT_PASSING_THRESHOLD_PERCENT
            )
            max_attempts = (
                matrix.max_attempts
                if (matrix and matrix.max_attempts > 0)
                else MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
            )
            cooldown_hours = (
                matrix.cooldown_hours
                if (matrix and matrix.cooldown_hours > 0)
                else QUIZ_COOLDOWN_HOURS
            )

            now = datetime.now(UTC)
            expires_at = now + timedelta(minutes=duration_minutes)

            # Check item type (Graded Quiz vs Practice Quiz)
            item_type_str = await repo.get_item_type(item_id)
            is_graded = is_graded_quiz_item(item_type_str)

            # Check previous submissions for state persistence
            prev_submissions = await repo.get_quiz_submissions(user_id, item_id)
            has_passed = (
                any(s.passed for s in prev_submissions) if prev_submissions else False
            )

            # BR_QUIZ_001: Enforce Cooldown for Graded Quiz ONLY when starting a new attempt (force_new=True)
            if is_graded and force_new and not preview and not has_passed:
                cooldown = await repo.get_quiz_cooldown(user_id, item_id)
                if (
                    cooldown
                    and cooldown.is_in_cooldown(now)
                    and cooldown.cooldown_until
                ):
                    can_att, reason, _ = cooldown.can_attempt(now)
                    if not can_att:
                        raise ValueError(reason)

            cooldown_sec = 0
            attempts_left = UNLIMITED_ATTEMPTS_SENTINEL
            if is_graded:
                cooldown = await repo.get_quiz_cooldown(user_id, item_id)
                failed_count = cooldown.failed_attempts_count if cooldown else 0
                attempts_left = (
                    max(0, max_attempts - failed_count)
                    if not has_passed
                    else max_attempts
                )
                if (
                    cooldown
                    and cooldown.is_in_cooldown(now)
                    and cooldown.cooldown_until
                ):
                    try:
                        until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                        if until_dt.tzinfo is None:
                            until_dt = until_dt.replace(tzinfo=UTC)
                        cooldown_sec = max(0, int((until_dt - now).total_seconds()))
                    except (ValueError, TypeError):
                        cooldown_sec = 0

            prev_result = None
            if prev_submissions and not preview:
                target_sub = (
                    max(prev_submissions, key=lambda s: s.score_percent)
                    if has_passed
                    else max(prev_submissions, key=lambda s: s.created_at)
                )
                summary_questions = await self.generate_quiz_session_questions(
                    repo, item_id, seed=42
                )
                explanations = []
                total_qs = len(summary_questions)
                num_correct = (
                    round(total_qs * (target_sub.score_percent / 100.0))
                    if total_qs > 0
                    else 0
                )
                for idx, q in enumerate(summary_questions):
                    is_corr = idx < num_correct
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
                    "cooldown_seconds_left": cooldown_sec,
                    "answer_explanations": explanations,
                    "max_attempts": max_attempts if is_graded else 999,
                    "cooldown_hours": cooldown_hours if is_graded else 0,
                }

            if prev_submissions and not force_new and not preview:
                return {
                    "session_id": f"qsess-prev-{uuid7().hex}",
                    "start_time_iso": now.isoformat(),
                    "expires_at_iso": expires_at.isoformat(),
                    "duration_minutes": duration_minutes,
                    "passing_threshold_percent": passing_threshold,
                    "session_seed": 42,
                    "questions": summary_questions,
                    "cooldown_seconds_left": cooldown_sec,
                    "attempts_left": attempts_left,
                    "max_attempts": max_attempts if is_graded else 999,
                    "cooldown_hours": cooldown_hours if is_graded else 0,
                    "has_previous_result": True,
                    "previous_result": prev_result,
                }

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
                "session_id": f"qsess-{uuid7().hex}",
                "start_time_iso": now.isoformat(),
                "expires_at_iso": expires_at.isoformat(),
                "duration_minutes": duration_minutes,
                "passing_threshold_percent": passing_threshold,
                "session_seed": seed_val,
                "questions": questions,
                "cooldown_seconds_left": cooldown_sec,
                "attempts_left": attempts_left,
                "max_attempts": max_attempts if is_graded else 999,
                "cooldown_hours": cooldown_hours if is_graded else 0,
                "has_previous_result": prev_result is not None,
                "previous_result": prev_result,
            }

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

            # BR_ACCESS_001: Practice Quizzes are open in Audit Mode.
            # Only Graded Quizzes require Paid Mode authorization.
            item_type_str = await repo.get_item_type(item_id)
            is_graded = is_graded_quiz_item(item_type_str)

            if (
                is_graded
                and not preview
                and (repo is None or "SQLAlchemy" in repo.__class__.__name__)
            ):
                target_course_id = await repo.get_course_id_by_item_id(item_id) or ""
                is_paid, err = await AccessPolicyService.verify_paid_access(
                    session, user_id, target_course_id
                )
                if not is_paid:
                    raise PermissionError(err)

            matrix = await self._get_quiz_matrix(repo, item_id)

            max_attempts = (
                matrix.max_attempts
                if (matrix and matrix.max_attempts > 0)
                else MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
            )
            cooldown_hours = (
                matrix.cooldown_hours
                if (matrix and matrix.cooldown_hours > 0)
                else QUIZ_COOLDOWN_HOURS
            )
            duration_minutes = (
                duration_minutes
                if duration_minutes > 0
                else (
                    matrix.time_limit_minutes
                    if (matrix and matrix.time_limit_minutes > 0)
                    else DEFAULT_QUIZ_TIME_LIMIT_MINUTES
                )
            )
            passing_threshold = (
                matrix.passing_threshold_percent
                if (matrix and matrix.passing_threshold_percent > 0)
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

            # 2. Timestamp definition
            now = datetime.now(UTC)

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
                    # Adaptive Answer Masking (Academic Integrity):
                    # Hide detailed explanations if student hasn't passed and is not previewing
                    if not passed and not preview:
                        clean_exp = ""
                    else:
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

            # 4. Check Cooldown state
            cooldown_sec = 0
            attempts_left = UNLIMITED_ATTEMPTS_SENTINEL

            # 5. Save submission & update Cooldown (only if not preview)
            if not preview:
                submission_id = f"sub-{uuid7().hex}"
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

                # Save detailed snapshot answers for history & gap analysis
                submission_answers: list[QuizSubmissionAnswer] = []
                for idx, q in enumerate(generated_qs):
                    corr_indices = list(q.get("shuffled_correct_indices", []))
                    corr_indices_set = set(corr_indices)
                    user_ans_list = answers[idx] if idx < len(answers) else []
                    user_ans_set = set(user_ans_list)
                    is_corr = bool(user_ans_set and user_ans_set == corr_indices_set)

                    raw_options = q.get("options", [])
                    opts_payload = [
                        {
                            "index": opt_i,
                            "text": opt_t,
                            "is_correct": opt_i in corr_indices_set,
                        }
                        for opt_i, opt_t in enumerate(raw_options)
                    ]

                    clean_exp = _clean_explanation(q.get("explanation"))
                    submission_answers.append(
                        QuizSubmissionAnswer(
                            id=f"qsa-{uuid7().hex}",
                            submission_id=submission_id,
                            question_id=q.get("question_id", f"q-{idx}"),
                            question_text=q.get("text", ""),
                            question_type=q.get("question_type", "SINGLE_CHOICE"),
                            options_json=opts_payload,
                            selected_option_indices=user_ans_list,
                            is_correct=is_corr,
                            topic=q.get("topic", "Tổng quan") or "Tổng quan",
                            explanation=clean_exp,
                            order_index=idx,
                        )
                    )
                await repo.save_quiz_submission_answers(submission_answers)

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

                if is_graded:
                    cooldown = await repo.get_quiz_cooldown(user_id, item_id)
                    if not cooldown:
                        cooldown = QuizCooldown(user_id=user_id, item_id=item_id)

                    if passed:
                        cooldown.record_success()
                    else:
                        cooldown.record_failure(
                            now,
                            cooldown_hours=cooldown_hours,
                            max_attempts=max_attempts,
                        )

                    await repo.save_quiz_cooldown(cooldown)

                    failed_count = cooldown.failed_attempts_count
                    attempts_left = (
                        max(0, max_attempts - failed_count)
                        if not passed
                        else max_attempts
                    )
                    if cooldown.is_in_cooldown(now) and cooldown.cooldown_until:
                        try:
                            until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                            if until_dt.tzinfo is None:
                                until_dt = until_dt.replace(tzinfo=UTC)
                            cooldown_sec = max(0, int((until_dt - now).total_seconds()))
                        except (ValueError, TypeError):
                            cooldown_sec = 0
            elif is_graded:
                cooldown = await repo.get_quiz_cooldown(user_id, item_id)
                failed_count = cooldown.failed_attempts_count if cooldown else 0
                attempts_left = (
                    max(0, max_attempts - failed_count) if not passed else max_attempts
                )

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
                "attempts_left": attempts_left,
                "cooldown_seconds_left": cooldown_sec,
                "answer_explanations": explanations,
                "max_attempts": max_attempts if is_graded else 999,
                "cooldown_hours": cooldown_hours if is_graded else 0,
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

    async def get_quiz_attempt_history(
        self, user_id: str, item_id: str
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_quiz_submissions(user_id, item_id)
            matrix = await self._get_quiz_matrix(repo, item_id)

            max_attempts = (
                matrix.max_attempts
                if (matrix and matrix.max_attempts > 0)
                else MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
            )
            passing_threshold = (
                matrix.passing_threshold_percent
                if (matrix and matrix.passing_threshold_percent > 0)
                else DEFAULT_PASSING_THRESHOLD_PERCENT
            )
            time_limit = (
                matrix.time_limit_minutes
                if (matrix and matrix.time_limit_minutes > 0)
                else DEFAULT_QUIZ_TIME_LIMIT_MINUTES
            )

            now = datetime.now(UTC)
            item_type_str = await repo.get_item_type(item_id)
            is_graded = is_graded_quiz_item(item_type_str)

            cooldown_sec = 0
            has_passed = any(s.passed for s in submissions) if submissions else False
            highest_score = max((s.score_percent for s in submissions), default=0.0)

            if is_graded:
                cooldown = await repo.get_quiz_cooldown(user_id, item_id)
                failed_count = cooldown.failed_attempts_count if cooldown else 0
                attempts_left = (
                    max(0, max_attempts - failed_count)
                    if not has_passed
                    else max_attempts
                )
                if (
                    cooldown
                    and cooldown.is_in_cooldown(now)
                    and cooldown.cooldown_until
                ):
                    try:
                        until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                        if until_dt.tzinfo is None:
                            until_dt = until_dt.replace(tzinfo=UTC)
                        cooldown_sec = max(0, int((until_dt - now).total_seconds()))
                    except (ValueError, TypeError):
                        cooldown_sec = 0
            else:
                attempts_left = UNLIMITED_ATTEMPTS_SENTINEL

            # Fetch all answers for aggregate topic mastery
            all_user_answers = await repo.get_quiz_submission_answers_for_user_item(
                user_id, item_id
            )
            aggregate_mastery = calculate_topic_mastery(all_user_answers)

            # Group answers by submission_id to avoid N+1 queries
            answers_by_sub: dict[str, list[QuizSubmissionAnswer]] = {}
            for ans in all_user_answers:
                answers_by_sub.setdefault(ans.submission_id, []).append(ans)

            # Build summaries
            attempts_summary: list[dict[str, Any]] = []
            for sub in sorted(
                submissions, key=lambda s: s.attempt_number, reverse=True
            ):
                sub_answers = answers_by_sub.get(sub.id, [])
                total_q = len(sub_answers)
                correct_q = sum(1 for a in sub_answers if a.is_correct)

                attempts_summary.append(
                    {
                        "submission_id": sub.id,
                        "attempt_number": sub.attempt_number,
                        "score_percent": sub.score_percent,
                        "passed": sub.passed,
                        "total_questions": total_q,
                        "correct_count": correct_q,
                        "submitted_at": sub.created_at,
                    }
                )

            return {
                "attempts": attempts_summary,
                "aggregate_topic_mastery": [
                    {
                        "topic": m.topic,
                        "total_questions": m.total_questions,
                        "correct_questions": m.correct_questions,
                        "mastery_percent": m.mastery_percent,
                        "mastery_level": m.mastery_level,
                        "recommendation": m.recommendation,
                    }
                    for m in aggregate_mastery
                ],
                "highest_score_percent": highest_score,
                "has_passed": has_passed,
                "attempts_left": attempts_left,
                "max_attempts": max_attempts if is_graded else 999,
                "cooldown_seconds_left": cooldown_sec,
                "passing_threshold_percent": passing_threshold,
                "time_limit_minutes": time_limit,
            }

    async def get_quiz_attempt_detail(
        self, user_id: str, submission_id: str, is_staff: bool = False
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submission = await repo.get_quiz_submission_by_id(submission_id)
            if not submission:
                raise ValueError("Không tìm thấy bài nộp.")

            # Layer 3: ReBAC IDOR protection
            if submission.user_id != user_id and not is_staff:
                raise PermissionError(
                    "Bạn không có quyền xem chi tiết bài làm của học viên khác."
                )

            answers = await repo.get_quiz_submission_answers(submission_id)
            topic_mastery = calculate_topic_mastery(answers)

            item_type_str = await repo.get_item_type(submission.item_id)
            is_graded = is_graded_quiz_item(item_type_str)

            # Adaptive Answer Masking (Academic Integrity)
            # If user has not passed, correct answers and explanations MUST REMAIN MASKED
            # even when in cooldown or out of attempts for current batch, preventing sacrifice exploits.
            is_answer_masked = False
            if is_graded and not is_staff:
                all_subs = await repo.get_quiz_submissions(user_id, submission.item_id)
                has_passed = any(s.passed for s in all_subs)
                if not has_passed:
                    is_answer_masked = True

            answers_detail: list[dict[str, Any]] = []
            for a in answers:
                opts = [o["text"] for o in a.options_json] if a.options_json else []
                correct_indices = (
                    [o["index"] for o in a.options_json if o.get("is_correct")]
                    if (a.options_json and not is_answer_masked)
                    else []
                )
                explanation_text = a.explanation if not is_answer_masked else ""

                answers_detail.append(
                    {
                        "question_id": a.question_id,
                        "question_text": a.question_text,
                        "question_type": a.question_type,
                        "topic": a.topic,
                        "options": opts,
                        "selected_option_indices": a.selected_option_indices,
                        "correct_option_indices": correct_indices,
                        "is_correct": a.is_correct,
                        "explanation": explanation_text,
                        "order_index": a.order_index,
                        "is_answer_masked": is_answer_masked,
                    }
                )

            return {
                "submission_id": submission.id,
                "item_id": submission.item_id,
                "attempt_number": submission.attempt_number,
                "score_percent": submission.score_percent,
                "passed": submission.passed,
                "submitted_at": submission.created_at,
                "answers": answers_detail,
                "topic_mastery": [
                    {
                        "topic": m.topic,
                        "total_questions": m.total_questions,
                        "correct_questions": m.correct_questions,
                        "mastery_percent": m.mastery_percent,
                        "mastery_level": m.mastery_level,
                        "recommendation": m.recommendation,
                    }
                    for m in topic_mastery
                ],
                "is_answer_masked": is_answer_masked,
            }
