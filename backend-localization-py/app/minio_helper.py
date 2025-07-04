import minio
import os

# MinIO connection parameters
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "password")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() in ("true", "1")
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "bismillahta")

# Initialize MinIO client
client = minio.Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

# Fetch object from bucket

def get_object(bucket: str, object_name: str) -> bytes:
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()