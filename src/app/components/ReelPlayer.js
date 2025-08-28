'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentSession } from '../../../lib/supabaseCLient'
import styles from './reels.module.css'

export default function ReelPlayer({ 
  reel, 
  isActive, 
  onView, 
  onLike, 
  onComment, 
  onShare, 
  currentUser 
}) {
  const router = useRouter()
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [watchTime, setWatchTime] = useState(0)
  const [viewTracked, setViewTracked] = useState(false)
  const [videoError, setVideoError] = useState(null)
  const watchTimeRef = useRef(0)

  // Debug logging
  useEffect(() => {
    if (reel) {
      console.log('ReelPlayer received reel:', {
        id: reel.id,
        video_url: reel.video_url,
        thumbnail_url: reel.thumbnail_url,
        caption: reel.caption
      });
    }
  }, [reel]);

  // Check if reel is saved by current user
  useEffect(() => {
    const checkSaveStatus = async () => {
      if (!currentUser || !reel) return;
      
      try {
        const session = await getCurrentSession()
        const token = session?.access_token
        
        if (!token) return;
        
        const response = await fetch(`/api/reels/save?reel_id=${reel.id}&user_id=${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsSaved(data.saved)
        }
      } catch (error) {
        console.error('Error checking save status:', error)
      }
    }
    
    checkSaveStatus()
  }, [currentUser, reel])

  // Check if current user is following the reel uploader
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !reel?.profiles?.id) return;
      
      try {
        const session = await getCurrentSession()
        const token = session?.access_token
        
        if (!token) return;
        
        const response = await fetch(`/api/follow/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            follower_id: currentUser.id,
            following_id: reel.profiles.id
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.following)
        }
      } catch (error) {
        console.error('Error checking follow status:', error)
      }
    }
    
    checkFollowStatus()
  }, [currentUser, reel])

  // Handle save/unsave
  const handleSave = async () => {
    if (!currentUser || !reel) return;
    
    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      if (!token) return;
      
      const response = await fetch('/api/reels/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reel_id: reel.id,
          user_id: currentUser.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.saved)
      }
    } catch (error) {
      console.error('Error saving/unsaving reel:', error)
    }
  }

  // Check if browser supports the video format
  const checkVideoSupport = (url) => {
    if (!url) return false;
    
    const video = document.createElement('video');
    const supportedFormats = {
      'video/mp4': video.canPlayType('video/mp4'),
      'video/webm': video.canPlayType('video/webm'),
      'video/ogg': video.canPlayType('video/ogg')
    };
    
    // Determine format from URL
    let format = 'video/mp4'; // default
    if (url.includes('.webm')) format = 'video/webm';
    else if (url.includes('.ogg')) format = 'video/ogg';
    
    const support = supportedFormats[format];
    console.log(`Browser support for ${format}:`, support);
    
    return support !== '';
  };

  // Validate video URL
  const isValidVideoUrl = (url) => {
    if (!url) return false;
    
    // Check if it's a valid URL
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.warn('Invalid video URL protocol:', urlObj.protocol);
        return false;
      }
      
      // Check for supported video file extensions
      const supportedExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
      const hasSupportedExtension = supportedExtensions.some(ext => 
        url.toLowerCase().includes(ext)
      );
      
      if (!hasSupportedExtension) {
        console.warn('Video URL does not have a supported extension:', url);
        console.warn('Supported formats:', supportedExtensions.join(', '));
        // Still return true as some URLs might work without extensions
      }
      
      // Check browser support for the format
      if (!checkVideoSupport(url)) {
        console.warn('Browser may not support this video format:', url);
      }
      
      // Log the video URL for debugging
      console.log('Validating video URL:', url);
      
      return true;
    } catch (error) {
      console.error('Invalid video URL format:', url, error);
      return false;
    }
  };

  const handleLoadedMetadata = () => {
    // Video metadata loaded
  }

  const handleTimeUpdate = () => {
    // This function is now handled in the useEffect with event listeners
    // Keeping it here to prevent the error, but it won't be used
  }

  const handleEnded = () => {
    setIsPlaying(false)
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleError = (event) => {
    const video = event.target;
    const error = video.error;
    
    if (error) {
      let errorMessage = 'Unknown video error';
      
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          console.log('Video loading was aborted');
          errorMessage = 'Video loading was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          console.error('Video network error occurred');
          errorMessage = 'Network error - video cannot be loaded';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          console.error('Video decoding error occurred - format may not be supported');
          errorMessage = 'Video format not supported by your browser';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          console.error('Video source not supported by browser:', video.src);
          errorMessage = 'Video format not supported by your browser. Try using MP4 format.';
          // This is likely the main issue - unsupported video format
          break;
        default:
          console.error('Video error occurred:', error);
          errorMessage = 'Video playback error occurred';
      }
      
      setVideoError(errorMessage);
    } else {
      console.error('Video error event occurred but no error details available');
      setVideoError('Video playback error occurred');
    }
    
    // Set video as not playing to prevent further errors
    setIsPlaying(false);
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoError) return

    if (isActive) {
      // Try to play video, but handle autoplay restrictions gracefully
      const playVideo = async () => {
        try {
          await video.play()
          setIsPlaying(true)
        } catch (error) {
          // Handle autoplay restrictions
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay blocked - user interaction required')
            // Don't show error, just keep video paused
            setIsPlaying(false)
          } else {
            console.error('Video play error:', error)
            setIsPlaying(false)
          }
        }
      }
      
      playVideo()
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [isActive, videoError])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      watchTimeRef.current = video.currentTime
      setWatchTime(video.currentTime)
      
      // Track view only once after 3 seconds
      if (video.currentTime >= 3 && onView && reel && reel.id && !viewTracked) {
        setViewTracked(true)
        onView(reel.id, video.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [reel.id, viewTracked]) // Include viewTracked to prevent re-adding listeners unnecessarily

  // Reset viewTracked when reel changes
  useEffect(() => {
    setViewTracked(false)
  }, [reel.id])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    if (onLike) {
      onLike(reel.id, !isLiked ? 'like' : null)
    }
  }

  const handleComment = () => {
    setShowComments(true)
    if (onComment) {
      onComment(reel.id)
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(reel.id)
    }
  }

  const handleFollow = async (userId) => {
    if (!userId || !currentUser) return
    
    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      if (isFollowing) {
        // Unfollow the user
        const response = await fetch('/api/follow', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            follower_id: currentUser.id,
            following_id: userId
          })
        })
        
        if (response.ok) {
          setIsFollowing(false)
          console.log('Unfollowed successfully')
        }
      } else {
        // Follow the user
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          follower_id: currentUser.id,
          following_id: userId
        })
      })
      
      if (response.ok) {
          setIsFollowing(true)
        console.log('Followed successfully')
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error)
    }
  }

  const handleScroll = (direction) => {
    // This will be handled by the parent ReelsFeed component
    // We can emit an event or call a callback if needed
    console.log(`Scroll ${direction} requested`)
  }

  const navigateToProfile = (username) => {
    if (username) {
      router.push(`/profile/${username}`)
    }
  }

  const handleDeleteReel = async () => {
    if (!currentUser || !reel) return;
    
    // Only allow deletion if current user is the reel owner
    if (currentUser.id !== reel.user_id) {
      console.error('User not authorized to delete this reel')
      return;
    }
    
    if (!confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
      return;
    }
    
    try {
      const session = await getCurrentSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await fetch(`/api/reels/${reel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        console.log('Reel deleted successfully')
        // Emit an event to parent component to remove this reel from the feed
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('reelDeleted', { detail: { reelId: reel.id } }))
        }
      } else {
        const errorData = await response.json()
        console.error('Error deleting reel:', errorData)
        alert('Failed to delete reel. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting reel:', error)
      alert('Failed to delete reel. Please try again.')
    }
  }

  return (
    <div className={styles.reelPlayer}>
      <div className={styles.videoContainer}>
        <div className={styles.videoWrapper}>
          {/* Top-right video controls */}
          <div className={styles.videoControls}>
          <button className={styles.controlButton} onClick={togglePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          
          <button className={styles.controlButton} onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = !videoRef.current.muted;
            }
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          
          <div className={styles.dropdownMenu}>
            <button className={styles.controlButton}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            <div className={styles.dropdownContent}>
              <button className={styles.dropdownItem} onClick={handleSave}>
                {isSaved ? (
                  <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
                    Unsave video
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    Save video
                  </>
                )}
              </button>
              
              {/* Show delete button only to reel owner */}
              {currentUser && reel.user_id === currentUser.id && (
                <button className={`${styles.dropdownItem} ${styles.deleteItem}`} onClick={handleDeleteReel}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Delete reel
                </button>
              )}
            </div>
          </div>
        </div>

        {reel.video_url && isValidVideoUrl(reel.video_url) && !videoError ? (
          <>
            <video
              ref={videoRef}
              className={styles.reelVideo}
              src={reel.video_url}
              poster={reel.thumbnail_url || ''}
              loop
              muted={!isActive}
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onError={handleError}
              onLoadStart={() => {
                console.log('Video loading started:', reel.video_url)
                setVideoError(null) // Clear any previous errors
              }}
              onCanPlay={() => {
                console.log('Video can play:', reel.video_url)
                setVideoError(null) // Clear any previous errors
              }}
              onCanPlayThrough={() => console.log('Video can play through:', reel.video_url)}
              style={{ pointerEvents: 'none' }}
            />
            
            {/* Bottom user info overlay */}
            <div className={styles.bottomInfo}>
            <div className={styles.userInfo}>
              <img 
                src={reel.profiles?.avatar_url || '/default-avatar.svg'} 
                alt={reel.profiles?.username || 'User'} 
                className={styles.userAvatar}
                onClick={() => navigateToProfile(reel.profiles?.username)}
              />
              <div className={styles.userDetails}>
                <div className={styles.userHeader}>
                  <span 
                    className={styles.username}
                    onClick={() => navigateToProfile(reel.profiles?.username)}
                  >
                    {reel.profiles?.username || reel.profiles?.full_name || 'Unknown User'}
                  </span>
                  {reel.profiles?.verified && (
                    <span className={styles.verifiedBadge}>✓</span>
                  )}
                </div>
                <button 
                  className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
                  onClick={() => handleFollow(reel.profiles?.id)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>
            
            <div className={styles.captionSection}>
              <p className={styles.caption}>{reel.caption || 'No caption'}</p>
              {reel.hashtags && (
                <div className={styles.hashtags}>
                  {reel.hashtags.split(' ').map((tag, index) => (
                    <span key={index} className={styles.hashtag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.audioInfo}>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.audioIcon}>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              <span className={styles.audioSource}>
                {reel.profiles?.username || 'Unknown'} · Original audio
              </span>
            </div>
          </div>
          
          {/* Right-side actions */}
          <div className={styles.rightActions}>
            <button className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`} onClick={handleLike}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill={isLiked ? 'red' : 'currentColor'} width="20" height="20">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className={styles.actionCount}>{reel.like_count || 0}</span>
            </button>
            
            <button className={styles.actionButton} onClick={handleComment}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
                </svg>
              </div>
              <span className={styles.actionCount}>{reel.comment_count || 0}</span>
            </button>
            
            <button className={styles.actionButton} onClick={handleShare}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
              <span className={styles.actionCount}>{reel.share_count || 0}</span>
            </button>
            
            <button className={`${styles.actionButton} ${isSaved ? styles.saved : ''}`} onClick={handleSave}>
              <div className={styles.actionIcon}>
                {isSaved ? (
                  // Bookmark filled (saved)
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                ) : (
                  // Bookmark outline (not saved)
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                )}
              </div>
              <span className={styles.actionCount}>
                {isSaved ? 'Saved' : 'Save'}
              </span>
            </button>
            
            <div className={styles.actionButton}>
              <div className={styles.actionIcon}>
                <img 
                  src={reel.profiles?.avatar_url || '/default-avatar.svg'} 
                  alt="Profile" 
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
              </div>
            </div>
          </div>
        </>
        ) : (
          <div className={styles.videoError}>
            {videoError ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#e74c3c' }}>Video Error</h3>
                <p style={{ margin: '0 0 16px 0', color: '#666' }}>{videoError}</p>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <strong>Supported formats:</strong> MP4, WebM, OGG
                  <br />
                  <strong>Recommended:</strong> MP4 (H.264) for best compatibility
                </div>
                <button 
                  onClick={() => {
                    setVideoError(null)
                    if (videoRef.current) {
                      videoRef.current.load() // Try to reload the video
                    }
                  }}
                  style={{
                    background: '#1da1f2',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <p>{!reel.video_url ? 'Video not available' : 'Invalid video URL'}</p>
            {reel.video_url && (
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                URL: {reel.video_url}
              </p>
            )}
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}