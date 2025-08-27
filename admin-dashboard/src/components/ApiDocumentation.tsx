import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tab,
    Tabs
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Send as SendIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`api-tabpanel-${index}`}
            aria-labelledby={`api-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const ApiDocumentation: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [testApiKey, setTestApiKey] = useState('');
    const [testRecipient, setTestRecipient] = useState('');
    const [testMessage, setTestMessage] = useState('');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const testWhatsAppAPI = async () => {
        try {
            const response = await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: testRecipient,
                    message: testMessage
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('WhatsApp message sent successfully!');
            } else {
                toast.error(data.error?.message || 'Failed to send message');
            }
        } catch (error) {
            toast.error('Network error occurred');
        }
        setTestDialogOpen(false);
    };

    const testTelegramAPI = async () => {
        try {
            const response = await fetch('/api/notifications/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: testRecipient,
                    message: testMessage
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('Telegram message sent successfully!');
            } else {
                toast.error(data.error?.message || 'Failed to send Telegram message');
            }
        } catch (error) {
            toast.error('Network error occurred');
        }
    };

    const testMattermostAPI = async () => {
        try {
            const response = await fetch('/api/notifications/mattermost', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: testRecipient,
                    message: testMessage
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('Mattermost message sent successfully!');
            } else {
                toast.error(data.error?.message || 'Failed to send Mattermost message');
            }
        } catch (error) {
            toast.error('Network error occurred');
        }
    };

    const codeExamples = {
        whatsapp: {
            curl: `curl -X POST https://your-domain.com/api/notifications/whatsapp \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_your_api_key_here" \\
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from ANTIC Notification Service!"
  }'`,
            javascript: `const response = await fetch('https://your-domain.com/api/notifications/whatsapp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ak_your_api_key_here'
  },
  body: JSON.stringify({
    recipient: '+1234567890',
    message: 'Hello from ANTIC Notification Service!'
  })
});

const result = await response.json();
console.log(result);`,
            python: `import requests

url = "https://your-domain.com/api/notifications/whatsapp"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "ak_your_api_key_here"
}
data = {
    "recipient": "+1234567890",
    "message": "Hello from ANTIC Notification Service!"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`
        },
        telegram: {
            curl: `curl -X POST https://your-domain.com/api/notifications/telegram \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_your_api_key_here" \\
  -d '{
    "recipient": "+237123456789",
    "message": "Hello from ANTIC Notification Service!"
  }'`,
            javascript: `const response = await fetch('https://your-domain.com/api/notifications/telegram', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ak_your_api_key_here'
  },
  body: JSON.stringify({
    recipient: '+237123456789',
    message: 'Hello from ANTIC Notification Service!'
  })
});

const result = await response.json();
console.log(result);`,
            python: `import requests

url = "https://your-domain.com/api/notifications/telegram"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "ak_your_api_key_here"
}
data = {
    "recipient": "+237123456789",
    "message": "Hello from ANTIC Notification Service!"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`
        },
        mattermost: {
            curl: `curl -X POST https://your-domain.com/api/notifications/mattermost \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_your_api_key_here" \\
  -d '{
    "recipient": "4xp9fdt7pbgium38k0k6w95oa4",
    "message": "Hello from ANTIC Notification Service!"
  }'`,
            javascript: `const response = await fetch('https://your-domain.com/api/notifications/mattermost', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ak_your_api_key_here'
  },
  body: JSON.stringify({
    recipient: '4xp9fdt7pbgium38k0k6w95oa4',
    message: 'Hello from ANTIC Notification Service!'
  })
});

const result = await response.json();
console.log(result);`,
            python: `import requests

url = "https://your-domain.com/api/notifications/mattermost"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "ak_your_api_key_here"
}
data = {
    "recipient": "4xp9fdt7pbgium38k0k6w95oa4",
    "message": "Hello from ANTIC Notification Service!"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`
        }
    };

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Getting Started" />
                    <Tab label="WhatsApp API" />
                    <Tab label="Telegram API" />
                    <Tab label="Mattermost API" />
                    <Tab label="Rate Limits" />
                    <Tab label="Test API" />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    Getting Started with ANTIC API
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                    All API requests require authentication using an API key in the X-API-Key header.
                </Alert>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Authentication
                        </Typography>
                        <Typography paragraph>
                            Include your API key in the request header:
                        </Typography>
                        <Box
                            sx={{
                                backgroundColor: '#f5f5f5',
                                p: 2,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                position: 'relative'
                            }}
                        >
                            X-API-Key: ak_your_api_key_here
                            <Button
                                size="small"
                                onClick={() => copyToClipboard('X-API-Key: ak_your_api_key_here')}
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                            >
                                <CopyIcon fontSize="small" />
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Base URL
                        </Typography>
                        <Typography paragraph>
                            All API requests should be made to:
                        </Typography>
                        <Box
                            sx={{
                                backgroundColor: '#f5f5f5',
                                p: 2,
                                borderRadius: 1,
                                fontFamily: 'monospace'
                            }}
                        >
                            https://your-domain.com/api
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{ borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Response Format
                        </Typography>
                        <Typography paragraph>
                            All responses are in JSON format:
                        </Typography>
                        <Box
                            sx={{
                                backgroundColor: '#f5f5f5',
                                p: 2,
                                borderRadius: 1,
                                fontFamily: 'monospace'
                            }}
                        >
                            {`{
  "success": true,
  "data": {
    "messageId": "msg_123456",
    "status": "sent"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}`}
                        </Box>
                    </CardContent>
                </Card>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    WhatsApp API
                </Typography>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Send WhatsApp Message
                        </Typography>
                        <Chip label="POST" color="success" sx={{ mr: 1 }} />
                        <Typography component="span" fontFamily="monospace">
                            /notifications/whatsapp
                        </Typography>

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Required Permission:
                        </Typography>
                        <Chip label="whatsapp:send" color="primary" size="small" />

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Request Body:
                        </Typography>
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Field</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Required</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>recipient</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Phone number with country code (e.g., +1234567890)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>message</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Message text (max 4096 characters)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>metadata</TableCell>
                                        <TableCell>object</TableCell>
                                        <TableCell>No</TableCell>
                                        <TableCell>Additional metadata for the message</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>Code Examples</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Tabs value={0}>
                            <Tab label="cURL" />
                            <Tab label="JavaScript" />
                            <Tab label="Python" />
                        </Tabs>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>cURL</Typography>
                            <Box
                                sx={{
                                    backgroundColor: '#f5f5f5',
                                    p: 2,
                                    borderRadius: 1,
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    whiteSpace: 'pre-wrap',
                                    position: 'relative'
                                }}
                            >
                                {codeExamples.whatsapp.curl}
                                <Button
                                    size="small"
                                    onClick={() => copyToClipboard(codeExamples.whatsapp.curl)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <CopyIcon fontSize="small" />
                                </Button>
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    Telegram API
                </Typography>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Send Telegram Message
                        </Typography>
                        <Chip label="POST" color="success" sx={{ mr: 1 }} />
                        <Typography component="span" fontFamily="monospace">
                            /notifications/telegram
                        </Typography>

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Required Permission:
                        </Typography>
                        <Chip label="telegram:send" color="primary" size="small" />

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Request Body:
                        </Typography>
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Field</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Required</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>recipient</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Phone number with country code (preferred), @username or chat ID</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>message</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Message text (max 4096 characters)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>metadata</TableCell>
                                        <TableCell>object</TableCell>
                                        <TableCell>No</TableCell>
                                        <TableCell>Additional metadata for the message</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Test Telegram API
                        </Typography>
                        <Typography paragraph color="text.secondary">
                            Send a Telegram message using a phone number (preferred), @username, or chat ID.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setTestDialogOpen(true)}
                        >
                            Test Telegram API
                        </Button>
                    </CardContent>
                </Card>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    Mattermost API
                </Typography>

                <Card sx={{ mb: 3, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Send Mattermost Message
                        </Typography>
                        <Chip label="POST" color="success" sx={{ mr: 1 }} />
                        <Typography component="span" fontFamily="monospace">
                            /notifications/mattermost
                        </Typography>

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Required Permission:
                        </Typography>
                        <Chip label="mattermost:send" color="secondary" size="small" />

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }} fontWeight={600}>
                            Request Body:
                        </Typography>
                        <TableContainer component={Paper} sx={{ mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Field</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Required</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>recipient</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Mattermost channel ID (26 alphanumeric characters)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>message</TableCell>
                                        <TableCell>string</TableCell>
                                        <TableCell>Yes</TableCell>
                                        <TableCell>Message text (supports Markdown, max 16383 characters)</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>metadata</TableCell>
                                        <TableCell>object</TableCell>
                                        <TableCell>No</TableCell>
                                        <TableCell>Additional metadata for the message</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Finding Channel IDs
                    </Typography>
                    <Typography variant="body2" component="div">
                        1. <strong>Web Interface:</strong> Open the channel in Mattermost web client and look at the URL<br/>
                        2. <strong>API:</strong> Use GET /api/v4/users/me/teams/{'{team_id}'}/channels with your Personal Access Token<br/>
                        3. <strong>Format:</strong> Channel IDs are exactly 26 alphanumeric characters (e.g., 4xp9fdt7pbgium38k0k6w95oa4)
                    </Typography>
                </Alert>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>Code Examples</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Tabs value={0}>
                            <Tab label="cURL" />
                            <Tab label="JavaScript" />
                            <Tab label="Python" />
                        </Tabs>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>cURL</Typography>
                            <Box
                                sx={{
                                    backgroundColor: '#f5f5f5',
                                    p: 2,
                                    borderRadius: 1,
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    whiteSpace: 'pre-wrap',
                                    position: 'relative'
                                }}
                            >
                                {codeExamples.mattermost.curl}
                                <Button
                                    size="small"
                                    onClick={() => copyToClipboard(codeExamples.mattermost.curl)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <CopyIcon fontSize="small" />
                                </Button>
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    Rate Limits
                </Typography>

                <Alert severity="warning" sx={{ mb: 3 }}>
                    Each API key has its own rate limit configuration. Exceeding the limit will result in HTTP 429 responses.
                </Alert>

                <Card sx={{ borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Rate Limit Headers
                        </Typography>
                        <Typography paragraph>
                            Every API response includes rate limit information in the headers:
                        </Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Header</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>X-RateLimit-Limit</TableCell>
                                        <TableCell>Maximum requests allowed in the time window</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>X-RateLimit-Remaining</TableCell>
                                        <TableCell>Number of requests remaining in the current window</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>X-RateLimit-Reset</TableCell>
                                        <TableCell>Unix timestamp when the rate limit resets</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
                <Typography variant="h5" gutterBottom fontWeight={600}>
                    Test API
                </Typography>

                <Card sx={{ borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Test WhatsApp API
                        </Typography>
                        <Typography paragraph color="text.secondary">
                            Test your API key by sending a WhatsApp message directly from this interface.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setTestDialogOpen(true)}
                        >
                            Test WhatsApp API
                        </Button>
                    </CardContent>
                </Card>

                <Card sx={{ mt: 2, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Test Telegram API
                        </Typography>
                        <Typography paragraph color="text.secondary">
                            Send a Telegram message using a phone number (preferred), @username, or chat ID.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setTestDialogOpen(true)}
                        >
                            Test Telegram API
                        </Button>
                    </CardContent>
                </Card>

                <Card sx={{ mt: 2, borderRadius: '12px' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Test Mattermost API
                        </Typography>
                        <Typography paragraph color="text.secondary">
                            Send a Mattermost message using a channel ID (26 alphanumeric characters).
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setTestDialogOpen(true)}
                        >
                            Test Mattermost API
                        </Button>
                    </CardContent>
                </Card>
            </TabPanel>

            {/* Test API Dialog */}
            <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Test API</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="API Key"
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        margin="normal"
                        placeholder="ak_your_api_key_here"
                    />
                    <TextField
                        fullWidth
                        label="Recipient"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        margin="normal"
                        placeholder="+1234567890, @username, chat_id, or channel_id"
                        helperText="Phone for WhatsApp/Telegram, @username/chat_id for Telegram, or 26-char channel ID for Mattermost"
                    />
                    <TextField
                        fullWidth
                        label="Message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        margin="normal"
                        multiline
                        rows={3}
                        placeholder="Hello from ANTIC!"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            (async () => {
                                try {
                                    const isPhone = /^\+?[1-9]\d{1,14}$/.test(testRecipient);
                                    const isChannelId = /^[a-z0-9]{26}$/.test(testRecipient);
                                    const isUsername = testRecipient.startsWith('@');
                                    const isChatId = /^\d+$/.test(testRecipient);

                                    let testCount = 0;
                                    const errors = [];

                                    // Test WhatsApp for phone numbers
                                    if (isPhone) {
                                        try {
                                            await testWhatsAppAPI();
                                            testCount++;
                                        } catch (err) {
                                            errors.push('WhatsApp test failed');
                                        }
                                    }

                                    // Test Telegram for phones, usernames, or chat IDs
                                    if (isPhone || isUsername || isChatId) {
                                        try {
                                            await testTelegramAPI();
                                            testCount++;
                                        } catch (err) {
                                            errors.push('Telegram test failed');
                                        }
                                    }

                                    // Test Mattermost for channel IDs
                                    if (isChannelId) {
                                        try {
                                            await testMattermostAPI();
                                            testCount++;
                                        } catch (err) {
                                            errors.push('Mattermost test failed');
                                        }
                                    }

                                    if (testCount === 0) {
                                        toast.error('Recipient format not recognized. Use +phone, @username, chat_id, or 26-char channel_id');
                                    } else if (errors.length > 0) {
                                        toast.error(`${testCount} test(s) completed, ${errors.length} failed`);
                                    }

                                } catch (err) {
                                    toast.error('Network error occurred');
                                }
                                setTestDialogOpen(false);
                            })();
                        }}
                        variant="contained"
                        disabled={!testApiKey || !testRecipient || !testMessage}
                    >
                        Send Test Message
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApiDocumentation;
