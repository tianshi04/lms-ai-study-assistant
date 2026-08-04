# Kiến trúc Tích hợp AI Chatbot với CopilotKit (v2)

Tài liệu này mô tả chi tiết giải pháp thiết kế và triển khai trợ lý AI Chatbot thông minh cho ứng dụng LMS (Frontend Next.js App Router) sử dụng **CopilotKit v2**.

---

## 1. Tổng quan Kiến trúc

AI Chatbot được triển khai theo mô hình Hybrid giữa Server-Side Runtime Handler và Client-Side Chatbot Widget:

```
[ Frontend Next.js ] <---> [ CopilotKit Runtime Endpoint ] <---> [ Google Gemini 3.6 Flash ]
    (CopilotPopup)             (/api/copilotkit/[[...slug]])        (GOOGLE_API_KEY)
          |
   (useFrontendTool)
          |
(navigateTo / searchCourses)
```

---

## 2. Các Thành phần Chính

### 2.1 Runtime Handler Endpoint
- **Vị trí**: `frontend/src/app/api/copilotkit/[[...slug]]/route.ts`
- **Công nghệ**: Hono Vercel Adapter (`createCopilotHonoHandler` từ `@copilotkit/runtime/v2`).
- **LLM Agent**: `BuiltInAgent` cấu hình model `google/gemini-3.6-flash`.
- **Biến môi trường**: Đọc `GOOGLE_API_KEY` từ `frontend/.env.local`.

### 2.2 React Provider & Style
- **Vị trí**: `frontend/src/components/providers/CopilotProvider.tsx`
- Bọc `<CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>` từ `@copilotkit/react-core/v2`.
- Tự động nạp stylesheet chuẩn `@copilotkit/react-core/v2/styles.css`.

### 2.3 UI Chatbot Component
- **Vị trí**: `frontend/src/components/ai/AIChatbot.tsx`
- Hiển thị dưới dạng **CopilotPopup** ở góc dưới bên phải màn hình.
- Tự động bản ngữ hóa theo đa ngôn ngữ (Tiếng Việt `vi` & Tiếng Anh `en`) với từ điển `frontend/src/dictionaries/`.

### 2.4 Frontend Tools (Client-Side Actions)
Đăng ký thông qua hook `useFrontendTool`:
1. `navigateTo`: Cho phép trợ lý AI điều hướng người dùng trực tiếp tới các trang trong hệ thống (`/courses`, `/my-learning`, `/certificates`, v.v.).
2. `searchCourses`: Tìm kiếm khóa học theo từ khóa và điều hướng tới danh mục khóa học (`/courses?q=...`).
3. `getCurrentLocation`: Trích xuất ngữ cảnh đường dẫn (URL) hiện tại của người dùng.

---

## 3. Cấu hình & Khởi chạy

1. **Thêm API Key vào `.env.local`**:
   ```env
   GOOGLE_API_KEY=AIzaSy...
   ```
2. **Khởi chạy Development Server**:
   ```bash
   npm run dev
   ```
3. **Kiểm tra thông tin Runtime Endpoint**:
   Tải `http://localhost:3000/api/copilotkit/info` để xác nhận danh sách Agent khả dụng.
