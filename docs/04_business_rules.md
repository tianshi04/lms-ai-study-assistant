# 04. DANH MỤC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

Tài liệu này tập hợp và quản lý tập trung toàn bộ các quy tắc logic nghiệp vụ (Business Rules - BR) của **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)**. Các quy tắc này là ràng buộc bắt buộc khi lập trình logic ở Backend.

---

## 1. Quy tắc Phân quyền & Quản lý Tài khoản (BR_AUTH & BR_ACCESS)

* **BR_AUTH_001 (Bảo mật Declarative Auth Policy & Kiến trúc Phân quyền 3 Tầng):**
  * **Khai báo Phân quyền Declarative ở Tầng Contract (Protobuf Custom Options):**
    * Tất cả các phương thức RPC trong file `.proto` được gán nhãn khai báo cấp độ bảo mật qua Protobuf Custom Option `(auth.v1.policy) = ...` (Option `50001` trên `google.protobuf.MethodOptions`, với enum `AuthPolicy`: `PUBLIC = 1`, `AUTHENTICATED = 2`, `ADMIN = 3`, `INTERNAL = 4`).
    * Lớp `AuthPolicyRegistry` tự động quét Protobuf Descriptors khi ứng dụng ASGI khởi chạy (Eager Pre-initialization), xây dựng bảng ánh xạ $O(1)$ phục vụ cho `AuthInterceptor`.
  * **Kiến trúc Phân quyền Phân lớp 3 Tầng (3-Layer Authorization Architecture):**
    * **Tầng 1 (API Method Policy - Endpoint Level):** Do `AuthInterceptor` & `AuthPolicyRegistry` đảm nhiệm. Tự động kiểm tra JWT Bearer Token đối với các API `AUTHENTICATED` hoặc `ADMIN`, inject `CurrentUser` vào Request Context. Với API `PUBLIC` (như Login, Register, RefreshToken, ListCourses, GetCourseDetail, VerifyCertificatePublic), request được phép đi qua không cần Bearer Token.
    * **Tầng 2 (ABAC & Business Access Policy Level):** Do `AccessPolicyService` & Decorator `@require_paid_access` đảm nhiệm. Thực thi quy chế Paid Mode vs Audit Mode (`BR_ACCESS_001`), Enterprise Seats (`BR_ACCESS_002`), Financial Aid (`BR_FAID_001`). Khi tài khoản ở Audit Mode cố tình gọi RPC chấm điểm hoặc nhận chứng chỉ, hệ thống từ chối bằng `ConnectError(Code.PERMISSION_DENIED, err)` chuẩn ConnectRPC protocol.
    * **Tầng 3 (Domain Resource & Ownership Level):** Do các Application Use Cases (ví dụ `CatalogUseCase._verify_ownership`) đảm nhiệm. Kiểm tra quyền sở hữu đối tượng domain (`owner_id`, `co_instructor_ids`) thông qua helper `enforce_course_ownership` để ngăn ngừa tấn công IDOR / Unauthorized Resource Access.
  * **Quản lý Vai trò Tập trung (Centralized Role Helpers):**
    * Đưa hằng số `ADMIN_ROLES`, `STAFF_ROLES` và các phương thức `user.is_admin()`, `user.is_staff()`, `is_admin_role()`, `is_staff_role()` tập trung vào `src/shared/auth.py`, loại bỏ hoàn toàn các câu lệnh so sánh chuỗi vai trò rải rác.
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
  * *Xử lý trùng lặp (Idempotent Activation):* Khi học viên kích hoạt lại đúng mã Enterprise Key đã sở hữu trước đó (`user.enterprise_seat_key == clean_key`), hệ thống phản hồi thành công và bảo lưu trạng thái hiện tại mà **không tăng số lượng `used_seats`** (tránh cạn kiệt suất học).
  * *Ràng buộc 1 mã duy nhất (Single Active Key):* Mỗi tài khoản học viên chỉ được phép có 1 mã Enterprise Key hoạt động tại một thời điểm (`user.enterprise_seat_key`). Trường hợp tài khoản đã có mã Enterprise khác đang kích hoạt, hệ thống sẽ từ chối và yêu cầu thu hồi (Revoke) mã cũ trước khi gán mã mới.
