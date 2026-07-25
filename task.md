# MASTER DESIGN SPECIFICATION & EXECUTION ROADMAP
## LMS AI STUDY ASSISTANT (COURSERA-STYLE ARCHITECTURE)

---

## 📌 1. ĐỊNH HƯỚNG TỔNG QUAN KIẾN TRÚC
- **100% Native Player cho Học viên**: Học viên học trực tiếp trên giao diện Native mượt mà của hệ thống (Video HTML5, Document Markdown, Interactive Transcripts, In-Video Quizzes, Monaco Code Editor, Peer Review Workspace). Khung iframe SCORM truyền thống được loại bỏ hoàn toàn đối với trải nghiệm người học.
- **Smart SCORM Import & Review Workflow**: Hệ thống hỗ trợ **2 Vị trí Import SCORM**:
  1. **Course-Level Import (ở Header Khóa học)**: Upload file SCORM `.zip` trọn gói khóa học $\rightarrow$ Bóc tách ra cây danh mục Tuần & Bài học $\rightarrow$ Màn hình Review Editor cho Giảng viên duyệt & lưu Native.
  2. **Item-Level Import (ở Form Thêm Học liệu từng Bài)**: Upload file SCORM `.zip` lẻ 1 bài giảng $\rightarrow$ Hệ thống tự động phân loại Smart Dual-Mode:
     - *Chế độ A (Đơn giản - Video/Docs)*: Bóc tách tự động thành Học liệu Native (`VIDEO` hoặc `READING`) cho phép Giảng viên tiếp tục biên tập.
     - *Chế độ B (Tương tác Phức tạp - Storyline/Captivate)*: Giải nén lưu trữ đường dẫn HTML5 S3 (`scorm_package_path` & `scorm_entry_html`) nhúng trình phát HTML5 Player kết hợp SCORM 1.2 JS Runtime Bridge để bảo toàn 100% hiệu ứng tương tác.
- **SCORM Export**: Giảng viên có thể đóng gói 1-Click bất kỳ khóa học Native nào trên hệ thống thành file `.zip` SCORM 1.2 chuẩn để mang đi bán hoặc đăng lên các LMS khác (Moodle, Blackboard, SuccessFactors).

---

## 🏛️ 2. KIẾN TRÚC KHO TÀI NGUYÊN KHÓA HỌC (3 KHO THÀNH PHẦN)

Mỗi Khóa học (`Course`) trên hệ thống được tổ chức thành 3 Phân hệ Kho Tài nguyên:

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                 KHÓA HỌC (COURSE)                      │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
        ┌──────────────────────────────────────────────────┼──────────────────────────────────────────────────┐
        ▼                                                  ▼                                                  ▼
 【1. KHO HỌC LIỆU BÀI GIẢNG】                 【2. KHO NGÂN HÀNG CÂU HỎI & ĐỀ THI】           【3. KHO THỰC HÀNH & CHẤM CHÉO】
 (Catalog Domain & Cloud Storage)              (Assessment Domain - Question Bank)           (Assessment Sandbox & Peer Rubric)
 - Video MP4 gốc & HLS Stream.                - Kho Quiz Ôn luyện theo Tuần.                 - Bộ mã mẫu (Starter Code).
 - Phụ đề VTT & Interactive Transcript.       - Kho Bài thi Kết thúc & Cấp Chứng chỉ.       - Bộ Test Cases (Docker Sandbox).
 - Bài đọc Markdown & Hình ảnh.               - Phân loại Dễ / Trung bình / Khó.            - Tiêu chí Rubric chấm chéo.
 - Gói SCORM (.zip) Import & Review.          - Phân loại Dạng câu (Single/Multi/TF...).
