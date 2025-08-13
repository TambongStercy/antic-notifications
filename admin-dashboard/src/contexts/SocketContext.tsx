import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import type { WebSocketEvents } from '@/types'

interface SocketContextType {
    socket: Socket | null
    isConnected: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
    const context = useContext(SocketContext)
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
}

interface SocketProviderProps {
    children: ReactNode
}

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3002'

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        // Initialize socket connection
        const socketInstance = io(WEBSOCKET_URL, {
            transports: ['websocket', 'polling'],
        })

        // Connection event handlers
        socketInstance.on('connect', () => {
            setIsConnected(true)
            console.log('✅ WebSocket connected')
        })

        socketInstance.on('disconnect', () => {
            setIsConnected(false)
            console.log('❌ WebSocket disconnected')
        })

        socketInstance.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error)
            toast.error('WebSocket connection failed')
        })

        // Application-specific event handlers
        socketInstance.on('qr-code', (data: WebSocketEvents['qr-code']) => {
            console.log('📱 New QR code received:', data.service)
            // QR code updates will be handled by individual components
        })

        socketInstance.on('service-status', (data: WebSocketEvents['service-status']) => {
            console.log('🔄 Service status update:', data)
            toast.success(`${data.service} status: ${data.status}`)
        })

        socketInstance.on('message-status', (data: WebSocketEvents['message-status']) => {
            console.log('📨 Message status update:', data)
            if (data.status === 'sent') {
                toast.success(`Message ${data.messageId} sent successfully`)
            } else if (data.status === 'failed') {
                toast.error(`Message ${data.messageId} failed`)
            }
        })

        setSocket(socketInstance)

        // Cleanup on unmount
        return () => {
            socketInstance.close()
            setSocket(null)
            setIsConnected(false)
        }
    }, [])

    const value: SocketContextType = {
        socket,
        isConnected,
    }

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
