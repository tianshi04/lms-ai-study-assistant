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
* **BR_AUTH_003 (Thuật toán Mã hóa Mật khẩu, Validation & Auto-Avatar):**
  * **Chính sách Mật khẩu (Password Policy - `validate_password`):** Mật khẩu người dùng áp dụng ràng buộc độ mạnh bắt buộc cho các thao tác đăng ký (`Register`), hoàn tất đăng ký Google (`CompleteGoogleRegistration`) và hoàn tất đặt lại mật khẩu (`CompleteResetPassword`). Mật khẩu tối thiểu 6 ký tự (`PASSWORD_MIN_LENGTH = 6`), phải chứa ít nhất 1 chữ cái in hoa (`A-Z`) và ít nhất 1 chữ số (`0-9`). Mọi mật khẩu yếu hoặc rỗng bị từ chối ngay lập tức ở tầng Application.
  * **Mã hóa Băm Mật khẩu:** Mật khẩu người dùng được băm bằng PBKDF2-HMAC-SHA256 với 100,000 vòng lặp (iterations) và muối ngẫu nhiên 16 bytes, lưu dạng `salt_hex:hash_hex`. Việc xác thực mật khẩu sử dụng `hmac.compare_digest` để chống tấn công đo thời gian (Timing Attack).
  * Khi người dùng đăng ký mới, hệ thống tự động sinh ảnh đại diện mặc định qua API DiceBear: `https://api.dicebear.com/7.x/avataaars/svg?seed={email}`.
* **BR_AUTH_004 (Bảo vệ Đăng nhập & Giới hạn Tần suất Khóa Tài khoản - Redis Login Rate Limiter):**
  * **Bộ kiểm soát Tần suất Đăng nhập (Sliding Window Rate Limiter):** Sử dụng Redis sliding window counter (`check_login_rate_limit`) để phòng chống tấn công dò mật khẩu (Brute-force Attack).
  * **Quy tắc Khóa Tạm thời (Account Lockout):** Nếu một tài khoản hoặc IP thực hiện đăng nhập sai quá **5 lần** (`LOGIN_MAX_ATTEMPTS = 5`) liên tiếp, hệ thống tự động tạm khóa (Lockout) quyền đăng nhập trong **15 phút** (`LOGIN_LOCKOUT_SECONDS = 900` / 900 giây) và phản hồi thời gian chờ còn lại cho Client.
* **BR_AUTH_005 (Quy tắc Xét duyệt Quyền Giảng viên Cá nhân & Gán Partner Chuẩn Coursera):**
  * *BR_AUTH_005.1 (Không cấp trực tiếp vai trò Giảng viên):* API Đăng ký công khai (`Register`) tuyệt đối không cấp trực tiếp vai trò `INSTRUCTOR`. Cá nhân muốn trở thành Giảng viên phải nộp Đơn đăng ký (`SubmitInstructorApplication`) để Super Admin thẩm định.
  * *BR_AUTH_005.2 (Ràng buộc Đơn trùng lặp):* Mỗi tài khoản `LEARNER` chỉ được giữ tối đa **01 đơn đăng ký** ở trạng thái `PENDING_REVIEW`. Nếu bị Reject, người dùng phải đợi 14 ngày hoặc cập nhật lại thông tin mới được nộp đơn mới.
  * *BR_AUTH_005.3 (Tự động Gán Partner Mặc định toàn sàn):* Ngay khi Super Admin phê duyệt (`APPROVED`) đơn đăng ký thông qua RPC `ReviewInstructorApplication`:
    * Hệ thống cập nhật vai trò tài khoản thành `user.role = USER_ROLE_INSTRUCTOR`.
    * Hệ thống tự động liên kết tài khoản này vào Partner Mặc định toàn sàn **`Coursera Project Network`** (`partner_id = "partner_community"`) với trạng thái thành viên `ACTIVE`.
    * Nhờ đó, giảng viên cá nhân thỏa mãn 100% ràng buộc kiến trúc (`partner_id` NOT NULL trên bảng `courses`) và có đầy đủ quyền lựa chọn Partner này khi soạn thảo bài giảng trong Course Builder.
* **BR_AUTH_006 (Ranh giới Phân quyền Đơn Tổ chức của Organization Owner - Single-Tenant Authorization Boundary):**
  * **Thẩm quyền Hạn định theo Tổ chức (Tenant-Scoped Authority):** Chủ sở hữu Tổ chức (`Organization Owner` / `ORG_OWNER`) có thẩm quyền quản lý thành viên, gửi/hủy lời mời thành viên & lời mời `ENTERPRISE_SEAT` thuộc giấy phép của tổ chức, thu hồi Suất học Enterprise Seat (`BR_ACCESS_003`), phê duyệt/từ chối xuất bản khóa học thuộc tổ chức (`ReviewCourse` khi `course.issuer_partner_id == org.id` hoặc `course.organization_id == org.id`), xoay khóa ký số ECDSA (`RotatePartnerKeyPair`), và cập nhật cài đặt nhận diện thương hiệu **nguyên tử trong phạm vi Tổ chức của mình** thông qua `enforce_strict_organization_permission` (không bao giờ bypass bằng `partner_community`).
  * **Ranh giới Bất khả Xâm phạm (Cross-Tenant & Platform Boundary):** Chủ sở hữu Tổ chức **TUYỆT ĐỐI KHÔNG CÓ QUYỀN** xem, thẩm định hoặc phê duyệt các yêu cầu/đơn đăng ký hoặc khóa học của Tổ chức khác hay khóa học cộng đồng độc lập (`organization_id == "partner_community"` và `issuer_partner_id == ""`).
  * **Phân định Duyệt Đơn Giảng viên Cá nhân & Thu hồi Chứng chỉ:** Các đơn xin cấp quyền Giảng viên cá nhân toàn sàn (`SubmitInstructorApplication`) và quyền thu hồi chứng chỉ học thuật (`RevokeCertificate`) thuộc thẩm quyền độc quyền của **Super Admin (Ban Quản trị Nền tảng)**.
* **BR_ACCESS_001 (Phân quyền Audit Mode vs Paid Mode):**
  * *Audit Mode (Miễn phí):* Học viên được mở xem toàn bộ Video bài giảng, bài đọc (Reading) và làm các bài Practice Quiz. Tuy nhiên, hệ thống khóa quyền nộp bài thi Graded Quiz, bài tập Auto-Graded Lab, bài tập Peer Review và không được cấp Chứng chỉ.
  * *Cơ chế Phân quyền Nộp Quiz (Practice Quiz vs Graded Quiz):* Tầng Application (`QuizUseCase.submit_graded_quiz`) phân loại loại bài kiểm tra qua `is_graded_quiz_item`. Với Practice Quiz (`ITEM_TYPE_PRACTICE_QUIZ`), hệ thống cho phép học viên Audit Mode nộp bài, chấm điểm và nhận phản hồi giải thích câu hỏi chi tiết không giới hạn số lượt mà không yêu cầu quyền trả phí. Với Graded Quiz (`ITEM_TYPE_GRADED_QUIZ`), hệ thống tự động trích xuất `course_id` từ `item_id` và bắt buộc kiểm tra quyền Paid Mode qua `AccessPolicyService.verify_paid_access`.
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
  * Organization Owner / Super Admin có quyền thu hồi suất học của nhân viên/sinh viên nếu tài khoản đó chưa đạt quá 20% tiến độ khóa học trong vòng 30 ngày kể từ ngày gán mã.
  * Khi thu hồi thành công, hệ thống tự động hủy mã gán trên người dùng cũ và thực hiện giảm bộ đếm bằng khóa giao dịch DB Atomic Update (`UPDATE enterprise_keys SET used_seats = used_seats - 1 WHERE id = :key_id AND used_seats > 0`) nhằm ngăn ngừa triệt để nguy cơ sai lệch dữ liệu do Race Condition khi thao tác đồng thời.
  * *Chuyển đổi trạng thái & Bảo lưu tiến độ:* Tài khoản bị thu hồi Suất học sẽ tự động chuyển về **Audit Mode (Miễn phí)**. Hệ thống **bảo lưu 100% tiến độ học tập (Completed Items) và Ghi chú cá nhân (Personal Notes)** của học viên. Nếu sau đó học viên tự nâng cấp Paid Mode hoặc được cấp đơn Financial Aid, toàn bộ tiến độ cũ sẽ được mở khóa lại trọn vẹn.
* **BR_ACCESS_004 (Phân loại Trả phí Cá nhân - Mua lẻ vs Thuê bao Coursera Plus & Quy định Giá):**
  * *Mua lẻ Khóa học (Single Purchase):* Học viên thanh toán cá nhân cho 1 khóa học lẻ sẽ được cấp quyền Paid Mode cố định cho riêng khóa học đó.
  * *Quy định Giá Mua lẻ & Định dạng Tiền tệ (Course Pricing Authority & Numeric Precision):* Mức giá (`price`) và đơn vị tiền tệ (`currency`) của từng khóa học do **Giảng viên sở hữu (`owner_id`)** hoặc **Chủ sở hữu Tổ chức (`Organization Owner`)** thiết lập trực tiếp trong giao diện Course Builder. **Super Admin** quản lý khung giá mặc định (Default Price Tier) và chính sách khuyến mãi toàn sàn. Khi học viên thanh toán (`PurchaseCourse`), Backend truy vấn giá niêm yết trực tiếp từ `CourseModel` để khởi tạo hóa đơn thanh toán, tuyệt đối không tin tưởng giá gửi lên từ Client. Tất cả các trường dữ liệu tiền tệ (`price`, `amount`, `original_price`, `discount_amount`) trên toàn hệ thống BẮT BUỘC lưu trữ bằng kiểu dữ liệu `Numeric` (Decimal) chống sai số dấu chấm động.
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
* **BR_INVITE_001 (Bảo mật Token SHA-256 & Vòng đời Lời mời Single-Use):**
  * Token lời mời ngẫu nhiên (`inv_tok_<uuid>`) chỉ tồn tại tạm thời trong bộ nhớ và được gửi trực tiếp cho người nhận qua link hoặc email.
  * Cơ sở dữ liệu tuyệt đối không lưu trữ raw token mà chỉ lưu trữ chuỗi băm SHA-256 (`token_hash = hashlib.sha256(raw_token).hexdigest()`). Việc tra cứu lời mời qua token công khai bắt buộc phải băm input trước khi query SQL (`WHERE token_hash = :hash`).
  * Lời mời có thời hạn mặc định 7 ngày kể từ ngày khởi tạo (`expires_at = now() + 7 days`). Khi quá hạn, trạng thái lời mời tự động chuyển sang `EXPIRED`. Lời mời chỉ được phép phản hồi 1 lần duy nhất khi ở trạng thái `PENDING`.
* **BR_INVITE_002 (Ràng buộc Phân quyền theo Vai trò & Chống trùng lặp trong Lời mời):**
  * *Chặn gán quyền Owner:* Nghiêm cấm gửi lời mời trực tiếp qua email cho vai trò Chủ sở hữu Tổ chức (`ORG_OWNER`) và Chủ sở hữu Khóa học (`COURSE_OWNER`). Việc chuyển giao hoặc cấp thêm quyền Chủ sở hữu phải thực hiện qua quy trình thăng cấp từ danh sách thành viên nội bộ, tuyệt đối không cấp qua link lời mời công khai.
  * *Danh sách Vai trò Hợp lệ (OrgRole Whitelist):* Lời mời Tổ chức chỉ chấp nhận 2 vai trò hợp lệ là `INSTRUCTOR` (Giảng viên) hoặc `MEMBER` (Thành viên/Học viên).
  * *Chống gửi trùng lời mời (Deduplication Check):* Hệ thống chủ động kiểm tra và chặn gửi lời mời nếu: (1) Email người nhận đã là thành viên chính thức (`ACTIVE`) của Tổ chức, hoặc (2) Email người nhận đã có 1 lời mời đang chờ phản hồi (`PENDING`) chưa chấp nhận/từ chối.
  * *Kiểm tra thẩm quyền người gửi:* Người gửi lời mời Tổ chức phải có quyền Owner của Tổ chức đó. Người gửi lời mời Giảng viên đồng hành phải là Owner/Co-Instructor của Khóa học hoặc Admin. Người gửi lời mời Suất học Doanh nghiệp (`ENTERPRISE_SEAT`) phải là Quản trị viên hệ thống (`ADMIN`) hoặc Chủ sở hữu Tổ chức (`ORG_OWNER`) sở hữu gói giấy phép đó (`license.organization_id == org.id`).
* **BR_INVITE_003 (Luồng Nhận Lời mời & Khớp Định danh Email):**
  * *Khớp định danh bắt buộc:* Khi phản hồi lời mời (`RespondToInvitation`), email tài khoản đang đăng nhập (`current_user.email`) bắt buộc phải trùng khớp với email người nhận được mời (`invitee_email`). Nếu không trùng khớp, hệ thống chặn thao tác và thông báo yêu cầu chuyển đổi tài khoản.
  * *Kích hoạt tự động cho người dùng mới:* Trường hợp người nhận chưa có tài khoản, sau khi đăng ký tài khoản thành công với mã `invite_token`, hệ thống tự động gán tài khoản vào Tổ chức / Khóa học / Suất học Doanh nghiệp ngay lập tức.
* **BR_ORG_001 (Quy chế Kick / Loại bỏ Thành viên khỏi Tổ chức - Kick Member Boundary):**
  * *Thẩm quyền độc quyền:* Thao tác xóa thành viên khỏi Tổ chức qua RPC `RemoveOrganizationMember` đòi hỏi thẩm quyền độc quyền của **Chủ sở hữu Tổ chức (`Organization Owner` / `ORG_OWNER`)** hoặc **Super Admin**. Giảng viên (`INSTRUCTOR`) và Thành viên (`MEMBER`) tuyệt đối không có quyền kick tài khoản khác.
  * *Chặn Kick Chủ sở hữu (Owner Protection Guard):* Hệ thống chủ động kiểm tra và nghiêm cấm xóa tài khoản có vai trò `ORG_OWNER` khỏi Tổ chức để bảo đảm tính toàn vẹn tư cách pháp lý của đối tác.
