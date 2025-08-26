"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { usePathname } from "next/navigation"
import { supabase, getCurrentSession } from "../../../../lib/supabaseCLient"
import { useMessaging } from "../../context/MessagingContext"
import FriendMessaging from "./FriendMessaging"
import MessageTesting from "./MessageTesting"
import styles from "./messaging.module.css"

export default function FriendMessagingWrapper() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showTesting, setShowTesting] = useState(false)
  const pathname = usePathname()
  
  // Define shouldHideMessaging early so useEffect hooks can use it
  const shouldHideMessaging = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/messages' || pathname === '/feed' || pathname.startsWith('/profile') || pathname.startsWith('/friends') || pathname.startsWith('/reels')
  
  // Debug pathname matching
  console.log('FriendMessagingWrapper - Current pathname:', pathname, 'shouldHideMessaging:', shouldHideMessaging)
  
  // Use refs to prevent unnecessary re-renders
  const userRef = useRef(null)
  const isOpenRef = useRef(false)
  const intervalRef = useRef(null)
  const mountedRef = useRef(false)
  
  const { connectionStatus, isConnected, isError, isFallback } = useMessaging()

  // Memoize context values to prevent unnecessary re-renders
  const memoizedContextValues = useMemo(() => ({
    connectionStatus,
    isConnected,
    isError,
    isFallback
  }), [connectionStatus, isConnected, isError, isFallback])

  // Memoize loadUnreadCount to prevent recreation on every render
  const loadUnreadCount = useCallback(async () => {
    if (!userRef.current?.id) return
    
    try {
      const session = await getCurrentSession()
      const response = await fetch(`/api/friends/messages?userId=${userRef.current.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const totalUnread = data.reduce((sum, item) => sum + item.unreadCount, 0)
        setUnreadCount(totalUnread)
      }
    } catch (error) {
      console.error("Error loading unread count:", error)
    }
  }, [])

  // Memoize getUser to prevent recreation
  const getUser = useCallback(async () => {
    try {
      const session = await getCurrentSession()
      const currentUser = session?.user || null
      userRef.current = currentUser
      setUser(currentUser)
    } catch (error) {
      console.error("Error getting user:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize toggle functions to prevent recreation
  const toggleMessaging = useCallback(() => {
    const newState = !isOpenRef.current
    isOpenRef.current = newState
    setIsOpen(newState)
  }, [])

  const toggleTesting = useCallback(() => {
    setShowTesting(prev => !prev)
  }, [])

  const closeMessaging = useCallback(() => {
    isOpenRef.current = false
    setIsOpen(false)
  }, [])

  const closeTesting = useCallback(() => {
    setShowTesting(false)
  }, [])

  // Only run once on mount
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    
    getUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change event:', event, 'session user ID:', session?.user?.id, 'current user ID:', userRef.current?.id)
        
        // Only update if user actually changed to prevent unnecessary re-renders
        if (session?.user?.id !== userRef.current?.id) {
          console.log('User changed, updating state')
          const currentUser = session?.user || null
          userRef.current = currentUser
          setUser(currentUser)
        } else {
          console.log('User unchanged, not updating state')
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [shouldHideMessaging]) // Add shouldHideMessaging dependency

  useEffect(() => {
    // Don't make API calls if messaging should be hidden on this page
    if (shouldHideMessaging) {
      console.log('FriendMessagingWrapper - Skipping API calls due to pathname:', pathname)
      return
    }
    
    if (user?.id) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      loadUnreadCount()
      // Set up interval to check for new messages
      intervalRef.current = setInterval(loadUnreadCount, 30000) // Check every 30 seconds
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [user?.id, loadUnreadCount, shouldHideMessaging])

  // Update refs when state changes
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // Debug pathname changes
  useEffect(() => {
    console.log('FriendMessagingWrapper pathname changed:', pathname)
  }, [pathname])

  // Debug when messaging state changes
  useEffect(() => {
    console.log('FriendMessagingWrapper messaging state changed - isOpen:', isOpen)
  }, [isOpen])

  // Memoize the user object to prevent unnecessary re-renders
  const memoizedUser = useMemo(() => user, [user?.id])

  if (loading) return null

  // Don't show messaging on login, signup, main page, messages page, feed page, profile page, friends page, or reels page
  if (shouldHideMessaging) {
    console.log('FriendMessagingWrapper - Hiding messaging due to pathname:', pathname)
    console.log('FriendMessagingWrapper - Component will not render on this page')
    return null
  }

  // Only show messaging if user is logged in
  if (!user) {
    console.log('Hiding messaging due to no user')
    return null
  }

  return (
    <>
      {/* Connection Status Indicator */}
      {!memoizedContextValues.isConnected && (
        <div className={`${styles.connectionStatus} ${styles[memoizedContextValues.connectionStatus]}`}>
          {memoizedContextValues.connectionStatus === 'error' && 'Connection Error'}
          {memoizedContextValues.connectionStatus === 'fallback' && 'Using Polling Mode'}
          {memoizedContextValues.connectionStatus === 'disconnected' && 'Connecting...'}
        </div>
      )}
      
      <div className={styles.messagingButtons}>
        <button 
          className={`${styles.messagingButton} ${unreadCount > 0 ? styles.hasUnread : ''}`}
          onClick={toggleMessaging}
          title="Open Friend Messages"
        >
          💬 Messages
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        <button
          className={styles.testingButton}
          onClick={toggleTesting}
          title="Test Message System"
        >
          🧪 Test
        </button>
      </div>

      {isOpen && (
        <FriendMessaging 
          key={`messaging-${user.id}`} // Add key to prevent unmounting
          user={memoizedUser} 
          onClose={closeMessaging}
          onUnreadCountChange={loadUnreadCount}
        />
      )}
      
      {showTesting && (
        <MessageTesting onClose={closeTesting} />
      )}
    </>
  )
}
