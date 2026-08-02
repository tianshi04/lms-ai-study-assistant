# 04. DANH MỤC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

Tài liệu này tập hợp và quản lý tập trung toàn bộ các quy tắc logic nghiệp vụ (Business Rules - BR) của **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)**. Các quy tắc này là ràng buộc bắt buộc khi lập trình logic ở Backend.

---

## 1. Quy tắc Phân quyền & Quản lý Tài khoản (BR_AUTH & BR_ACCESS)

* **BR_AUTH_001 (Bảo mật Declarative Auth Policy & Kiến trúc Phân quyền 3 Tầng):**
  * **Khai báo Phân quyền Declarative ở Tầng Contract (Protobuf Custom Options):**
    * Tất cả các phương thức RPC trong file `.proto` được gán nhãn khai báo cấp độ bảo mật qua Protobuf Custom Option `(auth.v1.policy) = ...` (Option `50001` trên `google.protobuf.MethodOptions`, với enum `AuthPolicy`: `PUBLIC = 1`, `AUTHENTICATED = 2`, `ADMIN = 3`, `INTERNAL = 4`).
    * Lớp `AuthPolicyRegistry` tự động quét Protobuf Descriptors khi ứng dụng ASGI khởi chạy (Eager Pre-initialization), xây dựng bảng ánh xạ $O(1)$ phục vụ cho `AuthInterceptor`.
  * **Cơ chế Truyền Ngữ cảnh Đa Tổ chức & Resource-Based AuthZ:**
    * Với thao tác trên tài sản có ID (`course_id`, `submission_id`), Backend tự động trích xuất `organization_id` hoặc danh sách `course_collaborators` trực tiếp từ Database.
    * Với các API xem danh sách (như `ListCoursesRequest`), client truyền trực tiếp `organization_id` trong Request Payload message. Header `x-organization-id` đóng vai trò là nguồn dự phòng (Fallback) khi payload ID không được cung cấp.
  * **Kiến trúc Phân quyền Phân lớp 3 Tầng (Hybrid PBAC & SQL Scope Pushdown):**
    * **Tầng 1 (API Method Policy & Multi-Org Context):** Do `AuthInterceptor` & `AuthPolicyRegistry` đảm nhiệm. Tự động kiểm tra JWT Bearer Token, trích xuất Header `x-organization-id`, inject `CurrentUserContext` vào Request Context.
    * **Tầng 2 (SQL Scope Pushdown & ABAC Level):** Sử dụng hàm `apply_organization_scope()` đẩy trực tiếp điều kiện lọc SQL `WHERE organization_id = :active_org_id OR organization_id = 'partner_community'` xuống PostgreSQL cho các query danh sách. Các decorator như `@require_paid_access` thực thi quy chế Paid Mode vs Audit Mode (`BR_ACCESS_001`).
    * **Tầng 3 (Domain Resource & Ownership Level):** Do các Application Use Cases (như `CatalogUseCase._verify_ownership`) và `enforce_course_ownership()` đảm nhiệm. Kiểm tra quyền sở hữu đối tượng domain (`owner_id`, `co_instructor_ids`).
  * **Quản lý Định danh & Quyền Hạn Tập trung (Single Identity Direct PBAC):**
    * Người dùng có danh tính duy nhất (`UserRole`: `LEARNER`, `INSTRUCTOR`, `ADMIN`).
    * **Cộng tác Khóa học (`co_instructor_ids`):** Quản lý danh sách giảng viên đồng phụ trách khóa học (`co_instructor_ids`). Giảng viên phụ trách có quyền xem và chỉnh sửa nội dung bài giảng.
    * **Phân biệt Member vs Enterprise Seat Holder:** Thành viên Tổ chức (`Organization Member`) đại diện cho vị trí hành chính/phân quyền, trong khi Suất học (`Enterprise Seat Holder`) đại diện cho bản quyền học tập trả phí (**Paid Mode**) do Tổ chức tài trợ cho Học viên (`Learner`).


* **BR_AUTH_002 (Cơ chế Refresh Token Rotation):**
  * Khi `access_token` hết hạn, client gọi RPC `RefreshToken` truyền `refresh_token` hợp lệ (yêu cầu payload claim `type == "refresh"` và tồn tại `user_id` sở hữu trong DB).
  * Hệ thống hủy cặp token cũ và phát hành mới đồng thời cả `access_token` và `refresh_token`.
