from dataclasses import dataclass
import asyncio
import tempfile
import os
import sys
from typing import Any


@dataclass
class SandboxResult:
    score_percent: float
    passed: bool
    total_test_cases: int
    passed_test_cases: int
    test_logs: str


class PythonCodeSandboxExecutor:
    """Async Sandbox Executor for Auto-Graded Labs.

    Executes Python source code in an isolated subprocess with timeout constraints.
    """

    def __init__(self, timeout_seconds: float = 5.0) -> None:
        self.timeout_seconds = timeout_seconds

    async def execute_python(
        self, source_code: str, test_cases: list[dict[str, Any]]
    ) -> SandboxResult:
        if not test_cases:
            # Default single assertion test case if none provided
            test_cases = [{"input": "", "expected_output": "", "assertion_code": "assert True"}]

        passed_count = 0
        total_count = len(test_cases)
        log_lines: list[str] = []

        for idx, tc in enumerate(test_cases, start=1):
            assertion = tc.get("assertion_code", "")
            input_val = tc.get("input", "")
            expected = tc.get("expected_output", "")

            if assertion:
                indented_assertion = "\n    ".join(assertion.splitlines())
            else:
                indented_assertion = "pass"

            # Combine source code with test runner script
            runner_script = f"""
{source_code}

# Test Case #{idx}
try:
    {indented_assertion}
    print("TEST_PASSED")
except AssertionError as e:
    print(f"ASSERTION_FAILED: {{e}}")
except Exception as e:
    print(f"EXECUTION_ERROR: {{e}}")
"""
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp_file:
                tmp_file.write(runner_script)
                tmp_path = tmp_file.name

            stdin_bytes = input_val.encode("utf-8") if input_val else None

            try:
                proc = await asyncio.create_subprocess_exec(
                    sys.executable,
                    tmp_path,
                    stdin=asyncio.subprocess.PIPE if stdin_bytes else None,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(input=stdin_bytes), timeout=self.timeout_seconds
                    )
                    out_text = stdout.decode("utf-8", errors="replace").strip()
                    err_text = stderr.decode("utf-8", errors="replace").strip()

                    if "TEST_PASSED" in out_text:
                        passed_count += 1
                        log_lines.append(f"[PASS] Test Case #{idx}: Passed ({assertion or 'Input test'})")
                    elif "ASSERTION_FAILED" in out_text:
                        exp_msg = f" (Expected: {expected})" if expected else ""
                        log_lines.append(
                            f"[FAIL] Test Case #{idx}: Failed ({assertion}) - Assertion Error{exp_msg}"
                        )
                    elif "EXECUTION_ERROR" in out_text:
                        log_lines.append(f"[FAIL] Test Case #{idx}: Runtime Error: {out_text}")
                    elif err_text:
                        log_lines.append(f"[FAIL] Test Case #{idx}: Syntax/Runtime Error: {err_text}")
                    else:
                        log_lines.append(f"[FAIL] Test Case #{idx}: Failed ({assertion}) - {out_text}")
                except asyncio.TimeoutError:
                    proc.kill()
                    try:
                        await proc.wait()
                    except Exception:
                        pass
                    log_lines.append(f"[TIMEOUT] Test Case #{idx}: Timed out (> {self.timeout_seconds}s)")
            except Exception as exc:
                log_lines.append(f"[FAIL] Test Case #{idx}: System error: {exc}")
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass

        score_percent = round((passed_count / total_count) * 100.0, 2) if total_count > 0 else 0.0
        is_passed = score_percent >= 80.0
        logs = "\n".join(log_lines)

        return SandboxResult(
            score_percent=score_percent,
            passed=is_passed,
            total_test_cases=total_count,
            passed_test_cases=passed_count,
            test_logs=logs,
        )
