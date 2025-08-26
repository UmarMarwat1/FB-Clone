"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { getCurrentSession } from "../../../../lib/supabaseCLient"
import { useMessaging } from "../../context/MessagingContext"
import MessageInput from "./MessageInput"
import MessageBubble from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"
import styles from "./messaging.module.css"

export default function FriendChatWindow({ conversation, user, onMessageSent, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const messagesEndRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const isLoadingRef = useRef(false)
  
  const { subscribeToConversation, unsubscribeFromConversation, isConnected } = useMessaging()

  // Define all functions first before using them in useEffect
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Mark a single message as read - define this first
  const markMessageAsRead = useCallback(async (messageId) => {
    if (!messageId || !user?.id) return
    
    try {
      const session = await getCurrentSession()
      if (!session?.access_token) return
      
      const response = await fetch(`/api/friend-messages/${messageId}/read-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        console.log(`Marked message ${messageId} as read`)
      } else {
        console.warn(`Failed to mark message ${messageId} as read`)
      }
    } catch (error) {
      console.error(`Error marking message ${messageId} as read:`, error)
    }
  }, [user?.id])

  const handleMessageUpdate = useCallback((newMessage) => {
    if (newMessage.type === 'DELETE') {
      // Handle message deletion
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id))
    } else {
      // Handle new message
      setMessages(prev => [...prev, newMessage])
      
      // If this is a new message from someone else, mark it as read immediately
      if (newMessage.sender_id !== user?.id) {
        // Small delay to ensure the message is added to state first
        setTimeout(() => {
          markMessageAsRead(newMessage.id)
        }, 100)
      }
      
      // Pass the message data to parent for conversation update
      onMessageSent(newMessage)
    }
  }, [onMessageSent, user?.id, markMessageAsRead])

  const handleTypingStart = useCallback(() => {
    // Send typing indicator to other user
    // This would typically be implemented with a separate API endpoint
    setIsTyping(true)
  }, [])

  const handleTypingStop = useCallback(() => {
    setIsTyping(false)
  }, [])

  const loadMessages = useCallback(async () => {
    if (!conversation?.id || isLoadingRef.current) return // Use ref to prevent multiple calls
    
    try {
      isLoadingRef.current = true
      setLoading(true)
      const session = await getCurrentSession()
      
      console.log('Loading messages for conversation:', conversation.id)
      console.log('Session:', session)
      
      if (!session?.access_token) {
        console.error('No access token available')
        setMessages([])
        return
      }
      
      const response = await fetch(`/api/friend-messages?conversationId=${conversation.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Messages loaded:', data)
        console.log('Number of messages:', data.length)
        setMessages(data)
      } else {
        console.error("Failed to load messages:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("Error response:", errorText)
        setMessages([])
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [conversation?.id])

  // Mark messages as read when conversation is opened
  const markMessagesAsRead = useCallback(async () => {
    if (!conversation?.id || !user?.id || messages.length === 0) return
    
    try {
      const session = await getCurrentSession()
      if (!session?.access_token) return
      
      // Get unread messages (messages not sent by current user)
      const unreadMessages = messages.filter(msg => msg.sender_id !== user.id)
      
      if (unreadMessages.length === 0) return
      
      console.log(`Marking ${unreadMessages.length} messages as read`)
      
      // Mark each unread message as read
      const markPromises = unreadMessages.map(async (message) => {
        try {
          const response = await fetch(`/api/friend-messages/${message.id}/read-status`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            console.log(`Marked message ${message.id} as read`)
            return true
          } else {
            console.warn(`Failed to mark message ${message.id} as read`)
            return false
          }
        } catch (error) {
          console.error(`Error marking message ${message.id} as read:`, error)
          return false
        }
      })
      
      const results = await Promise.allSettled(markPromises)
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length
      console.log(`Successfully marked ${successCount}/${unreadMessages.length} messages as read`)
      
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [conversation?.id, user?.id, messages])

  // Now define useEffect hooks after all functions are defined
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (conversation?.id && isConnected) {
      console.log('Setting up conversation:', conversation.id)
      console.log('Conversation object:', conversation)
      loadMessages()
      
      // Subscribe to real-time updates
      const subscription = subscribeToConversation(conversation.id, handleMessageUpdate)
      
      // Cleanup subscription on unmount or conversation change
      return () => {
        console.log('Cleaning up conversation:', conversation.id)
        if (subscription) {
          unsubscribeFromConversation(conversation.id)
        }
      }
    }
  }, [conversation?.id, isConnected]) // Remove problematic dependencies

  // Mark messages as read when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Small delay to ensure messages are rendered
      const timer = setTimeout(() => {
        markMessagesAsRead()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [messages, loading, markMessagesAsRead])

  useEffect(() => {
    scrollToBottom()
  }, [messages]) // Remove scrollToBottom dependency

  const handleSendMessage = useCallback(async (messageData) => {
    if (!conversation?.id || !user?.id) return
    
    try {
      setSending(true)
      const session = await getCurrentSession()
      
      let response
      let newMessage
      
      if (messageData.type === 'text') {
        response = await fetch('/api/friend-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            senderId: user.id,
            messageType: 'text',
            content: messageData.content
          })
        })
        
        if (response.ok) {
          newMessage = await response.json()
        }
      } else {
        // Handle media upload with enhanced data
        const formData = new FormData()
        formData.append('file', messageData.file)
        formData.append('conversationId', conversation.id)
        formData.append('senderId', user.id)
        formData.append('messageType', messageData.type)
        
        // Add thumbnail if available
        if (messageData.thumbnail) {
          formData.append('thumbnail', messageData.thumbnail)
        }
        
        // Add duration if available
        if (messageData.duration) {
          formData.append('duration', messageData.duration.toString())
        }
        
        // Add size if available
        if (messageData.size) {
          formData.append('size', messageData.size.toString())
        }
        
        response = await fetch('/api/friend-messages/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: formData
        })
        
        if (response.ok) {
          newMessage = await response.json()
        }
      }
      
      if (response.ok && newMessage) {
        // Add the new message to the local state
        setMessages(prev => [...prev, newMessage])
        
        // Call onMessageSent with the message data for conversation update
        onMessageSent(newMessage)
        
        console.log('Message sent successfully:', newMessage)
      } else {
        const errorData = await response.json()
        console.error("Failed to send message:", errorData.error)
        alert(`Failed to send message: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      setSending(false)
    }
  }, [conversation?.id, user?.id, onMessageSent])

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!confirm("Are you sure you want to delete this message?")) return
    
    try {
      const session = await getCurrentSession()
      
      const response = await fetch(`/api/friend-messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
      } else {
        console.error("Failed to delete message")
        alert("Failed to delete message")
      }
    } catch (error) {
      console.error("Error deleting message:", error)
      alert("Failed to delete message")
    }
  }, [])

  const getAvatar = useCallback((user) => {
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt={user.full_name || user.username} />
    }
    return <span>{user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}</span>
  }, [])

  if (!conversation) return null

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        {isMobile && (
          <button 
            onClick={onBack}
            className={styles.backButton}
            title="Back to conversations"
          >
            ←
          </button>
        )}
        
        <div className={styles.chatUserInfo}>
          <div className={styles.chatUserAvatar}>
            {getAvatar(conversation.otherUser)}
          </div>
          <div className={styles.chatUserDetails}>
            <h4>{conversation.otherUser.full_name || conversation.otherUser.username}</h4>
            <span className={styles.chatStatus}>Online</span>
          </div>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {loading ? (
          <div className={styles.loading}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet</p>
            <p>Start the conversation!</p>
          </div>
        ) : (
                      <div className={styles.messages}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === user.id}
                  onDelete={() => handleDeleteMessage(message.id)}
                  conversationId={conversation.id}
                />
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <TypingIndicator 
                  isVisible={isTyping} 
                  user={conversation.otherUser}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={sending}
        placeholder={`Message ${conversation.otherUser.full_name || conversation.otherUser.username}...`}
      />
    </div>
  )
}