* **BR_AUTH_003 (Thuật toán Mã hóa Mật khẩu & Auto-Avatar):**
  * Mật khẩu người dùng được băm bằng PBKDF2-HMAC-SHA256 với 100,000 vòng lặp (iterations) và muối ngẫu nhiên 16 bytes, lưu dạng `salt_hex:hash_hex`. Việc xác thực mật khẩu sử dụng `hmac.compare_digest` để chống tấn công đo thời gian (Timing Attack).
  * Khi người dùng đăng ký mới, hệ thống tự động sinh ảnh đại diện mặc định qua API DiceBear: `https://api.dicebear.com/7.x/avataaars/svg?seed={email}`.
* **BR_AUTH_005 (Quy tắc Xét duyệt Quyền Giảng viên Cá nhân & Gán Partner Chuẩn Coursera):**
  * *BR_AUTH_005.1 (Không cấp trực tiếp vai trò Giảng viên):* API Đăng ký công khai (`Register`) tuyệt đối không cấp trực tiếp vai trò `INSTRUCTOR`. Cá nhân muốn trở thành Giảng viên phải nộp Đơn đăng ký (`SubmitInstructorApplication`) để Super Admin thẩm định.
  * *BR_AUTH_005.2 (Ràng buộc Đơn trùng lặp):* Mỗi tài khoản `LEARNER` chỉ được giữ tối đa **01 đơn đăng ký** ở trạng thái `PENDING_REVIEW`. Nếu bị Reject, người dùng phải đợi 14 ngày hoặc cập nhật lại thông tin mới được nộp đơn mới.
  * *BR_AUTH_005.3 (Tự động Gán Partner Mặc định toàn sàn):* Ngay khi Super Admin phê duyệt (`APPROVED`) đơn đăng ký thông qua RPC `ReviewInstructorApplication`:
    * Hệ thống cập nhật vai trò tài khoản thành `user.role = USER_ROLE_INSTRUCTOR`.
    * Hệ thống tự động liên kết tài khoản này vào Partner Mặc định toàn sàn **`Coursera Project Network`** (`partner_id = "partner_community"`) với trạng thái thành viên `ACTIVE`.
    * Nhờ đó, giảng viên cá nhân thỏa mãn 100% ràng buộc kiến trúc (`partner_id` NOT NULL trên bảng `courses`) và có đầy đủ quyền lựa chọn Partner này khi soạn thảo bài giảng trong Course Builder.
* **BR_AUTH_006 (Ranh giới Phân quyền Đơn Tổ chức của Organization Admin - Single-Tenant Authorization Boundary):**
  * **Thẩm quyền Hạn định theo Tổ chức (Tenant-Scoped Authority):** Quản trị viên Tổ chức (`Organization Admin`) chỉ có thẩm quyền quản lý thành viên, xét duyệt đơn gia nhập nội bộ, phân bổ Suất học Enterprise Seat, phê duyệt khóa học hoặc xem báo cáo **nguyên tử trong phạm vi Tổ chức của mình** (`current_user.organization_id == target.organization_id`).
  * **Ranh giới Bất khả Xâm phạm (Cross-Tenant & Platform Boundary):** Quản trị viên Tổ chức **TUYỆT ĐỐI KHÔNG CÓ QUYỀN** xem, thẩm định hoặc phê duyệt các yêu cầu/đơn đăng ký của người dùng thuộc Tổ chức khác hoặc người dùng cá nhân tự do ngoài phạm vi tổ chức của mình.
  * **Phân định Duyệt Đơn Giảng viên Cá nhân:** Các đơn xin cấp quyền Giảng viên cá nhân toàn sàn (`SubmitInstructorApplication`) thuộc thẩm quyền thẩm định độc quyền của **Super Admin (Ban Quản trị Nền tảng)** để gán vào `Coursera Project Network` (`partner_community`). Organization Admin của các tổ chức B2B khác không có quyền can thiệp hay duyệt các đơn này.
* **BR_ACCESS_001 (Phân quyền Audit Mode vs Paid Mode):**
  * *Audit Mode (Miễn phí):* Học viên được mở xem toàn bộ Video bài giảng, bài đọc (Reading) và làm các bài Practice Quiz. Tuy nhiên, hệ thống khóa quyền nộp bài thi Graded Quiz, bài tập Auto-Graded Lab, bài tập Peer Review và không được cấp Chứng chỉ.
  * *Paid Mode (Trả phí / Subscription):* Học viên có toàn bộ quyền làm các bài kiểm tra tính điểm, được bạn học chấm bài Peer Review và nhận Verified Certificate khi hoàn thành.
