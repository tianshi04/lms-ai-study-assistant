import pytest
from src.shared.infrastructure.s3_storage import get_s3_storage_service

@pytest.mark.asyncio(loop_scope="function")
async def test_s3_storage_operations():
    """Verify S3 storage operations against the coursera_minio Docker container."""
    s3_service = get_s3_storage_service()
    
    # 1. Ensure test bucket exists in MinIO
    test_bucket = "coursera-test-bucket"
    await s3_service.ensure_bucket_exists(bucket_name=test_bucket)
    
    # 2. Upload test content
    object_key = "test_subtitles/sample_subtitle.vtt"
    test_data = b"WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nWelcome to Coursera LMS!"
    
    uploaded_key = await s3_service.upload_file(
        file_bytes=test_data,
        object_key=object_key,
        content_type="text/vtt",
        bucket_name=test_bucket,
    )
    assert uploaded_key == object_key
    
    # 3. Download and verify content
    downloaded_bytes = await s3_service.download_file(
        object_key=object_key,
        bucket_name=test_bucket,
    )
    assert downloaded_bytes == test_data
    
    # 4. Generate presigned download URL
    download_url = await s3_service.generate_presigned_download_url(
        object_key=object_key,
        expiration=600,
        bucket_name=test_bucket,
    )
    assert "http://localhost:9000" in download_url
    assert object_key in download_url
    
    # 5. Generate presigned upload URL
    upload_url = await s3_service.generate_presigned_upload_url(
        object_key="test_videos/lesson1.mp4",
        content_type="video/mp4",
        expiration=600,
        bucket_name=test_bucket,
    )
    assert "http://localhost:9000" in upload_url
    
    # 6. Delete test object
    await s3_service.delete_file(object_key=object_key, bucket_name=test_bucket)
