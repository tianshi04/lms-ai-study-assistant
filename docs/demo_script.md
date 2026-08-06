# 🎬 KỊCH BẢN DEMO HỆ THỐNG LMS AI — BẢN ĐẦY ĐỦ VĂN NÓI

> **Tổng thời gian:** ~32 phút  
> **Người thực hiện:** Nguyễn Thanh Phong  
> **Hệ thống:** LMS AI Study Assistant — Hệ thống quản lý học tập trực tuyến tích hợp Trợ lý AI

---

## 🎤 LỜI MỞ ĐẦU (1 phút)

> *"Kính chào thầy/cô và các bạn. Em tên là Nguyễn Thanh Phong, lớp C31. Hôm nay em xin được trình bày đề tài thực tập tốt nghiệp của mình: **Xây dựng hệ thống quản lý học tập trực tuyến tích hợp Trợ lý AI**.*
>
> *Hệ thống được thiết kế theo mô hình tham khảo Coursera, bao gồm các chức năng cốt lõi như quản lý khóa học, theo dõi tiến độ học tập, hệ thống kiểm tra đánh giá, diễn đàn cộng đồng, chứng chỉ số, và tích hợp thanh toán.*
>
> *Về mặt kỹ thuật, hệ thống sử dụng kiến trúc **Contract-First Modular Monolith** theo nguyên tắc **Domain-Driven Design**, bao gồm 9 bounded contexts, 44 bảng cơ sở dữ liệu, và 115 API endpoints. Backend sử dụng Python với Starlette và ConnectRPC, frontend sử dụng Next.js 16 với React 19 và TailwindCSS v4.*
>
> *Bây giờ em xin được demo trực tiếp các chức năng đã hoàn thành trên hệ thống."*

## 📋 Chuẩn Bị Trước Demo

### Tài khoản trên đám mây (password chung: `123456`)
| Vai trò | Email | Ghi chú |
|---------|-------|---------|
| **Super Admin** | `admin@coursera.ai` | Quản trị toàn sàn |
| **Giảng viên** | `instructor@coursera.ai` | Giảng viên cá nhân |
| **Học viên** | `learner@coursera.ai` | Học viên cá nhân |
| **Trợ giảng** | `ta@coursera.ai` | Trợ giảng tổ chức |
| **Quản trị viên Tổ chức** | `partner@coursera.ai` | Org Admin |

### Dữ liệu mẫu cần có sẵn trên đám mây
- ✅ 2-3 khóa học đã published (có modules, lessons, learning items)
- ✅ 1 khóa học trả phí (để demo VNPay)
- ✅ 1 khóa học có financial aid enabled
- ✅ Question banks + quiz matrix đã cấu hình cho ít nhất 1 quiz
- ✅ 1-2 forum threads có replies
- ✅ Learner đã hoàn thành 100% ít nhất 1 khóa học (để demo certificate)
- ✅ Vài notifications trong hệ thống

---

## PHẦN 1: TRANG CHỦ & XÁC THỰC NGƯỜI DÙNG (3 phút)

### Bước 1.1 — Trang chủ công khai

**[Thao tác]** Mở trình duyệt → vào `http://localhost:3000`

> *"Đầu tiên, đây là trang chủ của hệ thống khi người dùng chưa đăng nhập. Giao diện được thiết kế theo phong cách **Material Design 3** với hiệu ứng Particle Canvas động ở background.*
>
> *Trang chủ có hai nút call-to-action chính: **Khám phá Danh mục Khóa học** và **Đăng ký Học thử Miễn phí**. Bên dưới là thanh Trust Metrics hiển thị các chỉ số nổi bật của nền tảng, và 4 card giới thiệu tính năng chính: Danh mục khóa học, Trình phát bài giảng, Hỗ trợ tài chính, và Xác minh chứng chỉ."*

**[Thao tác]** Click toggle Dark Mode trên header

> *"Hệ thống hỗ trợ **Dark Mode** và **Light Mode**, người dùng có thể chuyển đổi bất kỳ lúc nào. Toàn bộ giao diện được xây dựng trên hệ thống design tokens của Material Design 3."*

---

### Bước 1.2 — Đăng ký tài khoản

**[Thao tác]** Click "Đăng ký Học thử Miễn phí" → chuyển đến `/auth/register`

> *"Đây là trang đăng ký tài khoản. Quy trình đăng ký gồm **2 bước**. Bước 1 là xác minh email thông qua **Google OAuth** — điều này giúp đảm bảo người dùng sở hữu email thật, tránh tài khoản rác."*

**[Thao tác]** Click "Xác minh bằng Google" → Popup Google → chọn tài khoản

> *"Sau khi xác minh Google thành công, hệ thống chuyển sang bước 2. Ở đây người dùng nhập họ tên, đặt mật khẩu dự phòng, và chọn vai trò: **Học viên** hoặc **Giảng viên**."*

**[Thao tác]** Điền form:
- Họ tên: `Nguyễn Văn Demo`
- Mật khẩu: nhập `123` → chỉ ra lỗi validation

> *"Hệ thống validate mật khẩu phải tối thiểu 6 ký tự. Toàn bộ form validation sử dụng thư viện **TanStack React Form** kết hợp **Zod schema**."*

**[Thao tác]** Sửa mật khẩu đúng → chọn vai trò "Học viên" → click "Hoàn tất Đăng ký"

> *"Đăng ký thành công. Hệ thống tự động đăng nhập và chuyển hướng về trang chủ."*

---

### Bước 1.3 — Đăng nhập

**[Thao tác]** Đăng xuất → vào `/auth/login`

> *"Đây là trang đăng nhập. Người dùng có thể đăng nhập bằng **email và mật khẩu** hoặc **đăng nhập 1-click qua Google OAuth**."*

**[Thao tác]** Chỉ vào khu vực Dev Test Accounts (nếu đang ở development mode)