* **BR_ACCESS_002 (Quy chế Enterprise License, Quản lý Seat & Phân loại Scope):**
  * Học viên tham gia khóa học qua mã Enterprise Key (do doanh nghiệp/trường học tài trợ) sẽ tự động hưởng toàn bộ quyền lợi của Paid Mode mà không cần thanh toán cá nhân.
  * *Phạm vi Mở khóa (Scope Type):* Mã Enterprise Key hỗ trợ 2 cấp độ mở khóa (`scope_type`):
    * `ALL_COURSES` (Mở khóa Toàn bộ): Mở khóa Paid Mode trên 100% các khóa học của nền tảng/đối tác.
    * `CURATED_COURSES` (Danh mục Chỉ định): Gán danh sách mã khóa học cụ thể (`allowed_course_ids = [...]`). Học viên chỉ được mở Paid Mode khi tham gia các khóa học nằm trong danh sách chỉ định này. Khi học khóa ngoài danh sách, tài khoản tự động rớt về Audit Mode.
  * *Ràng buộc Seat:* Mã Enterprise Key phải ở trạng thái kích hoạt (`is_active = True`) và số lượng suất đã dùng chưa vượt quá hạn mức (`used_seats < total_seats`, mặc định 500 seats/key). Khi kích hoạt thành công, hệ thống tự động tăng `used_seats += 1` và gán `user.enterprise_seat_key`.
  * *Xử lý trùng lặp (Idempotent Activation):* Khi học viên kích hoạt lại đúng mã Enterprise Key đã sở hữu trước đó (`user.enterprise_seat_key == clean_key`), hệ thống phản hồi thành công và bảo lưu trạng thái hiện tại mà **không tăng số lượng `used_seats`** (tránh cạn kiệt suất học).
  * *Ràng buộc 1 mã duy nhất (Single Active Key):* Mỗi tài khoản học viên chỉ được phép có 1 mã Enterprise Key hoạt động tại một thời điểm (`user.enterprise_seat_key`). Trường hợp tài khoản đã có mã Enterprise khác đang kích hoạt, hệ thống sẽ từ chối và yêu cầu thu hồi (Revoke) mã cũ trước khi gán mã mới.
* **BR_ACCESS_003 (Thu hồi & Tái cấp Suất học Enterprise Seat Recycling & Fallback):**
  * Organization Admin / Super Admin có quyền thu hồi suất học của nhân viên/sinh viên nếu tài khoản đó chưa đạt quá 20% tiến độ khóa học trong vòng 30 ngày kể từ ngày gán mã.
  * Khi thu hồi thành công, hệ thống tự động hủy mã gán trên người dùng cũ và thực hiện giảm bộ đếm bằng khóa giao dịch DB Atomic Update (`UPDATE enterprise_keys SET used_seats = used_seats - 1 WHERE id = :key_id AND used_seats > 0`) nhằm ngăn ngừa triệt để nguy cơ sai lệch dữ liệu do Race Condition khi thao tác đồng thời.
  * *Chuyển đổi trạng thái & Bảo lưu tiến độ:* Tài khoản bị thu hồi Suất học sẽ tự động chuyển về **Audit Mode (Miễn phí)**. Hệ thống **bảo lưu 100% tiến độ học tập (Completed Items) và Ghi chú cá nhân (Personal Notes)** của học viên. Nếu sau đó học viên tự nâng cấp Paid Mode hoặc được cấp đơn Financial Aid, toàn bộ tiến độ cũ sẽ được mở khóa lại trọn vẹn.
