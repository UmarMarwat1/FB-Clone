"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { 
  validateFile, 
  compressImage, 
  generateVideoThumbnail, 
  getMediaDuration,
  formatFileSize,
  getFileIcon,
  createPreviewUrl,
  revokePreviewUrl
} from "./utils/mediaUtils"
import styles from "./messaging.module.css"

export default function EnhancedMediaUpload({ onMediaSelect, onClose, conversationId }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  // Handle drag and drop events
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  // Handle file selection
  const handleFileSelect = (e) => {
    console.log('File input change event:', e.target.files)
    const files = Array.from(e.target.files)
    console.log('Files selected:', files)
    handleFiles(files)
  }

  const handleFiles = async (files) => {
    console.log('Processing files:', files)
    const validFiles = []
    const newPreviewUrls = []

    for (const file of files) {
      console.log('Processing file:', file.name, file.type, file.size)
      
      // Determine file type
      let fileType = 'image'
      if (file.type.startsWith('video/')) fileType = 'video'
      else if (file.type.startsWith('audio/')) fileType = 'audio'

      console.log('Determined file type:', fileType)

      // Validate file
      const validation = validateFile(file, fileType)
      console.log('File validation result:', validation)
      
      if (!validation.isValid) {
        alert(`File "${file.name}": ${validation.errors.join(', ')}`)
        continue
      }

      // Create preview URL
      const previewUrl = createPreviewUrl(file)
      newPreviewUrls.push(previewUrl)

      // Process file based on type
      let processedFile = file
      let thumbnailFile = null
      let duration = null

      try {
        if (fileType === 'image') {
          // Compress image if it's large
          if (file.size > 2 * 1024 * 1024) { // 2MB
            processedFile = await compressImage(file)
          }
        } else if (fileType === 'video') {
          // Generate thumbnail
          try {
            thumbnailFile = await generateVideoThumbnail(file)
          } catch (error) {
            console.warn('Failed to generate video thumbnail:', error)
          }
          // Get duration
          duration = await getMediaDuration(file)
        } else if (fileType === 'audio') {
          // Get duration
          duration = await getMediaDuration(file)
        }

        validFiles.push({
          file: processedFile,
          originalFile: file,
          type: fileType,
          thumbnail: thumbnailFile,
          duration,
          size: processedFile.size
        })
      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Failed to process file "${file.name}": ${error.message}`)
        revokePreviewUrl(previewUrl)
      }
    }

    setSelectedFiles(validFiles)
    setPreviewUrls(newPreviewUrls)
  }

  // Remove file from selection
  const removeFile = (index) => {
    const newFiles = [...selectedFiles]
    const newUrls = [...previewUrls]
    
    revokePreviewUrl(newUrls[index])
    newFiles.splice(index, 1)
    newUrls.splice(index, 1)
    
    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
  }

  // Upload all selected files
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return

    console.log('Starting upload of', selectedFiles.length, 'files')
    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileData = selectedFiles[i]
        console.log('Uploading file:', fileData)
        
        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100)

        // Call the parent handler
        console.log('Calling onMediaSelect with:', fileData)
        await onMediaSelect({
          file: fileData.file,
          type: fileData.type,
          thumbnail: fileData.thumbnail,
          duration: fileData.duration,
          size: fileData.size
        })
        console.log('File uploaded successfully:', fileData.file.name)
      }

      console.log('All files uploaded successfully')
      // Clean up
      setSelectedFiles([])
      setPreviewUrls([])
      setUploadProgress(0)
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Clean up preview URLs on unmount
  const cleanup = () => {
    previewUrls.forEach(revokePreviewUrl)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div className={styles.enhancedMediaUpload}>
      <div className={styles.uploadHeader}>
        <h3>Upload Media</h3>
        <button onClick={onClose} className={styles.closeButton}>✕</button>
      </div>

      {/* Drag and Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={styles.dropZoneContent}>
          <div className={styles.dropIcon}>📁</div>
          <p>Drag and drop files here or</p>
          <button
            onClick={() => {
              console.log('Browse button clicked, triggering file input')
              if (fileInputRef.current) {
                console.log('File input ref exists, clicking it')
                fileInputRef.current.click()
              } else {
                console.error('File input ref is null')
              }
            }}
            className={styles.browseButton}
            disabled={uploading}
          >
            Browse Files
          </button>
          <p className={styles.dropHint}>
            Supports: Images (JPEG, PNG, WebP, GIF), Videos (MP4, WebM, MOV), Audio (MP3, WAV, M4A)
          </p>
        </div>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className={styles.filePreview}>
          <h4>Selected Files ({selectedFiles.length})</h4>
          <div className={styles.fileList}>
            {selectedFiles.map((fileData, index) => (
              <div key={index} className={styles.fileItem}>
                <div className={styles.filePreview}>
                  {fileData.type === 'image' && (
                    <img 
                      src={previewUrls[index]} 
                      alt="Preview" 
                      className={styles.imagePreview}
                    />
                  )}
                  {fileData.type === 'video' && (
                    <div className={styles.videoPreview}>
                      <video 
                        src={previewUrls[index]} 
                        className={styles.videoThumbnail}
                      />
                      {fileData.thumbnail && (
                        <div className={styles.thumbnailOverlay}>
                          <img 
                            src={createPreviewUrl(fileData.thumbnail)} 
                            alt="Thumbnail" 
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {fileData.type === 'audio' && (
                    <div className={styles.audioPreview}>
                      <span className={styles.audioIcon}>🎵</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{fileData.file.name}</div>
                  <div className={styles.fileDetails}>
                    <span>{getFileIcon(fileData.file)} {fileData.type}</span>
                    <span>{formatFileSize(fileData.size)}</span>
                    {fileData.duration && (
                      <span>{Math.floor(fileData.duration / 60)}:{(fileData.duration % 60).toString().padStart(2, '0')}</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(index)}
                  className={styles.removeFileBtn}
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className={styles.uploadProgress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span>{Math.round(uploadProgress)}%</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.uploadActions}>
        <button
          onClick={onClose}
          className={styles.cancelButton}
          disabled={uploading}
        >
          Cancel
        </button>
        <button
          onClick={uploadFiles}
          className={styles.uploadButton}
          disabled={selectedFiles.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
