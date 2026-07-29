# database.py
from sqlalchemy.ext.asyncio import create_async_engine

# Tạo Pool kết nối để không bị sập DB khi nhiều người gọi API
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/lms_db",
    pool_size=20,  # Giữ tối đa 20 kết nối mở sẵn
    max_overflow=10,  # Cho phép phình ra thêm 10 kết nối khi quá tải
    pool_pre_ping=True,  # Tự động kiểm tra kết nối có bị chết không trước khi dùng
)
