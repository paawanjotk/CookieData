from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response
from fastapi.responses import FileResponse
import pandas as pd
import tempfile
import os
from typing import List
from ..core.auth import get_current_user
from ..core.clickhouse import get_clickhouse_client

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """
    Test endpoint to verify router is working
    """
    return {"message": "Router is working"}

@router.get("/download/{table_name}", response_class=FileResponse)
async def download_file(
    table_name: str,
    format: str = "csv",
    current_user: str = Depends(get_current_user)
):
    """
    Download data from ClickHouse table as a flat file
    """
    try:
        print(f"Attempting to download table: {table_name} in format: {format}")
        try:
            client = get_clickhouse_client()
            print("ClickHouse client created successfully")
        except Exception as e:
            print(f"Error creating ClickHouse client: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error connecting to ClickHouse: {str(e)}"
            )
        
        # First check if the table exists
        check_table_query = f"SELECT count() FROM system.tables WHERE database = 'default' AND name = '{table_name}'"
        print(f"Checking table existence with query: {check_table_query}")
        try:
            table_count = client.execute(check_table_query)[0][0]
            print(f"Table count result: {table_count}")
        except Exception as e:
            print(f"Error checking table existence: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error checking table existence: {str(e)}"
            )
        
        if table_count == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Table '{table_name}' not found in database 'default'"
            )
        
        # Query data from ClickHouse
        query = f"SELECT * FROM {table_name}"
        print(f"Executing query: {query}")
        try:
            result = client.execute(query)
            print(f"Query result: {result}")
        except Exception as e:
            print(f"Error executing query: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error executing query: {str(e)}"
            )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No data found in table '{table_name}'"
            )
        
        # Convert to DataFrame
        try:
            df = pd.DataFrame(result)
            print(f"DataFrame created with shape: {df.shape}")
        except Exception as e:
            print(f"Error creating DataFrame: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating DataFrame: {str(e)}"
            )
        
        # Create temporary file
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{format}') as temp_file:
                print(f"Creating temporary file: {temp_file.name}")
                if format == "csv":
                    df.to_csv(temp_file.name, index=False)
                elif format == "xlsx":
                    df.to_excel(temp_file.name, index=False)
                else:
                    raise HTTPException(status_code=400, detail="Unsupported format")
                
                print(f"File created successfully, returning response")
                return FileResponse(
                    temp_file.name,
                    filename=f"{table_name}.{format}",
                    media_type=f"application/{format}"
                )
        except Exception as e:
            print(f"Error creating file: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating file: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in download_file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    table_name: str = None,
    current_user: str = Depends(get_current_user)
):
    """
    Upload a flat file and insert its contents into ClickHouse
    """
    try:
        # Create a temporary file to store the uploaded content
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Read the file based on its extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(temp_file_path)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(temp_file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Get ClickHouse client
        client = get_clickhouse_client()

        # If table_name is not provided, use the filename (without extension) as table name
        if not table_name:
            table_name = os.path.splitext(file.filename)[0]
        
        # Sanitize table name by replacing hyphens with underscores
        table_name = table_name.replace('-', '_')

        # Create table if it doesn't exist
        columns = []
        for col in df.columns:
            # Sanitize column names by replacing spaces and special characters with underscores
            col_name = col.replace(' ', '_').replace('-', '_')
            # Try to infer the type from the first non-null value
            sample = df[col].dropna().iloc[0] if not df[col].isna().all() else None
            if sample is not None:
                if isinstance(sample, (int, float)):
                    col_type = 'Float64'
                else:
                    col_type = 'String'
            else:
                col_type = 'String'
            columns.append(f"`{col_name}` {col_type}")

        create_table_query = f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                {', '.join(columns)}
            ) ENGINE = MergeTree()
            ORDER BY tuple()
        """
        client.execute(create_table_query)

        # Insert data
        for _, row in df.iterrows():
            values = []
            for val in row:
                if pd.isna(val):
                    values.append('NULL')
                elif isinstance(val, (int, float)):
                    values.append(str(val))
                else:
                    values.append(f"'{str(val)}'")
            
            insert_query = f"INSERT INTO `{table_name}` VALUES ({','.join(values)})"
            client.execute(insert_query)

        # Clean up
        os.unlink(temp_file_path)

        return {"message": f"File uploaded and data inserted into table {table_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 