> *"Trong môi trường development, em có bố trí sẵn các nút quick-login cho từng vai trò để tiện test: Học viên, Giảng viên, Trợ giảng, Quản trị viên Tổ chức, và Super Admin. Ở production thì phần này sẽ được ẩn đi."*

**[Thao tác]** Click vào nút quick-login **"Giảng viên Cá nhân"** (`instructor@coursera.ai` / `123456`) → đăng nhập

> *"Xác thực sử dụng **JWT** với access token có thời hạn 60 phút và refresh token 7 ngày. Hệ thống bảo mật theo kiến trúc **PBAC/ReBAC 3 tầng** — tức là mọi quyền truy cập đều được kiểm tra ở cả tầng API, tầng application, và tầng database."*

---

## PHẦN 2: GIẢNG VIÊN — TẠO & QUẢN LÝ KHÓA HỌC (7 phút)

### Bước 2.1 — Dashboard Giảng viên

**[Thao tác]** Sau khi đăng nhập bằng tài khoản Instructor → trang chủ hiển thị

> *"Sau khi đăng nhập với vai trò Giảng viên, trang chủ tự động chuyển sang **Instructor Dashboard**. Hệ thống sử dụng component **HomeDashboardSwitch** để render dashboard phù hợp với từng vai trò: Learner thấy dashboard học tập, Instructor thấy dashboard giảng dạy, Admin thấy dashboard quản trị.*
>
> *Trên dashboard giảng viên, ta thấy 4 thẻ KPI: **Tổng học viên**, **Khóa học đã xuất bản**, **Đang chờ duyệt**, và **Bản nháp**. Bên dưới là danh sách khóa học đang quản lý với trạng thái tương ứng."*

**[Thao tác]** Chỉ vào các card navigation bên dưới

> *"Giảng viên có thể truy cập nhanh vào: **Danh sách khóa học giảng dạy**, **Hồ sơ và chữ ký điện tử**, và **Duyệt đơn hỗ trợ tài chính**."*

---

### Bước 2.2 — Tạo khóa học mới

**[Thao tác]** Click "Tạo Khóa Học Mới" → chuyển đến `/instructor/courses/new`

> *"Bây giờ em sẽ demo việc tạo một khóa học mới. Đây là trang **Khởi Tạo Khóa Học Mới**. Thầy cô có thể thấy giao diện chia làm 2 phần: phía trên là **Live Badge Preview** — khung xem trước thẻ khóa học realtime, phía dưới là form nhập thông tin."*

**[Thao tác]** Chỉ vào phần **LIVE BADGE PREVIEW** phía trên

> *"Phần **Live Badge Preview** này sẽ tự động cập nhật khi em điền thông tin bên dưới. Nó cho giảng viên thấy trước khóa học sẽ hiển thị như thế nào trên danh mục — bao gồm tên tổ chức bảo chứng, tiêu đề khóa học, tên giảng viên, và trạng thái hiện tại là **Bản nháp DRAFT**."*

**[Thao tác]** Chỉ vào dropdown **PARTNER / TỔ CHỨC ĐẠI DIỆN BẢO CHỨNG**

> *"Trường đầu tiên là **Partner — Tổ chức đại diện bảo chứng**. Theo business rule của hệ thống, 100% khóa học bắt buộc phải gắn liền với 1 Partner Organization — tức là tổ chức giáo dục chịu trách nhiệm bảo chứng chất lượng nội dung. Nếu giảng viên là cá nhân tự do, hệ thống tự động gán mặc định là **Coursera Project Network**. Nếu giảng viên thuộc một tổ chức — ví dụ trường đại học hay doanh nghiệp — thì sẽ chọn tổ chức tương ứng trong dropdown."*

**[Thao tác]** Nhập tên khóa học: `Lập trình Python Căn Bản Cho Người Mới Bắt Đầu`

> *"Tiếp theo là **Tên khóa học**. Khi em gõ tên ở đây, phần Live Badge Preview phía trên sẽ tự động cập nhật tiêu đề tương ứng."*

**[Thao tác]** Chỉ vào trường **ĐƯỜNG DẪN TĨNH (SLUG)** — đã tự sinh `lap-trinh-python-can-ban-cho-nguoi-moi-bat-dau`

> *"Trường **Đường dẫn tĩnh** hay **Slug** — hệ thống tự động generate từ tên khóa học, tạo URL thân thiện dạng `/courses/lap-trinh-python-can-ban`. Giảng viên có thể chỉnh sửa nếu muốn URL ngắn gọn hơn."*

**[Thao tác]** Chọn **Lĩnh vực chuyên môn**: `Khoa học Máy tính` và **Trình độ yêu cầu**: `Sơ cấp (Beginner)`

> *"Tiếp theo chọn **Lĩnh vực chuyên môn** và **Trình độ yêu cầu**. Các danh mục này do Admin quản lý — giảng viên chỉ chọn từ danh sách có sẵn. Thông tin này giúp học viên lọc và tìm kiếm khóa học phù hợp trên trang danh mục."*

**[Thao tác]** Nhập mô tả: `Khóa học giúp bạn nắm vững nền tảng lập trình Python từ cơ bản đến ứng dụng thực tế...`

> *"Phần **Mô tả tổng quan** cho phép giảng viên tóm tắt nội dung, mục tiêu, và đối tượng học viên phù hợp."*

**[Thao tác]** Chỉ vào checkbox **Cho phép Học viên Nộp Đơn Hỗ Trợ Tài Chính (Financial Aid)** — đã được tick ✅

> *"Cuối cùng là tùy chọn **Financial Aid** — nếu bật, học viên có hoàn cảnh khó khăn có thể viết bài luận xin cấp học bổng để học miễn phí khóa học này. Đây là cơ chế tham khảo từ Coursera thật."*

**[Thao tác]** Click **"🚀 Bắt Đầu Tạo Khóa Học"**

> *"Click **Bắt Đầu Tạo Khóa Học**. Hệ thống gọi API **create_course**, lưu vào database với trạng thái Draft, và chuyển sang trang **Course Builder** để giảng viên xây dựng nội dung chi tiết."*

