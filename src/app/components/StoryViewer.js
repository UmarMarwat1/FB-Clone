'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseCLient'
import styles from './stories.module.css'

export default function StoryViewer({ stories, initialIndex = 0, onClose, currentUser, onEditStory, onDeleteStory }) {
  console.log('=== StoryViewer rendered ===')
  console.log('currentUser prop:', currentUser)
  console.log('stories prop:', stories)
  console.log('initialIndex:', initialIndex)
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [viewCount, setViewCount] = useState(0)
  const intervalRef = useRef(null)
  const videoRef = useRef(null)

  const currentStory = stories[currentStoryIndex]
  const hasMedia = currentStory?.story_media?.length > 0
  const currentMedia = hasMedia ? currentStory.story_media[currentMediaIndex] : null
  const isUserStory = currentStory?.user_id === currentUser?.id
  
  // Prevent background scrolling when story viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    
    return () => {
      // Restore background scrolling when component unmounts
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [])
  
  // Debug logging
  console.log('StoryViewer Debug:', {
    currentStoryId: currentStory?.id,
    currentStoryUserId: currentStory?.user_id,
    currentUserId: currentUser?.id,
    isUserStory,
    showOptions,
    currentStoryIndex,
    totalStories: stories.length
  })
  
  // Duration for different content types (in milliseconds)
  const getContentDuration = () => {
    if (currentMedia?.media_type === 'video') {
      return (currentMedia.duration || 15) * 1000
    }
    if (currentMedia?.media_type === 'image') {
      return 5000 // 5 seconds for images
    }
    return 5000 // 5 seconds for text-only stories
  }

  const duration = getContentDuration()

  // Mark story as viewed
  useEffect(() => {
    console.log('=== useEffect triggered ===')
    console.log('currentStory:', currentStory)
    console.log('currentUser:', currentUser)
    console.log('currentStory?.id:', currentStory?.id)
    console.log('currentUser?.id:', currentUser?.id)
    console.log('isUserStory:', isUserStory)
    
    if (currentStory && currentUser) {
      if (isUserStory) {
        // User is viewing their own story - fetch view count
        console.log('✅ User viewing own story - fetching view count')
        fetchViewCount(currentStory.id)
      } else {
        // User is viewing someone else's story - mark as viewed
        console.log('✅ User viewing someone else\'s story - marking as viewed')
        markAsViewed(currentStory.id)
      }
    } else {
      console.log('❌ Not calling functions - missing currentStory or currentUser')
      console.log('currentStory exists:', !!currentStory)
      console.log('currentUser exists:', !!currentUser)
    }
  }, [currentStory, currentUser])

  const markAsViewed = async (storyId) => {
    console.log('=== markAsViewed called ===')
    console.log('storyId:', storyId)
    console.log('currentUser?.id:', currentUser?.id)
    console.log('currentStory?.user_id:', currentStory?.user_id)
    console.log('isUserStory:', isUserStory)
    
    // Don't mark as viewed if no user or story
    if (!currentUser?.id || !storyId) {
      console.log('❌ Early return: missing user or story')
      return
    }

    // Don't count self-views
    if (isUserStory) {
      console.log('❌ Early return: self-view (not counting)')
      return
    }

    console.log('✅ Proceeding to record view...')

    try {
      console.log('Marking story as viewed:', storyId, 'by user:', currentUser.id)
      
      // Use Supabase client directly instead of API route
      const { data, error } = await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: currentUser.id,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'story_id,viewer_id'
        })

      console.log('Upsert result - data:', data)
      console.log('Upsert result - error:', error)

      if (error) {
        // Check if it's a table doesn't exist error
        if (error.message?.includes('relation "story_views" does not exist')) {
          console.warn('story_views table does not exist. Please run the setup SQL from STORY_VIEWS_SETUP.md')
          return
        }
        
        // Log other errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Story view tracking failed:', error.message)
        }
      } else {
        console.log('✅ Story view recorded successfully')
        // Don't fetch view count here since we're not the story owner
        // The story owner will fetch it when they view their own story
      }
    } catch (error) {
      console.log('❌ Exception in markAsViewed:', error)
      // Completely silent in production, only warn in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Story view tracking failed:', error.message)
      }
    }
  }

  const fetchViewCount = async (storyId) => {
    try {
      console.log('Fetching view count for story:', storyId)
      console.log('Current story user_id:', currentStory?.user_id)
      console.log('Current user id:', currentUser?.id)
      console.log('Is user story:', isUserStory)
      
      // Only fetch view count if this is the story owner
      if (!isUserStory) {
        console.log('Not story owner, not fetching view count')
        setViewCount(0)
        return
      }
      
      // First, let's try to get all views for this story without any filters
      const { data: allData, error: allError } = await supabase
        .from('story_views')
        .select('viewer_id')
        .eq('story_id', storyId)

      console.log('All views data (no filters):', allData)
      console.log('All views error:', allError)
      
      // Now try with the original query - exclude self-views
      const { data, error } = await supabase
        .from('story_views')
        .select('viewer_id')
        .eq('story_id', storyId)
        .neq('viewer_id', currentStory?.user_id) // Exclude self-views

      console.log('Filtered data from story_views:', data)
      console.log('Error from story_views query:', error)

      if (error) {
        // Check if it's a table doesn't exist error
        if (error.message?.includes('relation "story_views" does not exist')) {
          console.warn('story_views table does not exist. Please run the setup SQL from STORY_VIEWS_SETUP.md')
          setViewCount(0)
          return
        }
        
        console.log('Error fetching view count:', error)
        setViewCount(0)
        return
      }

      if (data) {
        // Count unique viewers (friends only, excluding self-views)
        const uniqueViewers = new Set(data.map(view => view.viewer_id))
        const count = uniqueViewers.size
        console.log('View count:', count, 'Unique viewers:', Array.from(uniqueViewers))
        setViewCount(count)
      } else {
        console.log('No data returned from story_views query')
        setViewCount(0)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to fetch view count:', error.message)
      }
      setViewCount(0)
    }
  }

  // Progress tracking
  useEffect(() => {
    if (isPaused) return

    const interval = 50 // Update every 50ms for smooth progress
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const increment = (interval / duration) * 100
        const newProgress = prev + increment

        if (newProgress >= 100) {
          nextContent()
          return 0
        }
        return newProgress
      })
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentStoryIndex, currentMediaIndex, isPaused, duration])

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current
    if (video && currentMedia?.media_type === 'video') {
      if (isPaused) {
        video.pause()
      } else {
        // Handle video play with proper error handling
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Ignore "play() request was interrupted" errors as they're expected
            if (error.name !== 'AbortError' && !error.message.includes('interrupted')) {
              console.warn('Video play error:', error)
            }
          })
        }
      }
    }
  }, [isPaused, currentMedia])

  const nextContent = () => {
    if (hasMedia && currentMediaIndex < currentStory.story_media.length - 1) {
      // Next media in current story
      setCurrentMediaIndex(prev => prev + 1)
      setProgress(0)
    } else {
      // Check if there's a next story from the same user
      const nextStoryIndex = currentStoryIndex + 1
      if (nextStoryIndex < stories.length && stories[nextStoryIndex].user_id === currentStory.user_id) {
        // Next story from same user
        console.log('Moving to next story from same user:', stories[nextStoryIndex].id)
        setCurrentStoryIndex(nextStoryIndex)
        setCurrentMediaIndex(0)
        setProgress(0)
      } else {
        // End of current user's stories - exit viewer
        console.log('End of user stories, closing viewer')
        handleCloseViewer()
      }
    }
  }

  const prevContent = () => {
    if (currentMediaIndex > 0) {
      // Previous media in current story
      setCurrentMediaIndex(prev => prev - 1)
      setProgress(0)
    } else {
      // Check if there's a previous story from the same user
      const prevStoryIndex = currentStoryIndex - 1
      if (prevStoryIndex >= 0 && stories[prevStoryIndex].user_id === currentStory.user_id) {
        // Previous story from same user
        const prevStory = stories[prevStoryIndex]
        console.log('Moving to previous story from same user:', prevStory.id)
        setCurrentStoryIndex(prevStoryIndex)
        setCurrentMediaIndex(Math.max(0, (prevStory.story_media?.length || 1) - 1))
        setProgress(0)
      } else {
        // If no previous story from same user, stay at current story
        console.log('No previous story from same user, staying at current story')
      }
    }
  }

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width

    if (clickX < width / 2) {
      prevContent()
    } else {
      nextContent()
    }
  }

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Escape':
        handleCloseViewer()
        break
      case 'ArrowLeft':
        prevContent()
        break
      case 'ArrowRight':
        nextContent()
        break
      case ' ':
        e.preventDefault()
        setIsPaused(prev => !prev)
        break
    }
  }

  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const storyTime = new Date(dateString)
    const diffMs = now - storyTime
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}m`
    }
    return `${diffHours}h`
  }

  // Generate progress bars for all content pieces
  const generateProgressBars = () => {
    // Get all stories from the same user
    const userStories = stories.filter(story => story.user_id === currentStory.user_id)
    const currentStoryIndexInUserStories = userStories.findIndex(story => story.id === currentStory.id)
    
    const bars = []

    for (let i = 0; i < userStories.length; i++) {
      let fillWidth = 0
      
      if (i < currentStoryIndexInUserStories) {
        // Stories already viewed
        fillWidth = 100
      } else if (i === currentStoryIndexInUserStories) {
        // Current story - show progress
        fillWidth = progress
      }
      // Stories not yet viewed remain at 0%

      bars.push(
        <div key={i} className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${fillWidth}%` }}
          />
        </div>
      )
    }

    return bars
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCloseViewer = useCallback(() => {
    // Restore background scrolling
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    
    // Use setTimeout to prevent state update during render
    setTimeout(() => {
      onClose()
    }, 0)
  }, [onClose])

  if (!currentStory) return null

  return (
    <div className={styles.storyViewer} onClick={handleClick}>
      <div className={styles.viewerHeader}>
        <div className={styles.progressBars}>
          {generateProgressBars()}
        </div>

                 <div className={styles.storyUserInfo}>
          <Image
            src={currentStory.profiles?.avatar_url || '/default-avatar.svg'}
            alt={currentStory.profiles?.username}
            width={40}
            height={40}
            className={styles.storyUserAvatar}
            onError={(e) => {
              e.target.src = '/default-avatar.svg'
            }}
          />
          <div>
            <div className={styles.storyUserName}>
              {currentStory.profiles?.full_name || currentStory.profiles?.username}
            </div>
            <div className={styles.storyTime}>
              {formatTimeAgo(currentStory.created_at)}
              {viewCount > 0 && (
                <span className={styles.storyViewCount}>
                  • {viewCount} view{viewCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button 
        className={styles.viewerCloseBtn} 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleCloseViewer()
        }}
        title="Close story"
        aria-label="Close story"
      >
        ×
      </button>

      {/* Story Options Menu */}
      {isUserStory && (
        <div className={styles.storyViewerOptions}>
          <button 
            className={styles.storyViewerOptionBtn}
            onClick={(e) => {
              e.stopPropagation()
              setShowOptions(!showOptions)
            }}
            title="More options"
          >
            ⋯
          </button>
          
          {showOptions && (
            <div className={styles.storyViewerOptionsMenu}>
              <button 
                className={styles.storyViewerOptionItem}
                onClick={(e) => {
                  e.stopPropagation()
                  // Immediately close the story viewer
                  handleCloseViewer()
                  // Call the edit function after a brief delay to ensure viewer is closed
                  setTimeout(() => {
                    onEditStory(currentStory.id)
                  }, 150)
                  setShowOptions(false)
                }}
              >
                ✏️ Edit Story
              </button>
              <button 
                className={styles.storyViewerOptionItem}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to delete this story?')) {
                    onDeleteStory(currentStory.id)
                    setShowOptions(false)
                  }
                }}
              >
                🗑️ Delete Story
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.storyContent}>
        {currentMedia ? (
          currentMedia.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentMedia.media_url}
              className={styles.storyMedia}
              muted
              playsInline
              loop={false}
              onEnded={nextContent}
              onClick={(e) => {
                e.stopPropagation()
                setIsPaused(prev => !prev)
              }}
            />
          ) : (
            <Image
              src={currentMedia.media_url}
              alt="Story content"
              width={400}
              height={600}
              className={styles.storyMedia}
            />
          )
        ) : (
          // Text-only story with background
          <div 
            className={styles.storyMedia}
            style={{
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'white',
              fontSize: '24px',
              textAlign: 'center',
              width: '100%',
              height: '100%',
              maxWidth: '400px',
              maxHeight: '600px'
            }}
          >
            {currentStory.text_content}
          </div>
        )}

        {currentStory.text_content && currentMedia && (
          <div className={styles.storyText}>
            {currentStory.text_content}
          </div>
        )}
      </div>

      {/* Story Views Section - Only show to story owner */}
      {isUserStory && (
        <div className={styles.storyViewsSection}>
          <div className={styles.storyViewsContent}>
            <span className={styles.storyViewsIcon}>👁️</span>
            <span className={styles.storyViewsText}>
              {viewCount > 0 ? `${viewCount} friend${viewCount !== 1 ? 's' : ''} viewed this story` : 'No views yet'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation areas */}
      <div 
        className={`${styles.navigationArea} ${styles.prevArea}`}
        onClick={(e) => {
          e.stopPropagation()
          prevContent()
        }}
      />
      <div 
        className={`${styles.navigationArea} ${styles.nextArea}`}
        onClick={(e) => {
          e.stopPropagation()
          nextContent()
        }}
      />

      {/* Pause indicator */}
      {isPaused && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '48px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          pointerEvents: 'none'
        }}>
          ⏸️
        </div>
      )}
    </div>
  )
}