* **BR_ACCESS_004 (Phân loại Trả phí Cá nhân - Mua lẻ vs Thuê bao Coursera Plus & Quy định Giá):**
  * *Mua lẻ Khóa học (Single Purchase):* Học viên thanh toán cá nhân cho 1 khóa học lẻ sẽ được cấp quyền Paid Mode cố định cho riêng khóa học đó.
  * *Quy định Giá Mua lẻ (Course Pricing Authority):* Mức giá (`price`) và đơn vị tiền tệ (`currency`) của từng khóa học do **Giảng viên sở hữu (`owner_id`)** hoặc **Quản trị viên Tổ chức (`Organization Admin`)** thiết lập trực tiếp trong giao diện Course Builder. **Super Admin** quản lý khung giá mặc định (Default Price Tier) và chính sách khuyến mãi toàn sàn. Khi học viên thanh toán (`PurchaseCourse`), Backend truy vấn giá niêm yết trực tiếp từ `CourseModel` để khởi tạo hóa đơn thanh toán, tuyệt đối không tin tưởng giá gửi lên từ Client.
  * *Gói Thuê bao (Coursera Plus Subscription):* Học viên đăng ký gói thuê bao theo tháng (`MONTHLY` - 30 ngày) hoặc theo năm (`YEARLY` - 365 ngày) được tự động mở khóa Paid Mode trên toàn bộ danh mục khóa học khả dụng trong thời gian gói thuê bao còn hiệu lực (`expires_at > now()`). Khi gói thuê bao hết hạn, tài khoản tự động rớt về Audit Mode (tiến độ học tập và ghi chú cá nhân được bảo lưu 100%).
  * *Danh mục Đủ điều kiện (Plus Eligibility):* Mỗi khóa học có cờ cấu hình `is_plus_eligible` (Mặc định `= True`). Các khóa học đặc thù bị tắt cờ này (`False`) sẽ không được mở khóa tự động qua gói Coursera Plus mà yêu cầu mua lẻ hoặc gán mã Enterprise Key riêng.
* **BR_FAID_001 (Quy trình nộp & xét duyệt Financial Aid):**
  * Học viên nộp đơn phải điền bài luận tối thiểu 150 từ giải trình lý do hoàn cảnh và kế hoạch áp dụng kiến thức.
  * *Hạn xét duyệt:* Super Admin có tối đa 15 ngày kể từ ngày nộp đơn (`review_deadline_days_left = 15`) để xem xét duyệt hoặc từ chối đơn tài chính của nền tảng.
  * *Tự động phê duyệt (Auto-Approve):* Áp dụng mô hình Hybrid Best Practice (Lazy Evaluation trên Read Path kết hợp Periodic Worker). Nếu quá 15 ngày (`review_deadline_days_left <= 0`) chưa được xử lý, hệ thống tự động chuyển trạng thái đơn sang `AUTO_APPROVED` và cấp quyền Paid Mode ngay khi học viên truy cập hoặc qua lịch quét định kỳ.
* **BR_FAID_002 (Quy trình Nộp lại đơn khi bị Từ chối - Re-application):**
  * Nếu đơn xin Financial Aid bị từ chối (`REJECTED`), học viên được phép nộp lại bằng cách bổ sung/chỉnh sửa bài luận (>= 150 từ).
  * Khi học viên cập nhật bài luận, hệ thống tự động reset trạng thái đơn về `PENDING` và khôi phục hạn xét duyệt 15 ngày (`review_deadline_days_left = 15`).
* **BR_FAID_003 (Cấu hình Bật/Tắt Hỗ trợ Tài chính cho từng Khóa học):**
  * Mỗi khóa học sở hữu cờ cấu hình `financial_aid_enabled` (Mặc định `= True`).
  * Giảng viên sở hữu khóa học (`owner_id`) hoặc Admin có quyền tắt cờ này đối với các khóa học đặc thù (khóa luyện thi chứng chỉ đắt tiền, bài lab tốn chi phí hạ tầng).
  * Khi `financial_aid_enabled = False`: Trình phát & Trang thông tin khóa học ẩn hoàn toàn liên kết/nút *"Financial Aid available"*, và RPC `ApplyFinancialAid` ở Backend từ chối tiếp nhận đơn xin học bổng cho khóa học đó.

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

## 3. Quy tắc Quản lý Danh mục & Kiểm duyệt Khóa học (BR_CATALOG)

* **BR_CATALOG_001 (Quản lý Quyền sở hữu & Phân công Giảng viên):**
  * Khóa học phải được gán đúng Giảng viên chính (`owner_id`) và danh sách Giảng viên đồng giảng dạy (`co_instructor_ids`). Chỉ các tài khoản này hoặc Admin mới có quyền truy cập Course Builder để biên soạn học liệu.
