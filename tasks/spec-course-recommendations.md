# Spec: Khóa Học Nền Tảng & Đề Xuất Thông Minh (Vector Embedding RecSys)

## 1. Objective (Mục tiêu)
Xây dựng tính năng tự động suy luận và hiển thị 2 mục trên trang chi tiết khóa học (`/courses/[courseId]`):
1. **Mục 1: Khóa học Nền tảng (Foundational / Prerequisite Course)**:
   - Khuyến nghị mềm (Soft Advisory / Open Enrollment - tuyệt đối không khóa cửa học viên).
   - Tự động phát hiện dựa trên chuỗi Specialization hoặc độ tương đồng Vector cao nhất.
   - Tự động ẩn nếu khóa học không có môn tiên quyết.
2. **Mục 2: Khóa học Đề xuất (4 Recommended Courses)**:
   - Luôn luôn lấp đầy đúng 4 thẻ khóa học chuẩn Material Design 3.
   - Tính điểm bằng thuật toán Hybrid kết hợp Vector Embedding (`fastembed` + `pgvector`), Tác giả/Đối tác, và Điểm đánh giá (Rating).
   - **Đã loại bỏ hoàn toàn yếu tố Cấp độ (`level`)** khỏi công thức tính điểm để tránh thiên kiến và nghịch lý "Sơ cấp cần Sơ cấp".
   - Chỉ áp dụng cho các khóa học đã công khai (`PUBLISHED`), không tính toán khi ở trạng thái `DRAFT`.
3. **Chuẩn hóa Giao diện hiện tại**:
   - Xóa bỏ huy hiệu cứng `"Khóa học Chuyên sâu (Specialization)"` đang bị hardcode.
   - Hiển thị đầy đủ 2 nhãn bị thiếu: **Lĩnh vực (`subject`)** và **Cấp độ (`level`)**.
   - Hiển thị fallback tên giảng viên: `Đội ngũ [Tên Đối tác]` nếu danh sách giảng viên rỗng.

---

## 2. Scoring Formula (Công thức Trọng số Đề xuất)

$$\mathbf{Score(A, B)} = 0.55 \cdot S_{\text{vector}} + 0.30 \cdot I_{\text{author}} + 0.15 \cdot R_{\text{norm}}$$

- **$S_{\text{vector}}$ (55%)**: Cosine Similarity giữa 2 vector của Course A và Course B: $1 - \text{Cosine Distance} \in [0, 1]$.
- **$I_{\text{author}}$ (30%)**: $1.0$ nếu Course B cùng Giảng viên (`owner_id`) hoặc cùng Đối tác (`partner_name`) với Course A; ngược lại $= 0.0$.
- **$R_{\text{norm}}$ (15%)**: $\frac{\text{Rating}}{5.0} \in [0, 1]$.

---

## 3. Tech Stack
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL 17 + `pgvector` (Cosine Distance `<=>`), `fastembed` (model `sentence-transformers/all-MiniLM-L6-v2`, 384 dims, chạy local CPU).
- **API Contract**: ConnectRPC / Protobuf v3 (`proto/catalog/v1/catalog.proto`).
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Base UI, TanStack Query.

---

## 4. Commands (Lệnh thực thi chuẩn)
- **Cài đặt & Format Backend**:
  - Migration DB: `cd backend && uv run alembic revision --autogenerate -m "add_course_embeddings_table" && uv run alembic upgrade head`
  - Seed Vector: `cd backend && uv run python -m src.seed`
  - Test Backend: `cd backend && uv run pytest tests/`
  - Lint Backend: `cd backend && uv run ruff check .`
- **Protobuf**:
  - Format & Lint Proto: `make format-proto && make lint-proto`
  - Gen Code Stubs: `make gen`
- **Frontend**:
  - Type-check: `cd frontend && pnpm run type-check`
  - Quality check: `cd frontend && pnpm run fix && pnpm run check`
  - Run Dev: `cd frontend && pnpm run dev`

---

## 5. Project Structure & File Boundaries
- Database Model: `backend/src/modules/catalog/infrastructure/models.py` (`CourseEmbeddingModel`)
- Embedding Service: `backend/src/modules/catalog/infrastructure/embedding_service.py`
- Recommendation Service: `backend/src/modules/catalog/application/recommendation_service.py`
- API Protobuf: `proto/catalog/v1/catalog.proto`
- Presentation Handler: `backend/src/modules/catalog/presentation/catalog_handler.py`
- Frontend UI: `frontend/src/app/courses/[courseId]/CourseDetailClient.tsx`
- Query Hooks: `frontend/src/lib/query_hooks.ts`

---

## 6. Boundaries (Ranh giới Kỹ thuật)
- **Always do**:
  - Tuân thủ quy tắc Alembic Migration tuần tự: Model $\to$ autogenerate $\to$ upgrade head $\to$ check-migrations.
  - Xóa sạch hardcode, dùng Semantic Design Tokens trong Tailwind v4.
  - Lọc loại trừ chính khóa học hiện tại và khóa học nền tảng khỏi danh sách 4 khóa đề xuất.
- **Never do**:
  - Không gọi mô hình embedding on-the-fly khi người dùng tải trang chi tiết khóa học.
  - Không hardcode màu sắc (raw hex codes) trên Frontend.
  - Không bắt buộc người dùng hay giảng viên phải tự nhập vector bằng tay.

---

## 7. Success Criteria (Tiêu chí Nghiệm thu Thành công)
1. Bảng `course_embeddings` tồn tại trong PostgreSQL với extension `pgvector` và chỉ mục HNSW.
2. Tất cả các khóa học đã `PUBLISHED` đều có vector embedding 384 chiều sinh bởi `fastembed`.
3. API `GetCourseDetail` trả về `foundational_course` (nếu có) và đúng 4 `recommended_courses`.
4. Trang chi tiết khóa học `/courses/[courseId]` hiển thị:
   - Thẻ Khóa học Nền tảng (có nhãn "Khuyến nghị học trước" và tiến độ học tập).
   - Lưới 4 Thẻ Khóa học Đề xuất (có nhãn phân biệt "Cùng Giảng viên" hoặc "Gợi ý tương tự").
   - Nhãn Cấp độ và Lĩnh vực chuyên môn hiển thị đầy đủ, không còn chữ Specialization bị hardcode.
5. Kiểm tra chất lượng: `make test` ở backend và `pnpm run check` ở frontend đều pass 100%.
