---
name: code-review-and-quality
description: Comprehensive Zero-Trust Code Review & Adversarial Quality Audit. Use before merging any PR, validating security, verifying full-stack contracts, auditing ReBAC/permissions, or performing deep cross-layer quality inspection.
---

# Zero-Trust Code Review & Adversarial Quality Audit

## 1. Triết lý Cốt lõi: Zero-Trust Adversarial Review (Kiểm toán Đối kháng)

Đa số các đợt review bỏ sót lỗi nghiêm trọng vì kiểm toán viên mắc phải **"Green Test Bias"** (thấy test xanh là tin tưởng) hoặc **"Happy Path Bias"** (chỉ đọc code theo kịch bản người dùng bình thường).

### Nguyên tắc Bất biến:
1. **"Guilty until empirically proven safe"**: Mọi endpoint, mutation, phép tính điểm và luồng điều hướng đều bị coi là có lỗ hổng cho đến khi được chứng minh an toàn qua kịch bản kiểm thử đối kháng (Adversarial Testing).
2. **Test xanh không đồng nghĩa với Code an toàn**: Unit test có sẵn thường chỉ bao phủ các kịch bản thuận (Happy Path) với dữ liệu mẫu lý tưởng. Auditor phải tìm kiếm các kịch bản **Negative Test** chưa được viết.
3. **Không bao giờ kiểm toán cục bộ một dòng/một hàm**: Khi một commit sửa đổi một hàm trong service, Auditor **bắt buộc phải quét toàn bộ các hàm anh em (Sibling Methods)** trong cùng interface/service đó.

---

## 2. Khung Kiểm toán 6 Trụ cột (The 6-Pillar Audit Framework)

Mọi Subagent khi thực hiện review bắt buộc phải soi chiếu mã nguồn qua 6 trụ cột sau:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KHUNG KIỂM TOÁN 6 TRỤ CỘT                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Threat Modeling & ReBAC (Bảo mật 3 Lớp & Ngăn rò rỉ dữ liệu)        │
│ 2. Cross-Layer Contract (Khớp nối Full-Stack URL, Params & Slug)       │
│ 3. Scoring & State Invariants (Chuẩn hóa điểm 100 & Máy trạng thái)    │
│ 4. Anti-Tunnel-Vision (Quét toàn diện Sibling Methods trong Service)   │
│ 5. Zero-Fallback & Framework Standards (Không fallback nợ kỹ thuật)    │
│ 6. Empirical Negative Testing (Chạy kiểm thử đối kháng thực tế)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Trụ cột 1: Threat Modeling & Phân quyền ReBAC 3 Lớp (Security Audit)

Đặt mình vào vai trò Kẻ tấn công (Attacker Persona) với các kịch bản:
- **Learner gian lận:** Cố tình gọi RPC nội bộ để lấy đề thi, đáp án, hoặc tự chấm điểm cho mình.
- **Instructor vượt quyền (Horizontal Privilege Escalation):** Giảng viên A dùng ID để sửa/xóa tài nguyên trong khóa học của Giảng viên B.
- **Client gửi dữ liệu rỗng (Bypass Guard):** Client cố tình gửi `""`, `0`, `null` hoặc chuỗi khoảng trắng.

#### Bảng Kiểm tra (Checklist):
- [ ] **Layer 1 (Identity from JWT)**: Tất cả presentation handlers được bảo vệ (`AUTH_POLICY_AUTHENTICATED`) có bắt buộc dùng `require_current_user()` từ context không? Tuyệt đối **không** trích xuất `user_id` từ payload request để xác thực.
- [ ] **Layer 2 (SQL Pushdown Scope)**: Repositories có đẩy điều kiện lọc xuống SQL thông qua `apply_organization_scope` hoặc `where(owner_id == ...)` không? Tuyệt đối cấm load toàn bộ lên RAM rồi lọc bằng Python/TypeScript.
- [ ] **Layer 3 (ReBAC Mutation Guard)**: Mọi thao tác ghi/đổi trạng thái (Create, Update, Delete) có gọi `enforce_course_ownership` hoặc `enforce_organization_permission` không?
- [ ] **Chống Bypass Falsy Guard (CRITICAL)**:
  - ❌ **CẤM VIẾT:** `if request.course_id: await enforce_course_ownership(...)` (Nếu client gửi chuỗi rỗng `""`, lệnh bọc bị bypass hoàn toàn!).
  - ✅ **BẮT BUỘC:** Validate `if not request.course_id or not request.course_id.strip(): raise ConnectError(Code.INVALID_ARGUMENT, "course_id là bắt buộc")` trước khi gọi ReBAC.
