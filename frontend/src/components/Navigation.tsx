import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import StorageIcon from '@mui/icons-material/Storage';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const Navigation: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Data Ingestion Tool
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/clickhouse"
            startIcon={<StorageIcon />}
          >
            ClickHouse
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/flatfile"
            startIcon={<InsertDriveFileIcon />}
          >
            Flat File
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 