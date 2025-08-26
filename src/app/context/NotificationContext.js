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

  // Real-time subscription to new notifications
  useEffect(() => {
    let subscription = null

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found for real-time subscription')
        return
      }

      console.log('Setting up real-time subscription for user:', user.id)

      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time notification received:', payload)
            console.log('New notification data:', payload.new)
            
            // Add the new notification to the beginning of the list
            setNotifications(prev => {
              const newList = [payload.new, ...prev]
              console.log('Updated notifications list:', newList)
              return newList
            })
            
            // Update unread count
            setUnreadCount(prev => {
              const newCount = prev + 1
              console.log('Updated unread count:', newCount)
              return newCount
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time notification update received:', payload)
            // Update existing notification
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            )
          }
        )
        .on('system', { event: 'disconnect' }, () => {
          console.log('Real-time connection lost, reconnecting...')
          setTimeout(() => setupSubscription(), 1000)
        })
        .subscribe()

      console.log('Real-time subscription setup complete')
    }

    setupSubscription()

    return () => {
      if (subscription) {
        console.log('Cleaning up real-time subscription')
        supabase.removeChannel(subscription)
      }
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
