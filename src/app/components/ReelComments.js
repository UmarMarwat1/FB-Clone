'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './reels.module.css'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import EmojiPicker from 'emoji-picker-react'

export default function ReelComments({ reelId, currentUser, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false)
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null) // 'comment' or 'reply'
  const [editingComment, setEditingComment] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [editContent, setEditContent] = useState('')
  const inputRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const replyEmojiPickerRef = useRef(null)

  useEffect(() => {
    fetchComments()
    
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [reelId])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
        setActiveEmojiPicker(null)
      }
      if (replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(event.target)) {
        setShowReplyEmojiPicker(false)
        setActiveEmojiPicker(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchComments = async () => {
    try {
      // Get session token for authentication
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      console.log('Fetched comments data:', data)

      if (data.success) {
        // The API now returns comments with nested replies
        console.log('Setting comments state:', data.comments)
        setComments(data.comments || [])
      } else {
        console.error('API returned error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser || submitting) return

    setSubmitting(true)

    try {
      // Get session token for authentication
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
        // Notify parent component about new comment
        handleCommentAdded(reelId)
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentAdded = (reelId) => {
    console.log('Comment added successfully, calling onCommentAdded with reelId:', reelId)
    if (onCommentAdded) {
      onCommentAdded(reelId)
    } else {
      console.log('onCommentAdded callback is not provided')
    }
  }

  const handleReply = async (parentCommentId) => {
    if (!replyContent.trim() || !currentUser || submitting) return

    setSubmitting(true)

    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_comment_id: parentCommentId
        })
      })

      const data = await response.json()

      if (data.success) {
        // Add the new reply to the comments state
        setComments(prev => prev.map(comment => 
          comment.id === parentCommentId 
            ? { ...comment, replies: [...(comment.replies || []), data.comment] }
            : comment
        ))
        setReplyContent('')
        setReplyTo(null)
        // Notify parent component about new comment
        console.log('Reply added successfully, calling onCommentAdded with reelId:', reelId)
        if (onCommentAdded) {
          onCommentAdded(reelId)
        } else {
          console.log('onCommentAdded callback is not provided')
        }
      }
    } catch (error) {
      console.error('Error posting reply:', error)
      alert('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editContent.trim() || submitting) return

    setSubmitting(true)
    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: editContent.trim() }
            : comment
        ))
        setEditingComment(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error editing comment:', error)
      alert('Failed to edit comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReply = async (replyId) => {
    if (!editContent.trim() || submitting) return

    setSubmitting(true)
    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments/${replyId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setComments(prev => prev.map(comment => ({
          ...comment,
          replies: comment.replies?.map(reply => 
            reply.id === replyId 
              ? { ...reply, content: editContent.trim() }
              : reply
          ) || []
        })))
        setEditingReply(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error editing reply:', error)
      alert('Failed to edit reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId))
        // Update comment count
        if (onCommentAdded) {
          onCommentAdded(reelId)
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const handleDeleteReply = async (commentId, replyId) => {
    if (!confirm('Are you sure you want to delete this reply?')) return

    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/reels/${reelId}/comments/${replyId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? {
                ...comment,
                replies: comment.replies?.filter(reply => reply.id !== replyId) || []
              }
            : comment
        ))
        // Update comment count
        if (onCommentAdded) {
          onCommentAdded(reelId)
        }
      }
    } catch (error) {
      console.error('Error deleting reply:', error)
      alert('Failed to delete reply')
    }
  }

  const onEmojiClick = (emojiObject) => {
    if (activeEmojiPicker === 'comment') {
      setNewComment(prev => prev + emojiObject.emoji)
      setShowEmojiPicker(false)
    } else if (activeEmojiPicker === 'reply') {
      setReplyContent(prev => prev + emojiObject.emoji)
      setShowReplyEmojiPicker(false)
    }
    setActiveEmojiPicker(null)
  }

  const toggleEmojiPicker = (type) => {
    if (type === 'comment') {
      setShowEmojiPicker(!showEmojiPicker)
      setShowReplyEmojiPicker(false)
      setActiveEmojiPicker(showEmojiPicker ? null : 'comment')
    } else if (type === 'reply') {
      setShowReplyEmojiPicker(!showReplyEmojiPicker)
      setShowEmojiPicker(false)
      setActiveEmojiPicker(showReplyEmojiPicker ? null : 'reply')
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const canEditDelete = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMinutes = (now - created) / (1000 * 60)
    return diffMinutes <= 30
  }

  const startEditing = (type, id, content) => {
    if (type === 'comment') {
      setEditingComment(id)
      setEditingReply(null)
      setEditContent(content)
    } else if (type === 'reply') {
      setEditingReply(id)
      setEditingComment(null)
      setEditContent(content)
    }
  }

  const cancelEditing = () => {
    setEditingComment(null)
    setEditingReply(null)
    setEditContent('')
  }

  return (
    <div className={styles.commentsPanel}>
      <div className={styles.commentsHeader}>
        <h3>Comments</h3>
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>
      </div>

      <div className={styles.commentsList}>
        {loading ? (
          <div className={styles.commentsLoading}>
            <div className={styles.spinner}></div>
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.noComments}>
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map(comment => {
            console.log('Rendering comment:', comment)
            return (
              <div key={comment.id} className={styles.comment}>
                <img
                  src={comment.profiles?.avatar_url || '/default-avatar.svg'}
                  alt={comment.profiles?.username || 'User'}
                  className={styles.commentAvatar}
                />
                <div className={styles.commentContent}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentUsername}>
                      {comment.profiles?.username || comment.profiles?.full_name || 'Unknown User'}
                    </span>
                    <span className={styles.commentTime}>
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  {editingComment === comment.id ? (
                    <div className={styles.editCommentForm}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className={styles.editCommentTextarea}
                        maxLength={500}
                      />
                      <div className={styles.editCommentActions}>
                        <button
                          className={styles.editCommentSave}
                          onClick={() => handleEditComment(comment.id)}
                          disabled={!editContent.trim() || submitting}
                        >
                          {submitting ? '...' : 'Save'}
                        </button>
                        <button
                          className={styles.editCommentCancel}
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.commentText}>{comment.content}</p>
                  )}
                  <div className={styles.commentActions}>
                    {canEditDelete(comment.created_at) && currentUser && comment.user_id === currentUser.id && (
                      <>
                        <button 
                          className={styles.actionButton}
                          onClick={() => startEditing('comment', comment.id, comment.content)}
                        >
                          Edit
                        </button>
                        <button 
                          className={styles.actionButton}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button 
                      className={styles.actionButton}
                      onClick={() => setReplyTo(comment.id)}
                    >
                      Reply
                    </button>
                  </div>
                  
                  {/* Reply form */}
                  {replyTo === comment.id && (
                    <div className={styles.replyForm}>
                      <div className={styles.replyInputContainer}>
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className={styles.replyInput}
                          maxLength={500}
                        />
                        <button
                          type="button"
                          className={styles.emojiButton}
                          onClick={() => toggleEmojiPicker('reply')}
                          title="Add emoji"
                        >
                          😊
                        </button>
                      </div>
                      {showReplyEmojiPicker && (
                        <div className={styles.emojiPickerContainer} ref={replyEmojiPickerRef}>
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                      <div className={styles.replyActions}>
                        <button
                          className={styles.replySubmit}
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                        >
                          {submitting ? '...' : 'Reply'}
                        </button>
                        <button
                          className={styles.replyCancel}
                          onClick={() => {
                            setReplyTo(null)
                            setReplyContent('')
                            setShowReplyEmojiPicker(false)
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className={styles.repliesContainer}>
                      {comment.replies.map(reply => {
                        console.log('Rendering reply:', reply)
                        return (
                          <div key={reply.id} className={styles.reply}>
                            <img
                              src={reply.profiles?.avatar_url || '/default-avatar.svg'}
                              alt={reply.profiles?.username || 'User'}
                              className={styles.replyAvatar}
                            />
                            <div className={styles.replyContent}>
                              <div className={styles.replyHeader}>
                                <span className={styles.replyUsername}>
                                  {reply.profiles?.username || reply.profiles?.full_name || 'Unknown User'}
                                </span>
                                <span className={styles.replyTime}>
                                  {formatTimeAgo(reply.created_at)}
                                </span>
                              </div>
                              {editingReply === reply.id ? (
                                <div className={styles.editReplyForm}>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className={styles.editReplyTextarea}
                                    maxLength={500}
                                  />
                                  <div className={styles.editReplyActions}>
                                    <button
                                      className={styles.editReplySave}
                                      onClick={() => handleEditReply(reply.id)}
                                      disabled={!editContent.trim() || submitting}
                                    >
                                      {submitting ? '...' : 'Save'}
                                    </button>
                                    <button
                                      className={styles.editReplyCancel}
                                      onClick={cancelEditing}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className={styles.replyText}>{reply.content}</p>
                              )}
                              <div className={styles.replyActions}>
                                {canEditDelete(reply.created_at) && currentUser && reply.user_id === currentUser.id && (
                                  <>
                                    <button 
                                      className={styles.actionButton}
                                      onClick={() => startEditing('reply', reply.id, reply.content)}
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      className={styles.actionButton}
                                      onClick={() => handleDeleteReply(comment.id, reply.id)}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                                <button 
                                  className={styles.actionButton}
                                  onClick={() => setReplyTo(reply.id)}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Comment Form - Bottom Positioned */}
      {currentUser && (
        <form onSubmit={handleSubmit} className={styles.commentForm}>
          <img
            src={currentUser.avatar_url || '/default-avatar.svg'}
            alt={currentUser.username}
            className={styles.commentAvatar}
          />
          <div className={styles.commentInputContainer}>
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className={styles.commentInput}
              maxLength={500}
              disabled={submitting}
            />
            <button
              type="button"
              className={styles.emojiButton}
              onClick={() => toggleEmojiPicker('comment')}
              title="Add emoji"
            >
              😊
            </button>
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? '...' : 'Post'}
            </button>
          </div>
          {showEmojiPicker && (
            <div className={styles.emojiPickerContainer} ref={emojiPickerRef}>
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                width={300}
                height={400}
              />
            </div>
          )}
        </form>
      )}
    </div>
  )
}