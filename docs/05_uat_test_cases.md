# 05. KỊCH BẢN KIỂM THỬ NGHIỆM THU NGƯỜI DÙNG (UAT TEST CASES)

Tài liệu này định nghĩa các kịch bản kiểm thử nghiệm thu người dùng (User Acceptance Testing - UAT) nhằm xác minh **Hệ thống Quản lý Học tập Chuẩn Coursera (Coursera-style LMS)** hoạt động chính xác theo đúng các đặc tả nghiệp vụ và quy tắc vận hành đã đề ra.

---

## KỊCH BẢN UAT-01: KIỂM THỬ LUỒNG ĐĂNG KÝ HỌC & XÉT DUYỆT FINANCIAL AID

* **Mục tiêu:** Xác minh phân quyền rõ ràng giữa Audit Mode và Paid Mode, cùng quy trình nộp & xét duyệt đơn xin Hỗ trợ tài chính (Financial Aid).
* **Tác nhân thực hiện:** Học viên (Learner) & Super Admin (Platform Admin).
* **Điều kiện bắt đầu:** Khóa học "Lập trình Python Nâng cao" đã xuất bản ở chế độ Paid có hỗ trợ Financial Aid.
* **Các bước thực hiện:**
  1. **Học viên A** truy cập trang khóa học và chọn đăng ký chế độ **Audit Mode (Miễn phí)**.
  2. **Học viên A** vào xem video bài giảng và bài đọc. Sau đó bấm mở bài thi Graded Quiz.
  3. **Học viên B** truy cập trang khóa học và bấm chọn link **"Financial Aid available"**.
  4. **Học viên B** điền bài luận 150 từ giải trình lý do tài chính và bấm nút "Nộp đơn".
  5. **Super Admin** đăng nhập vào trang quản trị hệ thống, mở danh sách Financial Aid và chọn đơn của Học viên B để bấm **Approve (Phê duyệt)**.
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
  7. **Học viên D** bấm nút "Report Review" cho 1 lượt chấm bị cố tình cho điểm thấp bất thường.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* Nếu chưa tích Honor Code, nút Submit bị vô hiệu hóa. Khi nộp file code, Sandbox Auto-Grader chạy test cases và trả về bảng điểm chi tiết (ví dụ: Pass 4/5 test cases -> Điểm 80/100).
  * *Tại bước 3:* Hệ thống ghi nhận Học viên A đã hoàn thành chấm đủ lượt bài peer theo phân bổ và mở hiển thị trang kết quả điểm số cho A.
  * *Tại bước 4:* Điểm chính thức của Học viên B được tính bằng trung bình cộng: `(8 + 9 + 8) / 3 = 8.33 điểm` (Đạt Pass).
  * *Tại bước 5:* Hệ thống phát hiện chênh lệch điểm > 30%, tự động gắn cờ **"Outlier Flag"** gửi về bảng quản trị của Trợ giảng (TA).
  * *Tại bước 6:* Đơn khiếu nại của C gửi đến TA. TA chấm lại 9 điểm -> Hệ thống cập nhật điểm chính thức mới cho C là `9.0 điểm`.
  * *Tại bước 7:* Hệ thống ghi nhận đơn báo cáo của D, chuyển bài nộp sang trạng thái `PENDING_STAFF_REVIEW` và tạm ngưng cấp chứng chỉ cho đến khi TA duyệt xong để chống lạm dụng.

---

## KỊCH BẢN UAT-04: KIỂM THỬ DIỄN ĐÀN THẢO LUẬN & ĐIỀU PHỐI BÀI HỌC

