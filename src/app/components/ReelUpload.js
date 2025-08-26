'use client'
import { useState, useRef } from 'react'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import styles from '../reels/upload/upload.module.css'

export default function ReelUpload({ currentUser, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleVideoLoad = () => {
    const video = videoRef.current
    if (!video) return

    // Check duration (max 30 seconds)
    if (video.duration > 30) {
      alert('Video duration must be 30 seconds or less')
      setSelectedFile(null)
      setPreview(null)
      return
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) return
  
    setUploading(true)
    setUploadProgress(0)
  
    try {
      const formData = new FormData()
      formData.append('video', selectedFile)
      formData.append('caption', caption)
      formData.append('privacy', privacy)
  
      // Get the current session token
      const session = await getCurrentSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await fetch('/api/reels/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
  
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Upload failed'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If we can't parse JSON, use status text
          if (response.status === 413) {
            errorMessage = 'File size too large. Please select a smaller video file (max 100MB).'
          } else {
            errorMessage = `Upload failed: ${response.status} ${response.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }
  
      const data = await response.json()
  
      if (data.success) {
        alert('Reel uploaded successfully!')
        
        // Reset form
        setSelectedFile(null)
        setPreview(null)
        setCaption('')
        setPrivacy('public')
        
        if (onUploadComplete) {
          console.log('Calling onUploadComplete with:', data.reel)
          onUploadComplete(data.reel)
        }
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Error uploading reel:', error)
      
      // Provide more specific error messages
      let userMessage = error.message
      
      if (error.message.includes('413') || error.message.includes('Payload Too Large') || error.message.includes('File size too large')) {
        userMessage = 'File size too large. Please select a smaller video file (max 100MB).'
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        userMessage = 'Authentication failed. Please log in again.'
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        userMessage = 'Server error occurred. Please try again later.'
      }
      
      alert('Failed to upload reel: ' + userMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={styles.reelUpload}>
      <h2>Create New Reel</h2>

      {!selectedFile ? (
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="videoUpload"
          />
          <label htmlFor="videoUpload" className={styles.uploadLabel}>
            <div className={styles.uploadIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
            </div>
            <h3>Select Video</h3>
            <p>Choose a video file (max 30 seconds, 100MB)</p>
            <button 
              type="button" 
              className={styles.selectButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
          </label>
        </div>
      ) : (
        <div className={styles.uploadPreview}>
          <div className={styles.videoPreview}>
            <video
              ref={videoRef}
              src={preview}
              controls
              className={styles.previewVideo}
              onLoadedMetadata={handleVideoLoad}
            />
            <button 
              className={styles.clearButton}
              onClick={clearSelection}
            >
              ×
            </button>
          </div>

          <div className={styles.uploadForm}>
            <div className={styles.formGroup}>
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your reel..."
                maxLength={500}
                rows={3}
              />
              <small>{caption.length}/500</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="privacy">Privacy</label>
              <select
                id="privacy"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <button
              className={styles.uploadButton}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Reel'}
            </button>

            {uploading && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}