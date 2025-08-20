'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseCLient'
import { useStories } from '../context/StoriesContext'
import styles from './stories.module.css'
import StoryUpload from './StoryUpload'
import StoryViewer from './StoryViewer'
import StoryEdit from './StoryEdit'

export default function StoriesFeed({ currentUser }) {
  const { stories, loading, error, fetchStories, refreshStories, isCacheValid, lastFetchTime } = useStories()
  const [showUpload, setShowUpload] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0)
  const [selectedStory, setSelectedStory] = useState(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Fetch stories once per user (prevent infinite re-fetch loops)
  const fetchedForUserRef = useRef(null)
  useEffect(() => {
    const userId = currentUser?.id
    if (!userId) return
    // Only fetch if we haven't already fetched for this user id
    if (fetchedForUserRef.current !== userId) {
      fetchedForUserRef.current = userId
      fetchStories()
    }
  }, [currentUser?.id])
  

  const handleStoryClick = (index) => {
    setSelectedStoryIndex(index)
    setShowViewer(true)
  }

  const handleStoryCreated = useCallback((newStory) => {
    // Refresh stories after creating a new one
    refreshStories()
  }, [refreshStories])

  const handleCloseViewer = useCallback(() => {
    // Use setTimeout to prevent state update during render
    setTimeout(() => {
      setShowViewer(false)
    }, 0)
  }, [])

  const handleCloseUpload = useCallback(() => {
    // Use setTimeout to prevent state update during render
    setTimeout(() => {
      setShowUpload(false)
    }, 0)
  }, [])

  const handleCloseEdit = useCallback(() => {
    // Use setTimeout to prevent state update during render
    setTimeout(() => {
      setShowEdit(false)
      setSelectedStory(null)
    }, 0)
  }, [])

  const handleStoryUpdated = useCallback(() => {
    // Refresh stories after updating
    refreshStories()
  }, [refreshStories])

  // Check if navigation arrows should be shown
  const checkScrollArrows = useCallback(() => {
    const container = document.querySelector(`.${styles.storiesContainer}`)
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }, [])

  const formatTimeAgo = useCallback((dateString) => {
    const now = new Date()
    const storyTime = new Date(dateString)
    const diffMs = now - storyTime
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}m ago`
    }
    return `${diffHours}h ago`
  }, [])

  const getStoryPreview = useCallback((story) => {
    // Get the first media item or use a default for text-only stories
    if (story.story_media && story.story_media.length > 0) {
      const firstMedia = story.story_media[0]
      if (firstMedia.media_type === 'video') {
        return firstMedia.thumbnail_url || firstMedia.media_url
      }
      return firstMedia.media_url
    }
    
    // For text-only stories, return user's profile picture or default avatar
    return story.profiles?.avatar_url || '/default-avatar.svg'
  }, [])

  const isUserStory = useCallback((story) => {
    return story.user_id === currentUser?.id
  }, [currentUser?.id])

  // Group stories by user (combine multiple stories from same user)
  const groupedStories = useMemo(() => {
    // Stories are already sorted by user_id and created_at in the context
    const grouped = stories.reduce((acc, story) => {
      const existingUserIndex = acc.findIndex(group => group.user_id === story.user_id)
      
      if (existingUserIndex !== -1) {
        acc[existingUserIndex].stories.push(story)
        // Update to show the latest story time
        if (new Date(story.created_at) > new Date(acc[existingUserIndex].latest_time)) {
          acc[existingUserIndex].latest_time = story.created_at
          acc[existingUserIndex].preview_image = getStoryPreview(story)
        }
      } else {
        acc.push({
          user_id: story.user_id,
          username: story.profiles?.username,
          full_name: story.profiles?.full_name,
          avatar_url: story.profiles?.avatar_url,
          latest_time: story.created_at,
          preview_image: getStoryPreview(story),
          stories: [story],
          is_own_story: isUserStory(story)
        })
      }
      
      return acc
    }, [])

    // Sort grouped stories - user's own stories first, then by latest time
    grouped.sort((a, b) => {
      if (a.is_own_story && !b.is_own_story) return -1
      if (!a.is_own_story && b.is_own_story) return 1
      return new Date(b.latest_time) - new Date(a.latest_time)
    })

    return grouped
  }, [stories, getStoryPreview, isUserStory])

  // Check scroll arrows when stories change
  useEffect(() => {
    if (groupedStories.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(checkScrollArrows, 100)
    }
  }, [groupedStories, checkScrollArrows])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(checkScrollArrows, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [checkScrollArrows])

  const handleGroupClick = (group) => {
    // Find the index of the first story in this group
    // Since stories are sorted by user_id and then by created_at, 
    // we need to find the first story for this user
    const firstStoryIndex = stories.findIndex(story => 
      story.user_id === group.user_id
    )
    
    if (firstStoryIndex !== -1) {
      console.log('Opening story viewer for user:', group.username, 'at index:', firstStoryIndex)
      handleStoryClick(firstStoryIndex)
    }
  }

  const handleEditStory = (storyId) => {
    const story = stories.find(s => s.id === storyId)
    if (story) {
      setSelectedStory(story)
      setShowEdit(true)
    }
  }

  const handleDeleteStory = async (storyId) => {
    if (confirm('Are you sure you want to delete this story?')) {
      try {
        const { error } = await supabase
          .from('stories')
          .delete()
          .eq('id', storyId)
          .eq('user_id', currentUser.id)

        if (error) {
          console.error('Error deleting story:', error)
          alert('Failed to delete story')
        } else {
          // Refresh stories after deletion
          refreshStories()
        }
      } catch (error) {
        console.error('Error deleting story:', error)
        alert('Failed to delete story')
      }
    }
  }

  if (loading) {
    return (
      <div className={styles.storiesSection}>
        <div className={styles.storiesLoadingContainer}>
          <div className={styles.storiesLoadingContent}>
            <div className={styles.storiesLoadingSpinner}></div>
            <p className={styles.storiesLoadingText}>Loading stories...</p>
            <div className={styles.storiesLoadingDots}>
              <div className={styles.storiesLoadingDot}></div>
              <div className={styles.storiesLoadingDot}></div>
              <div className={styles.storiesLoadingDot}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.storiesSection}>
        <div className={styles.storiesContainer}>
          <div style={{ 
            padding: '20px', 
            color: '#e41e3f',
            backgroundColor: '#ffe6e6',
            borderRadius: '8px',
            margin: '10px',
            border: '1px solid #e41e3f'
          }}>
            <strong>Stories Error:</strong><br/>
            {error}
            {error.includes('Missing database tables') && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                <p>Please set up the database by:</p>
                <ol>
                  <li>Running the SQL commands from STORIES_SETUP.md</li>
                  <li>Creating the &apos;stories&apos; storage bucket in Supabase</li>
                  <li>Setting up the storage policies</li>
                </ol>
              </div>
            )}
            <button 
              onClick={() => {
                if (currentUser) {
                  refreshStories()
                }
              }}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>

      
             <div className={styles.storiesSection}>
         {/* Left Navigation Arrow */}
         {showLeftArrow && (
           <button className={styles.navArrow} onClick={() => {
             const container = document.querySelector(`.${styles.storiesContainer}`)
             if (container) {
               container.scrollBy({ left: -400, behavior: 'smooth' })
               // Check arrows after scrolling
               setTimeout(checkScrollArrows, 500)
             }
           }}>
             ‹
           </button>
         )}

         <div 
           className={styles.storiesContainer}
           onScroll={checkScrollArrows}
           style={{
             WebkitOverflowScrolling: 'touch',
             touchAction: 'pan-x',
             overflowX: 'auto',
             scrollBehavior: 'smooth'
           }}
         >
                     {/* Add Story Button */}
          <div 
            className={`${styles.storyItem} ${styles.addStory}`}
            onClick={() => setShowUpload(true)}
          >
             <div className={styles.storyImage}>
               {/* Show user's profile picture or default avatar */}
               <Image 
                 src={currentUser?.avatar_url || '/default-avatar.svg'}
                 alt="Your profile"
                 width={60}
                 height={60}
                 onError={(e) => {
                   e.target.src = '/default-avatar.svg'
                 }}
               />
               <div className={styles.addIcon}>+</div>
             </div>
             <span className={styles.storyName}>Create story</span>
           </div>

                               {/* Stories from friends and user */}
          {groupedStories.map((group, index) => (
            <div 
              key={`${group.user_id}-${index}`}
              className={styles.storyItem}
            >
              <div 
                className={styles.storyImage}
                onClick={() => handleGroupClick(group)}
              >
                <Image 
                  src={group.preview_image} 
                  alt={group.full_name || group.username}
                  width={60}
                  height={60}
                  onError={(e) => {
                    e.target.src = group.avatar_url || '/default-avatar.svg'
                  }}
                />
                
                {/* Profile picture overlay */}
                <div className={styles.storyProfilePic}>
                  <Image 
                    src={group.avatar_url || '/default-avatar.svg'}
                    alt={group.full_name || group.username}
                    width={30}
                    height={30}
                    onError={(e) => {
                      e.target.src = '/default-avatar.svg'
                    }}
                  />
                </div>
              </div>
              <span className={styles.storyName}>
                {group.is_own_story ? 'Your Story' : (group.full_name || group.username)}
              </span>
            </div>
          ))}

          {groupedStories.length === 0 && (
            <div style={{ padding: '20px', color: '#65676b' }}>
              No stories to show. Be the first to share a story!
            </div>
          )}
         </div>

         {/* Right Navigation Arrow */}
         {showRightArrow && (
           <button className={styles.navArrow} onClick={() => {
             const container = document.querySelector(`.${styles.storiesContainer}`)
             if (container) {
               container.scrollBy({ left: 400, behavior: 'smooth' })
               // Check arrows after scrolling
               setTimeout(checkScrollArrows, 500)
             }
           }}>
             ›
           </button>
         )}
       </div>

      {/* Story Upload Modal */}
      {showUpload && (
        <StoryUpload
          isOpen={showUpload}
          onClose={handleCloseUpload}
          onStoryCreated={handleStoryCreated}
          currentUser={currentUser}
        />
      )}

             {/* Story Viewer */}
       {showViewer && stories.length > 0 && (
         <StoryViewer
           stories={stories}
           initialIndex={selectedStoryIndex}
           onClose={handleCloseViewer}
           currentUser={currentUser}
           onEditStory={handleEditStory}
           onDeleteStory={handleDeleteStory}
         />
       )}

      {/* Story Edit Modal */}
      {showEdit && selectedStory && (
        <StoryEdit
          isOpen={showEdit}
          onClose={handleCloseEdit}
          story={selectedStory}
          onStoryUpdated={handleStoryUpdated}
          currentUser={currentUser}
        />
      )}
    </>
  )
}