* **BR_CATALOG_002 (Tự động Phân giải Chữ ký Bảo chứng Khóa học):**
  * Khi phát hành chứng chỉ cho khóa học, hệ thống tự động trích xuất Tên, Chức danh khoa học (`title`) và Ảnh chữ ký tay (`signature_image_url`) từ Hồ sơ Giảng viên phụ trách khóa học (`owner_id`) (`/instructor/profile`). Nếu chưa bổ sung, hệ thống fallback lấy Chữ ký mặc định của Partner Org (`BR_CERT_002`).
* **BR_CATALOG_003 (Quy trình Nộp & Phê duyệt Phát hành Khóa học - Submit for Launch & Course Review Workflow):**
  * *Pre-submit Self-Checklist (Tự đánh giá trước khi Nộp):* Giao diện Course Builder kiểm tra 4 tiêu chí bắt buộc: (1) 100% Video bài giảng có Phụ đề VTT, (2) Ma trận bài thi Graded Quiz không rỗng (`BR_QUIZ_002`), (3) Bài tập Peer Review có đủ bộ Tiêu chí Rubric (`BR_PEER_002`), và (4) Đã gán Giảng viên phụ trách chính (`owner_id`).
  * *Chuyển trạng thái Nộp bài (`Submit for Launch`):* Khi Giảng viên bấm nút **"Submit for Launch"**, khóa học chuyển sang trạng thái **`PENDING_REVIEW`** và chuyển sang chế độ Chỉ đọc (Read-only Mode) để ngăn ngừa chỉnh sửa trong thời gian chờ duyệt.
  * *Màn hình Kiểm duyệt (Course Reviewer Portal & Student Preview Mode):* Quản trị viên Tổ chức (`Organization Admin`) hoặc Super Admin vào màn hình Reviewer Portal, trải nghiệm khóa học dưới chế độ Xem trước như Học viên (*Preview Mode*).
  * *Quyết định Phê duyệt hoặc Từ chối (Approve / Reject):*
    * **Phê duyệt (`Approve`):** Khóa học chuyển sang trạng thái **`PUBLISHED`** và chính thức xuất hiện trên Trang Tìm kiếm Công khai toàn cầu (`/courses`).
    * **Từ chối (`Reject`):** Reviewer nhập lý do/gợi ý chỉnh sửa (Feedback Log). Khóa học tự động chuyển về trạng thái **`DRAFT`** kèm nhật ký góp ý để Giảng viên hoàn thiện và nộp lại.


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
* **BR_CERT_002 (Mô hình Đa Chữ ký V2 Coursera-Style, Khối Chữ ký tay Điện tử & QR Code In-Memory):**
  * Mỗi chứng chỉ có mã duy nhất (dạng `CERT-XXXXXXXXXX`).
  - **Chữ ký theo Giảng viên Chuẩn Coursera (Multi-Signer V2 Model):** Khi phát hành chứng chỉ, hệ thống tự động khóa dữ liệu **Immutable Data Snapshot**: Tên học viên, Tên khóa học, Logo đối tác (`partner_logo_url`), cùng **Chữ ký tay điện tử (`signature_image_url`), Họ tên (`signer_name`) và Chức danh khoa học (`signer_title`) trích xuất trực tiếp từ Hồ sơ Giảng viên sở hữu khóa học (`owner_id`)** (Ví dụ: *GS. Andrew Ng - Founder, DeepLearning.AI & Adjunct Professor, Stanford University*).
  * *Cơ chế Fallback:* Trường hợp Giảng viên phụ trách chưa bổ sung ảnh chữ ký cá nhân, hệ thống tự động sử dụng Chữ ký & Người ký mặc định của **Tổ chức Đối tác (Partner)**.
  * *Hiển thị Trực quan trên Bằng (`/verify/[certId]`):* Giao diện chứng chỉ hiển thị song song 3 khối hình ảnh: (1) Logo Trường Đối tác, (2) Khối Chữ ký số & Ảnh chữ ký tay điện tử kèm Họ tên + Chức danh người bảo chứng, (3) Mã QR Code xác thực.
  * Mã QR xác thực được sinh tự động trực tiếp dưới dạng thẻ SVG/Data URI in-memory (0 bytes storage) để hiển thị trên web và nhúng vào PDF.
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

## 5. Quy tắc Quản lý Bounded Context Đối tác (BR_PARTNER)

