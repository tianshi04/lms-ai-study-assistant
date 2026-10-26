# Task List: Course Recommendations & Foundational Prerequisite

- [x] **Task 1: Database Model & Alembic Migration for Course Embeddings**
  - [x] Add `CourseEmbeddingModel` in `backend/src/modules/catalog/infrastructure/models.py` with `pgvector` Vector(384)
  - [x] Run `uv run alembic revision --autogenerate -m "add_course_embeddings_table"`
  - [x] Review migration script, add HNSW index for cosine distance (`idx_course_embeddings_hnsw`)
  - [x] Run `uv run alembic upgrade head` (Linear revision `c773f6b0f9f7` -> `48872472b096`)
  - [x] Verify database table creation and indices in PostgreSQL
  - *Verification:* Table `course_embeddings` exists in PostgreSQL with HNSW index.

- [x] **Task 2: FastEmbed Service & Hybrid Recommendation Engine**
  - [x] Implement `EmbeddingService` in `backend/src/modules/catalog/infrastructure/embedding_service.py` (`all-MiniLM-L6-v2`, CPU ONNX, 0 API Key)
  - [x] Implement `RecommendationService` in `backend/src/modules/catalog/infrastructure/recommendation_service.py` with formula $Score = 0.55 \cdot S_{\text{vector}} + 0.30 \cdot I_{\text{author}} + 0.15 \cdot R_{\text{norm}}$
  - [x] Precompute and store embeddings for all 6 active published courses in database
  - [x] Verify scoring, ranking, and deduplication logic
  - *Verification:* Live embedding computation and scoring confirmed.

- [x] **Task 3: Protobuf Contract & Catalog Handler Update**
  - [x] Update `proto/catalog/v1/catalog.proto` with `CourseRecommendationItem`, `foundational_course`, and `recommended_courses` in `GetCourseDetailResponse`
  - [x] Run `make format-proto`, `make lint-proto`, and `make gen` (stubs compiled in backend & frontend)
  - [x] Update domain repository interface `backend/src/modules/catalog/domain/repositories.py`
  - [x] Implement repository queries in `backend/src/modules/catalog/infrastructure/repository.py`
  - [x] Update application usecase `backend/src/modules/catalog/application/course_usecase.py`
  - [x] Update presentation handler `CatalogHandler.get_course_detail` in `backend/src/modules/catalog/presentation/catalog_handler.py`
  - *Verification:* RPC `GetCourseDetail` returns foundational course and 4 recommendations.

- [x] **Task 4: Frontend UI Redesign on Course Detail Page**
  - [x] In `frontend/src/app/courses/[courseId]/CourseDetailClient.tsx`:
    - [x] Remove hardcoded "Khóa học Chuyên sâu (Specialization)" text
    - [x] Add dynamic Subject and Level badges in Hero banner
    - [x] Add fallback instructor text when `instructorNames` is empty (`Đội ngũ [PartnerName]`)
    - [x] Implement Section 1: "Khóa học nền tảng khuyến nghị" (Callout card above Syllabus with soft advisory)
    - [x] Implement Section 2: "Khóa học đề xuất liên quan" (4-column responsive grid below Reviews with badges)
  - [x] Update `useCatalogQueries.ts` and `CourseCard.tsx` with recommendation badge support
  - [x] Update `CourseCompletionModal.tsx` to handle `GetCourseDetailResponse`
  - *Verification:* Run `pnpm run check` (TypeScript, Oxlint, Oxfmt) - 100% clean pass.

- [ ] **Task 5: End-to-End Visual Verification & Commit**
  - [x] Test live ConnectRPC endpoints on courses (Microeconomics, Econometrics)
  - [ ] Review UI display on browser
  - [ ] Commit with Conventional Commits