* **BR_ACCESS_003 (Thu hồi & Tái cấp Suất học Enterprise Seat Recycling & Fallback):**
  * Partner Admin / Super Admin có quyền thu hồi suất học của nhân viên/sinh viên nếu tài khoản đó chưa đạt quá 20% tiến độ khóa học trong vòng 30 ngày kể từ ngày gán mã.
  * Khi thu hồi thành công, hệ thống tự động hủy mã gán trên người dùng cũ và thực hiện giảm bộ đếm bằng khóa giao dịch DB Atomic Update (`UPDATE enterprise_keys SET used_seats = used_seats - 1 WHERE id = :key_id AND used_seats > 0`) nhằm ngăn ngừa triệt để nguy cơ sai lệch dữ liệu do Race Condition khi thao tác đồng thời.
  * *Chuyển đổi trạng thái & Bảo lưu tiến độ:* Tài khoản bị thu hồi Suất học sẽ tự động chuyển về **Audit Mode (Miễn phí)**. Hệ thống **bảo lưu 100% tiến độ học tập (Completed Items) và Ghi chú cá nhân (Personal Notes)** của học viên. Nếu sau đó học viên tự nâng cấp Paid Mode hoặc được cấp đơn Financial Aid, toàn bộ tiến độ cũ sẽ được mở khóa lại trọn vẹn.
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
* **BR_QUIZ_001 (Quy tắc Thi lại, Nguyên tắc Điểm cao nhất & Cooldown bài Graded Quiz):**
  * Mỗi bài Graded Quiz bắt buộc đạt tối thiểu điểm Pass (>= 80.0%) mới tính là hoàn thành.
  * *Nguyên tắc Điểm cao nhất (Highest Score Wins):* Điểm số chính thức của bài thi luôn ghi nhận kết quả cao nhất giữa các lần thi. Học viên đã đạt điểm Pass vẫn được quyền thi lại để cải thiện điểm số mà không bị kích hoạt Cooldown 8 tiếng.
  * *Giới hạn lượt thi & Cooldown:* Học viên được làm bài tối đa 3 lần liên tiếp khi chưa đạt điểm Pass. Nếu thi trượt cả 3 lần (`failed_attempts_count >= 3`), hệ thống kích hoạt **thời gian chờ (Cooldown) 8 tiếng** (`cooldown_until = now + 8h`, `cooldown_seconds_left = 28800`) trước khi cho phép làm lại.
  * *Khôi phục lượt thi:* Ngay khi học viên đạt điểm Pass (>= 80.0%) hoặc hết thời gian 8 tiếng Cooldown, bộ đếm trượt `failed_attempts_count` tự động reset về `0` và khôi phục lại đủ 3 lượt thi (`attempts_left = 3`).
* **BR_QUIZ_002 (Quy tắc Ngân hàng Câu hỏi, Ma trận Đề thi & Xáo trộn Đáp án):**
  * Đề thi Graded Quiz được sinh tự động thông qua Ma trận đề thi (`QuizMatrix`) liên kết với Kho ngân hàng câu hỏi (`QuestionBank`).
  * *Cấu hình Ma trận:* Giảng viên/Admin thiết lập số lượng câu hỏi rút ngẫu nhiên theo từng bậc độ khó (`easy_count`, `medium_count`, `hard_count`), thời gian làm bài (`time_limit_minutes`), ngưỡng điểm đạt tùy chỉnh (`passing_threshold_percent`), và chế độ xáo trộn tùy chọn đáp án (`shuffle_options`).
  * *Xáo trộn Đáp án (Options Shuffling):* Mỗi phiên thi (`session_seed`), hệ thống tái cấu trúc và xáo trộn ngẫu nhiên thứ tự hiển thị các lựa chọn đáp án để chống học thuộc vị trí.
  * *Bảo vệ Kho rỗng (ZeroDivisionError Protection):* Nếu ngân hàng câu hỏi chưa được thêm câu hỏi (tổng số câu hỏi rút ra = 0), hệ thống tự động ghi nhận điểm 0.0%, `passed = False`, và trả về thông báo giải thích cụ thể cho học viên thay vì làm crash phiên thi.
  * *Phân quyền quản lý:* Chỉ tài khoản Giảng viên (Instructor), Trợ giảng (TA) hoặc Quản trị viên (Admin) mới có quyền tạo/sửa/xóa Ngân hàng câu hỏi và Ma trận đề thi.
