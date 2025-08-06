"use client"
import { useEffect, useState } from "react"
import { supabase, getComments, addComment, deleteComment, getLikes, toggleLike } from "../../../../lib/supabaseCLient"
import styles from "../feed.module.css"

export default function PostCard({ post, user, onPostDeleted }) {
  const [comments, setComments] = useState([])
  const [likes, setLikes] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentContent, setCommentContent] = useState("")
  const [error, setError] = useState("")
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  // Fetch comments and likes when component mounts
  useEffect(() => {
    fetchComments()
    fetchLikes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchComments() {
    try {
      const data = await getComments(post.id)
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  async function fetchLikes() {
    try {
      const data = await getLikes(post.id)
      setLikes(data || [])
    } catch (err) {
      console.error('Error fetching likes:', err)
    }
  }

  async function handleDeletePost() {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', user.id)
      
      if (error) {
        setError("Failed to delete post")
      } else {
        onPostDeleted(post.id) // Notify parent component
      }
    } catch (err) {
      setError("Failed to delete post")
    }
  }

  async function handleAddComment() {
    if (!commentContent.trim()) return

    try {
      await addComment(post.id, user.id, commentContent)
      setCommentContent("")
      fetchComments()
    } catch (err) {
      setError("Failed to add comment")
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(commentId, user.id)
      fetchComments()
    } catch (err) {
      setError("Failed to delete comment")
    }
  }

  async function handleToggleLike(likeType) {
    try {
      await toggleLike(post.id, user.id, likeType)
      fetchLikes()
    } catch (err) {
      setError("Failed to update like")
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString()
  }

  const getUserLikeStatus = () => {
    const userLike = likes.find(like => like.user_id === user?.id)
    return userLike ? userLike.like_type : null
  }

  const getLikeCounts = () => {
    const likesCount = likes.filter(like => like.like_type === 'like').length
    const dislikesCount = likes.filter(like => like.like_type === 'dislike').length
    return { likes: likesCount, dislikes: dislikesCount }
  }

  const likeCounts = getLikeCounts()
  const userLikeStatus = getUserLikeStatus()
  const isPostAuthor = post.user_id === user?.id

  return (
    <div className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.postUserInfo}>
          <div className={styles.postUserAvatar}>
            {(post.author?.username || post.author?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className={styles.postUserDetails}>
            <div className={styles.postUserName}>
              {post.author?.username || post.author?.full_name || 'Unknown User'}
            </div>
            <div className={styles.postTime}>
              {formatDate(post.created_at)}
            </div>
          </div>
        </div>
        <div className={styles.postMenuContainer}>
          {isPostAuthor && (
            <button 
              className={styles.postMenuBtn}
              onClick={() => setShowDeleteMenu(!showDeleteMenu)}
            >
              ⋯
            </button>
          )}
          {showDeleteMenu && isPostAuthor && (
            <div className={styles.postMenuDropdown}>
              <button 
                className={styles.deletePostBtn}
                onClick={handleDeletePost}
              >
                🗑️ Delete Post
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.postContent}>
        {post.content}
      </div>
      
      {/* Like/Dislike Stats */}
      {(likeCounts.likes > 0 || likeCounts.dislikes > 0) && (
        <div className={styles.postStats}>
          {likeCounts.likes > 0 && (
            <span className={styles.likeStat}>👍 {likeCounts.likes}</span>
          )}
          {likeCounts.dislikes > 0 && (
            <span className={styles.dislikeStat}>👎 {likeCounts.dislikes}</span>
          )}
        </div>
      )}
      
      <div className={styles.postActions}>
        <button 
          className={`${styles.postActionBtn} ${userLikeStatus === 'like' ? styles.activeLike : ''}`}
          onClick={() => handleToggleLike('like')}
        >
          👍 Like
        </button>
        <button 
          className={`${styles.postActionBtn} ${userLikeStatus === 'dislike' ? styles.activeDislike : ''}`}
          onClick={() => handleToggleLike('dislike')}
        >
          👎 Dislike
        </button>
        <button 
          className={styles.postActionBtn}
          onClick={() => setShowComments(!showComments)}
        >
          💬 Comment ({comments.length})
        </button>
        <button className={styles.postActionBtn}>
          🔄 Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className={styles.commentsSection}>
          {/* Add Comment */}
          <div className={styles.addCommentSection}>
            <div className={styles.commentInputWrapper}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className={styles.commentInput}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button 
                className={styles.commentSubmitBtn}
                onClick={handleAddComment}
              >
                Post
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentUserAvatar}>
                  {(comment.author?.username || comment.author?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className={styles.commentContent}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentUserName}>
                      {comment.author?.username || comment.author?.full_name || 'Unknown User'}
                    </span>
                    <span className={styles.commentTime}>
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <div className={styles.commentText}>
                    {comment.content}
                  </div>
                  {comment.user_id === user?.id && (
                    <button 
                      className={styles.deleteCommentBtn}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 