---

### Bước 2.3 — Xây dựng cấu trúc khóa học

**[Thao tác]** Click "Thêm Tuần Học Mới"

> *"Cấu trúc khóa học theo mô hình **Course → Week Modules → Lessons → Learning Items**. Em sẽ thêm tuần đầu tiên."*

**[Thao tác]** Nhập tiêu đề "Tuần 1: Giới thiệu Python", mô tả tóm tắt → Lưu

> *"Mỗi tuần học có tiêu đề và tóm tắt nội dung."*

**[Thao tác]** Click vào Tuần 1 → Click "Thêm bài học" → Nhập "Bài 1: Python là gì?" → Lưu

> *"Trong mỗi tuần, giảng viên thêm các bài học. Mỗi bài học có thể ước lượng thời gian hoàn thành."*

**[Thao tác]** Click vào Bài 1 → Click "Thêm nội dung học tập" → Chọn loại **Video**

> *"Mỗi bài học chứa các **Learning Items** — tức là các đơn vị nội dung nhỏ nhất. Hệ thống hỗ trợ **6 loại nội dung**: Video, Reading, Practice Quiz, Graded Quiz, Auto-Graded Lab, và Peer Review Assignment."*

**[Thao tác]** Nhập tiêu đề video, URL video, URL subtitle VTT

> *"Với nội dung Video, giảng viên nhập URL video và có thể upload file phụ đề VTT. Hệ thống lưu trữ file trên **MinIO** — một hệ thống object storage tương thích S3. Backend cung cấp **presigned URL** để frontend upload trực tiếp, giảm tải cho server."*

**[Thao tác]** Thêm tiếp một item loại **Reading** → Nhập nội dung markdown

> *"Với nội dung Reading, giảng viên có thể viết bài giảng dạng **Markdown** — hỗ trợ định dạng rich text, code blocks, và công thức toán."*

**[Thao tác]** Demo kéo thả sắp xếp thứ tự các items

> *"Giảng viên có thể **kéo thả** để sắp xếp lại thứ tự tuần, bài học, và nội dung. Backend lưu **order_index** cho mỗi phần tử và cung cấp API **reorder** riêng."*

---

### Bước 2.4 — Ngân hàng câu hỏi & Quiz Matrix

**[Thao tác]** Chuyển đến tab Question Bank (`/instructor/courses/[id]/question-bank`)

> *"Đây là tính năng **Ngân hàng Câu Hỏi** — một trong những phần em tâm đắc nhất. Giảng viên tạo các kho câu hỏi và phân loại theo độ khó."*

**[Thao tác]** Click "Tạo Kho Ngân hàng Đề" → Nhập tên "Câu hỏi Python cơ bản"

> *"Trước tiên tạo một ngân hàng câu hỏi."*

**[Thao tác]** Click "Thêm Câu hỏi" → Điền:
- Câu hỏi: `Python là ngôn ngữ lập trình thuộc loại nào?`
- Loại: `Single Choice`
- Độ khó: `Dễ`
- Đáp án A: `Compiled` | B: `Interpreted` ✅ | C: `Assembly` | D: `Machine`
- Giải thích: `Python là ngôn ngữ thông dịch (interpreted)...`

> *"Mỗi câu hỏi có: nội dung, loại câu hỏi — hỗ trợ **Single Choice**, **Multiple Choice**, và **True/False** — độ khó **Dễ, Trung bình, Khó**, các đáp án với đánh dấu đáp án đúng, và phần giải thích để hiện sau khi học viên nộp bài."*

**[Thao tác]** Thêm nhanh 2-3 câu hỏi nữa

> *"Em thêm nhanh vài câu hỏi nữa để demo tính năng tiếp theo."*

**[Thao tác]** Quay lại Course Builder → Vào một Quiz learning item → Click "Cấu hình Quiz Matrix"

> *"Đây là phần **Quiz Matrix** — cấu hình quy tắc sinh đề thi. Giảng viên chọn ngân hàng câu hỏi và thiết lập:"*

**[Thao tác]** Điền cấu hình:
- Ngân hàng: `Câu hỏi Python cơ bản`
- Số câu dễ: 2, trung bình: 1, khó: 0
- Thời gian làm bài: 10 phút
- Điểm đạt: 70%
- Số lần thử tối đa: 3
- Cooldown: 8 giờ

> *"Giảng viên cấu hình: lấy bao nhiêu câu **Dễ**, bao nhiêu câu **Trung bình**, bao nhiêu câu **Khó** từ ngân hàng. Mỗi lần học viên làm quiz, hệ thống sẽ **random** câu hỏi theo tỉ lệ này — nghĩa là mỗi người nhận bộ đề khác nhau, chống gian lận. Ngoài ra còn có giới hạn số lần thử và thời gian chờ **cooldown 8 giờ** giữa các lần làm, buộc học viên phải ôn bài trước khi thử lại."*

---

### Bước 2.5 — Gửi duyệt khóa học

**[Thao tác]** Click "Gửi Yêu Cầu Kiểm Duyệt"

> *"Sau khi hoàn thành nội dung, giảng viên gửi khóa học đi kiểm duyệt. Trạng thái chuyển từ **Draft** sang **Pending Review**. Khóa học phải được Admin phê duyệt trước khi xuất bản lên nền tảng — quy trình này đảm bảo chất lượng nội dung."*

---

### Bước 2.6 — Analytics & Thông báo

**[Thao tác]** Chuyển đến một khóa học đã published → Tab Analytics

> *"Với khóa học đã xuất bản, giảng viên có trang **Analytics** hiển thị: tổng số học viên đăng ký, tỷ lệ hoàn thành trung bình, đánh giá sao, và bảng danh sách học viên với tiến độ từng người."*

**[Thao tác]** Chuyển sang tab Announcements → Click "Tạo thông báo"