* **BR_QUIZ_003 (Quy tắc Quản lý Session Đếm ngược & Auto-submit):**
  * Mọi bài thi Graded Quiz có giới hạn thời gian (Timed Quiz) được quản lý thời gian đếm ngược trực tiếp từ phía Server (Server-side Session Timer) tính từ mốc bấm nút "Start Quiz".
  * Việc tải lại trang (F5) hoặc tạm đóng trình duyệt không làm dừng đồng hồ đếm ngược. Khi hết giờ đếm ngược, Server tự động đóng phiên và thực hiện chấm điểm (Auto-submit on timeout) với các câu trả lời hiện tại.
* **BR_AUTOGRADE_001 (Quy định Sandbox Auto-Grader):**
  * Mỗi bài nộp lập trình gửi tới Auto-Grader chạy trong môi trường Sandbox cách ly với Timeout mặc định 5.0 giây (hoặc tối đa 30 giây) và Memory Limit = 512MB.
  * Điểm bài nộp = (Số lượng Test Cases Pass / Tổng số Test Cases) * 100%. Trả về log chi tiết stdout/stderr của từng testcase cho học viên.
* **BR_PEER_001 (Điều kiện Nộp & Chấm chéo Peer Review):**
  * Học viên bắt buộc phải nộp bài dự án cá nhân trước mới được phân bổ quyền chấm chéo bài của bạn học (hệ thống tự động loại trừ bài nộp của chính mình `exclude_user_id`).
  * Học viên bắt buộc phải **chấm đủ lượt bài làm theo phân bổ** $\min(3, N)$ (với $N$ là số bài nộp khả thi trong hàng chờ) thì hệ thống mới mở hiển thị điểm bài nộp của chính mình.
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
* **BR_PEER_005 (Báo cáo Bài chấm chéo bất thường & Chống lạm dụng Report):**
  * Học viên có quyền bấm nút **"Report Review"** đối với các lượt chấm chéo có dấu hiệu spam, vụ lợi hoặc cố tình cho điểm thấp không khách quan.
  * *Chống lạm dụng nộp đơn để nhận bằng:* Bài chấm chéo bị báo cáo sẽ chuyển sang trạng thái `PENDING_STAFF_REVIEW` và gửi về Hàng chờ kiểm tra của Trợ giảng (TA Review Queue). Điểm bài nộp sẽ ở trạng thái **tạm hoãn công nhận Pass & tạm dừng phát hành chứng chỉ** cho tới khi Trợ giảng (TA) rà soát xong để ngăn chặn hành vi cố tình gạch điểm thấp nhằm pass môn gian lận.
* **BR_PEER_006 (Xử lý Thiếu bài chấm chéo do Ít bài nộp - Cold Start Dynamic Requirement):**
  * Đối với lớp học mới (Cold Start), nếu số lượng bài nộp khả thi trong pool ít hơn 3 bài, số lượt chấm chéo bắt buộc đối với học viên tự động điều chỉnh theo công thức $\min(3, \text{Pool\_Size})$.
  * Sau 48 giờ kể từ khi nộp bài mà hệ thống không tìm đủ bài phân bổ hoặc không đủ reviewers, bài nộp tự động đưa vào **Staff Regrade Queue** cho TA/Instructor chấm trực tiếp (thay vì bắt học viên chờ đủ 5 ngày).
* **BR_PEER_007 (Quy định Hạn chấm chéo Review Window):**
  * Hệ thống áp dụng mốc **Hạn chấm chéo (Review Window)** gia hạn thêm **3 ngày** tính từ mốc Hạn nộp bài (Submission Deadline). Học viên phải hoàn thành việc chấm chéo 3 bài của bạn học trong khoảng thời gian này.

---

## 3. Quy tắc Lịch học Linh hoạt & Đặt lại Hạn nộp (BR_SCHEDULE & BR_DEADLINE)

* **BR_SCHEDULE_001 (Flexible Weekly Schedule & Khởi tạo Mặc định):**
  * Mốc deadline các tuần học được tính toán dựa trên thời điểm đăng ký.
  * *Mô phỏng ban đầu:* Để người học trải nghiệm tính năng quá hạn, hệ thống mặc định khởi tạo Tuần 1 quá hạn 3 ngày (`now - 3 days`, `OVERDUE`) và Tuần 2 (`now + 7 days`, `ON_TRACK`).
