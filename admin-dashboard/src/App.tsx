import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import ServicesPage from '@/pages/ServicesPage'
import MessagesPage from '@/pages/MessagesPage'
import ApiKeysPage from '@/pages/ApiKeysPage'
import SettingsPage from '@/pages/SettingsPage'
import AnticLoader from '@/components/AnticLoader'
import anticTheme from '@/theme'

function App() {
    return (
        <ThemeProvider theme={anticTheme}>
            <CssBaseline />
            <AuthProvider>
                <SocketProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="services" element={<ServicesPage />} />
                            <Route path="messages" element={<MessagesPage />} />
                            <Route path="api-keys" element={<ApiKeysPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </SocketProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App
