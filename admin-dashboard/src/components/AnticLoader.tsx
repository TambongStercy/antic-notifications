import React from 'react'
import { Box, keyframes } from '@mui/material'
import anticLogo from '@/assets/antic-logo.jpeg'

// Rotating animation for the colored border only
const rotateAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

interface AnticLoaderProps {
    size?: number
    minHeight?: string
    fullScreen?: boolean
}

const AnticLoader: React.FC<AnticLoaderProps> = ({
    size = 120,
    minHeight = '100vh',
    fullScreen = false
}) => {
    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={minHeight}
            sx={{
                background: 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
                position: fullScreen ? 'fixed' : 'relative',
                top: fullScreen ? 0 : 'auto',
                left: fullScreen ? 0 : 'auto',
                right: fullScreen ? 0 : 'auto',
                bottom: fullScreen ? 0 : 'auto',
                width: fullScreen ? '100vw' : 'auto',
                height: fullScreen ? '100vh' : 'auto',
                zIndex: fullScreen ? 9999 : 'auto',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
            radial-gradient(circle at 20% 30%, rgba(25, 118, 210, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(245, 124, 0, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(211, 47, 47, 0.02) 0%, transparent 50%)
          `,
                    pointerEvents: 'none',
                    zIndex: 0,
                },
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: size,
                    height: size,
                    zIndex: 1,
                }}
            >
                {/* Rotating colored border only */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: `conic-gradient(
              from 0deg,
              #1976D2 0deg 120deg,
              #D32F2F 120deg 240deg,
              #F57C00 240deg 360deg
            )`,
                        animation: `${rotateAnimation} 2s linear infinite`,
                        padding: '4px',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 'calc(100% - 8px)',
                            height: 'calc(100% - 8px)',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            zIndex: 1,
                        },
                    }}
                />

                {/* Static ANTIC Logo (no rotation or pulsing) */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: size * 0.6,
                        height: size * 0.6,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)',
                        zIndex: 2,
                        border: '3px solid #FFFFFF',
                    }}
                >
                    <img
                        src={anticLogo}
                        alt="ANTIC Logo"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                        }}
                    />
                </Box>
            </Box>
        </Box>
    )
}

export default AnticLoader



