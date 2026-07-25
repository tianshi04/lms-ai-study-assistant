import subprocess
import sys


def test_ruff_lint():
    """Verify that all files pass Ruff linter checks."""
    result = subprocess.run(
        [sys.executable, "-m", "ruff", "check", "."], capture_output=True, text=True
    )
    assert result.returncode == 0, (
        f"Ruff linter failed:\n{result.stdout}\n{result.stderr}"
    )


def test_ruff_format():
    """Verify that all files pass Ruff formatting checks."""
    result = subprocess.run(
        [sys.executable, "-m", "ruff", "format", "--check", "."],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"Ruff format check failed:\n{result.stdout}\n{result.stderr}"
    )


def test_ty_typecheck():
    """Verify that all files pass Ty static type checking."""
    result = subprocess.run(
        [sys.executable, "-m", "ty", "check"], capture_output=True, text=True
    )
    assert result.returncode == 0, (
        f"Ty type check failed:\n{result.stdout}\n{result.stderr}"
    )
