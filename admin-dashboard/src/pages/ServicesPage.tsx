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
import { WhatsApp, Telegram, QrCode, Refresh, Forum } from '@mui/icons-material'
import QRCode from 'qrcode.react'
import { servicesAPI } from '@/services/api'
import type { ServiceStatus } from '@/types'
import toast from 'react-hot-toast'

const ServicesPage: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [qrCode, setQrCode] = useState('')
    const [qrDialogOpen, setQrDialogOpen] = useState(false)
    const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected')
    const [telegramCredentials, setTelegramCredentials] = useState({
        phoneNumber: ''
    })
    const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
    const [codeDialogOpen, setCodeDialogOpen] = useState(false)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [telegramCode, setTelegramCode] = useState('')
    const [telegramPassword, setTelegramPassword] = useState('')
    const [mattermostConfig, setMattermostConfig] = useState({
        serverUrl: '',
        accessToken: ''
    })
    const [mattermostDialogOpen, setMattermostDialogOpen] = useState(false)
    const [pollingInterval, setPollingInterval] = useState(10000) // Start with 10 seconds
    const [lastStatusHash, setLastStatusHash] = useState('')

    useEffect(() => {
        fetchServices()
        
        // Set up intelligent polling that adjusts based on changes
        let timeoutId: NodeJS.Timeout
        
        const schedulePoll = (delay: number) => {
            timeoutId = setTimeout(() => {
                fetchServices()
                schedulePoll(pollingInterval) // Schedule next poll
            }, delay)
        }
        
        // Start polling after initial fetch
        schedulePoll(pollingInterval)

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [pollingInterval])


    const fetchServices = async () => {
        try {
            const data = await servicesAPI.getStatus()
            
            // Create a hash of the current status to detect changes
            const statusHash = JSON.stringify(data.map(s => ({ 
                service: s.service, 
                status: s.status, 
                hasQrCode: !!s.metadata?.qrCode 
            })))
            
            // Check if status has changed
            const hasChanges = statusHash !== lastStatusHash
            setLastStatusHash(statusHash)
            
            // Adjust polling frequency based on changes
            if (hasChanges) {
                // If there are changes, poll more frequently
                setPollingInterval(5000) // 5 seconds when changes detected
            } else {
                // If no changes, gradually slow down polling
                setPollingInterval(prev => Math.min(prev + 2000, 30000)) // Max 30 seconds
            }
            
            // Handle WhatsApp service updates
            const whatsappService = data.find(s => s.service === 'whatsapp')
            const previousWhatsappService = services.find(s => s.service === 'whatsapp')
            
            if (whatsappService && previousWhatsappService) {
                // Check for status changes
                if (whatsappService.status !== previousWhatsappService.status) {
                    setWhatsappStatus(whatsappService.status)
                    
                    switch (whatsappService.status) {
                        case 'connected':
                            toast.success('WhatsApp connected successfully!')
                            setQrDialogOpen(false)
                            setQrCode('')
                            break
                        case 'disconnected':
                            toast.error('WhatsApp disconnected')
                            setQrDialogOpen(false)
                            setQrCode('')
                            // Check for QR code in metadata when disconnected
                            if (whatsappService.metadata?.qrCode) {
                                setQrCode(whatsappService.metadata.qrCode)
                                setQrDialogOpen(true)
                                toast.success('QR code generated! Please scan with your phone.')
                            }
                            break
                    }
                }
                
                // Always check for new QR codes
                if (whatsappService.metadata?.qrCode && whatsappService.metadata.qrCode !== qrCode) {
                    setQrCode(whatsappService.metadata.qrCode)
                    if (!qrDialogOpen) {
                        setQrDialogOpen(true)
                        toast.success('New QR code available!')
                    }
                }
            }
            
            setServices(data)
        } catch (error) {
            // If it's a rate limit error, slow down polling significantly
            if (error instanceof Error && error.message.includes('rate limit')) {
                setPollingInterval(60000) // 1 minute if rate limited
                toast.error('Slowing down updates due to rate limiting')
            } else {
                toast.error('Failed to fetch service status')
            }
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
            case 'disconnected': return 'warning'  // Yellow for disconnected (not error, as it's normal state)
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
            toast.success('WhatsApp connection initiated. Please wait for QR code...')
            
            // Wait a moment for the QR code to be generated
            setTimeout(async () => {
                try {
                    const qrData = await servicesAPI.getWhatsAppQR()
                    console.log('QR code data length:', qrData.qrCode?.length);
                    if (qrData.qrCode && qrData.qrCode.length > 0) {
                        setQrCode(qrData.qrCode)
                        setQrDialogOpen(true)
                        toast.success('QR code is ready! Please scan with your phone.')
                    } else {
                        console.log('QR code not ready yet, polling will catch it');
                    }
                } catch (qrError) {
                    console.log('QR code not ready yet:', qrError)
                    toast.error('Waiting for QR code to be generated...')
                }
            }, 3000) // Wait 3 seconds

            fetchServices()
        } catch (error) {
            toast.error('Failed to initiate WhatsApp connection')
        } finally {
            setActionLoading(null)
        }
    }

    const handleWhatsAppDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect WhatsApp? You will need to scan the QR code again to reconnect.')) {
            return;
        }

        setActionLoading('whatsapp-disconnect')
        try {
            await servicesAPI.disconnectWhatsApp()
            toast.success('WhatsApp disconnected successfully. Connection closed.')
            setQrDialogOpen(false) // Close any open QR dialog
            setQrCode('') // Clear QR code
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
            const response = await servicesAPI.connectTelegram()
            
            // Check if authentication steps are needed
            if (response.status === 'auth_in_progress') {
                toast('Authentication in progress. Please check for SMS code.', { icon: 'ℹ️' })
                setCodeDialogOpen(true) // Show OTP modal
            } else if (response.status === 'code_required') {
                toast('Please enter the SMS verification code', { icon: 'ℹ️' })
                setCodeDialogOpen(true)
            } else if (response.status === 'password_required') {
                toast('Please enter your 2FA password', { icon: 'ℹ️' })
                setPasswordDialogOpen(true)
            } else if (response.success) {
                toast.success('Telegram connected successfully')
            }
            
            fetchServices()
        } catch (error: any) {
            // Check if error response contains authentication info
            if (error.response?.data?.status === 'code_required') {
                toast('Please enter the SMS verification code', { icon: 'ℹ️' })
                setCodeDialogOpen(true)
            } else if (error.response?.data?.status === 'password_required') {
                toast('Please enter your 2FA password', { icon: 'ℹ️' })
                setPasswordDialogOpen(true)
            } else {
                toast.error('Failed to connect Telegram')
            }
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
            if (qrData.qrCode && qrData.qrCode.length > 0) {
                setQrCode(qrData.qrCode)
                setQrDialogOpen(true)
            } else {
                console.error('No QR code data received:', qrData.qrCode?.length);
                toast.error('No QR code available. Please try connecting again.');
            }
        } catch (error) {
            console.error('QR code fetch error:', error);
            toast.error('Failed to get QR code')
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

    const handleMattermostConfigSave = async () => {
        if (!mattermostConfig.serverUrl || !mattermostConfig.accessToken) {
            toast.error('Please enter both server URL and access token')
            return
        }

        setActionLoading('mattermost-config')
        try {
            await servicesAPI.setMattermostConfig(mattermostConfig.serverUrl, mattermostConfig.accessToken)
            toast.success('Mattermost configuration saved')
            setMattermostDialogOpen(false)
            setMattermostConfig({ serverUrl: '', accessToken: '' })
            fetchServices()
        } catch (error) {
            toast.error('Failed to save Mattermost configuration')
        } finally {
            setActionLoading(null)
        }
    }

    const handleMattermostConnect = async () => {
        setActionLoading('mattermost-connect')
        try {
            await servicesAPI.connectMattermost()
            toast.success('Mattermost connected successfully')
            fetchServices()
        } catch (error) {
            toast.error('Failed to connect to Mattermost')
        } finally {
            setActionLoading(null)
        }
    }

    const handleMattermostDisconnect = async () => {
        setActionLoading('mattermost-disconnect')
        try {
            await servicesAPI.disconnectMattermost()
            toast.success('Mattermost disconnected')
            fetchServices()
        } catch (error) {
            toast.error('Failed to disconnect Mattermost')
        } finally {
            setActionLoading(null)
        }
    }

    const handleClearMattermostConfig = async () => {
        if (!window.confirm('Are you sure you want to clear the Mattermost configuration? You will need to reconfigure it to reconnect.')) {
            return
        }

        setActionLoading('mattermost-clear')
        try {
            await servicesAPI.clearMattermostConfig()
            toast.success('Mattermost configuration cleared')
            fetchServices()
        } catch (error) {
            toast.error('Failed to clear Mattermost configuration')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return <AnticLoader fullScreen />
    }

    const whatsappService = getServiceInfo('whatsapp')
    const telegramService = getServiceInfo('telegram')
    const mattermostService = getServiceInfo('mattermost')

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
                    Configure and manage WhatsApp, Telegram, and Mattermost messaging services
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* WhatsApp Service */}
                <Grid item xs={12} lg={4} md={6}>
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

                            {whatsappService?.status === 'connected' && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    ✅ WhatsApp is connected and ready to send messages.
                                </Alert>
                            )}

                            {whatsappService?.status === 'disconnected' && !whatsappService?.metadata?.qrCode && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    📱 Click "Connect WhatsApp" to generate a QR code and connect your phone.
                                </Alert>
                            )}

                            {whatsappService?.status === 'disconnected' && whatsappService?.metadata?.qrCode && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    📲 QR code is ready! Click "Show QR Code" and scan it with your WhatsApp app.
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
                                <>
                                    <Chip label="Connected & Ready" color="success" size="small" sx={{ mr: 1 }} />
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleWhatsAppDisconnect}
                                        disabled={actionLoading === 'whatsapp-disconnect'}
                                        size="small"
                                    >
                                        {actionLoading === 'whatsapp-disconnect' ? 'Disconnecting...' : 'Disconnect'}
                                    </Button>
                                </>
                            ) : (
                                // Disconnected state - show connect button and QR button if QR is available
                                <>
                                    <Button
                                        variant="contained"
                                        onClick={handleWhatsAppConnect}
                                        disabled={actionLoading === 'whatsapp-connect'}
                                        startIcon={<WhatsApp />}
                                    >
                                        {actionLoading === 'whatsapp-connect' ? 'Connecting...' : 'Connect WhatsApp'}
                                    </Button>
                                    
                                    {whatsappService?.metadata?.qrCode && (
                                        <Button
                                            variant="outlined"
                                            startIcon={<QrCode />}
                                            onClick={getQRCode}
                                            color="primary"
                                        >
                                            Show QR Code
                                        </Button>
                                    )}
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
                <Grid item xs={12} lg={4} md={6}>
                    <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.08)', height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Telegram color="primary" sx={{ fontSize: 40 }} />
                                <Box>
                                    <Typography variant="h6">Telegram</Typography>
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

                {/* Mattermost Service */}
                <Grid item xs={12} lg={4} md={6}>
                    <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.08)', height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Forum color="secondary" sx={{ fontSize: 40 }} />
                                <Box>
                                    <Typography variant="h6">Mattermost</Typography>
                                    <Chip
                                        label={mattermostService?.status || 'Unknown'}
                                        color={getStatusColor(mattermostService?.status || 'not_configured') as any}
                                        size="small"
                                    />
                                </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" paragraph>
                                Connect to your Mattermost server to send messages to channels.
                                You'll need a Personal Access Token for authentication.
                            </Typography>

                            {mattermostService?.status === 'not_configured' && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Mattermost is not configured. Set up server URL and access token to enable messaging.
                                </Alert>
                            )}

                            {mattermostService?.status === 'connected' && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    ✅ Mattermost is connected and ready to send messages.
                                </Alert>
                            )}

                            {mattermostService?.status === 'disconnected' && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    📊 Mattermost is configured but disconnected. Click "Connect" to establish connection.
                                </Alert>
                            )}
                        </CardContent>

                        <CardActions>
                            {mattermostService?.status === 'not_configured' ? (
                                <Button
                                    variant="contained"
                                    onClick={() => setMattermostDialogOpen(true)}
                                    startIcon={<Forum />}
                                >
                                    Configure Mattermost
                                </Button>
                            ) : mattermostService?.status === 'disconnected' ? (
                                <>
                                    <Button
                                        variant="contained"
                                        onClick={handleMattermostConnect}
                                        disabled={actionLoading === 'mattermost-connect'}
                                        startIcon={<Forum />}
                                    >
                                        {actionLoading === 'mattermost-connect' ? 'Connecting...' : 'Connect'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setMattermostDialogOpen(true)}
                                        size="small"
                                    >
                                        Reconfigure
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Chip label="Connected & Ready" color="success" size="small" sx={{ mr: 1 }} />
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleMattermostDisconnect}
                                        disabled={actionLoading === 'mattermost-disconnect'}
                                        size="small"
                                    >
                                        {actionLoading === 'mattermost-disconnect' ? 'Disconnecting...' : 'Disconnect'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={handleClearMattermostConfig}
                                        disabled={actionLoading === 'mattermost-clear'}
                                        size="small"
                                    >
                                        {actionLoading === 'mattermost-clear' ? 'Clearing...' : 'Clear Config'}
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
                                        border: '2px solid #42A5F5',
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
                                                // Check if QR code is a base64 image data URL
                                                if (qrCode.startsWith('data:image/')) {
                                                    return (
                                                        <img 
                                                            src={qrCode} 
                                                            alt="WhatsApp QR Code" 
                                                            style={{ width: 256, height: 256 }}
                                                        />
                                                    );
                                                }
                                                // Fallback for text-based QR codes
                                                return <QRCode value={qrCode} size={256} level="M" />;
                                            } catch (error) {
                                                console.error('QR Code error:', error);
                                                return (
                                                    <Alert severity="error">
                                                        Failed to display QR code. Please try refreshing.
                                                    </Alert>
                                                );
                                            }
                                        })()}
                                    </Box>
                                )}
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    Keep this dialog open and scan the QR code within 20 seconds
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

            {/* Mattermost Configuration Dialog */}
            <Dialog open={mattermostDialogOpen} onClose={() => setMattermostDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Configure Mattermost</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        To connect to Mattermost, you need:
                    </Typography>
                    <Typography variant="body2" component="ol" sx={{ pl: 2, mb: 2 }}>
                        <li>Your Mattermost server URL</li>
                        <li>A Personal Access Token with appropriate permissions</li>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        To create a Personal Access Token:
                    </Typography>
                    <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
                        <li>Go to <strong>Account Settings → Security → Personal Access Tokens</strong></li>
                        <li>Click "Create New Token"</li>
                        <li>Give it a description and save the token</li>
                        <li>Note: The token will only be shown once!</li>
                    </Typography>

                    <TextField
                        margin="dense"
                        label="Server URL"
                        type="url"
                        fullWidth
                        variant="outlined"
                        value={mattermostConfig.serverUrl}
                        onChange={(e) => setMattermostConfig({ ...mattermostConfig, serverUrl: e.target.value })}
                        placeholder="https://your-mattermost-server.com"
                        helperText="Full URL to your Mattermost server"
                        sx={{ mt: 2 }}
                    />

                    <TextField
                        margin="dense"
                        label="Personal Access Token"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={mattermostConfig.accessToken}
                        onChange={(e) => setMattermostConfig({ ...mattermostConfig, accessToken: e.target.value })}
                        placeholder="your-personal-access-token"
                        helperText="Personal Access Token from Mattermost"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMattermostDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleMattermostConfigSave}
                        variant="contained"
                        disabled={!mattermostConfig.serverUrl || !mattermostConfig.accessToken || actionLoading === 'mattermost-config'}
                    >
                        {actionLoading === 'mattermost-config' ? 'Saving...' : 'Save & Connect'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default ServicesPage
