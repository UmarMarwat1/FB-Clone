"use client"
import { useState } from "react"
import MediaMessage from "./MediaMessage"
import ReadReceipt from "./ReadReceipt"
import styles from "./messaging.module.css"

export default function MessageBubble({ message, isOwn, onDelete, conversationId }) {
  const [showActions, setShowActions] = useState(false)

  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getAvatar = (user) => {
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt={user.full_name || user.username} />
    }
    return <span>{user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}</span>
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete()
    }
  }

  const toggleActions = () => {
    setShowActions(!showActions)
  }

  return (
    <div 
      className={`${styles.messageBubble} ${isOwn ? styles.own : styles.other}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && (
        <div className={styles.messageAvatar}>
          {getAvatar(message.sender)}
        </div>
      )}
      
      <div className={styles.messageContent}>
        {!isOwn && (
          <div className={styles.messageSender}>
            {message.sender?.full_name || message.sender?.username || 'Unknown User'}
          </div>
        )}
        
        <div className={styles.messageBody}>
          {message.message_type === 'text' && message.content && (
            <div className={styles.textMessage}>
              {message.content}
            </div>
          )}
          
          {message.message_type !== 'text' && (
            <MediaMessage 
              message={message}
              isOwn={isOwn}
            />
          )}
        </div>
        
        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>
            {formatTime(message.created_at)}
          </span>
          
          {isOwn && (
            <ReadReceipt 
              message={message} 
              isOwn={isOwn} 
              conversationId={conversationId}
            />
          )}
          
          {isOwn && (
            <div className={styles.messageActions}>
              <button
                onClick={handleDelete}
                className={styles.deleteMessageBtn}
                title="Delete message"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
