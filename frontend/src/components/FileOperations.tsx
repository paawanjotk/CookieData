import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface FileOperationsProps {
    onUploadSuccess?: () => void;
}

const FileOperations: React.FC<FileOperationsProps> = ({ onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [tableName, setTableName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [downloadTable, setDownloadTable] = useState('');
    const [downloadFormat, setDownloadFormat] = useState('csv');
    const { token } = useAuth();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            // Set default table name from filename
            const fileName = event.target.files[0].name;
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
            setTableName(nameWithoutExt);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        if (tableName) {
            formData.append('table_name', tableName);
        }

        try {
            const response = await fetch('http://localhost:8000/api/flatfile/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setSuccess(data.message);
            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!downloadTable) {
            setError('Please enter a table name');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `http://localhost:8000/api/flatfile/download/${downloadTable}?format=${downloadFormat}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${downloadTable}.${downloadFormat}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Upload File to ClickHouse
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                        variant="contained"
                        component="label"
                    >
                        Select File
                        <input
                            type="file"
                            hidden
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                        />
                    </Button>
                    {selectedFile && (
                        <Typography variant="body2">
                            Selected file: {selectedFile.name}
                        </Typography>
                    )}
                    <TextField
                        label="Table Name (optional)"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Upload'}
                    </Button>
                </Box>
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Download Table as File
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Table Name"
                        value={downloadTable}
                        onChange={(e) => setDownloadTable(e.target.value)}
                        fullWidth
                    />
                    <FormControl fullWidth>
                        <InputLabel>Format</InputLabel>
                        <Select
                            value={downloadFormat}
                            label="Format"
                            onChange={(e) => setDownloadFormat(e.target.value)}
                        >
                            <MenuItem value="csv">CSV</MenuItem>
                            <MenuItem value="xlsx">Excel</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDownload}
                        disabled={!downloadTable || loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Download'}
                    </Button>
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )}
        </Box>
    );
};

export default FileOperations; 