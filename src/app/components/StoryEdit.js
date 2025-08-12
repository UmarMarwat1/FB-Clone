'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseCLient'
import styles from './stories.module.css'

export default function StoryEdit({ isOpen, onClose, story, onStoryUpdated, currentUser }) {
  const [textContent, setTextContent] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (story) {
      setTextContent(story.text_content || '')
    }
  }, [story])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!story) return

    setIsUpdating(true)

    try {
      // Update the story text content
      const { error } = await supabase
        .from('stories')
        .update({
          text_content: textContent.trim() || null
        })
        .eq('id', story.id)
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('Error updating story:', error)
        alert('Failed to update story')
      } else {
        onStoryUpdated()
        onClose()
      }
    } catch (error) {
      console.error('Error updating story:', error)
      alert('Failed to update story')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClose = () => {
    setTextContent('')
    onClose()
  }

  if (!isOpen || !story) return null

  return (
    <div className={styles.uploadModal} onClick={handleClose}>
      <div className={styles.uploadContent} onClick={e => e.stopPropagation()}>
        <div className={styles.uploadHeader}>
          <h2 className={styles.uploadTitle}>Edit Story</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.uploadBody}>
            <textarea
              className={styles.textInput}
              placeholder="Edit your story text..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={500}
            />

            {/* Show existing media */}
            {story.story_media && story.story_media.length > 0 && (
              <div className={styles.mediaSection}>
                <label className={styles.mediaLabel}>Story Media (cannot be edited)</label>
                <div className={styles.mediaPreview}>
                  {story.story_media.map((media, index) => (
                    <div key={index} className={styles.mediaItem}>
                      {media.media_type === 'video' ? (
                        <>
                          <video src={media.media_url} muted />
                          <div className={styles.videoDuration}>
                            {media.duration}s
                          </div>
                        </>
                      ) : (
                        <img src={media.media_url} alt="Story media" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.uploadFooter}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.postBtn}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  Updating...
                </>
              ) : (
                'Update Story'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
