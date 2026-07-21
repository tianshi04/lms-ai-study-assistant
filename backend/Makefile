.PHONY: help gen dev test format seed seed-reset infra infra-down infra-clean infra-logs

help:
	@echo "Available commands:"
	@echo "  make infra       - Start infrastructure containers (PostgreSQL pgvector & MinIO)"
	@echo "  make infra-down  - Stop infrastructure containers (preserves DB volume data)"
	@echo "  make infra-clean - Stop containers & wipe database volumes completely (-v)"
	@echo "  make infra-logs  - View infrastructure logs"
	@echo "  make gen         - Generate protobuf and connect stubs"
	@echo "  make dev         - Start local dev server"
	@echo "  make seed        - Seed database with initial sample courses (Upsert mode)"
	@echo "  make seed-reset  - Truncate all tables and re-seed pristine initial catalog"
	@echo "  make format      - Format code and fix auto-fixable lint issues"
	@echo "  make test        - Run test suite (pytest + ruff + ty)"

infra:
	docker compose --profile infra up -d

infra-down:
	docker compose --profile infra down

infra-clean:
	docker compose --profile infra down -v

infra-logs:
	docker compose --profile infra logs -f

gen:
	buf generate ../proto

dev:
	uv run uvicorn main:app --port 8000 --reload

seed:
	uv run python -m src.seed

seed-reset:
	uv run python -m src.seed --reset

format:
	uv run ruff format .
	uv run ruff check --fix .

test:
	uv run pytest
