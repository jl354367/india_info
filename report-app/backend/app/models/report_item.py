from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional


class ReportItem(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    Rank: int = Field(..., description="Unique rank")
    Sector: str
    Topic: str
    WebsiteLink: Optional[str] = Field(None, alias="Website_Link")
    TimelineYears: Optional[str] = Field(None, alias="Timeline_Years")
    BeforeVsAfter: Optional[str] = Field(None, alias="Before_vs_After")
    Trend: Optional[str] = None
    KeyStats: Optional[str] = Field(None, alias="Key_Stats")
    DetailedSummary: Optional[str] = Field(None, alias="Detailed_Summary")

    @field_validator("Sector", "Topic")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be blank")
        return v.strip()
