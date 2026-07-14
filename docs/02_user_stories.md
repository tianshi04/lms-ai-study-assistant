# 02. DANH SÁCH USER STORIES CỐT LÕI (USER STORIES BACKLOG)

Tài liệu này tổng hợp các User Stories (câu chuyện người dùng) cốt lõi của hệ thống LMS tích hợp Trợ lý AI. Tài liệu được thiết kế bám sát các nguyên tắc viết User Story chuyên nghiệp:
1.  **User phải là con người thực tế:** Không dùng các thực thể hệ thống làm chủ thể.
2.  **Tập trung vào Problem Space (Không mang hình ảnh System/Solution):** Chỉ mô tả vấn đề và nhu cầu của người dùng, không đưa các giải pháp kỹ thuật (như tên phần mềm bên thứ ba, định dạng file, cơ chế UI hay hoạt động ngầm của hệ thống) vào mô tả câu chuyện.
3.  **Tên User Story bắt đầu bằng Danh từ.**
4.  **Mô tả Story theo công thức chủ động:** *Là ai + cần làm gì + để làm gì?*

---

## 1. Bảng Tổng hợp Mã User Stories

| ID | Tác nhân | Tên User Story (Bắt đầu bằng Danh từ) | Trạng thái |
| :--- | :--- | :--- | :--- |
| **US_01** | Super Admin | Tài khoản giảng viên và học viên | Sẵn sàng |
| **US_02** | Super Admin | Quy tắc hoạt động và chi phí AI | Sẵn sàng |
| **US_03** | Super Admin | Chỉ số chất lượng giảng dạy | Sẵn sàng |
| **US_04** | Giảng viên | Khóa học và học liệu | Sẵn sàng |
| **US_05** | Giảng viên | Nội dung tri thức cho Trợ lý AI | Sẵn sàng |
| **US_06** | Giảng viên | Tiến độ học tập và hỗ trợ học viên | Sẵn sàng |
| **US_07** | Học viên | Bài học đa phương tiện | Sẵn sàng |
| **US_08** | Học viên | Trợ giúp kiến thức từ Trợ lý AI | Sẵn sàng |
| **US_09** | Học viên | Buổi gặp mặt hỗ trợ 1-1 | Sẵn sàng |
| **US_10** | Học viên | Bài kiểm tra và Chứng nhận năng lực | Sẵn sàng |
| **US_11** | Học viên | Ý kiến đóng góp về khóa học | Sẵn sàng |

---

## 2. Chi tiết các User Stories (Problem Space)

### 2.1. VAI TRÒ: SUPER ADMIN (QUẢN TRỊ HỆ THỐNG)

#### US_01: Tài khoản giảng viên và học viên
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Super Admin (Quản trị viên),
    *   **Tôi muốn** quản lý quyền truy cập và hoạt động của các thành viên trên hệ thống,
    *   **Để** duy trì môi trường học tập an toàn và cấp quyền nhanh chóng cho giảng viên mới và học viên mới tham gia.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    *   *AC 1:* Admin có thể cấp quyền đăng nhập và tạo thông tin người dùng mới cho giảng viên và học viên.
    *   *AC 2:* Admin có thể thu hồi quyền truy cập (khóa hoạt động) của người dùng vi phạm quy định.

#### US_02: Quy tắc hoạt động và chi phí AI
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Super Admin (Quản trị viên),
    *   **Tôi muốn** thiết lập các giới hạn hoạt động và theo dõi các chi phí phát sinh từ việc sử dụng Trợ lý AI,
    *   **Để** đảm bảo Trợ lý AI hoạt động đúng chức năng giáo dục và chi phí nằm trong tầm kiểm soát của ngân sách.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Admin có thể kết nối hệ thống với dịch vụ AI và kiểm tra tín hiệu hoạt động thành công.
    *   *AC 2:* Admin xem được thống kê chi phí phát sinh dựa trên số lượng câu hỏi AI của học viên theo thời gian thực.

#### US_03: Chỉ số chất lượng giảng dạy
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Super Admin (Quản trị viên),
    *   **Tôi muốn** theo dõi mức độ hài lòng của học viên đối với giảng viên và các nội dung bị tố cáo vi phạm,
    *   **Để** tôi có căn cứ đánh giá hiệu quả dạy học và xử lý các bài giảng kém chất lượng.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Admin xem được tổng hợp mức độ hài lòng của học viên đối với sự hỗ trợ của từng giảng viên.
    *   *AC 2:* Admin nhận được thông báo tố cáo bài giảng bị lỗi từ học viên để tiến hành xử lý (nhắc nhở hoặc ẩn bài giảng đó).

---

### 2.2. VAI TRÒ: GIẢNG VIÊN (TEACHER)

#### US_04: Khóa học và học liệu
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Giảng viên,
    *   **Tôi muốn** tổ chức khóa học và cung cấp các nguồn học liệu học tập phong phú (video, bài đọc, slide tương tác),
    *   **Để** học viên của tôi có đủ kiến thức tự học một cách trực quan.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Giảng viên tạo được khung khóa học, chia bài giảng theo từng chương mục rõ ràng.
    *   *AC 2:* Giảng viên đăng tải được tài nguyên học tập lên khóa học và hiển thị chính xác cho học viên.

