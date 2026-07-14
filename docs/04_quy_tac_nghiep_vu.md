# 04. DANH MỤC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

Tài liệu này tập hợp và quản lý tập trung toàn bộ các quy tắc logic nghiệp vụ (Business Rules - BR) và quy chế vận hành của hệ thống. Các luật này là điều kiện ràng buộc đối với lập trình viên khi viết code xử lý ở Backend.

---

## 1. Quy tắc Ghi danh & Sở hữu Khóa học (Enrollment & Commercialization)

*   **BR_ENROLL_001 (Thời hạn truy cập):** 
    *   Đối với mô hình Học thuật (nội bộ trường học): Tài khoản học viên được truy cập khóa học trong vòng 1 học kỳ (mặc định là 5 tháng kể từ ngày bắt đầu học kỳ) hoặc cho đến khi khóa học bị đóng bởi giảng viên.
    *   Đối với mô hình Thương mại: Học viên tự mua khóa học được quyền truy cập trọn đời (lifetime access), trừ trường hợp tài khoản của họ bị khóa hoặc khóa học bị ẩn do vi phạm bản quyền.
*   **BR_ENROLL_002 (Quy chế Mã mời - Redeem Code):**
    *   Mỗi mã mời chỉ được kích hoạt tối đa cho 1 tài khoản học viên (sử dụng 1 lần duy nhất).
    *   Mã mời phải có thời hạn hiệu lực tối đa là 12 tháng kể từ ngày giảng viên tạo mã. Sau thời gian này, mã chưa sử dụng sẽ bị vô hiệu hóa.
    *   Mỗi tài khoản học viên không bị giới hạn số lượng mã mời sử dụng cho các khóa học khác nhau, nhưng không thể sử dụng nhiều mã mời cho cùng một khóa học.
*   **BR_ENROLL_003 (Chính sách hủy/hoàn tiền):**
    *   Trong mô hình thương mại, học viên có quyền gửi yêu cầu hoàn tiền trong vòng 7 ngày kể từ lúc thanh toán.
    *   *Điều kiện hoàn tiền:* Tiến độ học tập thực tế của học viên trong khóa học đó phải nhỏ hơn 10% và học viên chưa thực hiện bất kỳ bài thi trắc nghiệm nào trong khóa học.

---

## 2. Quy tắc Cam kết SLA và Hỗ trợ 1-1 (SLA & 1-1 Support)

*   **BR_SLA_001 (Thời gian đặt lịch tối thiểu):** Học viên khi gửi yêu cầu hỗ trợ 1-1 phải chọn các khung giờ rảnh nằm trong tương lai và cách thời điểm hiện tại tối thiểu 12 tiếng để giảng viên có đủ thời gian chuẩn bị và xác nhận.
*   **BR_SLA_002 (Giới hạn hủy lịch):**
    *   Cả học viên và giảng viên đều có quyền hủy lịch hẹn đã xác nhận trước giờ bắt đầu tối thiểu 2 tiếng.
    *   Nếu học viên hủy lịch quá 3 lần trong một khóa học, hệ thống sẽ khóa quyền tạo yêu cầu hỗ trợ 1-1 của học viên đó đối với khóa học này trong vòng 14 ngày.
*   **BR_SLA_003 (Xử lý vi phạm SLA hỗ trợ):**
    *   Kể từ lúc học viên gửi yêu cầu hỗ trợ 1-1, giảng viên đứng lớp phải thực hiện xác nhận lịch hẹn trong vòng 48 tiếng. Quá thời gian này, hệ thống sẽ gửi thông báo cảnh cáo tự động đến giảng viên và lưu log vi phạm vào Dashboard giám sát của Admin.
    *   Nếu giảng viên không tham gia phòng họp Google Meet (trên hệ thống ghi nhận không có hoạt động bấm nút "Tham gia Meet" từ giảng viên) khi quá giờ hẹn 15 phút, buổi hỗ trợ tự động tính là "Giảng viên vắng mặt", và hệ thống tự động hoàn lại lượt yêu cầu cho học viên.

---

## 3. Quy tắc An toàn và Phạm vi hoạt động của Trợ lý AI (AI Chat & Guardrails)

