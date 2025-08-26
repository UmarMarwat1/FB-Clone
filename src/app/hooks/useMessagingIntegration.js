"use client"
import { useState, useCallback } from "react"
import { useMessaging } from "../context/MessagingContext"

export function useMessagingIntegration() {
  const [activeConversation, setActiveConversation] = useState(null)
  const [isMessagingOpen, setIsMessagingOpen] = useState(false)
  const { subscribeToConversation, unsubscribeFromConversation } = useMessaging()

  // Start a chat with a friend
  const startChatWithFriend = useCallback(async (friendUser) => {
    try {
      // Check if conversation already exists
      const response = await fetch('/api/friend-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('../../../lib/supabaseCLient')).getCurrentSession()?.access_token}`
        },
        body: JSON.stringify({
          user1Id: friendUser.id,
          user2Id: (await import('../../../lib/supabaseCLient')).getCurrentSession()?.user?.id
        })
      })

      if (response.ok) {
        const conversation = await response.json()
        setActiveConversation(conversation)
        setIsMessagingOpen(true)
        
        // Subscribe to real-time updates for this conversation
        if (subscribeToConversation) {
          subscribeToConversation(conversation.id, (messageUpdate) => {
            // Handle real-time message updates
            console.log('Real-time message update:', messageUpdate)
          })
        }
      } else {
        console.error('Failed to create conversation')
      }
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }, [subscribeToConversation])

  // Close messaging
  const closeMessaging = useCallback(() => {
    setIsMessagingOpen(false)
    setActiveConversation(null)
    
    // Unsubscribe from conversation updates
    if (activeConversation && unsubscribeFromConversation) {
      unsubscribeFromConversation(activeConversation.id)
    }
  }, [activeConversation, unsubscribeFromConversation])

  // Send a quick message to a friend
  const sendQuickMessage = useCallback(async (friendUser, message) => {
    try {
      // First ensure conversation exists
      const conversationResponse = await fetch('/api/friend-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('../../../lib/supabaseCLient')).getCurrentSession()?.access_token}`
        },
        body: JSON.stringify({
          user1Id: friendUser.id,
          user2Id: (await import('../../../lib/supabaseCLient')).getCurrentSession()?.user?.id
        })
      })

      if (conversationResponse.ok) {
        const conversation = await conversationResponse.json()
        
        // Send the message
        const messageResponse = await fetch('/api/friend-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await import('../../../lib/supabaseCLient')).getCurrentSession()?.access_token}`
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            senderId: (await import('../../../lib/supabaseCLient')).getCurrentSession()?.user?.id,
            messageType: 'text',
            content: message
          })
        })

        if (messageResponse.ok) {
          return { success: true, conversation }
        } else {
          throw new Error('Failed to send message')
        }
      } else {
        throw new Error('Failed to create conversation')
      }
    } catch (error) {
      console.error('Error sending quick message:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Get unread message count for a specific friend
  const getUnreadCountForFriend = useCallback(async (friendUserId) => {
    try {
      const response = await fetch(`/api/friends/messages?userId=${friendUserId}`, {
        headers: {
          'Authorization': `Bearer ${(await import('../../../lib/supabaseCLient')).getCurrentSession()?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const friendConversation = data.find(item => 
          item.friend.id === friendUserId
        )
        return friendConversation?.unreadCount || 0
      }
      return 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }, [])

  return {
    // State
    activeConversation,
    isMessagingOpen,
    
    // Actions
    startChatWithFriend,
    closeMessaging,
    sendQuickMessage,
    getUnreadCountForFriend,
    
    // Utilities
    openMessaging: () => setIsMessagingOpen(true)
  }
}
