# 05. KỊCH BẢN KIỂM THỬ NGHIỆM THU NGƯỜI DÙNG (UAT TEST CASES)

Tài liệu này định nghĩa các kịch bản kiểm thử nghiệm thu người dùng (User Acceptance Testing - UAT) nhằm xác minh **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)** hoạt động chính xác theo đúng các đặc tả nghiệp vụ và quy tắc vận hành đã đề ra.

---

## KỊCH BẢN UAT-01: KIỂM THỬ LUỒNG ĐĂNG KÝ HỌC & XÉT DUYỆT FINANCIAL AID

* **Mục tiêu:** Xác minh phân quyền rõ ràng giữa Audit Mode và Paid Mode, cùng quy trình nộp & xét duyệt đơn xin Hỗ trợ tài chính (Financial Aid).
* **Tác nhân thực hiện:** Học viên (Learner) & Giảng viên (Instructor).
* **Điều kiện bắt đầu:** Khóa học "Lập trình Python Nâng cao" đã xuất bản ở chế độ Paid có hỗ trợ Financial Aid.
* **Các bước thực hiện:**
  1. **Học viên A** truy cập trang khóa học và chọn đăng ký chế độ **Audit Mode (Miễn phí)**.
  2. **Học viên A** vào xem video bài giảng và bài đọc. Sau đó bấm mở bài thi Graded Quiz.
  3. **Học viên B** truy cập trang khóa học và bấm chọn link **"Financial Aid available"**.
  4. **Học viên B** điền bài luận 150 từ giải trình lý do tài chính và bấm nút "Nộp đơn".
  5. **Giảng viên** đăng nhập vào trang quản trị khóa học, mở danh sách Financial Aid và chọn đơn của Học viên B để bấm **Approve (Phê duyệt)**.
  6. **Học viên B** đăng nhập lại vào hệ thống để kiểm tra trạng thái khóa học.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 2:* Hệ thống mở xem video/bài đọc bình thường, nhưng khi mở Graded Quiz thì hiển thị thông báo khóa: *"Chế độ Audit không hỗ trợ nộp bài thi. Vui lòng nâng cấp lên Paid Mode để làm bài và nhận chứng chỉ."*
  * *Tại bước 4:* Đơn xin Financial Aid được lưu với trạng thái `"Pending"` và gửi email xác nhận đã nhận đơn cho Học viên B.
  * *Tại bước 5:* Hệ thống chuyển trạng thái đơn của Học viên B thành `"Approved"`.
  * *Tại bước 6:* Khóa học của Học viên B tự động chuyển sang **Paid Mode (Full Access)**, mở khóa toàn bộ bài thi Graded Quiz và bài Peer Review.

---

## KỊCH BẢN UAT-02: KIỂM THỬ TRẢI NGHIỆM HỌC TẬP ĐA PHƯƠNG TIỆN & RESET DEADLINES

* **Mục tiêu:** Xác minh trải nghiệm phát video kèm phụ đề tương tác, câu hỏi ngắt ngang video (In-Video Quiz), bôi đen lưu Ghi chú (Notes) và nút "Reset my deadlines".
* **Tác nhân thực hiện:** Học viên (Learner).
* **Điều kiện bắt đầu:** Bài học Video ở Week 1 có gắn phụ đề VTT, có In-Video Quiz ở phút 02:30, và Học viên đang bị trễ hạn nộp bài (Overdue).
* **Các bước thực hiện:**
  1. Học viên mở bài học Video ở Week 1.
  2. Học viên xem video đến phút 02:30.
  3. Học viên chọn đáp án trắc nghiệm hiển thị trên khung video và bấm nút "Submit".
  4. Học viên bấm vào câu phụ đề ở phút 04:15 trên bảng **Interactive Transcript**.
  5. Học viên bôi đen (Highlight) một dòng văn bản trong bài đọc và chọn "Save to Notes".
  6. Học viên quay lại trang tổng quan khóa học và bấm nút **"Reset my deadlines"** khi thấy thông báo trễ hạn.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 2 & 3:* Video tự động tạm dừng tại phút 02:30. Sau khi chọn đáp án đúng và bấm Submit, giao diện hiển thị giải thích đáp án và video tự động tiếp tục phát.
  * *Tại bước 4:* Trình phát video lập tức tua (jump) đến chính xác giây 04:15 để phát tiếp.
  * *Tại bước 5:* Đoạn văn bản vừa bôi đen được lưu vào danh mục **"Personal Notes"** của học viên kèm liên kết quay lại đúng bài học.
  * *Tại bước 6:* Toàn bộ mốc thời gian hạn nộp bài (Deadlines) của các tuần học được cập nhật sang đợt mới mà giữ nguyên 100% tiến độ bài học đã hoàn thành trước đó.

