# 01. TỔNG QUAN NGHIỆP VỤ & PHÂN BỔ VAI TRÒ (COURSERA-STYLE PLATFORM)

Dự án phát triển **Hệ thống Quản lý Học tập Trực tuyến Chuẩn Coursera (Coursera-style LMS)**. Hệ thống cung cấp trải nghiệm học tập đa tầng chất lượng cao, kết hợp các dạng bài học đa phương tiện (Video kèm Phụ đề & Interactive Transcript, In-Video Quiz, Bài đọc, Practice/Graded Quiz, Auto-Graded Lab, Peer Review Assignment), Diễn đàn thảo luận bám sát bài học và Chứng chỉ xác thực công khai.

---

## 1. Các Tác Nhân trong Hệ Thống (Roles & Personas)

Về mặt kỹ thuật (tầng Database & Protobuf Schema), hệ thống chỉ có **3 vai trò tài khoản cốt lõi (System Roles)** thuộc Enum `UserRole`:
1. `USER_ROLE_LEARNER = 1` (Học viên)
2. `USER_ROLE_INSTRUCTOR = 2` (Giảng viên)
3. `USER_ROLE_ADMIN = 3` (Quản trị viên)

Về mặt vận hành nghiệp vụ, 3 vai trò tài khoản cốt lõi này được kết hợp với **phân quyền theo ngữ cảnh (Contextual RBAC/ReBAC)** (như danh sách `co_instructor_ids`, `ta_ids` trong khóa học, hoặc vai trò trong Tổ chức `Partner Member`) để phục vụ **4 nhóm tác nhân vận hành chính**:

1. **Super Admin (Platform Admin - Quản trị nền tảng):**
   * Quản lý tài khoản người dùng toàn hệ thống (phê duyệt, khóa, phân quyền).
   * Quản lý các gói suất học doanh nghiệp/trường học (Enterprise License & Seat Assignment).
   * Xét duyệt đơn Hỗ trợ tài chính (Financial Aid) cấp cao hoặc tự động hóa quy tắc phê duyệt.
   * Giám sát hiệu năng hệ thống thời gian thực.
   * Cấu hình kỹ thuật các dịch vụ ngoài (Cloud Storage) và quản lý danh sách Báo cáo vi phạm (Abuse Reporting Queue).

2. **Giảng viên & Trợ giảng (Instructor & Teaching Assistant - TA):**
   * **Cá nhân tự do nộp đơn xin cấp quyền (Individual Instructor Application):** Người dùng có tài khoản `Learner` bình thường có thể nộp Đơn đăng ký Giảng viên (`SubmitInstructorApplication`) kèm Bio, CV và bài giảng demo. Sau khi Super Admin kiểm duyệt và Phê duyệt (Approve), tài khoản được nâng lên vai trò `INSTRUCTOR` và tự động gán vào Partner mặc định toàn sàn **`Coursera Project Network`** mà không cần qua một Trường/Tập đoàn nào add trước.
   * Xây dựng cấu trúc học tập chuẩn Coursera: Specialization (Chuyên ngành) -> Course (Khóa học) -> Module / Week (Tuần học) -> Lesson -> Learning Items.
   * Đăng tải học liệu đa dạng: Video bài giảng kèm Phụ đề (.vtt), Interactive Transcript, Bài đọc (Reading), Quiz ôn luyện (Practice Quiz), và In-Video Quiz (câu hỏi ngắt ngang video).
   * Cấu hình bài thi tính điểm (Graded Quiz), bài tập lập trình tự động chấm (Auto-Graded Lab), và bài tập nộp dự án (Peer-Graded Assignment) kèm Bộ tiêu chí chấm điểm (Rubric).
   * Đóng vai trò điều phối Diễn đàn thảo luận (Discussion Forum): Trả lời thắc mắc, ghim câu trả lời chuẩn (Staff Answer Pinning).
   * Theo dõi báo cáo tiến độ và bảng điểm của học viên.

3. **Đối tác Phát hành (Partner / Organization Admin):**
   * Đại diện cho các Trường Đại học hoặc Doanh nghiệp đối tác phát hành khóa học (ví dụ: Stanford, DeepLearning.AI, Google...).
   * Quản lý thương hiệu đối tác, Logo và chữ ký xác thực hiển thị trên trang giới thiệu khóa học và Chứng chỉ xác minh (Verified Certificate).
   * Giám sát chỉ số hoàn thành chương trình đào tạo và thống kê chứng chỉ được cấp thuộc tổ chức.

4. **Học viên (Learner / Student):**
   * Đăng ký tham gia khóa học theo 4 chế độ: Audit Mode (Học thử/Miễn phí), Single Purchase / Subscription (Trả phí), Financial Aid (Nộp đơn xin học bổng), hoặc Enterprise License (Suất học do tổ chức tài trợ).
   * Tự học theo lộ trình tuần (Weekly Schedule), trải nghiệm bài học với Video kèm Phụ đề/Interactive Transcript, In-Video Quiz, Bài đọc, và Highlight/Lưu ghi chú cá nhân (Notes).
   * Sử dụng tính năng **"Reset my deadlines"** khi gặp sự cố trễ hạn nộp bài để chuyển sang đợt học mới mà không bị phạt điểm.
   * Thảo luận, đặt câu hỏi và Upvote/Downvote trên Diễn đàn thảo luận (Discussion Forum) bám sát từng bài học.
   * Cam kết Liêm chính học thuật (Academic Honor Code) và hoàn thành các bài đánh giá năng lực: Graded Quiz, Auto-Graded Lab, Nộp bài dự án & Chấm chéo 3 bài của bạn học (Peer Review).
   * Nhận Chứng chỉ xác minh (Verified Certificate) có Mã xác thực công khai / QR code và Huy hiệu số OpenBadges để chia sẻ trực tiếp lên hồ sơ LinkedIn.

---

## 2. Sơ đồ Phối hợp Nghiệp vụ Tổng thể (Workflow Sequence)

Quy trình phối hợp giữa các vai trò trong một chu kỳ học tập chuẩn Coursera được mô tả qua sơ đồ dưới đây:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin / Partner
    actor Teacher as Giảng viên & Trợ giảng (Instructor/TA)
    actor Student as Học viên (Learner)

    Admin->>Admin: Cấu hình hệ thống, Partner Logo & Enterprise License
    Teacher->>Teacher: Soạn Specialization, Course, Week, Items (Video+Transcript, Reading, Rubric)
    Student->>Student: Chọn chế độ Enroll (Audit / Paid / Nộp đơn Financial Aid)
    Note over Student: Đơn Financial Aid được duyệt trong 15 ngày -> Mở khóa full Paid access
    Student->>Student: Học theo Tuần (Xem Video+Transcript, làm In-Video Quiz, lưu Highlight Notes)
    Student->>Student: Thảo luận trên Forum bám sát bài học
    Note over Student: Nếu bị trễ hạn nộp bài -> Bấm "Reset my deadlines" để chuyển lịch mới
    Student->>Student: Tích chọn cam kết Academic Honor Code trước bài đánh giá
    Student->>Student: Làm bài Graded Quiz / Nộp bài Auto-Graded Lab
    Student->>Student: Nộp bài Peer Assignment & Chấm chéo đủ 3 bài của bạn học theo Rubric
    Teacher->>Student: Giám sát điểm số, duyệt khiếu nại (Grade Appeal) & ghim câu trả lời Forum
    Student->>Student: Đạt điểm Pass (>= 80%) -> Hệ thống tự động phát hành Verified Certificate & OpenBadges
```
