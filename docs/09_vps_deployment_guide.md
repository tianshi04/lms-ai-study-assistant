# Hướng Dẫn Triển Khai Hệ Thống Trên VPS (All-in-One Docker Stack)

Tài liệu này hướng dẫn chi tiết quy trình triển khai toàn bộ hệ thống LMS trên máy chủ ảo (VPS) theo kiến trúc **Docker Compose toàn phần (All-in-One)** kết hợp **Caddy Reverse Proxy tự động cấp phát SSL/TLS** và **CI/CD tự động cập nhật qua GitHub Actions**.

---

## 1. Yêu Cầu Hạ Tầng VPS

- **Hệ điều hành**: Ubuntu 22.04 LTS / 24.04 LTS hoặc Debian 12.
- **Cấu hình tối thiểu**:
  - CPU: 2 Cores
  - RAM: 2 GB - 4 GB (Đã tối ưu chạy pre-built image từ GHCR nên không tốn RAM build code).
  - Dung lượng ổ cứng: Tối thiểu 20GB SSD/NVMe.
- **Tên miền hoặc Địa chỉ IP**:
  - Có tên miền: Bản ghi DNS `A` trỏ về IP công khai của VPS (ví dụ: `lms.yourdomain.com -> 103.x.x.x`).
  - Chưa có tên miền: Sử dụng trực tiếp địa chỉ IP hoặc tên miền miễn phí `sslip.io` (xem chi tiết ở Mục 4).
  - Mở các port tường lửa (Firewall / UFW): `80/tcp`, `443/tcp`, `443/udp` (cho HTTP/3 QUIC).

---

## 2. Chuẩn Bị Môi Trường Trên VPS (Thực Hiện 1 Lần)

Cài đặt Docker và khởi tạo thư mục dự án:

```bash
# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt các gói phụ thuộc
sudo apt install -y curl ufw

# 3. Cài đặt Docker engine chính thức
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 4. Kích hoạt tường lửa UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable

# 5. Tạo thư mục làm việc cho dự án (KHÔNG CẦN GIT CLONE)
mkdir -p /root/lms
cd /root/lms
```

---

## 3. Kiến Trúc Dịch Vụ Trong Docker Compose

Tất cả các thành phần được đóng gói và kết nối an toàn qua mạng nội bộ Docker (`coursera_network`). Chỉ có **Caddy** mở cổng `80` và `443` ra Internet công cộng:

```text
[ Internet Client ]
       │  (HTTPS :443 / HTTP :80)
       ▼
 ┌──────────────┐
 │    Caddy     │ (Tự động cấp SSL Let's Encrypt / ZeroSSL, nén zstd/gzip, HTTP/3)
 └──────┬───────┘
        │
        ├─► /                                 ──► Next.js Frontend (:3000)
        ├─► /_next/static/* (Immutable Cache) ──► Next.js Frontend (:3000)
        ├─► /rpc/*, /copilotkit/*             ──► Next.js Frontend (:3000)
        ├─► /api/*                            ──► Python Backend API (:8000)
        └─► /coursera-assets/* (Video/Stream) ──► Python Backend API (:8000)
                                                        │
                      ┌─────────────────────────────────┼────────────────────────┐
                      ▼                                 ▼                        ▼
               PostgreSQL 17                         MinIO S3                 Redis 7
              (+ pgvector :5432)                 (Storage :9000)           (Cache :6379)
```

- **Database Migration**: Service `migration` chạy tự động lệnh `alembic upgrade head` mỗi khi khởi động stack trước khi backend nhận request.
- **Bảo mật cơ sở dữ liệu**: PostgreSQL, MinIO, Redis và Jaeger chỉ bind vào `127.0.0.1` trên VPS (ngăn ngừa hoàn toàn nguy cơ brute-force từ Internet).
- **Jaeger Observability**: Mặc định được khởi động cùng hệ thống để thu thập distributed traces, hỗ trợ theo dõi và gỡ lỗi hiệu năng API.
- **Bảo toàn dữ liệu (Data Persistence)**: Toàn bộ dữ liệu PostgreSQL, video MinIO và cache Redis được lưu ở Docker Named Volumes (`postgres_data`, `minio_data`, `redis_data`). Khi cập nhật image mới hoặc khởi động lại container, **dữ liệu không bao giờ bị mất hay bị reset**.

---

## 4. Thiết Lập Triển Khai Ban Đầu Trên VPS (Chỉ cần 3 File)

Trên VPS, bạn **hoàn toàn không cần clone mã nguồn**. Thư mục `/root/lms` chỉ cần đúng 3 file:

```text
/root/lms/
 ├── .env                 # File biến môi trường chứa mật khẩu
 ├── Caddyfile            # File cấu hình reverse proxy
 └── docker-compose.yml   # File compose khởi chạy dịch vụ
```

### Bước 1: Tạo file cấu hình môi trường `.env`

