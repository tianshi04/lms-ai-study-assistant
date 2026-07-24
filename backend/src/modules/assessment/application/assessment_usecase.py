from datetime import datetime, timedelta, timezone
import random
import uuid
from typing import Any, Callable, Optional


from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    QuizCooldown,
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
from src.shared.infrastructure.database import async_session_scope


class AssessmentUseCase:
    def __init__(
        self,
        repository: Optional[AssessmentRepositoryInterface] = None,
        repo_factory: Optional[Callable[[Any], AssessmentRepositoryInterface]] = None,
        sandbox_executor: Optional[PythonCodeSandboxExecutor] = None,
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
        now_iso = datetime.now(timezone.utc).isoformat()
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
        return is_agreed, msg

    def generate_quiz_session_questions(
        self, item_id: str, seed: int = 42, pool_size: int = 10, sample_n: int = 5
    ) -> list[dict[str, Any]]:
        """Enforces BR_QUIZ_002: Samples N questions from a Pool of M and shuffles options reproducibly."""
        rng = random.Random(seed)

        # Question pool of M items
        question_pool: list[dict[str, Any]] = [
            {
                "question_id": f"q_{i + 1}",
                "text": f"Câu hỏi {i + 1} của bài thi {item_id}: Chọn đáp án đúng.",
                "options": [
                    "Tùy chọn Đúng (Gốc 0)",
                    "Tùy chọn Sai 1",
                    "Tùy chọn Sai 2",
                    "Tùy chọn Sai 3",
                ],
                "correct_option_index": 0,
            }
            for i in range(pool_size)
        ]

        sampled = rng.sample(question_pool, min(sample_n, len(question_pool)))
        result: list[dict[str, Any]] = []

        for q in sampled:
            raw_options = q.get("options", [])
            opts: list[str] = (
                [str(x) for x in raw_options] if isinstance(raw_options, list) else []
            )
            correct_idx = int(q.get("correct_option_index", 0))
            correct_text = opts[correct_idx]
            rng.shuffle(opts)
            new_correct_idx = opts.index(correct_text)

            result.append(
                {
                    "question_id": q["question_id"],
                    "text": q["text"],
                    "options": opts,
                    "shuffled_correct_index": new_correct_idx,
                }
            )

        return result

    async def start_graded_quiz_session(
        self, user_id: str, item_id: str, duration_minutes: int = 45
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=duration_minutes)

        # BR_QUIZ_002: Generate N-sampled and option-shuffled questions using unique user/attempt seed
        seed_val = abs(hash(f"{user_id}:{item_id}:{now.isoformat()[:16]}")) % (2**31)
        questions = self.generate_quiz_session_questions(item_id, seed=seed_val)

        return {
            "session_id": f"qsess-{uuid.uuid4().hex[:8]}",
            "start_time_iso": now.isoformat(),
            "expires_at_iso": expires_at.isoformat(),
            "duration_minutes": duration_minutes,
            "session_seed": seed_val,
            "questions": questions,
        }

    @require_paid_access()
    async def submit_graded_quiz(
        self,
        user_id: str,
        item_id: str,
        selected_option_indexes: list[int],
        start_time_iso: Optional[str] = None,
        duration_minutes: int = 45,
        session_seed: Optional[int] = None,
    ) -> dict[str, Any]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)

            # 1. Verify Honor Code
            honor = await repo.get_honor_code(user_id, item_id)
            if not honor or not honor.is_agreed:
                return {
                    "score_percent": 0.0,
                    "passed": False,
                    "attempts_left": 0,
                    "cooldown_seconds_left": 0,
                    "answer_explanations": [
                        "Academic Honor Code must be agreed before taking quiz."
                    ],
                }

            # 2. Check Cooldown timer
            now = datetime.now(timezone.utc)
            cooldown = await repo.get_quiz_cooldown(user_id, item_id)
            if cooldown and cooldown.cooldown_until:
                until_dt = datetime.fromisoformat(cooldown.cooldown_until)
                if now < until_dt:
                    seconds_left = int((until_dt - now).total_seconds())
                    return {
                        "score_percent": 0.0,
                        "passed": False,
                        "attempts_left": 0,
                        "cooldown_seconds_left": seconds_left,
                        "answer_explanations": [
                            f"Quiz is in 8-hour cooldown period. Please wait {seconds_left}s."
                        ],
                    }

            # 3. Grade Quiz (BR_QUIZ_002: Dynamic shuffled options grading)
            if session_seed is not None:
                generated_qs = self.generate_quiz_session_questions(
                    item_id, seed=session_seed
                )
                correct_answers = [q["shuffled_correct_index"] for q in generated_qs]
            else:
                correct_answers = [0, 1, 2, 0, 1]

            total_questions = len(correct_answers)
            correct_count = 0
            explanations: list[str] = []

            for idx, corr in enumerate(correct_answers):
                user_ans = (
                    selected_option_indexes[idx]
                    if idx < len(selected_option_indexes)
                    else -1
                )
                if user_ans == corr:
                    correct_count += 1
                    explanations.append(f"Q{idx + 1}: Correct!")
                else:
                    explanations.append(
                        f"Q{idx + 1}: Incorrect. Selected option {user_ans}, expected option {corr}."
                    )

            if start_time_iso:
                try:
                    start_dt = datetime.fromisoformat(start_time_iso)
                    if (now - start_dt).total_seconds() > duration_minutes * 60:
                        explanations.insert(
                            0,
                            f"Hết thời gian làm bài ({duration_minutes} phút). Máy chủ tự động nộp bài và chấm điểm (Auto-submit on timeout).",
                        )
                except ValueError:
                    pass

            score_percent = round((correct_count / total_questions) * 100.0, 2)
            passed = score_percent >= 80.0

            # 4. Handle Cooldown & Attempts tracking
            failed_count = cooldown.failed_attempts_count if cooldown else 0
            attempts_left = 3 - failed_count - 1 if not passed else 3

            if passed:
                failed_count = 0
                cooldown_until_iso = None
                seconds_left = 0
            else:
                failed_count += 1
                if failed_count >= 3:
                    # Activate 8-hour Cooldown
                    cooldown_until_dt = now + timedelta(hours=8)
                    cooldown_until_iso = cooldown_until_dt.isoformat()
                    seconds_left = 28800
                    attempts_left = 0
                else:
                    cooldown_until_iso = None
                    seconds_left = 0

            # Save submission
            submission_id = f"sub-{uuid.uuid4().hex[:8]}"
            prev_submissions = await repo.get_quiz_submissions(user_id, item_id)
            attempt_number = len(prev_submissions) + 1

            submission = QuizSubmission(
                id=submission_id,
                user_id=user_id,
                item_id=item_id,
                selected_option_indexes=selected_option_indexes,
                score_percent=score_percent,
                passed=passed,
                attempt_number=attempt_number,
                created_at=now.isoformat(),
            )
            await repo.save_quiz_submission(submission)

            # Update Cooldown entity
            new_cooldown = QuizCooldown(
                user_id=user_id,
                item_id=item_id,
                failed_attempts_count=failed_count,
                last_attempt_at=now.isoformat(),
                cooldown_until=cooldown_until_iso,
            )
            await repo.save_quiz_cooldown(new_cooldown)

            return {
                "score_percent": score_percent,
                "passed": passed,
                "attempts_left": max(0, attempts_left),
                "cooldown_seconds_left": seconds_left,
                "answer_explanations": explanations,
            }

    @require_paid_access()
    async def submit_auto_graded_lab(
        self, user_id: str, item_id: str, source_code: str, language: str
    ) -> dict[str, Any]:
        test_cases = [
            {
                "input": "solution([1, 2, 3])",
                "expected_output": "6",
                "assertion_code": "assert solution([1, 2, 3]) == 6",
            },
            {
                "input": "solution([-1, 1])",
                "expected_output": "0",
                "assertion_code": "assert solution([-1, 1]) == 0",
            },
            {
                "input": "solution([])",
                "expected_output": "0",
                "assertion_code": "assert solution([]) == 0",
            },
        ]

        result = await self.sandbox_executor.execute_python(source_code, test_cases)
        now_iso = datetime.now(timezone.utc).isoformat()
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
        now_iso = datetime.now(timezone.utc).isoformat()
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

        return (
            sub_id,
            "Assignment submitted successfully. Please complete 3 peer reviews to view your score.",
        )

    async def get_peer_reviews_to_grade(
        self, user_id: str, item_id: str
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(
                item_id, exclude_user_id=user_id
            )

        selected = submissions[:3]
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
        item_id: Optional[str] = None,
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
                resolved_item_id = sub.item_id if sub else "item-peer-1"

            existing_reviews = await repo.get_peer_reviews_for_submission(submission_id)
            is_outlier = False
            if existing_reviews:
                prev_scores = [r.total_score for r in existing_reviews]
                all_scores = prev_scores + [score_percent]
                max_delta = max(all_scores) - min(all_scores)
                if max_delta > 30.0:
                    is_outlier = True

            now_iso = datetime.now(timezone.utc).isoformat()
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

        msg = "Peer review graded successfully."
        if is_outlier:
            msg += " (Outlier Flagged: Score variation exceeds 30%, TA notified)."
        return True, msg

    async def submit_grade_appeal(
        self, user_id: str, submission_id: str, appeal_reason: str
    ) -> tuple[bool, str]:
        appeal_id = f"appeal-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()
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
            await repo.save_grade_appeal(appeal)

        return True, "PENDING"

    async def list_peer_submissions_needing_staff_regrade(
        self, item_id: str
    ) -> list[dict[str, Any]]:
        """Returns list of peer assignment submissions older than 5 days with fewer than 3 reviews (BR_PEER_004)."""
        now = datetime.now(timezone.utc)
        five_days_ago = now - timedelta(days=5)

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(item_id)
            regrade_list = []
            for s in submissions:
                try:
                    sub_dt = datetime.fromisoformat(s.created_at)
                except (ValueError, TypeError):
                    sub_dt = now

                reviews = await repo.get_peer_reviews_for_submission(s.id)
                if len(reviews) < 3 and sub_dt <= five_days_ago:
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
