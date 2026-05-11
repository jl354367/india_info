import pytest
from app.services.excel_parser import parse_excel
from io import BytesIO
import pandas as pd


def make_test_excel():
    data = {
        "Rank": [1, 2],
        "Sector": ["Health", "Education"],
        "Topic": ["Vaccination", "Literacy"],
        "Website_Link": ["https://example.com/1", "https://example.com/2"],
        "Timeline_Years": ["2010-2020", "2015-2021"],
        "Before_vs_After": ["Before: 60%\nAfter: 90%", "Before: 70%\nAfter: 95%"],
        "Trend": ["↑", "↓"],
        "Key_Stats": ["+30%", "+25%"],
        "Detailed_Summary": ["Improved vaccination.", "Improved literacy."],
    }
    df = pd.DataFrame(data)
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="India Index", index=False)
    buf.seek(0)
    return buf


def test_parse_excel():
    buf = make_test_excel()
    items = parse_excel(buf)
    assert len(items) == 2
    assert items[0].Rank == 1
    assert items[0].Sector == "Health"
    assert items[0].BeforeVsAfter.startswith("Before: 60%")
    assert items[0].Trend == "↑"
    assert items[1].Trend == "↓"
