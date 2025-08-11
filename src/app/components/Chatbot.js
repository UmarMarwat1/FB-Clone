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
  const [isMobile, setIsMobile] = useState(false)
  const chatWindowRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen, isMobile])

  // Prevent scroll event bubbling
  const handleScroll = (e) => {
    e.stopPropagation()
  }

  const handleTouchMove = (e) => {
    e.stopPropagation()
  }

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
      
      // Update the user message with the actual ID from database
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.content === input && msg.role === "user" && !msg.id 
            ? { ...msg, id: data.userMessageId }
            : msg
        )
        return updatedMessages
      })
      
      const botMessage = { 
        id: data.aiMessageId,
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
      // Validate message ID
      if (!messageId || messageId === 'undefined' || messageId === undefined) {
        console.error("Invalid message ID:", messageId)
        alert("Cannot delete message: Invalid message ID")
        return
      }
      
      // Add confirmation before deleting
      if (!confirm("Are you sure you want to delete this message and its AI response?")) {
        return
      }
      
      console.log("Attempting to delete message:", messageId)
      
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      // Find the message to be deleted
      const messageToDelete = messages.find(msg => msg.id === messageId)
      if (!messageToDelete) {
        console.error("Message not found:", messageId)
        return
      }
      
      // If it's a user message, also find the corresponding AI message
      let aiMessageId = null
      if (messageToDelete.role === 'user') {
        const messageIndex = messages.findIndex(msg => msg.id === messageId)
        if (messageIndex !== -1 && messageIndex + 1 < messages.length) {
          const nextMessage = messages[messageIndex + 1]
          if (nextMessage.role === 'assistant') {
            aiMessageId = nextMessage.id
            console.log("Found corresponding AI message:", aiMessageId)
          }
        }
      }
      
      // Delete the user message
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete message')
      }
      
      console.log("User message deleted successfully from server")
      
      // Delete the AI message if it exists
      if (aiMessageId) {
        const aiResponse = await fetch(`/api/messages/${aiMessageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}` // Add auth token
          }
        })
        
        if (!aiResponse.ok) {
          const errorData = await aiResponse.json()
          console.error("Failed to delete AI message:", errorData)
          // Don't throw error for AI message deletion failure
        } else {
          console.log("AI message deleted successfully from server")
        }
      }
      
      // Update local state by removing both messages
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => msg.id !== messageId && msg.id !== aiMessageId)
        console.log("Updated messages count:", updatedMessages.length)
        return updatedMessages
      })
    } catch (error) {
      console.error("Failed to delete message:", error)
      alert("Failed to delete message: " + error.message)
    }
  }

  const updateMessage = async (messageId, newContent) => {
    try {
      // Validate message ID
      if (!messageId || messageId === 'undefined' || messageId === undefined) {
        console.error("Invalid message ID for update:", messageId)
        alert("Cannot update message: Invalid message ID")
        return
      }
      
      console.log("Attempting to update message:", messageId, "with content:", newContent)
      
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Add auth token
        },
        body: JSON.stringify({ content: newContent })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update message')
      }
      
      console.log("Message updated successfully on server")
      
      // Update local state
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? { ...msg, content: newContent } : msg)
      )
      setEditingMessageId(null)
      setEditMessageContent("")
    } catch (error) {
      console.error("Failed to update message:", error)
      alert("Failed to update message: " + error.message)
    }
  }

  const startEditingMessage = (message) => {
    setEditingMessageId(message.id)
    // Don't set the content immediately to avoid the original text appearing
    setEditMessageContent("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEditKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      updateMessage(editingMessageId, editMessageContent)
    }
  }

  const handleEditInputChange = (e) => {
    setEditMessageContent(e.target.value)
  }

  const handleEditFocus = (e) => {
    // Set the content only when the input is focused
    const message = messages.find(msg => msg.id === editingMessageId)
    if (message && !editMessageContent) {
      setEditMessageContent(message.content)
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
        <>
          {isMobile && (
            <div 
              className={styles.mobileBackdrop}
              onClick={() => setIsOpen(false)}
              onTouchMove={handleTouchMove}
            />
          )}
          <div 
            className={styles.chatWindow}
            ref={chatWindowRef}
            onScroll={handleScroll}
            onTouchMove={handleTouchMove}
          >
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
            {isMobile && showSidebar && <div className={styles.sidebarBackdrop} onClick={() => setShowSidebar(false)} />}
            {showSidebar && (
              <div 
                className={`${styles.sidebar} ${isMobile && showSidebar ? styles.show : ''}`}
                onScroll={handleScroll}
                onTouchMove={handleTouchMove}
              >
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
                  <div 
                    className={styles.messages}
                    onScroll={handleScroll}
                    onTouchMove={handleTouchMove}
                  >
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
                              onChange={handleEditInputChange}
                              onKeyPress={handleEditKeyPress}
                              onBlur={() => updateMessage(msg.id, editMessageContent)}
                              onFocus={handleEditFocus}
                              className={styles.editMessageInput}
                              autoFocus
                            />
                            <div className={styles.editMessageActions}>
                              <button onClick={() => updateMessage(msg.id, editMessageContent)}>Save</button>
                              <button onClick={() => {
                                setEditingMessageId(null)
                                setEditMessageContent("")
                              }}>Cancel</button>
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
                                                         {msg.role === "user" && msg.id && (
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
                      placeholder="Type your message..."
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
        </>
      )}
    </>
  )
}