* **BR_PARTNER_001 (Hồ sơ B2B Đối tác, RPC RotateKeyPair & Phân quyền Organization Admin Self-Service):**
  * Bounded Context `PartnerModule` quản lý tập trung toàn bộ các Tổ chức/Trường Đại học Đối tác với 15 thuộc tính chuẩn hóa (`id`, `name`, `slug`, `description`, `logo_url`, `banner_url`, `website_url`, `allowed_domains`, `signature_image_url`, `signer_name`, `signer_title`, `public_key_pem`, `created_at`, `updated_at`, `historical_public_keys`).
  * *Ràng buộc Tên miền (`allowed_domains`):* Mỗi Đối tác khai báo danh sách tên miền email ủy quyền (VD: `["@stanford.edu", "@cs.stanford.edu"]`). Được sử dụng để: (1) Tự động gán Suất học Enterprise Seat cho sinh viên (`BR_ACCESS_002`), và (2) Tự động phân giải `partner_id` khi Quản trị viên Tổ chức (`Organization Admin`) gọi RPC `RotatePartnerKeyPair` mà không cần truyền `partner_id` thủ công.
  * *RPC RotatePartnerKeyPair & Bảo lưu Lịch sử Khóa:* Cho phép Organization Admin bấm xoay khóa ký số bất kỳ lúc nào. Khóa cũ tự động được chuyển vào mảng `historical_public_keys`, hệ thống khởi tạo khóa ECDSA P-256 mới và trả về duy nhất `public_key_pem`.
  * *Tự quản lý Self-Service:* Quản trị viên Tổ chức (`Organization Admin`) có toàn quyền tự cập nhật thông tin thương hiệu (Logo, Banner), hồ sơ chữ ký đại diện, người ký và danh sách nhiều người ký (Multi-Signatories) của tổ chức mình thông qua API RPC `UpdatePartner`.
* **BR_PARTNER_002 (Xác thực Ủy quyền Ký số & Xuất File Static `openbadges-issuer.json` cho Tên miền Đối tác):**
  * *Cơ chế Tự động sinh Khóa (Auto-Generated Key Fallback):* Nếu Organization Admin không tự nhập `public_key_pem`, hệ thống tự động khởi tạo Cặp khóa ký số bất đối ứng ECDSA P-256 duy nhất (Private Key lưu an toàn trong Vault/HSM của Nền tảng, Public Key tự điền vào `public_key_pem`).
  * *Xuất File Xác thực Tĩnh W3C (`openbadges-issuer.json`):* Nền tảng tự động sinh file JSON tĩnh chuẩn OpenBadges 2.0/3.0 chứa mảng đối tượng `publicKey` (`CryptographicKey` Object Array) bao gồm **Cả Khóa Mới hiện tại và Toàn bộ Khóa Lịch sử Cũ (`historical_public_keys`)**. Cung cấp nút tải xuống trong Admin Portal để Đối tác dán vào thư mục công khai `https://<domain>/.well-known/openbadges-issuer.json` trên tên miền chính thức của mình (VD: `stanford.edu`), làm bằng chứng kỹ thuật xác thực việc Trường ủy quyền ký số cho Nền tảng LMS mà không cần phải dựng máy chủ API phức tạp, đồng thời bảo toàn tính hợp lệ 100% cho tất cả các bằng cấp cũ đã phát hành trong quá khứ.




---

## 6. Quy tắc Diễn đàn Thảo luận (BR_FORUM)

* **BR_FORUM_001 (Ràng buộc 1 Vote/User & Idempotent Toggle):**
  * Mỗi `user_id` chỉ được vote 1 lượt trên mỗi bài/câu trả lời. Bấm Upvote lần đầu sẽ tăng +1 điểm; bấm lại lần nữa sẽ hủy vote (Un-vote) và giảm -1 điểm.
* **BR_FORUM_002 (Phân quyền & Tự động Ghim Thread khi Pin Staff Answer):**
  * Chỉ tài khoản có vai trò `INSTRUCTOR`, `TA`, hoặc `SUPER_ADMIN` mới có quyền gọi lệnh ghim câu trả lời chính thức (`pin_staff_answer`).
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

