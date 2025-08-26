"use client"
import { useState, useEffect, useCallback } from "react"
import { getCurrentSession } from "../../../../lib/supabaseCLient"
import styles from "./messaging.module.css"

export default function FriendConversationList({ 
  conversations, 
  loading, 
  currentConversation, 
  onSelectConversation, 
  onCreateConversation,
  onDeleteConversation,
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Memoize search function to prevent unnecessary API calls
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const session = await getCurrentSession()
      
      const response = await fetch(`/api/friends?search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter out users who already have conversations
        const existingConversationUserIds = conversations.map(c => c.otherUser.id)
        const newFriends = data.filter(friend => !existingConversationUserIds.includes(friend.id))
        setSearchResults(newFriends)
      }
    } catch (error) {
      console.error("Search failed:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [searchTerm]) // Remove conversations dependency to prevent infinite loops

  const handleCreateConversation = useCallback((friendId) => {
    onCreateConversation(friendId)
    setSearchTerm("")
    setSearchResults([])
    setShowSearch(false)
  }, [onCreateConversation])

  const formatLastMessage = useCallback((message) => {
    if (!message) return "No messages yet"
    
    if (message.message_type === 'image') return "📷 Image"
    if (message.message_type === 'video') return "🎥 Video"
    if (message.message_type === 'audio') return "🎵 Audio"
    
    return message.content?.length > 30 
      ? `${message.content.substring(0, 30)}...` 
      : message.content || "No content"
  }, [])

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return ""
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }, [])

  const getAvatar = useCallback((user) => {
    if (user.avatar_url) {
      return <img src={user.avatar_url} alt={user.full_name || user.username} />
    }
    return <span>{user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}</span>
  }, [])

  const handleDeleteConversation = useCallback((e, conversationId) => {
    e.stopPropagation()
    onDeleteConversation(conversationId)
  }, [onDeleteConversation])

  const handleConversationClick = useCallback((conversation) => {
    onSelectConversation(conversation)
  }, [onSelectConversation])

  const toggleSearch = useCallback(() => {
    setShowSearch(!showSearch)
    if (showSearch) {
      setSearchTerm("")
      setSearchResults([])
    }
  }, [showSearch])

  if (loading) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.loading}>Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className={styles.conversationList}>
      <div className={styles.conversationListHeader}>
        <h4>Conversations</h4>
        <button 
          className={styles.newChatBtn}
          onClick={toggleSearch}
          title="Start New Chat"
        >
          {showSearch ? '✕' : '+'}
        </button>
      </div>

      {showSearch && (
        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={styles.searchInput}
            />
            <button 
              onClick={handleSearch}
              disabled={searching}
              className={styles.searchBtn}
            >
              {searching ? '...' : '🔍'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((friend) => (
                <div key={friend.id} className={styles.searchResultItem}>
                  <div className={styles.friendInfo}>
                    <div className={styles.friendAvatar}>
                      {getAvatar(friend)}
                    </div>
                    <div className={styles.friendDetails}>
                      <span className={styles.friendName}>
                        {friend.full_name || friend.username}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCreateConversation(friend.id)}
                    className={styles.startChatBtn}
                  >
                    Start Chat
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchTerm && searchResults.length === 0 && !searching && (
            <div className={styles.noSearchResults}>
              <p>No friends found</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.conversations}>
        {conversations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No conversations yet</p>
            <p>Start by searching for friends!</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div 
              key={conversation.id} 
              className={`${styles.conversationItem} ${
                currentConversation?.id === conversation.id ? styles.active : ""
              }`}
              onClick={() => handleConversationClick(conversation)}
            >
              <div className={styles.conversationAvatar}>
                {getAvatar(conversation.otherUser)}
              </div>
              
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <span className={styles.conversationName}>
                    {conversation.otherUser.full_name || conversation.otherUser.username}
                  </span>
                  <span className={styles.conversationTime}>
                    {formatTime(conversation.last_message_at)}
                  </span>
                </div>
                
                <div className={styles.conversationPreview}>
                  <span className={styles.lastMessage}>
                    {formatLastMessage(conversation.lastMessage)}
                  </span>
                  {/* Show unread count if there are unread messages */}
                  {conversation.unreadCount > 0 && (
                    <span className={styles.unreadCount}>
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.conversationActions}>
                <button
                  onClick={(e) => handleDeleteConversation(e, conversation.id)}
                  className={styles.deleteBtn}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
