"use client"
import { useRouter } from "next/navigation"
import { useNotifications } from "../context/NotificationContext"
import NotificationItem from "./NotificationItem"
import styles from "./notificationDropdown.module.css"
import { useEffect } from "react"

export default function NotificationDropdown({ onClose }) {
  const { notifications, markAsRead, markAllAsRead, isLoading, refreshNotifications } = useNotifications()
  const router = useRouter()

  // Debug: Log notifications when they change
  useEffect(() => {
    console.log('NotificationDropdown - notifications updated:', notifications)
    console.log('NotificationDropdown - notifications length:', notifications?.length)
    console.log('NotificationDropdown - isLoading:', isLoading)
  }, [notifications, isLoading])

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    await markAsRead(notification.id)
    
    // Navigate based on notification type
    switch (notification.notification_type) {
      case 'friend_request':
        router.push('/friends')
        break
      case 'friend_request_accepted':
        router.push('/friends')
        break
      case 'new_follower':
        router.push(`/profile/${notification.sender?.username}`)
        break
      case 'friend_post':
        router.push(`/feed?post=${notification.related_id}`)
        break
      case 'friend_reel':
        router.push(`/reels/${notification.related_id}`)
        break
      case 'new_message':
        router.push('/messages')
        break
      case 'birthday_reminder':
        router.push(`/profile/${notification.sender?.username}`)
        break
      default:
        router.push('/feed')
    }
    
    onClose()
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  if (isLoading) {
    return (
      <div className={styles.dropdown}>
        <div className={styles.header}>
          <h3>Notifications</h3>
        </div>
        <div className={styles.loading}>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <h3>Notifications</h3>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshButton}
            onClick={refreshNotifications}
            disabled={isLoading}
            title="Refresh notifications"
          >
            🔄
          </button>
          {notifications.length > 0 && (
            <button 
              className={styles.markAllRead}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.notificationsList}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No notifications yet</span>
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))
        )}
      </div>
      
      {notifications.length > 10 && (
        <div className={styles.footer}>
          <button 
            className={styles.viewAll}
            onClick={() => {
              router.push('/notifications')
              onClose()
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
