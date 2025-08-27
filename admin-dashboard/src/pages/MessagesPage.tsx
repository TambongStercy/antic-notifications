import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Alert,
    CircularProgress,
} from '@mui/material'
import { Refresh, Replay, Send, Visibility } from '@mui/icons-material'
import { messagesAPI } from '@/services/api'
import type { Message, PaginatedResponse, NotificationRequest } from '@/types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const MessagesPage: React.FC = () => {
    const [messages, setMessages] = useState<PaginatedResponse<Message> | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [serviceFilter, setServiceFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [recipientFilter, setRecipientFilter] = useState('')
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
    const [sendDialogOpen, setSendDialogOpen] = useState(false)
    const [newMessage, setNewMessage] = useState<NotificationRequest>({
        recipient: '',
        message: '',
        metadata: {}
    })
    const [sendService, setSendService] = useState<'whatsapp' | 'telegram' | 'mattermost'>('whatsapp')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null)

    useEffect(() => {
        fetchMessages()
    }, [page, rowsPerPage, serviceFilter, statusFilter, recipientFilter])

    const fetchMessages = async () => {
        setLoading(true)
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                ...(serviceFilter && { service: serviceFilter }),
                ...(statusFilter && { status: statusFilter }),
                ...(recipientFilter && { recipient: recipientFilter }),
            }
            const data = await messagesAPI.getMessages(params)
            setMessages(data)
        } catch (error) {
            toast.error('Failed to fetch messages')
        } finally {
            setLoading(false)
        }
    }

    const handleRetry = async (messageId: string) => {
        try {
            await messagesAPI.retryMessage(messageId)
            toast.success('Message queued for retry')
            fetchMessages()
        } catch (error) {
            toast.error('Failed to retry message')
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.recipient || !newMessage.message) {
            toast.error('Please fill in recipient and message')
            return
        }

        setSendingMessage(true)
        try {
            if (sendService === 'whatsapp') {
                await messagesAPI.sendWhatsApp(newMessage)
            } else if (sendService === 'telegram') {
                await messagesAPI.sendTelegram(newMessage)
            } else {
                await messagesAPI.sendMattermost(newMessage)
            }
            toast.success(`${sendService} message sent successfully`)
            setSendDialogOpen(false)
            setNewMessage({ recipient: '', message: '', metadata: {} })
            fetchMessages()
        } catch (error) {
            // Show a persistent banner when rate limited
            if (axios.isAxiosError(error) && error.response?.status === 429) {
                const resetHeader = error.response.headers?.['x-ratelimit-reset']
                const resetEpoch = parseInt(Array.isArray(resetHeader) ? resetHeader[0] : resetHeader || '0', 10)
                const nowEpoch = Math.floor(Date.now() / 1000)
                const seconds = resetEpoch > nowEpoch ? resetEpoch - nowEpoch : null
                setRateLimitSeconds(seconds ?? null)
            } else {
                toast.error(`Failed to send ${sendService} message`)
            }
        } finally {
            setSendingMessage(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'success'
            case 'failed': return 'error'
            case 'pending': return 'warning'
            default: return 'default'
        }
    }

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    return (
        <Box sx={{ pl: { xs: 2, sm: 3, md: 0.5 }, pr: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 }, maxWidth: '1400px', ml: 0, mr: 'auto' }}>
            {rateLimitSeconds !== null && (
                <Alert
                    severity="warning"
                    onClose={() => setRateLimitSeconds(null)}
                    sx={{ mb: 2 }}
                >
                    Rate limit exceeded for admin sends. Try again in {rateLimitSeconds}s.
                </Alert>
            )}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 700,
                            color: '#1976D2',
                            mb: 0.5,
                        }}
                    >
                        Message Center
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#616161',
                            fontFamily: '"Inter", sans-serif',
                        }}
                    >
                        Manage and monitor all notification messages
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => setSendDialogOpen(true)}
                    sx={{
                        borderRadius: '12px',
                        px: 3,
                        py: 1.5,
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                    }}
                >
                    Send Message
                </Button>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardContent>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                            color: '#1976D2',
                            fontWeight: 600,
                            fontFamily: '"Inter", sans-serif',
                        }}
                    >
                        Filter Messages
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Service</InputLabel>
                                <Select
                                    value={serviceFilter}
                                    label="Service"
                                    onChange={(e) => setServiceFilter(e.target.value)}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                                    <MenuItem value="telegram">Telegram</MenuItem>
                                    <MenuItem value="mattermost">Mattermost</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="sent">Sent</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="failed">Failed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Recipient"
                                value={recipientFilter}
                                onChange={(e) => setRecipientFilter(e.target.value)}
                                placeholder="Filter by recipient"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchMessages}
                                disabled={loading}
                            >
                                Refresh
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Messages Table */}
            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Service</TableCell>
                                <TableCell>Recipient</TableCell>
                                <TableCell>Message</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {messages?.data.map((message) => (
                                <TableRow key={message.id}>
                                    <TableCell>
                                        <Chip
                                            label={message.service}
                                            color={message.service === 'whatsapp' ? 'success' : message.service === 'telegram' ? 'primary' : 'secondary'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{message.recipient}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                            {message.message}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={message.status}
                                            color={getStatusColor(message.status) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {format(new Date(message.timestamp), 'MMM dd, yyyy HH:mm')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => setSelectedMessage(message)}
                                        >
                                            <Visibility />
                                        </IconButton>
                                        {message.status === 'failed' && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRetry(message.id)}
                                                color="warning"
                                            >
                                                <Replay />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {messages && (
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={messages.pagination.total}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                )}
            </Card>

            {/* Message Details Dialog */}
            <Dialog
                open={!!selectedMessage}
                onClose={() => setSelectedMessage(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Message Details</DialogTitle>
                <DialogContent>
                    {selectedMessage && (
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2">Service</Typography>
                                    <Typography variant="body2">{selectedMessage.service}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2">Status</Typography>
                                    <Chip
                                        label={selectedMessage.status}
                                        color={getStatusColor(selectedMessage.status) as any}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2">Recipient</Typography>
                                    <Typography variant="body2">{selectedMessage.recipient}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2">Message</Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {selectedMessage.message}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2">Timestamp</Typography>
                                    <Typography variant="body2">
                                        {format(new Date(selectedMessage.timestamp), 'PPpp')}
                                    </Typography>
                                </Grid>
                                {selectedMessage.messageId && (
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2">Message ID</Typography>
                                        <Typography variant="body2">{selectedMessage.messageId}</Typography>
                                    </Grid>
                                )}
                                {selectedMessage.errorMessage && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2">Error</Typography>
                                        <Alert severity="error" sx={{ mt: 1 }}>
                                            {selectedMessage.errorMessage}
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedMessage(null)}>Close</Button>
                    {selectedMessage?.status === 'failed' && (
                        <Button
                            onClick={() => {
                                handleRetry(selectedMessage.id)
                                setSelectedMessage(null)
                            }}
                            variant="contained"
                            color="warning"
                        >
                            Retry
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Send Message Dialog */}
            <Dialog
                open={sendDialogOpen}
                onClose={() => setSendDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Send New Message</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Service</InputLabel>
                                <Select
                                    value={sendService}
                                    label="Service"
                                    onChange={(e) => setSendService(e.target.value as 'whatsapp' | 'telegram' | 'mattermost')}
                                >
                                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                                    <MenuItem value="telegram">Telegram</MenuItem>
                                    <MenuItem value="mattermost">Mattermost</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Recipient"
                                value={newMessage.recipient}
                                onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}
                                placeholder={
                                    sendService === 'whatsapp' ? '+237123456789' :
                                    sendService === 'telegram' ? '+237123456789 (preferred)' :
                                    '4xp9fdt7pbgium38k0k6w95oa4'
                                }
                                helperText={
                                    sendService === 'whatsapp'
                                        ? 'Enter phone number with country code'
                                        : sendService === 'telegram'
                                        ? 'Enter phone number (preferred). @username or chat ID also supported.'
                                        : 'Enter Mattermost channel ID (26 alphanumeric characters)'
                                }
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Message"
                                value={newMessage.message}
                                onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                                placeholder="Enter your message..."
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setSendDialogOpen(false)}
                        disabled={sendingMessage}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendMessage}
                        variant="contained"
                        disabled={!newMessage.recipient || !newMessage.message || sendingMessage}
                        startIcon={sendingMessage ? <CircularProgress size={16} color="inherit" /> : <Send />}
                    >
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default MessagesPage
