# 04. DANH MỤC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

Tài liệu này tập hợp và quản lý tập trung toàn bộ các quy tắc logic nghiệp vụ (Business Rules - BR) của **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)**. Các quy tắc này là ràng buộc bắt buộc khi lập trình logic ở Backend.

---

## 1. Quy tắc Phân quyền & Quản lý Tài khoản (BR_AUTH & BR_ACCESS)

* **BR_AUTH_001 (Bảo mật Centralized AuthInterceptor & Danh sách Public RPCs):**
  * Hệ thống áp dụng `AuthInterceptor` kiểm tra JWT Bearer Token tập trung cho toàn bộ các dịch vụ ConnectRPC.
  * *Danh sách trắng API công khai (Public Endpoints - Không yêu cầu Bearer Token):*
    1. `/identity.v1.IdentityService/Login`
    2. `/identity.v1.IdentityService/Register`
    3. `/identity.v1.IdentityService/RefreshToken`
    4. `/catalog.v1.CatalogService/GetSpecialization`
    5. `/catalog.v1.CatalogService/ListCourses`
    6. `/catalog.v1.CatalogService/GetCourseDetail`
    7. `/catalog.v1.CatalogService/GetLessonDetail`
    8. `/certificate.v1.CertificateService/VerifyCertificatePublic`
  * Tất cả các RPC endpoints còn lại bắt buộc gửi `Authorization: Bearer <access_token>` trong header và tự động giải mã `CurrentUser` (id, email, role) vào Request Context.
* **BR_AUTH_002 (Cơ chế Refresh Token Rotation):**
  * Khi `access_token` hết hạn, client gọi RPC `RefreshToken` truyền `refresh_token` hợp lệ (yêu cầu payload claim `type == "refresh"` và tồn tại `user_id` sở hữu trong DB).
  * Hệ thống hủy cặp token cũ và phát hành mới đồng thời cả `access_token` và `refresh_token`.
* **BR_AUTH_003 (Thuật toán Mã hóa Mật khẩu & Auto-Avatar):**
  * Mật khẩu người dùng được băm bằng PBKDF2-HMAC-SHA256 với 100,000 vòng lặp (iterations) và muối ngẫu nhiên 16 bytes, lưu dạng `salt_hex:hash_hex`. Việc xác thực mật khẩu sử dụng `hmac.compare_digest` để chống tấn công đo thời gian (Timing Attack).
  * Khi người dùng đăng ký mới, hệ thống tự động sinh ảnh đại diện mặc định qua API DiceBear: `https://api.dicebear.com/7.x/avataaars/svg?seed={email}`.
* **BR_ACCESS_001 (Phân quyền Audit Mode vs Paid Mode):**
  * *Audit Mode (Miễn phí):* Học viên được mở xem toàn bộ Video bài giảng, bài đọc (Reading) và làm các bài Practice Quiz. Tuy nhiên, hệ thống khóa quyền nộp bài thi Graded Quiz, bài tập Auto-Graded Lab, bài tập Peer Review và không được cấp Chứng chỉ.
  * *Paid Mode (Trả phí / Subscription):* Học viên có toàn bộ quyền làm các bài kiểm tra tính điểm, được bạn học chấm bài Peer Review và nhận Verified Certificate khi hoàn thành.
* **BR_ACCESS_002 (Quy chế Enterprise License & Quản lý Seat):**
  * Học viên tham gia khóa học qua mã Enterprise Key (do doanh nghiệp/trường học tài trợ) sẽ tự động hưởng toàn bộ quyền lợi của Paid Mode mà không cần thanh toán cá nhân.
  * *Ràng buộc Seat:* Mã Enterprise Key phải ở trạng thái kích hoạt (`is_active = True`) và số lượng suất đã dùng chưa vượt quá hạn mức (`used_seats < total_seats`, mặc định 500 seats/key). Khi kích hoạt thành công, hệ thống tự động tăng `used_seats += 1` và gán `user.enterprise_seat_key`.
