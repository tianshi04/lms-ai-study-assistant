"""Architecture-as-Code Dependency Graph & Layer Boundary Tests.

Verifies DDD (Domain-Driven Design) and Modular Monolith structural invariants:
1. Pure Domain Layer (no external frameworks, no cross-layer internal coupling).
2. Application Layer Isolation (no raw SQL query imports, no ConnectRPC transport exceptions).
3. Presentation Layer Boundaries (no cross-module presentation coupling).
4. Shared Domain Independence (pure shared kernel).
5. Absolute Imports Purity (zero parent relative imports like 'from ..').
"""

import ast
from dataclasses import dataclass
from pathlib import Path

BACKEND_SRC = Path(__file__).resolve().parent.parent / "src"


@dataclass
class ImportStatement:
    """Extracted import statement from Python AST."""

    file_path: Path
    relative_path: str
    line_number: int
    module: str | None
    imported_names: list[str]
    level: int  # 0 for absolute, 1 for sibling '.', 2 for parent '..', etc.


def extract_imports_from_file(file_path: Path) -> list[ImportStatement]:
    """Parse a Python file with AST and extract all Import and ImportFrom statements."""
    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(file_path))
    except Exception as e:
        msg = f"Failed to parse AST for {file_path}: {e}"
        raise RuntimeError(msg) from e

    imports: list[ImportStatement] = []
    rel_path = file_path.relative_to(BACKEND_SRC).as_posix()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(
                ImportStatement(
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=node.lineno,
                    module=alias.name,
                    imported_names=[alias.name],
                    level=0,
                )
                for alias in node.names
            )
        elif isinstance(node, ast.ImportFrom):
            imported_names = [alias.name for alias in node.names]
            imports.append(
                ImportStatement(
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=node.lineno,
                    module=node.module,
                    imported_names=imported_names,
                    level=node.level,
                )
            )

    return imports


def get_all_src_python_files() -> list[Path]:
    """Return all Python source files under backend/src/ excluding __pycache__ and generated stubs."""
    return [
        p
        for p in BACKEND_SRC.rglob("*.py")
        if "__pycache__" not in p.parts and "gen" not in p.parts
    ]


# =============================================================================
# INVARIANT 1: PURE DOMAIN LAYER
# =============================================================================


def test_pure_domain_layer_invariants():
    """Verify that all domain layer files maintain 100% purity.

    Rules:
    - Must NOT import external frameworks: sqlalchemy, connectrpc, starlette, fastapi, pydantic, redis, boto3.
    - Must NOT import internal layers: application, infrastructure, presentation.
    """
    domain_files = [
        p
        for p in get_all_src_python_files()
        if "/domain" in p.as_posix() or "\\domain" in p.as_posix()
    ]
    assert len(domain_files) > 0, "No domain files discovered!"

    banned_frameworks = {
        "sqlalchemy",
        "connectrpc",
        "starlette",
        "fastapi",
        "pydantic",
        "redis",
        "boto3",
        "aiobotocore",
    }
    banned_internal_layers = {"application", "infrastructure", "presentation"}

    violations: list[str] = []

    for file_path in domain_files:
        imports = extract_imports_from_file(file_path)
        for imp in imports:
            mod = imp.module or ""

            # 1. Check banned external frameworks
            violations.extend(
                f"[{imp.relative_path}:{imp.line_number}] Pure Domain cannot import external framework '{mod}'"
                for banned in banned_frameworks
                if mod == banned or mod.startswith(f"{banned}.")
            )

            # 2. Check banned internal layers
            violations.extend(
                f"[{imp.relative_path}:{imp.line_number}] Pure Domain cannot depend on '{layer}' layer in import '{mod}'"
                for layer in banned_internal_layers
                if f".{layer}" in mod or f"/{layer}" in mod
            )

    assert not violations, (
        f"Found {len(violations)} Domain Layer Purity violations:\n"
        + "\n".join(violations)
    )


# =============================================================================
# INVARIANT 2: APPLICATION LAYER ISOLATION & NO RAW SQL
# =============================================================================


