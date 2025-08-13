import React from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    List,
    ListItem,
    ListItemText,
    Chip,
    Divider,
} from '@mui/material'
import { Info, Security, Storage, Notifications } from '@mui/icons-material'

const SettingsPage: React.FC = () => {
    const appInfo = {
        version: '1.0.0',
        apiEndpoint: window.location.origin.replace('3001', '3000'),
        websocketEndpoint: window.location.origin.replace('3001', '3002'),
        currency: 'FCFA',
    }

    const securitySettings = [
        { label: 'JWT Authentication', value: 'Enabled', status: 'success' },
        { label: 'Rate Limiting', value: '100 req/15min', status: 'success' },
        { label: 'CORS Protection', value: 'Enabled', status: 'success' },
        { label: 'Input Validation', value: 'Joi Schemas', status: 'success' },
    ]

    const storageSettings = [
        { label: 'Database', value: 'MongoDB', status: 'success' },
        { label: 'Session Storage', value: 'File System', status: 'success' },
        { label: 'Message Retention', value: 'Unlimited', status: 'info' },
        { label: 'Backup Strategy', value: 'Manual', status: 'warning' },
    ]

    const notificationSettings = [
        { label: 'WhatsApp Integration', value: 'WhatsApp Web.js', status: 'success' },
        { label: 'Telegram Integration', value: 'Bot API', status: 'success' },
        { label: 'Message Queue', value: 'In-Memory', status: 'success' },
        { label: 'Retry Mechanism', value: '3 attempts', status: 'success' },
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'success'
            case 'warning': return 'warning'
            case 'error': return 'error'
            case 'info': return 'info'
            default: return 'default'
        }
    }

    return (
        <Box sx={{ pl: { xs: 2, sm: 3, md: 0 }, pr: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 }, maxWidth: '1400px', ml: 0, mr: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 700,
                        color: '#1976D2',
                        mb: 1,
                    }}
                >
                    Settings & Information
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: '#616161',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 500,
                    }}
                >
                    System configuration and application information
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Application Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Info color="primary" />
                                <Typography variant="h6">Application Information</Typography>
                            </Box>

                            <List dense>
                                <ListItem>
                                    <ListItemText
                                        primary="Version"
                                        secondary={appInfo.version}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="API Endpoint"
                                        secondary={appInfo.apiEndpoint}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="WebSocket Endpoint"
                                        secondary={appInfo.websocketEndpoint}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="Default Currency"
                                        secondary={appInfo.currency}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary="Environment"
                                        secondary="Development"
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Security Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Security color="primary" />
                                <Typography variant="h6">Security Configuration</Typography>
                            </Box>

                            <List dense>
                                {securitySettings.map((setting, index) => (
                                    <React.Fragment key={setting.label}>
                                        <ListItem>
                                            <ListItemText
                                                primary={setting.label}
                                                secondary={setting.value}
                                            />
                                            <Chip
                                                label="Active"
                                                size="small"
                                                color={getStatusColor(setting.status) as any}
                                            />
                                        </ListItem>
                                        {index < securitySettings.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Storage Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Storage color="primary" />
                                <Typography variant="h6">Storage Configuration</Typography>
                            </Box>

                            <List dense>
                                {storageSettings.map((setting, index) => (
                                    <React.Fragment key={setting.label}>
                                        <ListItem>
                                            <ListItemText
                                                primary={setting.label}
                                                secondary={setting.value}
                                            />
                                            <Chip
                                                label={setting.status === 'warning' ? 'Review' : 'OK'}
                                                size="small"
                                                color={getStatusColor(setting.status) as any}
                                            />
                                        </ListItem>
                                        {index < storageSettings.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Notification Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Notifications color="primary" />
                                <Typography variant="h6">Notification Configuration</Typography>
                            </Box>

                            <List dense>
                                {notificationSettings.map((setting, index) => (
                                    <React.Fragment key={setting.label}>
                                        <ListItem>
                                            <ListItemText
                                                primary={setting.label}
                                                secondary={setting.value}
                                            />
                                            <Chip
                                                label="Active"
                                                size="small"
                                                color={getStatusColor(setting.status) as any}
                                            />
                                        </ListItem>
                                        {index < notificationSettings.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* API Documentation */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                API Documentation
                            </Typography>

                            <Typography variant="body2" color="text.secondary" paragraph>
                                Available API endpoints for external integration:
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                        <Typography variant="subtitle2">Health Check</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            GET /api/health
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                        <Typography variant="subtitle2">Send WhatsApp</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            POST /api/notifications/whatsapp
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                        <Typography variant="subtitle2">Send Telegram</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            POST /api/notifications/telegram
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Box p={2} bgcolor="grey.50" borderRadius={1}>
                                        <Typography variant="subtitle2">Admin Login</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            POST /api/admin/login
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                For complete API documentation, refer to the README.md file or the Postman collection.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    )
}

export default SettingsPage
