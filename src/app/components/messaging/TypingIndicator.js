"use client"
import { useState, useEffect } from "react"
import styles from "./messaging.module.css"

export default function TypingIndicator({ isVisible, user }) {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4)
    }, 500)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className={styles.typingIndicator}>
      <div className={styles.typingAvatar}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name || user.username} />
        ) : (
          <span>{user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}</span>
        )}
      </div>
      <div className={styles.typingContent}>
        <div className={styles.typingText}>
          {user?.full_name || user?.username || 'Someone'} is typing
        </div>
        <div className={styles.typingDots}>
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i < dots ? styles.active : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
