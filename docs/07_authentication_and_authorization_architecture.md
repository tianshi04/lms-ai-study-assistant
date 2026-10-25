# 07. Kiến Trúc Xác Thực (AuthN) & Phân Quyền Hỗ Trợ Đa Tổ Chức (AuthZ & Direct ReBAC Matrix)

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật Xác thực (Authentication) Stateless và Phân quyền theo mô hình **Tối Giản & Trực Tiếp (Static Role-Permission Matrix & Entity Method Check)**.

---

## 1. Tổng quan Kiến trúc Phân quyền 3 Lớp (3-Layer Security Model)

Hệ thống loại bỏ hoàn toàn các bảng cơ sở dữ liệu động lưu vai trò (`organization_roles`), đưa phân quyền về đúng **3 Lớp Thẩm định Bất khả Xâm phạm**:

1. **Layer 1 (API Method Policy & Auth Context Injection)**:
   * Mỗi ConnectRPC method trong `.proto` khai báo option `(auth.v1.policy)` (`AUTH_POLICY_PUBLIC`, `AUTH_POLICY_AUTHENTICATED`).
   * `AuthInterceptor` & `AuthPolicyRegistry` giải mã JWT token và nạp `CurrentUserContext` vào `contextvars`.
2. **Layer 2 (Database Query / SQL Scope Pushdown)**:
   * Đẩy điều kiện lọc tổ chức xuống tầng SQL query via `apply_organization_scope()` trong `backend/src/shared/infrastructure/scopes.py`.
3. **Layer 3 (Domain Ownership & Centralized ReBAC Matrix)**:
   * Mã hóa cứng bảng vai trò và quyền trong code (`backend/src/shared/permissions.py`).
   * Thẩm định quyền qua các Guard functions `enforce_organization_permission` và `enforce_course_ownership`.

---

## 2. Ma Trận Vai Trò & Quyền Tĩnh (Static ReBAC Matrices in `src/shared/permissions.py`)

### A. Phân quyền Tổ chức (Organization Level - `OrgRole` & `OrgPermission`)
- **Vai trò tĩnh (`OrgRole`)**: `OWNER`, `INSTRUCTOR`, `MEMBER`.
- **Hành động (`OrgPermission`)**: `MANAGE_MEMBERS` (`org:manage_members`), `CREATE_COURSE` (`org:create_course`), `MANAGE_COURSES` (`org:manage_courses`), `VIEW_ANALYTICS` (`org:view_analytics`).
- **Bảng Ma trận Role-Permission (`ROLE_PERMISSIONS`)**:
  - `OWNER`: Toàn quyền (`MANAGE_MEMBERS`, `CREATE_COURSE`, `MANAGE_COURSES`, `VIEW_ANALYTICS`).
  - `INSTRUCTOR`: Có quyền `CREATE_COURSE`, `VIEW_ANALYTICS`.
  - `TA`: Có quyền `CREATE_COURSE`.
  - `MEMBER`: Không có quyền quản trị/tạo khóa học.

### B. Phân quyền Khóa học (Course Level - `CourseRole` & `CoursePermission`)
- **Vai trò tĩnh (`CourseRole`)**: `OWNER`, `CO_INSTRUCTOR`, `TA`.
- **Hành động (`CoursePermission`)**: `EDIT_DETAILS`, `MANAGE_CURRICULUM`, `SUBMIT_LAUNCH`, `DELETE_COURSE`, `MANAGE_COLLABORATORS`, `GRADE_ASSESSMENTS`.
- **Bảng Ma trận Role-Permission (`COURSE_ROLE_PERMISSIONS`)**:
  - `OWNER`: Toàn quyền trên khóa học.
  - `CO_INSTRUCTOR`: Quyền `EDIT_DETAILS`, `MANAGE_CURRICULUM`, `SUBMIT_LAUNCH`, `MANAGE_COLLABORATORS`, `GRADE_ASSESSMENTS`.
  - `TA`: Quyền `MANAGE_CURRICULUM`, `GRADE_ASSESSMENTS`.

---

## 3. Thẩm định Quyền Hạn trên Domain Entity & Guard Functions

### A. Guard Thẩm định Quyền Khóa học (`enforce_course_ownership`)
Mọi logic thẩm định quyền sở hữu, vai trò (`OWNER`, `CO_INSTRUCTOR`, `TA`), và trạng thái khóa học được thẩm định tập trung trong `enforce_course_ownership` (`backend/src/shared/permissions.py`), kết hợp hàm kiểm tra trạng thái trên Domain Entity (`course.can_edit`):

