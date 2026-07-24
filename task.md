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
