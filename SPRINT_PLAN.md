# KẾ HOẠCH THỰC THI SPRINT (5 NGÀY THỰC THI + 2 NGÀY BACKUP DỰ PHÒNG)

**Dự án:** Coursera LMS Platform (Tích hợp Coursera AI Coach & PostgreSQL 17 pgvector)  
**Mô hình phát triển:** Modular Monolith & Domain-Driven Design (DDD)  
**Thời gian hoàn thành:** 7 ngày (5 ngày hoàn thành mã nguồn + 2 ngày Backup dự phòng rủi ro)

---

## I. NGUYÊN TẮC PHÁT TRIỂN SONG SONG (ZERO-BLOCKER RULES)

1. **Contract-First (API Trước):** Sprint 0 đã chốt 100% tệp `.proto` và biên dịch stubs mã nguồn (`backend/src/gen/` & `frontend/src/gen/`). Lập trình viên phụ trách Frontend và Backend có thể phát triển song song bằng dữ liệu mock mà không bị phụ thuộc.
2. **Độc lập Thư mục (Directory Boundaries):** Mỗi phân hệ sở hữu 1 Bounded Context riêng biệt ở cả Backend (`backend/src/modules/<module>`) và Frontend (`frontend/src/app/<route>`). Đảm bảo độc lập tuyệt đối giữa các thư mục mã nguồn.
3. **Phân nhánh Git Độc lập:**
   - `feature/catalog`
   - `feature/assessment`
   - `feature/ai-coach`
   - `feature/certificate`

---

## II. MA TRẬN PHÂN HỆ CÔNG VIỆC (FEATURE TRACK MATRIX)

| Phân hệ (Track) | Phân hệ Phụ trách (Bounded Context) | Mã nguồn Backend (`backend/src/modules/`) | Route Frontend (`frontend/src/app/`) |
| :---: | :--- | :--- | :--- |
| 🟢 **TRACK A** | **Catalog, Player & Learning Progress** | `modules/catalog/`<br>`modules/learning/` | `/courses`<br>`/learn/[courseId]` |
| 🔵 **TRACK B** | **Assessments, Auto-Grader & Peer Review** | `modules/assessment/` | `/assessments`<br>`/peer-review` |
| 🟣 **TRACK C** | **Coursera AI Coach (RAG) & Discussion Forum** | `modules/ai_coach/`<br>`modules/forum/` | `/forum`<br>Widget AI Coach góc phải bài học |
| 🔴 **TRACK D** | **Identity, Financial Aid & Verified Certificate** | `modules/identity/`<br>`modules/certificate/` | `/auth`<br>`/financial-aid`<br>`/verify/[certId]` |

---

## III. LỊCH TRÌNH THỰC THI 5 NGÀY THỰC THI + 2 NGÀY BACKUP DỰ PHÒNG

```
[NGÀY 1: SPRINT 0 COMPLETED] ➔ [NGÀY 2-3: CORE MVP] ➔ [NGÀY 4-5: ADVANCED & MERGE] ➔ [NGÀY 6-7: BUFFER BACKUP & UAT]
```

### 📍 NGÀY 1 (Thứ 2) - SPRINT 0: INFRASTRUCTURE & API CONTRACTS (ĐÃ HOÀN THÀNH 100% 🚀)
- Đã hoàn thành 7 tệp `.proto` trong `proto/` và sinh stubs tự động cho Backend & Frontend.
- Đã dựng Docker Postgres 17 `pgvector`, MinIO S3 Storage, Alembic Async, AsyncSession Scope, Pydantic Settings & Bộ 8 UI Components dùng chung.

---

### 📍 NGÀY 2 & 3 (Thứ 3 & 4) - SPRINT 1: NÉN PHÂN HỆ CỐT LÕI (Phát triển song song)
- 🟢 **TRACK A (Catalog & Player):** Trang danh sách/chi tiết khóa học + Video Player kèm Phụ đề cuộn (Interactive Transcript) & In-Video Quiz ngắt ngang video.
- 🔵 **TRACK B (Assessments & Auto-Grader):** Graded Quiz Engine (điểm Pass 80%, Cooldown 8h), Sandbox Auto-Graded Lab chạy Test Cases bài tập lập trình & Cam kết Honor Code.
- 🟣 **TRACK C (AI Coach & Vector RAG):** Vector RAG Pipeline (Vector hóa Video Transcript/Bài đọc vào PostgreSQL `pgvector`) & Khung chat Coursera AI Coach góc phải bài học.
- 🔴 **TRACK D (Identity & Financial Aid):** Luồng Đăng nhập/Đăng ký 5 vai trò + Nộp đơn xin Hỗ trợ tài chính (Financial Aid 150 từ, đếm ngược 15 ngày auto-approve) & Mã Suất học Doanh nghiệp.

---

### 📍 NGÀY 4 & 5 (Thứ 5 & 6) - SPRINT 2: NÉN TÍNH NĂNG NÂNG CAO & MERGE CODE
- 🟢 **TRACK A (Flexible Deadlines & Notes):** Hạn nộp linh hoạt (Flexible Schedule - **"Reset my deadlines"**) & Lưu Ghi chú cá nhân (Highlight Notes).
- 🔵 **TRACK B (Peer Review Sub-system):** Peer-Graded Assignment (Tạo Rubric, Chấm chéo 3 bạn học, Outlier Detection >30% & Đơn khiếu nại điểm Grade Appeal).
- 🟣 **TRACK C (Discussion Forum & Anti-Cheat):** Diễn đàn thảo luận bám sát bài học (Item-level Forum, Upvote/Downvote, Staff Answer Pinning) & Anti-Cheat Guardrails cho AI Coach.
- 🔴 **TRACK D (Verified Certificate & Admin):** Trang xác thực chứng chỉ công khai (`/verify/CERT-xxx`), nhúng OpenBadges 2.0 chia sẻ LinkedIn & Admin Dashboard.
- 🏁 **TỐI NGÀY 5 (CHÓT CODEBASE):** Tạo Pull Request, Merge các nhánh vào `main`, chạy `make test` ở Backend và `npm run build` ở Frontend.

---

### 🛡️ NGÀY 6 (Thứ 7) - BACKUP / BUFFER DAY 1 (DỰ PHÒNG RỦI RO & CHỈNH SỬA BUG)
- Dành trọn 1 ngày để xử lý các lỗi phát sinh (Edge Cases), sửa các lỗi tích hợp API giữa các phân hệ, tối ưu hóa giao diện UI/UX và tốc độ truy vấn `pgvector`.

---

### 🛡️ NGÀY 7 (Chủ Nhật) - BACKUP / BUFFER DAY 2 & FINALIZE HANDOVER
- Chạy 5 kịch bản kiểm thử UAT thực tế theo tệp `docs/05_kich_ban_kiem_thu_uat.md`.
- Tổng duyệt sản phẩm và hoàn tất bàn giao.