Tạo file `/root/lms/.env`:
```bash
nano /root/lms/.env
```
Dán nội dung cấu hình mẫu:
```env
# --- 1. TÊN MIỀN HOẶC IP ---
# Cách A (Có domain chính thức):
DOMAIN=lms.yourdomain.com

# Cách B (Chưa có domain, muốn có SSL HTTPS miễn phí tự động qua sslip.io):
# Thay các dấu chấm trong IP của bạn bằng dấu gạch ngang (ví dụ IP: 103.12.34.56):
# DOMAIN=103-12-34-56.sslip.io

# Cách C (Chưa có domain, chỉ dùng IP thuần qua HTTP cổng 80):
# DOMAIN=http://103.12.34.56

# --- 2. CƠ SỞ DỮ LIỆU POSTGRESQL ---
POSTGRES_USER=coursera_admin
POSTGRES_PASSWORD=MatKhauDatabaseManh_123456
POSTGRES_DB=coursera_lms

# --- 3. LƯU TRỮ TỆP S3 MINIO ---
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=MatKhauMinioManh_123456

# --- 4. BẢO MẬT & AI COPILOTKIT ---
JWT_SECRET=chuoi_ky_tu_bi_mat_jwt_khoang_32_ky_tu_tro_len_ngau_nhien
GOOGLE_API_KEY=your_gemini_api_key_o_day

# --- 5. ĐƯỜNG DẪN DOCKER IMAGE TRÊN GHCR ---
FRONTEND_IMAGE=ghcr.io/<your-username>/<your-repo>/frontend:latest
BACKEND_IMAGE=ghcr.io/<your-username>/<your-repo>/backend:latest
```

> [!IMPORTANT]
> **Nguyên tắc khởi tạo Database lần đầu**: PostgreSQL Docker sẽ đọc `POSTGRES_USER` và `POSTGRES_PASSWORD` để tạo tài khoản superuser **duy nhất trong lần khởi động đầu tiên** khi ổ cứng database đang trống. Hãy điền mật khẩu mong muốn vào file `.env` trước khi khởi động stack.

### Bước 2: Tải `docker-compose.yml` và `Caddyfile` về VPS

Bạn chỉ cần tải trực tiếp 2 file này từ repository:
```bash
# Tải docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/<your-username>/<your-repo>/main/docker-compose.yml -o /root/lms/docker-compose.yml

# Tải Caddyfile
curl -fsSL https://raw.githubusercontent.com/<your-username>/<your-repo>/main/Caddyfile -o /root/lms/Caddyfile
```

### Bước 3: Khởi động hệ thống
```bash
cd /root/lms
docker compose pull
docker compose up -d
```

### Bước 4: Khởi tạo dữ liệu mẫu (Seed Data)
```bash
docker compose exec backend python -m src.seed
```

---

## 5. Tự Động Hóa Triển Khai (CI/CD với GitHub Actions)

File workflow `.github/workflows/docker-publish.yml` đã được tích hợp sẵn chu trình Continuous Deployment (CD). Mỗi khi bạn `git push origin main` trên máy tính:
1. GitHub Actions tự động build 2 image `frontend` và `backend`.
2. Đẩy 2 image lên GitHub Container Registry (`ghcr.io`).
3. Dùng giao thức SCP copy đè 2 file `docker-compose.yml` và `Caddyfile` mới nhất sang `/root/lms` trên VPS.
4. Tự động SSH vào VPS chạy `docker compose pull && docker compose up -d --remove-orphans`.
5. Tự động dọn dẹp các layer Docker cũ bằng `docker image prune -f` để chống tràn ổ cứng VPS.

> [!NOTE]
> **Khi chưa có VPS**: Pipeline có cơ chế kiểm tra an toàn `if: secrets.VPS_HOST != ''`. Nếu bạn chưa khai báo Secret `VPS_HOST`, GitHub Actions vẫn build và push image lên GHCR bình thường (hiện tích xanh `✓`) và **tự động bỏ qua (Skip)** bước deploy sang VPS mà không gây lỗi.

### Các Bước Cấu Hình SSH Key (Thực Hiện 1 Lần Khi Có VPS):

1. **Trên VPS**: Tạo cặp SSH Key riêng cho GitHub Actions:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""
   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
2. **Lấy nội dung Private Key**:
   ```bash
   cat ~/.ssh/github_actions
   ```
   *(Copy toàn bộ nội dung từ `-----BEGIN OPENSSH PRIVATE KEY-----` đến `-----END OPENSSH PRIVATE KEY-----`).*
3. **Trên trang GitHub Repository**:
   - Vào repository $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions** $\rightarrow$ bấm **New repository secret**:
     - `VPS_HOST`: Địa chỉ IP của VPS (ví dụ: `103.12.34.56`).
     - `VPS_USERNAME`: User đăng nhập (ví dụ: `root`).
     - `VPS_SSH_KEY`: Dán nội dung private key vừa copy ở trên.
     - `VPS_PROJECT_PATH`: `/root/lms`

---

## 6. Các Lệnh Quản Trị Hệ Thống Thường Dùng Trên VPS

| Thao tác | Lệnh |
| :--- | :--- |
| **Xem logs tất cả dịch vụ** | `docker compose logs -f` |
| **Xem logs riêng cho Caddy** | `docker compose logs -f caddy` |
| **Xem logs riêng cho Backend** | `docker compose logs -f backend` |
| **Xem logs riêng cho Frontend** | `docker compose logs -f frontend` |
| **Khởi động lại toàn bộ** | `docker compose restart` |
| **Dừng toàn bộ hệ thống** | `docker compose down` |
| **Kiểm tra trạng thái container** | `docker compose ps` |
| **Chạy Alembic migration thủ công** | `docker compose run --rm migration` |
| **Dọn dẹp image cũ giải phóng dung lượng** | `docker image prune -f` |


---

## 7. Kế Hoạch Nâng Cấp Hạ Tầng (TODO)

- [ ] **Nâng cấp Jaeger v1 lên Jaeger v2**: Thay thế container image `jaegertracing/all-in-one:latest` sang `jaegertracing/jaeger:2` chạy trên nền kiến trúc OpenTelemetry Collector gốc nhằm tối ưu hóa hiệu năng, giảm tiêu thụ RAM và chuẩn bị trước hạn chót End-of-Life của v1.