* **BR_DEADLINE_001 (Công thức Reset My Deadlines, Cooldown & Hạn Self-paced):**
  * Khi học viên bấm nút **"Reset my deadlines"**, hệ thống cập nhật lại hạn nộp cho toàn bộ các tuần học $N$ theo công thức bị chặn trên bởi Ngày kết thúc khóa học (`Course_End_Date`):
    $$\text{Due Date}_{\text{Week } N} = \min\left(\text{Thời điểm bấm nút} + (7 \times N) \text{ ngày}, \text{Course\_End\_Date}\right)$$
  * *Hạn Cooldown:* Áp dụng thời gian chờ **24 giờ (Cooldown)** giữa 2 lần bấm Reset my deadlines liên tiếp để tránh việc đặt lại hạn nộp liên tục.
  * *Tự động gia hạn cho Khóa học Self-paced:* Đối với khóa học tự học (Self-paced không có mốc `Course_End_Date` cố định từ Giảng viên), `Course_End_Date` được tự động tính và gia hạn thêm **180 ngày tính từ mốc bấm nút Reset** (hoặc $7 \times \text{Tổng số tuần} + 30 \text{ ngày}$) nhằm đảm bảo hạn nộp các tuần phân bổ đều 7 ngày/tuần, triệt tiêu hoàn toàn hiện tượng dồn cục hạn nộp khi reset ở giai đoạn cuối.
  * Tất cả các trạng thái hạn nộp tự động chuyển về `ON_TRACK` mà không trừ điểm thi hay làm mất tiến độ học tập cũ.
* **BR_LEARNING_001 (Tính toán Tiến độ & Khử trùng lặp Completed Items):**
  * Mỗi khi hoàn thành 1 bài học (Video, Reading, Quiz), hệ thống tự động thêm `item_id` vào danh sách `completed_item_ids` (sử dụng tập hợp `set` để khử trùng lặp).
  * *Xác thực danh mục Server-side (Server-side Item Validation):* Hệ thống tự động truy vấn danh mục bài học từ Catalog module (`CatalogUseCase.get_course_detail`) để lấy tập hợp bài học hợp lệ (`valid_item_ids`) và tổng số bài học thực tế (`real_total_items`). Tất cả `item_id` không nằm trong danh mục khóa học sẽ bị từ chối (`item_id in valid_item_ids`), đồng thời danh sách bài hoàn thành được lọc loại bỏ các item không còn tồn tại (`completed = completed.intersection(valid_item_ids)`). Loại bỏ hoàn toàn khả năng gửi tham số `total_course_items` tùy ý từ phía client.
  * Phần trăm tiến độ được tính toán và làm tròn 1 chữ số thập phân:
    $$\text{Overall Progress \%} = \min\left(100.0, \text{round}\left(\frac{|\text{Completed Items}|}{\max(1, \text{Total Course Items})} \times 100, 1\right)\right)$$
* **BR_LEARNING_002 (Bảo lưu Tiến độ & Ghi chú khi Nâng cấp Chế độ):**
  * Khi học viên nâng cấp từ Audit Mode sang Paid Mode (hoặc qua Financial Aid / Enterprise Key), hệ thống **bảo lưu 100% danh sách bài học đã hoàn thành (`completed_item_ids`) và các Ghi chú cá nhân (`Personal Notes`)**.

---

## 4. Quy tắc Cấp phát và Thu hồi Chứng chỉ Xác minh (BR_CERT & BR_BADGE)

* **BR_CERT_001 (Điều kiện cấp Verified Certificate tự động):**
  * Tự động phát hành Verified Certificate khi: (1) `Progress = 100%` và (2) `Điểm các bài Graded Items >= 80%`.
* **BR_CERT_002 (Xác thực Công khai, Truy vấn Dữ liệu Thật & Sinh QR Code Nội bộ In-Memory):**
  * Mỗi chứng chỉ có mã duy nhất (dạng `CERT-XXXXXXXXXX`).
  * Khi phát hành, hệ thống tự động khóa dữ liệu **Immutable Data Snapshot** từ `UserModel` và `CourseModel` để lưu cố định Tên học viên, Tên khóa học, Tên đối tác (Partner Name) và Logo đối tác (Partner Logo) tại thời điểm cấp. Mọi thay đổi tên trong User Profile về sau không làm thay đổi văn bản chứng chỉ cũ.
  * Mã QR xác thực được sinh tự động trực tiếp dưới dạng thẻ SVG/Data URI in-memory (0 bytes storage, không phụ thuộc URL dịch vụ bên thứ ba) để hiển thị trên web và nhúng vào PDF.
