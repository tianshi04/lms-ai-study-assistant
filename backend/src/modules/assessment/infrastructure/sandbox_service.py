from dataclasses import dataclass
import ast
import asyncio
import tempfile
import os
import sys
from typing import Any

FORBIDDEN_MODULES = {
    "os",
    "sys",
    "subprocess",
    "shutil",
    "importlib",
    "pathlib",
    "socket",
    "requests",
    "urllib",
    "pty",
    "ctypes",
    "pickle",
    "multiprocessing",
    "threading",
}

FORBIDDEN_BUILTINS = {"eval", "exec", "compile", "__import__", "open"}


def validate_code_security(source_code: str) -> tuple[bool, str]:
    """Perform AST static analysis to block dangerous modules and built-in functions."""
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return True, ""  # Syntax errors will be reported during python execution

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                mod_base = alias.name.split(".")[0]
                if mod_base in FORBIDDEN_MODULES:
                    return (
                        False,
                        f"Security Violation: Forbidden module import '{alias.name}'",
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                mod_base = node.module.split(".")[0]
                if mod_base in FORBIDDEN_MODULES:
                    return (
                        False,
                        f"Security Violation: Forbidden module import '{node.module}'",
                    )
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_BUILTINS:
                return (
                    False,
                    f"Security Violation: Forbidden function call '{node.func.id}()'",
                )

    return True, ""


@dataclass
class SandboxResult:
    score_percent: float
    passed: bool
    total_test_cases: int
    passed_test_cases: int
    test_logs: str


class PythonCodeSandboxExecutor:
    """Async Sandbox Executor for Auto-Graded Labs.

    Executes Python source code with AST static security checks, environment isolation,
    and timeout constraints.
    """

    def __init__(self, timeout_seconds: float = 5.0, use_docker: bool = False) -> None:
        self.timeout_seconds = timeout_seconds
        self.use_docker = use_docker

    async def execute_python(
        self, source_code: str, test_cases: list[dict[str, Any]]
    ) -> SandboxResult:
        # 1. AST Security Validation
        is_safe, sec_err = validate_code_security(source_code)
        if not is_safe:
            return SandboxResult(
                score_percent=0.0,
                passed=False,
                total_test_cases=len(test_cases) or 1,
                passed_test_cases=0,
                test_logs=f"[FAIL] {sec_err}",
            )

        if not test_cases:
            # Default single assertion test case if none provided
            test_cases = [
                {"input": "", "expected_output": "", "assertion_code": "assert True"}
            ]

        passed_count = 0
        total_count = len(test_cases)
        log_lines: list[str] = []

        # 2. Clean environment stripping host secrets (.env, DB credentials)
        clean_env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PYTHONPATH": "",
        }

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
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".py", delete=False
            ) as tmp_file:
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
                    env=clean_env,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(input=stdin_bytes),
                        timeout=self.timeout_seconds,
                    )
                    out_text = stdout.decode("utf-8", errors="replace").strip()
                    err_text = stderr.decode("utf-8", errors="replace").strip()

                    if "TEST_PASSED" in out_text:
                        passed_count += 1
                        log_lines.append(
                            f"[PASS] Test Case #{idx}: Passed ({assertion or 'Input test'})"
                        )
                    elif "ASSERTION_FAILED" in out_text:
                        exp_msg = f" (Expected: {expected})" if expected else ""
                        log_lines.append(
                            f"[FAIL] Test Case #{idx}: Failed ({assertion}) - Assertion Error{exp_msg}"
                        )
                    elif "EXECUTION_ERROR" in out_text:
                        log_lines.append(
                            f"[FAIL] Test Case #{idx}: Runtime Error: {out_text}"
                        )
                    elif err_text:
                        log_lines.append(
                            f"[FAIL] Test Case #{idx}: Syntax/Runtime Error: {err_text}"
                        )
                    else:
                        log_lines.append(
                            f"[FAIL] Test Case #{idx}: Failed ({assertion}) - {out_text}"
                        )
                except asyncio.TimeoutError:
                    proc.kill()
                    try:
                        await proc.wait()
                    except Exception:
                        pass
                    log_lines.append(
                        f"[TIMEOUT] Test Case #{idx}: Timed out (> {self.timeout_seconds}s)"
                    )
            except Exception as exc:
                log_lines.append(f"[FAIL] Test Case #{idx}: System error: {exc}")
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass

        score_percent = (
            round((passed_count / total_count) * 100.0, 2) if total_count > 0 else 0.0
        )
        is_passed = score_percent >= 80.0
        logs = "\n".join(log_lines)

        return SandboxResult(
            score_percent=score_percent,
            passed=is_passed,
            total_test_cases=total_count,
            passed_test_cases=passed_count,
            test_logs=logs,
        )
