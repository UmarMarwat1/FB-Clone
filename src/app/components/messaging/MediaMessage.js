"use client"
import { useState } from "react"
import MediaViewer from "./MediaViewer"
import styles from "./messaging.module.css"

export default function MediaMessage({ message, isOwn }) {
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)

  const formatFileSize = (bytes) => {
    if (!bytes) return ""
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    if (!seconds) return ""
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleVideoError = () => {
    setVideoError(true)
  }

  const handleAudioError = () => {
    setAudioError(false)
  }

  const openMediaViewer = () => {
    if (message.message_type === 'image' || message.message_type === 'video') {
      setIsMediaViewerOpen(true)
    }
  }

  const closeMediaViewer = () => {
    setIsMediaViewerOpen(false)
  }

  const renderImage = () => {
    if (imageError) {
      return (
        <div className={styles.mediaError}>
          <span>📷</span>
          <p>Image failed to load</p>
        </div>
      )
    }

    return (
      <div className={styles.imageContainer}>
        <img
          src={message.media_url}
          alt="Shared image"
          onError={handleImageError}
          className={styles.mediaImage}
          onClick={openMediaViewer}
          style={{ cursor: 'pointer' }}
        />
        {message.media_size && (
          <div className={styles.mediaInfo}>
            {formatFileSize(message.media_size)}
          </div>
        )}
      </div>
    )
  }

  const renderVideo = () => {
    if (videoError) {
      return (
        <div className={styles.mediaError}>
          <span>🎥</span>
          <p>Video failed to load</p>
        </div>
      )
    }

    return (
      <div className={styles.videoContainer}>
        <video
          preload="metadata"
          className={styles.mediaVideo}
          onError={handleVideoError}
          onClick={openMediaViewer}
          style={{ cursor: 'pointer' }}
        >
          <source src={message.media_url} type="video/mp4" />
          <source src={message.media_url} type="video/webm" />
          Your browser does not support the video tag.
        </video>
        {message.media_thumbnail && (
          <div className={styles.videoThumbnail}>
            <img src={message.media_thumbnail} alt="Video thumbnail" />
          </div>
        )}
        <div className={styles.mediaInfo}>
          {message.media_duration && formatDuration(message.media_duration)}
          {message.media_size && ` • ${formatFileSize(message.media_size)}`}
        </div>
      </div>
    )
  }

  const renderAudio = () => {
    if (audioError) {
      return (
        <div className={styles.mediaError}>
          <span>🎵</span>
          <p>Audio failed to load</p>
        </div>
      )
    }

    return (
      <div className={styles.audioContainer}>
        <audio
          controls
          preload="metadata"
          className={styles.mediaAudio}
          onError={handleAudioError}
        >
          <source src={message.media_url} type="audio/mpeg" />
          <source src={message.media_url} type="audio/wav" />
          <source src={message.media_url} type="audio/m4a" />
          Your browser does not support the audio tag.
        </audio>
        <div className={styles.mediaInfo}>
          {message.media_duration && formatDuration(message.media_duration)}
          {message.media_size && ` • ${formatFileSize(message.media_size)}`}
        </div>
      </div>
    )
  }

  const renderMedia = () => {
    switch (message.message_type) {
      case 'image':
        return renderImage()
      case 'video':
        return renderVideo()
      case 'audio':
        return renderAudio()
      default:
        return (
          <div className={styles.mediaError}>
            <span>📎</span>
            <p>Unsupported media type</p>
          </div>
        )
    }
  }

  return (
    <>
      <div className={styles.mediaMessage}>
        {renderMedia()}
      </div>
      
      {/* Media Viewer Modal */}
      <MediaViewer
        media={message}
        isOpen={isMediaViewerOpen}
        onClose={closeMediaViewer}
      />
    </>
  )
}