```

---

## 📚 3. CHI TIẾT BẢN THIẾT KẾ 7 LOẠI HỌC LIỆU NATIVE (LEARNING ITEM TYPES)

Giảng viên xây dựng nội dung theo cấu trúc: **Course $\rightarrow$ WeekModule $\rightarrow$ Lesson $\rightarrow$ LearningItems**.

### 1. 📹 `VIDEO` (Bài giảng Video Lý thuyết & Tương tác & Direct Test)
- **Thiết kế Biên tập (Instructor Studio - Interactive Video Studio)**:
  - **Kênh Tải Video Đa dụng (Smart Video Ingestion)**:
    - *Upload Trực tiếp (Direct File Upload)*: Hỗ trợ kéo-thả tệp Video MP4 / WebM / MOV tải thẳng lên hệ thống lưu trữ Cloud Storage (MinIO / S3).
    - *Đường dẫn Trực tuyến (URL Fallback)*: Cho phép dán trực tiếp liên kết Video MP4 / CDN công khai (`video_url`).
  - **Quản lý Phụ đề & Trích xuất Lời thoại**:
    - Upload tệp Phụ đề WebVTT (`vtt_subtitle_url`) hoặc bật chế độ tự động AI trích xuất lời thoại (`auto_transcribe`). Backend tự bóc tách thành **Interactive Transcript** cuộn theo lời nói.
  - **Trình Biên tập In-Video Quiz Studio (Interactive Timeline Scrubber)**:
    - Tích hợp khung xem trước Video kèm thanh timeline trực quan. Giảng viên phát video hoặc kéo con trượt đến mốc thời gian `timestamp_seconds` chính xác.
    - Nhấn **"Chèn câu hỏi kiểm thử trực tiếp"** (Add In-Video Marker Pin) $\rightarrow$ Màn hình mở Form thiết kế câu hỏi dừng màn hình (Nội dung câu hỏi, 4 đáp án A/B/C/D, chọn đáp án đúng, Lời giải thích chi tiết).
    - Các mốc câu hỏi được ghim (pin markers) trực tiếp lên thanh timeline phát video và hiển thị dưới dạng danh sách quản lý trực quan (thêm / sửa / xóa / kéo đổi mốc giây).
- **Trải nghiệm Học viên (Learner View - Native Interactive Player)**:
  - Trình phát Video HTML5 Native sắc nét, giao diện hiện đại với bộ chuyển đổi phụ đề và phụ đề tương tác cuộn bên lề.
  - Các mốc câu hỏi kiểm thử trực tiếp (`In-Video Quizzes`) được đánh dấu điểm sáng (glow markers) trên thanh Seekbar.
  - Khi luồng video phát chạm đến mốc `timestamp_seconds` $\rightarrow$ Video tự động `pause()`, phát hiệu ứng mở popup **In-Video Quiz Modal** đè lên màn hình với thiết kế glassmorphism hiện đại.
  - Học viên chọn đáp án và bấm **"Kiểm Tra Đáp Án"**:
    - Hiển thị phản hồi Đúng (xanh) / Sai (đỏ) thời gian thực kèm Lời giải thích.
    - Nhấn **"Tiếp tục xem Video"** $\rightarrow$ Popup đóng lại, trình phát tự động `play()` nối tiếp bài giảng.

### 2. 📖 `READING` (Bài đọc Docs & Lý thuyết)
- **Thiết kế Biên tập (Instructor Studio)**:
  - **Full-Page Reading Studio Workspace**: Màn hình thiết kế chia 2 cột. Cột trái soạn thảo bằng Markdown / Rich-Text Editor (nhập văn bản, chèn ảnh, công thức toán $LaTeX$, code block). Cột phải xem **Live Preview** thời gian thực.
  - Tự động tính thời gian đọc ước tính (`estimated_minutes`).
- **Định dạng Lưu trữ**: Lưu dưới dạng chuỗi văn bản chuẩn **Markdown (`reading_markdown`)** trong cơ sở dữ liệu PostgreSQL (`reading_markdown TEXT`). Siêu nhẹ (vài KB), hiển thị 100% Responsive trên Web & Mobile App, tối ưu cho AI Coach (Gemini) đọc bài.

### 3. ✏️ `PRACTICE_QUIZ` (Quiz Ôn luyện Không tính điểm)
- **Thiết kế Biên tập**: Liên kết với Kho Quiz Ôn luyện theo Tuần.
- **Trải nghiệm Học viên**: Rút ngẫu nhiên các câu hỏi ngắn. Chọn đáp án xong hệ thống hiển thị ngay Đúng/Sai và **Lời giải thích chi tiết (Explanation)** để học viên tự rút kinh nghiệm. Không tính vào điểm tích lũy đỗ/trượt.

### 4. 📝 `GRADED_QUIZ` (Bài thi Trắc nghiệm Tính điểm Đỗ/Trượt)
- **Thiết kế Biên tập**: Cài đặt Điểm đỗ ($\ge 80\%$), Thời gian đếm ngược Server-side (ví dụ 45 phút), Giới hạn số lần thi (max 3 lần) và Cooldown (8h).
- **Trải nghiệm Học viên**: Đề thi tự động rút $N$ câu từ $M$ câu theo **Ma trận Dễ (40%) / TB (40%) / Khó (20%)**, tự động xáo trộn vị trí đáp án A/B/C/D (`BR_QUIZ_002`). Nếu làm trượt 3 lần $\rightarrow$ Tự động khóa Cooldown 8 tiếng (`BR_QUIZ_003`).

### 5. 💻 `AUTO_GRADED_LAB` (Bài tập Lập trình Tự động Chấm)
- **Phạm vi Sử dụng**: *(Tùy chọn - Chỉ dành riêng cho mảng IT/Lập trình. Các khóa học Kinh doanh/Ngoại ngữ không cần dùng)*.
- **Thiết kế Biên tập**: Upload file Starter Code mẫu + Bộ tệp Test Cases (`test_solution.py`).
- **Trải nghiệm Học viên**: Khung soạn thảo code Monaco Editor. Học viên gõ code và bấm "Run Code" $\rightarrow$ Backend chuyển code vào **Docker Container Sandbox** chạy cách ly và chấm điểm tự động.

### 6. 👥 `PEER_REVIEW` (Bài tập Nộp Dự án & Chấm điểm Chéo)
- **Thiết kế Biên tập**: Soạn đề bài nộp dự án/bài luận + Thiết lập **Bảng tiêu chí Rubric** (Tên tiêu chí, Điểm tối đa, Hướng dẫn chấm).
- **Trải nghiệm Học viên**: Học viên nộp bài làm (văn bản/link dự án/file PDF/hình ảnh) $\rightarrow$ Hệ thống tự động phân công ngẫu nhiên cho 3 học viên khác trong lớp chấm chéo theo Bảng Rubric. Trọng số điểm trung bình của 3 người chấm là điểm chính thức.

### 7. 📥 `SCORM_MAPPER` (Công cụ SCORM Import & Review Workspace)
- **Phạm vi Sử dụng**: *(Dành riêng cho màn hình Quản trị Giảng viên để bóc tách & quản lý tài liệu SCORM)*.
- **Quy trình 4 Bước**:
  1. Upload tệp SCORM `.zip` (ở Header Khóa học hoặc ở từng Bài học).
  2. Backend tự động phân tích gói SCORM:
     - Nếu gói đơn giản (MP4/Document HTML): Bóc tách cây danh mục Tuần, Bài học, Video, Docs Native.
     - Nếu gói tương tác (Storyline/Captivate JS Canvas): Giải nén lưu trữ đường dẫn HTML5 S3 (`scorm_package_path`, `scorm_entry_html`) kèm SCORM 1.2 Runtime Adapter.
  3. Màn hình **SCORM Review Editor** hiển thị cho Giảng viên xem trước & chỉnh sửa (sửa tiêu đề, xem nội dung Docs, link Video, xem trước HTML5 Canvas).
  4. Giảng viên bấm **"Xác nhận Duyệt"** $\rightarrow$ Hệ thống lưu vào CSDL khóa học.

---

## 🗄️ 4. THIẾT KẾ KHO NGÂN HÀNG CÂU HỎI (QUESTION BANK HIERARCHY)

### A. Phân loại theo Dạng câu hỏi (`question_type`)
1. **`SINGLE_CHOICE`**: Trắc nghiệm 1 đáp án đúng (Radio).
2. **`MULTIPLE_CHOICE`**: Trắc nghiệm nhiều đáp án đúng (Checkbox).
3. **`TRUE_FALSE`**: Chọn Đúng hoặc Sai.
4. **`FILL_IN_BLANK`**: Điền từ/số vào chỗ trống (so khớp Regex/Chuỗi).
5. **`CODE_OUTPUT_QUIZ`**: Dự đoán đầu ra khi chạy đoạn mã code.

### B. Phân loại theo Độ khó (`difficulty`)
- 🟢 **`EASY` (Dễ)**: Khái niệm, định nghĩa ($40\%$ cơ cấu đề thi).
- 🟡 **`MEDIUM` (Trung bình)**: Áp dụng, đọc hiểu ($40\%$ cơ cấu đề thi).
- 🔴 **`HARD` (Khó)**: Phân tích, tính toán tổng hợp ($20\%$ cơ cấu đề thi).

---

## 🗃️ 5. SCHEMA CƠ SỞ DỮ LIỆU CHUẨN (DATABASE ERD)

```sql
-- 1. Bảng Kho Ngân hàng Đề theo Khóa học
CREATE TABLE question_banks (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,              -- "Kho Thi Kết thúc Khóa học Python"
    category VARCHAR(32) NOT NULL DEFAULT 'PRACTICE', -- 'PRACTICE', 'MODULE_EXAM', 'FINAL_EXAM'
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Câu hỏi Chi tiết trong Kho
CREATE TABLE questions (
    id VARCHAR(64) PRIMARY KEY,
    bank_id VARCHAR(64) REFERENCES question_banks(id) ON DELETE CASCADE,
    question_type VARCHAR(32) NOT NULL DEFAULT 'SINGLE_CHOICE', -- 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_BLANK'
    difficulty VARCHAR(16) NOT NULL DEFAULT 'EASY',              -- 'EASY', 'MEDIUM', 'HARD'
    text TEXT NOT NULL,                                          -- Nội dung câu hỏi (chấp nhận Markdown / LaTeX)
    explanation TEXT DEFAULT '',                                 -- Lời giải thích chi tiết
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Danh sách Tùy chọn Đáp án (A, B, C, D)
CREATE TABLE question_options (
    id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0
);

-- 4. Bảng Ma trận Cấu hình Đề thi (Gắn với bài thi cụ thể)
CREATE TABLE quiz_matrices (
    item_id VARCHAR(64) PRIMARY KEY,                             -- ID bài thi trong khóa học (LearningItem)
    bank_id VARCHAR(64) REFERENCES question_banks(id),          -- Chọn Kho nguồn để rút câu
    time_limit_minutes INT NOT NULL DEFAULT 45,                  -- Thời gian đếm ngược
    passing_threshold_percent FLOAT NOT NULL DEFAULT 80.0,       -- Điểm đỗ tối thiểu (%)
    easy_count INT NOT NULL DEFAULT 4,                           -- Số câu Dễ rút ngẫu nhiên
    medium_count INT NOT NULL DEFAULT 4,                         -- Số câu Trung bình rút ngẫu nhiên
    hard_count INT NOT NULL DEFAULT 2,                           -- Số câu Khó rút ngẫu nhiên
    shuffle_options BOOLEAN NOT NULL DEFAULT TRUE                -- Tự động xáo trộn vị trí đáp án (A,B,C,D)
);
```

---

## 🎯 6. LỘ TRÌNH THIẾT KẾ VÀ TRIỂN KHAI TRIỆT ĐỂ (EXECUTION ROADMAP)

- [x] **Phase 1: Chuẩn hóa Protobuf & Domain Schema**:
  - Khai báo RPC `ParseScormPackage`, `ImportCourseFromScorm` và `ExportCourseToScorm` trong `catalog.proto`.
  - Khai báo `cmi_core_session_time` trong `learning.proto`.
  - Sinh mã stubs backend (`make gen`) & frontend (`npm run gen`).
- [x] **Phase 2: Backend Core Engine & Database Migration**:
  - Implement `parse_scorm_package`, `import_course_from_scorm` & `export_course_to_scorm` trong `CatalogUseCase`.
  - Ép kiểu Enum `ItemType` hỗ trợ đầy đủ 7 dạng học liệu Native trong Repository & Use Cases.
  - Cập nhật SQLAlchemy models & chạy Alembic migration (`f9caddc81895_complete_scorm_questionbank_schema.py`) áp dụng lên PostgreSQL database.
  - Viết bộ kiểm thử tự động [test_scorm_import_export.py](file:///e:/lms-ai-study-assistant/backend/tests/test_scorm_import_export.py) & [test_scorm_generator.py](file:///e:/lms-ai-study-assistant/backend/tests/test_scorm_generator.py) (**100% PASSED - 122/122 backend tests**).
  - Pass 100% Linter `ruff` & Typechecker `ty check`.
- [x] **Phase 3: Frontend Instructor Studio UI**:
  - Hoàn thiện UI Form Thêm Học liệu hỗ trợ đầy đủ 7 loại Native Items trên [/instructor/courses/[courseId]](file:///e:/lms-ai-study-assistant/frontend/src/app/instructor/courses/%5BcourseId%5D).
  - Xây dựng giao diện **SCORM Import & Review Editor** (xem trước & sửa Docs/Video/Lesson trước khi lưu Native).
  - Tích hợp nút Xuất SCORM 1.2 ZIP & Import SCORM ở Banner Khóa học.
  - Phối hợp đa ngôn ngữ Việt - Anh (`vi.json` & `en.json`) cho toàn bộ thành phần UI mới.
  - Pass 100% build Next.js Turbopack (`npm run build`).
- [x] **Phase 4: Learner Experience & Video Interactive Player**:
  - Tích hợp **In-Video Quiz Player** (dừng màn hình tại giây `timestamp_seconds` để làm trắc nghiệm).
  - Tích hợp **Interactive Transcript** tự cuộn theo lời nói trong video.
  - Tích hợp **SCORM Interactive Player với JS Bridge (`window.API`)** đồng bộ trực tiếp tiến độ, điểm số, vị trí học tập của SCO tương tác.
- [x] **Phase 5: Kiểm thử Tổng thể & Nghiệm thu**:
  - Thực hiện chạy thử nghiệm toàn bộ kịch bản E2E: Import SCORM, biên tập ma trận, học và theo dõi tiến độ CMI, xuất gói SCORM.
  - Phục hồi cơ sở dữ liệu mẫu thành công với tập lệnh `src.seed`.
  - Pass 100% các điều kiện tích hợp liên tục (CI Gates): `pytest` (122/122 passed), `ruff` formatting, `ty` type checking, Next.js build.