"use client"
import { formatDistanceToNow } from 'date-fns'
import styles from "./notificationItem.module.css"

export default function NotificationItem({ notification, onClick }) {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return '👥'
      case 'friend_request_accepted':
        return '✅'
      case 'new_follower':
        return '👤'
      case 'friend_post':
        return '📝'
      case 'friend_reel':
        return '📺'
      case 'new_message':
        return '💬'
      case 'birthday_reminder':
        return '🎂'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'friend_request':
        return styles.friendRequest
      case 'friend_request_accepted':
        return styles.accepted
      case 'new_follower':
        return styles.follower
      case 'friend_post':
        return styles.post
      case 'friend_reel':
        return styles.reel
      case 'new_message':
        return styles.message
      case 'birthday_reminder':
        return styles.birthday
      default:
        return styles.default
    }
  }

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return 'Just now'
    }
  }

  return (
    <div 
      className={`${styles.notificationItem} ${getNotificationColor(notification.notification_type)} ${!notification.is_read ? styles.unread : ''}`}
      onClick={onClick}
    >
      <div className={styles.notificationIcon}>
        {getNotificationIcon(notification.notification_type)}
      </div>
      
      <div className={styles.notificationContent}>
        <div className={styles.notificationHeader}>
          <span className={styles.notificationTitle}>
            {notification.title}
          </span>
          <span className={styles.notificationTime}>
            {formatTime(notification.created_at)}
          </span>
        </div>
        
        <div className={styles.notificationMessage}>
          {notification.message}
        </div>
        
        {notification.sender && (
          <div className={styles.senderInfo}>
            <span className={styles.senderName}>
              {notification.sender.full_name || notification.sender.username}
            </span>
          </div>
        )}
      </div>
      
      {!notification.is_read && (
        <div className={styles.unreadIndicator}></div>
      )}
    </div>
  )
}
