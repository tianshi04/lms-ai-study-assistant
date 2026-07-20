.PHONY: help gen dev test format

help:
	@echo "Available commands:"
	@echo "  make gen    - Generate protobuf and connect stubs"
	@echo "  make dev    - Start local dev server"
	@echo "  make format - Format code and fix auto-fixable lint issues"
	@echo "  make test   - Run test suite (pytest + ruff + ty)"

gen:
	buf generate ../proto

dev:
	uv run uvicorn main:app --port 8000 --reload

format:
	uv run ruff format .
	uv run ruff check --fix .

test:
	uv run pytest
