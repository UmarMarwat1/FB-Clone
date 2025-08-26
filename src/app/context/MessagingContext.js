"use client"
import { createContext, useContext } from "react"

const MessagingContext = createContext()

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error("useMessaging must be used within a MessagingProvider")
  }
  return context
}

export function MessagingProvider({ children }) {
  // Real-time subscriptions disabled - using polling fallback
  const subscribeToConversation = async (conversationId, onMessageUpdate) => {
    console.log('Real-time subscriptions disabled - using polling fallback')
    return false
  }

  const unsubscribeFromConversation = async (conversationId) => {
    console.log('Real-time subscriptions disabled')
  }

  const subscribeToConversationUpdates = async (onConversationUpdate) => {
    console.log('Real-time subscriptions disabled - using polling fallback')
    return false
  }

  const cleanupSubscriptions = async () => {
    console.log('Real-time subscriptions disabled')
  }

  const value = {
    // Real-time subscription methods (disabled)
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToConversationUpdates,
    
    // Connection status (always fallback mode)
    connectionStatus: 'fallback',
    isConnected: false,
    isError: false,
    isFallback: true,
    
    // Connection management
    cleanupSubscriptions,
    
    // Subscription info
    activeSubscriptions: 0,
    maxConnections: 0,
  }

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  )
}