* **BR_ORG_002 (Quy chế Tự nguyện Rời Tổ chức - Self-Leave Organization):**
  * *Tự nguyện rút tên:* Thành viên (`INSTRUCTOR` hoặc `MEMBER`) có quyền tự nguyện gửi yêu cầu rời khỏi Tổ chức bất kỳ lúc nào (`user_id == current_user.id`).
  * *Ràng buộc Chủ sở hữu:* Tài khoản `ORG_OWNER` duy nhất tuyệt đối không được tự rời Tổ chức khi chưa thực hiện quy trình chuyển nhượng quyền sở hữu cho thành viên khác (ngăn ngừa nguy cơ Tổ chức bị vô chủ).
* **BR_ORG_003 (Kiến trúc Nhật ký Bất biến 2 Tầng - 2-Layer Immutable Audit Log System):**
  * *Tầng Trạng thái Hiện tại (`organization_members`):* Quản lý trạng thái gia nhập hiện tại (`ACTIVE`) của thành viên nhằm tối ưu tốc độ truy vấn phân quyền ($O(1)$ index lookup).
  * *Tầng Nhật ký Bất biến (`organization_audit_logs`):* Tự động lưu vết chuỗi sự kiện không thể thay thế/sửa xóa (Append-Only Log) cho tất cả các biến động nhân sự: gia nhập (`MEMBER_JOINED`), tự rời (`MEMBER_LEFT`), bị loại bỏ (`MEMBER_KICKED`) và thay đổi vai trò (`ROLE_CHANGED`).
  * *Bảo toàn Lịch sử Ra/Vào:* Mỗi bản ghi audit log ghi nhận đầy đủ mốc thời gian ISO8601, ID người thực hiện (Actor ID), ID người chịu tác động (Target User ID) và thông tin chi tiết. Dù người dùng rời và gia nhập lại nhiều lần, toàn bộ vết lịch sử quá khứ đều được bảo toàn 100%.
* **BR_COURSE_003 (Nhật ký Bất biến Thành viên Đội ngũ Giảng dạy Khóa học - Course Audit Log System):**
  * *Tầng Nhật ký Bất biến (`course_audit_logs`):* Tự động ghi vết sự kiện cho toàn bộ các thao tác thay đổi đội ngũ giảng dạy khóa học: chấp nhận gia nhập qua lời mời (`COLLABORATOR_JOINED`), được thêm trực tiếp (`COLLABORATOR_ADDED`), tự rút tên (`COLLABORATOR_REMOVED` - Self Leave), bị loại bỏ bởi Owner (`COLLABORATOR_REMOVED` - Kicked).
  * *Kiểm tra Thẩm quyền Tra cứu:* Chỉ Giảng viên chính sở hữu khóa học (`owner_id`), Giảng viên đồng hành (`co_instructor_ids`) hoặc Admin mới có quyền gọi `ListCourseAuditLogs` để xem nhật ký lịch sử.

---

## 2. Quy tắc Đánh giá Năng lực & Chấm điểm (BR_HONOR, BR_QUIZ, BR_AUTOGRADE, BR_PEER & BR_GRADE)

* **BR_HONOR_001 (Xác nhận Honor Code):**
  * Hệ thống bắt buộc học viên phải tích chọn xác nhận *"Academic Honor Code"* trước khi cho phép bấm nút mở làm bài Graded Quiz, nộp bài Auto-Graded Lab, hoặc nộp bài Peer Assignment.
  * Nếu chưa xác nhận Honor Code (`is_agreed = False`), hệ thống chặn làm bài và trả về điểm số `0.0`, `passed = False`, `attempts_left = 0` cùng thông điệp yêu cầu cam kết.
* **BR_QUIZ_001 (Quy tắc Phân biệt Quiz Luyện tập & Quiz Tính điểm, Thi lại & Cooldown):**
  * **Quiz Luyện tập (Practice Quiz - Type 3):** Phục vụ củng cố kiến thức bài học, không ảnh hưởng đến tỷ lệ hoàn thành cấp chứng chỉ. Học viên được làm lại tự do **không giới hạn số lần** và **không áp dụng Cooldown**.
  * **Quiz Tính điểm (Graded Quiz - Type 4):** Đánh giá năng lực bài học, bắt buộc đạt tối thiểu điểm Pass (>= 80.0%) để tính vào điều kiện phát hành Chứng chỉ (Verified Certificate).
    * *Cấu hình Giới hạn & Cooldown:* Giảng viên thiết lập số lần làm bài tối đa (`max_attempts`, mặc định 3 lần) và thời gian chờ Cooldown (`cooldown_hours`, mặc định 8 giờ).
    * *Kích hoạt Cooldown:* Học viên làm trượt cả `max_attempts` lần liên tiếp (`failed_attempts_count >= max_attempts`), hệ thống kích hoạt Cooldown thời gian chờ (mặc định 8 tiếng) trước khi cho phép làm lại.
    * *Nguyên tắc Điểm cao nhất (Highest Score Wins):* Điểm chính thức luôn ghi nhận kết quả cao nhất giữa các lần thi. Ngay khi học viên đạt điểm Pass (>= 80%) hoặc hết thời gian Cooldown, bộ đếm trượt reset và khôi phục lại đủ lượt thi.
  * *Giao diện 2 bước (Overview & Full-Focus Mode):* Khi bấm chọn bài Quiz, hệ thống hiển thị trang Tổng quan bài thi (Thời gian, điểm đạt, số câu hỏi, kết quả cao nhất đã làm) trước khi bấm "Bắt đầu làm bài" để vào Chế độ Làm bài Tập trung.
* **BR_QUIZ_002 (Quy tắc Ngân hàng Câu hỏi, Ma trận Đề thi & Xáo trộn Đáp án):**
  * Đề thi Graded Quiz được sinh tự động thông qua Ma trận đề thi (`QuizMatrix`) liên kết với Kho ngân hàng câu hỏi (`QuestionBank`).
  * *Cấu hình Ma trận:* Giảng viên/Admin thiết lập số lượng câu hỏi rút ngẫu nhiên theo từng bậc độ khó (`easy_count`, `medium_count`, `hard_count`), thời gian làm bài (`time_limit_minutes`), ngưỡng điểm đạt tùy chỉnh (`passing_threshold_percent`), và chế độ xáo trộn tùy chọn đáp án (`shuffle_options`).
  * *Xáo trộn Đáp án (Options Shuffling):* Mỗi phiên thi (`session_seed`), hệ thống tái cấu trúc và xáo trộn ngẫu nhiên thứ tự hiển thị các lựa chọn đáp án để chống học thuộc vị trí.
  * *Bảo vệ Kho rỗng (ZeroDivisionError Protection):* Nếu ngân hàng câu hỏi chưa được thêm câu hỏi (tổng số câu hỏi rút ra = 0), hệ thống tự động ghi nhận điểm 0.0%, `passed = False`, và trả về thông báo giải thích cụ thể cho học viên thay vì làm crash phiên thi.
  * *Phân quyền quản lý:* Chỉ tài khoản Giảng viên (Instructor), Trợ giảng (TA) hoặc Quản trị viên (Admin) mới có quyền tạo/sửa/xóa Ngân hàng câu hỏi và Ma trận đề thi.
* **BR_QUIZ_003 (Quy tắc Quản lý Session Đếm ngược & Auto-submit):**
  * Mọi bài thi Graded Quiz có giới hạn thời gian (Timed Quiz) được quản lý thời gian đếm ngược trực tiếp từ phía Server (Server-side Session Timer) tính từ mốc bấm nút "Bắt đầu làm bài" (`StartGradedQuizSession`). Khi học viên chỉ mới mở màn hình Tổng quan (`GetQuizOverview`), hệ thống tuyệt đối không tự khởi tạo phiên thi hay chạy đồng hồ đếm ngược.
  * Việc tải lại trang (F5) hoặc tạm đóng trình duyệt không làm dừng đồng hồ đếm ngược và không tạo lại đề mới. Khi hết giờ đếm ngược (`expires_at`), hệ thống tự động đóng phiên và thực hiện chấm điểm (Auto-submit on timeout) dựa trên các câu trả lời nháp đã lưu (`draft_answers_json`). Nếu phiên hết hạn mà học viên chưa trả lời câu nào (`answered_count == 0`), hệ thống tự động hủy phiên nháp rỗng mà không trừ lượt làm bài.
* **BR_QUIZ_005 (Lưu nháp Bài Quiz 2 Tầng Chống Mất bài & Khôi phục Phiên - Two-Tier Quiz Draft Auto-Save & Session Recovery):**
  * **Kiến trúc Lưu nháp 2 Tầng (`localStorage` + PostgreSQL `quiz_active_sessions`):**
    * *Tầng 1 (Instant Local Buffer):* Mỗi khi học viên chọn/bỏ chọn đáp án, Frontend ghi đồng bộ tức thì (0ms) vào `localStorage` theo khóa cô lập `lms_quiz_draft:${userId}:${itemId}` kèm `sessionId`, `answers`, `version`, `updatedAtMs`, `expiresAtIso`.
    * *Tầng 2 (Server Source of Truth):* Tự động đồng bộ lên bảng `quiz_active_sessions` qua RPC `SaveQuizDraft` với cơ chế debounce `1000ms`, tự động thử lại khi có mạng (`online`), flush ngay khi bấm **"Lưu nháp & Tạm thoát"**, và gửi qua `fetch(..., { keepalive: true })` khi ẩn tab (`visibilitychange === "hidden"`), đóng trang (`pagehide`) hoặc chuyển bài học.
  * **Kiểm soát Phiên bản Nguyên tử & Chống Ghi đè Đa Tab (Optimistic Version & Session Binding):**
    * Mỗi phiên làm bài có mã định danh `session_id` duy nhất và số thứ tự `draft_version` tăng đơn điệu. Câu lệnh SQL `UPDATE quiz_active_sessions` kiểm tra nguyên tử `session_id = :sid AND draft_version <= :ver`, ngăn chặn hoàn toàn các gói tin mạng đến trễ (out-of-order) hoặc tab cũ ghi đè bản nháp mới hơn.
    * Khi nộp bài (`SubmitGradedQuiz`), hệ thống bắt buộc đối chiếu `session_id` khớp với phiên đang mở, chấm điểm trực tiếp trên snapshot câu hỏi bất biến `questions_json` của phiên đó (không sinh lại từ ngân hàng câu hỏi), và xóa sạch bản ghi `quiz_active_sessions` cùng bộ nhớ đệm `localStorage` ngay sau khi lưu kết quả.
  * **Ràng buộc Bảo mật Chế độ Xem trước (Preview Mode Staff Guard):**
    * Cờ `preview = True` trong `GetQuizOverview`, `StartGradedQuizSession` và `SubmitGradedQuiz` chỉ được phép thực thi khi người gọi thuộc nhóm Staff (`is_staff == True`); học viên thường gửi `preview = True` sẽ bị chặn với lỗi `PermissionError` (`PERMISSION_DENIED`). Chế độ Preview hoạt động hoàn toàn stateless, không đọc/ghi bảng `quiz_active_sessions`.

* **BR_QUIZ_004 (Lịch sử Bài làm Chi tiết, Snapshot Câu hỏi, Che Đáp án Động & Chẩn đoán Lỗ hổng Kiến thức - Detailed Attempt History, Immutability Snapshot, Adaptive Answer Masking & Topic Mastery Diagnostics):**
  * **Snapshot Bài làm Bất biến (Immutability Snapshotting):** Mỗi lần nộp bài Quiz, hệ thống lưu vết chi tiết từng câu hỏi vào bảng `quiz_submission_answers` bao gồm: `question_id`, `question_text`, `question_type`, `topic`, `options_json` (snapshot đầy đủ các phương án sau khi xáo trộn), `selected_option_indices` (phương án học viên chọn), `is_correct`, `explanation` và `order_index`. Lịch sử bài làm hoàn toàn độc lập và không bị thay đổi kể cả khi ngân hàng câu hỏi bị cập nhật sau này.
  * **Chính sách Che Đáp án Động (Adaptive Answer Masking - Academic Integrity):**
    * *Practice Quiz:* Học viên luôn được mở khóa 100% đáp án đúng và lời giải chi tiết ngay sau khi nộp để củng cố kiến thức.
    * *Graded Quiz:* Để ngăn chặn tuyệt đối tình trạng "hy sinh lượt làm bài đầu tiên để lấy toàn bộ đáp án rồi thi lại đạt 100%", hệ thống áp dụng cơ chế Masking:
      * Chừng nào học viên **chưa đạt điểm Pass (`has_passed == False`)**, thì toàn bộ đáp án đúng (`correct_option_indices`) và lời giải chi tiết (`explanation`) **BẮT BUỘC PHẢI BỊ ẨN** đối với học viên (`is_answer_masked = True`), kể cả khi đang trong thời gian Cooldown hoặc đã hết lượt của đợt thi hiện tại. Học viên chỉ được xem câu nào đúng/sai và chẩn đoán năng lực theo chủ đề để định hướng ôn tập.
      * Hệ thống **chỉ mở khóa đầy đủ đáp án và lời giải** khi: (1) Học viên ĐÃ ĐẠT bài thi (`has_passed == True`) HOẶC (2) Người xem là Giảng viên / Trợ giảng / Quản trị viên (`is_staff == True`).
  * **Chẩn đoán Lỗ hổng Kiến thức (Knowledge Gap & Topic Mastery Diagnostics):**
    * Mỗi câu hỏi được gán một chủ đề kiến thức (`topic`, mặc định "Tổng quan").
    * Hệ thống tự động tính tỷ lệ nắm vững (`mastery_percent`) theo từng chủ đề dựa trên công thức $Score_{topic} = \frac{\text{Correct}}{\text{Total}} \times 100\%$.
    * Phân loại 3 cấp độ:
      * $\ge 80.0\%$: `TOPIC_MASTERY_LEVEL_MASTERED` (Đã vững kiến thức - xanh lá).
      * $50.0\% \le \text{Score} < 80.0\%$: `TOPIC_MASTERY_LEVEL_NEEDS_PRACTICE` (Cần củng cố thêm - vàng cam).
      * $< 50.0\%$: `TOPIC_MASTERY_LEVEL_WEAK_GAP` (Lỗ hổng trọng tâm - đỏ).
  * **Trải nghiệm Single-Container Master-Detail Drawer/Dialog:** Cung cấp giao diện tra cứu lịch sử và xem chi tiết bài nộp trong một Dialog hợp nhất, kèm bộ lọc "Chỉ câu sai" và "Lọc theo chủ đề", hỗ trợ rèn luyện thích ứng (Adaptive Learning).
