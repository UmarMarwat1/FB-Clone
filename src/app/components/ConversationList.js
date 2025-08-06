"use client"
import { useState, useEffect, useCallback } from "react"
import styles from "./chatbot.module.css"
import { supabase } from "../../../lib/supabaseCLient"

export default function ConversationList({ user, onSelectConversation, currentConversation, onRefresh }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState("")

  const loadConversations = useCallback(async () => {
    if (!user?.id) return
    
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/conversations?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        }
      })
      const data = await response.json()
      setConversations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load conversations:", error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      loadConversations()
    }
  }, [user, loadConversations])

  const createNewConversation = async () => {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        },
        body: JSON.stringify({
          userId: user.id,
          title: 'New Conversation'
        })
      })
      
      if (response.ok) {
        const newConversation = await response.json()
        setConversations(prev => [newConversation, ...prev])
        onSelectConversation(newConversation)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const deleteConversation = async (conversationId) => {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        }
      })
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (currentConversation?.id === conversationId) {
        onSelectConversation(null)
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  const updateConversationTitle = async (conversationId, newTitle) => {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        },
        body: JSON.stringify({ title: newTitle })
      })
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
      )
      setEditingId(null)
      setEditTitle("")
    } catch (error) {
      console.error("Failed to update conversation:", error)
    }
  }

  const startEditing = (conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title || "")
  }

  if (loading) return <div className={styles.loading}>Loading conversations...</div>

  return (
    <div className={styles.conversationList}>
      <button 
        className={styles.newChatBtn}
        onClick={createNewConversation}
      >
        + New Chat
      </button>
      
             {conversations.map(conversation => (
         <div key={conversation.id} className={`${styles.conversationItem} ${
           currentConversation?.id === conversation.id ? styles.active : ''
         }`}>
          {editingId === conversation.id ? (
            <div className={styles.editForm}>
              <input
                type="text"
                value={editTitle || ""}
                onChange={(e) => setEditTitle(e.target.value)}
                                              onKeyPress={(e) => e.key === "Enter" && updateConversationTitle(conversation.id, editTitle)}
                onBlur={() => updateConversationTitle(conversation.id, editTitle)}
                autoFocus
                className={styles.editInput}
              />
            </div>
          ) : (
            <>
              <div 
                className={styles.conversationContent}
                onClick={() => onSelectConversation(conversation)}
              >
                <span className={styles.conversationTitle}>
                  {conversation.title || "Untitled Conversation"}
                </span>
                <span className={styles.conversationDate}>
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.conversationActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditing(conversation)
                  }}
                  className={styles.actionBtn}
                  title="Edit title"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conversation.id)
                  }}
                  className={styles.actionBtn}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      
      {conversations.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p>No conversations yet</p>
          <p>Click "New Chat" to start</p>
        </div>
      )}
    </div>
  )
}