* **BR_CERT_003 (Quy trình Xác minh Danh tính KYC & Quy trình Re-issuance khi Đổi tên):**
  * Bắt buộc hoàn tất xác minh CCCD/Hộ chiếu và sinh trắc học webcam trước khi cấp chứng chỉ lần đầu.
  * *Quy trình Cấp lại Chứng chỉ khi Đổi tên (Re-issuance Workflow):* Nếu học viên cập nhật tên mới hợp pháp theo giấy tờ KYC, chứng chỉ cũ chuyển sang trạng thái `SUPERSEDED` (Đã được thay thế) kèm nhật ký lưu vết Audit Log, và hệ thống phát hành chứng chỉ phiên bản mới.
  * *Phạm vi hiệu lực:* Quy trình xác minh danh tính áp dụng ở **Cấp độ Tài khoản (Account-level Verification)** và chỉ cần thực hiện 1 lần duy nhất.
  * *Trạng thái triển khai:* Phân hệ KYC hiện đang ở dạng giả lập (**Mocked**) bằng cờ `is_identity_verified` trong database, sẵn sàng tích hợp với Dịch vụ KYC nhận diện CCCD/Khuôn mặt thực tế khi triển khai chính thức.
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
* **BR_FORUM_003 (Phân quyền Tác giả/Moderation & Chỉ báo Bài viết đã Chỉnh sửa):**
  * *Quyền Chỉnh sửa & Xóa:* Tác giả bài viết (`author_user_id == current_user.id`) có quyền Cập nhật (`UpdateThread`, `UpdateReply`) hoặc Xóa (`DeleteThread`, `DeleteReply`) bài viết/bình luận của chính mình.
  * *Chỉ báo đã Chỉnh sửa (Edit State Indicator):* Ngay khi tác giả chỉnh sửa bài viết/bình luận, hệ thống tự động cập nhật cờ `is_edited = True` và ghi lại mốc thời gian `edited_at` để tất cả người xem phân biệt được nội dung đã qua chỉnh sửa.
  * *Ban kiểm duyệt (Staff Moderation):* Trợ giảng và Giảng viên (`TA`, `INSTRUCTOR`, `ADMIN`) có quyền Xóa (Delete) bài viết hoặc bình luận vi phạm của bất kỳ người dùng nào nhưng không được quyền thay đổi nội dung (Update) bài đăng của người khác.

---

## 7. Quy tắc Đánh giá Khóa học (BR_REVIEW)

* **BR_REVIEW_001 (Ràng buộc Quyền Đánh giá & Ngưỡng 50% Tiến độ Khóa học):**
  * Chỉ học viên đã đăng ký (Enrolled) và đạt tối thiểu **50% tiến độ khóa học** (`Progress >= 50.0%`) mới được phép gửi đánh giá khóa học qua RPC `SubmitCourseReview`. Backend bắt buộc kiểm tra điều kiện này ở tầng Use Case.
* **BR_REVIEW_002 (Nhãn Phân loại Đánh giá, 1 Review/User & Aggregation Cache):**
  * *Nhãn Phân loại:* Hệ thống tự động gắn cờ `is_verified_completer = True` (gắn nhãn badge `"Verified Completer"`) nếu học viên đã đạt 100% tiến độ và pass môn tại thời điểm review, ngược lại gắn nhãn `"Active Learner Review"`.
  * *Anti-Spam & Upsert:* Mỗi `user_id` chỉ sở hữu tối đa **1 bản ghi đánh giá** cho mỗi `course_id`. Khi học viên nộp đánh giá lại, hệ thống tự động ghi đè/cập nhật (Upsert) số sao và bình luận cũ.
  * *CSAT Aggregation Cache:* Điểm số hài lòng trung bình (`average_rating`) và tổng số lượt đánh giá (`review_count`) được cập nhật trực tiếp trên bản ghi `CourseModel` để tối ưu hóa hiệu năng truy vấn read path.
