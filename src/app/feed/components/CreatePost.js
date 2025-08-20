"use client"
import { useState } from "react"
import Image from "next/image"
import { supabase } from "../../../../lib/supabaseCLient"
import MediaUploader from "../../components/MediaUploader"
import FeelingActivitySelector from "../../components/FeelingActivitySelector"
import styles from "../feed.module.css"

export default function CreatePost({ user, onPostCreated }) {
  const [content, setContent] = useState("")
  const [error, setError] = useState(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [uploadedMedia, setUploadedMedia] = useState([])
  const [feelingActivity, setFeelingActivity] = useState({ type: null, value: null, emoji: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMediaUploader, setShowMediaUploader] = useState(false)

  async function handlePost(e) {
    e.preventDefault()
    setError(null)
    
    // New validation logic:
    // Allow: text only, media only, text+media, media+feelings, text+feelings
    // Prevent: feelings/activities only (must have text or media)
    const hasContent = content.trim().length > 0
    const hasMedia = uploadedMedia.length > 0
    const hasFeelingActivity = feelingActivity.value !== null
    
    if (!hasContent && !hasMedia && !hasFeelingActivity) {
      setError("Please add some content, media, or select a feeling/activity")
      return
    }
    
    if (!hasContent && !hasMedia && hasFeelingActivity) {
      setError("Feelings/Activities cannot be posted alone. Please add some text or media")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Prepare post data
      const postData = {
        content: hasContent ? content.trim() : null, // Send null for empty content
        media: uploadedMedia,
        feeling: feelingActivity.type === 'feeling' ? feelingActivity.value : null,
        activity: feelingActivity.type === 'activity' ? feelingActivity.value : null
      }

      // attach access token so API can authenticate
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(postData)
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setContent("")
        setUploadedMedia([])
        setFeelingActivity({ type: null, value: null, emoji: null })
        setShowPostForm(false)
        setShowMediaUploader(false)
        onPostCreated() // Call the callback to refresh posts
      } else {
        setError(result.error || "Failed to create post")
      }
    } catch (err) {
      console.error('Post creation error:', err)
      setError("Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    setShowPostForm(false)
    setContent("")
    setError(null)
    setUploadedMedia([])
    setFeelingActivity({ type: null, value: null, emoji: null })
    setShowMediaUploader(false)
  }

  const handleMediaChange = (mediaFiles) => {
    setUploadedMedia(mediaFiles)
  }

  const handleFeelingActivityChange = (selection) => {
    setFeelingActivity(selection)
  }

  return (
    <>
      {/* Create Post Section */}
      <div className={styles.createPostSection}>
        <div className={styles.createPostHeader}>
          <div className={styles.userAvatar}>
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <button 
            className={styles.createPostInput}
            onClick={() => setShowPostForm(true)}
          >
            What&apos;s on your mind?
          </button>
        </div>
        {/* Removed createPostActions - Photo/Video and Feeling/Activity options now only appear in the modal */}
      </div>

      {/* Post Form Modal */}
      {showPostForm && (
        <div 
          className={styles.postFormOverlay} 
          onClick={closeModal}
          onKeyDown={(e) => e.key === 'Escape' && closeModal()}
        >
          <div 
            className={styles.postForm} 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className={styles.postFormHeader}>
              <h3>Create Post</h3>
              <button 
                className={styles.closeBtn}
                onClick={closeModal}
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePost}>
              {/* User Info with Feeling/Activity */}
              <div className={styles.postUserHeader}>
                <div className={styles.postUserInfo}>
                  <div className={styles.userAvatar}>
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <div className={styles.userName}>
                      {user?.username || user?.email?.split('@')[0] || 'User'}
                    </div>
                    {feelingActivity.value && (
                      <div className={styles.feelingDisplay}>
                        {feelingActivity.emoji} {feelingActivity.type === 'feeling' ? 'is feeling' : 'is'} {feelingActivity.value}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <textarea
                placeholder="What&apos;s on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.postTextarea}
              />

              {/* Feeling/Activity Selector */}
              <div className={styles.postOption}>
                <FeelingActivitySelector 
                  onSelectionChange={handleFeelingActivityChange}
                  initialSelection={feelingActivity}
                />
              </div>

              {/* Media Uploader */}
              {showMediaUploader && (
                <div className={styles.postOption}>
                  <MediaUploader 
                    onMediaChange={handleMediaChange}
                    maxFiles={10}
                  />
                </div>
              )}

              {/* Show Media Toggle Button */}
              {!showMediaUploader && (
                <div className={styles.postOption}>
                  <button
                    type="button"
                    className={styles.addMediaBtn}
                    onClick={() => setShowMediaUploader(true)}
                  >
                    📷 Add Photos/Videos
                  </button>
                </div>
              )}

              {/* Media Preview */}
              {uploadedMedia.length > 0 && (
                <div className={styles.mediaPreview}>
                  <div className={styles.mediaPreviewHeader}>
                    <span>{uploadedMedia.length} file(s) uploaded</span>
                    <button
                      type="button"
                      className={styles.removeMediaBtn}
                      onClick={() => {
                        setUploadedMedia([])
                        setShowMediaUploader(false)
                      }}
                    >
                      Remove All
                    </button>
                  </div>
                  <div className={styles.mediaPreviewGrid}>
                    {uploadedMedia.slice(0, 4).map((media, index) => (
                      <div key={index} className={styles.mediaPreviewItem}>
                        {media.type === 'image' ? (
                          <Image 
                            src={media.url} 
                            alt="Preview" 
                            width={100}
                            height={100}
                          />
                        ) : (
                          <div className={styles.videoPreviewItem}>
                            <video src={media.url} />
                            <span className={styles.videoIcon}>▶️</span>
                          </div>
                        )}
                        {uploadedMedia.length > 4 && index === 3 && (
                          <div className={styles.moreMediaOverlay}>
                            +{uploadedMedia.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}
              
              <div className={styles.postFormActions}>
                <button 
                  type="submit" 
                  className={styles.postSubmitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
                <button 
                  type="button" 
                  className={styles.postCancelBtn}
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
} 