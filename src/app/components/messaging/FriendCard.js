"use client"
import { useState } from "react"
import styles from "./messaging.module.css"

export default function FriendCard({ friendship, currentUser, onStartChat, onRemoveFriend }) {
  const [showActions, setShowActions] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const getFriendUser = () => {
    return friendship.user1_id === currentUser?.id ? friendship.user2 : friendship.user1
  }

  const getFriendAvatar = (user) => {
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt={user.full_name || user.username} />
    }
    return <span>{user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}</span>
  }

  const handleRemoveFriend = async () => {
    if (!confirm("Are you sure you want to remove this friend?")) return
    
    setIsRemoving(true)
    try {
      await onRemoveFriend(friendship.id)
    } catch (error) {
      console.error('Failed to remove friend:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  const friendUser = getFriendUser()

  return (
    <div 
      className={styles.friendCard}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={styles.friendInfo}>
        <div className={styles.friendAvatar}>
          {getFriendAvatar(friendUser)}
        </div>
        <div className={styles.friendDetails}>
          <h3>{friendUser.full_name || friendUser.username}</h3>
          <p>Friends since {new Date(friendship.created_at).toLocaleDateString()}</p>
          {friendUser.username && friendUser.full_name && (
            <p className={styles.username}>@{friendUser.username}</p>
          )}
        </div>
      </div>
      
      <div className={styles.friendActions}>
        <button
          className={styles.messageBtn}
          onClick={() => onStartChat(friendUser)}
          title="Send message"
        >
          💬 Message
        </button>
        
        <button
          className={styles.removeFriendBtn}
          onClick={handleRemoveFriend}
          disabled={isRemoving}
          title="Remove friend"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  )
}
