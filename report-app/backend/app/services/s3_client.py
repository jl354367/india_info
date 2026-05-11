import boto3
from io import BytesIO
from app.core.config import settings
import logging

def download_excel_from_s3() -> BytesIO:
    s3 = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    logging.info(f"Downloading S3 object: {settings.S3_BUCKET}/{settings.S3_KEY}")
    obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=settings.S3_KEY)
    return BytesIO(obj["Body"].read())
