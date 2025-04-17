from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
import pandas as pd
import io
from pydantic import BaseModel

router = APIRouter()

class FileIngestionRequest(BaseModel):
    columns: List[str]
    delimiter: str = ","
    table_name: str

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        return {"message": "File uploaded successfully", "columns": df.columns.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/download")
async def download_file(data: List[dict]):
    try:
        df = pd.DataFrame(data)
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return {"data": output.getvalue()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ingest")
async def ingest_to_clickhouse(
    file: UploadFile = File(...),
    request: FileIngestionRequest = None
):
    try:
        contents = await file.read()
        df = pd.read_csv(
            io.StringIO(contents.decode('utf-8')),
            usecols=request.columns,
            delimiter=request.delimiter
        )
        
        # Here you would implement the actual ingestion to ClickHouse
        # This is a placeholder for the actual implementation
        return {
            "status": "success",
            "rows_processed": len(df),
            "columns": request.columns
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/preview")
async def preview_file(
    file: UploadFile = File(...),
    rows: int = 100
):
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        preview = df.head(rows)
        return {
            "data": preview.to_dict(orient='records'),
            "columns": df.columns.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 