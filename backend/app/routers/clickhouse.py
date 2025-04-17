from fastapi import APIRouter, HTTPException, Depends
from clickhouse_driver import Client
from typing import List, Optional, Dict
from pydantic import BaseModel
from app.core.config import settings
import asyncio
from fastapi.responses import StreamingResponse
import json

router = APIRouter()

class ClickHouseConnection(BaseModel):
    host: str
    port: int
    database: str
    user: str
    password: str

class MultiTableQuery(BaseModel):
    tables: List[str]
    columns: List[str]
    join_conditions: List[Dict[str, str]] = []

class QueryRequest(BaseModel):
    query: str

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

@router.post("/query")
async def execute_query(request: QueryRequest):
    try:
        print(f"Attempting to connect to ClickHouse at {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}")
        client = get_clickhouse_client()
        print(f"Executing query: {request.query}")
        result = client.execute(request.query)
        print(f"Query executed successfully, result: {result}")
        return {"data": result}
    except Exception as e:
        print(f"Error executing query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tables")
async def get_tables():
    try:
        client = get_clickhouse_client()
        result = client.execute("SHOW TABLES")
        return {"tables": [row[0] for row in result]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/schema/{table_name}")
async def get_table_schema(table_name: str):
    try:
        client = get_clickhouse_client()
        result = client.execute(f"DESCRIBE TABLE {table_name}")
        return {"columns": [{"name": row[0], "type": row[1]} for row in result]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/preview")
async def preview_data(query: MultiTableQuery):
    try:
        client = get_clickhouse_client()
        
        # Build the query
        if len(query.tables) == 1:
            query_str = f"SELECT {', '.join(query.columns)} FROM {query.tables[0]} LIMIT 100"
        else:
            # Build JOIN query
            join_parts = []
            for condition in query.join_conditions:
                join_parts.append(
                    f"{condition['joinType']} JOIN {condition['rightTable']} "
                    f"ON {condition['leftTable']}.{condition['leftColumn']} = "
                    f"{condition['rightTable']}.{condition['rightColumn']}"
                )
            query_str = (
                f"SELECT {', '.join(query.columns)} FROM {query.tables[0]} "
                f"{' '.join(join_parts)} LIMIT 100"
            )
        
        result = client.execute(query_str)
        return {
            "data": result,
            "count": len(result)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/export")
async def export_to_flatfile(query: MultiTableQuery):
    try:
        client = get_clickhouse_client()
        
        # Build the query
        if len(query.tables) == 1:
            query_str = f"SELECT {', '.join(query.columns)} FROM {query.tables[0]}"
        else:
            # Build JOIN query
            join_parts = []
            for condition in query.join_conditions:
                join_parts.append(
                    f"{condition['joinType']} JOIN {condition['rightTable']} "
                    f"ON {condition['leftTable']}.{condition['leftColumn']} = "
                    f"{condition['rightTable']}.{condition['rightColumn']}"
                )
            query_str = (
                f"SELECT {', '.join(query.columns)} FROM {query.tables[0]} "
                f"{' '.join(join_parts)}"
            )
        
        # Get total count for progress tracking
        count_query = f"SELECT count() FROM ({query_str})"
        total_count = client.execute(count_query)[0][0]
        
        # Stream the results
        async def generate():
            yield json.dumps({"total": total_count, "type": "progress"}) + "\n"
            
            batch_size = 1000
            offset = 0
            while True:
                batch_query = f"{query_str} LIMIT {batch_size} OFFSET {offset}"
                result = client.execute(batch_query)
                if not result:
                    break
                    
                for row in result:
                    yield json.dumps({"data": row, "type": "row"}) + "\n"
                
                offset += batch_size
                progress = min(100, int((offset / total_count) * 100))
                yield json.dumps({"progress": progress, "type": "progress"}) + "\n"
        
        return StreamingResponse(generate(), media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 