import aioboto3
from botocore.config import Config

from src.shared.config import settings


class S3StorageService:
    """Asynchronous S3 Storage Service for MinIO and AWS S3 object operations."""

    def __init__(self) -> None:
        self.endpoint_url = settings.MINIO_ENDPOINT
        self.public_endpoint_url = getattr(
            settings, "MINIO_PUBLIC_ENDPOINT", self.endpoint_url
        )
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

    def to_public_url(self, url: str) -> str:
        """Replace internal minio endpoint with public endpoint for browser access."""
        internal_base = self.endpoint_url.rstrip("/")
        public_base = self.public_endpoint_url.rstrip("/")
        if internal_base != public_base and url.startswith(internal_base):
            return url.replace(internal_base, public_base, 1)
        return url

    def get_client(self):
        """Get an async S3 client for internal operations (upload, download, bucket mgmt)."""
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            use_ssl=self.use_ssl,
            config=self.botocore_config,
        )

    def get_public_client(self):
        """Get an async S3 client using public endpoint for presigned URL generation.

        Presigned URLs include the host in the AWS4-HMAC-SHA256 signature.
        If we generate the URL with 'minio:9000' but the browser sends it to
        'localhost:9090', the signature will not match and MinIO rejects the request.
        This client uses the public endpoint so the signature matches the browser's Host header.
        """
        return self.session.client(
            "s3",
            endpoint_url=self.public_endpoint_url,
            use_ssl=self.use_ssl,
            config=self.botocore_config,
        )

    async def ensure_bucket_exists(self, bucket_name: str | None = None) -> None:
        """Verify that target S3 bucket exists or create it automatically."""
        target_bucket = bucket_name or self.bucket_name
        async with self.get_client() as s3_client:
            try:
                await s3_client.head_bucket(Bucket=target_bucket)
            except Exception:  # noqa: BLE001
                try:
                    await s3_client.create_bucket(Bucket=target_bucket)
                    # Set public read policy for media assets
                    import json

                    policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "PublicRead",
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": ["s3:GetObject"],
                                "Resource": [f"arn:aws:s3:::{target_bucket}/*"],
                            }
                        ],
                    }
                    await s3_client.put_bucket_policy(
                        Bucket=target_bucket, Policy=json.dumps(policy)
                    )
                except Exception:  # noqa: BLE001, S110
                    pass

            # Always configure CORS policy to allow direct frontend uploads
            try:
                cors_configuration = {
                    "CORSRules": [
                        {
                            "AllowedHeaders": ["*"],
                            "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
                            "AllowedOrigins": ["*"],
                            "ExposeHeaders": ["ETag"],
                        }
                    ]
                }
                await s3_client.put_bucket_cors(
                    Bucket=target_bucket, CORSConfiguration=cors_configuration
                )
            except Exception:  # noqa: BLE001, S110
                pass

    async def upload_file(
        self,
        file_bytes: bytes,
        object_key: str,
        content_type: str = "application/octet-stream",
        bucket_name: str | None = None,
    ) -> str:
        """Upload raw file bytes to S3/MinIO and return the object key."""
        target_bucket = bucket_name or self.bucket_name
        async with self.get_client() as s3_client:
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
        async with self.get_client() as s3_client:
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
        async with self.get_public_client() as s3_client:
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
        async with self.get_public_client() as s3_client:
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
        async with self.get_client() as s3_client:
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
