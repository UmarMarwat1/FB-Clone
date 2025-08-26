"use client"
import { useState, useRef } from "react"
import EnhancedMediaUpload from "./EnhancedMediaUpload"
import styles from "./messaging.module.css"

export default function MessageInput({ onSendMessage, disabled, placeholder }) {
  const [input, setInput] = useState("")
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSend = () => {
    if (!input.trim() || disabled || uploading) return
    
    onSendMessage({
      type: 'text',
      content: input.trim()
    })
    setInput("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMediaSelect = async (mediaData) => {
    try {
      console.log('Media selected:', mediaData)
      setUploading(true)
      
      // Send media message
      await onSendMessage({
        type: mediaData.type,
        file: mediaData.file,
        thumbnail: mediaData.thumbnail,
        duration: mediaData.duration,
        size: mediaData.size
      })
      
      console.log('Media message sent successfully')
      setShowMediaUpload(false)
    } catch (error) {
      console.error('Failed to send media message:', error)
      alert('Failed to send media message. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleMediaButtonClick = () => {
    console.log('Media button clicked, setting showMediaUpload to true')
    setShowMediaUpload(true)
  }

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputContainer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder || "Type a message..."}
          disabled={disabled || uploading}
          rows={1}
          className={styles.textInput}
        />
        
        <div className={styles.inputActions}>
          <button
            className={styles.mediaButton}
            onClick={handleMediaButtonClick}
            title="Attach media"
            disabled={disabled || uploading}
          >
            📎
          </button>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled || uploading}
            className={styles.sendButton}
            title="Send message"
          >
            {uploading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {showMediaUpload && (
        <EnhancedMediaUpload
          onMediaSelect={handleMediaSelect}
          onClose={() => setShowMediaUpload(false)}
        />
      )}
    </div>
  )
}