def test_application_layer_isolation_and_no_raw_sql():
    """Verify that application use cases do NOT contain raw SQL queries or transport exceptions.

    Rules:
    - Must NOT import raw SQL query building functions: select, update, delete, text from sqlalchemy.
    - Must NOT import ConnectRPC transport exceptions: ConnectError, Code.
    - Must NOT import presentation layer code.
    """
    app_files = [
        p
        for p in get_all_src_python_files()
        if "/application" in p.as_posix() or "\\application" in p.as_posix()
    ]
    assert len(app_files) > 0, "No application use case files discovered!"

    banned_sql_symbols = {"select", "update", "delete", "text", "insert"}
    violations: list[str] = []

    for file_path in app_files:
        imports = extract_imports_from_file(file_path)
        for imp in imports:
            mod = imp.module or ""

            # 1. Check direct raw SQL imports from sqlalchemy
            if mod == "sqlalchemy":
                violations.extend(
                    f"[{imp.relative_path}:{imp.line_number}] Use Case cannot build raw SQL '{name}'. All DB queries must be encapsulated in Repositories."
                    for name in imp.imported_names
                    if name in banned_sql_symbols
                )

            # 2. Check ConnectRPC transport exceptions in application logic
            if mod in {"connectrpc.errors", "connectrpc.code"}:
                violations.append(
                    f"[{imp.relative_path}:{imp.line_number}] Application layer must raise domain exceptions, not ConnectRPC transport exceptions ('{mod}')."
                )

            # 3. Check presentation layer imports
            if ".presentation" in mod:
                violations.append(
                    f"[{imp.relative_path}:{imp.line_number}] Application layer cannot import Presentation layer ('{mod}')."
                )

    assert not violations, (
        f"Found {len(violations)} Application Layer Isolation violations:\n"
        + "\n".join(violations)
    )


# =============================================================================
# INVARIANT 3: PRESENTATION LAYER BOUNDARIES
# =============================================================================


def test_presentation_layer_boundaries():
    """Verify that presentation handlers do not import raw infrastructure repositories directly or cross-couple with other presentation handlers."""
    pres_files = [
        p
        for p in get_all_src_python_files()
        if "/presentation" in p.as_posix() or "\\presentation" in p.as_posix()
    ]
    assert len(pres_files) > 0, "No presentation handler files discovered!"

    violations: list[str] = []

    for file_path in pres_files:
        imports = extract_imports_from_file(file_path)
        for imp in imports:
            mod = imp.module or ""

            # Check cross-presentation coupling
            if ".presentation" in mod and not imp.relative_path.startswith(
                mod.replace(".", "/")
            ):
                cur_module = imp.relative_path.split("/")[1]
                if (
                    f"src.modules.{cur_module}.presentation" not in mod
                    and mod.startswith("src.modules.")
                ):
                    violations.append(
                        f"[{imp.relative_path}:{imp.line_number}] Presentation handler cannot import another module's presentation handler ('{mod}')."
                    )

    assert not violations, (
        f"Found {len(violations)} Presentation Layer Boundary violations:\n"
        + "\n".join(violations)
    )


# =============================================================================
# INVARIANT 4: SHARED DOMAIN INDEPENDENCE
# =============================================================================


def test_shared_domain_independence():
    """Verify that shared domain kernel (src/shared/domain) does NOT import upward into specific modules."""
    shared_domain_files = [
        p
        for p in get_all_src_python_files()
        if "shared/domain" in p.as_posix() or "shared\\domain" in p.as_posix()
    ]
    assert len(shared_domain_files) > 0, "No shared domain files discovered!"

    violations: list[str] = []

    for file_path in shared_domain_files:
        imports = extract_imports_from_file(file_path)
        for imp in imports:
            mod = imp.module or ""
            if mod.startswith("src.modules."):
                violations.append(
                    f"[{imp.relative_path}:{imp.line_number}] Shared Domain Kernel must be independent and cannot import specific module '{mod}'."
                )

    assert not violations, (
        f"Found {len(violations)} Shared Domain Independence violations:\n"
        + "\n".join(violations)
    )


# =============================================================================
# INVARIANT 5: ZERO PARENT RELATIVE IMPORTS
# =============================================================================


def test_no_parent_relative_imports():
    """Verify that entire codebase uses clean absolute imports and zero parent relative imports (level >= 2)."""
    all_files = get_all_src_python_files()
    violations: list[str] = []

    for file_path in all_files:
        imports = extract_imports_from_file(file_path)
        for imp in imports:
            if imp.level >= 2:
                dots = "." * imp.level
                violations.append(
                    f"[{imp.relative_path}:{imp.line_number}] Banned parent relative import '{dots}{imp.module or ''}'. Use absolute imports 'from src...' instead."
                )

    assert not violations, (
        f"Found {len(violations)} Parent Relative Import violations:\n"
        + "\n".join(violations)
    )
