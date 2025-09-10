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
    Tabs,
    CircularProgress
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
    const [testService, setTestService] = useState<'whatsapp' | 'telegram' | 'mattermost' | 'all'>('all');
    const [testApiKey, setTestApiKey] = useState('');
    const [testRecipient, setTestRecipient] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Function to normalize recipient input
    const normalizeRecipient = (input: string): string => {
        let normalized = input
            .trim() // Remove leading/trailing spaces
            .replace(/\s+/g, '') // Remove all spaces
            .replace(/[^\w@+]/g, ''); // Keep only alphanumeric, @, and + characters

        // If it looks like a phone number (all digits, 7+ characters) but missing +, add it
        if (/^\d{7,}$/.test(normalized)) {
            normalized = '+' + normalized;
        }

        return normalized;
    };
    const [testMessage, setTestMessage] = useState('');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const testWhatsAppAPI = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: normalizeRecipient(testRecipient),
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
        } finally {
            setIsLoading(false);
            setTestDialogOpen(false);
        }
    };

    const testTelegramAPI = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/notifications/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: normalizeRecipient(testRecipient),
                    message: testMessage
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('Telegram message sent successfully!');
            } else {
                const errorMessage = data.error?.message || 'Failed to send Telegram message';
                if (errorMessage.includes('not found or not accessible')) {
                    toast.error('Telegram Chat ID not found. Make sure the user has started a conversation with your bot by sending /start first.');
                } else if (errorMessage.includes('bot was blocked')) {
                    toast.error('Your bot was blocked by this user. They need to unblock it first.');
                } else if (errorMessage.includes('chat not found')) {
                    toast.error('Chat not found. Verify the chat ID or username is correct.');
                } else {
                    toast.error(errorMessage);
                }
            }
        } catch (error) {
            toast.error('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const testMattermostAPI = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/notifications/mattermost', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': testApiKey
                },
                body: JSON.stringify({
                    recipient: normalizeRecipient(testRecipient),
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
        } finally {
            setIsLoading(false);
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

                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Getting Telegram Chat IDs:
                    </Typography>
                    <Typography variant="body2">
                        1. <strong>For users:</strong> They must start a conversation with your bot by sending <code>/start</code> first<br />
                        2. <strong>To get chat ID:</strong> Send a message to @userinfobot or check your bot's webhook logs<br />
                        3. <strong>For groups:</strong> Add your bot to the group and use the group's chat ID (negative number)<br />
                        4. <strong>Preferred:</strong> Use phone numbers with country code (e.g., +1234567890) when possible
                    </Typography>
                </Alert>

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
                                        <TableCell>Phone number with country code (+1234567890), @username, or numeric chat ID. User must have started conversation with bot first.</TableCell>
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
                                {codeExamples.telegram.curl}
                                <Button
                                    size="small"
                                    onClick={() => copyToClipboard(codeExamples.telegram.curl)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <CopyIcon fontSize="small" />
                                </Button>
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
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
                        1. <strong>Web Interface:</strong> Open the channel in Mattermost web client and look at the URL<br />
                        2. <strong>API:</strong> Use GET /api/v4/users/me/teams/{'{team_id}'}/channels with your Personal Access Token<br />
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
                            onClick={() => {
                                setTestService('whatsapp');
                                setTestDialogOpen(true);
                            }}
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
                            onClick={() => {
                                setTestService('telegram');
                                setTestDialogOpen(true);
                            }}
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
                            onClick={() => {
                                setTestService('mattermost');
                                setTestDialogOpen(true);
                            }}
                        >
                            Test Mattermost API
                        </Button>
                    </CardContent>
                </Card>
            </TabPanel>

            {/* Test API Dialog */}
            <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {testService === 'whatsapp' && 'Test WhatsApp API'}
                    {testService === 'telegram' && 'Test Telegram API'}
                    {testService === 'mattermost' && 'Test Mattermost API'}
                    {testService === 'all' && 'Test API'}
                </DialogTitle>
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
                        helperText="Phone numbers will auto-add + if missing. Use +1234567890 for WhatsApp/Telegram, @username or chat_id for Telegram, or 26-char channel ID for Mattermost."
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
                                    if (testService === 'whatsapp') {
                                        await testWhatsAppAPI();
                                    } else if (testService === 'telegram') {
                                        await testTelegramAPI();
                                    } else if (testService === 'mattermost') {
                                        await testMattermostAPI();
                                    } else if (testService === 'all') {
                                        setIsLoading(true);
                                        try {
                                            // Keep the original "Test All" logic for backward compatibility
                                            const normalizedRecipient = normalizeRecipient(testRecipient);
                                            const isPhone = /^\+\d+$/.test(normalizedRecipient);
                                            const isChannelId = /^[a-z0-9]{26}$/.test(normalizedRecipient);
                                            const isUsername = normalizedRecipient.startsWith('@');
                                            const isChatId = /^\d+$/.test(normalizedRecipient);

                                            let testCount = 0;
                                            const errors = [];

                                            if (isPhone) {
                                                try {
                                                    await testWhatsAppAPI();
                                                    testCount++;
                                                } catch (err) {
                                                    errors.push('WhatsApp test failed');
                                                }
                                            }

                                            if (isUsername || isChatId) {
                                                try {
                                                    await testTelegramAPI();
                                                    testCount++;
                                                } catch (err) {
                                                    errors.push('Telegram test failed');
                                                }
                                            }

                                            if (isChannelId) {
                                                try {
                                                    await testMattermostAPI();
                                                    testCount++;
                                                } catch (err) {
                                                    errors.push('Mattermost test failed');
                                                }
                                            }

                                            if (testCount === 0) {
                                                toast.error('Recipient format not recognized. Use: +phone (WhatsApp), @username or chat_id (Telegram), or 26-char channel_id (Mattermost)');
                                            } else if (errors.length > 0) {
                                                toast.error(`${testCount} test(s) completed, ${errors.length} failed`);
                                            }
                                        } finally {
                                            setIsLoading(false);
                                            setTestDialogOpen(false);
                                        }
                                    }
                                } catch (err) {
                                    toast.error('Network error occurred');
                                    setIsLoading(false);
                                    setTestDialogOpen(false);
                                }
                            })();
                        }}
                        variant="contained"
                        disabled={!testApiKey || !testRecipient || !testMessage || isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                    >
                        {isLoading ? (
                            'Sending...'
                        ) : (
                            <>
                                {testService === 'whatsapp' && 'Send WhatsApp Message'}
                                {testService === 'telegram' && 'Send Telegram Message'}
                                {testService === 'mattermost' && 'Send Mattermost Message'}
                                {testService === 'all' && 'Send Test Message'}
                            </>
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApiDocumentation;
