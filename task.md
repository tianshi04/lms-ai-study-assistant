<prompt>
    <meta>
        <title>Thêm Phân hệ Đánh giá Khóa học (1-5★) & Modal Chúc mừng Hoàn thành Nhận chứng chỉ</title>
        <author>Nguyen Huu Ngoc Hoang</author>
        <date>23/07/2026</date>
    </meta>
    <goal>Bổ sung tính năng Đánh giá Khóa học (Course Rating & Review 1-5 sao) và Popup Chúc mừng Hoàn thành kèm nút Nhận chứng chỉ trực tiếp khi đạt 100% tiến độ bài học chuẩn Coursera.</goal>
    <frsReference>Module Catalog & Learning - Course Completion, Rating & Review Service</frsReference>
    <planReference>ENHANCEMENT-COMPLETION-RATING-001</planReference>
    <taskUnit>Course Completion Celebration Modal & Rating/Review System</taskUnit>
    <context>
        Hệ thống LMS đã có phân hệ Cấp chứng chỉ (Verified Certificate) và Theo dõi tiến độ học tập (Progress Tracking). Tuy nhiên, khi học viên xem hết 100% bài học và pass các bài thi, giao diện bài học chưa xuất hiện Popup pháo hoa chúc mừng hoàn thành khóa học kèm nút "Nhận chứng chỉ" (`/verify/[certId]`) và form "Đánh giá & Nhận xét khóa học (1-5 sao)".
        
        *Hành động bắt buộc*: 
        1. Đọc và phân tích các tài liệu `docs/03_functional_specifications.md` và `SPRINT_PLAN.md`.
        2. Bổ sung các tệp Proto contract, Backend module, Frontend components & E2E tests để hoàn thiện luồng trải nghiệm hoàn thành khóa học chuẩn Coursera.
    </context>
    <scope>
        - Cập nhật Proto contract `proto/catalog/v1/catalog.proto` để định nghĩa RPC `SubmitCourseReview` & `ListCourseReviews`.
        - Cập nhật Backend module `catalog` (entities, models, repository, usecase, handler) & Alembic migration.
        - Cập nhật Frontend UI:
          + Thêm `CourseCompletionModal.tsx` chúc mừng khi hoàn thành 100% bài học kèm form đánh giá 1-5 sao và nút "Nhận chứng chỉ".
          + Cập nhật trang thông tin khóa học `/courses/[courseId]` hiển thị danh sách đánh giá & số sao trung bình.
    </scope>
    <hardRules>
        1. Tuân thủ nghiêm ngặt nguyên tắc DDD & Modular Monolith: Không import trực tiếp nội bộ giữa các module.
        2. Không trust user_id từ request payload đối với các RPC authenticated, bắt buộc giải mã qua AuthInterceptor.
        3. Sử dụng icon inline SVG chuyên nghiệp, không dùng text-emoji.
    </hardRules>
    <tasks>
        1. Phân tích tài liệu `docs/` và cập nhật `SPRINT_PLAN.md` đính kèm phân hệ Course Rating & Completion Modal.
        2. Cập nhật `proto/catalog/v1/catalog.proto` định nghĩa các message & RPC cho Course Rating/Review và sinh lại Protobuf stubs (`npm run gen` & `make gen`).
        3. Cập nhật Backend ORM Models, Migration, Repository & Use Case để lưu trữ và truy vấn đánh giá khóa học.
        4. Xây dựng UI Component `CourseCompletionModal.tsx` và tích hợp vào Player `/learn/[courseId]`.
        5. Cập nhật trang `/courses/[courseId]` hiển thị đánh giá & số sao trung bình của khóa học.
        6. Tạo tệp `task.md` ở thư mục gốc để quản lý và báo cáo chi tiết các công việc của tác nhân AI.
    </tasks>
    <constraints>Đảm bảo 100% tính năng mới giữ nguyên kiến trúc DDD Clean Architecture và chạy qua các bộ kiểm thử lint/type check.</constraints>
    <acceptanceCriteria>
        - Học viên khi đạt 100% tiến độ bài học sẽ tự động thấy Popup pháo hoa chúc mừng hoàn thành khóa học.
        - Có thể click nút "Nhận chứng chỉ xác minh" chuyển hướng tới trang `/verify/[certId]`.
        - Có thể gửi đánh giá 1-5 sao kèm lời nhận xét, dữ liệu được lưu thành công vào PostgreSQL.
        - Trang chi tiết khóa học `/courses/[courseId]` hiển thị chính xác điểm sao trung bình và danh sách đánh giá của học viên.
    </acceptanceCriteria>
    <testPlan>
        [Tiêu chuẩn nghiệm thu dành cho Engineer]
        - Kiểm tra mã nguồn Backend bằng ruff & ty check.
        - Chạy thử luồng học 100% tiến độ trên trình duyệt để kiểm tra hiển thị Modal Chúc mừng & nút Nhận chứng chỉ.
        - Gửi thử đánh giá 5 sao và kiểm tra hiển thị số sao trung bình tại trang `/courses/[courseId]`.
    </testPlan>
    <outputRequired>
        Sau khi hoàn thành viết code, Agent PHẢI xuất ra một báo cáo (Report) bao gồm các phần sau:
        1. Tóm tắt công việc: Giải thích chi tiết các tính năng mới vừa được bổ sung.
        2. Danh sách File: Liệt kê rõ các file đã tạo mới và chỉnh sửa.
        3. Báo cáo nghiệm thu (Acceptance & Audit): Cam kết tuân thủ đầy đủ các hard rules và kiểm thử hoạt động.
    </outputRequired>