* **BR_AUTOGRADE_001 (Quy định Sandbox Auto-Grader & Bảo mật Test Case Ẩn):**
  * **Môi trường Thực thi Cách ly (Sandbox Execution):** Mỗi bài nộp lập trình gửi tới Auto-Grader chạy trong môi trường Sandbox cách ly với Timeout mặc định 5.0 giây (tối đa 30.0 giây) và Memory Limit = 512MB.
  * **Ràng buộc Tạo bài Lab (Lab Creation Validation):** Mỗi bài Auto-Graded Lab bắt buộc có **tối thiểu 3 Test Cases** mới được phép lưu. Trình Course Builder hỗ trợ giao diện tạo/sửa/xóa Test Cases trực quan (Visual Test Case Builder) kết hợp soạn thảo Mô tả đề bài dạng Markdown (hỗ trợ Live Preview 2 cột).
  * **Quy tắc Tự động Ẩn (Auto-Hidden Test Cases Assignment):** Trường hợp Giảng viên không gắn cờ `is_hidden` thủ công cho bất kỳ Test Case nào, hệ thống tự động ẩn khoảng 1/3 số Test Cases cuối (tính từ chỉ số $\lceil N \times 2 / 3 \rceil$) khi bấm lưu để bảo đảm độ chính xác khi chấm bài.
  * **Bảo mật Test Case Ẩn (Hidden Test Privacy & Log Masking):** Học viên xem được dữ liệu Input/Expected của các Test Cases công khai (`Visible`). Đối với các Test Cases ẩn (`Hidden`), thông tin Input, Expected Output và câu lệnh `assertion` bị **mask bảo mật hoàn toàn** trong Execution Logs (chỉ hiển thị trạng thái `[PASS]` hoặc `[FAIL] Test Case #X: [Hidden]`).
  * **Tính điểm:** Điểm bài nộp = (Số lượng Test Cases Pass / Tổng số Test Cases) * 100%.
* **BR_PEER_001 (Bài tập Tự luận - Hai chế độ Chấm & Điều kiện Nộp bài):**
  * Học phần loại `ITEM_TYPE_PEER_REVIEW` mang danh xưng hiển thị tiếng Việt chuẩn là **"Bài tập tự luận"**. Học viên nộp bài làm linh hoạt qua đường dẫn liên kết sản phẩm (`http://` hoặc `https://` đầy đủ, từ chối URL tương đối `/` hoặc giao thức không an toàn) kết hợp bài luận hoặc bản tóm tắt giải pháp văn bản (tối thiểu 10 ký tự nếu không đính kèm liên kết).
  * Giảng viên cấu hình trên từng bài một trong hai chế độ chấm (`essay_grading_mode`):
    1. `PEER_REVIEW` (*Chấm chéo bạn học (Đánh giá đồng cấp) - Mặc định*): Học viên **bắt buộc phải thuộc khóa học đã xuất bản (`PUBLISHED`), đã ghi danh (`check_enrollment`), có quyền truy cập Paid Mode hợp lệ (`BR_ACCESS_001`) và phải nộp bài cá nhân trước** mới được truy cập trạng thái bài tập (`GetMyPeerSubmissionStatus`), phân bổ bài bạn học (`GetPeerReviewsToGrade`), chấm chéo (`SubmitPeerReviewGrade`) và khiếu nại (`SubmitGradeAppeal`). Học viên phải hoàn thành nghĩa vụ chấm `required_peer_reviews` bài bạn học (hoặc ngưỡng động sau `cold_start_hours`) mới được tính hoàn thành học phần.
    2. `INSTRUCTOR_ONLY` (*Chỉ Giảng viên / Trợ giảng chấm trực tiếp*): Không áp dụng chấm chéo (`review_duty_status = NOT_APPLICABLE`); mọi yêu cầu `SubmitPeerReviewGrade` đối với bài `INSTRUCTOR_ONLY` bị từ chối tuyệt đối (`PERMISSION_DENIED`), bài nộp đi thẳng vào hàng chờ Giảng viên chấm ngay khi nộp, học viên hoàn tất học phần ngay khi Giảng viên công bố điểm.
* **BR_PEER_002 (Bộ Tiêu chí Rubric Động & Nguyên tắc TA Regrade Override):**
  * Thang điểm đánh giá chéo tuân thủ Bộ Tiêu chí Rubric do Giảng viên thiết lập linh hoạt cho từng bài học trong Course Builder (hỗ trợ đa ngành: Bài luận, Báo cáo, Đồ án Thiết kế Figma/UI-UX, Đề án Kinh doanh hoặc Đồ án Lập trình). Mỗi tiêu chí gồm: `title` (Tên tiêu chí), `max_score` (Thang điểm tối đa), và `description` (Chỉ dẫn hướng dẫn chấm cụ thể).
  * Trường hợp học liệu chưa cấu hình Rubric tùy biến, hệ thống áp dụng Bộ Tiêu chí tiêu chuẩn gồm 3 khía cạnh: (1) Chất lượng nội dung & Giải pháp (max 10đ), (2) Bố cục, Trình bày & Minh chứng (max 10đ), (3) Tính ứng dụng & Đóng góp (max 10đ).
  * Điểm số bài nộp = $\frac{\sum \text{Score Given}}{\sum \text{Max Score}} \times 100\%$. Khi chấm điểm bạn học (`SubmitPeerReviewGrade`), người chấm bắt buộc phải nhập nhận xét chi tiết (tổng nội dung nhận xét tối thiểu 10 ký tự sau khi loại bỏ khoảng trắng).
  * *Cảnh báo chấm điểm bất thường (Outlier Detection):* Khi có lượt chấm chéo mới cho bài nộp chưa chốt điểm, hệ thống đối chiếu toàn bộ các lượt chấm hiện có của lần nộp đó:
    * Khi mới có **2 lượt** chấm và khoảng chênh lệch $|Score_1 - Score_2| > 30.0\%$: tạm thời đánh dấu bất thường cho cả 2 lượt để chờ lượt thứ 3 phân giải (hoặc để TA rà soát nếu cấu hình `required_peer_reviews = 2`).
    * Khi có từ **3 lượt chấm trở lên** (`MIN_PEER_REVIEWS_FOR_OUTLIER_CONSENSUS = 3`): hệ thống tính **trung vị (`Median`)** của tập điểm và đánh giá lại toàn bộ các lượt chấm theo công thức $|Score_i - Median(Scores)| > 30.0\%$, chỉ gắn cờ `is_outlier = True` lên những lượt chấm thực sự lệch khỏi đồng thuận (và tự động gỡ cờ cho các lượt nằm trong vùng đồng thuận) rồi gửi cảnh báo về bảng tin Trợ giảng (TA).
* **BR_PEER_003 (Khiếu nại điểm & Thẩm quyền TA Regrade Override):**
  * Học viên có quyền nộp đơn Khiếu nại/Phúc khảo điểm (`SubmitGradeAppeal`) với lý do chi tiết. Hệ thống khởi tạo đơn ở trạng thái `"PENDING"`.
  * Giảng viên/Trợ giảng (TA) trực tiếp rà soát và chấm lại bài làm. Khi nhân sự chấm bài (`graded_by_staff = True`), điểm số mới trở thành điểm chính thức (`INSTRUCTOR` hoặc `TA`), ghi đè kết quả chấm chéo của bạn học (các bản ghi `PeerReview` cũ vẫn được lưu phục vụ audit, phản hồi hiển thị cho học viên được ẩn danh 100% dưới dạng `Bạn học #1`, `#2`...).
* **BR_PEER_004 (Xử lý Hàng chờ Staff Regrade Queue & Chấm chéo muộn):**
  * Với chế độ `PEER_REVIEW`, nếu sau `cold_start_hours` (24h / 48h / 72h, mặc định **48 giờ**) kể từ khi nộp bài mà bài dự án chưa nhận đủ `required_peer_reviews` lượt chấm chéo, hệ thống tự động gắn cờ quá hạn và đẩy lên hàng đầu trong Hàng chờ xét duyệt của Giảng viên/TA (`GetInstructorActionTasks` & `GradingCockpit`).
  * Hệ thống không khóa quyền chấm chéo muộn của học viên khác. Khi bài nộp nhận đủ `required_peer_reviews` lượt chấm chéo lần đầu và chưa được nhân sự chấm (`graded_by_staff = False`, chưa `PUBLISHED`), hệ thống tự động tính điểm trung bình, công bố `PUBLISHED` và giải phóng bài nộp khỏi hàng chờ. Từ lượt chấm chéo thứ 4 trở đi (hoặc khi bài đã `PUBLISHED` / `graded_by_staff = True`), hệ thống chỉ ghi nhận phản hồi và tính chỉ tiêu cho người đi chấm, **không** tính lại hay làm thay đổi điểm số/mốc công bố đã chốt, và chỉ gửi thông báo có đánh giá đồng cấp mới cho chủ bài (`PeerReviewSubmittedDomainEvent`).
* **BR_PEER_005 (Báo cáo Bài chấm chéo bất thường & Chống lạm dụng Report):**
  * Học viên có quyền bấm nút **"Report Review"** (`ReportPeerReview`) đối với một lượt chấm chéo cụ thể (`peer_reviews.id`) thuộc lần nộp hiện tại có dấu hiệu spam, vụ lợi hoặc cố tình cho điểm thấp không khách quan. Hệ thống lưu bản ghi độc lập tại bảng `peer_review_reports` (tách biệt hoàn toàn với đơn khiếu nại điểm `grade_appeals` để hỗ trợ đồng thời vừa khiếu nại vừa báo cáo từng review bất thường).
  * *Chống lạm dụng nộp đơn để nhận bằng:* Bài chấm chéo bị báo cáo sẽ chuyển sang trạng thái `PENDING_STAFF_REVIEW` và gửi về Hàng chờ kiểm tra của Trợ giảng (TA Review Queue). Điểm bài nộp sẽ ở trạng thái **tạm hoãn công nhận Pass & tạm dừng phát hành chứng chỉ** cho tới khi Trợ giảng (TA) hoặc Giảng viên rà soát và chấm chốt xong để ngăn chặn hành vi cố tình gạch điểm thấp nhằm pass môn gian lận.
* **BR_PEER_006 (Phân bổ Công bằng Least-Reviewed First, Soft-Lock & Ngưỡng động Cold Start):**
  * Truy vấn phân bổ `GetPeerReviewsToGrade` chỉ thực hiện lười (lazy-load) khi học viên mở tab chấm bài: kiểm tra khóa học `PUBLISHED`, ghi danh, Paid Mode, đúng loại học liệu `PEER_REVIEW`, lọc bỏ bài của chính mình, bài đã chấm bởi học viên đó, bài đang bị người khác khóa hợp lệ (`lock_expires_at > now`) và khóa chọn nguyên tử (`FOR UPDATE SKIP LOCKED`) theo thứ tự ưu tiên **Chưa có điểm -> Số lượt chấm -> Đã có điểm**: (1) bài đang giữ khóa hợp lệ của chính mình, (2) bài chưa công bố điểm (`status != PUBLISHED` và `graded_by_staff = False`), (3) bài đã công bố điểm do bạn học (`status = PUBLISHED` và `graded_by_staff = False`), (4) bài đã được Giảng viên/TA chấm (`graded_by_staff = True`, giữ lại làm nguồn dự phòng cuối để học viên vào sau không bị kẹt `WAITING_POOL`), và trong cùng nhóm ưu tiên `reviews_count ASC, created_at ASC`. Khi học viên chấm bài đã có điểm (`PUBLISHED` hoặc `graded_by_staff = True`), hệ thống vẫn ghi nhận nhận xét và cộng chỉ tiêu chấm cho người đi chấm nhưng **không làm thay đổi điểm trên sổ điểm**. Mỗi bài khi cấp phát mới khóa mềm 30 phút (`GRADING_LOCK_TIMEOUT_MINUTES = 30`) được cấp một mã phân bổ mờ ngẫu nhiên (`PeerReviewAssignment` dạng `rev-{uuid7}`, không suy đoán được từ `submission_id`). Gọi lại `GetPeerReviewsToGrade` trong thời gian khóa còn hiệu lực chỉ trả về phiên đang giữ nguyên hạn gốc, **tuyệt đối không tự gia hạn khóa 30 phút**. Khi toàn bộ bài khả dụng trong kho đang bị người khác khóa tạm (`available_pool > 0` nhưng không lấy được bài rảnh), hệ thống giữ nguyên `review_duty_status = PENDING` (chỉ chuyển `WAITING_POOL` khi `available_pool == 0`). Khi nộp điểm qua `SubmitPeerReviewGrade`, hệ thống xác thực đồng thời mã phân bổ hợp lệ thuộc về người chấm, khóa mềm còn hiệu lực và thực thi toàn bộ thao tác lưu điểm/nhả khóa trong một DB transaction nguyên tử duy nhất.
  * Đối với lớp học ít người (Cold Start), **ngưỡng động chỉ được phép kích hoạt sau khi đã qua thời gian chờ `cold_start_hours` (mặc định 48 giờ kể từ khi nộp bài)**: $\text{Target} = \min(\text{required\_peer\_reviews}, \text{completed} + \text{available})$. Trước mốc `cold_start_hours`, nếu tạm hết bài trong kho (`available == 0`) mà chưa chấm đủ `required_peer_reviews`, học viên chỉ chuyển sang `WAITING_POOL` (không được chốt sớm `COMPLETED`).
  * Sau thời gian `cold_start_hours` mà không đủ reviewers, bài nộp được đưa vào hàng chờ của Giảng viên/TA để chấm hỗ trợ.