* **BR_ACCESS_003 (Thu hồi & Tái cấp Suất học Enterprise Seat Recycling):**
  * Partner Admin / Super Admin có quyền thu hồi suất học của nhân viên/sinh viên nếu tài khoản đó chưa đạt quá 20% tiến độ khóa học trong vòng 30 ngày kể từ ngày gán mã.
  * Khi thu hồi thành công, hệ thống tự động hủy mã gán trên người dùng cũ và giảm bộ đếm `used_seats -= 1` để tái sử dụng cấp cho người dùng khác.
* **BR_FAID_001 (Quy trình nộp & xét duyệt Financial Aid):**
  * Học viên nộp đơn phải điền bài luận tối thiểu 150 từ giải trình lý do hoàn cảnh và kế hoạch áp dụng kiến thức.
  * *Hạn xét duyệt:* Super Admin có tối đa 15 ngày kể từ ngày nộp đơn (`review_deadline_days_left = 15`) để xem xét duyệt hoặc từ chối đơn tài chính của nền tảng.
  * *Tự động phê duyệt (Auto-Approve):* Áp dụng mô hình Hybrid Best Practice (Lazy Evaluation trên Read Path kết hợp Periodic Worker). Nếu quá 15 ngày (`review_deadline_days_left <= 0`) chưa được xử lý, hệ thống tự động chuyển trạng thái đơn sang `AUTO_APPROVED` và cấp quyền Paid Mode ngay khi học viên truy cập hoặc qua lịch quét định kỳ.
* **BR_FAID_002 (Quy trình Nộp lại đơn khi bị Từ chối - Re-application):**
  * Nếu đơn xin Financial Aid bị từ chối (`REJECTED`), học viên được phép nộp lại bằng cách bổ sung/chỉnh sửa bài luận (>= 150 từ).
  * Khi học viên cập nhật bài luận, hệ thống tự động reset trạng thái đơn về `PENDING` và khôi phục hạn xét duyệt 15 ngày (`review_deadline_days_left = 15`).

---

## 2. Quy tắc Đánh giá Năng lực & Chấm điểm (BR_HONOR, BR_QUIZ, BR_AUTOGRADE & BR_PEER)

* **BR_HONOR_001 (Xác nhận Honor Code):**
  * Hệ thống bắt buộc học viên phải tích chọn xác nhận *"Academic Honor Code"* trước khi cho phép bấm nút mở làm bài Graded Quiz, nộp bài Auto-Graded Lab, hoặc nộp bài Peer Assignment.
  * Nếu chưa xác nhận Honor Code (`is_agreed = False`), hệ thống chặn làm bài và trả về điểm số `0.0`, `passed = False`, `attempts_left = 0` cùng thông điệp yêu cầu cam kết.
* **BR_QUIZ_001 (Quy tắc Thi lại, Cooldown bài Graded Quiz & Khôi phục Lượt):**
  * Mỗi bài Graded Quiz bắt buộc đạt tối thiểu điểm Pass (>= 80.0%) mới tính là hoàn thành.
  * Học viên được làm bài tối đa 3 lần liên tiếp. Nếu thi trượt cả 3 lần (`failed_attempts_count >= 3`), hệ thống kích hoạt **thời gian chờ (Cooldown) 8 tiếng** (`cooldown_until = now + 8h`, `cooldown_seconds_left = 28800`) trước khi cho phép làm lại.
  * *Khôi phục lượt thi:* Ngay khi học viên đạt điểm Pass (>= 80.0%), bộ đếm trượt `failed_attempts_count` tự động reset về `0` và khôi phục lại đủ 3 lượt thi (`attempts_left = 3`).
* **BR_QUIZ_002 (Quy tắc Ngân hàng Câu hỏi & Xáo trộn Đáp án):**
  * Đề thi Graded Quiz được sinh tự động bằng cách rút ngẫu nhiên $N$ câu hỏi từ Pool $M$ câu ($N \le M$) theo tỷ lệ ma trận độ khó (Dễ, Trung bình, Khó).
  * Mỗi lần hiển thị đề thi, hệ thống tự động xáo trộn ngẫu nhiên thứ tự các tùy chọn đáp án (Options Shuffling) để chống hành vi học thuộc vị trí khoanh đáp án.