* **BR_REVIEW_003 (Ràng buộc Dữ liệu Đầu vào & Chống Stored XSS):**
  * Thang điểm đánh giá `rating_stars` là số nguyên bắt buộc nằm trong khoảng $[1, 5]$.
  * Văn bản bình luận `comment_text` tối đa 2,000 ký tự và bắt buộc được làm sạch (Sanitize HTML/Script tags) tại Backend để chống tấn công Stored XSS khi hiển thị công khai. Bàn nộp quá 2,000 ký tự sẽ bị từ chối với lỗi Fail-fast validation (`ValueError`).
* **BR_REVIEW_004 (Xung đột Quyền lợi & Chống Tự đánh giá):**
  * Giảng viên, Trợ giảng hoặc Admin phụ trách tạo/quản lý khóa học bị cấm tự gửi đánh giá cho khóa học của chính mình.

---

## 8. Quy tắc Quản lý Khóa học của Giảng viên (BR_INSTRUCTOR)

* **BR_INSTRUCTOR_001 (Phân quyền Vai trò & Quyền sở hữu Khóa học - Course Ownership):**
  * Chỉ các tài khoản có vai trò `INSTRUCTOR`, `TA`, `SUPER_ADMIN` hoặc `PARTNER_ADMIN` mới có quyền gọi các RPC quản lý khóa học.
  * *Ràng buộc Quyền sở hữu (Course Ownership):* Mỗi khóa học được gắn với một Chủ sở hữu chính (`owner_id`) và danh sách Giảng viên đồng phụ trách (`co_instructor_ids`). Giảng viên chỉ có quyền chỉnh sửa (`UpdateCourse`), quản lý bài giảng (`CreateWeekModule`, `UpdateLesson`, v.v.) hoặc xóa (`DeleteCourse`) đối với khóa học do mình sở hữu hoặc phụ trách.
  * *Quyền Admin toàn quyền:* `SUPER_ADMIN` và `PARTNER_ADMIN` giữ quyền ghi đè toàn hệ thống trên mọi khóa học.
* **BR_INSTRUCTOR_002 (Cơ chế Delete Cascade Dữ liệu Phụ thuộc):**
  * Khi thực hiện Xóa khóa học (`DeleteCourse`) hoặc Xóa các cấu trúc con (`DeleteWeekModule`, `DeleteLesson`, `DeleteLearningItem`), hệ thống tự động áp dụng cơ chế cascade xóa sạch các dữ liệu con liên quan (In-video Quizzes, Interactive Transcripts, Course Announcements) để bảo đảm tính toàn vẹn dữ liệu.
* **BR_INSTRUCTOR_003 (Quy định Đăng Thông báo Khóa học Course Announcements):**
  * Giảng viên đăng thông báo (`CreateCourseAnnouncement`) phải cung cấp Tiêu đề (`title`) và Nội dung (`content`). Thông báo sau khi đăng được lưu kèm mốc thời gian và hiển thị công khai cho tất cả học viên ghi danh khóa học qua RPC `ListCourseAnnouncements`.
* **BR_INSTRUCTOR_004 (Thống kê Tiến độ Lớp học & Danh sách Học viên Instructor Analytics):**
  * Giảng viên truy xuất báo cáo lớp học qua RPC `GetInstructorAnalytics` nhận thông tin thống kê thời gian thực: Tổng số học viên (`total_enrolled_students`), Tỷ lệ hoàn thành trung bình (`average_completion_rate`), Điểm đánh giá trung bình (`average_rating`), và Danh sách chi tiết tiến độ từng học viên (`students`).
* **BR_INSTRUCTOR_005 (Kéo thả & Sắp xếp Thứ tự Cấu trúc Bài giảng Batch Reordering):**
  * Giảng viên/Admin được phép sắp xếp lại thứ tự của Tuần học (`ReorderWeekModules`), Bài học (`ReorderLessons`) và Học liệu (`ReorderLearningItems`) bằng giao diện Kéo thả (Drag & Drop) hoặc Nút di chuyển Nhanh (Up/Down).
  - Thứ tự vị trí mới được cập nhật đồng bộ trong 1 DB Transaction Atomic và duy trì chỉ số `order_index` cố định để hiển thị đồng nhất cho cả Học viên và Giảng viên.


