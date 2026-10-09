import ast
import json
import logging
from datetime import UTC, datetime
from typing import Any

from uuid6 import uuid7

from src.modules.assessment.domain import LabSubmission
from src.shared.access_policy import require_paid_access
from src.shared.infrastructure.database import async_session_scope

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


class CodingLabUseCase(BaseAssessmentUseCase):
    """Application Use Case for automated coding lab evaluation with test cases and sandbox execution."""

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
                    repo = self.repo_factory(session)
                    test_cases_json = await repo.get_lab_test_cases_json(item_id)
                    if test_cases_json:
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
        sub_id = f"lab-{uuid7().hex[:8]}"

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
