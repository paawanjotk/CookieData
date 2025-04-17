from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import clickhouse, files, auth
from app.core.config import settings
from fastapi.responses import FileResponse
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Data Ingestion Tool",
    description="Bidirectional data ingestion between ClickHouse and Flat Files",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(clickhouse.router, prefix="/api/clickhouse", tags=["clickhouse"])

# Register the files router with explicit routes
files_router = files.router
print("Registering files router with routes:")
for route in files_router.routes:
    print(f"  {route.path} [{route.methods}]")

app.include_router(
    files_router,
    prefix="/api/flatfile",
    tags=["flatfile"],
    responses={404: {"description": "Not found"}},
)

# Register the test endpoint directly
@app.get("/api/flatfile/test")
async def test_endpoint():
    """
    Test endpoint to verify router is working
    """
    return {"message": "Router is working"}

@app.get("/")
async def root():
    return {"message": "Data Ingestion Tool API"}

# Print all registered routes
@app.on_event("startup")
async def startup_event():
    logger.info("Registered routes:")
    for route in app.routes:
        logger.info(f"{route.path} - {route.methods}") 