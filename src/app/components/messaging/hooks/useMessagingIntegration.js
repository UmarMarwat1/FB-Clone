"use client"
import { useState, useCallback } from "react"
import { useMessaging } from "../../../context/MessagingContext"
import { getCurrentSession } from "../../../../../lib/supabaseCLient"

export function useMessagingIntegration() {
  const [activeConversation, setActiveConversation] = useState(null)
  const [isMessagingOpen, setIsMessagingOpen] = useState(false)
  const { subscribeToConversation, unsubscribeFromConversation } = useMessaging()

  const startChatWithFriend = useCallback(async (friendUser) => {
    try {
      const session = await getCurrentSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Create or get existing conversation
      const response = await fetch('/api/friend-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user1Id: session.user.id,
          user2Id: friendUser.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const conversation = await response.json()
      setActiveConversation(conversation)
      setIsMessagingOpen(true)
      
      return conversation
    } catch (error) {
      console.error('Error starting chat with friend:', error)
      throw error
    }
  }, [])

  const closeMessaging = useCallback(() => {
    setIsMessagingOpen(false)
    setActiveConversation(null)
  }, [])

  const sendQuickMessage = useCallback(async (friendUser, message) => {
    try {
      const session = await getCurrentSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // First ensure we have a conversation
      let conversation = activeConversation
      if (!conversation) {
        conversation = await startChatWithFriend(friendUser)
      }

      // Send the message
      const response = await fetch('/api/friend-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: session.user.id,
          messageType: 'text',
          content: message
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      return await response.json()
    } catch (error) {
      console.error('Error sending quick message:', error)
      throw error
    }
  }, [activeConversation, startChatWithFriend])

  const getUnreadCountForFriend = useCallback(async (friendUserId) => {
    try {
      const session = await getCurrentSession()
      if (!session?.user) return 0

      const response = await fetch(`/api/friends/messages?userId=${session.user.id}`)
      if (!response.ok) return 0
      
      const unreadData = await response.json()
      const friendUnread = unreadData.find(item => item.friend?.id === friendUserId)
      return friendUnread?.unreadCount || 0
    } catch (error) {
      console.error('Error getting unread count for friend:', error)
      return 0
    }
  }, [])

  return {
    activeConversation,
    isMessagingOpen,
    startChatWithFriend,
    closeMessaging,
    sendQuickMessage,
    getUnreadCountForFriend,
    openMessaging: useCallback(() => setIsMessagingOpen(true), [])
  }
}
