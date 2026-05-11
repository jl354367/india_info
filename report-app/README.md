# India Improvement Index Report App

This monorepo contains both the backend (FastAPI) and frontend (React + Vite) for the India Improvement Index report viewer.

## Prerequisites
- Python 3.9+
- Node.js 18+
- AWS S3 bucket with the Excel file (see backend/.env.example)

## Setup

### 1. Backend

```sh
cd report-app/backend
cp .env.example .env  # Fill in your AWS credentials and S3 details
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```sh
cd report-app/frontend
cp .env.example .env
npm install
npm run dev
```

- The frontend will be available at http://localhost:5173
- The backend API runs at http://localhost:8000

### 3. API Endpoints

- `GET /api/health` — Health check
- `GET /api/report/metadata` — Report metadata
- `GET /api/report/items` — List report items (filters: sector, trend, q, limit, offset)
- `GET /api/report/items/{rank}` — Get item by rank
- `POST /api/report/refresh` — Force refresh from S3

### 4. Sample JSON Output

#### `/api/report/items`
```json
{
  "items": [
    {
      "Rank": 1,
      "Sector": "Health",
      "Topic": "Vaccination",
      "WebsiteLink": "https://example.com/1",
      "TimelineYears": "2010-2020",
      "BeforeVsAfter": "Before: 60%\nAfter: 90%",
      "Trend": "↑",
      "KeyStats": "+30%",
      "DetailedSummary": "Improved vaccination."
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### `/api/report/items/1`
```json
{
  "Rank": 1,
  "Sector": "Health",
  "Topic": "Vaccination",
  "WebsiteLink": "https://example.com/1",
  "TimelineYears": "2010-2020",
  "BeforeVsAfter": "Before: 60%\nAfter: 90%",
  "Trend": "↑",
  "KeyStats": "+30%",
  "DetailedSummary": "Improved vaccination."
}
```

### 5. Testing

Backend:
```sh
pytest
```

### 6. Docker Compose (Optional)

You can add a `docker-compose.yml` for easy orchestration if needed.

---

- No secrets are committed.
- All configuration is via environment variables.
- For any issues, check backend and frontend README files for troubleshooting.