* **BR_PEER_007 (Ràng buộc Khiếu nại Điểm Bài tập Tự luận - Grade Appeal Constraints):**
  * Học viên chỉ được quyền nộp đơn Khiếu nại/Phúc khảo điểm (`SubmitGradeAppeal`) **sau khi bài nộp đã được công bố điểm chính thức (`status = PUBLISHED` và `final_score IS NOT NULL`)** và trong vòng **7 ngày** kể từ thời điểm `published_at` (`MAX_APPEAL_WINDOW_DAYS = 7`). Tuyệt đối từ chối khiếu nại đối với bài mới nộp (`SUBMITTED`) chưa có điểm.
  * Mỗi bài nộp chỉ được khiếu nại **tối đa 01 lần duy nhất** (`MAX_APPEALS_PER_SUBMISSION = 1`). Khi đơn khiếu nại đã được xử lý, học viên không thể tiếp tục gửi khiếu nại cho bài nộp đó.
* **BR_PEER_008 (Chính sách Nộp lại Bài & Nguyên tắc Điểm Cao Nhất - Resubmission Policy & Highest Score Wins):**
  * Học viên được phép nộp lại bài tập tự luận tối đa theo cấu hình `essay_max_attempts` của học liệu (mặc định **3 lần** - `MAX_PEER_SUBMISSION_ATTEMPTS = 3`, giảng viên có thể tùy biến từ 1 đến 10 lượt khi tạo/sửa học liệu) để cải thiện kết quả hoặc khắc phục bài chưa đạt, với nội dung bài nộp không được để trống.
  * **Điều kiện chặn nộp lại:** Hệ thống từ chối thao tác nộp lại nếu: (1) Đã đạt giới hạn số lần nộp cho phép (`attempt_number >= essay_max_attempts`), (2) Bài nộp đang có khóa mềm chấm bài còn hiệu lực (`is_lock_active == True`, bất kể nhân sự hay bạn học đang giữ khóa — tuyệt đối không tự ý xóa khóa của người chấm), hoặc (3) Bài nộp đang có đơn khiếu nại hoặc báo cáo chờ thẩm định (`PENDING` / `PENDING_STAFF_REVIEW`).
  * **Xử lý trạng thái & Bảo toàn Điểm Cao Nhất (Highest Score Wins):** Khi nộp lại hợp lệ, nếu lần nộp trước đã được công bố chính thức (`PUBLISHED`), hệ thống tự động lưu vết điểm cao nhất vào `previous_best_score` (cùng `previous_best_grade_source`, `previous_best_published_at`), sau đó reset sạch trạng thái chấm của lượt hiện tại (`status = "SUBMITTED"`, `final_score = None`, `graded_by_staff = False`, `published_at = None`, `staff_feedback = None`, `rubric_scores_json = {}`). Các lượt chấm chéo (`PeerReview`) và phiên phân bổ (`PeerReviewAssignment`) được gắn `submission_attempt_number` để cô lập hoàn toàn giữa các lần nộp.
  * **Bảo toàn Nghĩa vụ Chấm chéo:** Nếu học viên đã hoàn tất hoặc được miễn nghĩa vụ chấm chéo ở lần nộp trước (`COMPLETED` hoặc `WAIVED_EMPTY_POOL`), trạng thái nghĩa vụ được giữ nguyên khi nộp lại.
  * **Tính điểm Sổ điểm & Chứng chỉ:** Sổ điểm (Gradebook), điều kiện hoàn thành học phần và Chứng chỉ luôn sử dụng điểm công bố cao nhất giữa các lần đã `PUBLISHED` (`max(previous_best_score, final_score_if_published)`), đảm bảo lần nộp mới chưa chấm (`SUBMITTED`) không hiển thị điểm ảo của bài mới nhưng vẫn bảo toàn thành tích đã công bố trước đó.
* **BR_PEER_009 (Quy định Hạn chấm chéo Review Window):**
  * Hệ thống áp dụng mốc **Hạn chấm chéo (Review Window)** gia hạn thêm **3 ngày** tính từ mốc Hạn nộp bài (Submission Deadline).
* **BR_PEER_010 (Cơ chế Giải thoát Kép, Ẩn điểm Chống Lười biếng - Dual-Release & Score Gate Policy):**
  * Trạng thái bài làm hiển thị cho học viên được truy xuất hoàn toàn từ Server qua RPC `GetMyPeerSubmissionStatus` (cấm lưu trạng thái nộp/điểm tạm bằng `localStorage`).
  * Ở chế độ `PEER_REVIEW`, khi bài của học viên A đã có điểm công bố (`is_graded = True`) từ Giảng viên hoặc đủ bạn học chấm:
    1. *Trường hợp 1 (Chưa hoàn thành nghĩa vụ chấm bạn học - `PENDING` / `WAITING_POOL`):* Hệ thống **chỉ hiển thị trạng thái `"Đã có điểm"`** (`is_graded = True`), đồng thời **ẩn hoàn toàn** ở tầng Backend lẫn Frontend các thông tin gồm: điểm số (`final_score`, `best_published_score`), nguồn chấm (`grade_source`), nhận xét Giảng viên (`staff_feedback`), bảng phản hồi chi tiết của bạn học (`peer_feedbacks`), và quyền gửi phúc khảo (`can_appeal = False`). Hệ thống **chưa phát `PeerAssignmentGradedDomainEvent`** và chưa công nhận hoàn thành học phần cho tới khi A hoàn tất nghĩa vụ chấm bạn học. Thông báo khi có bạn học chấm (`PeerReviewSubmittedDomainEvent`) cũng không tiết lộ điểm số.
    2. *Trường hợp 2 (Đã chấm đủ số bài yêu cầu hoặc Kho rỗng sau `cold_start_hours`):* Khi học viên A chấm $\ge \text{required\_peer\_reviews}$ bài (`COMPLETED`), **hoặc** đã quá thời hạn `cold_start_hours` (mặc định 48h từ lúc nộp) mà đạt ngưỡng động $\min(\text{required\_peer\_reviews}, \text{completed} + \text{available})$ hoặc `available_pool == 0` (`WAIVED_EMPTY_POOL`), hệ thống mở khóa hiển thị đầy đủ điểm số/nhận xét/quyền phúc khảo và phát `PeerAssignmentGradedDomainEvent` để ghi nhận hoàn thành học phần và cấp chứng chỉ. Nếu Giảng viên chấm hỗ trợ sớm trước 48h khi kho đang rỗng, học viên vẫn chỉ thấy trạng thái *"Đã có điểm"* với `review_duty_status = WAITING_POOL` cho tới khi hết 48h hoặc chấm đủ lượt khi có bạn học mới nộp bài.
    3. *Chống lách qua RPC `MarkItemComplete`:* Endpoint `LearningService/MarkItemComplete` từ chối mọi yêu cầu tự đánh dấu hoàn thành trực tiếp đối với bài tập tự luận (`PEER_REVIEW`), đồng thời xác thực ở phía máy chủ rằng các bài tập tính điểm khác (`GRADED_QUIZ`, `AUTO_GRADED_LAB`) đã đạt ngưỡng điểm đậu trước khi ghi nhận tiến độ.
* **BR_GRADE_001 (Trọng số Điểm Tổng kết Khóa học - Course Final Grade Weighting & Passing Calculation):**
  * Điểm tổng kết khóa học được tính toán tự động dựa trên tổng điểm có trọng số của toàn bộ các bài tập tính điểm (`Graded Items`):
    $$\text{Final Grade} = \sum_{i=1}^{N} \left( w_i \times \text{Score}_i \right) \quad \text{với} \quad \sum_{i=1}^{N} w_i = 100\%$$
  * *Ràng buộc trọng số:* Tổng trọng số của tất cả các cột điểm bắt buộc phải bằng đúng 100% ($1.0$). Giảng viên có quyền cấu hình tỷ trọng cho từng bài Graded Item trong Course Builder; nếu chưa thiết lập tùy biến, hệ thống tự động phân bổ trọng số đồng đều cho các bài.
  * *Điều kiện hoàn thành khóa học:* Học viên được công nhận hoàn thành khóa học và đủ điều kiện cấp chứng chỉ khi: (1) Điểm tổng kết $\text{Final Grade} \ge 80.0\%$ (hoặc ngưỡng `passing_threshold_percent` do khóa học quy định), và (2) 100% các Graded Items bắt buộc phải được nộp và có điểm công bố (không bỏ trống bất kỳ bài tính điểm nào).
* **BR_GRADE_002 (Minh bạch Nhãn Nguồn gốc Người chấm - Grading Provenance Transparency & Audit Trail):**
  * Mọi con điểm trong hệ thống (hiển thị trên Sổ điểm Gradebook và giao diện Học viên) bắt buộc phải mang nhãn nguồn gốc xuất xứ rõ ràng (`Grading Provenance Label`):
    1. `AUTO`: Hệ thống tự động chấm (Graded Quiz, Sandbox Auto-grader).
    2. `PEER`: Điểm trung bình cộng đồng thuận từ bạn học qua rubric chấm chéo.
    3. `TA`: Trợ giảng chấm trực tiếp hoặc hỗ trợ chấm (Cold start, Outlier queue, Appeal).
    4. `INSTRUCTOR`: Giảng viên phụ trách chấm hoặc ghi đè tối cao (Master Override).
  * *Thẩm quyền ghi đè phân cấp:* Điểm số tuân theo thứ bậc thẩm quyền $\text{AUTO} \le \text{PEER} < \text{TA} < \text{INSTRUCTOR}$. Điểm của cấp cao hơn được phép ghi đè điểm của cấp thấp hơn.
  * *Nhật ký Audit Log bất biến:* Khi điểm số bị ghi đè bởi cấp thẩm quyền cao hơn, hệ thống ghi vết vào bảng audit log với đầy đủ thông tin: điểm cũ, điểm mới, người chấm (`actor_user_id`), vai trò (`actor_role`), lý do can thiệp và timestamp để đảm bảo tính minh bạch học thuật.
* **BR_GRADE_003 (Cơ chế Khóa mềm Chống chấm trùng & Tự động nhả khóa - Atomic Soft Lock 30 mins & Automatic Expiry):**
  * *Khóa độc quyền có thời hạn (Task Lease):* Khi một Trợ giảng hoặc Giảng viên mở bài nộp trong hàng chờ để chấm, hệ thống thực thi câu lệnh SQL nguyên tử cấp quyền khóa mềm trong **30 phút** (`TASK_LEASE_TIMEOUT_MINUTES = 30`):
    `UPDATE peer_assignment_submissions SET locked_by_user_id = :user_id, lock_expires_at = :expires_at WHERE id = :id AND (locked_by_user_id IS NULL OR lock_expires_at < :now OR locked_by_user_id = :user_id)`
  * *Chống xung đột chấm trùng:* Khi bài nộp đang có khóa hiệu lực (`lock_expires_at > now()`), hệ thống chặn các nhân sự khác mở bài để chấm, hiển thị trạng thái `BEING_GRADED` kèm tên người đang chấm và thời gian đếm ngược.
  * *Gia hạn khóa (Lease Renewal):* Cho phép gửi heartbeat ngầm gia hạn khi người chấm đang tích cực tương tác hoặc bấm nút *"Gia hạn thêm 15 phút"*.
  * *Tự động nhả khóa khi hết hạn:* Nếu phiên làm việc bị bỏ dở hoặc quá 30 phút không hoàn tất (`now() >= lock_expires_at`), hệ thống tự động giải phóng khóa, trả bài nộp về hàng chờ công khai.
  * *Nhả khóa chủ động:* Khi người chấm bấm *"Hủy & Nhả bài"* hoặc điều hướng quay lại, khóa được gỡ bỏ ngay lập tức (`locked_by_user_id = NULL`, `lock_expires_at = NULL`).
