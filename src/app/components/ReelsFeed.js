'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseCLient'
import ReelPlayer from './ReelPlayer'
import ReelComments from './ReelComments'
import { useComments } from '../context/CommentsContext'
import styles from './reels.module.css'

export default function ReelsFeed({ currentUser }) {
  const [reels, setReels] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [showComments, setShowComments] = useState(false)
  const [selectedReelId, setSelectedReelId] = useState(null)
  const containerRef = useRef(null)
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)
  const { setCommentsOpen } = useComments()



  const fetchReels = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true)
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      console.log('Fetching reels with token:', token ? 'Present' : 'Missing')
      
      const response = await fetch(`/api/reels?page=${pageNum}&limit=10&userId=${currentUser?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      console.log('Reels API response:', data)

      if (data.success) {
        if (append) {
          setReels(prev => [...prev, ...data.reels])
        } else {
          setReels(data.reels)
        }
        
        if (data.reels.length < 10) {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error('Error fetching reels:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    fetchReels()
  }, [fetchReels])

  // Listen for reel deletion events
  useEffect(() => {
    const handleReelDeletedEvent = (event) => {
      handleReelDeleted(event.detail.reelId)
    }

    window.addEventListener('reelDeleted', handleReelDeletedEvent)

    return () => {
      window.removeEventListener('reelDeleted', handleReelDeletedEvent)
    }
  }, [])

  const handleScroll = (direction) => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else if (direction === 'down' && currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1)
      
      // Load more reels when near the end
      if (currentIndex >= reels.length - 3 && hasMore && !loading) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchReels(nextPage, true)
      }
    }
  }

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    touchEndY.current = e.changedTouches[0].clientY
    const diff = touchStartY.current - touchEndY.current
    
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        handleScroll('down')
      } else {
        handleScroll('up')
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleScroll('up')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleScroll('down')
    }
  }

  const handleView = async (reelId, watchDuration) => {
    try {
      console.log('handleView called with reelId:', reelId, 'watchDuration:', watchDuration)
      
      // Validate reelId before making API call
      if (!reelId || typeof reelId !== 'string' || reelId === 'view' || reelId === 'undefined') {
        console.error('Invalid reelId:', reelId)
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      // Round watchDuration to nearest integer since database expects integer
      const roundedDuration = Math.round(watchDuration)
      
      const response = await fetch(`/api/reels/${reelId}/view`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          watch_duration: roundedDuration
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('View tracking failed:', errorData)
        throw new Error(errorData.error || 'Failed to track view')
      }
      
      const result = await response.json()
      console.log('View tracked successfully:', result)
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  const handleLike = async (reelId, likeType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await fetch(`/api/reels/${reelId}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          like_type: likeType
        })
      })
  
      const data = await response.json()
      if (data.success) {
        // Update local state
        setReels(prev => prev.map(reel => 
          reel.id === reelId 
            ? { 
                ...reel, 
                like_count: data.action === 'created' 
                  ? (reel.like_count || 0) + 1 
                  : data.action === 'removed'
                    ? Math.max(0, (reel.like_count || 0) - 1)
                    : reel.like_count
              }
            : reel
        ))
      }
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }

  const handleComment = (reelId) => {
    // Open comments section on the right side
    setSelectedReelId(reelId)
    setShowComments(true)
    setCommentsOpen(true)
  }

  const handleShare = async (reelId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      await fetch(`/api/reels/${reelId}/share`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: currentUser?.id,
          share_type: 'external'
        })
      })

      // Copy link to clipboard
      const reelUrl = `${window.location.origin}/reels/${reelId}`
      await navigator.clipboard.writeText(reelUrl)
      alert('Reel link copied to clipboard!')
    } catch (error) {
      console.error('Error sharing reel:', error)
    }
  }

  const handleCloseComments = () => {
    setShowComments(false)
    setSelectedReelId(null)
    setCommentsOpen(false)
  }

  const handleCommentAdded = (reelId) => {
    console.log('handleCommentAdded called for reel:', reelId)
    // Update comment count when a new comment or reply is added
    setReels(prev => {
      const updated = prev.map(reel => 
        reel.id === reelId 
          ? { ...reel, comment_count: (reel.comment_count || 0) + 1 }
          : reel
      )
      console.log('Updated reels with new comment count:', updated.find(r => r.id === reelId))
      return updated
    })
  }

  const handleReelDeleted = (reelId) => {
    console.log('Reel deleted:', reelId)
    // Remove the deleted reel from the local state
    setReels(prev => prev.filter(reel => reel.id !== reelId))
    
    // Adjust current index if necessary
    if (currentIndex >= reels.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
    
    // Close comments if they were open for the deleted reel
    if (selectedReelId === reelId) {
      setShowComments(false)
      setSelectedReelId(null)
      setCommentsOpen(false)
    }
  }

  if (loading && reels.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading Amazing Reels...</p>
      </div>
    )
  }

  // Debug: Log reels data
  console.log('ReelsFeed render - loading:', loading, 'reels count:', reels.length, 'reels:', reels)

  if (reels.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎬</div>
        <h2>No Reels Available</h2>
        <p>Start your creative journey by creating your first reel or follow more people to discover amazing content!</p>
        <a href="/reels/upload" className={styles.createReelButton}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Create Your First Reel
        </a>
      </div>
    )
  }

  // Don't render if reels are not loaded or if there are no reels
  if (!reels || reels.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎬</div>
        <h2>No Reels Available</h2>
        <p>Start your creative journey by creating your first reel or follow more people to discover amazing content!</p>
        <a href="/reels/upload" className={styles.createReelButton}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Create Your First Reel
        </a>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.reelsFeed} ${showComments ? styles.withComments : ''}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {reels.map((reel, index) => (
        <div
          key={reel.id}
          className={`${styles.reelSlide} ${
            index === currentIndex ? styles.active : ''
          }`}
          style={{
            transform: `translateY(${(index - currentIndex) * 100}vh)`
          }}
        >
          <ReelPlayer
            reel={reel}
            isActive={index === currentIndex}
            onView={handleView}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            currentUser={currentUser}
          />
        </div>
      ))}

      <div className={styles.navigation}>
        <button 
          className={styles.navButton}
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
        >
          ↑
        </button>
        <span className={styles.indicator}>
          {currentIndex + 1} / {reels.length}
        </span>
        <button 
          className={styles.navButton}
          onClick={() => handleScroll('down')}
          disabled={currentIndex >= reels.length - 1}
        >
          ↓
        </button>
      </div>

      {showComments && selectedReelId && (
        <>
          {/* Backdrop overlay */}
          <div className={styles.commentsBackdrop} onClick={handleCloseComments} />
          <ReelComments
            reelId={selectedReelId}
            onClose={handleCloseComments}
            currentUser={currentUser}
            onCommentAdded={handleCommentAdded}
          />
        </>
      )}
    </div>
  )
}