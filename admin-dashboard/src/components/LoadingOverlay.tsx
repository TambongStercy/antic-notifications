import React from 'react'
import { Box, Backdrop } from '@mui/material'
import AnticLoader from './AnticLoader'

interface LoadingOverlayProps {
    open: boolean
    size?: number
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    open, 
    size = 120 
}) => {
    return (
        <Backdrop
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                background: 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%)',
            }}
            open={open}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                }}
            >
                <AnticLoader size={size} minHeight="auto" />
            </Box>
        </Backdrop>
    )
}

export default LoadingOverlay