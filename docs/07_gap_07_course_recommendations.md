# Tài liệu Nghiệp vụ: Hệ thống Đề xuất Khóa học (GAP-07)

## 1. Tổng quan
Tính năng đề xuất khóa học (Course Recommendations) nhằm mục đích cá nhân hóa trải nghiệm học tập của sinh viên bằng cách cung cấp các gợi ý khóa học phù hợp dựa trên hành vi học tập, xu hướng hệ thống và lịch sử tương tác. Tính năng này được chia làm 3 phân hệ chính.

## 2. Các Phân hệ Đề xuất

### 2.1. Tiếp tục học (Continue Learning)
- **Mục tiêu**: Nhắc nhở và khuyến khích sinh viên hoàn thành các khóa học đang học dở dang.
- **Logic nghiệp vụ**: 
  - Truy xuất các khóa học mà user hiện tại đã ghi danh (enrolled) nhưng tiến độ (progress) chưa đạt 100%.
  - Các khóa học được sắp xếp ưu tiên theo thời gian tương tác (học) gần nhất.

### 2.2. Khóa học Nổi bật (Trending Courses)
- **Mục tiêu**: Hiển thị các khóa học đang thu hút nhiều sự quan tâm nhất trong cộng đồng học tập, kích thích sự tò mò của học viên.
- **Logic nghiệp vụ**:
  - Đánh giá dựa trên các hành vi: tổng số lượt xem (views), lượt đăng ký (enrollments) và lượt hoàn thành (completions) trong 7 ngày gần nhất.
  - Điểm xu hướng (`trending_score`) được tính dựa trên trọng số của từng loại tương tác (ví dụ: view = 1 điểm, enroll = 5 điểm, complete = 10 điểm).
  - Để đảm bảo hiệu năng (vì số lượng user lớn), một Background Worker sẽ chạy định kỳ (vd: mỗi 1 giờ) để tính toán điểm số và đẩy top khóa học vào Redis Cache. API chỉ việc đọc từ Redis.

### 2.3. Dành cho bạn (For You - AI Personalized)
- **Mục tiêu**: Đề xuất khóa học được cá nhân hóa cao độ bằng mô hình Trí tuệ Nhân tạo (AI).
- **Logic nghiệp vụ (Team AI phụ trách phát triển chuyên sâu)**:
  - Hệ thống sử dụng Vector DB (Qdrant) để lưu trữ Embeddings (biểu diễn vector) của metadata khóa học và hồ sơ hành vi của sinh viên.
  - Khi sinh viên truy cập trang chủ, hệ thống sẽ thực hiện truy vấn so khớp (Vector Search / Cosine Similarity) giữa Profile của user và danh sách các khóa học hiện có.
  - Lọc bỏ các khóa học mà user đã ghi danh. Trả về top N khóa học có độ tương đồng cao nhất.

## 3. Kiến trúc Luồng dữ liệu (Data Flow)
1. **Ghi nhận hành vi (Tracking)**: Khi user thực hiện hành động (xem chi tiết khóa học, bấm ghi danh, hoàn thành bài học), hệ thống sẽ lưu log vào bảng `course_interactions` trong cơ sở dữ liệu PostgreSQL.
2. **Tổng hợp dữ liệu (Aggregation)**: Worker định kỳ (Scheduled Job) đọc dữ liệu thô từ bảng `course_interactions`, tính toán `trending_score` cho các khóa học và cập nhật vào in-memory cache (Redis).
3. **Phân phối (Serving)**: 
   - Ứng dụng (Frontend) gọi API GET tới các endpoint `/api/v1/recommendations/*`
   - **Trending API**: Lấy dữ liệu cực nhanh trực tiếp từ Redis.
   - **Continue Learning API**: Lấy dữ liệu cá nhân hóa trực tiếp từ PostgreSQL (dựa vào `user_id` hiện tại).
   - **For You API**: Chuyển tiếp (forward) logic sang AI Engine, gọi Qdrant để nhận kết quả gợi ý realtime.

## 4. Bàn giao & Ghi chú cho Team AI
- Các giao thức API (Contract) bao gồm `/for-you`, `/trending`, `/continue-learning` đã được thiết kế sẵn. Hiện tại `/for-you` đang trả về dữ liệu Mock để team Frontend có thể tích hợp UI trước.
- Schema bảng `course_interactions` đã được triển khai, sẵn sàng để team AI lấy làm nguồn Dữ liệu huấn luyện (Training Data).
- **Nhiệm vụ Team AI**: Cần override lại hàm `get_for_you_courses` trong file `app/services/recommendation_service.py` bằng logic kết nối Qdrant/LLM thực tế. Không cần bận tâm về Authentication hay Data Formatting vì tầng Router API đã xử lý.
