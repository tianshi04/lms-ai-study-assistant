from datetime import datetime, timedelta, timezone
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
from src.modules.assessment.infrastructure.repository import SQLAlchemyAssessmentRepository
from src.modules.assessment.infrastructure.sandbox_service import PythonCodeSandboxExecutor
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
        if self.repository:
            return self.repository
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
        msg = "Academic Honor Code agreed successfully." if is_agreed else "Academic Honor Code rejected."
        return is_agreed, msg

    async def submit_graded_quiz(
        self, user_id: str, item_id: str, selected_option_indexes: list[int]
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
                    "answer_explanations": ["Academic Honor Code must be agreed before taking quiz."],
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
                        "answer_explanations": [f"Quiz is in 8-hour cooldown period. Please wait {seconds_left}s."],
                    }

            # 3. Grade Quiz (Sample correct answer pattern: Option index 0 for all or matches)
            # Default correct options pattern: [0, 1, 2, 0, 1]
            correct_answers = [0, 1, 2, 0, 1]
            total_questions = len(correct_answers)
            correct_count = 0
            explanations: list[str] = []

            for idx, corr in enumerate(correct_answers):
                user_ans = selected_option_indexes[idx] if idx < len(selected_option_indexes) else -1
                if user_ans == corr:
                    correct_count += 1
                    explanations.append(f"Q{idx + 1}: Correct!")
                else:
                    explanations.append(f"Q{idx + 1}: Incorrect. Selected option {user_ans}, expected option {corr}.")

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

        return sub_id, "Assignment submitted successfully. Please complete 3 peer reviews to view your score."

    async def get_peer_reviews_to_grade(
        self, user_id: str, item_id: str
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(item_id, exclude_user_id=user_id)

        selected = submissions[:3]
        result: list[dict[str, Any]] = []

        default_rubric = [
            RubricCriteria(criteria_id="c1", title="Code Quality & Structure", max_score=10.0),
            RubricCriteria(criteria_id="c2", title="Documentation & Comments", max_score=10.0),
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
        self, review_id: str, reviewer_user_id: str, item_id: str, graded_criteria: list[RubricCriteria]
    ) -> tuple[bool, str]:
        total_given = sum(c.score_given for c in graded_criteria)
        max_possible = sum(c.max_score for c in graded_criteria) or 1.0
        score_percent = round((total_given / max_possible) * 100.0, 2)

        submission_id = review_id.replace("rev-", "") if review_id.startswith("rev-") else review_id

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
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
                item_id=item_id,
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