> *"Giảng viên cũng có thể đăng **Thông báo** cho học viên trong khóa học — ví dụ thông báo lịch thi, tài liệu bổ sung. Thông báo sẽ tự động gửi notification đến tất cả học viên đã đăng ký."*

---

## PHẦN 3: HỌC VIÊN — TRẢI NGHIỆM HỌC TẬP (7 phút)

### Bước 3.1 — Đăng nhập & Dashboard Học viên

**[Thao tác]** Đăng xuất → Đăng nhập tài khoản **Học viên** (`learner@coursera.ai` / `123456`)

> *"Bây giờ em chuyển sang vai trò **Học viên** để demo trải nghiệm học tập. Sau khi đăng nhập, học viên thấy **Learning Dashboard**."*

**[Thao tác]** Chỉ vào các thành phần trên Dashboard

> *"Dashboard chào học viên theo thời gian trong ngày — buổi sáng, chiều, hay tối. Có card **Tiếp tục học** hiển thị khóa học đang dở dang với thanh tiến độ. Bên dưới là thống kê nhanh: số khóa học đang học và số chứng chỉ đã nhận. Còn có card **AI Tutor** để truy cập nhanh trợ lý AI 24/7."*

---

### Bước 3.2 — Khám phá khóa học

**[Thao tác]** Click sidebar "Khóa học" → `/courses`

> *"Đây là trang **Danh mục khóa học**. Học viên có thể tìm kiếm và lọc khóa học theo nhiều tiêu chí."*

**[Thao tác]** Gõ `"Python"` vào ô search → đợi kết quả hiện ra

> *"Ô tìm kiếm có cơ chế **debounce 500ms** — nghĩa là hệ thống chờ người dùng ngừng gõ nửa giây rồi mới gửi request, tránh việc gọi API quá nhiều. Backend hỗ trợ full-text search tiếng Việt và tiếng Anh."*

**[Thao tác]** Xóa search → Click vào chip "Computer Science" → Click "Beginner"

> *"Có thể lọc theo **chủ đề** bằng các chip ở đây, và lọc theo **cấp độ**: Beginner, Intermediate, Advanced."*

**[Thao tác]** Chọn sort "Đánh giá cao nhất"

> *"Sắp xếp theo đánh giá cao nhất, phổ biến nhất, hoặc mới nhất."*

**[Thao tác]** Chỉ vào một course card

> *"Mỗi khóa học hiển thị: hình thumbnail, tên đối tác giáo dục, tên khóa học, đánh giá sao trung bình, số lượt review, cấp độ, thời lượng ước tính, và số học viên đã đăng ký."*

---

### Bước 3.3 — Xem chi tiết & Đăng ký khóa học

**[Thao tác]** Click vào một khóa học → `/courses/[courseId]`

> *"Đây là trang chi tiết khóa học. Phần header hiển thị tên, mô tả, đối tác, giảng viên, và đánh giá tổng quan."*

**[Thao tác]** Chỉ vào card Enrollment bên phải

> *"Card đăng ký bên phải hiển thị chế độ truy cập: **Audit Mode** miễn phí hoặc **Paid Mode** trả phí. Với Paid Mode, học viên nhận được chứng chỉ xác minh, deadline linh hoạt, và có thể đăng ký hỗ trợ tài chính."*

**[Thao tác]** Cuộn xuống phần Syllabus → Click mở một tuần

> *"Phần **Syllabus** hiển thị cấu trúc khóa học dạng accordion. Mỗi tuần liệt kê các bài học và nội dung với icon phân loại: Video, Reading, Quiz, Lab, Peer Review — kèm thời lượng ước tính."*

**[Thao tác]** Cuộn xuống phần Reviews

> *"Phần **Đánh giá** hiển thị điểm trung bình, biểu đồ phân bố sao, và danh sách nhận xét từ học viên. Mỗi học viên chỉ được đánh giá **1 lần** cho mỗi khóa học — đây là business rule được enforce ở tầng database bằng unique constraint."*

**[Thao tác]** Click "Vào Học Ngay"

> *"Click **Vào Học Ngay** để đăng ký và bắt đầu học. Hệ thống ghi nhận enrollment và chuyển đến trang học tập."*

---

### Bước 3.4 — Trang học tập (Learning Page) ⭐

**[Thao tác]** Trang `/learn/[courseId]` hiển thị

> *"Đây là **trang học tập** — phần phức tạp và quan trọng nhất của hệ thống. Giao diện chia làm 3 cột:"*

**[Thao tác]** Chỉ vào sidebar trái

> *"**Cột trái** là sidebar Syllabus — hiển thị cây nội dung khóa học. Mỗi bài học có icon trạng thái: checkmark xanh cho bài đã hoàn thành, bài đang học được highlight, và bài chưa mở có icon khóa."*

**[Thao tác]** Chỉ vào phần giữa — video đang phát

> *"**Cột giữa** là khu vực nội dung chính. Với bài dạng Video, có trình phát video với đầy đủ controls. Đặc biệt, hệ thống hỗ trợ **In-Video Quiz** — tức là câu hỏi pop-up tại các thời điểm nhất định trong video. Khi đến thời điểm đó, video tự động dừng lại, hiện câu hỏi, và học viên phải trả lời trước khi tiếp tục xem."*

**[Thao tác]** Chỉ vào thanh tiến độ trên header

> *"Thanh trên cùng hiển thị **tiến độ tổng thể** của khóa học theo phần trăm. Video tự động đánh dấu hoàn thành khi xem được 80% thời lượng."*

**[Thao tác]** Click vào tab **"Bản ghi"** (Transcript) bên phải

> *"**Tab Transcript** hiển thị phụ đề đồng bộ với video. Phụ đề tự động cuộn theo thời gian video. Và đặc biệt — khi click vào bất kỳ dòng nào trong transcript, video sẽ nhảy đến đúng thời điểm đó. Tính năng này rất hữu ích khi học viên muốn xem lại một đoạn cụ thể."*

**[Thao tác]** Click vào một dòng transcript → video nhảy đến thời điểm đó