* **BR_INSTRUCTOR_001 (Phân quyền Vai trò, Liên kết Đa Tổ chức & Quyền sở hữu Khóa học - Course Ownership & Partner Scoping):**
  * Chỉ các tài khoản có vai trò `INSTRUCTOR`, `TA`, hoặc `SUPER_ADMIN` mới có quyền gọi các RPC quản lý khóa học.
  * *Liên kết Đa Tổ chức (Instructor Multi-Tenant Affiliation):* Một Giảng viên có thể thuộc/liên kết với nhiều Tổ chức/Trường học khác nhau (`user_id <-> partner_id` N-N). Giảng viên có quyền đại diện phát hành các khóa học cho từng Tổ chức mà mình có vai trò thành viên hợp lệ (`ACTIVE`).
  * *Ràng buộc Khóa học Bắt buộc thuộc Partner (`partner_id` NOT NULL):* 100% khóa học trên hệ thống BẮT BUỘC phải gắn với 1 Partner Organization đại diện bảo chứng. Không tồn tại khóa học mồ côi (`partner_id = NULL`). Khi tạo khóa học (`CreateCourse`), Giảng viên chỉ được chọn `partner_id` trong danh sách các Partner mà mình được cấp quyền. Với Giảng viên cá nhân tự do, hệ thống tự động gán `partner_id` mặc định là **`Coursera Project Network`** (`partner_id = "partner_community"`).
  * *Ràng buộc Quyền sở hữu (Course Ownership):* Mỗi khóa học được gắn với một Chủ sở hữu chính (`owner_id`) và danh sách Giảng viên đồng phụ trách (`co_instructor_ids`). Giảng viên chỉ có quyền chỉnh sửa (`UpdateCourse`), quản lý bài giảng (`CreateWeekModule`, `UpdateLesson`, v.v.) hoặc xóa (`DeleteCourse`) đối với khóa học do mình sở hữu hoặc phụ trách.
  * *Quyền Admin toàn quyền:* `SUPER_ADMIN` giữ quyền ghi đè toàn hệ thống trên mọi khóa học.
* **BR_INSTRUCTOR_002 (Cơ chế Delete Cascade Dữ liệu Phụ thuộc):**
  * Khi thực hiện Xóa khóa học (`DeleteCourse`) hoặc Xóa các cấu trúc con (`DeleteWeekModule`, `DeleteLesson`, `DeleteLearningItem`), hệ thống tự động áp dụng cơ chế cascade xóa sạch các dữ liệu con liên quan (In-video Quizzes, Interactive Transcripts, Course Announcements) để bảo đảm tính toàn vẹn dữ liệu.
* **BR_INSTRUCTOR_003 (Quy định Đăng Thông báo Khóa học Course Announcements):**
  * Giảng viên đăng thông báo (`CreateCourseAnnouncement`) phải cung cấp Tiêu đề (`title`) và Nội dung (`content`). Thông báo sau khi đăng được lưu kèm mốc thời gian và hiển thị công khai cho tất cả học viên ghi danh khóa học qua RPC `ListCourseAnnouncements`.
* **BR_INSTRUCTOR_004 (Thống kê Tiến độ Lớp học & Danh sách Học viên Instructor Analytics):**
  * Giảng viên truy xuất báo cáo lớp học qua RPC `GetInstructorAnalytics` nhận thông tin thống kê thời gian thực: Tổng số học viên (`total_enrolled_students`), Tỷ lệ hoàn thành trung bình (`average_completion_rate`), Điểm đánh giá trung bình (`average_rating`), và Danh sách chi tiết tiến độ từng học viên (`students`).
* **BR_INSTRUCTOR_005 (Kéo thả & Sắp xếp Thứ tự Cấu trúc Bài giảng Batch Reordering):**
  * Giảng viên/Admin được phép sắp xếp lại thứ tự của Tuần học (`ReorderWeekModules`), Bài học (`ReorderLessons`) và Học liệu (`ReorderLearningItems`) bằng giao diện Kéo thả (Drag & Drop) hoặc Nút di chuyển Nhanh (Up/Down).
  - Thứ tự vị trí mới được cập nhật đồng bộ trong 1 DB Transaction Atomic và duy trì chỉ số `order_index` cố định để hiển thị đồng nhất cho cả Học viên và Giảng viên.

---

## 9. Quy tắc Hệ thống Thông báo (BR_NOTIF)

* **BR_NOTIF_001 (Định danh & Phân loại Danh mục Thông báo):**
  * Mọi bản ghi thông báo phải thuộc 1 trong các danh mục chính (`NotificationCategory`): `ANNOUNCEMENT` (thông báo khóa học), `COMMUNITY` (phản hồi diễn đàn), `SYSTEM` (duyệt giảng viên), `ACADEMIC` (duyệt Financial Aid).
