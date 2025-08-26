"use client"
import { useState, useEffect } from "react"
import styles from "./messaging.module.css"

export default function ReadReceipt({ message, isOwn, conversationId }) {
  const [readStatus, setReadStatus] = useState('sent')
  const [readTime, setReadTime] = useState(null)

  useEffect(() => {
    if (!message || !isOwn || !conversationId) return

    // Check if message has been read
    checkReadStatus()
  }, [message, isOwn, conversationId])

  const checkReadStatus = async () => {
    try {
      const response = await fetch(`/api/friend-messages/${message.id}/read-status`)
      if (response.ok) {
        const data = await response.json()
        if (data.isRead) {
          setReadStatus('read')
          setReadTime(data.readAt)
        }
      }
    } catch (error) {
      console.error('Failed to check read status:', error)
    }
  }

  if (!isOwn) return null

  return (
    <div className={styles.readReceipt}>
      {readStatus === 'sent' && (
        <span className={styles.sentIcon} title="Sent">✓</span>
      )}
      {readStatus === 'read' && (
        <span className={styles.readIcon} title={`Read at ${readTime ? new Date(readTime).toLocaleTimeString() : ''}`}>
          ✓✓
        </span>
      )}
    </div>
  )
}
