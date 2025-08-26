"use client"
import { useState, useRef } from 'react'
import Image from 'next/image'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import styles from './mediaUploader.module.css'

export default function MediaUploader({ onMediaChange, maxFiles = 10 }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([]) // Track already uploaded files
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const fileInputRef = useRef(null)

  const handleFiles = (files) => {
    const fileArray = Array.from(files)
    
    // Validate file count (including already uploaded files)
    if (uploadedFiles.length + selectedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You already have ${uploadedFiles.length} uploaded files.`)
      return
    }

    // Validate file types and sizes
    const validFiles = []
    const newPreviews = []

    fileArray.forEach((file, index) => {
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type`)
        return
      }

      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 50MB`)
        return
      }

      validFiles.push(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = {
          id: Date.now() + index,
          file,
          url: e.target.result,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name,
          size: file.size
        }
        
        newPreviews.push(preview)
        
        // Update state when all previews are loaded
        if (newPreviews.length === validFiles.length) {
          setSelectedFiles(prev => {
            const updatedFiles = [...prev, ...validFiles]
            // Auto-upload files after setting state
            setTimeout(() => uploadFilesAutomatic(updatedFiles), 100)
            return updatedFiles
          })
          setPreviews(prev => [...prev, ...newPreviews])
        }
      }
      
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeFile = (indexToRemove) => {
    // Remove from selected files (not yet uploaded)
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove)
    const newPreviews = previews.filter((_, index) => index !== indexToRemove)
    
    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
  }

  const removeUploadedFile = (indexToRemove) => {
    // Remove from uploaded files
    const newUploadedFiles = uploadedFiles.filter((_, index) => index !== indexToRemove)
    setUploadedFiles(newUploadedFiles)
    onMediaChange(newUploadedFiles)
  }

  const uploadFilesAutomatic = async (filesToUpload = selectedFiles) => {
    if (filesToUpload.length === 0) return

    setUploading(true)
    const formData = new FormData()
    
    filesToUpload.forEach((file) => {
      formData.append('files', file)
    })

    try {
      // Get the current session token
      const session = await getCurrentSession()
      
      if (!session) {
        alert('Please log in to upload files')
        setUploading(false)
        return
      }

      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Add new uploaded files to existing ones
        const newUploadedFiles = [...uploadedFiles, ...result.files]
        setUploadedFiles(newUploadedFiles)
        onMediaChange(newUploadedFiles)
        setSelectedFiles([])
        setPreviews([])
        // Clear the file input so it can be used again
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        alert(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Keep the manual upload function for backward compatibility
  const uploadFiles = () => uploadFilesAutomatic()

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={styles.mediaUploader}>
      {/* Drop Zone */}
      <div 
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>📁</div>
          <p>Drag & drop your photos and videos here</p>
          <p className={styles.orText}>or</p>
          <button type="button" className={styles.selectBtn}>
            Select Files
          </button>
          <p className={styles.fileInfo}>
            Support: JPG, PNG, GIF, MP4, WebM (Max: {maxFiles} files, 50MB each)
            <br />
            <small>✨ Files upload automatically when selected</small>
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <h4>Uploaded Files ({uploadedFiles.length}/{maxFiles})</h4>
            <button
              type="button"
              className={styles.removeMediaBtn}
              onClick={() => {
                setUploadedFiles([])
                onMediaChange([])
              }}
            >
              Remove All
            </button>
          </div>

          <div className={styles.previewGrid}>
            {uploadedFiles.map((file, index) => (
              <div key={index} className={styles.previewItem}>
                <div className={styles.previewMedia}>
                  {file.type === 'image' ? (
                    <Image 
                      src={file.url} 
                      alt={file.name}
                      width={100}
                      height={100}
                      className={styles.previewImage}
                    />
                  ) : (
                    <div className={styles.videoPreview}>
                      <video 
                        src={file.url}
                        className={styles.previewVideo}
                        controls={false}
                        muted
                      />
                      <div className={styles.videoOverlay}>
                        <span className={styles.playIcon}>▶️</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeUploadedFile(index)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{file.name}</p>
                  <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Being Selected/Uploaded */}
      {previews.length > 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <h4>
              {uploading ? 'Uploading...' : 'Selected Files'} ({previews.length})
            </h4>
          </div>

          <div className={styles.previewGrid}>
            {previews.map((preview, index) => (
              <div key={preview.id} className={styles.previewItem}>
                <div className={styles.previewMedia}>
                  {preview.type === 'image' ? (
                    <Image 
                      src={preview.url} 
                      alt={preview.name}
                      width={100}
                      height={100}
                      className={styles.previewImage}
                    />
                  ) : (
                    <div className={styles.videoPreview}>
                      <video 
                        src={preview.url}
                        className={styles.previewVideo}
                        controls={false}
                        muted
                      />
                      <div className={styles.videoOverlay}>
                        <span className={styles.playIcon}>▶️</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeFile(index)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className={styles.fileInfo}>
                  <p className={styles.fileName}>{preview.name}</p>
                  <p className={styles.fileSize}>{formatFileSize(preview.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {uploading && (
            <div className={styles.uploadingState}>
              <div className={styles.spinner}></div>
              <p>Uploading files...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
