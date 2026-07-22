import aioboto3
from botocore.config import Config
from src.shared.config import settings


class S3StorageService:
    """Asynchronous S3 Storage Service for MinIO and AWS S3 object operations."""

    def __init__(self) -> None:
        self.endpoint_url = settings.MINIO_ENDPOINT
        self.access_key = settings.MINIO_ACCESS_KEY
        self.secret_key = settings.MINIO_SECRET_KEY
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self.use_ssl = settings.MINIO_SECURE

        self.session = aioboto3.Session(
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )
        self.botocore_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )

    def _get_client(self):
        """Get an async S3 client context manager."""
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            use_ssl=self.use_ssl,
            config=self.botocore_config,
        )

    async def ensure_bucket_exists(self, bucket_name: str | None = None) -> None:
        """Verify that target S3 bucket exists or create it automatically."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            try:
                await s3_client.head_bucket(Bucket=target_bucket)
            except Exception:
                await s3_client.create_bucket(Bucket=target_bucket)

    async def upload_file(
        self,
        file_bytes: bytes,
        object_key: str,
        content_type: str = "application/octet-stream",
        bucket_name: str | None = None,
    ) -> str:
        """Upload raw file bytes to S3/MinIO and return the object key."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            await s3_client.put_object(
                Bucket=target_bucket,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
        return object_key

    async def download_file(
        self,
        object_key: str,
        bucket_name: str | None = None,
    ) -> bytes:
        """Download file bytes from S3/MinIO by object key."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            response = await s3_client.get_object(
                Bucket=target_bucket,
                Key=object_key,
            )
            async with response["Body"] as stream:
                return await stream.read()

    async def generate_presigned_download_url(
        self,
        object_key: str,
        expiration: int = 3600,
        bucket_name: str | None = None,
    ) -> str:
        """Generate a presigned GET URL for secure temporary file downloading/streaming."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            return await s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": target_bucket, "Key": object_key},
                ExpiresIn=expiration,
            )

    async def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str = "application/octet-stream",
        expiration: int = 3600,
        bucket_name: str | None = None,
    ) -> str:
        """Generate a presigned PUT URL for client-side direct file uploading."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            return await s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": target_bucket,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiration,
            )

    async def delete_file(
        self,
        object_key: str,
        bucket_name: str | None = None,
    ) -> None:
        """Delete an object from S3/MinIO bucket by key."""
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as s3_client:
            await s3_client.delete_object(
                Bucket=target_bucket,
                Key=object_key,
            )


_s3_storage_service: S3StorageService | None = None


def get_s3_storage_service() -> S3StorageService:
    """Get or create singleton instance of S3StorageService."""
    global _s3_storage_service
    if _s3_storage_service is None:
        _s3_storage_service = S3StorageService()
    return _s3_storage_service