```python
class Course(Entity):
    def can_edit(
        self,
        user: Any,
        allow_read_only_pending: bool = False,
    ) -> bool:
        if not user or not getattr(user, "id", None):
            return False
        role = getattr(user, "role", "").upper()
        if "ADMIN" in role or role in ("USER_ROLE_ADMIN", "3"):
            return True
        if not allow_read_only_pending and self.status == CourseStatus.PENDING_REVIEW:
            return False
        return bool(
            (self.owner_id and user.id == self.owner_id)
            or (self.co_instructor_ids and user.id in self.co_instructor_ids)
            or (self.ta_ids and user.id in self.ta_ids)
        )
```

---

## 4. Cấu trúc Đối tượng Security Context (`CurrentUserContext`)

Thông tin định danh của User khi đăng nhập thành công được lưu trong `CurrentUserContext` (`backend/src/shared/auth.py`) thông qua `contextvars` per-request:

```python
@dataclass
class CurrentUserContext:
    id: str                 # User ID (sub)
    email: str = ""         # User Email
    full_name: str = ""     # User Full Name
    role: str = ""          # System Role (e.g. USER_ROLE_ADMIN, USER_ROLE_INSTRUCTOR, USER_ROLE_LEARNER)
```

---

## 6. Kiến Trúc Xác Thực Đăng Ký & Đăng Nhập Lai (Google OAuth2 + Password Fallback)

Hệ thống triển khai cơ chế xác thực kép linh hoạt và an toàn cao, kết hợp giữa **Đăng ký Email/Mật khẩu truyền thống (RPC `Register`)**, **Google OAuth2** và **Mật khẩu dự phòng độc lập**:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend (Next.js)
    participant BE as Backend (FastAPI)
    participant GG as Google OAuth (accounts.google.com)

    Note over User, GG: LUỒNG GOOGLE (login / register / reset dùng chung 1 callback, phân biệt bằng "intent")
    User->>FE: Bấm nút Google (intent = login | register | reset)
    FE->>FE: Sinh state + nonce, lưu vào sessionStorage (TTL 10 phút, dùng 1 lần)
    FE->>GG: Redirect tới /o/oauth2/v2/auth (state, nonce, redirect_uri)
    GG-->>User: Xác thực tài khoản Gmail & đồng ý cấp quyền
    GG-->>FE: Redirect về /auth/google/callback?code&state
    FE->>FE: Xoá code khỏi URL, kiểm tra state (fail-closed), đọc intent
    FE->>BE: GoogleLogin | GoogleRegisterVerify | GoogleResetPasswordVerify(code, nonce, redirect_uri)
    BE->>BE: Kiểm tra redirect_uri thuộc allow-list, đổi code lấy ID token
    BE->>BE: Xác minh chữ ký/aud/exp, nonce khớp, email_verified = true
    BE-->>FE: Đăng nhập: JWT cookie | Đăng ký / Đặt lại MK: temp_token (TTL 15 phút)
    FE-->>User: Bước 2: tạo mật khẩu dự phòng / đặt mật khẩu mới
    FE->>BE: CompleteGoogleRegistration(temp_token, password, full_name) | CompleteResetPassword(temp_token, new_password)
    BE->>BE: validate_password, hash PBKDF2 & lưu User
    BE-->>FE: JWT Access/Refresh Token (có avatar_url)
