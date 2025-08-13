import React, { useEffect, useState } from 'react'
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Alert,
} from '@mui/material'
import AnticLoader from '@/components/AnticLoader'
import {
    TrendingUp,
    WhatsApp,
    Telegram,
    Storage,
    CheckCircle,
    Error,
    Warning,
} from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { healthAPI, messagesAPI } from '@/services/api'
import type { HealthResponse, MessageStats } from '@/types'
import { format } from 'date-fns'

// Service-specific colors
const SERVICE_COLORS = {
    whatsapp: {
        sent: '#25D366',      // WhatsApp green
        pending: '#A8E6CF',   // Light green
        failed: '#FF5252'     // Red
    },
    telegram: {
        sent: '#0088CC',      // Telegram blue
        pending: '#81C7E8',   // Light blue
        failed: '#FF5252'     // Red
    }
}

const Dashboard: React.FC = () => {
    const [health, setHealth] = useState<HealthResponse | null>(null)
    const [stats, setStats] = useState<MessageStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
        return () => clearInterval(interval)
    }, [])

    const fetchData = async () => {
        try {
            const [healthData, statsData] = await Promise.all([
                healthAPI.getHealth(),
                messagesAPI.getStats(),
            ])
            setHealth(healthData)
            setStats(statsData)
            setError('')
        } catch (err: any) {
            setError('Failed to fetch dashboard data')
            console.error('Dashboard fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
            case 'healthy':
                return 'success'
            case 'authenticating':
                return 'warning'
            case 'disconnected':
            case 'not_configured':
            case 'unhealthy':
                return 'error'
            default:
                return 'default'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
            case 'healthy':
                return <CheckCircle />
            case 'authenticating':
                return <Warning />
            case 'disconnected':
            case 'not_configured':
            case 'unhealthy':
                return <Error />
            default:
                return null
        }
    }

    if (loading) {
        return <AnticLoader fullScreen />
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        )
    }

    // Prepare chart data with service-specific colors
    const chartData = stats?.messageStats ? [{
        name: 'Messages',
        whatsappSent: stats.messageStats.find(s => s.service === 'whatsapp')?.stats.find(st => st.status === 'sent')?.count || 0,
        whatsappPending: stats.messageStats.find(s => s.service === 'whatsapp')?.stats.find(st => st.status === 'pending')?.count || 0,
        whatsappFailed: stats.messageStats.find(s => s.service === 'whatsapp')?.stats.find(st => st.status === 'failed')?.count || 0,
        telegramSent: stats.messageStats.find(s => s.service === 'telegram')?.stats.find(st => st.status === 'sent')?.count || 0,
        telegramPending: stats.messageStats.find(s => s.service === 'telegram')?.stats.find(st => st.status === 'pending')?.count || 0,
        telegramFailed: stats.messageStats.find(s => s.service === 'telegram')?.stats.find(st => st.status === 'failed')?.count || 0,
    }] : []

    const pieData = stats?.messageStats.flatMap(service =>
        service.stats.map(stat => ({
            name: `${service.service} ${stat.status}`,
            value: stat.count,
            color: SERVICE_COLORS[service.service as keyof typeof SERVICE_COLORS]?.[stat.status as keyof typeof SERVICE_COLORS.whatsapp] || '#757575'
        }))
    ) || []

    return (
        <Box sx={{ pl: { xs: 2, sm: 3, md: 0.5 }, pr: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 }, maxWidth: '1400px', ml: 0, mr: 'auto' }}>
            <Box sx={{ mb: 5 }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 30%, #D32F2F 70%, #F57C00 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '2px',
                        mb: 1,
                        fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                    }}
                >
                    Notification Dashboard
                </Typography>
                <Typography
                    variant="h6"
                    sx={{
                        color: '#616161',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 500,
                        letterSpacing: '0.5px',
                        fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                    }}
                >
                    System Overview & Analytics • Last Updated: {format(new Date(), 'PPpp')}
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                {/* Service Status Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            height: '100%',
                            border: '2px solid rgba(46, 125, 50, 0.08)',
                            borderRadius: '16px',
                            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 32px rgba(46, 125, 50, 0.12)',
                                border: '2px solid rgba(46, 125, 50, 0.15)',
                            },
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 1.5,
                                        }}
                                    >
                                        Database
                                    </Typography>
                                    <Chip
                                        icon={getStatusIcon(health?.services.database || 'disconnected') || undefined}
                                        label={health?.services.database || 'Unknown'}
                                        color={getStatusColor(health?.services.database || 'disconnected') as any}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            height: '28px',
                                        }}
                                    />
                                </Box>
                                <Storage sx={{ color: '#2E7D32', fontSize: '2.5rem', opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            height: '100%',
                            border: '2px solid rgba(46, 125, 50, 0.08)',
                            borderRadius: '16px',
                            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.12)',
                                border: '2px solid rgba(76, 175, 80, 0.15)',
                            },
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 1.5,
                                        }}
                                    >
                                        WhatsApp
                                    </Typography>
                                    <Chip
                                        icon={getStatusIcon(health?.services.whatsapp || 'not_configured') || undefined}
                                        label={health?.services.whatsapp || 'Unknown'}
                                        color={getStatusColor(health?.services.whatsapp || 'not_configured') as any}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            height: '28px',
                                        }}
                                    />
                                </Box>
                                <WhatsApp sx={{ color: '#4CAF50', fontSize: '2.5rem', opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            height: '100%',
                            border: '2px solid rgba(46, 125, 50, 0.08)',
                            borderRadius: '16px',
                            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.12)',
                                border: '2px solid rgba(33, 150, 243, 0.15)',
                            },
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 1.5,
                                        }}
                                    >
                                        Telegram
                                    </Typography>
                                    <Chip
                                        icon={getStatusIcon(health?.services.telegram || 'not_configured') || undefined}
                                        label={health?.services.telegram || 'Unknown'}
                                        color={getStatusColor(health?.services.telegram || 'not_configured') as any}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            height: '28px',
                                        }}
                                    />
                                </Box>
                                <Telegram sx={{ color: '#2196F3', fontSize: '2.5rem', opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            height: '100%',
                            border: '2px solid rgba(46, 125, 50, 0.08)',
                            borderRadius: '16px',
                            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 32px rgba(245, 124, 0, 0.12)',
                                border: '2px solid rgba(245, 124, 0, 0.15)',
                            },
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 1.5,
                                        }}
                                    >
                                        Overall Status
                                    </Typography>
                                    <Chip
                                        icon={getStatusIcon(health?.status || 'unhealthy') || undefined}
                                        label={health?.status || 'Unknown'}
                                        color={getStatusColor(health?.status || 'unhealthy') as any}
                                        size="small"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            height: '28px',
                                        }}
                                    />
                                </Box>
                                <TrendingUp sx={{ color: '#F57C00', fontSize: '2.5rem', opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Queue Statistics */}
                {stats && (
                    <>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    border: '2px solid rgba(245, 124, 0, 0.08)',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(145deg, #FFFFFF 0%, #FFF8E1 100%)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 32px rgba(245, 124, 0, 0.15)',
                                        border: '2px solid rgba(245, 124, 0, 0.2)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 2,
                                        }}
                                    >
                                        Pending Messages
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            color: '#F57C00',
                                            fontWeight: 700,
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                                        }}
                                    >
                                        {stats.queueStats.pendingMessages}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    border: '2px solid rgba(211, 47, 47, 0.08)',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(145deg, #FFFFFF 0%, #FFEBEE 100%)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 32px rgba(211, 47, 47, 0.15)',
                                        border: '2px solid rgba(211, 47, 47, 0.2)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 2,
                                        }}
                                    >
                                        Failed Messages
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            color: '#D32F2F',
                                            fontWeight: 700,
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                                        }}
                                    >
                                        {stats.queueStats.failedMessages}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    border: '2px solid rgba(255, 152, 0, 0.08)',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(145deg, #FFFFFF 0%, #FFF3E0 100%)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
                                        border: '2px solid rgba(255, 152, 0, 0.2)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 2,
                                        }}
                                    >
                                        Retryable Messages
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            color: '#FF9800',
                                            fontWeight: 700,
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                                        }}
                                    >
                                        {stats.queueStats.retryableMessages}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                sx={{
                                    height: '100%',
                                    border: '2px solid rgba(46, 125, 50, 0.08)',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(145deg, #FFFFFF 0%, #E8F5E8 100%)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 32px rgba(46, 125, 50, 0.15)',
                                        border: '2px solid rgba(46, 125, 50, 0.2)',
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Typography
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            fontFamily: '"Inter", sans-serif',
                                            mb: 2,
                                        }}
                                    >
                                        System Uptime
                                    </Typography>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            color: '#2E7D32',
                                            fontWeight: 700,
                                            fontFamily: '"Inter", sans-serif',
                                            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                                        }}
                                    >
                                        {health ? Math.floor(health.uptime / 3600) : 0}h {health ? Math.floor((health.uptime % 3600) / 60) : 0}m
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </>
                )}

                {/* Charts */}
                {chartData.length > 0 && (
                    <Grid item xs={12} md={8}>
                        <Card
                            sx={{
                                border: '2px solid rgba(46, 125, 50, 0.08)',
                                borderRadius: '20px',
                                background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 12px 40px rgba(46, 125, 50, 0.1)',
                                    border: '2px solid rgba(46, 125, 50, 0.12)',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{
                                        color: '#2E7D32',
                                        fontWeight: 700,
                                        fontFamily: '"Inter", sans-serif',
                                        mb: 3,
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    Message Statistics by Service
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(46, 125, 50, 0.1)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: '#616161', fontFamily: 'Inter', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <YAxis
                                            tick={{ fill: '#616161', fontFamily: 'Inter', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(46, 125, 50, 0.2)' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'linear-gradient(145deg, #FFFFFF, #F8F9FA)',
                                                border: '2px solid rgba(46, 125, 50, 0.2)',
                                                borderRadius: '12px',
                                                color: '#212121',
                                                fontFamily: 'Inter',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                            }}
                                        />
                                        <Bar dataKey="whatsappSent" fill="#25D366" name="WhatsApp Sent" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="whatsappPending" fill="#A8E6CF" name="WhatsApp Pending" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="whatsappFailed" fill="#FF5252" name="WhatsApp Failed" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="telegramSent" fill="#0088CC" name="Telegram Sent" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="telegramPending" fill="#81C7E8" name="Telegram Pending" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="telegramFailed" fill="#FF5252" name="Telegram Failed" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {pieData.length > 0 && (
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                border: '2px solid rgba(46, 125, 50, 0.08)',
                                borderRadius: '20px',
                                background: 'linear-gradient(145deg, #FFFFFF 0%, #F8F9FA 100%)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 12px 40px rgba(46, 125, 50, 0.1)',
                                    border: '2px solid rgba(46, 125, 50, 0.12)',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{
                                        color: '#2E7D32',
                                        fontWeight: 700,
                                        fontFamily: '"Inter", sans-serif',
                                        mb: 3,
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    Message Distribution
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    )
}

export default Dashboard
