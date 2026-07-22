# 04. DANH MỤC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

Tài liệu này tập hợp và quản lý tập trung toàn bộ các quy tắc logic nghiệp vụ (Business Rules - BR) của **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)**. Các quy tắc này là ràng buộc bắt buộc khi lập trình logic ở Backend.

---

## 1. Quy tắc Quyền truy cập & Xét duyệt Hỗ trợ tài chính (BR_ACCESS & BR_FAID)

* **BR_ACCESS_001 (Phân quyền Audit Mode vs Paid Mode):**
  * *Audit Mode (Miễn phí):* Học viên được mở xem toàn bộ Video bài giảng, bài đọc (Reading) và làm các bài Practice Quiz. Tuy nhiên, hệ thống khóa quyền nộp bài thi Graded Quiz, bài tập Auto-Graded Lab, bài tập Peer Review và không được cấp Chứng chỉ.
  * *Paid Mode (Trả phí / Subscription):* Học viên có toàn bộ quyền làm các bài kiểm tra tính điểm, được bạn học chấm bài Peer Review và nhận Verified Certificate khi hoàn thành.
* **BR_ACCESS_002 (Quy chế Enterprise License):**
  * Học viên tham gia khóa học qua mã Enterprise Key (do doanh nghiệp/trường học tài trợ) sẽ tự động hưởng toàn bộ quyền lợi của Paid Mode mà không cần thanh toán cá nhân.
  * Thời hạn truy cập của tài khoản Enterprise kéo dài theo thời hạn hợp đồng của tổ chức đó (mặc định 12 tháng).
* **BR_FAID_001 (Quy trình nộp & xét duyệt Financial Aid):**
  * Học viên nộp đơn phải điền bài luận tối thiểu 150 từ giải trình lý do hoàn cảnh và kế hoạch áp dụng kiến thức.
  * *Hạn xét duyệt:* Giảng viên/Admin có tối đa 15 ngày kể từ ngày nộp đơn để duyệt hoặc từ chối.
  * *Tự động phê duyệt (Auto-Approve):* Nếu quá 15 ngày mà Giảng viên/Admin không xử lý đơn, hệ thống sẽ tự động phê duyệt và chuyển trạng thái học viên sang Paid Mode.

---

## 2. Quy tắc Đánh giá Năng lực & Chấm điểm (BR_HONOR, BR_QUIZ, BR_AUTOGRADE & BR_PEER)

* **BR_HONOR_001 (Xác nhận Honor Code):**
  * Hệ thống bắt buộc học viên phải tích chọn xác nhận *"Academic Honor Code"* trước khi cho phép bấm nút mở làm bài Graded Quiz, nộp bài Auto-Graded Lab, hoặc nộp bài Peer Assignment.
* **BR_QUIZ_001 (Quy tắc Thi lại & Cooldown bài Graded Quiz):**
  * Mỗi bài Graded Quiz bắt buộc đạt tối thiểu điểm Pass (mặc định 80/100 điểm) mới tính là hoàn thành.
  * Học viên được làm lại bài thi tối đa 3 lần liên tiếp. Nếu thi trượt cả 3 lần, hệ thống kích hoạt **thời gian chờ (Cooldown) 8 tiếng** trước khi cho phép làm tiếp lần thứ 4.
  * Hệ thống sẽ lưu trữ điểm số cao nhất (Highest Score) trong các lần làm bài làm điểm chính thức.
* **BR_QUIZ_002 (Quy tắc Ngân hàng Câu hỏi & Xáo trộn Đáp án):**
  * Đề thi Graded Quiz được sinh tự động bằng cách rút ngẫu nhiên $N$ câu hỏi từ Pool $M$ câu ($N \le M$) theo tỷ lệ ma trận độ khó (Dễ, Trung bình, Khó).
  * Mỗi lần hiển thị đề thi, hệ thống tự động xáo trộn ngẫu nhiên thứ tự các tùy chọn đáp án (Options Shuffling) để chống hành vi học thuộc vị trí khoanh đáp án.
* **BR_QUIZ_003 (Quy tắc Quản lý Session Đếm ngược & Auto-submit):**
  * Mọi bài thi Graded Quiz có giới hạn thời gian (Timed Quiz) được quản lý thời gian đếm ngược trực tiếp từ phía Server (Server-side Session Timer) tính từ mốc bấm nút "Start Quiz".
  * Việc tải lại trang (F5) hoặc tạm đóng trình duyệt không làm dừng đồng hồ đếm ngược. Khi hết giờ đếm ngược, Server tự động đóng phiên và thực hiện chấm điểm (Auto-submit on timeout) với các câu trả lời hiện tại.
