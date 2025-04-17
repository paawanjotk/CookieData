import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import axios from 'axios';

interface FileData {
  columns: string[];
  rowCount: number;
}

const FlatFilePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState(',');
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setFileData(null);
    setSelectedColumns([]);
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:8000/api/flatfile/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFileData(response.data);
    } catch (err) {
      setError('Failed to process file: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleIngest = async () => {
    if (!file || !fileData || selectedColumns.length === 0 || !tableName) return;

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('request', JSON.stringify({
        columns: selectedColumns,
        delimiter,
        table_name: tableName
      }));

      const response = await axios.post('http://localhost:8000/api/flatfile/ingest', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`Successfully ingested ${response.data.rows_processed} records!`);
    } catch (err) {
      setError('Ingestion failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Flat File Integration
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload File
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFile />}
          sx={{ mb: 2 }}
        >
          Choose File
          <input
            type="file"
            hidden
            accept=".csv,.txt"
            onChange={handleFileUpload}
          />
        </Button>
        {file && (
          <Typography variant="body1">
            Selected file: {file.name}
          </Typography>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {fileData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            File Information
          </Typography>
          <Typography variant="body1" gutterBottom>
            Total Rows: {fileData.rowCount}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Delimiter"
              value={delimiter}
              onChange={e => setDelimiter(e.target.value)}
            />
            <TextField
              label="Target Table Name"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Select Columns
          </Typography>
          <FormControl component="fieldset">
            <FormGroup>
              {fileData.columns.map(column => (
                <FormControlLabel
                  key={column}
                  control={
                    <Checkbox
                      checked={selectedColumns.includes(column)}
                      onChange={() => handleColumnToggle(column)}
                    />
                  }
                  label={column}
                />
              ))}
            </FormGroup>
          </FormControl>

          <Button
            variant="contained"
            onClick={handleIngest}
            disabled={loading || selectedColumns.length === 0 || !tableName}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Ingest to ClickHouse'}
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default FlatFilePage; 