* **BR_QUIZ_003 (Quy tắc Quản lý Session Đếm ngược & Auto-submit):**
  * Mọi bài thi Graded Quiz có giới hạn thời gian (Timed Quiz) được quản lý thời gian đếm ngược trực tiếp từ phía Server (Server-side Session Timer) tính từ mốc bấm nút "Start Quiz".
  * Việc tải lại trang (F5) hoặc tạm đóng trình duyệt không làm dừng đồng hồ đếm ngược. Khi hết giờ đếm ngược, Server tự động đóng phiên và thực hiện chấm điểm (Auto-submit on timeout) với các câu trả lời hiện tại.
* **BR_AUTOGRADE_001 (Quy định Sandbox Auto-Grader):**
  * Mỗi bài nộp lập trình gửi tới Auto-Grader chạy trong môi trường Sandbox cách ly với Timeout mặc định 5.0 giây (hoặc tối đa 30 giây) và Memory Limit = 512MB.
  * Điểm bài nộp = (Số lượng Test Cases Pass / Tổng số Test Cases) * 100%. Trả về log chi tiết stdout/stderr của từng testcase cho học viên.
* **BR_PEER_001 (Điều kiện Nộp & Chấm chéo Peer Review):**
  * Học viên bắt buộc phải nộp bài dự án cá nhân trước mới được phân bổ quyền chấm chéo bài của bạn học (hệ thống tự động loại trừ bài nộp của chính mình `exclude_user_id`).
  * Học viên bắt buộc phải **chấm đủ 3 bài làm của bạn học** theo đúng bộ tiêu chí Rubric thì hệ thống mới mở hiển thị điểm bài nộp của chính mình.
* **BR_PEER_002 (Bộ Tiêu chí Rubric & Nguyên tắc TA Regrade Override):**
  * Bộ Rubric mặc định gồm 3 tiêu chí: (1) Code Quality & Structure (max 10đ), (2) Documentation & Comments (max 10đ), (3) Test Coverage (max 10đ).
  * Điểm số bài nộp mặc định = $\frac{\sum \text{Score Given}}{\sum \text{Max Score}} \times 100\%$.
  * *Cảnh báo chấm điểm bất thường (Outlier Detection):* Khi có bài chấm chéo mới, hệ thống tự động tính khoảng chênh lệch tuyệt đối giữa điểm cao nhất và thấp nhất của tất cả reviewers: $Max(Scores) - Min(Scores) > 30.0\%$. Nếu thỏa mãn, hệ thống gắn cờ `is_outlier = True` trên bản ghi `PeerReview` và gửi cảnh báo về bảng tin Trợ giảng (TA).
* **BR_PEER_003 (Khiếu nại điểm & Thẩm quyền TA Regrade Override):**
  * Học viên có quyền nộp đơn Khiếu nại điểm (Grade Appeal) với lý do chi tiết. Hệ thống khởi tạo đơn ở trạng thái `"PENDING"`.
  * Trợ giảng (TA) trực tiếp rà soát và chấm lại bài làm. Khi TA chấm bài (`graded_by_staff = True`), điểm số của TA trở thành điểm chính thức (`final_score = TA_Score`), ghi đè 100% kết quả chấm chéo của bạn học (các bản ghi `PeerReview` cũ vẫn được lưu trong nhật ký phục vụ audit).
