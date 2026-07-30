# TODO: Danh mục các Nghiệp vụ Chưa Triển khai (Unimplemented Business Features)

> [!IMPORTANT]
> **Quy tắc Quản lý Tệp TODO (Task Cleanup Protocol):**
> Khi các Developer hoặc AI Agent hoàn thành triển khai và kiểm thử thành công bất kỳ **Nghiệp vụ** nào trong tệp này, **BẮT BUỘC phải XÓA bỏ mục nghiệp vụ đó** khỏi tệp `TODO.md` để giữ cho tài liệu luôn gọn gàng và chỉ phản ánh các nghiệp vụ còn tồn đọng.

---

## 1. Nghiệp vụ Cá nhân Nộp đơn xin cấp quyền Giảng viên (Individual Instructor Application)

* **Tác nhân:** Học viên (`Learner` / Cá nhân tự do).
* **Mô tả Nghiệp vụ:** 
  * Học viên có tài khoản cá nhân có thể gửi Đơn xin nâng cấp vai trò thành Giảng viên (`INSTRUCTOR`) mà không cần phải qua một Trường Đại học hoặc Doanh nghiệp nào thêm trước vào hệ thống.
  * Form đăng ký yêu cầu cung cấp: Chức danh khoa học/chuyên môn mong muốn hiển thị (`title`), Bài viết tiểu sử năng lực (`bio`), Đường dẫn LinkedIn/Portfolio, File CV hồ sơ năng lực (.pdf) và Link video giảng thử demo.
  * Đơn sau khi nộp ghi nhận trạng thái **Chờ thẩm định (`PENDING_REVIEW`)**.
* **Màn hình/Giao diện liên quan:** Giao diện đăng ký tại đường dẫn `/become-an-instructor`.

---

## 2. Nghiệp vụ Thẩm định & Duyệt Đơn Giảng viên Cá nhân (Super Admin Review & Promotion)

* **Tác nhân:** Super Admin (Ban Quản trị Nền tảng).
* **Mô tả Nghiệp vụ:**
  * Super Admin truy cập trang quản trị để xem danh sách các Đơn xin cấp quyền Giảng viên cá nhân (hỗ trợ lọc theo trạng thái).
  * Đánh giá hồ sơ năng lực (CV, Video demo) và thực hiện **Phê duyệt (`APPROVED`)** hoặc **Từ chối (`REJECTED`)** kèm lý do.
  * **Xử lý Tự động khi Phê duyệt (`APPROVED`):**
    1. Cập nhật vai trò người dùng thành `USER_ROLE_INSTRUCTOR`.
    2. Tự động liên kết tài khoản Giảng viên vào Partner Mặc định toàn sàn **`Coursera Project Network`** (`partner_id = "partner_community"`) với trạng thái `ACTIVE`.
  * **Xử lý khi Từ chối (`REJECTED`):** Thông báo lý do từ chối cho học viên và khóa quyền nộp lại đơn trong vòng 14 ngày.
* **Màn hình/Giao diện liên quan:** Trang Quản trị Duyệt đơn tại đường dẫn `/admin/applications`.

---

## 3. Nghiệp vụ Khóa học Bắt buộc thuộc Partner & Giảng viên Cá nhân (`Coursera Project Network`)

* **Tác nhân:** Giảng viên (`INSTRUCTOR`).
* **Mô tả Nghiệp vụ:**
  * **Ràng buộc Partner Scoping:** 100% khóa học trên hệ thống BẮT BUỘC phải thuộc về 1 Partner Organization đại diện bảo chứng (`partner_id` NOT NULL). Không tồn tại khóa học mồ côi.
  * **Khi tạo Khóa học mới:** Hệ thống hiển thị Dropdown danh sách các Partner mà Giảng viên đó có quyền đại diện.
  * **Đối với Giảng viên Cá nhân tự do:** Hệ thống tự động chọn/gán khóa học dưới danh nghĩa Partner Mặc định **`Coursera Project Network`**.
  * **Hiển thị Giao diện (UI):**
    * Dòng nhãn bảo chứng: *Offered by Coursera Project Network*.
    * Dòng nhãn giảng viên: *Taught by [Họ tên Giảng viên]* kèm Chức danh và Avatar cá nhân.
* **Màn hình/Giao diện liên quan:** Giao diện Soạn thảo Khóa học mới tại đường dẫn `/instructor/courses/new`.