```

### A. Lý Do Kỹ Thuật & Nghiệp Vụ Của Luồng Đăng Ký
1. **Linh hoạt 2 Chế độ Đăng ký (Dual Registration Flexibility)**:
   - Hỗ trợ đăng ký nhanh 1-click qua Google OAuth2 hoặc Đăng ký bằng Email & Mật khẩu chuẩn (RPC `Register`) cho người dùng tùy chọn.
2. **Xác minh Email chính chủ & Chống Bot/Spam (Anti-Spam Email Guarantee)**:
   - Đăng ký qua Google OAuth2 giúp xác minh 100% email là thật và thuộc về người dùng chính chủ mà không tốn chi phí gửi OTP. Backend từ chối mọi ID token có `email_verified != true`.
3. **Cơ chế Dự phòng Sự cố (Disaster Recovery & High Availability)**:
   - Việc tạo Mật khẩu phụ ngay lúc đăng ký Google đảm bảo tài khoản đăng ký thủ công luôn có `password_hash`.
   - Trong trường hợp dịch vụ Google bị sự cố (Google Outage) hoặc người dùng không lưu session Google, người dùng **vẫn đăng nhập bình thường bằng Email & Mật khẩu** mà không bị gián đoạn học tập.
   - Tài khoản được JIT-provision lần đầu qua `GoogleLogin` có `password_hash` rỗng (chưa thể đăng nhập bằng mật khẩu) cho tới khi người dùng đặt mật khẩu qua luồng "Quên mật khẩu".
4. **Đồng bộ Ảnh Đại diện Chính chủ (Google Avatar Synchronization)**:
   - Tự động trích xuất ảnh đại diện chính chủ từ Google (`picture` claim), lưu trữ vào PostgreSQL và nạp vào JWT Token payload (`avatar_url`).
   - Tự động đồng bộ hiển thị mượt mà trên Header Navbar (`UserDropdown`), Dropdown Menu, và Trang quản lý hồ sơ cá nhân.

### A.1. Các Ràng Buộc Bảo Mật Của Luồng Google (Security Invariants)
| Ràng buộc | Lý do |
| :--- | :--- |
| **Không có đường mock/bypass ở bất kỳ môi trường nào** (không token `mock_google_*`, không nonce `"mock"`, không `window.prompt`). Chưa cấu hình `GOOGLE_CLIENT_ID/SECRET` thì Google login bị từ chối (fail-closed). | Biến `ENV` mặc định là `development`, nên cổng mock "chỉ dev" thực tế mở trên mọi deploy thiếu cấu hình. Test dùng fake provider/monkeypatch, không dùng backdoor trong code chạy thật. |
| **`state` + `nonce`** sinh bằng Web Crypto, lưu trong `sessionStorage`, dùng 1 lần, hết hạn sau 10 phút; callback fail-closed. Backend so khớp nonce bằng `hmac.compare_digest` khi client gửi nonce. | Chống CSRF đăng nhập và replay ID token. Không dùng cookie JS (tránh cookie tossing) và không có fallback `Math.random`. |
| **`redirect_uri` phải là `<origin được allow-list>/auth/google/callback`** (không query/fragment); Backend tự validate trước khi gửi kèm client secret. | Ngăn client chọn `redirect_uri` tuỳ ý khi Backend giữ `GOOGLE_CLIENT_SECRET`. Origin phải khớp `CORS_ORIGINS`/`FRONTEND_URL`/Vercel; URI cũng phải được đăng ký trong Google Cloud Console. |
| **Dung sai lệch đồng hồ (`GOOGLE_CLOCK_SKEW_SECONDS = 10`)** khi gọi `id_token.verify_oauth2_token` | Tuân thủ chuẩn RFC 7519 (Mục 4.1.4 & 4.1.5), triệt tiêu lỗi `Token used too early` khi đồng hồ giữa máy chủ VPS và Google lệch nhau vài giây. |
| **Redirect sau đăng nhập đi qua `sanitizeRedirectPath`** (cùng origin, chặn `//`, `\`, ký tự điều khiển). | Chặn open redirect kiểu `/\evil.com`. |
| **`decodeJwtPayload` ở `proxy.ts` chỉ là gợi ý UI** (không verify chữ ký, bỏ qua token hết hạn). Backend là nơi duy nhất thực thi phân quyền. | Khoá HS256 chỉ có ở Backend; muốn verify ở Edge cần chuyển sang RS256/JWKS (hướng phát triển). |

### B. Danh Mục Công Nghệ & Thư Viện Sử Dụng (Technology Stack)
- **Frontend Stack**:
  - `Next.js 16` (React 19, Turbopack, Server Actions trong `src/app/auth/actions.ts`).
  - `Google Identity Services (GSI)` (One Tap, ID token) & OAuth2 Authorization Code Flow qua redirect (state + nonce) (`https://accounts.google.com/o/oauth2/v2/auth`, helper `src/lib/google_oauth.ts`).
  - `@connectrpc/connect-web` giao tiếp RPC bất đồng bộ với Backend.
  - `AuthProvider` React Context quản lý Client Auth State & đồng bộ Avatar.
- **Backend Stack**:
  - `FastAPI` 0.115+ (Async I/O cho mọi tác vụ).
  - `ConnectRPC / gRPC` Service (`IdentityService`).
  - `Mã hóa Mật khẩu & Validation`: PBKDF2 HMAC SHA-256 (`hash_password` / `verify_password`). Thẩm định trung tâm `validate_password` (tối thiểu 6 ký tự, 1 hoa, 1 số).
  - `Mã hóa Session`: PyJWT mã hóa JWT Access Token (TTL 60m) & Refresh Token (TTL 7d) có chứa custom claim `avatar_url`.
  - `Login Rate Limiter`: Khóa đăng nhập tạm thời 15 phút khi sai quá 5 lần qua Redis sliding window counter (`check_login_rate_limit`).