* **BR_PEER_004 (Xử lý Hàng chờ Staff Regrade Queue & Chấm chéo muộn):**
  * Nếu sau 5 ngày kể từ khi nộp bài mà bài dự án chưa nhận đủ 3 lượt chấm chéo, hệ thống tự động chuyển bài nộp vào Hàng chờ xét duyệt của Trợ giảng (Staff Regrade Queue).
  * Hệ thống không khóa quyền chấm chéo muộn của học viên khác. Khi bài nộp nhận đủ 3 lượt chấm chéo và Trợ giảng chưa chấm (`graded_by_staff = False`), hệ thống tự động tính điểm trung bình và giải phóng bài nộp khỏi hàng chờ của TA. Ngược lại nếu TA đã chấm trước (`graded_by_staff = True`), kết quả của TA giữ nguyên làm điểm chính thức.
* **BR_PEER_005 (Báo cáo Bài chấm chéo bất thường & Spam):**
  * Học viên có quyền bấm nút **"Report Review"** đối với các lượt chấm chéo có dấu hiệu spam, vụ lợi hoặc cố tình cho 0 điểm không khách quan.
  * Bài chấm chéo bị báo cáo sẽ lập tức được gắn cờ và chuyển về Hàng chờ kiểm tra của Trợ giảng (TA Review Queue).

---

## 3. Quy tắc Lịch học Linh hoạt & Đặt lại Hạn nộp (BR_SCHEDULE & BR_DEADLINE)

* **BR_SCHEDULE_001 (Flexible Weekly Schedule & Khởi tạo Mặc định):**
  * Mốc deadline các tuần học được tính toán dựa trên thời điểm đăng ký.
  * *Mô phỏng ban đầu:* Để người học trải nghiệm tính năng quá hạn, hệ thống mặc định khởi tạo Tuần 1 quá hạn 3 ngày (`now - 3 days`, `OVERDUE`) và Tuần 2 (`now + 7 days`, `ON_TRACK`).
* **BR_DEADLINE_001 (Công thức Reset My Deadlines có Hạn kết thúc Khóa học):**
  * Khi học viên bấm nút **"Reset my deadlines"**, hệ thống cập nhật lại hạn nộp cho toàn bộ các tuần học $N$ theo công thức bị chặn trên bởi Ngày kết thúc khóa học (`Course_End_Date`):
    $$\text{Due Date}_{\text{Week } N} = \min\left(\text{Thời điểm bấm nút} + (7 \times N) \text{ ngày}, \text{Course\_End\_Date}\right)$$
  * Tất cả các trạng thái hạn nộp tự động chuyển về `ON_TRACK` mà không trừ điểm thi hay làm mất tiến độ học tập cũ.
* **BR_LEARNING_001 (Tính toán Tiến độ & Khử trùng lặp Completed Items):**
  * Mỗi khi hoàn thành 1 bài học (Video, Reading, Quiz), hệ thống tự động thêm `item_id` vào danh sách `completed_item_ids` (sử dụng tập hợp `set` để khử trùng lặp).
  * Phần trăm tiến độ được tính toán và làm tròn 1 chữ số thập phân:
    $$\text{Overall Progress \%} = \min\left(100.0, \text{round}\left(\frac{|\text{Completed Items}|}{\max(1, \text{Total Course Items})} \times 100, 1\right)\right)$$
* **BR_LEARNING_002 (Bảo lưu Tiến độ & Ghi chú khi Nâng cấp Chế độ):**
  * Khi học viên nâng cấp từ Audit Mode sang Paid Mode (hoặc qua Financial Aid / Enterprise Key), hệ thống **bảo lưu 100% danh sách bài học đã hoàn thành (`completed_item_ids`) và các Ghi chú cá nhân (`Personal Notes`)**.

---

## 4. Quy tắc An toàn và Phạm vi Hoạt động của AI Coach (BR_AI)

* **BR_AI_001 (Phạm vi RAG bám sát khóa học):**
  * AI Coach chỉ truy xuất dữ liệu từ các tài liệu, bài đọc và Video Transcript thuộc khóa học hiện tại (`course_id`).
* **BR_AI_002 (Nguyên tắc Socratic Method & Anti-Cheat):**
  * AI Coach đóng vai người hướng dẫn gợi mở tư duy, không đưa ra đáp án trực tiếp cho bài thi Graded Quiz hay Lab.