> *"Như các thầy cô thấy, em click vào dòng này và video nhảy đến đúng thời điểm tương ứng."*

**[Thao tác]** Click vào tab **"Ghi chú"** (Notes)

> *"**Tab Ghi chú** cho phép học viên ghi chú cá nhân cho mỗi bài học. Ghi chú được gắn với nội dung đang highlight và tự động lưu vào database."*

**[Thao tác]** Click "Thêm ghi chú" → Nhập `"Cần ôn lại phần biến toàn cục vs biến cục bộ"` → Lưu

> *"Em tạo một ghi chú mới. Ghi chú được lưu vào bảng **personal_notes** trong database, gắn với user, course, và learning item cụ thể."*

**[Thao tác]** Click vào tab **"Tiến độ"** (Deadlines)

> *"**Tab Tiến độ** hiển thị lịch deadline theo tuần. Nếu học viên bị trễ tiến độ, có nút **Đặt lại deadline** để reset lại lịch học."*

**[Thao tác]** Click "Đánh dấu hoàn thành" cho bài học hiện tại

> *"Khi hoàn thành một bài, click **Đánh dấu hoàn thành**. Hệ thống gọi API **mark_item_complete**, tự động tính lại phần trăm tiến độ tổng thể và cập nhật trên giao diện."*

---

### Bước 3.5 — Theo dõi tiến độ (My Learning)

**[Thao tác]** Click sidebar "Học tập của tôi" → `/my-learning`

> *"Trang **Học tập của tôi** tổng hợp tất cả khóa học của học viên."*

**[Thao tác]** Click tab "Đang tiến hành"

> *"Tab **Đang tiến hành** liệt kê các khóa học đang học với thanh progress bar hiển thị phần trăm hoàn thành. Có nút **Tiếp tục học** để quay lại bài đang dở."*

**[Thao tác]** Click tab "Đã hoàn thành"

> *"Tab **Đã hoàn thành** hiển thị khóa học đã hoàn thành 100%. Từ đây học viên có thể **xem chứng chỉ** hoặc **đánh giá khóa học**."*

**[Thao tác]** Click tab "Chứng chỉ"

> *"Tab **Chứng chỉ** liệt kê tất cả chứng chỉ đã nhận, với mã chứng chỉ, ngày cấp, và nút xem chi tiết."*

---

## PHẦN 4: HỆ THỐNG ĐÁNH GIÁ & KIỂM TRA (5 phút)

### Bước 4.1 — Làm Quiz

**[Thao tác]** Quay lại trang Learn → Navigate đến một bài Quiz

> *"Bây giờ em demo hệ thống kiểm tra. Đầu tiên là **Graded Quiz** — bài kiểm tra có chấm điểm."*

**[Thao tác]** Popup Honor Code hiện ra → Click "Tôi đồng ý"

> *"Trước khi làm bài, học viên phải chấp nhận **Honor Code** — cam kết liêm chính học thuật. Đây là business rule bắt buộc, được lưu vào bảng **honor_code_agreements**."*

**[Thao tác]** Click "Bắt đầu làm bài" → Giao diện quiz hiện ra

> *"Hệ thống gọi API **start_graded_quiz_session**. Server lấy cấu hình Quiz Matrix, random câu hỏi từ ngân hàng theo tỉ lệ Dễ/Trung bình/Khó đã cấu hình, tạo một **immutable snapshot** của bộ đề, và trả về cho frontend.*
>
> *Mỗi học viên nhận bộ đề **khác nhau** — đây là cơ chế chống gian lận quan trọng. Timer đếm ngược thời gian làm bài."*

**[Thao tác]** Chọn đáp án cho từng câu → Click "Nộp bài"

> *"Sau khi chọn xong đáp án, click **Nộp bài**."*

**[Thao tác]** Kết quả hiển thị

> *"Hệ thống trả về kết quả ngay lập tức: điểm số — ví dụ 2 trên 3 câu đúng, tức 66.7%. So sánh với điểm đạt 70% → **Chưa đạt**. Bên dưới hiển thị chi tiết từng câu: đáp án đúng, đáp án học viên chọn, và phần giải thích."*

**[Thao tác]** Chỉ ra thông báo cooldown

> *"Hệ thống thông báo: **Bạn có thể làm lại sau 8 giờ**. Cooldown này buộc học viên phải ôn bài trước khi thử lại, thay vì spam nộp bài liên tục. Số lần thử tối đa cũng được giới hạn — ví dụ 3 lần."*

---

### Bước 4.2 — Auto-Graded Lab

**[Thao tác]** Navigate đến một bài Lab

> *"Tiếp theo là **Auto-Graded Lab** — bài thực hành lập trình tự động chấm điểm."*

**[Thao tác]** Viết code Python trong editor:
```python
def add(a, b):
    return a + b
```

> *"Học viên viết code trực tiếp trên giao diện. Ở đây em viết một hàm cộng đơn giản."*

**[Thao tác]** Click "Chạy & Nộp"

> *"Khi click nộp, server gọi **sandbox_service** — một môi trường cách ly để chạy code Python an toàn. Code được thực thi trong sandbox, so sánh output với test cases đã cấu hình sẵn, và trả kết quả."*

**[Thao tác]** Hiển thị kết quả test cases

> *"Kết quả: Test case 1 — Passed, Test case 2 — Passed. Tất cả đều xanh, bài lab đạt yêu cầu."*

---

### Bước 4.3 — Peer Review

**[Thao tác]** Navigate đến bài Peer Review Assignment

> *"Cuối cùng là **Peer Review Assignment** — bài tập đánh giá chéo. Mô hình này tham khảo từ Coursera: học viên nộp bài, sau đó nhận bài của bạn khác để chấm theo rubric."*

**[Thao tác]** Chỉ ra giao diện nộp bài

> *"Học viên nộp bài thông qua text hoặc upload file."*

**[Thao tác]** Chỉ ra giao diện chấm bài bạn (nếu có)