- **Cơ sở dữ liệu (Database Stack)**:
  - `PostgreSQL` + `SQLAlchemy 2.0 Async`.
  - `Alembic Migration`: `f89a1029c001_add_google_id_to_users.py` quản lý cột `google_id` (Unique, Indexed).

---

## 7. Quy Tắc Thẩm Định Nghiệp Vụ Theo Đối Tượng

| Đối Tượng Nghiệp Vụ | Cơ Chế Thẩm Định | Chi Tiết Quy Tắc |
| :--- | :--- | :--- |
| **Chỉnh sửa / Quản lý Khóa học** | `enforce_course_ownership(course, user)` | Admin hệ thống HOẶC (`OWNER`, `CO_INSTRUCTOR`, `TA`). Khóa học ở trạng thái `PENDING_REVIEW` sẽ ở chế độ Chỉ đọc đối với Giảng viên. |
| **Quản lý Thành viên Tổ chức** | `enforce_organization_permission(session, user, org_id, OrgPermission.MANAGE_MEMBERS)` | Đòi hỏi vai trò `OWNER` của Tổ chức (hoặc Super Admin). |
| **Tạo Khóa học cho Tổ chức** | `enforce_organization_permission(session, user, org_id, OrgPermission.CREATE_COURSE)` | Đòi hỏi vai trò `OWNER`, `INSTRUCTOR`, hoặc `TA` của Tổ chức. |
| **Phê duyệt / Từ chối Khóa học** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Quản lý Enterprise Seats** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Duyệt Đơn Giảng viên** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Duyệt Hỗ trợ Tài chính / Thu hồi Chứng chỉ** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Kiểm duyệt Diễn đàn** | `_can_moderate(user)` | Quản trị viên hệ thống HOẶC Giảng viên / Trợ giảng phụ trách khóa học. |
| **Gửi Lời mời Thành viên Tổ chức** | `_verify_org_admin_permission(session, user, org_id)` | Owner của Tổ chức (Nghiêm cấm mời vai trò `ORG_OWNER`). |
| **Gửi Lời mời Giảng viên Khóa học** | `SQLAlchemyCatalogRepository.get_course_detail(target_id)` | Owner/Co-Instructor của Khóa học hoặc Admin (Nghiêm cấm mời vai trò `COURSE_OWNER`). |
| **Gửi Lời mời Suất học Enterprise** | `_is_admin(user)` | Chỉ Quản trị viên hệ thống (`USER_ROLE_ADMIN`). |
| **Phản hồi Lời mời (Respond)** | Match `invitee_email == current_user.email` | Người dùng được mời có email khớp chính xác với tài khoản đang đăng nhập. |

---

## 8. Kiến Trúc Bảo Mật & Mã Hóa Token Lời Mời (Invitation Cryptographic Architecture)

### A. Quy trình Băm Mã Token SHA-256 (SHA-256 Token Digest Flow)
1. **Khởi tạo Token Tạm (In-Memory Token Generation)**: Khi tạo lời mời, backend khởi tạo ngẫu nhiên chuỗi token `inv_tok_<uuid4_hex>` (32 bytes entropy). Chuỗi raw token này chỉ được gửi 1 lần duy nhất trong phản hồi JSON về cho Client/Email.
2. **Lưu trữ Chuỗi Băm Hex SHA-256 (Database Saltless Hashing)**:
   ```python
   def hash_invitation_token(raw_token: str) -> str:
       return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
   ```
   Cơ sở dữ liệu lưu chuỗi băm 64 ký tự `token_hash`. Khi người dùng truy cập link `https://<domain>/invitations/<token>`, backend thực hiện băm token nhận được và tìm kiếm theo chỉ mục SQL indexed: `SELECT * FROM invitations WHERE token_hash = :hash`.
3. **Bảo vệ Đơn kỳ & Tự động Hết hạn (Single-Use & Automatic Expiration)**:
   - Mọi thao tác kiểm tra token (`GetInvitationByToken`, `RespondToInvitation`) tự động so sánh mốc thời gian UTC `datetime.now(timezone.utc) > exp_dt`. Nếu quá 7 ngày kể từ ngày khởi tạo, trạng thái chuyển thành `EXPIRED`.
   - Lời mời chỉ chấp nhận phản hồi khi ở trạng thái `PENDING`. Sau khi `ACCEPT` hoặc `DECLINE`, trạng thái được cập nhật nguyên tử, ngăn chặn việc sử dụng lại token.



