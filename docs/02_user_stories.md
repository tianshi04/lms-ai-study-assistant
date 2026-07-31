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
| **US_03** | Super Admin | Chỉ số chất lượng đào tạo và Báo cáo vi phạm | Sẵn sàng |
| **US_04** | Giảng viên | Cấu trúc chuyên ngành và Học liệu đa dạng | Sẵn sàng |
| **US_05** | Giảng viên | Bộ tiêu chí chấm điểm và Bài tập thực hành | Sẵn sàng |
| **US_06** | Giảng viên / TA | Diễn đàn thảo luận và Ghim câu trả lời chuẩn | Sẵn sàng |
| **US_07** | Học viên | Bài học đa phương tiện và Đăng ký linh hoạt | Sẵn sàng |
| **US_09** | Học viên | Diễn đàn trao đổi học thuật theo bài học | Sẵn sàng |
| **US_10** | Học viên | Bài kiểm tra năng lực và Chấm điểm chéo | Sẵn sàng |
| **US_11** | Học viên | Chứng chỉ xác minh và Huy hiệu năng lực | Sẵn sàng |
| **US_12** | Organization Admin | Thương hiệu đối tác và Suất học tổ chức | Sẵn sàng |
| **US_13** | Học viên | Đánh giá và Phản hồi chất lượng khóa học | Sẵn sàng |
| **US_14** | Học viên | Nộp đơn đăng ký làm Giảng viên cá nhân | Sẵn sàng |

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

#### US_05: Bộ tiêu chí chấm điểm và Bài tập thực hành
* **Mô tả Story (Problem Space):**
  * **Là một** Giảng viên,
  * **Tôi muốn** xây dựng bộ tiêu chí (Rubric) cho bài tập chấm chéo và bộ test tự động cho bài tập lập trình,
  * **Để** hệ thống tự động hóa việc chấm bài và đánh giá năng lực học viên bám sát giáo trình.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Giảng viên thiết lập được bộ tiêu chí Rubric chia theo mức điểm và tiêu chí đánh giá rõ ràng cho bài tập chấm chéo.
  * *AC 2:* Giảng viên thiết lập được các bài lab thực hành lập trình tự động chấm.

#### US_06: Diễn đàn thảo luận và Ghim câu trả lời chuẩn
* **Mô tả Story (Problem Space):**
  * **Là một** Giảng viên / Trợ giảng,
  * **Tôi muốn** tham gia giải đáp thắc mắc chuyên môn trên diễn đàn và ghim các câu trả lời chuẩn (Staff Answer Pinning),
  * **Để** hỗ trợ cộng đồng học viên nắm bắt kiến thức chính xác và ưu tiên các nội dung giải đáp quan trọng.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Trợ giảng / Giảng viên có thể ghim câu trả lời chính thức (Staff Answer) trên diễn đàn học tập.
  * *AC 2:* Câu trả lời được ghim tự động đẩy bài thảo luận gốc (Thread) lên ưu tiên hiển thị ở vị trí nổi bật.

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

#### US_13: Đánh giá và Phản hồi chất lượng khóa học
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên,
  * **Tôi muốn** đánh giá số sao (1-5 sao) và gửi nhận xét cảm nhận về khóa học sau khi học xong,
  * **Để** tôi chia sẻ trải nghiệm thực tế với cộng đồng người học và góp ý phản hồi cho Giảng viên nâng cao chất lượng nội dung.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Học viên hoàn thành 100% khóa học và đạt điểm Pass sẽ được hiển thị Course Completion Modal mừng hoàn thành kèm form chọn 1-5 sao và nhập văn bản nhận xét.
  * *AC 2:* Đánh giá của học viên được cập nhật công khai vào điểm CSAT trung bình của khóa học và hiển thị trên trang chi tiết khóa học.

#### US_14: Nộp đơn đăng ký làm Giảng viên cá nhân
* **Mô tả Story (Problem Space):**
  * **Là một** Học viên (Learner / Cá nhân tự do),
  * **Tôi muốn** nộp Đơn đăng ký kèm thông tin chuyên môn, CV và bài giảng mẫu để Ban Quản trị phê duyệt nâng vai trò lên Giảng viên (`INSTRUCTOR`),
  * **Để** tôi có thể khởi tạo và xuất bản các khóa học/bài giảng cá nhân trên nền tảng dưới nhãn bảo chứng `Coursera Project Network` mà không cần phải qua một Trường Đại học hay Doanh nghiệp đối tác nào thêm trước vào hệ thống.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Học viên có thể truy cập trang `/become-an-instructor`, điền Chức danh khoa học (`title`), Bio tiểu sử, liên kết LinkedIn/Portfolio, link file CV và link video bài giảng mẫu để gửi đơn.
  * *AC 2:* Đơn đăng ký ghi nhận trạng thái `PENDING_REVIEW` và hiển thị màn hình thông báo chờ Ban Quản trị thẩm định.
  * *AC 3:* Khi Super Admin phê duyệt (Approve), tài khoản được nâng vai trò thành `USER_ROLE_INSTRUCTOR` và tự động liên kết với Partner mặc định toàn sàn `Coursera Project Network` (`partner_id = "partner_community"`) để cấp quyền khởi tạo khóa học trong Course Builder.
  * *AC 4:* Nếu đơn bị từ chối (Reject), hệ thống gửi thông báo kèm lý do từ chối và cho phép học viên cập nhật lại hồ sơ sau 14 ngày.

---

### 2.4. VAI TRÒ: QUẢN TRỊ VIÊN TỔ CHỨC (ORGANIZATION ADMIN)

#### US_12: Thương hiệu đối tác và Suất học tổ chức
* **Mô tả Story (Problem Space):**
  * **Là một** Organization Admin (Quản trị viên / Đại diện Trường Đại học / Doanh nghiệp đối tác),
  * **Tôi muốn** quản lý thương hiệu tổ chức (Partner Logo), cấp phát và theo dõi suất học doanh nghiệp (Enterprise License Seats),
  * **Để** hỗ trợ sinh viên/nhân viên thuộc tổ chức tiếp cận khóa học chất lượng cao và quảng bá thương hiệu đối tác trên chứng chỉ.
* **Tiêu chí nghiệm thu:**
  * *AC 1:* Organization Admin có thể cập nhật Logo đối tác hiển thị trên các khóa học phát hành và Verified Certificate.
  * *AC 2:* Organization Admin theo dõi được số suất học đã kích hoạt (`used_seats / total_seats`) và tỷ lệ nhận chứng chỉ của học viên thuộc tổ chức.