* **Mục tiêu:** Xác minh tính năng thảo luận theo bài học, ghim câu trả lời của Trợ giảng (Staff Pinning) và Upvote câu trả lời hữu ích.
* **Tác nhân thực hiện:** Học viên & Trợ giảng (TA).
* **Điều kiện bắt đầu:** Học viên đang ở giao diện bài đọc Week 2 của khóa học.
* **Các bước thực hiện:**
  1. **Học viên** cuộn xuống mục Diễn đàn thảo luận (Forum) dưới bài học, gửi 1 câu hỏi thắc mắc.
  2. **Trợ giảng (TA)** đăng nhập vào diễn đàn, viết lời giải đáp cho câu hỏi của Học viên và bấm nút **"Staff Answer"**.
  3. Một **Học viên khác** bấm nút **Upvote** cho câu trả lời của Trợ giảng.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* Câu hỏi hiển thị trong mục thảo luận gắn liền với bài học hiện tại.
  * *Tại bước 2:* Câu trả lời của TA được đẩy lên đầu mục thảo luận với huy hiệu nổi bật **"Staff Answer"**.
  * *Tại bước 3:* Lượt Upvote tăng lên 1 và bài đăng được ưu tiên sắp xếp ở tab "Top Discussions".

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
  5. Học viên hoặc Nhà tuyển dụng bấm nút **"Tải chứng chỉ (PDF)"** trên `/verify/[certId]` (hoặc nút **"Tải PDF"** trong tab Chứng chỉ tại `/my-learning`).
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1 & 2:* Hệ thống hiển thị pháo hoa chúc mừng hoàn thành khóa học. Giao diện chứng chỉ hiển thị đẹp mắt với Tên học viên (Immutable Data Snapshot), Tên khóa học, Logo đối tác phát hành (Partner Logo), Chữ ký xác nhận, Mã chứng chỉ độc nhất (`CERT-8F9A2B3C`) và mã QR code sinh tự động in-memory SVG.
  * *Tại bước 3:* Hệ thống mở cửa sổ kết nối LinkedIn cho phép tự động điền các trường metadata OpenBadges (Name, Issuer, Certificate ID, Issue Date) vào hồ sơ cá nhân của học viên.
  * *Tại bước 4:* Trang xác thực công khai hiển thị trạng thái xanh **"Valid Verified Certificate"** kèm đầy đủ thông tin xác nhận chính chủ từ hệ thống, chứng minh chứng chỉ là thật và không bị giả mạo.
  * *Tại bước 5:* Hệ thống tải xuống tệp `Chung-chi-CERT-8F9A2B3C.pdf` khổ A4 ngang hiển thị đầy đủ Tiếng Việt, chữ ký bảo chứng và mã QR thật trỏ về URL xác thực; nếu chứng chỉ đã bị thu hồi (`is_revoked = True`), API trả về HTTP `403` và chặn xuất bản PDF.

---

## KỊCH BẢN UAT-06: KIỂM THỬ QUY TRÌNH SOẠN THẢO, CẤU HÌNH RUBRIC & XUẤT BẢN KHÓA HỌC (INSTRUCTOR FLOW)

* **Mục tiêu:** Xác minh Giảng viên có thể thiết lập chuyên ngành/khóa học, tạo cấu trúc tuần học, tải học liệu video + phụ đề VTT, chèn In-Video Quiz, cấu hình bộ tiêu chí Rubric bài tập chấm chéo và xuất bản (Publish) khóa học.
* **Tác nhân thực hiện:** Giảng viên (Instructor) & Trợ giảng (TA).
* **Điều kiện bắt đầu:** Giảng viên đã đăng nhập thành công vào trang Quản trị Giảng viên (Instructor Dashboard).
* **Các bước thực hiện:**
  1. Giảng viên bấm **"Tạo khóa học mới"**, nhập tên khóa học *"Lập trình Web Nâng cao"*, chọn Partner Branding và tạo cấu trúc Tuần 1 (Week 1).
  2. Giảng viên thêm bài học Video, tải lên tệp `video.mp4` kèm file phụ đề `subtitles.vtt`.
  3. Giảng viên thiết lập **In-Video Quiz** tại phút 03:15 với câu hỏi trắc nghiệm và đáp án chi tiết.
  4. Giảng viên tạo bài tập **Peer-Graded Assignment**, thiết lập bộ tiêu chí **Rubric** (gồm 2 tiêu chí, mỗi tiêu chí tối đa 5 điểm kèm mô tả hướng dẫn chi tiết cho học viên chấm chéo).
  5. Giảng viên tạo ngân hàng câu hỏi (Question Bank) cho bài thi Graded Quiz, cấu hình rút ngẫu nhiên 5 câu từ 10 câu, đặt Passing Threshold = 80% và chế độ không giới hạn lượt làm bài.
  6. Giảng viên kiểm tra lại toàn bộ nội dung và bấm nút **"Publish Course"** (Xuất bản khóa học).
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 2:* Hệ thống xử lý tải video thành công và tự động trích xuất chuỗi phụ đề thành **Interactive Transcript**.
  * *Tại bước 3:* Mốc thời gian 03:15 trên video được đánh dấu vị trí chèn quiz thành công.
  * *Tại bước 4:* Bộ Rubric được lưu cấu trúc đầy đủ chuẩn xác (tiêu chí, thang điểm và hướng dẫn chấm bài cho học viên).
  * *Tại bước 5:* Ngân hàng câu hỏi lưu 10 câu, cấu hình đề thi tính điểm hiển thị chính xác các tham số ngẫu nhiên.
  * *Tại bước 6:* Khóa học chuyển trạng thái từ `Draft` sang `Published`, hiển thị công khai trên danh mục khóa học (Catalog) cho Học viên đăng ký học.
  * *Tại bước 3:* Mốc thời gian 03:15 trên video được đánh dấu vị trí chèn quiz thành công.
  * *Tại bước 4:* Bộ Rubric được lưu cấu trúc đầy đủ chuẩn xác (tiêu chí, thang điểm và hướng dẫn chấm bài cho học viên).
  * *Tại bước 5:* Ngân hàng câu hỏi lưu 10 câu, cấu hình đề thi tính điểm hiển thị chính xác các tham số ngẫu nhiên & cooldown.
  * *Tại bước 6:* Khóa học chuyển trạng thái từ `Draft` sang `Published`, hiển thị công khai trên danh mục khóa học (Catalog) cho Học viên đăng ký học.