- [ ] **Information Leakage Audit (Dữ liệu Nhạy cảm)**:
  - Soi từng trường trong DTO / Protobuf Response trả về cho Học viên.
  - Có trả về `is_correct`, `explanation`, đáp án trắc nghiệm trước khi nộp bài không?
  - Có trả về thông tin định danh bí mật của người chấm chéo (`reviewer_user_id`) làm lộ danh tính không?

---

### Trụ cột 2: Khớp nối Hợp đồng Full-Stack (Cross-Layer Contract Alignment)

Khi một tính năng có cả Backend RPC và Frontend UI, bắt buộc phải đối soát 1-1 giữa 2 tầng, không được review tách rời.

#### Bảng Kiểm tra (Checklist):
- [ ] **URL & Route Existence**: Khi backend sinh URL (trong Action Tasks, Notifications, Emails):
  - Đường dẫn đích có thực sự tồn tại trong `frontend/src/app/...` không? (VD: Backend sinh `/grading-cockpit` nhưng Next.js route là `/grading` ➔ Gây lỗi 404).
- [ ] **Query Parameter Synchronization**:
  - Tên tham số URL giữa bên sinh và bên nhận có khớp chính xác không? (VD: Bên sinh tạo `?submission=123` nhưng bên nhận đọc `searchParams.get("submissionId")` ➔ Đứt luồng).
- [ ] **Deep-link Consumer Verification**:
  - Component nhận trang đích có thực sự gọi `useSearchParams()` để tự động mở modal/drawer tương ứng không?
- [ ] **Slug vs UUID Resolution**:
  - Khi trang nhận tham số URL có thể là slug (`idOrSlug`), các lệnh gọi API con bên dưới có truyền slug thô vào các endpoint chỉ nhận UUID không? Bắt buộc phải resolve sang `course.id` (UUID) trước khi truyền tiếp.
- [ ] **Contextual Role Parity**:
  - Điều kiện kiểm tra quyền trên UI (`isCourseStaff`) có phản ánh đúng và đủ logic của domain entity ở Backend không? (VD: Backend `Course.can_edit` cho phép `ta_ids`, nhưng Frontend chỉ check `ownerId` và `coInstructorIds` ➔ Gây lỗi 403 oan cho Trợ giảng).

---

### Trụ cột 3: Chuẩn hóa Điểm số & Tính toán Nghiệp vụ (Scoring & Math Invariants)

#### Bảng Kiểm tra (Checklist):
- [ ] **Chuẩn hóa Điểm Thang 100 (Normalization Formula)**:
  - Điểm số lưu trong hệ thống bắt buộc phải quy về thang chuẩn 100.0 theo công thức:
    $$\text{Final Score} = \text{round}\left(\frac{\text{Total Given}}{\text{Max Possible}} \times 100.0, 2\right)$$
  - Tuyệt đối cấm cộng điểm thô `total_score = sum(c.score_given)` mà không chia cho `max_possible` khi rubric có tổng điểm khác 100.
- [ ] **Không tin tưởng Max Score từ Client**:
  - Điểm tối đa (`max_score`) và tiêu chí chấm bắt buộc phải lấy từ nguồn gốc trong Database (`LearningItem.rubric_criteria_json`). Không được tính `max_possible` dựa trên payload do client gửi lên.
