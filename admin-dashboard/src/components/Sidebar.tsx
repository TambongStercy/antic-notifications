import React from 'react'
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    Divider,
} from '@mui/material'
import {
    Dashboard as DashboardIcon,
    Settings as SettingsIcon,
    Message as MessageIcon,
    Build as ServicesIcon,
    Security,
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'

const drawerWidth = 280

interface SidebarProps {
    open: boolean
    onClose: () => void
    variant?: 'temporary' | 'permanent'
}

const menuItems = [
    {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        description: 'Overview & Analytics',
    },
    {
        text: 'Messages',
        icon: <MessageIcon />,
        path: '/messages',
        description: 'Message History',
    },
    {
        text: 'Services',
        icon: <ServicesIcon />,
        path: '/services',
        description: 'WhatsApp & Telegram',
    },
    {
        text: 'API Keys',
        icon: <Security />,
        path: '/api-keys',
        description: 'Manage API Access',
    },
    {
        text: 'Settings',
        icon: <SettingsIcon />,
        path: '/settings',
        description: 'Configuration',
    },
]

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant = 'temporary' }) => {
    const location = useLocation()
    const navigate = useNavigate()

    const handleNavigation = (path: string) => {
        navigate(path)
        if (variant === 'temporary') {
            onClose()
        }
    }

    return (
        <Drawer
            variant={variant}
            open={variant === 'permanent' ? true : open}
            onClose={variant === 'temporary' ? onClose : undefined}
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
                    borderRight: '1px solid rgba(25, 118, 210, 0.05)',
                    boxShadow: 'none',
                    borderRadius: 0, // Remove any border radius
                },
            }}
        >
            <Box
                sx={{
                    overflow: 'auto',
                    pt: '72px', // Match header height exactly
                    // Hide scrollbar by default, show only during scroll
                    '&::-webkit-scrollbar': {
                        width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(25, 118, 210, 0.2)',
                        borderRadius: '3px',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                    },
                    '&:hover::-webkit-scrollbar-thumb': {
                        opacity: 1,
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(25, 118, 210, 0.4)',
                    },
                    // For Firefox
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(25, 118, 210, 0.2) transparent',
                }}
            >
                <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0)', mx: 2, mt: 5 }} />

                {/* Menu Items */}
                <List sx={{ px: 2, py: 1 }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => handleNavigation(item.path)}
                                    sx={{
                                        borderRadius: '12px',
                                        py: 1.5,
                                        px: 2,
                                        background: isActive
                                            ? 'linear-gradient(90deg, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.08))'
                                            : 'transparent',
                                        border: isActive
                                            ? '2px solid rgba(25, 118, 210, 0.3)'
                                            : '2px solid transparent',
                                        boxShadow: isActive
                                            ? '0 3px 12px rgba(25, 118, 210, 0.15)'
                                            : 'none',
                                        '&:hover': {
                                            background: isActive
                                                ? 'linear-gradient(90deg, rgba(25, 118, 210, 0.2), rgba(25, 118, 210, 0.1))'
                                                : 'rgba(25, 118, 210, 0.05)',
                                            border: '2px solid rgba(25, 118, 210, 0.2)',
                                            transform: 'translateX(2px)',
                                        },
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: isActive ? '#1976D2' : '#757575',
                                            minWidth: 40,
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                sx={{
                                                    fontFamily: '"Inter", sans-serif',
                                                    fontWeight: isActive ? 700 : 500,
                                                    fontSize: '0.9rem',
                                                    color: isActive ? '#1976D2' : '#424242',
                                                    letterSpacing: '0.5px',
                                                }}
                                            >
                                                {item.text}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography
                                                sx={{
                                                    fontFamily: '"Inter", sans-serif',
                                                    fontSize: '0.75rem',
                                                    color: isActive ? '#1976D2' : '#757575',
                                                    letterSpacing: '0.25px',
                                                }}
                                            >
                                                {item.description}
                                            </Typography>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        )
                    })}
                </List>

                <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.1)', mx: 2, my: 2 }} />

                {/* Status Section */}
                <Box sx={{ p: 2 }}>
                    <Box
                        sx={{
                            background: 'linear-gradient(145deg, #FFFFFF, #F8F9FA)',
                            border: '2px solid transparent',
                            borderRadius: '16px',
                            p: 2.5,
                            textAlign: 'center',
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
                                background: 'linear-gradient(45deg, #1976D2, #D32F2F, #F57C00)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                maskComposite: 'xor',
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                            },
                        }}
                    >
                        <Security sx={{ color: '#1976D2', mb: 1, fontSize: '2rem', position: 'relative', zIndex: 1 }} />
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#1976D2',
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 700,
                                display: 'block',
                                letterSpacing: '0.5px',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Secure Connection
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#757575',
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Encrypted & Protected
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Drawer>
    )
}

export default Sidebar
