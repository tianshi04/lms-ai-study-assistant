# 02. DANH SÁCH USER STORIES CỐT LÕI (USER STORIES BACKLOG)

Tài liệu này tổng hợp các User Stories (câu chuyện người dùng) cốt lõi của **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)**. Tài liệu tuân thủ các nguyên tắc thiết kế User Story chuyên nghiệp:
1. **User phải là con người thực tế:** Super Admin, Giảng viên & Trợ giảng (Instructor/TA), Học viên (Learner).
2. **Tập trung vào Problem Space (Không mang hình ảnh Solution/System):** Mô tả vấn đề và nhu cầu của người dùng, không đưa giải pháp lập trình ngầm vào mô tả story.
3. **Tên User Story bắt đầu bằng Danh từ.**
4. **Mô tả Story theo công thức chủ động:** *Là ai + cần làm gì + để làm gì?*

---

## 1. Bảng Tổng hợp Mã User Stories

| ID | Tác nhân | Tên User Story (Bắt đầu bằng Danh từ) | Trạng thái |
| :--- | :--- | :--- | :--- |
| **US_01** | Super Admin | Tài khoản thành viên và Suất học Doanh nghiệp | Sẵn sàng |
| **US_02** | Super Admin | Quy tắc hoạt động và Chi phí Trợ lý AI | Sẵn sàng |
| **US_03** | Super Admin | Chỉ số chất lượng đào tạo và Báo cáo vi phạm | Sẵn sàng |
| **US_04** | Giảng viên | Cấu trúc chuyên ngành và Học liệu đa dạng | Sẵn sàng |
| **US_05** | Giảng viên | Bộ tiêu chí chấm điểm và Cơ sở tri thức AI | Sẵn sàng |
| **US_06** | Giảng viên / TA | Diễn đàn thảo luận và Xét duyệt học bổng | Sẵn sàng |
| **US_07** | Học viên | Bài học đa phương tiện và Đăng ký linh hoạt | Sẵn sàng |
| **US_08** | Học viên | Trợ giúp kiến thức từ AI Coach Socratic | Sẵn sàng |
| **US_09** | Học viên | Diễn đàn trao đổi học thuật theo bài học | Sẵn sàng |
| **US_10** | Học viên | Bài kiểm tra năng lực và Chấm điểm chéo | Sẵn sàng |
| **US_11** | Học viên | Chứng chỉ xác minh và Huy hiệu năng lực | Sẵn sàng |

---

## 2. Chi tiết các User Stories (Problem Space)

### 2.1. VAI TRÒ: SUPER ADMIN (QUẢN TRỊ NỀN TẢNG)

#### US_01: Tài khoản thành viên và Suất học Doanh nghiệp
* **Mô tả Story (Problem Space):**
  * **Là một** Super Admin,
  * **Tôi muốn** quản lý tài khoản thành viên, phân quyền Trợ giảng/Giảng viên và phân bổ gói suất học (Enterprise Seats) cho các tổ chức đối tác,
  * **Để** đảm bảo an toàn truy cập hệ thống và cung cấp quyền tham gia học tập hàng loạt cho sinh viên/nhân viên thuộc các đối tác.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * *AC 1:* Admin có thể cấp quyền đăng nhập, phân vai trò Giảng viên/TA và gán Logo đơn vị đối tác (Partner Branding).
  * *AC 2:* Admin có thể khởi tạo và quản lý mã gói suất học (Enterprise License Key) cho các doanh nghiệp/trường học.

#### US_02: Quy tắc hoạt động và Chi phí Trợ lý AI
* **Mô tả Story (Problem Space):**
  * **Là một** Super Admin,
  * **Tôi muốn** thiết lập các giới hạn an toàn (Guardrails) và giám sát lượng ngân sách tiêu thụ của Trợ lý AI Coach,
  * **Để** AI luôn phản hồi chuẩn mực học thuật và chi phí vận hành dịch vụ AI nằm trong tầm kiểm soát.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Admin có thể cấu hình tham số AI (Model, Temperature, Safety Thresholds) và kiểm tra kết nối dịch vụ.
  * *AC 2:* Admin xem được báo cáo số lượng Token đã tiêu thụ và chi phí phát sinh theo thời gian thực.

#### US_03: Chỉ số chất lượng đào tạo và Báo cáo vi phạm
* **Mô tả Story (Problem Space):**
  * **Là một** Super Admin,
  * **Tôi muốn** theo dõi mức độ hài lòng (CSAT) của học viên đối với từng khóa học và xử lý các báo cáo gian lận/vi phạm,
  * **Để** tôi duy trì chất lượng giảng dạy chuẩn quốc tế và ngăn chặn các nội dung vi phạm chính sách.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Admin xem được tổng hợp điểm số đánh giá khóa học và tỷ lệ hoàn thành chương trình.
  * *AC 2:* Admin tiếp nhận các báo cáo vi phạm bản quyền/nội dung xấu từ học viên để ẩn bài học hoặc tạm khóa tài khoản vi phạm.

---

### 2.2. VAI TRÒ: GIẢNG VIÊN & TRỢ GIẢNG (INSTRUCTOR / TA)

#### US_04: Cấu trúc chuyên ngành và Học liệu đa dạng
* **Mô tả Story (Problem Space):**
  * **Là một** Giảng viên,
  * **Tôi muốn** thiết lập chuỗi chuyên ngành (Specialization), khóa học theo từng tuần (Weekly Modules) và đăng tải phong phú các loại học liệu (Video kèm phụ đề, bài đọc, quiz ngắt ngang video, quiz tính điểm),
  * **Để** học viên có lộ trình học tập khoa học và tiếp thu kiến thức một cách trực quan.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Giảng viên tạo được khung chương trình theo các tuần học và từng bài học nhỏ.
  * *AC 2:* Giảng viên tải được video kèm phụ đề (.vtt), đặt câu hỏi ngắt ngang video (In-Video Quiz) và bài đọc rich-text.

