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

| Phân hệ (Track) | Phân hệ Phụ trách (Bounded Context) | Mã nguồn Backend (`backend/src/modules/`) | Route Frontend (`frontend/src/app/`) | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| 🟢 **TRACK A** | **Catalog, Player & Learning Progress** | `modules/catalog/`<br>`modules/learning/` | `/courses`<br>`/learn/[courseId]` | ✅ **100% HOÀN THÀNH** |
| 🔵 **TRACK B** | **Assessments, Auto-Grader & Peer Review** | `modules/assessment/` | `/assessments`<br>`/peer-review` | ⏳ Tiếp theo |
| 🟣 **TRACK C** | **Coursera AI Coach (RAG) & Discussion Forum** | `modules/ai_coach/`<br>`modules/forum/` | `/forum`<br>Widget AI Coach góc phải bài học | ⏳ Sắp thực hiện |
| 🔴 **TRACK D** | **Identity, Financial Aid & Verified Certificate** | `modules/identity/`<br>`modules/certificate/` | `/auth`<br>`/financial-aid`<br>`/verify/[certId]` | ✅ **100% HOÀN THÀNH** |

---

## III. LỊCH TRÌNH THỰC THI & TIẾN ĐỘ THỰC TẾ

```
[NGÀY 1: SPRINT 0 COMPLETED] ➔ [TRACK A COMPLETED 100%] ➔ [NGÀY 2-3: TRACK B & D] ➔ [NGÀY 4-5: TRACK C & MERGE]
```

### 📍 NGÀY 1 (Thứ 2) - SPRINT 0: INFRASTRUCTURE & API CONTRACTS (ĐÃ HOÀN THÀNH 100% 🚀)
- Đã hoàn thành 7 tệp `.proto` trong `proto/` và sinh stubs tự động cho Backend & Frontend.
- Đã dựng Docker Postgres 17 `pgvector`, MinIO S3 Storage, Alembic Async, AsyncSession Scope, Pydantic Settings & Bộ 8 UI Components dùng chung.

---

### 📍 NGÀY 2 & 3 - TRACK A: CATALOG, PLAYER & LEARNING PROGRESS (ĐÃ HOÀN THÀNH 100% 🎉)
- ✅ **Trang Catalog & Chi tiết:** Đã xây dựng `/courses` & `/courses/[courseId]` lấy 100% dữ liệu động từ PostgreSQL 17.
- ✅ **Course Player & Multi-Theme:** Video Player kèm Phụ đề cuộn (Interactive Transcript) & In-Video Quiz ngắt ngang video; thích ứng Light/Dark Mode.
- ✅ **Dynamic Progress Tracking:** Đã triển khai RPC `MarkItemComplete`, tính `%` hoàn thành bài học realtime, tích xanh ✔️ sidebar và tự động hoàn thành video khi xem $\ge 80\%$.
- ✅ **Flexible Deadlines & Personal Notes:** RPC `ResetDeadlines` & lưu Ghi chú cá nhân (Highlight Notes).
- ✅ **DDD Clean Architecture & Seeding:** Tách biệt Seeding thành script `backend/src/seed.py` (hỗ trợ Upsert & Clean Reset) và tích hợp tự động nạp dữ liệu khi DB rỗng.

---

### 📍 BƯỚC TIẾP THEO: TRACK B, C & D
- 🔵 **TRACK B (Assessments & Auto-Grader):** Graded Quiz Engine (điểm Pass 80%, Cooldown 8h), Sandbox Auto-Graded Lab bài tập lập trình & Peer Review.
- 🟣 **TRACK C (AI Coach & Vector RAG):** Vector RAG Pipeline (Vector hóa Video Transcript/Bài đọc vào PostgreSQL `pgvector`) & Khung chat Coursera AI Coach.
- 🔴 **TRACK D (Identity, Financial Aid & Certificate):** Nộp đơn xin Hỗ trợ tài chính (Financial Aid 150 từ), Xác thực chứng chỉ công khai (`/verify/[certId]`).

---

### 🛡️ NGÀY 6 & 7 - BACKUP / BUFFER & FINALIZE HANDOVER
- Chạy 5 kịch bản kiểm thử UAT thực tế theo tệp `docs/05_kich_ban_kiem_thu_uat.md`.
- Tổng duyệt sản phẩm và hoàn tất bàn giao.
