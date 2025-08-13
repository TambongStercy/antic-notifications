import React, { useEffect, useState } from 'react'
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    TextField,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material'
import AnticLoader from '@/components/AnticLoader'
import { WhatsApp, Telegram, QrCode, Refresh } from '@mui/icons-material'
import QRCode from 'qrcode.react'
import { servicesAPI } from '@/services/api'
import { useSocket } from '@/contexts/SocketContext'
import type { ServiceStatus } from '@/types'
import toast from 'react-hot-toast'

const ServicesPage: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [qrCode, setQrCode] = useState('')
    const [qrDialogOpen, setQrDialogOpen] = useState(false)
    const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected')
    const [statusMessage, setStatusMessage] = useState<string>('')
    const [telegramCredentials, setTelegramCredentials] = useState({
        phoneNumber: ''
    })
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
    const [codeDialogOpen, setCodeDialogOpen] = useState(false)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [telegramCode, setTelegramCode] = useState('')
    const [telegramPassword, setTelegramPassword] = useState('')
    const { socket } = useSocket()

    useEffect(() => {
        fetchServices()
    }, [])

    useEffect(() => {
        if (socket) {
            // Enhanced WhatsApp status updates
            socket.on('whatsapp-status', (data) => {
                console.log('WhatsApp status update:', data);

                // Update status state
                setWhatsappStatus(data.status);
                setStatusMessage(data.message || '');

                switch (data.status) {
                    case 'qr_ready':
                        if (data.qrCode && typeof data.qrCode === 'string' && data.qrCode.length > 0 && data.qrCode.length < 4000) {
                            setQrCode(data.qrCode);
                            setQrDialogOpen(true);
                            toast.success('QR code generated! Please scan with your phone.');
                        } else {
                            console.error('Invalid QR code data:', data.qrCode?.length);
                            toast.error('Received invalid QR code data');
                        }
                        break;

                    case 'authenticating':
                        toast.success('QR code scanned! Authenticating...');
                        // Keep QR dialog open but show authenticating state
                        break;

                    case 'connected':
                        toast.success('WhatsApp connected successfully!');
                        setQrDialogOpen(false);
                        setQrCode('');
                        fetchServices(); // Refresh services list
                        break;

                    case 'disconnected':
                        toast.error(data.message || 'WhatsApp disconnected');
                        setQrDialogOpen(false);
                        setQrCode('');
                        fetchServices(); // Refresh services list
                        break;

                    case 'stream-error':
                        toast.error(data.message || 'WhatsApp stream error occurred');
                        setQrDialogOpen(false);
                        setQrCode('');
                        fetchServices(); // Refresh services list
                        break;

                    case 'reconnection-loop':
                        toast.error(data.message || 'WhatsApp stuck in reconnection loop');
                        setQrDialogOpen(false);
                        setQrCode('');
                        fetchServices(); // Refresh services list
                        break;
                }
            });

            // Legacy listeners for backward compatibility
            socket.on('qr-code', (data) => {
                if (data.service === 'whatsapp') {
                    console.log('Received QR code data length:', data.qrCode?.length);
                    if (data.qrCode && data.qrCode.length > 0 && data.qrCode.length < 4000) {
                        setQrCode(data.qrCode)
                        setQrDialogOpen(true)
                    } else {
                        console.error('Invalid QR code data:', data.qrCode?.length);
                        toast.error('Received invalid QR code data');
                    }
                }
            })

            socket.on('service-status', () => {
                fetchServices() // Refresh service status when it changes
            })

            // Telegram authentication events
            socket.on('telegram-code-required', () => {
                setCodeDialogOpen(true)
                toast('Please enter the verification code sent to your phone')
            })

            socket.on('telegram-password-required', () => {
                setPasswordDialogOpen(true)
                toast('Please enter your 2FA password')
            })

            socket.on('telegram-authenticated', () => {
                toast.success('Telegram authenticated successfully!')
                setCodeDialogOpen(false)
                setPasswordDialogOpen(false)
                fetchServices()
            })

            return () => {
                socket.off('whatsapp-status')
                socket.off('qr-code')
                socket.off('service-status')
                socket.off('telegram-code-required')
                socket.off('telegram-password-required')
                socket.off('telegram-authenticated')
            }
        }
    }, [socket])

    const fetchServices = async () => {
        try {
            const data = await servicesAPI.getStatus()
            setServices(data)
        } catch (error) {
            toast.error('Failed to fetch service status')
        } finally {
            setLoading(false)
        }
    }

    const getServiceInfo = (service: string) => {
        return services.find(s => s.service === service)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'success'
            case 'authenticating': return 'warning'
            case 'disconnected': return 'error'
            case 'stream-error': return 'error'
            case 'reconnection-loop': return 'error'
            case 'not_configured': return 'default'
            default: return 'default'
        }
    }

    const handleWhatsAppConnect = async () => {
        setActionLoading('whatsapp-connect')
        try {
            await servicesAPI.connectWhatsApp()
            toast.success('WhatsApp connection initiated')

            // Get QR code
            try {
                const qrData = await servicesAPI.getWhatsAppQR()
                console.log('QR code data length:', qrData.qrCode?.length);
                if (qrData.qrCode && qrData.qrCode.length > 0 && qrData.qrCode.length < 4000) {
                    setQrCode(qrData.qrCode)
                    setQrDialogOpen(true)
                } else {
                    console.error('Invalid QR code data from API:', qrData.qrCode?.length);
                    toast.error('Received invalid QR code data from server');
                }
            } catch (qrError) {
                // QR might not be available immediately
                console.log('QR code not available yet:', qrError)
            }
        } catch (error) {
            toast.error('Failed to connect WhatsApp')
        } finally {
            setActionLoading(null)
        }
    }

    const handleWhatsAppDisconnect = async () => {
        setActionLoading('whatsapp-disconnect')
        try {
            await servicesAPI.disconnectWhatsApp()
            toast.success('WhatsApp disconnected')
            fetchServices()
        } catch (error) {
            toast.error('Failed to disconnect WhatsApp')
        } finally {
            setActionLoading(null)
        }
    }

    const handleTelegramCredentialsSave = async () => {
        if (!telegramCredentials.phoneNumber) {
            toast.error('Please enter your phone number')
            return
        }

        setActionLoading('telegram-credentials')
        try {
            await servicesAPI.setTelegramCredentials({
                phoneNumber: telegramCredentials.phoneNumber
            })
            toast.success('Telegram credentials saved')
            setCredentialsDialogOpen(false)
            setTelegramCredentials({ phoneNumber: '' })
            fetchServices()
        } catch (error) {
            toast.error('Failed to save Telegram credentials')
        } finally {
            setActionLoading(null)
        }
    }

    const handleTelegramCodeSubmit = async () => {
        if (!telegramCode.trim()) {
            toast.error('Please enter the verification code')
            return
        }

        try {
            await servicesAPI.provideTelegramCode(telegramCode)
            toast.success('Verification code submitted')
            setCodeDialogOpen(false)
            setTelegramCode('')
        } catch (error) {
            toast.error('Failed to submit verification code')
        }
    }

    const handleTelegramPasswordSubmit = async () => {
        if (!telegramPassword.trim()) {
            toast.error('Please enter your password')
            return
        }

        try {
            await servicesAPI.provideTelegramPassword(telegramPassword)
            toast.success('Password submitted')
            setPasswordDialogOpen(false)
            setTelegramPassword('')
        } catch (error) {
            toast.error('Failed to submit password')
        }
    }

    const handleTelegramConnect = async () => {
        setActionLoading('telegram-connect')
        try {
            await servicesAPI.connectTelegram()
            toast.success('Telegram connected')
            fetchServices()
        } catch (error) {
            toast.error('Failed to connect Telegram')
        } finally {
            setActionLoading(null)
        }
    }

    const handleTelegramDisconnect = async () => {
        setActionLoading('telegram-disconnect')
        try {
            await servicesAPI.disconnectTelegram()
            toast.success('Telegram disconnected')
            fetchServices()
        } catch (error) {
            toast.error('Failed to disconnect Telegram')
        } finally {
            setActionLoading(null)
        }
    }

    const getQRCode = async () => {
        try {
            const qrData = await servicesAPI.getWhatsAppQR()
            console.log('Manual QR code fetch - data length:', qrData.qrCode?.length);
            if (qrData.qrCode && qrData.qrCode.length > 0 && qrData.qrCode.length < 4000) {
                setQrCode(qrData.qrCode)
                setQrDialogOpen(true)
            } else {
                console.error('Invalid QR code data from manual fetch:', qrData.qrCode?.length);
                toast.error('Received invalid QR code data. The QR code may be too large to display.');
            }
        } catch (error) {
            console.error('QR code fetch error:', error);
            toast.error('Failed to get QR code')
        }
    }

    const handleStreamErrorRecovery = async () => {
        setActionLoading('stream-recovery')
        try {
            await servicesAPI.handleWhatsAppStreamError()
            toast.success('Stream error recovery initiated. Please wait for new QR code.')

            // Wait a bit then try to get QR code
            setTimeout(async () => {
                try {
                    const qrData = await servicesAPI.getWhatsAppQR()
                    if (qrData.qrCode && qrData.qrCode.length > 0 && qrData.qrCode.length < 4000) {
                        setQrCode(qrData.qrCode)
                        setQrDialogOpen(true)
                    }
                } catch (error) {
                    console.log('QR code not ready yet after stream recovery')
                }
            }, 5000)

            fetchServices()
        } catch (error) {
            toast.error('Failed to recover from stream error')
        } finally {
            setActionLoading(null)
        }
    }

    const handleStopReconnection = async () => {
        setActionLoading('stop-reconnection')
        try {
            await servicesAPI.stopWhatsAppReconnection()
            toast.success('WhatsApp reconnection loop stopped. You can now try connecting manually.')
            fetchServices()
        } catch (error) {
            toast.error('Failed to stop reconnection loop')
        } finally {
            setActionLoading(null)
        }
    }

    const checkRealTimeStatus = async () => {
        try {
            const status = await servicesAPI.getWhatsAppRealTimeStatus()
            console.log('Real-time WhatsApp status:', status)
            toast.success(`Real-time status: Connected=${status.isConnected}, DB Status=${status.dbStatus?.status}`)
        } catch (error) {
            toast.error('Failed to get real-time status')
            console.error('Real-time status error:', error)
        }
    }

    if (loading) {
        return <AnticLoader fullScreen />
    }

    const whatsappService = getServiceInfo('whatsapp')
    const telegramService = getServiceInfo('telegram')

    return (
        <Box sx={{ pl: { xs: 2, sm: 3, md: 0.5 }, pr: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 }, maxWidth: '1400px', ml: 0, mr: 'auto' }}>
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
                    Service Configuration
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: '#616161',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 500,
                    }}
                >
                    Configure and manage WhatsApp and Telegram messaging services
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* WhatsApp Service */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.08)', height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <WhatsApp color="success" sx={{ fontSize: 40 }} />
                                <Box>
                                    <Typography variant="h6">WhatsApp Web</Typography>
                                    <Chip
                                        label={whatsappService?.status || 'Unknown'}
                                        color={getStatusColor(whatsappService?.status || 'not_configured') as any}
                                        size="small"
                                    />
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" paragraph>
                                Connect to WhatsApp Web to send messages through your WhatsApp account.
                                Scan the QR code with your phone to authenticate.
                            </Typography>

                            {whatsappService?.status === 'authenticating' && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Waiting for QR code scan. Open WhatsApp on your phone and scan the QR code.
                                </Alert>
                            )}

                            {whatsappService?.status === 'connected' && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    WhatsApp is connected and ready to send messages.
                                </Alert>
                            )}

                            {whatsappService?.status === 'disconnected' && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    WhatsApp is disconnected. This might be due to a stream error or connection issue.
                                    Try the "Fix Stream Error" button if regular connection fails.
                                </Alert>
                            )}

                            {whatsappService?.status === 'disconnected' && false && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    WhatsApp encountered a stream error. This usually happens when the QR code scan fails.
                                    Click "Fix Stream Error" to clear the session and generate a new QR code.
                                </Alert>
                            )}

                            {whatsappService?.status === 'disconnected' && false && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    WhatsApp is stuck in a reconnection loop. This happens when the connection keeps failing rapidly.
                                    Click "Stop Reconnection" to break the loop, then try connecting again.
                                </Alert>
                            )}
                        </CardContent>

                        <CardActions>
                            {whatsappService?.status === 'connected' ? (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={handleWhatsAppDisconnect}
                                    disabled={actionLoading === 'whatsapp-disconnect'}
                                >
                                    {actionLoading === 'whatsapp-disconnect' ? 'Disconnecting...' : 'Disconnect'}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleWhatsAppConnect}
                                    disabled={actionLoading === 'whatsapp-connect'}
                                >
                                    {actionLoading === 'whatsapp-connect' ? 'Connecting...' : 'Connect'}
                                </Button>
                            )}

                            {whatsappService?.status === 'authenticating' && (
                                <Button
                                    variant="outlined"
                                    startIcon={<QrCode />}
                                    onClick={getQRCode}
                                >
                                    Show QR Code
                                </Button>
                            )}

                            {(whatsappService?.status === 'disconnected') && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={handleStreamErrorRecovery}
                                        disabled={actionLoading === 'stream-recovery'}
                                        size="small"
                                    >
                                        {actionLoading === 'stream-recovery' ? 'Recovering...' : 'Fix Stream Error'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleStopReconnection}
                                        disabled={actionLoading === 'stop-reconnection'}
                                        size="small"
                                    >
                                        {actionLoading === 'stop-reconnection' ? 'Stopping...' : 'Stop Reconnection'}
                                    </Button>
                                </>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchServices}
                                size="small"
                            >
                                Refresh
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={checkRealTimeStatus}
                                size="small"
                                color="info"
                            >
                                Debug Status
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>

                {/* Telegram Service */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.08)', height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Telegram color="primary" sx={{ fontSize: 40 }} />
                                <Box>
                                    <Typography variant="h6">Telegram Bot</Typography>
                                    <Chip
                                        label={telegramService?.status || 'Unknown'}
                                        color={getStatusColor(telegramService?.status || 'not_configured') as any}
                                        size="small"
                                    />
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" paragraph>
                                Connect to Telegram using your personal account. You'll need API credentials from my.telegram.org
                                and your phone number for authentication.
                            </Typography>

                            {telegramService?.status === 'not_configured' && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Telegram is not configured. Set up API credentials to enable Telegram messaging.
                                </Alert>
                            )}

                            {telegramService?.status === 'connected' && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    Telegram is connected and ready to send messages.
                                </Alert>
                            )}

                            {telegramService?.status === 'authenticating' && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Telegram authentication in progress. Please provide the required information when prompted.
                                </Alert>
                            )}
                        </CardContent>

                        <CardActions>
                            {telegramService?.status === 'not_configured' || telegramService?.status === 'disconnected' ? (
                                <>
                                    <Button
                                        variant="contained"
                                        onClick={() => setCredentialsDialogOpen(true)}
                                    >
                                        Configure Credentials
                                    </Button>
                                    {telegramService?.status === 'disconnected' && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleTelegramConnect}
                                            disabled={actionLoading === 'telegram-connect'}
                                        >
                                            {actionLoading === 'telegram-connect' ? 'Connecting...' : 'Connect'}
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={handleTelegramDisconnect}
                                    disabled={actionLoading === 'telegram-disconnect'}
                                >
                                    {actionLoading === 'telegram-disconnect' ? 'Disconnecting...' : 'Disconnect'}
                                </Button>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchServices}
                                size="small"
                            >
                                Refresh
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>

            {/* QR Code Dialog */}
            <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
                <DialogTitle>
                    WhatsApp Connection
                    {whatsappStatus === 'authenticating' && (
                        <Chip
                            label="Authenticating..."
                            color="primary"
                            size="small"
                            sx={{ ml: 2 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                        {whatsappStatus === 'authenticating' ? (
                            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                                <Box
                                    sx={{
                                        width: 256,
                                        height: 256,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid #4CAF50',
                                        borderRadius: '12px',
                                        backgroundColor: '#f8f9fa'
                                    }}
                                >
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        ✓ QR Code Scanned!
                                    </Typography>
                                    <Typography color="text.secondary" textAlign="center">
                                        Authenticating with WhatsApp...
                                    </Typography>
                                </Box>
                                <Alert severity="success">
                                    QR code scanned successfully! Please wait while we connect to WhatsApp.
                                </Alert>
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary" align="center">
                                    Scan this QR code with your WhatsApp mobile app to authenticate
                                </Typography>
                                {qrCode && (
                                    <Box p={2} bgcolor="white" borderRadius={1}>
                                        {(() => {
                                            try {
                                                // Validate QR code data length (QR codes have a max capacity of ~4296 characters)
                                                if (qrCode.length > 4000) {
                                                    return (
                                                        <Alert severity="error">
                                                            QR code data is too long to display. Please try refreshing.
                                                        </Alert>
                                                    );
                                                }
                                                return <QRCode value={qrCode} size={256} level="M" />;
                                            } catch (error) {
                                                console.error('QR Code error:', error);
                                                return (
                                                    <Alert severity="error">
                                                        Failed to generate QR code. Please try refreshing.
                                                    </Alert>
                                                );
                                            }
                                        })()}
                                    </Box>
                                )}
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    {statusMessage || 'Keep this dialog open and scan the QR code within 20 seconds'}
                                </Alert>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
                    {whatsappStatus !== 'authenticating' && (
                        <Button onClick={getQRCode} variant="outlined">Refresh QR</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Telegram Credentials Dialog */}
            <Dialog open={credentialsDialogOpen} onClose={() => setCredentialsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Configure Telegram Credentials</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        To get your Telegram API credentials:
                    </Typography>
                    <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
                        <li>Go to <strong>my.telegram.org</strong></li>
                        <li>Log in with your phone number</li>
                        <li>Go to "API Development Tools"</li>
                        <li>Create a new application</li>
                        <li>Copy the API ID and API Hash</li>
                    </Typography>

                    <TextField
                        margin="dense"
                        label="Phone Number"
                        type="tel"
                        fullWidth
                        variant="outlined"
                        value={telegramCredentials.phoneNumber}
                        onChange={(e) => setTelegramCredentials({ ...telegramCredentials, phoneNumber: e.target.value })}
                        placeholder="+1234567890"
                        helperText="Your phone number with country code (App ID/Hash are loaded from server env)"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCredentialsDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleTelegramCredentialsSave}
                        variant="contained"
                        disabled={!telegramCredentials.phoneNumber || actionLoading === 'telegram-credentials'}
                    >
                        {actionLoading === 'telegram-credentials' ? 'Saving...' : 'Save Credentials'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Telegram Code Dialog */}
            <Dialog open={codeDialogOpen} onClose={() => setCodeDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Telegram Verification Code</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Enter the verification code sent to your Telegram app:
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Verification Code"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={telegramCode}
                        onChange={(e) => setTelegramCode(e.target.value)}
                        placeholder="12345"
                        inputProps={{ maxLength: 5 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCodeDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleTelegramCodeSubmit}
                        variant="contained"
                        disabled={!telegramCode.trim()}
                    >
                        Submit Code
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Telegram Password Dialog */}
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Telegram 2FA Password</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Enter your Telegram 2FA password:
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={telegramPassword}
                        onChange={(e) => setTelegramPassword(e.target.value)}
                        placeholder="Your 2FA password"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleTelegramPasswordSubmit}
                        variant="contained"
                        disabled={!telegramPassword.trim()}
                    >
                        Submit Password
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default ServicesPage