> *"Sau khi nộp, hệ thống gán bài của bạn khác để review. Học viên chấm theo **rubric** — các tiêu chí đánh giá có sẵn — và viết feedback.*
>
> *Nếu không đồng ý với điểm nhận được, học viên có thể **appeal** — tức là khiếu nại. Và giảng viên hoặc trợ giảng có quyền **regrade** — chấm lại bằng tay."*

---

## PHẦN 5: DIỄN ĐÀN CỘNG ĐỒNG (3 phút)

### Bước 5.1 — Xem diễn đàn

**[Thao tác]** Click sidebar "Diễn đàn" → `/forum`

> *"Đây là **Diễn đàn cộng đồng** — nơi học viên và giảng viên trao đổi, hỏi đáp."*

**[Thao tác]** Chỉ vào bộ lọc và danh sách threads

> *"Diễn đàn có bộ lọc theo khóa học, hiển thị tổng số chủ đề. Mỗi thread hiển thị: tác giả kèm role tag, thời gian đăng, tiêu đề, số upvote, và nút mở rộng replies. Thread được pin sẽ có badge đặc biệt hiển thị trên cùng."*

---

### Bước 5.2 — Tạo bài viết mới

**[Thao tác]** Click "Tạo chủ đề thảo luận mới" → Điền form:
- Tiêu đề: `Hỏi về cách cài đặt Python trên Mac`
- Nội dung: `Mình mới bắt đầu học Python, ai có thể hướng dẫn cách cài đặt trên MacOS không?`
- Chọn khóa học liên quan

> *"Tạo một chủ đề mới. Mỗi thread gắn với một khóa học cụ thể để dễ quản lý."*

**[Thao tác]** Click "Đăng"

> *"Bài viết được đăng thành công."*

---

### Bước 5.3 — Tương tác

**[Thao tác]** Mở một thread có sẵn → Cuộn xuống replies

> *"Vào một chủ đề có sẵn, ta thấy các replies."*

**[Thao tác]** Click nút upvote trên một reply

> *"Hệ thống **Upvote/Downvote** giúp nổi bật câu trả lời hữu ích. Mỗi user chỉ vote 1 lần cho mỗi bài."*

**[Thao tác]** Nhập reply: `"Cảm ơn bạn, mình đã làm theo và thành công rồi!"` → Click "Gửi"

> *"Khi có reply mới, hệ thống tự động gửi **notification** cho tác giả thread. Đây là integration giữa module Forum và module Notification."*

**[Thao tác]** Chỉ vào reply có badge "Staff Answer" (nếu có)

> *"Giảng viên hoặc trợ giảng có quyền **pin** một reply làm **Staff Answer** — câu trả lời chính thức. Reply này sẽ được highlight đặc biệt để học viên dễ nhận biết."*

---

## PHẦN 6: CHỨNG CHỈ & THANH TOÁN (4 phút)

### Bước 6.1 — Nhận chứng chỉ

**[Thao tác]** Vào "Học tập của tôi" → Tab "Đã hoàn thành" → Click "Xem chứng chỉ"

> *"Khi hoàn thành 100% khóa học, học viên có thể nhận **Chứng chỉ Xác minh**. Hệ thống kiểm tra 3 điều kiện: hoàn thành tất cả nội dung, đạt điểm các bài graded, và đã xác minh danh tính KYC."*

**[Thao tác]** Chứng chỉ hiển thị

> *"Chứng chỉ hiển thị đầy đủ: tên học viên, tên khóa học, ngày cấp, mã chứng chỉ duy nhất, **chữ ký điện tử** của giảng viên, và **QR Code** dạng SVG. Chứng chỉ tuân theo chuẩn **W3C OpenBadges 2.0 JSON-LD** — đây là tiêu chuẩn quốc tế cho chứng chỉ số."*

**[Thao tác]** Chỉ vào nút "Download Badge (JSON)"

> *"Có thể tải xuống metadata dạng JSON-LD theo chuẩn OpenBadges để chia sẻ hoặc nhúng vào LinkedIn, portfolio."*

---

### Bước 6.2 — Xác minh chứng chỉ (Public)

**[Thao tác]** Mở tab mới → vào `/verify`

> *"Đây là trang **Xác minh chứng chỉ công khai**. Bất kỳ ai — nhà tuyển dụng, trường đại học — đều có thể truy cập trang này **mà không cần đăng nhập** để kiểm tra tính xác thực của chứng chỉ."*

**[Thao tác]** Nhập mã chứng chỉ → Click "Tra cứu"

> *"Nhập mã chứng chỉ hoặc quét QR Code. API **verify_certificate_public** là public endpoint — không yêu cầu xác thực."*

**[Thao tác]** Kết quả hiển thị: ✅ Chứng chỉ hợp lệ

> *"Hệ thống xác nhận chứng chỉ hợp lệ và hiển thị chi tiết: tên người nhận, khóa học, ngày cấp, đối tác giáo dục, chữ ký người ký, và trạng thái. Nếu chứng chỉ đã bị thu hồi vì vi phạm liêm chính, trạng thái sẽ hiển thị **Revoked** kèm lý do."*

---

### Bước 6.3 — Thanh toán VNPay

**[Thao tác]** Quay lại trang Learner → Vào một khóa học trả phí → Click "Nâng Cấp Paid Mode"

> *"Với khóa học trả phí, học viên cần thanh toán để truy cập đầy đủ. Hệ thống tích hợp cổng thanh toán **VNPay** — cổng thanh toán phổ biến nhất tại Việt Nam."*

**[Thao tác]** Popup thanh toán hiển thị → Click thanh toán → Redirect đến trang VNPay sandbox

> *"Hệ thống tạo đơn hàng, lưu vào bảng **payment_orders**, và generate URL thanh toán VNPay. Người dùng được redirect đến trang thanh toán của VNPay."*

**[Thao tác]** Trên trang VNPay sandbox, điền:
- Số thẻ: `9704198526191432198`
- Tên: `NGUYEN VAN A`
- Ngày HH: `07/15`
- OTP: `123456`