- [ ] **Tính Nhất quán giữa Tổng điểm và Tiêu chí**:
  - Trong thao tác chấm của Giảng viên/TA, nếu client gửi cả `total_score` và `graded_criteria`, use case phải kiểm tra tính nhất quán toán học giữa hai giá trị này.
- [ ] **Quyền sở hữu Đơn Khiếu nại / Báo cáo**:
  - Trong `report_peer_review` hoặc khiếu nại điểm, bắt buộc kiểm tra người gọi có phải là chủ bài nộp (`sub.user_id == current_user.id`) và lý do không được để trống (`report_reason.strip()`).

---

### Trụ cột 4: Quét Toàn diện Sibling Methods (Anti-Tunnel-Vision)

Khi thấy một PR sửa đổi hoặc bọc bảo mật cho một phương thức, Auditor **phải lập tức thực hiện Sibling Sweep**:

```
Ví dụ: Commit thông báo "Fix ReBAC on Question Bank"
Auditor KHÔNG CHỈ xem hàm create_question_bank!
Auditor PHẢI rà soát TOÀN BỘ 6 hàm của nhóm tính năng:
├── 1. create_question_bank    -> Có ReBAC chưa? Check rỗng chưa?
├── 2. list_question_banks      -> Ai được gọi? Có lộ đáp án không?
├── 3. add_question_to_bank     -> Giảng viên A có sửa được của B không?
├── 4. update_question          -> Có check course_id sở hữu không?
├── 5. delete_question          -> Có check course_id sở hữu không?
└── 6. configure_quiz_matrix    -> Có check item_id thuộc khóa của mình không?
```

---

### Trụ cột 5: Tuân thủ Zero-Fallback & Tiêu chuẩn Framework (Code Hygiene)

#### Bảng Kiểm tra (Checklist):
- [ ] **Zero-Fallback Rule (AGENTS.md)**:
  - Cấm hoàn toàn việc viết code fallback ngầm tải dữ liệu công khai khi người dùng không có quyền hoặc danh sách rỗng (VD: không có khóa học đã đăng ký thì tự động fetch public catalog nạp vào dropdown ➔ Vi phạm BR_FORUM_005, che giấu Empty State và sinh lỗi `PERMISSION_DENIED` khi người dùng bấm tương tác).
- [ ] **React 19 & Next.js Compatibility**:
  - Cấm sử dụng `action="javascript:void(0)"` trên thẻ `<form>` (React 19 chặn/cảnh báo).
  - Kiểm tra form submit: Tránh gắn đồng thời `onSubmit` ở `<form>` và `onClick` ở `<Button type="submit">` khi chưa có guard `if (submitting) return;` (gây double submission).
- [ ] **Strict Semantic Design Tokens (Tailwind v4)**:
  - 100% sử dụng semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`...).
  - Không sử dụng hardcoded hex color hoặc raw palette (`bg-blue-600`, `text-slate-900`).
- [ ] **100% Tiếng Việt (UI Localization)**:
  - Toàn bộ nhãn, thông báo toast, modal, placeholder phải là tiếng Việt chuẩn.

---

### Trụ cột 6: Kiểm thử Thực nghiệm Đối kháng (Empirical Negative Testing)

Auditor không chỉ đọc code mà phải thực thi các lệnh kiểm chứng:

#### 1. Kiểm chứng Cú pháp & Static Analysis:
```powershell
# Backend
uv run ruff check .
uv run ty check
uv run pytest tests/test_code_quality.py