* **BR_NOTIF_002 (Bảo mật & Cô lập Ngữ cảnh Người nhận):**
  * Người dùng chỉ được phép truy xuất, đọc và cập nhật các thông báo được gửi trực tiếp đến `user_id` của mình (`recipient_id == current_user.id`). Enforce bảo mật 3 tầng (`AUTH_POLICY_AUTHENTICATED`, SQL scope filter `WHERE recipient_id = :current_user_id`).
* **BR_NOTIF_003 (Cấu trúc Thẻ Thông báo & Deep Linking Payload):**
  * Thông báo chứa payload chuẩn gồm: `id`, `recipient_id`, `category`, `title`, `content`, `action_url`, `actor_avatar_url`, `is_read`, `read_at`, `created_at`.
* **BR_NOTIF_004 (Cơ chế Broadcast Thông báo Khóa học Course Announcement Fan-out):**
  * Khi Giảng viên đăng thông báo khóa học (`CreateCourseAnnouncement`), hệ thống tự động nhân bản/tạo bản ghi thông báo cho toàn bộ Học viên có trạng thái ghi danh `ACTIVE` trong khóa học đó.
* **BR_NOTIF_005 (Cơ chế Khử trùng lặp & Giới hạn Tần suất):**
  * Chống ngập thông báo: Các sự kiện lặp lại tạo tối đa 1 thông báo/sự kiện/ngày hoặc tự động gộp nội dung.
* **BR_NOTIF_006 (Cấu hình Tùy chọn Nhận Thông báo User Preferences):**
  * Người dùng có quyền bật/tắt nhận thông báo cho từng danh mục (`ANNOUNCEMENT`, `COMMUNITY`, `ACADEMIC`) và kênh (`IN_APP`, `EMAIL`) qua RPC `UpdateNotificationPreferences`. Các thông báo quan trọng thuộc danh mục `SYSTEM` (duyệt giảng viên) là BẮT BUỘC và luôn được phát không chịu ảnh hưởng bởi cài đặt tùy chọn.
* **BR_NOTIF_007 (Đánh dấu Đã đọc Đơn lẻ & Trạng thái Time-stamp):**
  * Khi người dùng nhấp vào thông báo hoặc nút "Đã đọc", cờ `is_read` lập tức được cập nhật thành `true` và lưu lại thời điểm `read_at = UTC NOW`. Số đếm `unread_count` giảm tương ứng.
* **BR_NOTIF_008 (Đánh dấu Tất cả Đã đọc Mark All as Read Scope):**
  * Thao tác "Đánh dấu tất cả đã đọc" chỉ được phép tác động lên các bản ghi thông báo thuộc quyền sở hữu của chính người dùng hiện tại (`recipient_id == current_user.id`) và có thể lọc theo danh mục `category_filter`.
* **BR_NOTIF_009 (Thứ tự Hiển thị & Sắp xếp Thời gian):**
  * Danh sách thông báo BẮT BUỘC được sắp xếp giảm dần theo mốc thời gian tạo `created_at DESC` (thông báo mới nhất hiển thị trên cùng).
* **BR_NOTIF_010 (Phân trang Tải dữ liệu Pagination):**
  * Hệ thống áp dụng cơ chế phân trang dựa trên token (`page_token`, `page_size`, mặc định 20, tối đa 50) để tối ưu hiệu năng và tránh tải toàn bộ dữ liệu khi danh sách lớn.
* **BR_NOTIF_011 (Chính sách Lưu trữ & Xóa tự động Retention Policy):**
  * Các thông báo cũ quá 90 ngày (đã đọc) hoặc 365 ngày (chưa đọc) sẽ được hệ thống định kỳ lưu trữ (archive) hoặc xóa sạch để giải phóng dung lượng cơ sở dữ liệu.
* **BR_NOTIF_012 (Tính Nguyên tử Giao dịch Nguồn Atomic Event Transaction):**
  * Thông báo CHỈ ĐƯỢC TẠO khi sự kiện nguồn (ví dụ: duyệt giảng viên, đăng thông báo khóa học, cấp chứng chỉ) đã thực hiện thành công và commit giao dịch cơ sở dữ liệu; nếu giao dịch nguồn rollback/thất bại thì tuyệt đối không sinh thông báo mồ côi.



