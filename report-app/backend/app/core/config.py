from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AWS_REGION: str
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET: str
    S3_KEY: str
    CACHE_TTL_SECONDS: int = 600
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()