---

## KỊCH BẢN UAT-08: KIỂM THỬ HOÀN THÀNH KHÓA HỌC & ĐÁNH GIÁ CSAT (COURSE COMPLETION MODAL & REVIEW FLOW)

* **Mục tiêu:** Xác minh khi học viên hoàn thành từ 50% tiến độ bài học trở lên, hệ thống cho phép nộp Đánh giá CSAT kèm nhãn phân loại ("Verified Completer" vs "Active Learner Review").
* **Tác nhân thực hiện:** Học viên (Learner).
* **Điều kiện bắt đầu:** Học viên đã hoàn thành 99% bài học của khóa học *"Lập trình Web Nâng cao"*.
* **Các bước thực hiện:**
  1. Học viên nộp bài làm của bài học cuối cùng đạt điểm Pass (100% tiến độ).
  2. Màn hình tự động hiển thị **Course Completion Modal** chúc mừng kèm hiệu ứng pháo hoa.
  3. Học viên chọn số sao đánh giá (5 sao) và nhập bình luận: *"Khóa học rất chất lượng, kiến thức thực tế và bài tập bổ ích!"*.
  4. Học viên bấm nút **"Gửi đánh giá" (Submit Review)**.
  5. Học viên bấm nút **"Nhận chứng chỉ" (Claim Certificate)** trên Modal.
  6. Học viên truy cập lại trang chi tiết khóa học (`/courses/[courseId]`).
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 2:* Modal nổi bật với hiệu ứng pháo hoa rực rỡ, hiển thị thông điệp chúc mừng hoàn thành xuất sắc và form đánh giá sao.
  * *Tại bước 4:* Đánh giá được lưu thành công vào cơ sở dữ liệu, điểm số CSAT trung bình của khóa học được cập nhật ngay lập tức.
  * *Tại bước 5:* Hệ thống điều hướng trực tiếp sang trang xác thực chứng chỉ (`/verify/CERT-xxx`).
  * *Tại bước 6:* Đánh giá của học viên vừa gửi hiển thị công khai tại mục "Reviews & Ratings" trên trang thông tin khóa học.

---

## KỊCH BẢN UAT-09: KIỂM THỬ GHI NHỚ & TỰ ĐỘNG KHÔI PHỤC VỊ TRÍ PHÁT VIDEO (VIDEO AUTO-RESUME FLOW)

