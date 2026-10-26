# Implementation Plan: Course Recommendations & Foundational Prerequisite

## Phase Breakdown

### Phase 1: Database Schema & Vector Storage (PostgreSQL & pgvector)
1. Thêm model `CourseEmbeddingModel` vào `backend/src/modules/catalog/infrastructure/models.py`.
2. Tạo file migration bằng Alembic: `alembic revision --autogenerate -m "add_course_embeddings_table"`.
3. Áp dụng migration vào PostgreSQL: `alembic upgrade head`.
4. Kiểm tra schema drift: `alembic check`.

### Phase 2: Embedding Engine & Recommendation Service (Backend)
1. Tạo `EmbeddingService` (`fastembed` với model `sentence-transformers/all-MiniLM-L6-v2`):
   - Hàm `generate_course_payload(course) -> str`.
   - Hàm `generate_embedding(text) -> list[float]`.
2. Tạo `RecommendationService`:
   - Hàm `get_foundational_course(course_id) -> Optional[Course]`.
   - Hàm `get_recommended_courses(course_id, target_count=4) -> list[tuple[Course, float, str]]`.
   - Áp dụng công thức chấm điểm: $Score = 0.55 \cdot S_{\text{vector}} + 0.30 \cdot I_{\text{author}} + 0.15 \cdot R_{\text{norm}}$.
3. Cập nhật `seed.py` để tự động tính toán và nạp vector cho các khóa học hiện có.

### Phase 3: Protobuf Contract & Presentation Handler
1. Mở rộng message `CourseRecommendationItem` trong `proto/catalog/v1/catalog.proto`:
   - `Course course = 1;`
   - `string badge_label = 2;`
   - `double score = 3;`
2. Cập nhật `GetCourseDetailResponse`:
   - `Course course = 1;`
   - `Course foundational_course = 2;`
   - `repeated CourseRecommendationItem recommended_courses = 3;`
3. Chạy `make format-proto`, `make lint-proto` và `make gen`.
4. Cập nhật `CatalogHandler` trong `backend/src/modules/catalog/presentation/catalog_handler.py`.

### Phase 4: Frontend UI Upgrade & Experience Polish
1. Cập nhật `frontend/src/app/courses/[courseId]/CourseDetailClient.tsx`:
   - Xóa bỏ huy hiệu cứng `Khóa học Chuyên sâu (Specialization)`.
   - Hiển thị huy hiệu `subject` (Lĩnh vực) và `level` (Cấp độ).
   - Render Card Mục 1: "Khóa học nền tảng khuyến nghị".
   - Render Grid 4 cột Mục 2: "Khóa học đề xuất liên quan" (kèm badge).
2. Xử lý trường hợp Giảng viên để trống: Hiển thị `Đội ngũ Giảng viên [Tên Đối tác]`.

### Phase 5: Verification & Quality Assurance
1. Chạy Backend Tests: `pytest` + `ruff` + `ty`.
2. Chạy Frontend Quality Check: `pnpm run fix` và `pnpm run check`.
3. Kiểm thử trực quan trên trình duyệt bằng Playwright / dev server.
