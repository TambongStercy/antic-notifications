import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material'
import Header from './Header'
import Sidebar from './Sidebar'
import AnticBackground from './AnticBackground'

const drawerWidth = 280

export const Layout: React.FC = () => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen)
    }

    const handleDrawerClose = () => {
        setMobileOpen(false)
    }

    return (
        <Box sx={{
            display: 'flex',
            minHeight: '100vh',
            bgcolor: '#F8F9FA',
            background: `
                radial-gradient(circle at 15% 25%, rgba(46, 125, 50, 0.02) 0%, transparent 50%),
                radial-gradient(circle at 85% 75%, rgba(245, 124, 0, 0.02) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(211, 47, 47, 0.01) 0%, transparent 50%)
            `
        }}>
            <CssBaseline />
            <AnticBackground />

            {/* Header */}
            <Header
                onMenuClick={handleDrawerToggle}
                showMenuButton={isMobile}
                sidebarWidth={isMobile ? 0 : drawerWidth}
            />

            {/* Sidebar */}
            <Sidebar
                open={mobileOpen}
                onClose={handleDrawerClose}
                variant={isMobile ? 'temporary' : 'permanent'}
            />

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    pt: '72px', // Match exact header height
                    pl: 0,
                    pr: 0,
                    pb: 0,
                    ml: 3,
                    minHeight: '100vh',
                    position: 'relative',
                    bgcolor: 'transparent',
                    transition: theme.transitions.create(['margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Outlet />
            </Box>
        </Box>
    )
}