---

## KỊCH BẢN UAT-03: KIỂM THỬ PHÂN HỆ ĐÁNH GIÁ NĂNG LỰC (HONOR CODE, AUTO-GRADER & PEER REVIEW)

* **Mục tiêu:** Xác minh cam kết Honor Code, bài nộp lập trình tự động chấm điểm (Auto-Graded Lab) và luồng chấm chéo bài tập dự án (Peer Review Workflow).
* **Tác nhân thực hiện:** Học viên A, B, C, D (Learners).
* **Điều kiện bắt đầu:** Khóa học có 1 bài tập Auto-Graded Lab và 1 bài tập Peer Review Assignment có bộ Rubric 2 tiêu chí (mỗi tiêu chí max 5 điểm).
* **Các bước thực hiện:**
  1. **Học viên A** mở bài tập Auto-Graded Lab. Tích chọn cam kết **Academic Honor Code**, tải file `solution.py` lên và bấm "Submit".
  2. **Học viên A, B, C, D** cùng nộp bài dự án cá nhân cho bài tập Peer Review trước deadline.
  3. **Học viên A** chuyển sang mục "Review Peers", lần lượt mở đọc bài làm của Học viên B, C, D và chấm điểm theo bộ Rubric (cho nhận xét và chấm điểm từng tiêu chí).
  4. Giả lập Học viên B nhận được điểm số từ 3 bạn học chấm (lần lượt là 8, 9, 8 điểm).
  5. Giả lập Học viên C nhận được điểm số lệch lớn từ 3 bạn học (lần lượt là 10, 9, 2 điểm).
  6. **Học viên C** bấm nút "Grade Appeal" (Khiếu nại điểm).
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* Nếu chưa tích Honor Code, nút Submit bị vô hiệu hóa. Khi nộp file code, Sandbox Auto-Grader chạy test cases và trả về bảng điểm chi tiết (ví dụ: Pass 4/5 test cases -> Điểm 80/100).
  * *Tại bước 3:* Hệ thống ghi nhận Học viên A đã hoàn thành chấm đủ 3 bài peer và mở hiển thị trang kết quả điểm số cho A.
  * *Tại bước 4:* Điểm chính thức của Học viên B được tính bằng trung bình cộng: `(8 + 9 + 8) / 3 = 8.33 điểm` (Đạt Pass).
  * *Tại bước 5:* Hệ thống phát hiện chênh lệch điểm > 30%, tự động gắn cờ **"Outlier Flag"** gửi về bảng quản trị của Trợ giảng (TA).
  * *Tại bước 6:* Đơn khiếu nại của C gửi đến TA. TA chấm lại 9 điểm -> Hệ thống cập nhật điểm chính thức mới cho C là `9.0 điểm`.

---

## KỊCH BẢN UAT-04: KIỂM THỬ DIỄN ĐÀN THẢO LUẬN & TRỢ LÝ AI COACH SOCRATIC