#### US_05: Bộ tiêu chí chấm điểm và Cơ sở tri thức AI
* **Mô tả Story (Problem Space):**
  * **Là một** Giảng viên,
  * **Tôi muốn** xây dựng bộ tiêu chí (Rubric) cho bài tập chấm chéo, bộ test tự động cho bài tập lập trình và cung cấp dữ liệu bài giảng làm tri thức cho AI Coach,
  * **Để** hệ thống tự động hóa việc chấm bài và AI Coach trả lời học viên bám sát giáo trình.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Giảng viên thiết lập được bộ tiêu chí Rubric chia theo mức điểm và tiêu chí đánh giá rõ ràng cho bài tập chấm chéo.
  * *AC 2:* Tài liệu bài giảng được tự động chuyển hóa thành dữ liệu tri thức chuẩn xác cho Trợ lý AI Coach.

#### US_06: Diễn đàn thảo luận và Xét duyệt học bổng
* **Mô tả Story (Problem Space):**
  * **Là một** Giảng viên / Trợ giảng,
  * **Tôi muốn** tham gia giải đáp thắc mắc trên diễn đàn, ghim các câu trả lời chuẩn và xét duyệt các đơn xin hỗ trợ tài chính (Financial Aid),
  * **Để** hỗ trợ cộng đồng học viên học tập hiệu quả và tạo cơ hội cho học viên khó khăn tiếp cận khóa học.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Trợ giảng có thể ghim câu trả lời chính thức (Staff Answer) trên diễn đàn học tập.
  * *AC 2:* Giảng viên xem được đơn xin hỗ trợ tài chính kèm giải trình của học viên và duyệt mở khóa bài học.

---

### 2.3. VAI TRÒ: HỌC VIÊN (LEARNER)

#### US_07: Bài học đa phương tiện và Đăng ký linh hoạt
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** lựa chọn chế độ đăng ký học (Học thử miễn phí Audit / Trả phí Paid / Xin hỗ trợ tài chính) và trải nghiệm xem video kèm phụ đề tương tác, câu hỏi ngắt ngang video và lưu ghi chú cá nhân,
  * **Để** tôi chủ động tự học theo nhu cầu và điều kiện tài chính cá nhân.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Học viên chọn được chế độ Audit để xem video/bài đọc hoặc nộp đơn Financial Aid để xin học bổng.
  * *AC 2:* Trình phát video hiển thị phụ đề tương tác (Interactive Transcript), câu hỏi dừng video ngắt ngang và tính năng bôi đen lưu ghi chú.

#### US_08: Trợ giúp kiến thức từ AI Coach Socratic
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** trao đổi với Trợ lý AI Coach để tóm tắt video transcript, giải thích thuật ngữ khó và gợi mở hướng suy nghĩ khi làm bài ôn tập,
  * **Để** tôi hiểu sâu bài học mà không bị gián đoạn và tự tư duy giải quyết vấn đề.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* AI Coach trả lời thắc mắc dựa trên đúng nội dung video transcript và tài liệu bài đọc hiện tại.
  * *AC 2:* AI Coach đóng vai người hướng dẫn gợi mở tư duy (Socratic Method) và từ chối cung cấp trực tiếp đáp án bài thi Graded Quiz.

#### US_09: Diễn đàn trao đổi học thuật theo bài học
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** thảo luận, đặt câu hỏi ngay tại bài học đang xem và Upvote các câu trả lời hay của bạn học khác,
  * **Để** trao đổi kiến thức với cộng đồng người học trên toàn thế giới.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Học viên gửi được câu hỏi trong diễn đàn thảo luận gắn trực tiếp với bài học hiện tại.
  * *AC 2:* Học viên Upvote/Downvote được các câu trả lời và dễ dàng nhận biết câu trả lời chính thức từ Trợ giảng.

#### US_10: Bài kiểm tra năng lực và Chấm điểm chéo
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** cam kết liêm chính học thuật (Honor Code), làm bài thi trắc nghiệm, bài tập lập trình tự động chấm và thực hiện nộp bài dự án / chấm chéo bài của bạn học,
  * **Để** tôi đánh giá chính xác năng lực thực hành của bản thân và rèn luyện kỹ năng phản biện.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Học viên tích chọn cam kết Honor Code trước khi nộp bài thi Graded Quiz / Auto-Graded Lab.
  * *AC 2:* Học viên nộp bài dự án và thực hiện chấm chéo đủ 3 bài của bạn học khác theo tiêu chí Rubric để nhận điểm số công bằng.

#### US_11: Chứng chỉ xác minh và Huy hiệu năng lực
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** nhận Chứng chỉ xác minh (Verified Certificate) có đường link/mã QR kiểm tra công khai và Huy hiệu số khi hoàn thành khóa học xuất sắc,
  * **Để** tôi bổ sung thành tích uy tín vào hồ sơ cá nhân và chia sẻ lên trang LinkedIn.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Hệ thống tự động phát hành Verified Certificate chứa logo đối tác phát hành và link xác nhận (`/verify/CERT-xxx`) khi đạt tiêu chuẩn hoàn thành.
  * *AC 2:* Học viên có thể bấm nút chia sẻ trực tiếp chứng chỉ và huy hiệu lên trang cá nhân LinkedIn.