* **BR_AUTOGRADE_001 (Quy định Sandbox Auto-Grader):**
  * Mỗi bài nộp lập trình gửi tới Auto-Grader chỉ được chạy tối đa trong môi trường Sandbox cách ly với Timeout = 30 giây và Memory Limit = 512MB.
  * Điểm bài nộp = (Số lượng Test Cases Pass / Tổng số Test Cases) * 100%.
* **BR_PEER_001 (Điều kiện Nộp & Chấm chéo Peer Review):**
  * Học viên bắt buộc phải nộp bài dự án cá nhân trước deadline mới được phân bổ quyền chấm chéo bài của bạn học.
  * Học viên bắt buộc phải **chấm đủ 3 bài làm của bạn học** theo đúng bộ tiêu chí Rubric thì hệ thống mới mở hiển thị điểm bài nộp của chính mình.
* **BR_PEER_002 (Thuật toán Tính điểm Peer Review & Cảnh báo Outlier):**
  * Điểm số bài nộp Peer Review = Trung bình cộng điểm số do 3 reviewer chấm.
  * *Cảnh báo chấm điểm bất thường (Outlier Detection):* Nếu khoảng chênh lệch điểm số giữa các reviewer lớn hơn 30% (ví dụ: 1 bạn chấm 10 điểm, 1 bạn chấm 3 điểm), hệ thống tự động gắn cờ "Outlier Flag" và gửi cảnh báo về bảng tin của Trợ giảng (TA) để can thiệp rà soát.
* **BR_PEER_003 (Khiếu nại điểm Grade Appeal):**
  * Học viên có quyền nộp đơn Khiếu nại điểm trong vòng 7 ngày kể từ khi nhận kết quả Peer Review. Trợ giảng (TA) sẽ trực tiếp chấm lại bài làm và điểm số của TA sẽ là điểm số chính thức cuối cùng.
* **BR_PEER_004 (Xử lý Thiếu bài Chấm chéo - Staff Regrade Fallback Queue):**
  * Nếu sau 5 ngày kể từ khi nộp bài mà bài dự án của học viên chưa nhận đủ 3 lượt chấm chéo (do ít người học cùng thời điểm), hệ thống sẽ tự động kích hoạt luồng Fallback: chuyển bài nộp vào Hàng chờ xét duyệt của Trợ giảng (Staff Regrade Queue) hoặc ưu tiên phân bổ bài làm cho các học viên ở đợt học tiếp theo để tránh bế tắc điểm số.

---

## 3. Quy tắc Lịch học Linh hoạt & Đặt lại Hạn nộp (BR_SCHEDULE & BR_DEADLINE)

* **BR_SCHEDULE_001 (Flexible Weekly Schedule):**
  * Mốc deadline của các tuần học (Week 1, Week 2...) được tính toán tự động dựa trên ngày học viên bấm nút Enroll khóa học.
* **BR_DEADLINE_001 (Luật Reset My Deadlines):**
  * Nếu học viên trễ hạn nộp bài (Overdue) ở bất kỳ tuần nào, hệ thống kích hoạt nút **"Reset my deadlines"**.
  * Khi học viên bấm nút này, hệ thống sẽ dịch toàn bộ mốc deadline của các bài học còn lại sang lịch đợt học mới (New Session Schedule) tương ứng với thời điểm bấm nút, giữ nguyên toàn bộ tiến độ và điểm số các bài đã hoàn thành trước đó.

---

## 4. Quy tắc An toàn và Phạm vi Hoạt động của AI Coach (BR_AI)

* **BR_AI_001 (Phạm vi RAG bám sát khóa học):**
  * AI Coach chỉ được truy xuất dữ liệu từ các tài liệu, bài đọc và Video Transcript thuộc khóa học hiện tại (`course_id`). AI từ chối trả lời các thắc mắc nằm ngoài chương trình đào tạo.