</prompt>

---

# 🏗️ BẢN THIẾT KẾ KỸ THUẬT (TECHNICAL DESIGN)

Hệ thống bổ sung tính năng chúc mừng hoàn thành khóa học và đánh giá khóa học sử dụng cấu trúc **Modular Monolith** kết hợp **Domain-Driven Design (DDD)** và API **ConnectRPC**.

## 1. Kiến trúc API (ConnectRPC Protocol)
*   **Tệp định nghĩa**: [catalog.proto](file:///e:/lms-ai-study-assistant/proto/catalog/v1/catalog.proto)
*   **Các RPC mới**:
    *   `SubmitCourseReview(SubmitCourseReviewRequest) returns (SubmitCourseReviewResponse)`: Gửi đánh giá khóa học mới hoặc cập nhật đánh giá cũ của học viên hiện tại.
    *   `ListCourseReviews(ListCourseReviewsRequest) returns (ListCourseReviewsResponse)`: Trả về danh sách đánh giá của khóa học theo phân trang kèm số sao trung bình (`average_rating`) và tổng số đánh giá (`total_reviews`).
*   **Cập nhật cấu trúc Course**: Bổ sung `average_rating` (kiểu `double`) và `review_count` (kiểu `int32`) vào response trả về thông tin khóa học.

## 2. Backend Module Catalog (Domain-Driven Design)
*   **Domain Layer (Pure Python)**:
    *   Thực thể `CourseReview` tại [entities.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/domain/entities.py#L85-L103) chứa các trường dữ liệu lõi: `id`, `user_id`, `user_name`, `course_id`, `rating_stars`, `comment_text`, `created_at`.
    *   Bổ sung `average_rating` và `review_count` cho thực thể `Course`.
    *   Định nghĩa interface repository `ICatalogRepository` trong `domain/repository.py` với các hàm `submit_course_review`, `list_course_reviews`, và `get_course_rating_stats`.
*   **Infrastructure Layer (Database & ORM)**:
    *   Model `CourseReviewModel` tại [models.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/infrastructure/models.py#L149-L164) định nghĩa bảng `course_reviews` lưu vào PostgreSQL.
    *   Cập nhật `SQLAlchemyCatalogRepository` tại [repository.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/infrastructure/repository.py#L327-L391):
        *   `submit_course_review()`: Lưu/Cập nhật đánh giá của người dùng. Hỗ trợ cập nhật bình luận cũ nếu gửi lại.
        *   `get_course_rating_stats()`: Tính điểm trung bình (`coalesce(avg(rating_stars), 0.0)`) và đếm số lượng đánh giá trực tiếp từ database.
    *   Alembic Migration: File revision `7a8f9e1029ab_create_course_reviews_table.py` tự động khởi tạo bảng cơ sở dữ liệu.
*   **Application Layer (Use Case Coordinators)**:
    *   `CatalogUseCase` điều phối dữ liệu nghiệp vụ cho việc lưu và truy vấn đánh giá.
*   **Presentation Layer (ConnectRPC Handlers)**:
    *   `CatalogHandler` triển khai các phương thức RPC. Xác thực danh tính học viên từ context bằng `require_current_user()` (đảm bảo không tin cậy `user_id` trực tiếp từ payload) và thực hiện các ràng buộc kiểm tra sao đánh giá từ `1` đến `5`.

## 3. Frontend UI & Integration (Next.js & Tailwind CSS v4)
*   **Huy hiệu & Modal Chúc mừng**: [CourseCompletionModal.tsx](file:///e:/lms-ai-study-assistant/frontend/src/components/course/CourseCompletionModal.tsx)
    *   Hiệu ứng pháo hoa chúc mừng động bằng Canvas API.
    *   Tích hợp component chọn sao trực quan từ 1 đến 5 (Star Rating Picker).
    *   Nút bấm "Nhận chứng chỉ xác minh" điều hướng sang `/verify/[certificateId]` để thực hiện cấp chứng chỉ số theo chuẩn Open Badges.
*   **Tích hợp Player Học tập**: [page.tsx](file:///e:/lms-ai-study-assistant/frontend/src/app/learn/%5BcourseId%5D/page.tsx)
    *   Học viên học đạt tiến độ 100% (hoặc xem >= 80% thời lượng của bài học cuối cùng) sẽ tự động trigger việc kiểm tra & sinh chứng chỉ số, sau đó hiển thị `CourseCompletionModal`.
*   **Trang Chi tiết Khóa học**: [page.tsx](file:///e:/lms-ai-study-assistant/frontend/src/app/courses/%5BcourseId%5D/page.tsx)
    *   Hiển thị điểm sao trung bình, phân bố sao và danh sách bình luận đánh giá trực quan của các học viên khác.

---

# 📋 DANH SÁCH CÔNG VIỆC (TASK CHECKLIST)

Dưới đây là danh sách các đầu việc để triển khai, kiểm thử và nghiệm thu phân hệ Course Rating & Completion Modal:

## Phase 1: API Contracts & Code Generation
- [x] Định nghĩa các RPC và thông điệp cho Course Review trong [catalog.proto](file:///e:/lms-ai-study-assistant/proto/catalog/v1/catalog.proto).
- [x] Chạy script biên dịch code generator:
  - Backend: `make gen` (tạo stubs Python)
  - Frontend: `npm run gen` (tạo stubs TypeScript/Connect-ES v2.0)

## Phase 2: Phát triển Backend (DDD Monolith)
- [x] Khai báo ORM model `CourseReviewModel` tại [models.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/infrastructure/models.py).
- [x] Tạo và chạy file migration Alembic `7a8f9e1029ab_create_course_reviews_table.py` để đồng bộ cơ sở dữ liệu.
- [x] Triển khai Domain entity `CourseReview` và cập nhật `Course` tại [entities.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/domain/entities.py).
- [x] Cập nhật repository interfaces và `SQLAlchemyCatalogRepository` tại [repository.py](file:///e:/lms-ai-study-assistant/backend/src/modules/catalog/infrastructure/repository.py).
- [x] Cấu hình `CatalogUseCase` điều phối nghiệp vụ lưu trữ & tổng hợp điểm sao đánh giá.
- [x] Hoàn thiện các method RPC `submit_course_review` và `list_course_reviews` trong `CatalogHandler` kèm bảo mật `require_current_user()`.

## Phase 3: Phát triển Frontend UI
- [x] Phát triển component `CourseCompletionModal.tsx` tại [CourseCompletionModal.tsx](file:///e:/lms-ai-study-assistant/frontend/src/components/course/CourseCompletionModal.tsx) sử dụng Tailwind CSS v4 và Canvas Confetti.
- [x] Tích hợp Modal chúc mừng vào Player tại [page.tsx](file:///e:/lms-ai-study-assistant/frontend/src/app/learn/%5BcourseId%5D/page.tsx) để mở modal khi học viên hoàn thành 100% tiến độ học tập.
- [x] Cập nhật UI trang chi tiết khóa học tại [page.tsx](file:///e:/lms-ai-study-assistant/frontend/src/app/courses/%5BcourseId%5D/page.tsx) để kéo và hiển thị danh sách đánh giá cùng số sao trung bình thực tế từ Backend.

## Phase 4: Kiểm thử, Nghiệm thu & UAT (UAT & Testing)
- [/] Chạy bộ test tự động của Backend (`pytest`) để đảm bảo không lỗi cú pháp, lint (ruff) và type check (ty).
- [ ] Khởi chạy hệ thống cục bộ:
  - Backend: `make dev` (cổng 8000)
  - Frontend: `npm run dev` (cổng 3000)
- [ ] Thực hiện kịch bản kiểm thử thủ công (Manual UAT):
  - [ ] Đăng nhập tài liệu học viên học thử, hoàn thành các học phần đạt 100%.
  - [ ] Kiểm tra Modal Chúc mừng tự động mở ra kèm hiệu ứng Canvas pháo hoa.
  - [ ] Bấm nút "Nhận chứng chỉ xác minh", xác nhận chuyển hướng đến `/verify/CERT-...` hiển thị chứng chỉ chuẩn Open Badges.
  - [ ] Quay lại Modal, chấm điểm 5 sao, điền nhận xét và bấm gửi. Xác nhận nhận phản hồi thành công và không bị gửi lại nhiều lần.
  - [ ] Quay lại trang `/courses/[courseId]`, xác minh số sao trung bình cập nhật chính xác và bình luận mới xuất hiện đầu danh sách.
- [ ] Chạy bộ kiểm thử tự động End-to-End (nếu có): `npm test` từ thư mục `e2e/`.