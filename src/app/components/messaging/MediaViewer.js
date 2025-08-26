"use client"
import { useState, useEffect, useRef } from "react"
import styles from "./messaging.module.css"

export default function MediaViewer({ media, isOpen, onClose }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [aspectRatio, setAspectRatio] = useState('landscape') // Default aspect ratio
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobileLandscape, setIsMobileLandscape] = useState(false)
  const videoRef = useRef(null)
  const imageRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024)
  }

  // Detect screen orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      if (!isMobile()) return

      const isLandscape = window.innerWidth > window.innerHeight
      setIsMobileLandscape(isLandscape)

      // Auto-enter fullscreen for landscape images on mobile
      if (media?.message_type === 'image' && isLandscape && aspectRatio === 'landscape') {
        if (!isFullscreen) {
          enterFullscreenForImage()
        }
      } else if (!isLandscape && isFullscreen) {
        // Exit fullscreen when returning to portrait
        exitFullscreen()
      }
    }

    // Initial check
    handleOrientationChange()

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [media?.message_type, aspectRatio, isFullscreen])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          exitFullscreen()
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, isFullscreen])

  // Auto-hide controls for videos
  useEffect(() => {
    if (media?.message_type === 'video' && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying, media?.message_type])

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      // Detect video aspect ratio
      const video = videoRef.current
      const ratio = video.videoWidth / video.videoHeight
      setAspectRatio(ratio > 1 ? 'landscape' : 'portrait')
    }
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      // Detect image aspect ratio
      const img = imageRef.current
      const ratio = img.naturalWidth / img.naturalHeight
      setAspectRatio(ratio > 1 ? 'landscape' : 'portrait')
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const seekTime = (clickX / width) * duration
    
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const enterFullscreenForImage = async () => {
    if (!imageRef.current) return

    try {
      if (imageRef.current.requestFullscreen) {
        await imageRef.current.requestFullscreen()
      } else if (imageRef.current.webkitRequestFullscreen) {
        await imageRef.current.webkitRequestFullscreen()
      } else if (imageRef.current.mozRequestFullScreen) {
        await imageRef.current.mozRequestFullScreen()
      } else if (imageRef.current.msRequestFullscreen) {
        await imageRef.current.msRequestFullscreen()
      }
    } catch (error) {
      console.error('Error entering fullscreen for image:', error)
    }
  }

  const toggleFullscreen = async () => {
    if (!videoRef.current && !imageRef.current) return

    try {
      if (!isFullscreen) {
        const element = videoRef.current || imageRef.current
        if (element.requestFullscreen) {
          await element.requestFullscreen()
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen()
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen()
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen()
        }
      } else {
        await exitFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen()
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error)
    }
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getAspectRatioClass = () => {
    if (media?.message_type === 'image') {
      return aspectRatio === 'portrait' ? styles.portraitImage : styles.landscapeImage
    }
    
    if (media?.message_type === 'video') {
      return aspectRatio === 'portrait' ? styles.portraitVideo : styles.landscapeVideo
    }
    
    return ''
  }

  // Add mobile landscape class for automatic fullscreen behavior
  const getMobileLandscapeClass = () => {
    if (isMobile() && isMobileLandscape && media?.message_type === 'image' && aspectRatio === 'landscape') {
      return styles.mobileLandscapeFullscreen
    }
    return ''
  }

  if (!isOpen || !media) return null

  return (
    <div className={styles.mediaViewerOverlay} onClick={onClose}>
      <div 
        className={`${styles.mediaViewer} ${getAspectRatioClass()} ${getMobileLandscapeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className={styles.mediaViewerClose} onClick={onClose}>
          ✕
        </button>

        {/* Media Content */}
        <div className={styles.mediaViewerContent}>
          {media.message_type === 'image' && (
            <img 
              ref={imageRef}
              src={media.media_url} 
              alt="Media content"
              className={styles.mediaViewerImage}
              onLoad={handleImageLoad}
            />
          )}

          {media.message_type === 'video' && (
            <div className={styles.mediaViewerVideoContainer}>
              <video
                ref={videoRef}
                src={media.media_url}
                className={styles.mediaViewerVideo}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onMouseMove={() => {
                  setShowControls(true)
                  if (controlsTimeoutRef.current) {
                    clearTimeout(controlsTimeoutRef.current)
                  }
                }}
              />
              
              {/* Video Controls */}
              {showControls && (
                <div className={styles.videoControls}>
                  {/* Play/Pause Button */}
                  <button 
                    className={styles.controlButton}
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>

                  {/* Progress Bar */}
                  <div 
                    className={styles.progressBar}
                    onClick={handleSeek}
                  >
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  {/* Time Display */}
                  <span className={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Volume Control */}
                  <div className={styles.volumeControl}>
                    <span className={styles.volumeIcon}>🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className={styles.volumeSlider}
                    />
                  </div>

                  {/* Fullscreen Button */}
                  <button 
                    className={styles.controlButton}
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? '⏹️' : '⛶'}
                  </button>
                </div>
              )}
            </div>
          )}

          {media.message_type === 'audio' && (
            <div className={styles.mediaViewerAudio}>
              <div className={styles.audioIcon}>🎵</div>
              <audio 
                src={media.media_url} 
                controls 
                className={styles.audioPlayer}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
