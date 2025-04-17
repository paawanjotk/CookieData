# ClickHouse-FlatFile Data Ingestion Tool

A web-based application for bidirectional data ingestion between ClickHouse and Flat Files.

## Features

- Bidirectional data flow (ClickHouse ↔ Flat File)
- JWT token-based authentication for ClickHouse
- Column selection for data ingestion
- Progress tracking and record counting
- Multi-table join support (bonus feature)
- Data preview capabilities

## Tech Stack

- Backend: Python/FastAPI
- Frontend: React
- Database: ClickHouse
- Authentication: JWT

## Project Structure

```
.
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   ├── tests/            # Test cases
│   └── requirements.txt  # Python dependencies
├── frontend/             # React frontend
│   ├── src/              # Source code
│   └── public/           # Static files
└── docker/               # Docker configuration
```

## Setup

1. Install dependencies:
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt

   # Frontend
   cd frontend
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values as needed

3. Run the application:
   ```bash
   # Backend
   cd backend
   uvicorn app.main:app --reload

   # Frontend
   cd frontend
   npm start
   ```

## Testing

Run the test suite:
```bash
cd backend
pytest
```

## License

MIT 