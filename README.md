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

## Docker Setup

This project uses Docker Compose to orchestrate three main services:
- Frontend (React)
- Backend (FastAPI)
- ClickHouse Database

### Prerequisites

- Docker
- Docker Compose
- Git

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Start the services:
```bash
docker-compose up --build
```

This will start all services in development mode with hot-reload enabled.

### Services

#### Frontend
- URL: http://localhost:3000
- Development server with hot-reload
- Environment variables:
  - `REACT_APP_API_URL`: Backend API URL
  - `REACT_APP_CLICKHOUSE_HOST`: ClickHouse host
  - `REACT_APP_CLICKHOUSE_PORT`: ClickHouse port
  - `REACT_APP_CLICKHOUSE_DATABASE`: ClickHouse database name
  - `REACT_APP_CLICKHOUSE_USER`: ClickHouse username

#### Backend
- URL: http://localhost:8000
- FastAPI server with hot-reload
- Environment variables:
  - `CLICKHOUSE_HOST`: ClickHouse host
  - `CLICKHOUSE_PORT`: ClickHouse port
  - `CLICKHOUSE_DATABASE`: ClickHouse database name
  - `CLICKHOUSE_USER`: ClickHouse username
  - `CLICKHOUSE_PASSWORD`: ClickHouse password

#### ClickHouse
- Native protocol: localhost:9000
- HTTP interface: localhost:8123
- Default credentials:
  - Database: default
  - User: default
  - Password: (empty)

### Development Workflow

1. **Starting Services**
```bash
# Start all services
docker-compose up

# Start services in detached mode
docker-compose up -d

# Rebuild and start services
docker-compose up --build
```

2. **Stopping Services**
```bash
# Stop all services
docker-compose down

# Stop services and remove volumes
docker-compose down -v
```

3. **Viewing Logs**
```bash
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f clickhouse
```

4. **Accessing Services**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- ClickHouse:
  - Native client: localhost:9000
  - HTTP interface: localhost:8123

### Production Deployment

For production deployment, you should:
1. Set appropriate environment variables
2. Use production-ready configurations
3. Implement proper security measures
4. Set up monitoring and logging

### Troubleshooting

1. **Port Conflicts**
If you encounter port conflicts, modify the port mappings in `docker-compose.yml`.

2. **Volume Issues**
If you need to reset the ClickHouse data:
```bash
docker-compose down -v
docker-compose up --build
```

3. **Build Issues**
If you encounter build issues:
```bash
# Clean up Docker cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build frontend
docker-compose build backend
```

### Additional Notes

- The development setup includes hot-reload for both frontend and backend
- ClickHouse data is persisted in a Docker volume
- The frontend uses Nginx in production mode
- The backend uses Uvicorn with hot-reload in development mode 