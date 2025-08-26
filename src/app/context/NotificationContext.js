"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "../../../lib/supabaseCLient"

const NotificationContext = createContext()

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found, skipping notification fetch')
        return
      }

      console.log('Fetching notifications for user:', user.id)
      
      // First try with profiles join
      let { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles(id, username, full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // If profiles join fails, try without it
      if (error && error.message.includes('profiles')) {
        console.log('Profiles join failed, trying without join:', error.message)
        const { data: simpleData, error: simpleError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (simpleError) {
          throw simpleError
        }
        data = simpleData
      } else if (error) {
        throw error
      }
      
      console.log('Fetched notifications:', data)
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Set empty arrays on error to prevent UI issues
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [])



  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Periodic refresh to catch any missed notifications
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Periodic refresh triggered')
      fetchNotifications()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Add manual refresh function
  const refreshNotifications = useCallback(() => {
    console.log('Manual refresh requested')
    fetchNotifications()
  }, [fetchNotifications])



  const value = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
