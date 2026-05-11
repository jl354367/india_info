# India Improvement Index Backend

## Setup

1. Create a `.env` file in `backend/` based on `.env.example` and fill in your AWS credentials and S3 details.
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Run the server:
   ```sh
   uvicorn app.main:app --reload --port 8000
   ```

## Endpoints

- `GET /api/health` — Health check
- `GET /api/report/metadata` — Report metadata
- `GET /api/report/items` — List report items (filters: sector, trend, q, limit, offset)
- `GET /api/report/items/{rank}` — Get item by rank
- `POST /api/report/refresh` — Force refresh from S3

## Testing

```sh
pytest
```
