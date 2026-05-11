import boto3
from io import BytesIO
from app.core.config import settings
import logging


def download_excel_from_s3() -> BytesIO:
    kwargs = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    s3 = boto3.client("s3", **kwargs)
    logging.info(f"Downloading S3 object: {settings.S3_BUCKET}/{settings.S3_KEY}")
    obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=settings.S3_KEY)
    return BytesIO(obj["Body"].read())
