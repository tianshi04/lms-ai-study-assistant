# Kiến trúc Tích hợp AI Chatbot với CopilotKit (v2)

Tài liệu này mô tả chi tiết giải pháp thiết kế và triển khai trợ lý AI Chatbot thông minh cho ứng dụng LMS (Frontend Next.js App Router) sử dụng **CopilotKit v2**.

---

## 1. Tổng quan Kiến trúc

AI Chatbot được triển khai theo mô hình Hybrid giữa Server-Side Runtime Handler và Client-Side Chatbot Widgets:

```
[ Frontend Next.js ] <---> [ CopilotKit Runtime Endpoint ] <---> [ Google Gemini 3.6 Flash ]
  (AIChatbot / LearnPageAIChatbot)   (/api/copilotkit/[[...slug]])        (GOOGLE_API_KEY)
           |                                   |
   (useFrontendTool)                     (Multi-Agent)
           |                        (generalAgent & learnAgent)
(navigateTo / searchCourses / seekTo...)
```

---

## 2. Các Thành phần Chính

### 2.1 Runtime Handler Endpoint & Multi-Agent Engine
- **Vị trí**: `frontend/src/app/api/copilotkit/[[...slug]]/route.ts`
- **Công nghệ**: Hono Vercel Adapter (`createCopilotHonoHandler` từ `@copilotkit/runtime/v2`).
- **LLM Model**: Cấu hình mặc định `google/gemini-3.6-flash` (đọc qua `COPILOT_MODEL` hoặc `NEXT_PUBLIC_COPILOT_MODEL`).
- **Biến môi trường**: Đọc `GOOGLE_API_KEY` từ `frontend/.env.local`.
- **Cấu hình Đa Trợ Lý (Multi-Agent Setup)**:
  1. `default` (`generalAgent`): Trợ Lý AI Tổng Quan cho toàn hệ thống LMS, hỗ trợ điều hướng, tìm kiếm khóa học, tra cứu lịch học, thông báo, hỗ trợ tài chính và cài đặt tài khoản.
  2. `learnAgent`: Trợ Lý AI Học Tập Socratic chuyên biệt cho giao diện Trình phát bài học (`/learn/[courseId]`), đóng vai trò trợ giảng kiên nhẫn, đưa ra gợi ý từng bước (Scaffolding Hints) mà không cho trực tiếp đáp án bài tập.

### 2.2 React Provider & Style
- **Vị trí**: `frontend/src/components/providers/CopilotProvider.tsx`
- Bọc `<CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>` từ `@copilotkit/react-core/v2`.
- Tự động nạp stylesheet chuẩn `@copilotkit/react-core/v2/styles.css`.

### 2.3 UI Chatbot Components (Giao diện Kép)
1. **Trợ lý Tổng quan Nền tảng (`AIChatbot.tsx`)**:
   - **Vị trí**: `frontend/src/components/ai/AIChatbot.tsx`
   - Hiển thị nút bấm nổi (Floating Widget) và ô hội thoại ở góc dưới màn hình cho toàn bộ các trang công khai và quản trị.
   - Tự động bản ngữ hóa theo đa ngôn ngữ (Tiếng Việt `vi` & Tiếng Anh `en`).
2. **Trợ lý Học tập Socratic (`LearnPageAIChatbot.tsx`)**:
   - **Vị trí**: `frontend/src/components/player/ai/LearnPageAIChatbot.tsx`
   - Tích hợp trực tiếp vào thanh công cụ Trình phát Bài học (`/learn/[courseId]`).
   - Tự động đọc dữ liệu 5 tầng ngữ cảnh (Video timestamp, Transcript, Reading material, Quiz context, Unit details) để giải thích sâu bài học.

### 2.4 Frontend Tools (Client-Side Actions)
Đăng ký thông qua hook `useFrontendTool`:
1. `navigateTo`: Cho phép trợ lý AI điều hướng người dùng trực tiếp tới các trang trong hệ thống (`/courses`, `/my-learning`, `/certificates`, `/financial-aid`, `/forum`, v.v.).
2. `searchCourses`: Tìm kiếm khóa học theo từ khóa và điều hướng tới danh mục khóa học (`/courses?q=...`).
3. `filterCoursesByCategory`: Lọc khóa học theo chủ đề/danh mục (`/courses?category=...`).
4. `getCurrentLocation`: Trích xuất ngữ cảnh đường dẫn (URL) hiện tại của người dùng.
5. `seekToTimestamp`: Nhảy trực tiếp tới mốc thời gian cụ thể trong video bài giảng.
6. `saveNote`: Tự động khởi tạo Ghi chú cá nhân từ nội dung giải thích của AI.
7. `getCourseContext` / `getLessonContext` / `getUnitContext` / `getQuizContext`: Trích xuất ngữ cảnh chi tiết của bài đọc, bài tập trắc nghiệm hoặc bài học đang xem.
8. `applyFinancialAid` / `viewCertificates`: Điều hướng nhanh tới trang nộp đơn học bổng hoặc trang chứng chỉ cá nhân.

---

## 3. Cấu hình & Khởi chạy

1. **Thêm API Key vào `.env.local`**:
   ```env
   GOOGLE_API_KEY=AIzaSy...
   COPILOT_MODEL=google/gemini-3.6-flash
   ```
2. **Khởi chạy Development Server**:
   ```bash
   pnpm run dev
   ```
3. **Kiểm tra thông tin Runtime Endpoint**:
   Tải `http://localhost:3000/api/copilotkit/info` để xác nhận danh sách Agents khả dụng (`default` và `learnAgent`).