#### US_05: Nội dung tri thức cho Trợ lý AI
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Giảng viên,
    *   **Tôi muốn** Trợ lý AI trong khóa học của tôi trả lời các câu hỏi dựa trên đúng nội dung bài dạy mà tôi đã cung cấp,
    *   **Để** học viên nhận được câu trả lời chính xác theo giáo trình của trường và tránh việc AI trả lời lạc đề.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Trợ lý AI trả lời câu hỏi dựa trên các tài liệu bài đọc do giảng viên cung cấp trong khóa học.
    *   *AC 2:* Giảng viên có thể chọn bật hoặc tắt quyền truy cập của AI đối với từng tài liệu cụ thể.

#### US_06: Tiến độ học tập và hỗ trợ học viên
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Giảng viên,
    *   **Tôi muốn** theo dõi kết quả học tập của lớp học và đặt lịch hẹn kết nối trực tiếp với những học viên đang gặp khó khăn,
    *   **Để** tôi kịp thời giảng giải và hướng dẫn giúp học viên cải thiện điểm số.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Giảng viên xem được bảng tiến trình hoàn thành bài học và điểm thi trắc nghiệm của từng học viên.
    *   *AC 2:* Giảng viên lên được lịch hẹn trò chuyện trực tuyến và ghi chú tóm tắt hướng xử lý cho học viên.

---

### 2.3. VAI TRÒ: HỌC VIÊN (STUDENT)

#### US_07: Bài học đa phương tiện
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Học viên,
    *   **Tôi muốn** học tập thông qua các video bài giảng, tài liệu bài đọc và các slide tương tác thông minh,
    *   **Để** tôi tiếp thu bài dễ dàng và có thể học tiếp từ vị trí tạm dừng trước đó.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Hệ thống tự động ghi nhận học viên hoàn thành bài học sau khi học xong tài liệu/video.
    *   *AC 2:* Giao diện tự động mở lại đúng phần bài học mà học viên đang xem dở trước khi tắt trình duyệt.

#### US_08: Trợ giúp kiến thức từ Trợ lý AI
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Học viên,
    *   **Tôi muốn** nhận được câu trả lời giải đáp thắc mắc về bài học từ Trợ lý AI ngay lập tức,
    *   **Để** tôi có thể tiếp tục học tập mà không bị gián đoạn khi chưa hiểu bài.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Trợ lý AI trả lời câu hỏi dựa trên đúng tài liệu học tập của khóa học hiện tại.
    *   *AC 2:* Trợ lý AI từ chối trả lời nếu học viên hỏi lạc đề ngoài bài học hoặc sử dụng từ ngữ thiếu lịch sự.

#### US_09: Buổi gặp mặt hỗ trợ 1-1
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Học viên,
    *   **Tôi muốn** đăng ký gặp mặt giảng viên để được hướng dẫn trực tiếp khi gặp bài học quá khó,
    *   **Để** tôi giải quyết triệt để các vướng mắc của mình.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Học viên gửi được yêu cầu hỗ trợ và nhận được thông báo thời gian họp trực tuyến từ giảng viên.
    *   *AC 2:* Học viên gửi được nhận xét về mức độ nhiệt tình giải đáp của giảng viên sau khi kết thúc buổi hỗ trợ.

#### US_10: Bài kiểm tra và Chứng nhận năng lực
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Học viên,
    *   **Tôi muốn** làm các bài kiểm tra năng lực trực tuyến và nhận được huy hiệu chứng nhận khi hoàn thành khóa học đạt kết quả tốt,
    *   **Để** tôi tự đánh giá trình độ và chứng minh kỹ năng của mình trên hồ sơ cá nhân LinkedIn.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Học viên hoàn thành bài thi trắc nghiệm có giới hạn thời gian và biết được điểm số cùng đáp án giải thích ngay sau khi nộp bài.
    *   *AC 2:* Học viên nhận được ảnh huy hiệu số có chứa thông tin xác thực để chia sẻ lên hồ sơ LinkedIn cá nhân khi hoàn thành khóa học.

#### US_11: Ý kiến đóng góp về khóa học
*   **Mô tả Story (Chủ động - Problem Space):**
    *   **Là một** Học viên,
    *   **Tôi muốn** nhận xét cảm nhận của mình về khóa học và gửi báo cáo tố cáo bài học bị sai sót lên ban quản trị,
    *   **Để** giúp học viên khác lựa chọn khóa học tốt hơn và giúp nhà trường cải thiện chất lượng bài dạy.
*   **Tiêu chí nghiệm thu:**
    *   *AC 1:* Học viên gửi được đánh giá và nhận xét công khai hiển thị trên trang giới thiệu khóa học.
    *   *AC 2:* Học viên gửi được báo cáo tố cáo lỗi bài giảng hoặc giảng viên bỏ bê hỗ trợ trực tiếp đến quản trị viên.