* **Mục tiêu:** Xác minh hệ thống lưu vết vị trí xem dở của bài học video theo thời gian thực, tự động khôi phục vị trí khi tải lại trang hoặc quay lại từ `/my-learning`, hỗ trợ "Xem lại từ đầu", và đặt lại về `00:00` khi video chạy hết.
* **Tác nhân thực hiện:** Học viên (Learner).
* **Điều kiện bắt đầu:** Học viên đã ghi danh khóa học có các bài học Video (gắn phụ đề Transcript và có 1 In-Video Quiz ở mốc 00:45).
* **Các bước thực hiện:**
  1. Học viên mở Video bài giảng 1, xem hoặc tua đến mốc **01:30**, tạm dừng (Pause) hoặc chuyển sang Video bài giảng 2.
  2. Học viên tải lại trang (`/learn/[courseId]`) hoặc quay lại `/my-learning` rồi bấm **"Tiếp tục học"**.
  3. Trên thông báo Toast khôi phục vị trí, học viên bấm nút **"Xem lại từ đầu"**.
  4. Học viên xem Video bài giảng 1 đến hết (`onEnded`) hoặc trong 5 giây cuối của video.
  5. Học viên tải lại trang và mở lại Video bài giảng 1.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* Vị trí `90s` được lưu qua `SaveVideoPosition` (ngay khi Pause / keepalive khi đổi bài); sidebar lộ trình hiển thị `• Đã xem 01:30` cho bài giảng chưa hoàn thành.
  * *Tại bước 2:* Hệ thống mở đúng Video bài giảng 1, trình phát tự động tua tới **01:30**, bảng Transcript cuộn/sáng đúng đoạn 01:30, In-Video Quiz ở 00:45 được tự động bỏ qua, và Toast hiển thị `"Đã tiếp tục từ 01:30"` kèm nút **"Xem lại từ đầu"**.
  * *Tại bước 3:* Trình phát lập tức tua về **00:00**, Toast tự đóng, bộ đánh dấu In-Video Quiz được đặt lại và server lưu vị trí mới là `0`.
  * *Tại bước 4 & 5:* Video được đánh dấu hoàn thành, đồng thời vị trí phát được tự động chuẩn hóa đặt lại về **00:00** để lần mở xem lại sau phát từ đầu mà vẫn giữ dấu tích hoàn thành.

---

## KỊCH BẢN UAT-10: KIỂM THỬ LƯU NHÁP BÀI QUIZ CHỐNG MẤT BÀI & KHÔI PHỤC PHIÊN LÀM BÀI (QUIZ DRAFT AUTO-SAVE & RECOVERY FLOW)

* **Mục tiêu:** Xác minh hệ thống tự động lưu nháp các đáp án đã chọn khi làm bài Quiz, bảo toàn đề thi và thời gian đếm ngược khi tải lại trang (F5) hoặc tạm thoát, hỗ trợ xác nhận khi làm lại từ đầu và xóa sạch bản nháp sau khi nộp bài.
* **Tác nhân thực hiện:** Học viên (Learner - Paid Mode).
* **Điều kiện bắt đầu:** Học viên mở một bài Graded Quiz hoặc Practice Quiz có 5 câu hỏi trắc nghiệm.
* **Các bước thực hiện:**
  1. Học viên mở bài Quiz ở màn hình Tổng quan, quan sát trạng thái ban đầu rồi bấm **"Bắt đầu làm bài"**.
  2. Học viên chọn đáp án cho 3/5 câu hỏi và quan sát huy hiệu trạng thái lưu nháp trên thanh công cụ.
  3. Học viên bấm tải lại trình duyệt (**F5**) hoặc bấm nút **"Lưu nháp & Tạm thoát"**.
  4. Tại màn hình Tổng quan, học viên bấm nút **"Tiếp tục làm bài"**.
  5. Học viên chọn nốt 2 câu còn lại, bấm **"Nộp bài thi"**, tích xác nhận Cam kết Trung thực và nộp bài.
* **Kết quả mong đợi (Expected Results):**
  * *Tại bước 1:* Màn hình Tổng quan không tự động chạy đồng hồ trước khi bấm bắt đầu; sau khi bấm **"Bắt đầu làm bài"**, phiên thi mới được khởi tạo.
  * *Tại bước 2:* Đáp án được lưu tức thì vào `localStorage` và đồng bộ lên Server sau 1 giây; huy hiệu hiển thị trạng thái **"Đã lưu nháp"**.
  * *Tại bước 3:* Màn hình Tổng quan hiển thị thẻ thông báo **"Phiên làm bài đang được bảo toàn (Đã chọn 3/5 câu)"** kèm thời gian đếm ngược còn lại cùng 2 nút **"Tiếp tục làm bài"** và **"Làm bài mới từ đầu"**.
  * *Tại bước 4:* Hệ thống mở lại đúng bộ câu hỏi và thứ tự phương án cũ, giữ nguyên 3 đáp án đã chọn trước đó và đồng hồ đếm ngược tiếp tục chạy từ mốc Server (không bị reset lại từ đầu).
  * *Tại bước 5:* Bài thi được chấm điểm chính xác và bản nháp trong cả `quiz_active_sessions` lẫn `localStorage` được dọn sạch hoàn toàn.

