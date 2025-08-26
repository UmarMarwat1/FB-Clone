"use client"
import { useRouter } from "next/navigation"
import { useNotifications } from "../context/NotificationContext"
import NotificationItem from "../components/NotificationItem"
import styles from "./notifications.module.css"

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, isLoading, refreshNotifications } = useNotifications()
  const router = useRouter()

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
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleBackToFeed = () => {
    router.push('/feed')
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBackToFeed} className={styles.backButton}>
            ← Back to Feed
          </button>
          <h1>Notifications</h1>
          <button 
            onClick={refreshNotifications}
            disabled={isLoading}
            className={styles.refreshButton}
            title="Refresh notifications"
          >
            🔄
          </button>
        </div>
        <div className={styles.loading}>
          <span>Loading notifications...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBackToFeed} className={styles.backButton}>
          ← Back to Feed
        </button>
        <h1>Notifications</h1>
        <div className={styles.headerActions}>
          <button 
            onClick={refreshNotifications}
            disabled={isLoading}
            className={styles.refreshButton}
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
      
      <div className={styles.content}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <h2>No notifications yet</h2>
            <p>When you receive notifications, they&apos;ll appear here.</p>
            <button onClick={handleBackToFeed} className={styles.backToFeedButton}>
              Go to Feed
            </button>
          </div>
        ) : (
          <div className={styles.notificationsList}>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
