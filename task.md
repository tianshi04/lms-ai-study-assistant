# 🏗️ BẢN THIẾT KẾ KỸ THUẬT & KẾ HOẠCH TRIỂN KHAI TÍCH HỢP SCORM (1.2 & 2004)

Tài liệu này định nghĩa thiết kế kỹ thuật, danh sách các gói SCORM kiểm thử đã được tải về dự án, và kế hoạch triển khai từng bước cho tính năng tích hợp SCORM. AI Agent sẽ dừng lại sau khi bạn duyệt tài liệu này và chỉ bắt đầu viết code khi nhận được lệnh đồng ý của bạn.

---

## 1. Các gói SCORM mẫu đã tải về phục vụ kiểm thử (Test SCORM Packages)

Chúng tôi đã tự động tải thành công các gói SCORM mẫu tiêu chuẩn của tổ chức Rustici Software về thư mục cục bộ của dự án để bạn dễ dàng sử dụng:

1.  **Mẫu SCORM 1.2 (Golf Explained)**:
    *   *Đường dẫn tệp tin trong dự án*: [GolfExplained_SCORM_1.2.zip](file:///e:/lms-ai-study-assistant/scorm-samples/GolfExplained_SCORM_1.2.zip) (Dung lượng: ~356 KB)
    *   *Nội dung*: Khóa học giới thiệu môn chơi Golf, chứa slide tương tác, câu hỏi trắc nghiệm và gửi trạng thái hoàn thành (`lesson_status`), vị trí học (`lesson_location`).
2.  **Mẫu SCORM 2004 3rd Edition (Golf Explained)**:
    *   *Đường dẫn tệp tin trong dự án*: [GolfExplained_SCORM_2004.zip](file:///e:/lms-ai-study-assistant/scorm-samples/GolfExplained_SCORM_2004.zip) (Dung lượng: ~403 KB)
    *   *Nội dung*: Tương tự khóa học trên nhưng được đóng gói theo chuẩn SCORM 2004 (sử dụng cổng kết nối `API_1484_11` với các biến trạng thái mới).

*Hướng dẫn sử dụng: Bạn chỉ cần giữ nguyên các tệp ZIP này, đăng nhập bằng quyền Giảng viên (Instructor) trên giao diện quản trị của LMS để tạo bài học SCORM và tải tệp ZIP này lên.*

---

## 2. Bản Thiết kế Kỹ thuật (Technical Design)

### 2.1. Phân bổ Bounded Contexts (DDD)
*   **Catalog Module**: Lưu thông tin cấu trúc bài học, loại học liệu mới (`ITEM_TYPE_SCORM`) và thông tin lưu trữ gói SCORM tĩnh (đường dẫn S3 và file chạy chính).
*   **Learning Module**: Lưu trữ các biến tracking `cmi.*` (suspend_data, lesson_status, lesson_location, scores) dưới dạng JSON tương ứng với cặp `user_id` và `item_id`.

### 2.2. Giải quyết rào cản Same-Origin Policy (Next.js Proxy)
Next.js Development Server (`:3000`) sẽ làm proxy định tuyến ngầm các yêu cầu tới MinIO S3 (`:9000`) thông qua Next.js Rewrites:
```typescript
{
  source: "/scorm-content/:path*",
  destination: "http://localhost:9000/coursera-assets/:path*"
}
```
Giúp iframe tải tài nguyên dưới đường dẫn cục bộ `/scorm-content/scorm/packages/{item_id}/{entry_html}`, cùng Origin `:3000` với ứng dụng chính, cho phép mã Javascript bên trong SCORM gọi `window.parent.API` thành công.

---

## 3. Kế hoạch Triển khai từng bước (Step-by-Step Implementation Plan)

### Bước 1: Cập nhật API Contracts (Protobuf)
- [x] Khai báo `ITEM_TYPE_SCORM = 7` và các trường `scorm_package_path`, `scorm_entry_html` trong `proto/catalog/v1/catalog.proto`.
- [x] Khai báo các RPC `GetScormUploadUrl` và `ProcessScormPackage` trong `proto/catalog/v1/catalog.proto`.
- [x] Khai báo các RPC `GetScormTrackingState` và `SaveScormTrackingState` trong `proto/learning/v1/learning.proto`.
- [x] Biên dịch stubs Python (`make gen` trong `backend/`) và TypeScript (`npm run gen` trong `frontend/`).

### Bước 2: Cập nhật Cấu trúc Cơ sở dữ liệu & Models (Backend)
- [x] Cập nhật thực thế `ItemType` và `LearningItem` trong `backend/src/modules/catalog/domain/entities.py`.
- [x] Cập nhật ORM model `LearningItemModel` trong `backend/src/modules/catalog/infrastructure/models.py`.
- [x] Khởi tạo thực thể domain `ScormTracking` trong `backend/src/modules/learning/domain/entities.py`.
- [x] Khai báo ORM model `ScormTrackingModel` với trường `cmi_data` kiểu JSON trong `backend/src/modules/learning/infrastructure/models.py`.
- [x] Tạo file migration Alembic: `uv run alembic revision --autogenerate -m "add_scorm_support"`.
- [x] Áp dụng migration lên PostgreSQL: `uv run alembic upgrade head`.

### Bước 3: Hiện thực hóa Logic Nghiệp vụ & RPC Handlers (Backend)
- [x] Thêm các phương thức `get_scorm_tracking` và `save_scorm_tracking` (sử dụng PostgreSQL UPSERT) vào `SQLAlchemyLearningRepository`.
- [x] Cập nhật `LearningUseCase` để điều phối lấy/lưu trạng thái SCORM tracking.
- [x] Triển khai các RPC handler tương ứng trong `LearningHandler`.
- [x] Triển khai usecase `get_scorm_upload_url` sinh presigned URL S3 trong `CatalogUseCase`.
- [x] Triển khai usecase `process_scorm_package` thực hiện: giải nén ZIP tạm, dùng `xml.etree.ElementTree` phân tích `imsmanifest.xml` để tự động xác định file khởi chạy, đẩy toàn bộ file tĩnh lên S3/MinIO và tạo `LearningItem` trong CSDL.
- [x] Triển khai các RPC handler tương ứng trong `CatalogHandler`.

### Bước 4: Hiện thực hóa Logic & Player Giao diện (Frontend)
- [x] Cấu hình `rewrites` trong `next.config.ts` để proxy `/scorm-content/*` sang MinIO S3 bucket, giải quyết Same-Origin Policy.
- [x] Viết các React Query hooks `useScormTrackingQuery` và `useSaveScormTrackingMutation` trong `frontend/src/lib/query_hooks.ts`.
- [x] Viết lớp `ScormAPIAdapter.ts` trong `frontend/src/lib/ScormAPIAdapter.ts` hỗ trợ API SCORM 1.2 (`window.API`) và SCORM 2004 (`window.API_1484_11`).
- [x] Viết React Component `ScormPlayer.tsx` trong `frontend/src/components/player/ScormPlayer.tsx`.
- [x] Tích hợp `ScormPlayer` vào `VideoPlayer.tsx` khi `activeItem.type === 7`.
- [x] Đồng bộ hiển thị icon sách/SCORM trong sidebar khóa học tại `frontend/src/app/learn/[courseId]/page.tsx`.

### Bước 5: Kiểm thử & Nghiệm thu (Testing & Verification)
- [x] Viết unit tests trong `backend/tests/test_scorm.py` cho bộ parser manifest và usecase lưu vết.
- [x] Chạy toàn bộ pytest suite (`pytest`) và kiểm tra chất lượng mã nguồn (`ruff check`, `ruff format --check`, `ty check`).
- [x] Chạy ESLint trên frontend (`npm run lint`).