* **BR_AI_002 (Nguyên tắc Socratic Method & Anti-Cheat):**
  * AI Coach đóng vai người hướng dẫn gợi mở tư duy, tóm tắt video, giải thích thuật ngữ hoặc đặt câu hỏi phản xạ.
  * *Luật chống gian lận (Anti-Cheat):* AI Coach tuyệt đối không được đưa ra đáp án trực tiếp cho bài thi Graded Quiz, bài nộp Auto-Graded Lab hoặc bài làm Peer Review. Nếu học viên gửi câu hỏi chứa đề bài thi, AI Coach bắt buộc phản hồi bằng câu thoại mẫu từ chối hỗ trợ đáp án.
* **BR_AI_003 (Chế tài xử phạt vi phạm Input Guard):**
  * Nếu học viên cố tình gửi các câu hỏi vi phạm từ ngữ (độc hại, kích động) hoặc cố tình tấn công Prompt Injection quá 3 lần trong vòng 10 phút, hệ thống tự động khóa quyền dùng AI Coach của học viên đó trong 24 giờ.
* **BR_AI_004 (Định dạng Phản hồi Trích dẫn Timestamp & Link Bài học):**
  * Mọi câu giải thích hoặc tóm tắt của AI Coach bắt buộc kèm danh sách mốc trích dẫn (`citations`) chứa `item_id`, `timestamp_seconds` và đoạn trích dẫn ngắn. Giao diện khung chat hiển thị các thẻ liên kết để học viên có thể bấm vào và tự động tua video đến đúng thời điểm được trích dẫn.

---

## 5. Quy tắc Cấp phát và Thu hồi Chứng chỉ Xác minh (BR_CERT & BR_BADGE)

* **BR_CERT_001 (Điều kiện cấp Verified Certificate tự động):**
  * Hệ thống tự động phát hành Verified Certificate khi học viên thỏa mãn đồng thời 2 điều kiện:
    1. `Tiến độ hoàn thành bài học = 100%` (Tất cả video, bài đọc, quiz ngắt ngang video đều đã xem/hoàn thành).
    2. `Điểm tất cả bài Graded Items (Graded Quiz, Auto-Graded Lab, Peer Review) >= Passing Threshold` (mặc định >= 80%).
* **BR_CERT_002 (Xác thực công khai Verification URL & QR):**
  * Mỗi Verified Certificate được gán một mã định danh duy nhất (ví dụ: `CERT-8F9A2B3C`).
  * Bất kỳ ai truy cập đường dẫn `/verify/CERT-8F9A2B3C` hoặc quét mã QR trên certificate đều xem được trang xác thực công khai chứa: Tên học viên, Tên khóa học, Logo đối tác phát hành (Partner Logo), Ngày cấp và Trạng thái "Valid" (Hợp lệ).
* **BR_CERT_003 (Quy trình Xác minh Danh tính Sinh trắc học & CCCD):**
  * Trước khi phát hành chứng chỉ Verified Certificate lần đầu tiên, học viên bắt buộc hoàn tất quy trình Xác minh Danh tính (ID Verification): tải ảnh Căn cước công dân / Hộ chiếu và chụp ảnh sinh trắc học khuôn mặt qua Webcam để đảm bảo tính chính chủ của người làm bài.
* **BR_BADGE_001 (OpenBadges & Thu hồi Chứng chỉ):**
  * Tệp ảnh huy hiệu/certificate được tự động nhúng siêu dữ liệu JSON-LD chuẩn OpenBadges 2.0 để chia sẻ lên LinkedIn.
  * Nếu phát hiện gian lận nghiêm trọng hoặc tài khoản bị khóa, Super Admin có quyền kích hoạt lệnh Thu hồi Chứng chỉ (Revoke Certificate). Khi đó, trang xác thực `/verify/CERT-xxx` sẽ chuyển sang trạng thái "Revoked" (Đã bị thu hồi).

---

## 6. Quy tắc Diễn đàn Thảo luận (BR_FORUM)

* **BR_FORUM_001 (Ràng buộc 1 Vote/User & Idempotent Toggle):**
  * Mỗi người dùng (`user_id`) chỉ được phép vote tối đa 1 lượt duy nhất trên mỗi bài thảo luận hoặc câu trả lời (`post_id`). Danh tính `user_id` được tự động trích xuất bảo mật từ JWT Access Token của yêu cầu.
  * Việc bấm nút Upvote khi chưa vote sẽ ghi nhận bản ghi lượt vote mới vào bảng `forum_votes` và tăng `upvote_count + 1`.
  * Nếu người dùng bấm lại nút Upvote lần nữa, hệ thống tự động hủy lượt vote (Un-vote), xóa bản ghi khỏi `forum_votes` và giảm `upvote_count - 1`.
