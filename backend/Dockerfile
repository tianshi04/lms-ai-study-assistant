# ====================================================================
# MULTI-STAGE DOCKERFILE FOR PYTHON BACKEND (USING UV PACKAGE MANAGER)
# ====================================================================

# Stage 1: Build virtual environment and install dependencies
FROM python:3.13-slim AS builder

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation & copy link mode for uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies layer with Docker layer caching
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# Copy backend source code into container
COPY . /app

# Sync project package itself into the virtual environment
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# --------------------------------------------------------------------
# Stage 2: Minimal runtime image
# --------------------------------------------------------------------
FROM python:3.13-slim AS runner

WORKDIR /app

# Copy application and virtual environment from builder stage
COPY --from=builder /app /app

# Place virtualenv executables in PATH and disable Python buffering
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    BACKEND_HOST=0.0.0.0 \
    BACKEND_PORT=8000

# Expose HTTP / ConnectRPC port
EXPOSE 8000

# Start Uvicorn ASGI server bound to 0.0.0.0
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
