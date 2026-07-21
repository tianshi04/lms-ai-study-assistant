.PHONY: help gen dev test format infra infra-down infra-logs

help:
	@echo "Available commands:"
	@echo "  make infra      - Start infrastructure containers (PostgreSQL pgvector & MinIO)"
	@echo "  make infra-down - Stop infrastructure containers"
	@echo "  make infra-logs - View infrastructure logs"
	@echo "  make gen        - Generate protobuf and connect stubs"
	@echo "  make dev        - Start local dev server"
	@echo "  make format     - Format code and fix auto-fixable lint issues"
	@echo "  make test       - Run test suite (pytest + ruff + ty)"

infra:
	docker compose --profile infra up -d

infra-down:
	docker compose --profile infra down

infra-logs:
	docker compose --profile infra logs -f

gen:
	buf generate ../proto

dev:
	uv run uvicorn main:app --port 8000 --reload

format:
	uv run ruff format .
	uv run ruff check --fix .

test:
	uv run pytest