* **BR_GRADE_004 (Quy định Chấm & Công bố Điểm Tức Thì - Immediate Publishing on Staff Grading):**
  * *Chấm & Công bố Trực tiếp (Direct Final Grading):* Khi Trợ giảng (`TA`) hoặc Giảng viên (`INSTRUCTOR`) hoàn tất biểu mẫu chấm điểm tại Cockpit và bấm *"Hoàn tất chấm bài"*, điểm số lập tức có giá trị chính thức (`published_at = now()`) và không qua bước phê duyệt trung gian, giúp giải phóng hoàn toàn thời gian cho Giảng viên chính.
  * *Tự động kích hoạt chuỗi sự kiện:* Ngay khi điểm được công bố: (1) Bắn sự kiện `PeerAssignmentGradedDomainEvent` lên `EventBus`, (2) Tự động tính toán lại Điểm tổng kết và Phần trăm tiến độ hoàn thành môn (`overall_progress_percent`), (3) Nếu học viên đạt 100% tiến độ, tự động kích hoạt cấp Chứng chỉ số hóa OpenBadges 2.0, và (4) Gửi thông báo in-app `ACADEMIC` cho học viên.
  * *Giải phóng khóa mềm:* Ngay khi điểm được lưu và công bố thành công, khóa mềm (`locked_by_user_id`) tự động được giải phóng để dọn sạch trạng thái hàng chờ.

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
* **BR_CATALOG_004 (Bảo vệ Khóa học Đã xuất bản & Ràng buộc Cấm Xóa - Published Course Safeguards & Deletion Restrictions):**
  * **Ràng buộc Cấm Xóa đối với Giảng viên (Deletion Protection Guard):** Ngay khi khóa học ở trạng thái **`PUBLISHED` (Đã xuất bản)**, Giảng viên sở hữu (`owner_id`) và Giảng viên đồng hành (`co_instructor_ids`) **TUYỆT ĐỐI KHÔNG CÓ QUYỀN XÓA** khóa học, xóa tuần học (`WeekModule`), xóa bài học (`Lesson`) hoặc xóa học liệu (`LearningItem`).
  * **Lý do Bảo vệ Dữ liệu & Tiến độ Học tập:** Tránh làm gián đoạn hoặc hỏng tiến độ học tập, điểm số bài thi, lịch sử nộp bài và chứng chỉ đã cấp cho các học viên đang học hoặc đã hoàn thành khóa học.
  * **Phản hồi Hệ thống & Thông báo (FE & BE Notification Guard):**
    * Phía Frontend chủ động chặn thao tác xóa và hiển thị thông báo Toast cảnh báo: *"Không thể xóa [Khóa học / Tuần học / Bài học / Học liệu] vì khóa học đã được xuất bản (PUBLISHED). Vui lòng liên hệ Quản trị viên."*
    * Phía Backend kiểm tra đa tầng tại `CatalogUseCase._verify_ownership` và Repository DB Level. Mọi cố gắng xóa khóa học `PUBLISHED` từ phía Giảng viên đều bị từ chối và trả về ngoại lệ `PermissionError` / `ConnectError(Code.PERMISSION_DENIED)`.
  * **Quyền Chỉnh sửa Nối tiếp (Live Content Maintenance):** Giảng viên vẫn giữ quyền chỉnh sửa nội dung mô tả, cập nhật bài đọc (Reading), sửa lỗi phụ đề VTT, video bài giảng hoặc cập nhật ngân hàng câu hỏi/ma trận đề thi để cập nhật kiến thức mới mà không ảnh hưởng tới các học viên đã tốt nghiệp.
  * **Quy trình Gỡ/Hủy Xuất bản Khóa học (Unpublish / Archive Workflow):** Khi cần dừng nhận học viên mới hoặc gỡ khóa học khỏi danh mục công khai, Quản trị viên hệ thống (Super Admin) thực hiện chuyển trạng thái khóa học sang `UNPUBLISHED` hoặc `ARCHIVED`. Khóa học bị ẩn khỏi trang tìm kiếm công khai nhưng học viên cũ đã đăng ký vẫn giữ nguyên 100% quyền truy cập và chứng chỉ đã cấp.
* **BR_CATALOG_005 (Nguyên tắc Môn Nền tảng Khuyến nghị Đa Khóa & Thuật toán Xếp hạng 3 Bậc - Multi-Select Soft Prerequisite & 3-Tier Candidate Ranking Engine):**
  * **Chính sách Mở (Open Enrollment Policy):** Nền tảng tuân thủ triết lý học tập mở tương tự Coursera. Khóa học có môn tiên quyết/nền tảng chỉ đóng vai trò khuyến nghị mềm (Soft Advisory). Hệ thống tuyệt đối **KHÔNG KHÓA CỨNG (No Hard Lock)**; học viên luôn được phép ghi danh và học trực tiếp khóa học nâng cao bất kể đã hoàn thành các môn nền tảng hay chưa.
  * **Hỗ trợ Chọn Nhiều Môn Nền tảng (Multi-Select Architecture):**
    * Giảng viên có quyền cấu hình một hoặc nhiều môn nền tảng (`foundational_course_ids: ARRAY(String(64))`) trực tiếp trong Course Builder hoặc Modal chỉnh sửa khóa học (ví dụ: một môn Deep Learning nâng cao có thể yêu cầu cả *Toán rời rạc* và *Python cơ bản*).
    * Thứ tự các môn nền tảng do Giảng viên sắp đặt được bảo toàn nguyên vẹn khi lưu trữ và hiển thị cho học viên.
  * **Bộ máy Xếp hạng Ứng viên Lai (Hybrid Heuristic & pgvector Cosine Distance Ranking Engine):**
    Khi Giảng viên mở Modal chọn môn nền tảng, hệ thống tự động xếp hạng danh sách ứng viên từ cơ sở dữ liệu theo 3 cấp độ ưu tiên kết hợp heuristic và ngữ nghĩa (thực thi truy vấn tối ưu tại tầng SQL Database, áp dụng `apply_organization_scope` chuẩn Multi-Tenant Layer 2):
    * **Bậc 1 (Ưu tiên Cao nhất - Cùng Giảng viên):** Các khóa học do chính Giảng viên đang đăng nhập tạo ra (`owner_id == current_user_id`).
    * **Bậc 2 (Cùng Tổ chức / Đối tác):** Các khóa học thuộc cùng đơn vị đào tạo / đối tác với khóa học hiện tại (`partner_name == current_course.partner_name`).
    * **Bậc 3 (Khoảng cách Vector Cosine & Điểm Đánh giá):** Khóa học có khoảng cách Cosine Distance nhỏ nhất trên vector embedding 384 chiều (`all-MiniLM-L6-v2`), kết hợp điểm đánh giá trung bình (`average_rating DESC`) và số lượt đánh giá (`review_count DESC`).
  * **Cơ chế Phân trang Từng đợt 10 Khóa & Tìm kiếm Real-time (Scalable Pagination & Debounced Search):**
    * Hệ thống tải danh sách ứng viên theo từng đợt 10 khóa học (`page_size = 10`, `next_page_token`), ngăn chặn triệt để hiện tượng nghẽn mạng hay nghẽn bộ nhớ khi số lượng khóa học trên toàn hệ thống đạt hàng chục ngàn hay hàng triệu môn.
    * Tích hợp thanh tìm kiếm theo tên khóa học có độ trễ debounce (300ms), kết hợp lọc tức thời trên nền thuật toán xếp hạng 3 bậc.
  * **Mặc định là Mảng Rỗng & Trực quan hóa Giao diện Học viên (UI/UX Grid Presentation):**
    * **Mặc định là rỗng (`{}`):** Khóa học mới tạo không bị ép buộc môn nền tảng. Khi `foundational_course_ids` rỗng, trang chi tiết khóa học của học viên tự động ẩn hoàn toàn khu vực môn nền tảng.
    * **Hiển thị linh hoạt theo số lượng:** Nếu cấu hình đúng 1 môn, giao diện hiển thị dạng Thẻ Hero Callout nổi bật; nếu cấu hình từ 2 môn trở lên, hệ thống tự động render lưới thẻ đáp ứng chuẩn Design System đồng bộ (`grid grid-cols-1 md:grid-cols-2`).
  * **Ràng buộc Toàn vẹn Dữ liệu & Ngăn chặn Vòng lặp Tiên quyết:**
    * **Chống tự chọn (Self-selection):** Khóa học không thể tự chọn chính mình làm môn nền tảng ($A \leftrightarrow A$).
    * **Chống phụ thuộc vòng 2 chiều (Circular Dependency):** Nếu khóa học B đã chọn A làm môn nền tảng, hệ thống kiên quyết từ chối không cho phép A chọn B làm môn nền tảng ($A \leftrightarrow B$).
    * **Kiểm tra tồn tại thực tế:** Toàn bộ `foundational_course_ids` gửi lên khi tạo/cập nhật khóa học bắt buộc phải tồn tại trong cơ sở dữ liệu và thuộc phạm vi tổ chức cho phép (`apply_organization_scope`).
    * **Giới hạn số lượng:** Mỗi khóa học được cấu hình tối đa không quá 10 môn nền tảng (`MAX_FOUNDATIONAL_COURSES_COUNT = 10`). Chỉ các khóa học đã xuất bản (`status = PUBLISHED`) mới được gợi ý trong tập ứng viên.