# Frontend
pnpm run check    # bao gồm tsc --noEmit, oxlint, oxfmt
```

#### 2. Viết hoặc Kiểm tra Negative Unit Tests:
Kiểm tra xem bộ test trong `backend/tests/unit/` có các kịch bản sau chưa:
- [ ] Test gọi API với vai trò `LEARNER` ➔ Bắt buộc nhận `Code.PERMISSION_DENIED`.
- [ ] Test gọi API với param rỗng `""` ➔ Bắt buộc nhận `Code.INVALID_ARGUMENT`.
- [ ] Test gọi API với tài nguyên thuộc sở hữu của User khác ➔ Bắt buộc nhận `Code.PERMISSION_DENIED`.
- [ ] Test tính điểm với rubric 3 tiêu chí tổng 30đ ➔ Đạt 24/30 phải ra đúng `80.0%`.

---

## 3. Quy trình Thực thi Kiểm toán Từng bước (Step-by-Step Workflow)

Khi được kích hoạt để kiểm toán một PR hoặc nhánh tính năng, Subagent thực hiện theo 5 bước:

### Bước 1: Khảo sát Phạm vi Thực tế (Scope Discovery)
```powershell
git diff --stat origin/main...HEAD
git log -n 10 --oneline
```
Liệt kê danh sách tất cả các file bị thay đổi. Phân nhóm theo: Backend Handlers, Use Cases, Repositories, Frontend Pages, Components, Hooks.

### Bước 2: Quét Sibling & Lập Bản đồ Đối ứng (Cross-Mapping)
Với mỗi endpoint backend được thêm/sửa:
- Tìm component frontend tương ứng gọi endpoint đó.
- Tìm route Next.js tiếp nhận các action link/deep-link.
- Liệt kê toàn bộ các phương thức anh em trong cùng module/interface.

### Bước 3: Thẩm vấn theo 6 Trụ cột (Adversarial Interrogation)
Lần lượt đặt câu hỏi tấn công cho từng file:
1. Endpoint này trả về gì cho Learner?
2. Có thể bypass ReBAC bằng chuỗi rỗng không?
3. URL này Frontend có route tương ứng không?
4. Trợ giảng có bị chặn oan không?
5. Điểm số có bị tính sai thang 100 không?
6. Có dính lỗi React 19 hoặc phá vỡ Zero-Fallback không?

### Bước 4: Chạy Kiểm thử & Khảo sát Negative Test
Chạy toàn bộ test suites và kiểm tra độ phủ của các kịch bản lỗi.

### Bước 5: Xuất Báo cáo Kiểm toán theo Chuẩn

---

## 4. Mẫu Báo cáo Kiểm toán Chuẩn (Output Format)

Mọi báo cáo kết luận của Subagent bắt buộc trình bày theo định dạng sau:

```markdown
# BÁO CÁO KIỂM TOÁN ZERO-TRUST & CHẤT LƯỢNG MÃ NGUỒN

## I. TỔNG QUAN PHẠM VI & CỔNG KIỂM THỬ THỰC NGHIỆM
- **Phạm vi kiểm toán:** [Danh sách module / commits / PR]
- **Linter & Type Checker:** [PASSED / FAILED với số lỗi cụ thể]
- **Unit Test Suite:** [X/Y passed - Đánh giá độ phủ Negative Test]

## II. DANH SÁCH LỖ HỔNG & LỖI LOGIC ĐƯỢC PHÁT HIỆN

### 🔴 [CRITICAL - BLOCKER] 1. <Tên lỗi ngắn gọn>
- **Vị trí file & dòng:** [`path/to/file.py`](file:///path/to/file.py#L100-L120)
- **Kịch bản Tấn công / Lỗi (Attack/Failure Scenario):** Mô tả chi tiết ai làm gì và gây ra hậu quả gì.
- **Nguyên nhân gốc rễ (Root Cause):** Phân tích code đang thiếu gì.
- **Đề xuất khắc phục (Remediation):** Cung cấp mã nguồn Before / After chuẩn xác.

### 🟡 [HIGH - BLOCKER] 2. <Tên lỗi ngắn gọn>
...

### 🔵 [MEDIUM / CONSIDER] 3. <Tên lỗi ngắn gọn>
...

## III. KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG
- [ ] Chặn Merge (Block Merge) / Yêu cầu sửa trước khi chuyển bước.
- [ ] Danh sách các test case cần bổ sung để bảo vệ hồi quy (Regression Guard).
```
