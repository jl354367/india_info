from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.repositories.report_cache import report_cache
import logging

router = APIRouter()

@router.get("/metadata")
def get_metadata():
    return report_cache.get_metadata()

@router.get("/items")
def get_items(
    sector: Optional[str] = Query(None),
    trend: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if report_cache.is_expired():
        logging.info("Cache expired, refreshing...")
        report_cache.refresh()
    return report_cache.get_items(sector, trend, q, limit, offset)

@router.get("/items/{rank}")
def get_item_by_rank(rank: int):
    if report_cache.is_expired():
        report_cache.refresh()
    item = report_cache.get_item_by_rank(rank)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/refresh")
def refresh():
    try:
        report_cache.refresh()
        return {"status": "success", "rowCount": report_cache.row_count}
    except Exception as e:
        logging.error(f"Refresh failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh report data")
