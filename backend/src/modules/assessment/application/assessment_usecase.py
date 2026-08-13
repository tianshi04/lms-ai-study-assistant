import logging
import random
import re
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from src.modules.assessment.domain.constants import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    OUTLIER_SCORE_DELTA_THRESHOLD,
    PEER_REVIEW_COLD_START_HOURS,
    QUIZ_COOLDOWN_HOURS,
    REQUIRED_PEER_REVIEWS_COUNT,
)
from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    Question,
    QuestionBank,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    RubricCriteria,
)
from src.modules.assessment.domain.repositories import AssessmentRepositoryInterface
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)
from src.shared.access_policy import require_paid_access
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope

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


class AssessmentUseCase:
    def _verify_staff(self, current_user: CurrentUser | None) -> None:
        if current_user is not None and not current_user.is_staff:
            raise PermissionError(
                "Chỉ Trợ giảng (TA) hoặc Giảng viên mới có quyền quản lý đánh giá."
            )

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: PythonCodeSandboxExecutor | None = None,
    ) -> None:
        self.repository = repository
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyAssessmentRepository(session)
        )
        self.sandbox_executor = sandbox_executor or PythonCodeSandboxExecutor()

    async def _get_repo(self, session: Any) -> AssessmentRepositoryInterface:
        # If an explicit in-memory or mock repository was passed for unit testing, return it
        if self.repository is not None and not isinstance(
            self.repository, SQLAlchemyAssessmentRepository
        ):
            return self.repository
        # For production database operations, always instantiate a fresh repository bound to active session
        return self.repo_factory(session)

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
                until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                if now < until_dt:
                    cooldown_seconds_left = int((until_dt - now).total_seconds())
                    attempts_left = 0
                    hours = cooldown_seconds_left // 3600
                    minutes = (cooldown_seconds_left % 3600) // 60
                    time_str = (
                        f"{hours} giờ {minutes} phút"
                        if hours > 0
                        else f"{minutes} phút"
                    )
                    raise ValueError(
                        f"Bạn đã dùng hết số lượt làm bài. Vui lòng quay lại sau {time_str}."
                    )
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
                    "session_id": f"qsess-prev-{uuid.uuid4().hex[:8]}",
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
                raise ValueError("Bạn đã hết lượt làm bài thi này.")

            # Deduct attempt upon starting a new session (whether pass or fail, reload or navigate away)
            if not preview:
                attempts_count += 1
                attempts_left = max(0, max_attempts - attempts_count)
                cooldown_until_iso = None
                if attempts_count >= max_attempts:
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

            # BR_QUIZ_002: Generate N-sampled and option-shuffled questions using unique user/attempt seed
            seed_val = (
                abs(hash(f"{user_id}:{item_id}:{now.isoformat()}:{uuid.uuid4().hex}"))
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
                "session_id": f"qsess-{uuid.uuid4().hex[:8]}",
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
            if cooldown and cooldown.cooldown_until and not preview:
                until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                if now < until_dt:
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
                submission_id = f"sub-{uuid.uuid4().hex[:8]}"
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

                # Trigger ASSESSMENT notification
                try:
                    from src.modules.notification.application.use_cases import (
                        NotificationUseCase,
                    )
                    from src.modules.notification.domain.constants import (
                        NotificationCategory,
                    )

                    status_str = (
                        "ĐẠT (PASSED)"
                        if score_percent >= passing_threshold
                        else "CHƯA ĐẠT"
                    )
                    target_course_id = ""
                    try:
                        from sqlalchemy import select

                        from src.modules.catalog.infrastructure.models import (
                            LearningItemModel,
                            LessonModel,
                            WeekModuleModel,
                        )

                        cid_stmt = (
                            select(WeekModuleModel.course_id)
                            .join(
                                LessonModel,
                                LessonModel.week_module_id == WeekModuleModel.id,
                            )
                            .join(
                                LearningItemModel,
                                LearningItemModel.lesson_id == LessonModel.id,
                            )
                            .where(LearningItemModel.id == item_id)
                        )
                        cid_res = await session.execute(cid_stmt)
                        found_cid = cid_res.scalar_one_or_none()
                        if found_cid:
                            target_course_id = found_cid
                    except Exception:  # noqa: BLE001, S110
                        pass

                    notif_uc = NotificationUseCase()
                    await notif_uc.send_notification(
                        recipient_id=user_id,
                        category=NotificationCategory.ACADEMIC,
                        title=f"Kết quả bài kiểm tra: {score_percent}% - {status_str}",
                        content=f"Bạn đã hoàn thành bài thi lần {attempt_number} với số điểm {score_percent}%.",
                        action_url=f"/learn/{target_course_id}?itemId={item_id}",
                    )
                except Exception as e:  # noqa: BLE001
                    logger.warning("Failed to send quiz result notification: %s", e)

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

    @require_paid_access()
    async def submit_auto_graded_lab(
        self,
        user_id: str,
        item_id: str,
        source_code: str,
        language: str,
        test_cases: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        # 1. Fetch test cases from database if not provided
        test_cases = list(test_cases) if test_cases else []
        if not test_cases:
            async with async_session_scope() as session:
                try:
                    catalog_models = __import__(
                        "src.modules.catalog.infrastructure.models",
                        fromlist=["LearningItemModel"],
                    )
                    from sqlalchemy import select

                    stmt = select(
                        catalog_models.LearningItemModel.test_cases_json
                    ).where(catalog_models.LearningItemModel.id == item_id)
                    res = await session.execute(stmt)
                    test_cases_json = res.scalar_one_or_none()
                    if test_cases_json:
                        import json

                        parsed = json.loads(test_cases_json)
                        # Handle double-encoded JSON from database
                        if isinstance(parsed, str):
                            parsed = json.loads(parsed)
                        test_cases = parsed
                except Exception as e:  # noqa: BLE001
                    logger.warning(
                        "Could not load database test cases for lab %s: %s.",
                        item_id,
                        e,
                    )

        # 2. Require test cases configured in the database
        if not test_cases:
            raise ValueError("Bài tập lập trình chưa được cấu hình bộ test case.")

        # 3. Dynamic test case assertion generation for database-configured test cases
        import ast

        func_name = "solution"
        try:
            tree = ast.parse(source_code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_name = node.name
                    break
        except Exception:  # noqa: BLE001, S110
            pass

        for tc in test_cases:
            # Ensure each test case has an assertion_code
            if "assertion_code" not in tc:
                input_args = tc.get("input", "")
                expected_val = tc.get("expected_output") or tc.get("expected", "None")

                if isinstance(expected_val, str):
                    try:
                        ast.literal_eval(expected_val)
                        valid_expr = expected_val
                    except Exception:  # noqa: BLE001
                        valid_expr = repr(expected_val)
                else:
                    valid_expr = repr(expected_val)

                if f"{func_name}(" in input_args:
                    tc["assertion_code"] = f"assert {input_args} == {valid_expr}"
                else:
                    tc["assertion_code"] = (
                        f"assert {func_name}({input_args}) == {valid_expr}"
                    )

        result = await self.sandbox_executor.execute_python(source_code, test_cases)
        now_iso = datetime.now(UTC).isoformat()
        sub_id = f"lab-{uuid.uuid4().hex[:8]}"

        submission = LabSubmission(
            id=sub_id,
            user_id=user_id,
            item_id=item_id,
            source_code=source_code,
            language=language,
            score_percent=result.score_percent,
            passed=result.passed,
            total_test_cases=result.total_test_cases,
            passed_test_cases=result.passed_test_cases,
            test_logs=result.test_logs,
            created_at=now_iso,
        )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            await repo.save_lab_submission(submission)

        logger.info(
            "User %s submitted lab %s with score %s (Passed: %s)",
            user_id,
            item_id,
            result.score_percent,
            result.passed,
        )
        return {
            "score_percent": result.score_percent,
            "passed": result.passed,
            "total_test_cases": result.total_test_cases,
            "passed_test_cases": result.passed_test_cases,
            "test_logs": result.test_logs,
        }

    @require_paid_access()
    async def submit_peer_assignment(
        self, user_id: str, item_id: str, submission_url: str, text_content: str
    ) -> tuple[str, str]:
        sub_id = f"peer-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(UTC).isoformat()
        submission = PeerAssignmentSubmission(
            id=sub_id,
            user_id=user_id,
            item_id=item_id,
            submission_url=submission_url,
            text_content=text_content,
            created_at=now_iso,
        )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            await repo.save_peer_submission(submission)

        logger.info("User %s submitted peer assignment for item %s", user_id, item_id)
        return (
            sub_id,
            f"Assignment submitted successfully. Please complete {REQUIRED_PEER_REVIEWS_COUNT} peer reviews to view your score.",
        )

    async def get_peer_reviews_to_grade(
        self, user_id: str, item_id: str
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(
                item_id, exclude_user_id=user_id
            )

        selected = submissions[:REQUIRED_PEER_REVIEWS_COUNT]
        result: list[dict[str, Any]] = []

        default_rubric = [
            RubricCriteria(
                criteria_id="c1", title="Code Quality & Structure", max_score=10.0
            ),
            RubricCriteria(
                criteria_id="c2", title="Documentation & Comments", max_score=10.0
            ),
            RubricCriteria(criteria_id="c3", title="Test Coverage", max_score=10.0),
        ]

        for s in selected:
            review_id = f"rev-{s.id[:6]}"
            result.append(
                {
                    "review_id": review_id,
                    "submission_url": s.submission_url,
                    "text_content": s.text_content,
                    "rubric_criteria": default_rubric,
                }
            )

        return result

    async def submit_peer_review_grade(
        self,
        review_id: str,
        reviewer_user_id: str,
        graded_criteria: list[RubricCriteria],
        item_id: str | None = None,
    ) -> tuple[bool, str]:
        total_given = sum(c.score_given for c in graded_criteria)
        max_possible = sum(c.max_score for c in graded_criteria) or 1.0
        score_percent = round((total_given / max_possible) * 100.0, 2)

        submission_id = (
            review_id.replace("rev-", "") if review_id.startswith("rev-") else review_id
        )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)

            resolved_item_id = item_id
            if not resolved_item_id:
                sub = await repo.get_peer_submission(submission_id)
                if not sub:
                    raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
                resolved_item_id = sub.item_id

            existing_reviews = await repo.get_peer_reviews_for_submission(submission_id)
            is_outlier = False
            if existing_reviews:
                prev_scores = [r.total_score for r in existing_reviews]
                all_scores = prev_scores + [score_percent]
                max_delta = max(all_scores) - min(all_scores)
                if max_delta > OUTLIER_SCORE_DELTA_THRESHOLD:
                    is_outlier = True

            now_iso = datetime.now(UTC).isoformat()
            review = PeerReview(
                id=review_id,
                submission_id=submission_id,
                reviewer_user_id=reviewer_user_id,
                item_id=resolved_item_id,
                rubric_criteria=graded_criteria,
                total_score=score_percent,
                is_outlier=is_outlier,
                created_at=now_iso,
            )
            await repo.save_peer_review(review)
            logger.info(
                "User %s submitted peer review %s for submission %s with score %s",
                reviewer_user_id,
                review_id,
                submission_id,
                score_percent,
            )

            # Update final_score on PeerAssignmentSubmission if not graded by staff
            sub = await repo.get_peer_submission(submission_id)
            if sub and not sub.graded_by_staff:
                all_revs = await repo.get_peer_reviews_for_submission(submission_id)
                if len(all_revs) >= REQUIRED_PEER_REVIEWS_COUNT:
                    avg_score = round(
                        sum(r.total_score for r in all_revs) / len(all_revs), 2
                    )
                    sub.final_score = avg_score
                    await repo.save_peer_submission(sub)

        msg = "Peer review graded successfully."
        if is_outlier:
            msg += f" (Outlier Flagged: Score variation exceeds {int(OUTLIER_SCORE_DELTA_THRESHOLD)}%, TA notified)."
        return True, msg

    async def regrade_peer_submission_by_staff(
        self,
        submission_id: str,
        staff_user_id: str,
        ta_score: float,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        self._verify_staff(current_user)
        """TA / Staff Regrade Override (BR_PEER_002, BR_PEER_003).
        Overriding final_score 100% with TA score and resolving Grade Appeal if present.
        """
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                return False, "Không tìm thấy bài nộp dự án"

            sub.final_score = round(ta_score, 2)
            sub.graded_by_staff = True
            await repo.save_peer_submission(sub)

            appeal = await repo.get_grade_appeal(submission_id)
            if appeal:
                appeal.status = "RESOLVED"
                await repo.save_grade_appeal(appeal)

            return (
                True,
                f"Trợ giảng/Giảng viên đã chấm lại bài nộp thành công với điểm số {sub.final_score}% (TA Override).",
            )

    async def submit_grade_appeal(
        self, user_id: str, submission_id: str, appeal_reason: str
    ) -> tuple[bool, str]:
        appeal_id = f"appeal-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(UTC).isoformat()
        appeal = GradeAppeal(
            id=appeal_id,
            user_id=user_id,
            submission_id=submission_id,
            appeal_reason=appeal_reason,
            status="PENDING",
            created_at=now_iso,
        )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if sub and sub.user_id != user_id:
                logger.warning(
                    "User %s attempted to submit grade appeal for submission %s belonging to another user",
                    user_id,
                    submission_id,
                )
                raise PermissionError(
                    "Bạn chỉ có quyền gửi khiếu nại điểm đối với bài nộp của chính mình."
                )

            await repo.save_grade_appeal(appeal)

        return True, "PENDING"

    async def list_peer_submissions_needing_staff_regrade(
        self, item_id: str
    ) -> list[dict[str, Any]]:
        """Returns list of peer assignment submissions older than 48 hours (2 days) with fewer than 3 reviews and not yet graded by staff (BR_PEER_004 & BR_PEER_006)."""
        now = datetime.now(UTC)
        cold_start_threshold = now - timedelta(hours=PEER_REVIEW_COLD_START_HOURS)

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(item_id)
            regrade_list = []
            for s in submissions:
                if s.graded_by_staff:
                    continue
                try:
                    sub_dt = datetime.fromisoformat(s.created_at)
                except (ValueError, TypeError):
                    sub_dt = now

                reviews = await repo.get_peer_reviews_for_submission(s.id)
                if (
                    len(reviews) < REQUIRED_PEER_REVIEWS_COUNT
                    and sub_dt <= cold_start_threshold
                ):
                    regrade_list.append(
                        {
                            "submission_id": s.id,
                            "user_id": s.user_id,
                            "item_id": s.item_id,
                            "submission_url": s.submission_url,
                            "text_content": s.text_content,
                            "review_count": len(reviews),
                            "created_at": s.created_at,
                            "needs_staff_regrade": True,
                        }
                    )
            return regrade_list

    async def report_peer_review(
        self, user_id: str, review_id: str, report_reason: str
    ) -> tuple[bool, str]:
        """Reports a malicious or spam peer review (BR_PEER_005)."""
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submission_id = (
                review_id.replace("rev-", "")
                if review_id.startswith("rev-")
                else review_id
            )
            appeal_id = f"report-{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(UTC).isoformat()
            appeal = GradeAppeal(
                id=appeal_id,
                user_id=user_id,
                submission_id=submission_id,
                appeal_reason=f"[REPORT_REVIEW:{review_id}] {report_reason}",
                status="PENDING_STAFF_REVIEW",
                created_at=now_iso,
            )
            await repo.save_grade_appeal(appeal)
            return (
                True,
                "Đã gửi báo cáo lượt chấm chéo bất thường đến Trợ giảng (TA Review Queue). Bài nộp chuyển sang trạng thái PENDING_STAFF_REVIEW.",
            )

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