> *"Đây là môi trường sandbox của VNPay với thẻ test. Trong production sẽ là thẻ ngân hàng thật."*

**[Thao tác]** Thanh toán thành công → Redirect về LMS

> *"Thanh toán thành công. VNPay gửi **IPN** — Instant Payment Notification — server-to-server đến backend để xác nhận giao dịch. Hệ thống ghi nhận vào bảng **payment_transactions** và mở khóa khóa học cho học viên. Ngoài mua khóa học lẻ, hệ thống còn hỗ trợ gói **subscription** theo tháng hoặc năm."*

---

### Bước 6.4 — Hỗ trợ tài chính

**[Thao tác]** Vào một khóa học có Financial Aid → Click "Financial Aid available"

> *"Với học viên khó khăn tài chính, hệ thống có tính năng **Hỗ trợ tài chính** — tương tự Coursera. Học viên cần viết một bài luận tối thiểu **150 từ** giải thích lý do."*

**[Thao tác]** Chỉ ra form với word counter

> *"Form có bộ đếm từ realtime — hiển thị thanh tiến độ cho đến khi đạt 150 từ. Ngoài ra có cam kết liêm chính học thuật. Đơn sẽ được Admin review và phê duyệt hoặc từ chối."*

---

## PHẦN 7: QUẢN TRỊ VIÊN (3 phút)

### Bước 7.1 — Dashboard Admin

**[Thao tác]** Đăng xuất → Đăng nhập tài khoản **Super Admin** (`admin@coursera.ai` / `123456`)

> *"Cuối cùng, em chuyển sang vai trò **Super Admin**. Dashboard Admin hiển thị thanh công cụ nhanh cho các tác vụ quản trị: Duyệt đơn giảng viên, Duyệt khóa học, Quản lý danh mục, và Quản trị đối tác."*

**[Thao tác]** Chỉ vào phần Enterprise Seats

> *"Phần chính của Admin Dashboard là quản lý **Enterprise License** — mã kích hoạt doanh nghiệp. Admin có thể tạo mã license, gán cho học viên, theo dõi tỷ lệ sử dụng."*

---

### Bước 7.2 — Duyệt khóa học

**[Thao tác]** Click "Duyệt Khóa Học" → `/admin/courses/review`

> *"Đây là trang duyệt khóa học. Admin thấy danh sách khóa học theo trạng thái: Chờ kiểm duyệt, Đã xuất bản, Bản nháp, và Từ chối."*

**[Thao tác]** Click tab "Chờ kiểm duyệt" → Thấy khóa học vừa submit ở Phần 2

> *"Khóa học **Lập trình Python cơ bản** mà giảng viên vừa gửi ở phần 2 đang chờ duyệt ở đây."*

**[Thao tác]** Click "Xem trước (Student Mode)"

> *"Admin có thể **xem trước** khóa học từ góc nhìn học viên để kiểm tra nội dung."*

**[Thao tác]** Click "Phê duyệt & Phát hành"

> *"Sau khi review, Admin click **Phê duyệt**. Khóa học chuyển sang trạng thái **Published** và xuất hiện trên danh mục cho học viên đăng ký. Nếu nội dung chưa đạt, Admin click **Từ chối** kèm lý do, giảng viên sẽ nhận notification và chỉnh sửa lại."*

---

### Bước 7.3 — Duyệt đơn Giảng viên

**[Thao tác]** Click "Duyệt Đơn Giảng Viên" → `/admin/applications`

> *"Trang duyệt đơn ứng tuyển Giảng viên. Khi một Learner muốn trở thành Instructor, họ nộp hồ sơ gồm: tiêu đề chuyên môn, giới thiệu bản thân, LinkedIn, CV PDF, và video demo giảng dạy."*

**[Thao tác]** Chỉ vào một đơn ứng tuyển

> *"Admin xem chi tiết hồ sơ, có thể mở CV và video demo. Sau đó quyết định **Phê duyệt** — hệ thống tự động nâng role từ Learner lên Instructor — hoặc **Từ chối** kèm lý do."*

---

### Bước 7.4 — Hệ thống thông báo

**[Thao tác]** Click icon chuông 🔔 trên header

> *"Cuối cùng, hệ thống **Notification** hoạt động xuyên suốt tất cả các tính năng. Khi có reply mới trên diễn đàn, khi khóa học được duyệt, khi đơn hỗ trợ tài chính được phê duyệt, khi chứng chỉ được cấp — tất cả đều tự động gửi notification."*

**[Thao tác]** Chỉ ra dropdown notification với các loại khác nhau

> *"Thông báo được phân thành 4 loại: **System**, **Academic**, **Community**, và **Announcement**. Có badge đếm số chưa đọc, và nút đánh dấu tất cả đã đọc."*

**[Thao tác]** Vào Settings → Phần notification preferences

> *"Trong Cài đặt, người dùng có thể tùy chỉnh **loại thông báo** muốn nhận: bật/tắt email, in-app, nhắc nhở học tập, thông báo cộng đồng, và thông báo khóa học."*

---

## 🎤 LỜI KẾT (1 phút)

> *"Vừa rồi em đã demo các chức năng chính đã hoàn thành trên hệ thống LMS AI. Tổng kết lại, hệ thống bao gồm:*
>
> *Về chức năng: **15 nhóm tính năng chính** — từ xác thực phân quyền, quản lý khóa học, trải nghiệm học tập, hệ thống kiểm tra đánh giá với Quiz Engine random đề, Lab tự động chấm, Peer Review, đến diễn đàn cộng đồng, chứng chỉ số theo chuẩn OpenBadges, và thanh toán VNPay.*
>
> *Về kỹ thuật: hệ thống có **44 bảng database**, **43 Alembic migrations**, **115 API endpoints** qua ConnectRPC, **9 bounded contexts** theo kiến trúc Domain-Driven Design. Bảo mật 3 tầng PBAC/ReBAC. Lưu trữ file trên MinIO. Giám sát phân tán qua OpenTelemetry và Jaeger. Giao diện Material Design 3 với Dark Mode.*
>
> *Hướng phát triển tiếp theo sẽ là hoàn thiện **Trợ lý AI tích hợp RAG** — phần frontend UI đã sẵn sàng với CopilotKit, backend sẽ tích hợp pgvector cho vector search và LLM API để hỗ trợ học viên hỏi đáp dựa trên tài liệu khóa học.*
>
> *Em xin kết thúc phần demo. Thầy/cô và các bạn có câu hỏi nào không ạ?"*