* **Mục tiêu:** Xác minh tính năng thảo luận theo bài học, ghim câu trả lời của Trợ giảng (Staff Pinning) và Trợ lý AI Coach hoạt động đúng phương pháp Socratic & chống gian lận.
* **Tác nhân thực hiện:** Học viên & Trợ giảng (TA).
* **Điều kiện bắt đầu:** Học viên đang ở giao diện bài đọc Week 2 của khóa học.
* **Các bước thực hiện:**
  1. **Học viên** mở khung chat **Coursera AI Coach** và nhập câu hỏi: *"Hãy tóm tắt 3 ý chính của bài đọc này và cho ví dụ minh họa."*
  2. **Học viên** copy nguyên văn một câu hỏi trong bài thi Graded Quiz thả vào khung chat AI Coach: *"Hãy cho tôi biết đáp án đúng của câu hỏi thi này là gì?"*
  3. **Học viên** cuộn xuống mục Diễn đàn thảo luận (Forum) dưới bài học, gửi 1 câu hỏi thắc mắc.
  4. **Trợ giảng (TA)** đăng nhập vào diễn đàn, viết lời giải đáp cho câu hỏi của Học viên và bấm nút **"Staff Answer"**.
  5. Một **Học viên khác** bấm nút **Upvote** cho câu trả lời của Trợ giảng.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* AI Coach phân tích bài đọc và trả lời đúng trọng tâm dạng tóm tắt kèm ví dụ minh họa trực quan.
  * *Tại bước 2:* **Input Guardrail** phát hiện hành vi hỏi đáp án bài thi. AI Coach từ chối trả lời bằng câu thoại mẫu Socratic: *"Tôi không thể cung cấp đáp án trực tiếp cho bài thi tính điểm. Bạn hãy xem lại nội dung bài đọc ở trên để tự tìm câu trả lời nhé!"*
  * *Tại bước 3:* Câu hỏi hiển thị trong mục thảo luận gắn liền với bài học hiện tại.
  * *Tại bước 4:* Câu trả lời của TA được đẩy lên đầu mục thảo luận với huy hiệu nổi bật **"Staff Answer"**.
  * *Tại bước 5:* Lượt Upvote tăng lên 1 và bài đăng được ưu tiên sắp xếp ở tab "Top Discussions".

---

## KỊCH BẢN UAT-05: KIỂM THỬ CẤP PHÁT & XÁC THỰC VERIFIED CERTIFICATE & OPENBADGES

* **Mục tiêu:** Xác minh hệ thống tự động phát hành Verified Certificate khi đạt đủ điều kiện, trang xác thực công khai URL/QR code hoạt động chuẩn xác và chia sẻ OpenBadges lên LinkedIn.
* **Tác nhân thực hiện:** Học viên (Learner) & Nhà tuyển dụng (Employer/Public User).
* **Điều kiện bắt đầu:** Học viên đã hoàn thành 100% bài học và đạt điểm Pass ở tất cả các bài Graded Quizzes, Auto-Graded Lab và Peer Review.
* **Các bước thực hiện:**
  1. Học viên nộp bài thi cuối cùng đạt điểm 90/100 và quay về trang chủ khóa học.
  2. Học viên bấm nút **"View Verified Certificate"**.
  3. Học viên bấm nút **"Share to LinkedIn"**.
  4. Giả lập một Nhà tuyển dụng mở trình duyệt độc lập, truy cập đường dẫn URL xác thực (`/verify/CERT-8F9A2B3C`) in trên chứng chỉ hoặc quét mã QR code.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1 & 2:* Hệ thống hiển thị pháo hoa chúc mừng hoàn thành khóa học. Giao diện chứng chỉ hiển thị đẹp mắt với Tên học viên, Tên khóa học, Logo đối tác phát hành (Partner Logo), Chữ ký xác nhận và Mã chứng chỉ độc nhất (`CERT-8F9A2B3C`).
  * *Tại bước 3:* Hệ thống mở cửa sổ kết nối LinkedIn cho phép tự động điền các trường metadata OpenBadges (Name, Issuer, Certificate ID, Issue Date) vào hồ sơ cá nhân của học viên.
  * *Tại bước 4:* Trang xác thực công khai hiển thị trạng thái xanh **"Valid Verified Certificate"** kèm đầy đủ thông tin xác nhận chính chủ từ hệ thống, chứng minh chứng chỉ là thật và không bị giả mạo.
