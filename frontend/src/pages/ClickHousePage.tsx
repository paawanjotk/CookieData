import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Divider,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAuth } from '../contexts/AuthContext';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import SettingsIcon from '@mui/icons-material/Settings';

// API base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface TableData {
    [key: string]: any;
}

interface TableInfo {
    name: string;
    columns: string[];
}

interface ConnectionConfig {
    host: string;
    port: string;
    database: string;
    user: string;
    password: string;
    protocol: 'http' | 'https';
    jwtToken: string;
}

interface FlatFileConfig {
    delimiter: string;
    quoteChar: string;
    escapeChar: string;
}

const ClickHousePage: React.FC = () => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<TableData[]>([]);
    const [columns, setColumns] = useState<GridColDef[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [recordCount, setRecordCount] = useState<number>(0);
    const [sourceType, setSourceType] = useState<'clickhouse' | 'flatfile'>('clickhouse');
    const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
        host: 'localhost',
        port: '9000',
        database: 'default',
        user: 'default',
        password: '',
        protocol: 'http',
        jwtToken: '',
    });
    const [flatFileConfig, setFlatFileConfig] = useState<FlatFileConfig>({
        delimiter: ',',
        quoteChar: '"',
        escapeChar: '\\',
    });
    const [showConfig, setShowConfig] = useState<boolean>(false);
    const { token } = useAuth();

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            setLoading(true);
            setStatus('Fetching tables...');
            const response = await fetch(`${API_BASE_URL}/api/clickhouse/tables`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch tables');
            const data = await response.json();
            setTables(data.tables.map((name: string) => ({ name, columns: [] })));
            setStatus('Tables fetched successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Error fetching tables');
        } finally {
            setLoading(false);
        }
    };

    const handleTableSelect = async (tableName: string) => {
        setSelectedTable(tableName);
        try {
            setLoading(true);
            setStatus('Fetching table schema...');
            const response = await fetch(`${API_BASE_URL}/api/clickhouse/schema/${tableName}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch table schema');
            const schema = await response.json();
            
            const newColumns = schema.columns.map((col: { name: string; type: string }) => ({
                field: col.name,
                headerName: col.name,
                width: 150,
            }));
            setColumns(newColumns);
            setSelectedColumns(newColumns.map((col: GridColDef) => col.field));

            // Fetch table data
            setStatus('Fetching table data...');
            const dataResponse = await fetch(`${API_BASE_URL}/api/clickhouse/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: `SELECT * FROM ${tableName} LIMIT 100` }),
            });
            if (!dataResponse.ok) throw new Error('Failed to fetch table data');
            const data = await dataResponse.json();
            setTableData(data.data.map((row: any[], index: number) => {
                const rowData: TableData = { id: `${tableName}-${index}` };
                schema.columns.forEach((col: { name: string }, i: number) => {
                    rowData[col.name] = row[i];
                });
                return rowData;
            }));
            setRecordCount(data.data.length);
            setStatus('Data fetched successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    const handleQuerySubmit = async () => {
        if (!query.trim()) return;
        try {
            setLoading(true);
            setStatus('Executing query...');
            const response = await fetch(`${API_BASE_URL}/api/clickhouse/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query }),
            });
            if (!response.ok) throw new Error('Failed to execute query');
            const data = await response.json();
            setTableData(data.data.map((row: any[], index: number) => {
                const rowData: TableData = { id: `${selectedTable}-${index}` };
                columns.forEach((col, i) => {
                    rowData[col.field] = row[i];
                });
                return rowData;
            }));
            setRecordCount(data.data.length);
            setStatus('Query executed successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Error executing query');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (format: 'csv' | 'xlsx') => {
        if (!selectedTable) return;
        try {
            setLoading(true);
            setStatus(`Downloading ${format.toUpperCase()}...`);
            const response = await fetch(
                `${API_BASE_URL}/api/flatfile/download/${selectedTable}?format=${format}&columns=${selectedColumns.join(',')}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (!response.ok) throw new Error('Failed to download file');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedTable}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setStatus('Download completed successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('Error downloading file');
        } finally {
            setLoading(false);
        }
    };

    const handleColumnToggle = (columnName: string) => {
        setSelectedColumns(prev => 
            prev.includes(columnName)
                ? prev.filter(col => col !== columnName)
                : [...prev, columnName]
        );
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Data Integration Tool
                </Typography>
                
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Tabs
                        value={sourceType}
                        onChange={(_, newValue) => setSourceType(newValue)}
                        sx={{ mb: 2 }}
                    >
                        <Tab label="ClickHouse Source" value="clickhouse" />
                        <Tab label="Flat File Source" value="flatfile" />
                    </Tabs>

                    {sourceType === 'clickhouse' && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <IconButton onClick={() => setShowConfig(!showConfig)}>
                                    <SettingsIcon />
                                </IconButton>
                                <Typography>Connection Settings</Typography>
                            </Box>

                            {showConfig && (
                                <Paper sx={{ p: 2, mb: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Host"
                                                value={connectionConfig.host}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth>
                                                <InputLabel>Protocol</InputLabel>
                                                <Select
                                                    value={connectionConfig.protocol}
                                                    onChange={(e) => setConnectionConfig(prev => ({ 
                                                        ...prev, 
                                                        protocol: e.target.value as 'http' | 'https',
                                                        port: e.target.value === 'https' ? '8443' : '9000'
                                                    }))}
                                                    label="Protocol"
                                                >
                                                    <MenuItem value="http">HTTP</MenuItem>
                                                    <MenuItem value="https">HTTPS</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Port"
                                                value={connectionConfig.port}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, port: e.target.value }))}
                                                helperText={connectionConfig.protocol === 'https' ? 'Default: 8443/9440' : 'Default: 9000/8123'}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Database"
                                                value={connectionConfig.database}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, database: e.target.value }))}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="User"
                                                value={connectionConfig.user}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, user: e.target.value }))}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Password"
                                                type="password"
                                                value={connectionConfig.password}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="JWT Token"
                                                multiline
                                                rows={2}
                                                value={connectionConfig.jwtToken}
                                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, jwtToken: e.target.value }))}
                                                helperText="Enter your JWT token for authentication"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                variant="contained"
                                                onClick={() => {
                                                    // Here you would implement the connection test
                                                    setStatus('Testing connection...');
                                                    // Add your connection test logic here
                                                }}
                                            >
                                                Test Connection
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            )}

                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Select Table</InputLabel>
                                    <Select
                                        value={selectedTable}
                                        onChange={(e) => handleTableSelect(e.target.value)}
                                        label="Select Table"
                                    >
                                        {tables.map((table) => (
                                            <MenuItem key={table.name} value={table.name}>
                                                {table.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {selectedTable && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Download CSV">
                                            <span>
                                                <IconButton onClick={() => handleDownload('csv')} disabled={loading}>
                                                    <DownloadIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Download Excel">
                                            <span>
                                                <IconButton onClick={() => handleDownload('xlsx')} disabled={loading}>
                                                    <DownloadIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                )}
                            </Box>
                        </>
                    )}

                    {sourceType === 'flatfile' && (
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Delimiter"
                                        value={flatFileConfig.delimiter}
                                        onChange={(e) => setFlatFileConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Quote Character"
                                        value={flatFileConfig.quoteChar}
                                        onChange={(e) => setFlatFileConfig(prev => ({ ...prev, quoteChar: e.target.value }))}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Escape Character"
                                        value={flatFileConfig.escapeChar}
                                        onChange={(e) => setFlatFileConfig(prev => ({ ...prev, escapeChar: e.target.value }))}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    )}

                    {selectedTable && (
                        <Paper sx={{ p: 2, mb: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Column Selection
                            </Typography>
                            <FormGroup>
                                {columns.map((column) => (
                                    <FormControlLabel
                                        key={column.field}
                                        control={
                                            <Checkbox
                                                checked={selectedColumns.includes(column.field)}
                                                onChange={() => handleColumnToggle(column.field)}
                                            />
                                        }
                                        label={column.headerName}
                                    />
                                ))}
                            </FormGroup>
                        </Paper>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter your SQL query here..."
                            variant="outlined"
                        />
                        <Button
                            variant="contained"
                            onClick={handleQuerySubmit}
                            disabled={loading || !query.trim()}
                        >
                            Execute Query
                        </Button>
                    </Box>
                </Paper>

                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Status
                        </Typography>
                        <Typography color={error ? 'error' : 'textPrimary'}>
                            {status || 'Ready'}
                        </Typography>
                        {recordCount > 0 && (
                            <Typography>
                                Records: {recordCount}
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    tableData.length > 0 && (
                        <Paper sx={{ height: 400, width: '100%' }}>
                            <DataGrid
                                rows={tableData}
                                columns={columns}
                                initialState={{
                                    pagination: {
                                        paginationModel: { pageSize: 5 },
                                    },
                                }}
                                pageSizeOptions={[5]}
                                disableRowSelectionOnClick
                            />
                        </Paper>
                    )
                )}
            </Box>
        </Container>
    );
};

export default ClickHousePage; 