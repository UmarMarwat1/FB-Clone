'use client'

import { useState, useRef } from 'react'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import styles from './stories.module.css'

export default function StoryUpload({ isOpen, onClose, onStoryCreated, currentUser }) {
  const [textContent, setTextContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleClose = () => {
    setTextContent('')
    setMediaFiles([])
    onClose()
  }

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).map(file => {
      const fileType = file.type.startsWith('video/') ? 'video' : 'image'
      
      // For videos, check duration
      if (fileType === 'video') {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true // Mute to avoid autoplay issues
        video.playsInline = true // Prevent fullscreen on mobile
        
        return new Promise((resolve) => {
          const handleLoadedMetadata = () => {
            try {
            if (video.duration > 15) {
              alert('Video must be 15 seconds or less')
              resolve(null)
            } else {
              resolve({
                file,
                type: fileType,
                duration: Math.round(video.duration),
                preview: URL.createObjectURL(file)
              })
            }
            } catch (error) {
              console.warn('Error checking video duration:', error)
              // Fallback: accept the video without duration check
              resolve({
                file,
                type: fileType,
                duration: null,
                preview: URL.createObjectURL(file)
              })
            } finally {
              // Clean up
              video.removeEventListener('loadedmetadata', handleLoadedMetadata)
              video.removeEventListener('error', handleError)
              URL.revokeObjectURL(video.src)
            }
          }

          const handleError = (error) => {
            console.warn('Error loading video metadata:', error)
            // Fallback: accept the video without duration check
            resolve({
              file,
              type: fileType,
              duration: null,
              preview: URL.createObjectURL(file)
            })
            // Clean up
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('error', handleError)
            URL.revokeObjectURL(video.src)
          }

          video.addEventListener('loadedmetadata', handleLoadedMetadata)
          video.addEventListener('error', handleError)
          
          // Set timeout to prevent hanging
          setTimeout(() => {
            if (video.readyState < 1) { // HAVE_NOTHING
              console.warn('Video metadata loading timeout')
              handleError(new Error('Video metadata loading timeout'))
            }
          }, 5000) // 5 second timeout

          video.src = URL.createObjectURL(file)
        })
      } else {
        return Promise.resolve({
          file,
          type: fileType,
          preview: URL.createObjectURL(file)
        })
      }
    })

    Promise.all(newFiles).then(results => {
      const validFiles = results.filter(Boolean)
      setMediaFiles(prev => [...prev, ...validFiles])
    }).catch(error => {
      console.error('Error processing files:', error)
      alert('Error processing files. Please try again.')
    })
  }

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeMedia = (index) => {
    setMediaFiles(prev => {
      const newFiles = [...prev]
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFile = async (mediaFile) => {
    try {
      // Get the logged-in Supabase user ID directly from Auth
      const session = await getCurrentSession();
      if (!session?.user) {
        throw new Error("User not logged in");
      }
      const userId = session.user.id;
  
      // Generate unique filename: userId/UNIQUE-RANDOM.ext
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, mediaFile.file, {
          contentType: mediaFile.file.type,
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload file");
      }
  
      // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('stories')
        .getPublicUrl(fileName);

      return {
        type: mediaFile.type,
        url: publicUrl,
        thumbnailUrl: null, // For now, we'll handle thumbnails later
        duration: mediaFile.duration
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!textContent.trim() && mediaFiles.length === 0) {
      alert('Please add some content to your story')
      return
    }

    setIsUploading(true)

    try {
      let uploadedMedia = []

      // Upload all media files
      if (mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(uploadFile)
        uploadedMedia = await Promise.all(uploadPromises)
      }

      // Create story using Supabase client directly
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          text_content: textContent.trim() || null
        })
        .select()
        .single()

      if (storyError) {
        console.error("Error creating story:", storyError)
        throw new Error("Failed to create story")
      }

      // If there are media files, insert them
      if (uploadedMedia.length > 0) {
        const mediaInserts = uploadedMedia.map((media, index) => ({
            story_id: storyData.id,
            media_type: media.type,
            media_url: media.url,
            thumbnail_url: media.thumbnailUrl || null,
            duration: media.duration || null,
            media_order: index + 1
        }))

        const { error: mediaError } = await supabase
          .from('story_media')
          .insert(mediaInserts)

        if (mediaError) {
          console.error("Error creating story media:", mediaError)
          // Delete the story if media insertion fails
          await supabase.from('stories').delete().eq('id', storyData.id)
          throw new Error("Failed to create story media")
        }
      }
      
      // Clean up object URLs
      mediaFiles.forEach(media => URL.revokeObjectURL(media.preview))
      
      // Reset form and close
      setTextContent('')
      setMediaFiles([])
      onStoryCreated(storyData)
      onClose()

    } catch (error) {
      console.error('Error creating story:', error)
      alert('Failed to create story. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
      <div className={styles.uploadModal} onClick={handleClose}>
        <div className={styles.uploadContent} onClick={e => e.stopPropagation()}>
          <div className={styles.uploadHeader}>
            <h2 className={styles.uploadTitle}>Create Story</h2>
            <button className={styles.closeBtn} onClick={handleClose}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.uploadBody}>
              <textarea
                className={styles.textInput}
                placeholder="Share what's on your mind..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                maxLength={500}
              />

              <div className={styles.mediaSection}>
                <label className={styles.mediaLabel}>Add Photos/Videos</label>
                
                <div 
                  className={`${styles.mediaUpload} ${dragOver ? styles.dragOver : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className={styles.uploadIcon}>📷</div>
                  <div className={styles.uploadText}>
                    Click to upload or drag and drop<br/>
                    <small>Images and videos (max 15 seconds)</small>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.fileInput}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileInputChange}
                />

                {mediaFiles.length > 0 && (
                  <div className={styles.mediaPreview}>
                    {mediaFiles.map((media, index) => (
                      <div key={index} className={styles.mediaItem}>
                        {media.type === 'video' ? (
                          <>
                            <video src={media.preview} muted />
                            <div className={styles.videoDuration}>
                              {media.duration}s
                            </div>
                          </>
                        ) : (
                          <img src={media.preview} alt="Preview" />
                        )}
                        <button
                          type="button"
                          className={styles.removeMedia}
                          onClick={() => removeMedia(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.uploadFooter}>
              <button 
                type="button" 
                className={styles.cancelBtn}
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.postBtn}
                disabled={isUploading || (!textContent.trim() && mediaFiles.length === 0)}
              >
                {isUploading ? (
                  <>
                    <span className={styles.loadingSpinner}></span>
                    Posting...
                  </>
                ) : (
                  'Post Story'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}
