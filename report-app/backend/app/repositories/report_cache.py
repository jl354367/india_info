import time
from typing import List, Optional, Dict, Any
from app.services.s3_client import download_excel_from_s3
from app.services.excel_parser import parse_excel
from app.models.report_item import ReportItem
from app.core.config import settings
import logging

class ReportCache:
    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self.items: List[ReportItem] = []
        self.last_refresh_time: Optional[float] = None
        self.last_refresh_str: Optional[str] = None
        self.row_count: int = 0
        self.sheet_name: str = "India Index"
        self._refresh()

    def _refresh(self):
        logging.info("Refreshing report cache from S3...")
        file_bytes = download_excel_from_s3()
        items = parse_excel(file_bytes)
        self.items = items
        self.row_count = len(items)
        self.last_refresh_time = time.time()
        self.last_refresh_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(self.last_refresh_time))
        logging.info(f"Loaded {self.row_count} report items.")

    def get_items(self, sector=None, trend=None, q=None, limit=20, offset=0):
        filtered = self.items
        if sector:
            filtered = [item for item in filtered if item.Sector == sector]
        if trend:
            filtered = [item for item in filtered if item.Trend == trend]
        if q:
            q_lower = q.lower()
            filtered = [item for item in filtered if q_lower in (item.Topic or '').lower() or q_lower in (item.KeyStats or '').lower() or q_lower in (item.DetailedSummary or '').lower()]
        total = len(filtered)
        return {
            "items": [item.dict(by_alias=True) for item in filtered[offset:offset+limit]],
            "total": total,
            "limit": limit,
            "offset": offset
        }

    def get_item_by_rank(self, rank: int) -> Optional[Dict[str, Any]]:
        for item in self.items:
            if item.Rank == rank:
                return item.dict(by_alias=True)
        return None

    def refresh(self):
        self._refresh()

    def get_metadata(self):
        return {
            "sheetName": self.sheet_name,
            "rowCount": self.row_count,
            "lastRefreshTime": self.last_refresh_str,
            "source": {
                "bucket": settings.S3_BUCKET,
                "key": settings.S3_KEY
            }
        }

    def is_expired(self):
        if not self.last_refresh_time:
            return True
        return (time.time() - self.last_refresh_time) > self.ttl_seconds

report_cache = ReportCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
