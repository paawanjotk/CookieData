from clickhouse_driver import Client
from fastapi import HTTPException
from typing import Optional
from pydantic import BaseModel
from .config import settings

class ClickHouseConnection(BaseModel):
    host: str
    port: int
    database: str
    user: str
    password: str

def get_clickhouse_client(conn: Optional[ClickHouseConnection] = None):
    try:
        if conn:
            print(f"Connecting to ClickHouse with custom connection: {conn.host}:{conn.port}")
            client = Client(
                host=conn.host,
                port=conn.port,
                database=conn.database,
                user=conn.user,
                password=conn.password
            )
        else:
            print(f"Connecting to ClickHouse with settings: {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}")
            client = Client(
                host=settings.CLICKHOUSE_HOST,
                port=settings.CLICKHOUSE_PORT,
                database=settings.CLICKHOUSE_DATABASE,
                user=settings.CLICKHOUSE_USER,
                password=settings.CLICKHOUSE_PASSWORD,
                secure=False  # Disable SSL for local development
            )
        # Test the connection
        client.execute("SELECT 1")
        print("ClickHouse connection successful")
        return client
    except Exception as e:
        print(f"ClickHouse connection error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) 