---

## ⚠️ CÂU HỎI THƯỜNG GẶP & CÁCH TRẢ LỜI

### ❓ "Phần AI Chatbot hoạt động như thế nào?"

> *"Frontend đã tích hợp CopilotKit v2 làm giao diện AI Assistant. Backend đã chuẩn bị sẵn PostgreSQL với extension pgvector cho vector search, và đã định nghĩa proto interface cho AI Coach service. Pipeline RAG hoàn chỉnh — bao gồm PDF extraction, chunking, embedding, và retrieval — đang trong giai đoạn triển khai cuối."*

### ❓ "Tại sao chọn Modular Monolith thay vì Microservices?"

> *"Với quy mô dự án thực tập và team 1 người, Microservices sẽ tạo overhead quá lớn về deployment, monitoring, và network latency. Modular Monolith cho phép em tách biệt logic theo domain rõ ràng, dễ maintain, nhưng vẫn deploy đơn giản. Khi cần scale sau này, từng module có thể tách ra thành service riêng nhờ đã định nghĩa sẵn API contract qua Protobuf."*

### ❓ "Tại sao dùng ConnectRPC thay vì REST API?"

> *"ConnectRPC — tức gRPC over HTTP — cho phép định nghĩa API contract trước bằng Protobuf, sau đó tự động generate code cho cả backend Python và frontend TypeScript. Điều này đảm bảo type-safety end-to-end, giảm sai sót khi frontend gọi API, và tăng tốc phát triển vì không cần viết serialization/deserialization thủ công."*

### ❓ "Quiz Matrix hoạt động ra sao để chống gian lận?"

> *"Quiz Matrix cho phép giảng viên cấu hình: lấy X câu Dễ, Y câu Trung bình, Z câu Khó từ ngân hàng câu hỏi. Mỗi lần học viên bắt đầu quiz, server random câu hỏi theo tỉ lệ này và tạo snapshot bất biến. Kết hợp với cooldown 8 giờ và giới hạn số lần thử, cơ chế này đảm bảo mỗi người nhận đề khác nhau và không thể brute-force đáp án."*

### ❓ "Hệ thống bảo mật như thế nào?"

> *"Bảo mật 3 tầng: Tầng 1 — Auth Interceptor kiểm tra JWT token và decode user claims. Tầng 2 — Access Policy Service kiểm tra quyền dựa trên role và resource ownership. Tầng 3 — Database-level constraints với row-level security. Ngoài ra, mỗi RPC trong proto file đều được annotate với policy: PUBLIC, AUTHENTICATED, ADMIN, hoặc INTERNAL."*

### ❓ "Chứng chỉ theo chuẩn gì?"

> *"Chứng chỉ tuân theo chuẩn W3C OpenBadges 2.0 — tiêu chuẩn quốc tế cho chứng chỉ số. Metadata được encode dạng JSON-LD, có chữ ký RSA của giảng viên và đối tác giáo dục, QR Code dạng SVG, và endpoint xác minh công khai. Hệ thống còn hỗ trợ thu hồi chứng chỉ nếu phát hiện vi phạm liêm chính."*

### ❓ "Hệ thống xử lý thanh toán như thế nào?"

> *"Tích hợp cổng VNPay theo quy trình: Backend tạo payment order → generate VNPay URL với HMAC-SHA512 hash → redirect user đến VNPay → user thanh toán → VNPay gửi IPN callback server-to-server → Backend verify hash + cập nhật trạng thái đơn hàng + mở khóa khóa học. Toàn bộ giao dịch được log vào bảng payment_transactions để audit trail."*

### ❓ "Database schema có bao nhiêu bảng?"

> *"44 bảng chia theo 9 bounded contexts: Identity (5 bảng), Catalog (11 bảng), Learning (3 bảng), Assessment (13 bảng), Forum (3 bảng), Certificate (2 bảng), Notification (2 bảng), Payment (4 bảng), và Partner (1 bảng). Schema phát triển qua 43 Alembic migrations."*

---

## 📋 CHECKLIST CHUẨN BỊ TRƯỚC DEMO

- [ ] Chạy Docker services: `docker compose --profile infra up -d`
- [ ] Chạy backend: `uv run uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Chạy frontend: `pnpm dev`
- [ ] Đăng nhập thử 5 tài khoản trên đám mây (password chung `123456`):
  - `learner@coursera.ai` (Học viên)
  - `instructor@coursera.ai` (Giảng viên)
  - `ta@coursera.ai` (Trợ giảng)
  - `partner@coursera.ai` (Quản trị viên Tổ chức)
  - `admin@coursera.ai` (Super Admin)
- [ ] Seed data: khóa học published, question bank, quiz matrix, forum threads
- [ ] Có ít nhất 1 khóa học đã hoàn thành 100% (để demo certificate)
- [ ] Có ít nhất 1 khóa học trả phí (để demo VNPay)
- [ ] Có forum threads với replies (để demo diễn đàn)
- [ ] Mở sẵn 3 tab trình duyệt (hoặc 3 cửa sổ) cho: Learner, Instructor, Admin
- [ ] Test thử toàn bộ flow 1 lần trước khi demo chính thức
- [ ] Đảm bảo internet ổn định (cho VNPay sandbox và Google OAuth)
- [ ] Chuẩn bị slide backup phòng trường hợp server gặp sự cố
