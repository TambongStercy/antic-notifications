import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/services/api'
import type { User } from '@/types'

interface AuthContextType {
    user: User | null
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    isLoading: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('accessToken')
        if (token) {
            // You could verify the token here by calling an API endpoint
            // For now, we'll assume the token is valid if it exists
            setUser({
                id: '1',
                username: 'admin', // This should come from token or API
                role: 'admin'
            })
        }
        setIsLoading(false)
    }, [])

    const login = async (username: string, password: string): Promise<void> => {
        setIsLoading(true)
        try {
            const tokens = await authAPI.login(username, password)

            // Store tokens
            localStorage.setItem('accessToken', tokens.accessToken)
            localStorage.setItem('refreshToken', tokens.refreshToken)

            // Set user data
            setUser({
                id: '1', // This should come from the JWT token
                username,
                role: 'admin'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const logout = (): void => {
        authAPI.logout()
        setUser(null)
    }

    const value: AuthContextType = {
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
