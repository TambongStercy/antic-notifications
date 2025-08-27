import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Container,
    Alert,
    InputAdornment,
    IconButton,
} from '@mui/material'
import {
    Security,
    Visibility,
    VisibilityOff,
    Person,
    Lock,
    Login as LoginIcon,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import AnticBackground from '@/components/AnticBackground'
import anticLogo from '@/assets/antic-logo.jpeg'
import toast from 'react-hot-toast'

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const { login, isAuthenticated, isLoading } = useAuth()

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!username || !password) {
            setError('Please enter both username and password')
            return
        }

        try {
            await login(username, password)
            toast.success('Welcome to ANTIC Notification Service')
        } catch (err: any) {
            const errorMessage = err.response?.data?.error?.message || 'Authentication failed'
            setError(errorMessage)
            toast.error(errorMessage)
        }
    }

    const handleTogglePassword = () => {
        setShowPassword(!showPassword)
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F1F8E9 0%, #FFF3E0 50%, #FFEBEE 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <AnticBackground />

            {/* ANTIC color accent elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    width: '120px',
                    height: '120px',
                    background: 'radial-gradient(circle, rgba(46, 125, 50, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                    animation: 'float 6s ease-in-out infinite',
                    '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-15px)' },
                    },
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '10%',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(211, 47, 47, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(15px)',
                    animation: 'float 8s ease-in-out infinite reverse',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    right: '20%',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(255, 193, 7, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(12px)',
                    animation: 'float 10s ease-in-out infinite',
                }}
            />

            <Container component="main" maxWidth="sm">
                <Card
                    sx={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '2px solid transparent',
                        borderRadius: '24px',
                        boxShadow: `
                            0 20px 60px rgba(0, 0, 0, 0.1),
                            0 8px 32px rgba(46, 125, 50, 0.1)
                        `,
                        overflow: 'hidden',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '6px',
                            background: 'linear-gradient(90deg, #0D47A1, #C62828, #F57C00, #0D47A1)',
                            backgroundSize: '300% 100%',
                            animation: 'anticShimmer 5s linear infinite',
                            '@keyframes anticShimmer': {
                                '0%': { backgroundPosition: '-300% 0' },
                                '100%': { backgroundPosition: '300% 0' },
                            },
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            right: 2,
                            bottom: 2,
                            background: 'linear-gradient(45deg, rgba(27, 94, 32, 0.05), rgba(198, 40, 40, 0.05), rgba(245, 124, 0, 0.05))',
                            borderRadius: '22px',
                            zIndex: -1,
                        },
                    }}
                >
                    <CardContent sx={{ p: 5 }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                            <Box sx={{ position: 'relative', mb: 3 }}>
                                <img
                                    src={anticLogo}
                                    alt="ANTIC Logo"
                                    style={{
                                        height: '90px',
                                        width: '90px',
                                        borderRadius: '50%',
                                        border: '4px solid transparent',
                                        background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #1976D2, #D32F2F, #FFC107) border-box',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -8,
                                        left: -8,
                                        right: -8,
                                        bottom: -8,
                                        border: '3px solid transparent',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, rgba(27, 94, 32, 0.4), rgba(198, 40, 40, 0.4), rgba(245, 124, 0, 0.4)) border-box',
                                        animation: 'anticPulse 4s infinite',
                                        '@keyframes anticPulse': {
                                            '0%': { transform: 'scale(1)', opacity: 0.6 },
                                            '50%': { transform: 'scale(1.1)', opacity: 0.3 },
                                            '100%': { transform: 'scale(1)', opacity: 0.6 },
                                        },
                                    }}
                                />
                            </Box>

                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: '"Inter", sans-serif',
                                    fontWeight: 800,
                                    letterSpacing: '3px',
                                    mb: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                }}
                            >
                                <span style={{ color: '#0D47A1' }}>A</span>
                                <span style={{ color: '#0D47A1' }}>N</span>
                                <span style={{ color: '#C62828' }}>T</span>
                                <span style={{ color: '#F57C00' }}>I</span>
                                <span style={{ color: '#FF6F00' }}>C</span>
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    fontFamily: '"Inter", sans-serif',
                                    color: '#424242',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    mb: 1,
                                }}
                            >
                                Notification Service
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Security sx={{ color: '#0D47A1', fontSize: '1.2rem' }} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontFamily: '"Inter", sans-serif',
                                        color: '#616161',
                                        fontWeight: 500,
                                    }}
                                >
                                    Admin Dashboard
                                </Typography>
                            </Box>
                        </Box>

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 3,
                                    borderRadius: '12px',
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Person sx={{ color: '#0D47A1' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: '#0D47A1' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={handleTogglePassword}
                                                edge="end"
                                                sx={{ color: '#0D47A1' }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 3 }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={isLoading}
                                startIcon={<LoginIcon />}
                                sx={{
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                mt: 3,
                                p: 2.5,
                                background: 'linear-gradient(145deg, rgba(27, 94, 32, 0.08), rgba(198, 40, 40, 0.04), rgba(245, 124, 0, 0.04))',
                                border: '2px solid transparent',
                                borderRadius: '16px',
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    borderRadius: '16px',
                                    padding: '2px',
                                    background: 'linear-gradient(45deg, rgba(27, 94, 32, 0.4), rgba(198, 40, 40, 0.4), rgba(245, 124, 0, 0.4))',
                                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    maskComposite: 'xor',
                                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    WebkitMaskComposite: 'xor',
                                },
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#424242',
                                    display: 'block',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    position: 'relative',
                                    zIndex: 1,
                                }}
                            >
                                <strong>Default Credentials:</strong><br />
                                <Box component="span" sx={{ color: '#0D47A1', fontWeight: 700 }}>admin</Box>
                                {' | '}
                                <Box component="span" sx={{ color: '#C62828', fontWeight: 700 }}>admin123</Box>
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    )
}

export default LoginPage
