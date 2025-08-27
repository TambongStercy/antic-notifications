import React from 'react'
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Menu,
    MenuItem,
    Chip,
} from '@mui/material'
import {
    Menu as MenuIcon,
    ExitToApp,
    PowerSettingsNew,
    AdminPanelSettings
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import anticLogo from '@/assets/antic-logo.jpeg'

interface HeaderProps {
    onMenuClick: () => void
    showMenuButton?: boolean
    sidebarWidth?: number
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = true }) => {
    const { logout } = useAuth()
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = () => {
        handleClose()
        logout()
    }

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                backdropFilter: 'blur(10px)',
                borderBottom: 'none',
                borderRadius: 0, // Remove any border radius
                boxShadow: '0 2px 20px rgba(25, 118, 210, 0.2)',
                height: '72px',
                '& .MuiToolbar-root': {
                    minHeight: '72px !important',
                },
            }}
        >
            <Toolbar sx={{ minHeight: '72px !important', px: 3 }}>
                {showMenuButton && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={onMenuClick}
                        edge="start"
                        sx={{
                            mr: 2,
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                            }
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                {/* ANTIC Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                    <img
                        src={anticLogo}
                        alt="ANTIC Logo"
                        style={{
                            height: '40px',
                            width: '40px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        }}
                    />
                    <Box sx={{ ml: 2 }}>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 700,
                                color: 'white',
                                letterSpacing: '1px',
                            }}
                        >
                            ANTIC
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                            }}
                        >
                            Notification Service
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {/* Status Indicator */}
                <Chip
                    icon={<PowerSettingsNew />}
                    label="Online"
                    sx={{
                        mr: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '& .MuiChip-icon': {
                            color: '#42A5F5',
                        },
                    }}
                />

                {/* User Menu */}
                <Box>
                    <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={handleMenu}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                            }
                        }}
                    >
                        <AdminPanelSettings />
                    </IconButton>
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        sx={{
                            '& .MuiPaper-root': {
                                background: 'white',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                            }
                        }}
                    >
                        <MenuItem
                            onClick={handleLogout}
                            sx={{
                                fontFamily: '"Inter", sans-serif',
                                color: '#D32F2F',
                                fontWeight: 500,
                                '&:hover': {
                                    background: 'rgba(211, 47, 47, 0.1)',
                                }
                            }}
                        >
                            <ExitToApp sx={{ mr: 1, color: '#D32F2F' }} />
                            Logout
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    )
}

export default Header