* **BR_CATALOG_006 (Thuật toán Gợi ý Khóa học Đề xuất - Hybrid Vector Recommendation Engine):**
  * **Công thức Chấm điểm Lai (Hybrid Scoring Formula):**
    $$Score(A, B) = 0.55 \cdot S_{\text{vector}} + 0.30 \cdot I_{\text{author}} + 0.15 \cdot R_{\text{norm}}$$
    * $S_{\text{vector}}$ (55%): Điểm Cosine Similarity giữa 2 vector tri thức ngữ nghĩa của Khóa học A và Khóa học B.
    * $I_{\text{author}}$ (30%): Trọng số cùng Giảng viên (`owner_id`) hoặc cùng Tổ chức Đối tác (`partner_name`). Nhận giá trị $1.0$ nếu trùng khớp, ngược lại $= 0.0$.
    * $R_{\text{norm}}$ (15%): Điểm đánh giá trung bình chuẩn hóa $\frac{\text{Rating}}{5.0} \in [0, 1]$ (nếu khóa học chưa có lượt đánh giá nào, fallback nhận giá trị an toàn $0.8$ tương đương 4.0 sao).
  * **Ngưỡng Lọc Độ Tin cậy (Minimum Relevance Threshold):**
    * Hệ thống áp dụng ngưỡng chặn tin cậy tối thiểu `MIN_RECOMMENDATION_SCORE_THRESHOLD = 0.55` (hoặc cùng giảng viên `is_same_author == True`). Các khóa học có tổng điểm dưới ngưỡng sẽ bị loại bỏ hoàn toàn khỏi danh sách đề xuất để tránh hiện tượng rác dữ liệu (Recommender Noise).
    * Giao diện thẻ khóa học (`CourseCard`) hiển thị tinh gọn theo thiết kế chuẩn mực của Coursera, không hiển thị các huy hiệu nhãn quảng cáo gây rối mắt.
  * **Chi tiết Thành phần Dữ liệu cấu thành Vector Ngữ nghĩa (Trọng số 55% - $S_{\text{vector}}$):**
    Hệ thống trích xuất đầy đủ 7 trường dữ liệu ngữ nghĩa từ cơ sở dữ liệu để ghép thành chuỗi văn bản đại diện (Payload) trước khi vector hóa:
    1. **Tên khóa học (`course.title`):** Khái niệm và chủ đề đào tạo cốt lõi.
    2. **Đơn vị Đối tác bảo chứng (`course.partner_name`):** Trường đại học hoặc tổ chức đối tác đào tạo.
    3. **Lĩnh vực môn học (`course.subject`):** Bounded context chuyên môn (ví dụ: `BUSINESS_ECONOMICS`, `DATA_SCIENCE`, `AI_ML`...).
    4. **Cấp độ kiến thức (`course.level`):** Ngữ cảnh độ khó sư phạm (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`).
    5. **Mô tả chi tiết khóa học (`course.description`):** Tóm tắt mục tiêu, năng lực đầu ra và các chủ đề thảo luận.
    6. **Khung sườn Tuần học (`week.week_number`, `week.title`):** Cấu trúc phân kỳ học tập theo thời gian.
    7. **Tên toàn bộ Bài giảng trong đề cương (`lesson.title`):** Tập hợp danh sách tên tất cả các bài đọc, video, bài kiểm tra trong từng tuần học (nguồn tri thức sâu nhất thể hiện nội hàm khóa học).
    * *Khuôn mẫu Văn bản Ngữ nghĩa (Structured Text Template):*
      ```text
      Khóa học: {course.title}
      Đối tác: {course.partner_name}
      Lĩnh vực: {course.subject} | Cấp độ: {course.level}
      Mô tả: {course.description}
      Đề cương bài học chi tiết:
      - Tuần {week_1.week_number} ({week_1.title}): {lesson_1.title}, {lesson_2.title}...
      - Tuần {week_2.week_number} ({week_2.title}): {lesson_3.title}, {lesson_4.title}...
      ```
    * *Mô hình & Hạ tầng Tính toán AI:*
      * Sử dụng mô hình chuẩn **`sentence-transformers/all-MiniLM-L6-v2`** qua thư viện `fastembed` (chạy ONNX Runtime tối ưu CPU, độ trễ sinh vector < 20ms, không phụ thuộc GPU).
      * Vector đầu ra có số chiều cố định **384 chiều (dense vector 384-dimensions)**.
      * Lưu trữ tại bảng `course_embeddings` (`embedding vector(384)`) trên PostgreSQL với pgvector, đánh chỉ mục HNSW (`idx_course_embeddings_hnsw`, `vector_cosine_ops`) hỗ trợ tìm kiếm lân cận $O(\log N)$.
      * Điểm tương đồng Cosine chuẩn hóa trong khoảng $[0, 1]$:
        $$S_{\text{vector}} = \max\left(0.0, \min\left(1.0, \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}\right)\right)$$
      * *Nguyên tắc Tính toán Tách biệt $O(1)$:* Quá trình sinh vector chỉ diễn ra 1 lần duy nhất khi Khóa học được Xuất bản (`PUBLISHED`) hoặc khi chạy CLI nạp dữ liệu (`make seed`). Khi người dùng mở trang Chi tiết Khóa học, hệ thống chỉ thực hiện phép chiếu Cosine trên các vector đã pre-computed trong Database, tuyệt đối không tính toán lại embedding on-the-fly.
  * **Số lượng và Lưới hiển thị:** Mặc định cung cấp 6 khóa học (`DEFAULT_RECOMMENDED_COURSES_COUNT = 6`), loại bỏ chính khóa học hiện tại và môn nền tảng đã hiển thị. Hiển thị dạng lưới 3 cột x 2 hàng trên desktop.
  * **Ràng buộc Trạng thái (Lifecycle Boundary):** Chỉ các khóa học ở trạng thái **`PUBLISHED`** mới tham gia vào tập ứng viên đề xuất và sinh vector embedding. Khóa học ở trạng thái `DRAFT` hoặc `PENDING_REVIEW` tuyệt đối không được hiển thị cho người học.
* **BR_CATALOG_008 (Đánh dấu & Quản lý Khóa học Yêu thích - Course Bookmarks):**
  * Mỗi tài khoản có thể lưu trữ danh sách các khóa học quan tâm/yêu thích (`course_bookmarks`).
  * Khóa duy nhất `(user_id, course_id)` (`uq_user_course_bookmark`) đảm bảo tính idempotent: thao tác lưu lặp lại không tạo ra bản ghi thừa và thao tác hủy lưu xóa sạch bản ghi tương ứng.
  * RPC `ListMyBookmarkedCourses` tự động join và tải dữ liệu thực thể `Course` mới nhất để hiển thị trực quan thông tin đối tác và khóa học.
* **BR_SEARCH_001 (Ghi nhận Lịch sử Tìm kiếm Khóa học, Chống Spam & Tối ưu Prefix-Update Throttling - Course Search History Telemetry):**
  * **Mục tiêu & Nguyên tắc Write-only:** Ghi nhận toàn diện hành vi tìm kiếm khóa học của học viên vào bảng `user_search_history` phục vụ phân tích dữ liệu, tuyệt đối không cung cấp API GET hoặc gợi ý tìm kiếm chưa dùng đến (Write-Only Scope).
  * **Xác thực & Bảo mật Định danh:** RPC `RecordCourseSearch` yêu cầu chính sách `(auth.v1.policy) = AUTH_POLICY_AUTHENTICATED`. Danh tính `user_id` bắt buộc phân giải trực tiếp từ JWT Context (`require_current_user().id`), nghiêm cấm tin tưởng client payload.
  * **Chuẩn hóa & Giới hạn Chuỗi:** Từ khóa tìm kiếm được chuẩn hóa khoảng trắng (`strip()`), độ dài tối thiểu >= 2 ký tự (`MIN_SEARCH_QUERY_LENGTH = 2`), giới hạn tối đa 200 ký tự (`MAX_SEARCH_QUERY_LENGTH = 200`), và số lượng kết quả tìm thấy `result_count` bị chặn dưới >= 0.
  * **Cơ chế Prefix-Update Throttling (Chống Spam DB Bloat):** Khi học viên gõ phím liên tục, nếu lượt tìm kiếm mới xảy ra trong vòng 5 giây (`SEARCH_HISTORY_THROTTLE_SECONDS = 5`) kể từ lượt tìm kiếm gần nhất của cùng học viên và từ khóa mới là tiền tố/hậu tố mở rộng của từ khóa cũ (`new_query.startswith(old_query)` hoặc ngược lại), hệ thống tự động thực hiện thao tác `UPDATE` bản ghi gần nhất thay vì `INSERT` hàng mới. Điều này loại bỏ hoàn toàn hiện tượng tạo hàng loạt bản ghi rác ('p' -> 'py' -> 'pyt' -> 'python').
  * **Tầng Cơ sở Dữ liệu:** Bảng `user_search_history` có khóa ngoại `ForeignKey("users.id", ondelete="CASCADE")`, `server_default` an toàn cho cột mới và chỉ mục phức hợp `Index("ix_user_search_history_user_created", "user_id", "created_at")` phục vụ phân tích chuỗi thời gian.
* **BR_CATALOG_007 (Chương trình Chuyên ngành & Chính sách Ưu đãi Mua trọn gói - Specialization & Bundle Pricing):**
  * **Cấu trúc Lộ trình Chuyên ngành (Specialization Learning Path):**
    * Mỗi Chuyên ngành tập hợp chuỗi các khóa học có tính chất kế thừa và phát triển kỹ năng tuần tự (ví dụ: Khóa 1: Kinh tế học Vi mô $\to$ Khóa 2: Kinh tế lượng Ứng dụng $\to$ Khóa 3: Kinh tế học Hành vi & Định giá).
    * Khi học viên đang xem bất kỳ khóa học nào thuộc Chuyên ngành, hệ thống hiển thị rõ ràng vị trí hiện tại (`Đang xem`), các môn tiên quyết đứng trước, các môn nâng cao đứng sau, và cột mốc đích đến nhận Chứng chỉ Chuyên ngành.
  * **Công thức Giá Combo Trọn gói (Specialization Bundle Pricing):**
    * `total_individual_price`: Tổng học phí khi mua lẻ từng môn trong Chuyên ngành.
    * `discount_percent`: Tỷ lệ giảm giá combo trọn gói (mặc định $25\%$, định nghĩa tại `DEFAULT_SPECIALIZATION_DISCOUNT_PERCENT = 25` trong `src.modules.catalog.domain.constants`).
    * `bundle_price`: Học phí trọn gói sau ưu đãi, làm tròn đến hàng chục nghìn đồng để tối ưu tính thân thiện:
      $$\text{bundle\_price} = \text{round}\left(\text{total\_individual\_price} \times \left(1 - \frac{\text{discount\_percent}}{100}\right) \div 10000\right) \times 10000$$
    * *Quyền lợi gói combo:* Học viên sở hữu quyền truy cập trọn đời vào tất cả khóa học trong chuyên ngành, toàn bộ bài tập thực hành & bài kiểm tra có tính điểm, và 1 Chứng chỉ Chuyên ngành danh giá sau khi hoàn thành.
  * **Quyền hạn Giảng viên & Quản trị Chuyên ngành (Instructor Specialization Management):**
    * *Kiểm tra Quyền Sở hữu (Ownership Guard):* Giảng viên chỉ được phép gom các khóa học mà chính mình là chủ sở hữu (`owner_id`) hoặc đồng giảng viên được cấp quyền (`co_instructor_ids`). Tuyệt đối không thể thêm khóa học của giảng viên khác vào chuyên ngành của mình.
    * *Quy tắc Sàn Cố định Nền tảng (Platform Floor Pricing Rule - Phương án 1 chuẩn Coursera):* Nền tảng quy định cứng và tự động áp dụng mức ưu đãi trọn gói $25\%$ cho tất cả gói Chuyên ngành từ 2 môn trở lên. Giảng viên không thể tùy ý điều chỉnh tỷ lệ này nhằm chống phá giá, giữ gìn giá trị sư phạm và bảo đảm tính công bằng thương mại.
    * *Đa tổ chức (Multi-Tenant Organization Scoping):* Mọi thao tác tạo và truy vấn danh sách chuyên ngành đều được đẩy xuống tầng CSDL (`apply_organization_scope`) theo phân quyền tổ chức của giảng viên.
  * **Tích hợp Trực quan trên Trang Chi tiết Khóa học (UI Integration):**
    * *Hero Hint Callout:* Nằm tại thẻ Ghi danh góc phải, thông báo cho học viên biết khóa học thuộc chương trình Chuyên ngành và gợi ý mức tiết kiệm $25\%$, kèm liên kết cuộn mượt xuống khu vực chuyên biệt.
    * *Khu vực Chuyên ngành Chuyên biệt (`#specialization-showcase`):* Bố cục 2 cột (Lộ trình học tập trực quan 65% vs Thẻ Thanh toán Combo Trọn gói 35%).
    * *Hộp thoại Xác nhận Mua Combo (`SpecializationCheckoutModal`):* Tóm tắt bảng giá chi tiết, danh sách môn học, số tiền tiết kiệm và dẫn tới cổng thanh toán VNPay.


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
* **BR_LEARNING_001 (Tính toán Tiến độ, Khử trùng lặp & Ràng buộc Bảng Completed Items):**
  * Mỗi khi hoàn thành 1 bài học (Video, Reading, Quiz), hệ thống tự động lưu vết bản ghi trạng thái hoàn thành vào cơ sở dữ liệu (`user_item_completions`) với khóa chính duy nhất `(user_id, item_id)` (`uq_user_item_completion`) và timestamp `completed_at`, đồng thời thêm `item_id` vào danh sách `completed_item_ids` (sử dụng tập hợp `set` để khử trùng lặp).
  * *Theo dõi Thời gian & Vị trí Bài học gần nhất (Granular Resuming & Timestamps):*
    * `enrolled_at`: Mốc thời gian ghi danh khóa học lần đầu.
    * `completed_at`: Mốc thời gian hoàn thành 100% khóa học (chuyển sang trạng thái `COMPLETED`).
    * `last_accessed_at` & `last_accessed_item_id`: Tự động cập nhật mỗi khi học viên truy cập hoặc đổi bài học trong khóa học qua RPC `GetProgress(course_id, current_item_id)`.
    * Khi học viên bấm "Tiếp tục học" trên giao diện `/my-learning` hoặc mở `/learn/[courseId]`, hệ thống tự động đưa học viên tới bài học tương ứng với `last_accessed_item_id`.
  * *Ghi chú cá nhân gắn với Mốc Thời gian Video (Video Timestamped Personal Notes):*
    * Mỗi bản ghi `PersonalNote` lưu trữ `timestamp_seconds` (mốc giây tại thời điểm tạo ghi chú) và `updated_at`. Cho phép học viên bấm trực tiếp vào mốc thời gian để nhảy đến phân đoạn video liên quan.
  * *Xác thực danh mục Server-side (Server-side Item Validation):* Hệ thống tự động truy vấn danh mục bài học từ Catalog module (`CatalogUseCase.get_course_detail`) để lấy tập hợp bài học hợp lệ (`valid_item_ids`) và tổng số bài học thực tế (`real_total_items`). Tất cả `item_id` không nằm trong danh mục khóa học sẽ bị từ chối (`item_id in valid_item_ids`), đồng thời danh sách bài hoàn thành được lọc loại bỏ các item không còn tồn tại (`completed = completed.intersection(valid_item_ids)`). Loại bỏ hoàn toàn khả năng gửi tham số `total_course_items` tùy ý từ phía client.
  * Phần trăm tiến độ được tính toán và làm tròn 1 chữ số thập phân:
    $$\text{Overall Progress \%} = \min\left(100.0, \text{round}\left(\frac{|\text{Completed Items}|}{\max(1, \text{Total Course Items})} \times 100, 1\right)\right)$$
* **BR_LEARNING_002 (Bảo lưu Tiến độ & Ghi chú khi Nâng cấp Chế độ):**
  * Khi học viên nâng cấp từ Audit Mode sang Paid Mode (hoặc qua Financial Aid / Enterprise Key), hệ thống **bảo lưu 100% danh sách bài học đã hoàn thành (`completed_item_ids`) và các Ghi chú cá nhân (`Personal Notes`)**.
* **BR_LEARNING_003 (Đo lường Thời gian Học Thực tế & Chuỗi Ngày Học Liên tục - Learning Time & Streaks):**
  * *Cơ chế Heartbeat & Chống Treo máy (Anti-Idle Tracking):*
    * Thời gian học thực tế được Frontend tích lũy mỗi giây khi thỏa mãn đồng thời: (1) Tab đang hiển thị (`document.visibilityState === 'visible'`) và (2) Video đang phát thực tế (`isVideoPlaying`) HOẶC có tương tác người dùng (chuột, phím, cuộn trang) trong vòng 120 giây (`IDLE_TIMEOUT_SECONDS = 120`).
    * Định kỳ mỗi 30 giây (`DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 30`), Frontend phát tín hiệu Heartbeat lên RPC `RecordLearningTime(course_id, item_id, delta_seconds, client_timezone)`.
    * Khi chuyển bài hoặc thoát trang, hệ thống kích hoạt cơ chế flush an toàn bằng `fetch(url, { keepalive: true, headers: { 'Connect-Protocol-Version': '1' } })` bắt sự kiện `visibilitychange` (với `document.visibilityState === 'hidden'`).
  * *Bảo mật & Kẹp chặn Dữ liệu (Anti-Cheating & Velocity Limit):*
    * `delta_seconds` bị kẹp trong khoảng $[1, 120]$ giây (`MAX_HEARTBEAT_DELTA_SECONDS = 120`).
    * Áp dụng Rate Limiting tối đa 1 heartbeat mỗi 5 giây cho mỗi `user_id` qua Redis token với cơ chế Fail-open an toàn.
    * Bắt buộc kiểm tra Enrollment Guard: Học viên bắt buộc phải đã ghi danh khóa học (`enrolled_at != ""`) và `item_id` phải thực sự thuộc cấu trúc khóa học.
  * *Phân giải Múi giờ Tuyệt đối (Server-Authoritative Timezone):*
    * Server sử dụng đồng hồ UTC tuyệt đối, chuyển đổi sang ngày địa phương bằng `zoneinfo.ZoneInfo(client_timezone)` (mặc định fallback `"Asia/Ho_Chi_Minh"` / UTC+7) để xác định `study_date` (YYYY-MM-DD), triệt tiêu nguy cơ mất chuỗi streak sau nửa đêm và chống gian lận ngày từ client.
  * *Quy tắc Tính Chuỗi Ngày Học Liên tục (Streak Engine):*
    * Mục tiêu tối thiểu để giữ/tăng chuỗi ngày học là 300 giây (5 phút) học tích lũy trong ngày (`MIN_DAILY_STUDY_SECONDS_FOR_STREAK = 300`).
    * Cờ `is_streak_qualified` được cập nhật nguyên tử ở cấp CSDL PostgreSQL (`update ... where is_streak_qualified = false returning ...`), đảm bảo chỉ duy nhất một nhịp ping đầu tiên vượt mốc 300s mới kích hoạt tăng `current_streak`.
    * Nếu ngày hoạt động gần nhất `last_active_date == yesterday`: `current_streak += 1`, `longest_streak = max(longest_streak, current_streak)`.
    * Nếu ngày hoạt động gần nhất `last_active_date == today`: Giữ nguyên `current_streak`.
    * Nếu học viên bỏ lỡ quá 1 ngày (`last_active_date < yesterday` hoặc chưa từng học): Chuỗi bị đứt quãng, reset về `current_streak = 1` khi đạt mốc ngày mới.
    * Khi truy vấn qua `GetLearningStreak`, hệ thống tính toán `effective_current_streak = current_streak` nếu `last_active_date` là hôm nay hoặc hôm qua; ngược lại trả về 0 để loại bỏ hoàn toàn hiện tượng hiển thị chuỗi ma (Phantom Streak).
* **BR_LEARNING_004 (Ghi nhớ & Tự động Khôi phục Vị trí Phát Video - Video Playback Position Persistence & Auto-Resume):**
  * *Ngưỡng khôi phục & Đặt lại khi gần kết thúc:*
    * Vị trí `< 5` giây (`VIDEO_RESUME_MIN_SECONDS = 5`) không tự động tua lại và không hiển thị Toast thông báo.
    * Khi video kết thúc (`onEnded`) hoặc vị trí nằm trong **5 giây cuối** đối với video dài hơn 15 giây (`VIDEO_END_RESET_THRESHOLD_SECONDS = 5`, `VIDEO_END_RESET_MIN_DURATION_SECONDS = 15`), cả Client và Server tự động chuẩn hóa `last_position_seconds = 0` (`MAX_VIDEO_POSITION_SECONDS = 86400`), nhưng vẫn giữ nguyên trạng thái hoàn thành bài học trong `user_item_completions`.
  * *Cơ chế Lưu vị trí đa tầng & Giảm tải Request:*
    * Lưu qua RPC `SaveVideoPosition(course_id, item_id, position_seconds, duration_seconds)`: định kỳ mỗi **10 giây** khi đang phát (nếu lệch `>= 3` giây), lưu ngay khi **Pause**, debounce **500ms** khi **Seek**, đặt về `0` khi **Ended**, và gửi qua `fetch(..., { keepalive: true, credentials: "include" })` khi chuyển bài, ẩn tab (`visibilitychange === "hidden"`) hoặc rời trang (`pagehide`).
    * `SaveVideoPosition` mang tính chất *idempotent overwrite*, tách biệt hoàn toàn với `RecordLearningTime` (không chịu cooldown 5 giây của Heartbeat) nhưng vẫn bắt buộc Enrollment Guard (`is_enrolled`) và kiểm tra bài học thuộc khóa học là Video (`resolve_course_video_item`). Khi upsert, chỉ ghi đè `video_duration_seconds` khi `duration_seconds > 0` để tránh mất tổng thời lượng lúc YouTube Player chưa sẵn sàng.
  * *Nguồn chân lý đa thiết bị, Quiz & Miễn trừ:*
    * `PostgreSQL` (`learning_item_progresses`) là nguồn chân lý đồng bộ xuyên thiết bị (trả về qua `GetProgressResponse.video_positions`); `localStorage` (`lms_video_pos:${userId}:${itemId}`, TTL 7 ngày) chỉ đóng vai trò buffer tức thì và chỉ ghi đè khi mới hơn `position_updated_at` từ DB.
    * Khi tự động tua tới `resumed_position` (>= 5s), các In-Video Quiz có `timestamp_seconds < resumed_position - 1` được đánh dấu đã bỏ qua để không bật lại quiz cũ; nút **"Xem lại từ đầu"** trên Toast sẽ đặt lại vị trí về `0`, xóa bộ đánh dấu quiz và lưu `0` lên Server. Không đọc/ghi vị trí ở Chế độ Xem trước (`isPreviewMode`) hoặc bài học bị khóa.

---

## 4. Quy tắc Cấp phát và Thu hồi Chứng chỉ Xác minh (BR_CERT & BR_BADGE)

* **BR_CERT_001 (Điều kiện cấp Verified Certificate tự động):**
  * Tự động phát hành Verified Certificate khi: (1) `Progress = 100%`, (2) Điểm tất cả các bài Graded Items đạt tối thiểu `>= 80%` (hoặc ngưỡng tùy chỉnh của bài thi), (3) Đối với bài tập tự luận (`PEER_REVIEW`), bài nộp phải ở trạng thái đã công bố chính thức (`status = "PUBLISHED"`) và hoàn tất nghĩa vụ chấm chéo (`review_duty_status` thuộc `COMPLETED`, `WAIVED_EMPTY_POOL`, hoặc `NOT_APPLICABLE`), và (4) Không còn đơn khiếu nại hoặc báo cáo lượt chấm chéo đang chờ thẩm định (`status` thuộc `PENDING` hoặc `PENDING_STAFF_REVIEW`).
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
* **BR_PARTNER_003 (Phân tách Ngữ cảnh Hiển thị `organization_id` và Tổ chức Phát hành `issuer_partner_id`):**
  * Các khóa học và chuỗi chuyên ngành thương mại B2C công khai do trường đại học/viện nghiên cứu phát hành duy trì `organization_id = "partner_community"` để học viên toàn sàn đều tra cứu được qua bộ lọc SQL `apply_organization_scope()`, đồng thời lưu định danh pháp lý của đối tác phát hành tại cột `issuer_partner_id` (`FK -> organizations.id`).
  * Các khóa đào tạo nội bộ khép kín (Private B2B Training) đặt đồng thời `organization_id = <org_id>` và `issuer_partner_id = <org_id>`, đảm bảo chỉ thành viên thuộc tổ chức đó mới nhìn thấy khóa học.
  * Mọi báo cáo thống kê của Bảng điều khiển Đối tác (`GetOrganizationCatalogStats`, `ListOrganizationCourseMetrics`, `GetOrganizationCertificateStats`, `ListOrganizationCertificates`) và cơ chế fallback chữ ký đại diện (`BR_CERT_002`) tự động tổng hợp trên điều kiện hợp nhất `organization_id == org_id OR issuer_partner_id == org_id`.




---

## 6. Quy tắc Diễn đàn Thảo luận (BR_FORUM)

* **BR_FORUM_001 (Ràng buộc 1 Vote/User & Idempotent Toggle):**
  * Mỗi `user_id` chỉ được vote 1 lượt trên mỗi bài/câu trả lời. Bấm Upvote lần đầu sẽ tăng +1 điểm; bấm lại lần nữa sẽ hủy vote (Un-vote) và giảm -1 điểm.
  * *Ràng buộc Ghi danh khi Biểu quyết:* Người dùng bắt buộc phải có quyền truy cập khóa học (đã ghi danh hoặc thuộc ban giảng dạy/TA của khóa học chứa bài viết) mới được phép biểu quyết bài viết hoặc bình luận.
* **BR_FORUM_002 (Phân quyền & Tự động Ghim Thread khi Pin Staff Answer):**
  * Chỉ Giảng viên phụ trách (`owner_id`), Đồng giảng viên (`co_instructor_ids`), Trợ giảng (`ta_ids`) của chính khóa học đó, hoặc `SUPER_ADMIN` mới có quyền gọi lệnh ghim câu trả lời chính thức (`pin_staff_answer`). Giảng viên của khóa học khác không có quyền can thiệp vào khóa học không thuộc phạm vi quản lý của mình.
  * Khi một câu trả lời được ghim làm `is_staff_answer = True`, bài thảo luận gốc (Thread) cũng tự động được đánh dấu `is_staff_pinned = True` để ưu tiên hiển thị trên đầu danh sách diễn đàn.
* **BR_FORUM_003 (Phân quyền Tác giả/Moderation & Chỉ báo Bài viết đã Chỉnh sửa):**
  * *Quyền Chỉnh sửa & Xóa:* Tác giả bài viết (`author_user_id == current_user.id`) có quyền Cập nhật (`UpdateThread`, `UpdateReply`) hoặc Xóa (`DeleteThread`, `DeleteReply`) bài viết/bình luận của chính mình.
  * *Chỉ báo đã Chỉnh sửa (Edit State Indicator):* Ngay khi tác giả chỉnh sửa bài viết/bình luận, hệ thống tự động cập nhật cờ `is_edited = True` và ghi lại mốc thời gian `edited_at` để tất cả người xem phân biệt được nội dung đã qua chỉnh sửa.
  * *Ban kiểm duyệt (Staff Moderation):* Trợ giảng và Giảng viên phụ trách khóa học (`owner_id`, `co_instructor_ids`, `ta_ids`, `ADMIN`) có quyền Xóa (Delete) bài viết hoặc bình luận vi phạm của bất kỳ người dùng nào nhưng không được quyền thay đổi nội dung (Update) bài đăng của người khác.
* **BR_FORUM_004 (Ràng buộc Vai trò theo Ngữ cảnh Khóa học & Ghi danh Thảo luận - Contextual Role Resolution & Enrollment Guard):**
  * *Phân giải vai trò theo ngữ cảnh (Contextual Role Resolution):* Vai trò của người dùng trên diễn đàn được xác định động theo từng khóa học cụ thể thay vì lấy vai trò tài khoản toàn cục (`user.role`). Nếu một tài khoản Giảng viên tham gia vào khóa học của người khác (nơi họ không phải chủ sở hữu hay đồng giảng dạy), họ bắt buộc tham gia với tư cách **Học viên (`Learner`)**, các câu trả lời không được tự động gắn cờ `is_staff_answer`, và không được phép ghim bài.
  * *Ràng buộc Ghi danh (Enrollment Guard):* Người dùng (ngoại trừ Đội ngũ giảng dạy phụ trách khóa và Admin) bắt buộc phải có bản ghi ghi danh/đăng ký khóa học (`LearningProgressModel.enrolled_at`) mới được phép tạo chủ đề (`create_thread`) hoặc gửi phản hồi (`post_reply`). Nếu chưa đăng ký, hệ thống từ chối với lỗi `PermissionError` (ConnectRPC `PERMISSION_DENIED`).
  * *Hợp nhất Không gian Thảo luận Giảng viên (`/forum?courseId=...`):* Không duy trì màn hình thảo luận riêng biệt cho giảng viên; toàn bộ luồng hỏi đáp, ghim câu trả lời và điều phối thảo luận được hợp nhất về không gian Diễn đàn trung tâm `/forum?courseId=...` với các công cụ kiểm duyệt dành riêng cho Đội ngũ giảng dạy khóa học (`owner_id`, `co_instructor_ids`, `ta_ids`) và Admin.
* **BR_FORUM_005 (Cách ly Luồng Thảo luận Lớp học & Phạm vi Kiểm duyệt - Class-Scoped Discussion Feed & Moderation Boundary):**
  * *Cách ly Nguồn dữ liệu (Feed Isolation):* Khi xem danh sách thảo luận (`ListThreads`), người dùng thông thường chỉ được xem các chủ đề thuộc các khóa học mà họ thực sự tham gia (đã đăng ký học hoặc đang phụ trách giảng dạy). Backend tự động lọc danh sách khóa học khả dụng (`accessible_course_ids = enrolled_course_ids | teaching_course_ids`). Nếu người dùng cố ý truyền `course_id` của một khóa học họ không tham gia, hệ thống trả về danh sách rỗng (`[]`). Chỉ Super Admin mới có quyền xem toàn bộ thảo luận trên nền tảng.
  * *Bộ lọc Khóa học Frontend (Scoped Course Filter):* Dropdown chọn khóa học trên Diễn đàn (`/forum`) chỉ nạp danh sách các khóa học mà người dùng có quyền truy cập (khóa đã đăng ký và khóa phụ trách giảng dạy).
  * *Phạm vi Kiểm duyệt theo Khóa học (Course-Specific Moderation):* Quyền Xóa bài (`DeleteThread`, `DeleteReply`) và Ghim câu trả lời (`PinStaffAnswer`) cho tài khoản Giảng viên chỉ được kích hoạt đối với các chủ đề/bình luận thuộc đúng khóa học mà Giảng viên đó sở hữu (`owner_id`) hoặc đồng phụ trách (`co_instructor_ids`). Không hiển thị hoặc cho phép can thiệp vào các bài đăng thuộc khóa học của Giảng viên khác.
* **BR_FORUM_006 (Tự động Đánh dấu "Đã giải quyết" — Solved Badge Lifecycle):**
  * Một chủ đề (`ForumThread`) được đánh dấu `is_solved = True` (hiển thị huy hiệu **"Đã giải quyết"**) khi và chỉ khi tồn tại ít nhất một phản hồi (`ForumReply`) mang cờ `is_staff_answer = True`.
  * Cờ `is_solved` tự động bật `True` khi Đội ngũ giảng dạy của khóa học (`owner_id`, `co_instructor_ids`, `ta_ids`) hoặc `SUPER_ADMIN` gửi phản hồi mới qua `PostReply`, hoặc khi Staff ghim một phản hồi bất kỳ qua `PinStaffAnswer`.
  * Việc Giảng viên/Staff tạo mới chủ đề (`CreateThread`) chỉ tạo nội dung mở đầu (`is_staff_answer = False`) nên chủ đề mới mặc định có `is_solved = False`.
  * Khi một phản hồi có `is_staff_answer = True` bị xóa (`DeleteReply`) hoặc bị bỏ ghim (`PinStaffAnswer` toggle), hệ thống kiểm tra lại các phản hồi còn lại của chủ đề; nếu không còn phản hồi `is_staff_answer = True` nào, `is_solved` tự động trở về `False`.
* **BR_FORUM_007 (Tìm kiếm Đa từ khóa Tiếng Việt Không dấu & Lọc Trạng thái Diễn đàn):**
  * `ListThreadsRequest` hỗ trợ thêm `search_query` (chuẩn hóa `strip()`, giới hạn tối đa 200 ký tự, loại trùng lặp và tách tối đa 8 từ theo khoảng trắng) và `resolution_filter` (`UNSPECIFIED` / `SOLVED` / `UNSOLVED`), đồng thời chuẩn hóa `course_id = "ALL"` tương đương xem toàn bộ khóa học thuộc phạm vi truy cập.
  * Truy vấn PostgreSQL sử dụng hàm `immutable_unaccent(lower(...))` kết hợp `UNION` giữa `forum_threads` (`title`, `content`, `author_name`) và `forum_replies.content` để tận dụng cả 4 index GIN `pg_trgm` (`gin_trgm_ops` via `BitmapOr`), đồng thời thoát ký tự đặc biệt LIKE (`%`, `_`, `\`) qua `escape_like_pattern`. Mỗi từ khóa bắt buộc khớp ít nhất một trường (`AND` giữa các từ, `OR` giữa các trường).
  * Giao diện Frontend debounce tìm kiếm 300ms, giữ modal chi tiết không tự đóng khi trạng thái giải quyết thay đổi trong lúc lọc `UNSOLVED`/`SOLVED`, và tự đặt lại bộ lọc tìm kiếm/trạng thái sau khi đăng chủ đề mới.

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
* **BR_REVIEW_005 (Phản ứng Hữu ích & Chống Gian lận Tự tương tác - Helpful Reactions & Anti-Self-Upvote):**
  * Học viên đăng nhập có quyền đánh dấu hoặc bỏ đánh dấu nhận xét của người khác là hữu ích (toggle reaction) qua RPC `ToggleCourseReviewHelpful`.
  * *Chống gian lận:* Tác giả của nhận xét bị nghiêm cấm tự đánh giá nhận xét của chính mình là hữu ích (`review.user_id == user_id`). Backend ném lỗi `ValueError` và trả về mã lỗi `INVALID_ARGUMENT`.
  * *Ràng buộc cơ sở dữ liệu:* Bảng `course_review_reactions` bảo đảm ràng buộc duy nhất trên cặp `(user_id, review_id)`, khóa ngoại cascade khi nhận xét bị xóa.
  * *Cập nhật bộ đếm nguyên tử:* Số lượt đánh giá hữu ích `helpful_count` được cộng/trừ trực tiếp ở mức câu lệnh SQL (`func.greatest(0, CourseReviewModel.helpful_count - 1)`), loại bỏ hoàn toàn race condition trong môi trường đồng thời cao.

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
  * Giảng viên truy xuất báo cáo lớp học qua RPC `GetInstructorAnalytics` nhận thông tin thống kê thời gian thực: Tổng số học viên (`total_enrolled_students`), Tỷ lệ hoàn thành trung bình (`average_completion_rate`), Điểm đánh giá trung bình (`average_rating`), Tổng học viên chính thức (`paid_students_count`), Tổng học viên học thử (`audit_students_count`), Tổng số giờ học tích lũy (`total_learning_hours`), Thời lượng học chính thức (`paid_learning_hours`), Thời lượng học thử (`audit_learning_hours`), Điểm bài thi trung bình của khóa (`course_average_quiz_score`), và Danh sách chi tiết tiến độ từng học viên (`students`).
  * **Quy tắc Phân định Gói Ghi danh (`enrollment_type`):**
    * Hệ thống xác định hạng gói theo thứ tự ưu tiên chặt chẽ:
      1. Đã mua lẻ khóa học (`CoursePurchaseModel`) -> `PAID` (Chính thức).
      2. Có gói Plus Subscription đang hoạt động (`UserSubscriptionModel`) -> `PLUS` (Plus).
      3. Có mã kích hoạt doanh nghiệp hợp lệ (`EnterpriseLicenseModel`) -> `ENTERPRISE` (Doanh nghiệp).
      4. Có đơn hỗ trợ tài chính được duyệt (`FinancialAidModel`) -> `FINANCIAL_AID` (Học bổng).
      5. Còn lại ghi danh miễn phí -> `AUDIT` (Học thử).
  * **Quy tắc Ràng buộc & Chuẩn hóa Phân khúc Học viên (Cohort Segmentation & Mutual Exclusion):**
    * Học viên học thử (`AUDIT`) chỉ được truy cập tuần 1 bài giảng lý thuyết; các tuần 2+ và bài kiểm tra tính điểm bị khóa. Do đó, học viên học thử KHÔNG THỂ đạt trạng thái Đã tốt nghiệp (`COMPLETED`) hoặc nhận chứng chỉ.
    * Hệ thống thống nhất 4 phân khúc chuẩn hóa không chồng lấn trên toàn bộ giao diện Giảng viên (Dropdown Sơ đồ & Cụm nút Bảng danh sách):
      1. `Tất cả học viên` (Toàn bộ học viên của khóa).
      2. `Chính thức — Đang học` (Học viên trả phí/học bổng/doanh nghiệp có tiến độ < 100%).
      3. `Chính thức — Đã tốt nghiệp` (Học viên chính thức đã hoàn thành 100% khóa học).
      4. `Học thử` (Học viên tài khoản Audit chỉ học nội dung mở Tuần 1).
    * Thiết kế này triệt tiêu hoàn toàn rủi ro mâu thuẫn dữ liệu giữa học thử và hoàn thành.
  * **Quy tắc Tính Nhịp độ cho Học viên Học thử (Pacing for Audit Learners):**
    * Do bị giới hạn phạm vi tuần 1, hệ thống không phạt nhịp độ của học viên Audit là "Chậm tiến độ" (`BEHIND`) khi họ đã học hết tuần 1, mà đánh giá nhịp độ dựa trên mức độ hoạt động và tính chuyên cần thực tế thay vì ép tiến độ theo ngày ghi danh như học viên chính thức.
  * **Quy tắc Theo dõi Khóa Kiểm tra (Assessment Cooldown Observation):**
    * Khi học viên thi trượt quá 3 lần liên tiếp, hệ thống ghi nhận `is_in_cooldown = True` và thời điểm mở lại `cooldown_until`. Giảng viên quan sát được trạng thái này trên Dashboard để chủ động gửi thông báo hỗ trợ giải đáp kiến thức kịp thời.
  * **Quy tắc Giám sát & Quá hạn Nghĩa vụ Chấm chéo (Peer Review Duty & Overdue Tracking):**
    * Học viên nộp bài tập tự luận có nghĩa vụ chấm chéo tối thiểu 3 bài tập của bạn học (`peer_review_duty_status = 'PENDING'`).
    * **Thời hạn chấm chéo (Review Window):** Được xác định chính xác theo cấu hình thời gian khởi động bài tập (`cold_start_hours`: 24h, 48h, 72h) do Giảng viên thiết lập trên bài tập tự luận tương ứng.
    * Khi học viên còn nợ chấm nhưng chưa quá hạn: Giao diện hiển thị trạng thái đang trong hạn `[🕒 Đang trong hạn chấm]`.
    * Khi khoảng thời gian từ lúc nộp bài vượt quá `cold_start_hours` mà học viên chưa hoàn thành nghĩa vụ: Hệ thống kích hoạt cờ `is_peer_review_overdue = True`, giao diện hiển thị cảnh báo đỏ `[⚠️ Nợ chấm chéo (Quá hạn)]` và tự động cập nhật tiêu đề/nội dung thư đôn đốc khẩn cấp trong Modal chi tiết.
  * **Quy tắc Tính Điểm Kiểm tra Trung bình (`average_quiz_score`):**
    * Điểm trung bình Quiz trên bảng lớp học (`GetInstructorAnalytics`) chỉ tính trên các bài `GRADED_QUIZ` (loại trừ `PRACTICE_QUIZ`) và lấy điểm cao nhất (`max`) của mỗi bài kiểm tra, đồng bộ 100% với cách tổng hợp điểm trong Hồ sơ chi tiết học viên (`GetInstructorStudentDossier`).
    * Khi học viên bị khóa cooldown ở nhiều bài kiểm tra cùng lúc, hệ thống giữ mốc mở khóa xa nhất (`max(cooldown_until)`).
  * **Quy tắc Bản đồ Nhiệt & Nhật ký Hoạt động Cá nhân theo Môn học (`DailyCourseItemRecordModel`):**
    * Cả bảng tổng quan lớp học (`daily_activities` trong 30 ngày gần nhất của `EnrolledStudent`) lẫn hồ sơ chi tiết học viên (`GetInstructorStudentDossier.daily_logs`) đều cô lập thời lượng học theo từng khóa học qua bảng `daily_course_item_records` (`user_id`, `course_id`, `study_date`, `item_id`), đảm bảo không lẫn thời lượng học của các khóa học khác.
    * Hồ sơ chi tiết học viên (`GetInstructorStudentDossier`) yêu cầu học viên thực sự đã ghi danh khóa học (`LearningProgressModel` tồn tại) và cho phép Trợ giảng (TA) có quyền `CoursePermission.GRADE_ASSESSMENTS` truy cập đồng bộ với Sổ điểm.
    * **Cảnh báo Học lướt Bất thường (`is_suspicious_fast_pace`):** Khi học viên đã hoàn thành từ `3` mục bài học trở lên (`MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK = 3`) nhưng tổng thời lượng thực học thấp hơn `25%` (`FAST_PACE_MIN_ESTIMATED_RATIO = 0.25`) tổng thời lượng ước tính (`estimated_minutes` do giảng viên cấu hình trên từng học liệu, mặc định `DEFAULT_ESTIMATED_ITEM_MINUTES = 10` phút nếu chưa nhập) của các bài đã hoàn thành, hệ thống tự động gắn nhãn cảnh báo thời lượng ít bất thường để giảng viên kịp thời rà soát.
* **BR_INSTRUCTOR_006 (Thống kê Hoạt động Chuỗi thời gian & Bản đồ nhiệt Heatmap):**
  * Giảng viên truy xuất dữ liệu chuỗi thời gian qua RPC `GetInstructorActivityTimeline` được phân quyền chặt chẽ (`enforce_course_ownership` khi truyền `course_id`, hoặc tự động giới hạn phạm vi các khóa học mà giảng viên sở hữu hoặc là đồng giảng dạy khi `course_id` rỗng).
  * Mọi mốc ngày/giờ của chuỗi thời gian (`timeline`) và bản đồ nhiệt (`heatmap`) được chuẩn hóa theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7).
  * Chuỗi dữ liệu thời gian (`timeline`) phân nhóm hoạt động theo khung giờ (`today`) hoặc theo ngày (`7d`, `this_week`, `last_week`, `this_month`, `last_month`, `custom`). Chỉ số `completed_items` ở mỗi mốc thời gian đếm số học liệu hoàn thành phát sinh trong đúng mốc đó (mỗi cặp học viên–học liệu hoàn thành chỉ được tính tối đa 1 lần, không cộng trùng lặp tổng tích lũy cả khóa).
  * Hỗ trợ bộ lọc đối tượng học viên (`learner_filter`): `all` (Tất cả học viên), `paid_in_progress` (Chính thức — Đang học), `paid_completed` (Chính thức — Đã tốt nghiệp), `audit` (Học viên học thử), `paid` (Học viên chính thức), `in_progress` (Đang học), `completed` (Đã tốt nghiệp). Bộ lọc hạng gói kiểm tra đồng bộ theo cặp `(user_id, course_id)`: đơn mua `COMPLETED`, gói `ACTIVE` còn hạn (`expires_at >= now`), Enterprise license còn hiệu lực (`is_active`) đúng phạm vi khóa học, và đơn hỗ trợ tài chính `APPROVED`/`AUTO_APPROVED`.
  * Bản đồ nhiệt (`heatmap`) bao gồm 35 ô cố định (7 ngày x 5 khung giờ theo giờ Việt Nam: Sáng 06h-12h, Chiều 12h-18h, Tối 18h-22h, Đêm 22h-02h, Rạng sáng 02h-06h phủ trọn 24 tiếng trong ngày), tự động phát hiện ô cao điểm nhất với điều kiện `count > 0 && count == max_count` để gán nhãn `is_peak = True`.

* **BR_INSTRUCTOR_005 (Kéo thả & Sắp xếp Thứ tự Cấu trúc Bài giảng Batch Reordering):**
  * Giảng viên/Admin được phép sắp xếp lại thứ tự của Tuần học (`ReorderWeekModules`), Bài học (`ReorderLessons`) và Học liệu (`ReorderLearningItems`) bằng giao diện Kéo thả (Drag & Drop) hoặc Nút di chuyển Nhanh (Up/Down).
  - Thứ tự vị trí mới được cập nhật đồng bộ trong 1 DB Transaction Atomic và duy trì chỉ số `order_index` cố định để hiển thị đồng nhất cho cả Học viên và Giảng viên.

* **BR_INSTRUCTOR_007 (Quy định Nhắc nhở Học tập Đích danh Student Reminder):**
  * Giảng viên sở hữu (`owner_id`), Giảng viên đồng giảng dạy (`co_instructor_ids`) hoặc Quản trị viên (Admin) có thẩm quyền gửi thông báo đôn đốc học tập (`SendStudentReminder`). Tài khoản bắt buộc có quyền Giảng viên (`is_instructor`) hoặc Quản trị viên (`is_admin`) và vượt qua xác thực quyền sở hữu khóa học (`enforce_course_ownership`).
  * Yêu cầu cung cấp `course_id`, danh sách `student_ids` (tối đa 100 học viên/lần gửi, tự động loại bỏ trùng lặp và chỉ gửi tới học viên đang ghi danh thực tế), `title` và `content` không rỗng.
  * Khác với `CreateCourseAnnouncement` (phát thanh công khai cho toàn thể lớp học `ANNOUNCEMENT`), `SendStudentReminder` chỉ gửi riêng tư đích danh cho các học viên được chỉ định (`NotificationCategory.ACADEMIC`), đảm bảo tính bảo mật và sự riêng tư về tiến độ học tập cá nhân. Tiêu đề thông báo tự động đính kèm tên giảng viên gửi nhắc nhở.

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
* **BR_NOTIF_012 (Tính Nguyên tử & Điều phối Sự kiện Miền Atomic Domain Event Bus):**
  * Thông báo CHỈ ĐƯỢC TẠO khi sự kiện nguồn (ví dụ: nộp bài thi, duyệt giảng viên, đăng thông báo khóa học, cấp chứng chỉ) đã thực hiện thành công và commit giao dịch cơ sở dữ liệu chính.
  * Việc điều phối thông báo được thực hiện qua **In-Memory Domain Event Bus** (`EventBus` trong Shared Kernel). Các Domain Event được gắn mã định danh chuẩn **UUIDv7** (RFC 9562) có tính sắp xếp tuần tự theo thời gian (`event_id`) và thời điểm `occurred_at`.
* **BR_NOTIF_013 (Tự động Phát Thông báo Lời mời & Cô lập Lỗi Fault Isolation):**
  * Khi tạo lời mời gia nhập Organization, Course, hoặc Enterprise Seat (`SendInvitation`), nếu địa chỉ email người nhận khớp với tài khoản người dùng đã tồn tại trong hệ thống (`invitee_id`), hệ thống tự động phát bản ghi thông báo loại `SYSTEM` đến `recipient_id = invitee_id` với tiêu đề *"Lời mời tham gia {target_name}"* và `action_url = /invitations/{token}` thông qua sự kiện `InvitationSentDomainEvent`.
  * Mọi Subscriber/Handler của `EventBus` được bọc trong cơ chế cách ly lỗi độc lập (`Fault Isolation`), ghi log chi tiết khi gặp sự cố và tuyệt đối không bao giờ làm gián đoạn hay rollback giao dịch nghiệp vụ chính.