*   **BR_AI_001 (Danh mục cấm hỏi AI):** Trợ lý AI có bộ lọc từ chối trả lời lập tức nếu câu hỏi chứa các từ khóa nhạy cảm thuộc các chủ đề: Chính trị quốc gia, Tôn giáo, Bạo lực/Xúc phạm, Yêu cầu viết mã nguồn hoặc giải quyết các công việc cá nhân nằm ngoài nội dung tài liệu khóa học.
*   **BR_AI_002 (Cơ chế cảnh cáo và phạt cấm chat):**
    *   Mỗi lần học viên cố tình vi phạm gửi câu hỏi nằm trong danh mục cấm (bị Input Guard chặn), hệ thống sẽ tăng điểm cảnh cáo của học viên lên 1 điểm.
    *   Nếu điểm cảnh cáo đạt 3 điểm trong vòng 10 phút, hệ thống sẽ tự động khóa quyền sử dụng Trợ lý AI của học viên đó trên toàn bộ khóa học trong vòng 24 giờ.
    *   Lịch sử vi phạm sẽ được gửi trực tiếp đến hộp thư giám sát của Giảng viên khóa học.
*   **BR_AI_003 (Nguyên tắc RAG Fallback):** Trợ lý AI tuyệt đối không được tự ý sinh phản hồi (Hallucination) khi không tìm thấy nội dung liên quan trong cơ sở dữ liệu tri thức của khóa học. AI bắt buộc phải phản hồi bằng câu thoại mặc định: *"Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu học tập của khóa học. Bạn có thể gửi yêu cầu hỗ trợ 1-1 để trao đổi trực tiếp với Giảng viên."*

---

## 4. Quy tắc Tính Tiến độ học tập & Điểm số (SCORM & Quizzes Progress)

*   **BR_PROGRESS_001 (Điều kiện hoàn thành Bài học):**
    *   *Video:* Học viên phải xem tích lũy đạt tối thiểu 90% tổng thời lượng của video.
    *   *PDF/Tài liệu đọc:* Học viên phải mở tài liệu và có hành động cuộn trang (scroll) xuống trang cuối cùng, đồng thời giữ phiên mở tài liệu tối thiểu 120 giây.
    *   *SCORM:* Tiến trình bài giảng SCORM chỉ được ghi nhận là "Hoàn thành" khi gói SCORM trả về biến trạng thái `cmi.core.lesson_status` (SCORM 1.2) hoặc `cmi.completion_status` (SCORM 2004) có giá trị là `"completed"` hoặc `"passed"`.
*   **BR_PROGRESS_002 (Điểm số thi lại trắc nghiệm):**
    *   Mỗi bài thi trắc nghiệm cuối chương/khóa học được làm tối đa 3 lần (do giảng viên cấu hình).
    *   Hệ thống sẽ lấy **điểm số cao nhất** của các lần thi làm điểm chính thức để xét điều kiện cấp OpenBadges, đồng thời lưu trữ đầy đủ lịch sử điểm số của tất cả các lần thi để giảng viên giám sát.

---

## 5. Quy tắc Cấp phát và Thu hồi Huy hiệu số (OpenBadges Certification)

*   **BR_BADGE_001 (Điều kiện cấp Huy hiệu tự động):**
    Hệ thống chỉ kích hoạt tiến trình cấp Huy hiệu số cho học viên khi đạt đồng thời 2 điều kiện:
    1.  `Tiến độ học tập khóa học = 100%` (Tất cả bài học cấu thành đều có trạng thái hoàn thành).
    2.  `Điểm số bài thi trắc nghiệm cuối kỳ >= 8.0` (trên thang điểm 10).
*   **BR_BADGE_002 (Quy tắc Thu hồi Huy hiệu):**
    *   Super Admin có quyền thu hồi Huy hiệu số đã cấp cho học viên nếu phát hiện học viên gian lận học thuật hoặc tài khoản bị khóa do vi phạm điều khoản dịch vụ.
    *   Khi lệnh thu hồi được kích hoạt, tệp tin ảnh huy hiệu đã bake metadata trước đó khi gửi truy vấn xác thực về endpoint hệ thống sẽ trả về kết quả `"Revoked"` (Không hợp lệ).
