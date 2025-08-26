"use client"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "../../../lib/supabaseCLient"

const MessagingContext = createContext()

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error("useMessaging must be used within a MessagingProvider")
  }
  return context
}

export function MessagingProvider({ children }) {
  const [subscriptions, setSubscriptions] = useState(new Map())
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const subscriptionsRef = useRef(new Map())

  // Initialize connection - simplified to avoid infinite loops
  useEffect(() => {
    // Set initial connection status without making database calls
    setConnectionStatus('connected')
  }, [])

  // Subscribe to real-time updates for a conversation
  const subscribeToConversation = useCallback(async (conversationId, onMessageUpdate) => {
    if (!conversationId) return null

    try {
      // Check if we already have a subscription using ref
      if (subscriptionsRef.current.has(conversationId)) {
        return true
      }

      // Check connection limit (free tier: 2 concurrent connections)
      if (subscriptionsRef.current.size >= 2) {
        console.warn('Reached Supabase free tier connection limit (2). Using polling fallback.')
        return false
      }

      // Create real-time subscription
      const subscription = supabase
        .channel(`conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            if (onMessageUpdate) {
              onMessageUpdate(payload.new)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friend_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            if (onMessageUpdate) {
              onMessageUpdate({ type: 'DELETE', id: payload.old.id })
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn(`Subscription error for conversation ${conversationId}:`, status)
          }
        })

      // Store subscription in ref to avoid re-renders
      subscriptionsRef.current.set(conversationId, subscription)
      
      // Update state only once to trigger re-render
      setSubscriptions(new Map(subscriptionsRef.current))

      return true
    } catch (error) {
      console.error('Failed to subscribe to conversation:', error)
      return null
    }
  }, [])

  // Unsubscribe from a conversation
  const unsubscribeFromConversation = useCallback(async (conversationId) => {
    if (!conversationId) return

    const subscription = subscriptionsRef.current.get(conversationId)
    if (subscription) {
      try {
        supabase.removeChannel(subscription)
        subscriptionsRef.current.delete(conversationId)
        // Update state only once
        setSubscriptions(new Map(subscriptionsRef.current))
      } catch (error) {
        console.error('Failed to unsubscribe from conversation:', error)
      }
    }
  }, [])

  // Subscribe to conversation updates (for last message changes)
  const subscribeToConversationUpdates = useCallback(async (onConversationUpdate) => {
    try {
      // Check connection limit using ref
      if (subscriptionsRef.current.size >= 2) {
        console.warn('Reached connection limit. Using polling fallback for conversation updates.')
        return false
      }

      const subscription = supabase
        .channel('conversation-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friend_conversations'
          },
          (payload) => {
            if (onConversationUpdate) {
              onConversationUpdate(payload.new)
            }
          }
        )
        .subscribe()

      subscriptionsRef.current.set('conversation-updates', subscription)
      setSubscriptions(new Map(subscriptionsRef.current))

      return true
    } catch (error) {
      console.error('Failed to subscribe to conversation updates:', error)
      return null
    }
  }, [])

  // Cleanup all subscriptions
  const cleanupSubscriptions = useCallback(async () => {
    try {
      for (const [key, subscription] of subscriptionsRef.current) {
        if (subscription) {
          try {
            supabase.removeChannel(subscription)
          } catch (error) {
            console.error('Failed to cleanup subscription:', error)
          }
        }
      }
      subscriptionsRef.current.clear()
      setSubscriptions(new Map())
    } catch (error) {
      console.error('Failed to cleanup subscriptions:', error)
    }
  }, [])

  // Cleanup on unmount - use ref to avoid dependency issues
  useEffect(() => {
    return () => {
      // Call cleanup directly to avoid dependency issues
      try {
        for (const [key, subscription] of subscriptionsRef.current) {
          if (subscription) {
            try {
              supabase.removeChannel(subscription)
            } catch (error) {
              console.error('Failed to cleanup subscription:', error)
            }
          }
        }
        subscriptionsRef.current.clear()
      } catch (error) {
        console.error('Failed to cleanup subscriptions:', error)
      }
    }
  }, []) // Remove cleanupSubscriptions dependency

  const value = {
    // Real-time subscription methods
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToConversationUpdates,
    
    // Connection status
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isError: connectionStatus === 'error',
    isFallback: connectionStatus === 'fallback',
    
    // Connection management
    cleanupSubscriptions,
    
    // Subscription info
    activeSubscriptions: subscriptionsRef.current.size,
    maxConnections: 2, // Free tier limit
  }

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  )
}
