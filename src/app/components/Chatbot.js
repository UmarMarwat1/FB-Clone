"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../../../lib/supabaseCLient"
import ConversationList from "./ConversationList"
import styles from "./chatbot.module.css"

export default function Chatbot({ user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversation, setCurrentConversation] = useState(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editMessageContent, setEditMessageContent] = useState("")
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !currentConversation || !user?.id) return
    
    const userMessage = { role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        },
        body: JSON.stringify({ 
          message: input,
          conversationId: currentConversation.id,
          userId: user.id
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const botMessage = { 
        role: "assistant", 
        content: data.response, 
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again.", 
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      console.log("Loading messages for conversation:", conversationId)
      
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/messages?conversationId=${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        }
      })
      const data = await response.json()
      
      console.log("Messages loaded:", data)
      
      if (Array.isArray(data)) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at)
        })))
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      setMessages([])
    }
  }

  const selectConversation = (conversation) => {
    setCurrentConversation(conversation)
    if (conversation && conversation.id) {
      loadMessages(conversation.id)
    } else {
      setMessages([]) // Clear messages when no conversation is selected
    }
  }

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
      const newConversation = await response.json()
      setCurrentConversation(newConversation)
      setMessages([])
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        }
      })
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const updateMessage = async (messageId, newContent) => {
    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        },
        body: JSON.stringify({ content: newContent })
      })
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? { ...msg, content: newContent } : msg)
      )
      setEditingMessageId(null)
      setEditMessageContent("")
    } catch (error) {
      console.error("Failed to update message:", error)
    }
  }

  const startEditingMessage = (message) => {
    setEditingMessageId(message.id)
    setEditMessageContent(message.content)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!user) return null

  return (
    <>
      <button 
        className={styles.chatButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Chat"
      >
        🤖 AI Chat
      </button>

      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <button 
              className={styles.sidebarToggle}
              onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <h3>AI Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)}
              title="Close Chat"
            >
              ✕
            </button>
          </div>
          
          <div className={styles.chatContent}>
            {showSidebar && (
              <div className={styles.sidebar}>
                <ConversationList 
                  user={user}
                  onSelectConversation={selectConversation}
                  currentConversation={currentConversation}
                />
              </div>
            )}
            
            <div className={styles.chatArea}>
              {!currentConversation ? (
                <div className={styles.welcomeMessage}>
                  <h4>Welcome to AI Assistant!</h4>
                  <p>Select a conversation or create a new one to start chatting.</p>
                  <button 
                    onClick={createNewConversation}
                    className={styles.newChatBtn}
                  >
                    + Start New Chat
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.messages}>
                    {messages.length === 0 && (
                      <div className={styles.welcomeMessage}>
                        <p>Start a conversation with AI!</p>
                      </div>
                    )}
                    {messages.map((msg, index) => (
                      <div key={msg.id || index} className={`${styles.message} ${styles[msg.role]}`}>
                        {editingMessageId === msg.id ? (
                          <div className={styles.editMessageForm}>
                            <textarea
                              value={editMessageContent}
                              onChange={(e) => setEditMessageContent(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && updateMessage(msg.id, editMessageContent)}
                              onBlur={() => updateMessage(msg.id, editMessageContent)}
                              className={styles.editMessageInput}
                              autoFocus
                            />
                            <div className={styles.editMessageActions}>
                              <button onClick={() => updateMessage(msg.id, editMessageContent)}>Save</button>
                              <button onClick={() => setEditingMessageId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={styles.messageContent}>
                              {msg.content}
                            </div>
                            <div className={styles.messageTime}>
                              {msg.timestamp?.toLocaleTimeString()}
                            </div>
                            {msg.role === "user" && (
                              <div className={styles.messageActions}>
                                <button
                                  onClick={() => startEditingMessage(msg)}
                                  className={styles.messageActionBtn}
                                  title="Edit message"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  className={styles.messageActionBtn}
                                  title="Delete message"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className={`${styles.message} ${styles.assistant}`}>
                        <div className={styles.loading}>
                          <span></span>
                          <span></span>
                          <span></span>
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className={styles.inputArea}>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message... (Press Enter to send)"
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      rows={1}
                    />
                    <button 
                      onClick={sendMessage} 
                      disabled={!input.trim() || isLoading}
                      title="Send Message"
                    >
                      {isLoading ? "..." : "Send"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}