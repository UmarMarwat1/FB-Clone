"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { getCurrentSession } from "../../../../lib/supabaseCLient"
import FriendConversationList from "./FriendConversationList"
import FriendChatWindow from "./FriendChatWindow"
import styles from "./messaging.module.css"

export default function FriendMessaging({ user, onClose, onUnreadCountChange }) {
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const messagingRef = useRef(null)
  const mountedRef = useRef(false)
  const userRef = useRef(null)
  const conversationsLoadedRef = useRef(false)

  // Add debugging to track component lifecycle
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    
    console.log('FriendMessaging mounted')
    return () => {
      console.log('FriendMessaging unmounting - this should not happen unexpectedly')
      mountedRef.current = false
    }
  }, [])

  // Debug when user prop changes
  useEffect(() => {
    if (user?.id !== userRef.current?.id) {
      console.log('FriendMessaging user prop changed:', user?.id)
      userRef.current = user
      // Reset conversations loaded flag for new user
      conversationsLoadedRef.current = false
      setConversations([])
      setCurrentConversation(null)
    }
  }, [user?.id])

  // Debug when onClose is called
  const handleClose = useCallback(() => {
    console.log('FriendMessaging onClose called - this should only happen when user clicks close button')
    if (typeof onClose === 'function') {
      onClose()
    }
  }, [onClose])

  // Memoize loadConversations to prevent unnecessary re-renders
  const loadConversations = useCallback(async () => {
    if (!userRef.current?.id) return
    
    // Prevent reloading if conversations are already loaded
    if (conversationsLoadedRef.current) {
      console.log('Conversations already loaded, skipping reload')
      return
    }
    
    try {
      setLoading(true)
      const session = await getCurrentSession()
      
      const response = await fetch(`/api/friend-conversations?userId=${userRef.current.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
        conversationsLoadedRef.current = true
        console.log('Conversations loaded successfully, count:', data.length)
      } else {
        console.error("Failed to load conversations")
        setConversations([])
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, []) // Remove user?.id dependency to prevent recreation

  // Only load conversations when user changes, not on every render
  useEffect(() => {
    if (user?.id && mountedRef.current && !conversationsLoadedRef.current) {
      console.log('Loading conversations for user:', user.id)
      loadConversations()
    }
  }, [user?.id]) // Remove loadConversations dependency

  // Debug when conversations change
  useEffect(() => {
    console.log('Conversations updated, count:', conversations.length)
  }, [conversations.length])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth <= 768) {
        setShowSidebar(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent body scroll when messaging is open on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('messaging-open')
    } else {
      document.body.classList.remove('messaging-open')
    }

    return () => {
      document.body.classList.remove('messaging-open')
    }
  }, [isMobile])

  const selectConversation = useCallback((conversation) => {
    setCurrentConversation(conversation)
    if (isMobile) {
      setShowSidebar(false)
    }
  }, [isMobile])

  const createNewConversation = useCallback(async (friendId) => {
    if (!userRef.current?.id || !friendId) return
    
    try {
      const session = await getCurrentSession()
      
      const response = await fetch('/api/friend-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          user1Id: userRef.current.id,
          user2Id: friendId
        })
      })
      
      if (response.ok) {
        const newConversation = await response.json()
        setConversations(prev => [newConversation, ...prev])
        setCurrentConversation(newConversation)
        if (isMobile) {
          setShowSidebar(false)
        }
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }, [isMobile]) // Remove user?.id dependency

  const deleteConversation = useCallback(async (conversationId) => {
    try {
      const session = await getCurrentSession()
      
      const response = await fetch(`/api/friend-conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }, [currentConversation?.id])

  // Optimize message sent handler to only update the specific conversation
  const handleMessageSent = useCallback((messageData) => {
    // Update only the current conversation's last message instead of reloading all
    if (currentConversation && messageData) {
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversation.id 
          ? {
              ...conv,
              lastMessage: messageData,
              last_message_at: messageData.created_at
            }
          : conv
      ))
    }
    
    // Update unread count - only call if function exists and is stable
    if (typeof onUnreadCountChange === 'function') {
      onUnreadCountChange()
    }
  }, [currentConversation?.id]) // Remove onUnreadCountChange dependency to prevent recreation

  // Debug when currentConversation changes
  useEffect(() => {
    console.log('Current conversation changed:', currentConversation?.id)
  }, [currentConversation?.id])

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      console.log('Backdrop clicked - closing messaging')
      // Only close if this is a floating component, not a page component
      if (typeof onClose === 'function') {
        handleClose()
      }
    }
  }, [handleClose, onClose])

  if (!user) return null

  return (
    <>
      {isMobile && typeof onClose === 'function' && (
        <div 
          className={styles.mobileBackdrop}
          onClick={handleBackdropClick}
        />
      )}
      
      <div 
        className={`${styles.messagingWindow} ${typeof onClose === 'function' ? '' : styles.pageMode}`}
        ref={messagingRef}
      >
        <div className={styles.messagingHeader}>
          <button 
            className={styles.sidebarToggle}
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle Sidebar"
          >
            ☰
          </button>
          <h3>Friend Messages</h3>
          <button 
            onClick={handleClose}
            title={typeof onClose === 'function' ? 'Close Messages' : 'Back to Feed'}
            className={styles.closeButton}
          >
            {typeof onClose === 'function' ? '✕' : '← Back'}
          </button>
        </div>
        
        <div className={styles.messagingContent}>
          {isMobile && showSidebar && (
            <div 
              className={styles.sidebarBackdrop} 
              onClick={() => {
                console.log('Mobile sidebar backdrop clicked - hiding sidebar')
                setShowSidebar(false)
              }} 
            />
          )}
          
          {showSidebar && (
            <div className={`${styles.sidebar} ${isMobile && showSidebar ? styles.show : ''}`}>
              <FriendConversationList 
                conversations={conversations}
                loading={loading}
                currentConversation={currentConversation}
                onSelectConversation={selectConversation}
                onCreateConversation={createNewConversation}
                onDeleteConversation={deleteConversation}
                onRefresh={loadConversations}
              />
            </div>
          )}
          
          <div className={styles.chatArea}>
            {!currentConversation ? (
              <div className={styles.welcomeMessage}>
                <h4>Welcome to Friend Messages!</h4>
                <p>Select a conversation or start a new one to begin messaging.</p>
                <div className={styles.welcomeActions}>
                  <p>💬 Chat with your friends</p>
                  <p>📷 Share photos and videos</p>
                  <p>🎵 Send voice messages</p>
                </div>
              </div>
            ) : (
              <FriendChatWindow 
                conversation={currentConversation}
                user={user}
                onMessageSent={handleMessageSent}
                onBack={() => {
                  setCurrentConversation(null)
                  if (isMobile) {
                    setShowSidebar(true)
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
