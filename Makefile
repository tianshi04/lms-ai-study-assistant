.PHONY: help format-proto check-proto lint-proto gen

help:
	@echo "Available commands:"
	@echo "  make format-proto - Format all Protobuf files in-place (buf format proto -w)"
	@echo "  make check-proto  - Check Protobuf formatting without modifying (buf format proto -d --exit-code)"
	@echo "  make lint-proto   - Lint Protobuf files (buf lint proto)"
	@echo "  make gen          - Generate API stubs for backend and frontend"

format-proto:
	buf format proto -w

check-proto:
	buf format proto -d --exit-code

lint-proto:
	buf lint proto

gen:
	cd backend && $(MAKE) gen
	cd frontend && pnpm run gen
