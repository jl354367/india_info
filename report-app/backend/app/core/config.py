import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AWS_REGION: str
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    S3_BUCKET: str
    S3_KEY: str
    CACHE_TTL_SECONDS: int = 600

    class Config:
        env_file = ".env"

settings = Settings()
