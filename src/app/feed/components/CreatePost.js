"use client"
import { useState } from "react"
import { supabase } from "../../../../lib/supabaseCLient"
import styles from "../feed.module.css"

export default function CreatePost({ user, onPostCreated }) {
  const [content, setContent] = useState("")
  const [error, setError] = useState(null)
  const [showPostForm, setShowPostForm] = useState(false)

  async function handlePost(e) {
    e.preventDefault()
    setError(null)
    if (!content.trim()) return
    
    try {
      const { error } = await supabase.from("posts").insert([{ content, user_id: user.id }])
      if (error) setError(error.message)
      else {
        setContent("")
        setShowPostForm(false)
        onPostCreated() // Call the callback to refresh posts
      }
    } catch (err) {
      setError("Failed to create post")
    }
  }

  const closeModal = () => {
    setShowPostForm(false)
    setContent("")
    setError(null)
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
        <div className={styles.createPostActions}>
          <button className={styles.postAction}>
            📹 Live Video
          </button>
          <button className={styles.postAction}>
            📷 Photo/Video
          </button>
          <button className={styles.postAction}>
            😊 Feeling/Activity
          </button>
        </div>
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
              <textarea
                placeholder="What&apos;s on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.postTextarea}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.postFormActions}>
                <button type="submit" className={styles.postSubmitBtn}>
                  Post
                </button>
                <button 
                  type="button" 
                  className={styles.postCancelBtn}
                  onClick={closeModal}
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