* **BR_AI_003 (Chế tài xử phạt vi phạm Input Guard):**
  * Tự động khóa quyền dùng AI Coach trong 24 giờ nếu vi phạm quá 3 lần/10 phút.
* **BR_AI_004 (Định dạng Phản hồi Trích dẫn Timestamp & Link Bài học):**
  * Phản hồi của AI Coach kèm danh sách `citations` (`item_id`, `timestamp_seconds`, `snippet`).

---

## 5. Quy tắc Cấp phát và Thu hồi Chứng chỉ Xác minh (BR_CERT & BR_BADGE)

* **BR_CERT_001 (Điều kiện cấp Verified Certificate tự động):**
  * Tự động phát hành Verified Certificate khi: (1) `Progress = 100%` và (2) `Điểm các bài Graded Items >= 80%`.
* **BR_CERT_002 (Xác thực Công khai, Truy vấn Dữ liệu Thật & QR Code API):**
  * Mỗi chứng chỉ có mã duy nhất (dạng `CERT-XXXXXXXXXX`).
  * Khi phát hành, hệ thống tự động truy vấn thông tin thực tế từ `UserModel` và `CourseModel` để gắn Tên học viên, Tên khóa học, Tên đối tác (Partner Name) và Logo đối tác (Partner Logo).
  * Mã QR xác thực được sinh tự động thông qua công cụ API công khai: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={cert_id}`.
* **BR_CERT_003 (Quy trình Xác minh Danh tính Sinh trắc học):**
  * Bắt buộc hoàn tất xác minh CCCD/Hộ chiếu và sinh trắc học webcam trước khi cấp chứng chỉ lần đầu.
* **BR_CERT_004 (Trạng thái Giao diện Chứng chỉ bị Thu hồi):**
  * Khi chứng chỉ bị thu hồi do vi phạm quy chế liêm chính học thuật, trang xác thực công khai hiển thị thông báo trạng thái rõ ràng: *"Chứng chỉ này đã bị thu hồi do vi phạm điều khoản liêm chính học thuật của nền tảng (Certificate Revoked)"* (không trả về 404).
* **BR_CERT_005 (Chứng chỉ Chuỗi Chuyên ngành Specialization Certificate):**
  * Tự động phát hành Verified Specialization Certificate khi học viên hoàn thành 100% tất cả các khóa học thành phần thuộc Chuỗi chuyên ngành đó.
* **BR_BADGE_001 (Cấu trúc Chuẩn OpenBadges 2.0 JSON-LD):**
  * Tệp chứng chỉ nhúng siêu dữ liệu JSON-LD theo đúng chuẩn OpenBadges 2.0 chứa các trường: `@context: "https://w3id.org/openbadges/v2"`, `type: "BadgeClass"`, `id`, `name`, `description`, `image` (QR URL), `criteria` (`/courses/{course_id}`), và `issuer` (`name`, `url`).

---

## 6. Quy tắc Diễn đàn Thảo luận (BR_FORUM)

* **BR_FORUM_001 (Ràng buộc 1 Vote/User & Idempotent Toggle):**
  * Mỗi `user_id` chỉ được vote 1 lượt trên mỗi bài/câu trả lời. Bấm Upvote lần đầu sẽ tăng +1 điểm; bấm lại lần nữa sẽ hủy vote (Un-vote) và giảm -1 điểm.
* **BR_FORUM_002 (Phân quyền & Tự động Ghim Thread khi Pin Staff Answer):**
  * Chỉ tài khoản có vai trò `INSTRUCTOR`, `TA`, `SUPER_ADMIN` hoặc `PARTNER_ADMIN` mới có quyền gọi lệnh ghim câu trả lời chính thức (`pin_staff_answer`).
  * Khi một câu trả lời được ghim làm `is_staff_answer = True`, bài thảo luận gốc (Thread) cũng tự động được đánh dấu `is_staff_pinned = True` để ưu tiên hiển thị trên đầu danh sách diễn đàn.

