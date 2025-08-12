'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabaseCLient'
import styles from './stories.module.css'

export default function StoryViewer({ stories, initialIndex = 0, onClose, currentUser, onEditStory, onDeleteStory }) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const intervalRef = useRef(null)
  const videoRef = useRef(null)

  const currentStory = stories[currentStoryIndex]
  const hasMedia = currentStory?.story_media?.length > 0
  const currentMedia = hasMedia ? currentStory.story_media[currentMediaIndex] : null
  const isUserStory = currentStory?.user_id === currentUser?.id
  
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
    if (currentStory && currentUser) {
      markAsViewed(currentStory.id)
    }
  }, [currentStory, currentUser])

  const markAsViewed = async (storyId) => {
    // Don't mark as viewed if no user or story
    if (!currentUser?.id || !storyId) {
      return
    }

    try {
      // Use Supabase client directly instead of API route
      const { error } = await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: currentUser.id,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'story_id,viewer_id'
        })

      // Only log errors in development mode and if they're not expected
      if (error && process.env.NODE_ENV === 'development') {
        const errorMessage = error.message || error.toString() || ''
        const isExpectedError = errorMessage.includes('relation "story_views" does not exist') ||
                               errorMessage.includes('duplicate key value') ||
                               errorMessage.includes('already exists') ||
                               errorMessage.includes('permission denied')
        
        if (!isExpectedError) {
          console.warn('Story view tracking failed:', errorMessage)
        }
      }
    } catch (error) {
      // Completely silent in production, only warn in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Story view tracking failed:', error.message)
      }
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
        onClose()
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
        onClose()
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

  if (!currentStory) return null

  return (
    <div className={styles.storyViewer} onClick={handleClick}>
      <div className={styles.viewerHeader}>
        <div className={styles.progressBars}>
          {generateProgressBars()}
        </div>

                 <div className={styles.storyUserInfo}>
           <img
             src={currentStory.profiles?.avatar_url || '/default-avatar.svg'}
             alt={currentStory.profiles?.username}
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
            </div>
          </div>
        </div>
      </div>

      <button 
        className={styles.viewerCloseBtn} 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
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
                  onEditStory(currentStory.id)
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
            <img
              src={currentMedia.media_url}
              alt="Story content"
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
