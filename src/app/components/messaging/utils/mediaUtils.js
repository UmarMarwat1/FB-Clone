// Media utilities for friend messaging system

// File type validation
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'],
  audio: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg']
}

// File size limits in bytes
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  audio: 25 * 1024 * 1024  // 25MB
}

// Validate file type and size
export function validateFile(file, expectedType) {
  const errors = []
  
  // Check file type
  if (!ALLOWED_FILE_TYPES[expectedType]?.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types for ${expectedType}: ${ALLOWED_FILE_TYPES[expectedType].join(', ')}`)
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZES[expectedType]) {
    errors.push(`File too large. Maximum size for ${expectedType}: ${MAX_FILE_SIZES[expectedType] / (1024 * 1024)}MB`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Compress image using Canvas API
export async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create new file with compressed data
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Generate video thumbnail using video element
export async function generateVideoThumbnail(file, time = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    video.onloadedmetadata = () => {
      video.currentTime = time
    }
    
    video.onseeked = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const thumbnailFile = new File([blob], 'thumbnail.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(thumbnailFile)
        } else {
          reject(new Error('Failed to generate thumbnail'))
        }
      }, 'image/jpeg', 0.8)
    }
    
    video.onerror = () => reject(new Error('Failed to load video'))
    video.src = URL.createObjectURL(file)
  })
}

// Get media duration for audio/video files
export function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      const media = file.type.startsWith('audio/') ? new Audio() : document.createElement('video')
      
      media.onloadedmetadata = () => {
        resolve(Math.round(media.duration))
      }
      
      media.onerror = () => {
        resolve(null) // Return null if duration can't be determined
      }
      
      media.src = URL.createObjectURL(file)
    } else {
      resolve(null)
    }
  })
}

// Format file size for display
export function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
}

// Format duration for display
export function formatDuration(seconds) {
  if (!seconds) return ''
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Get file extension from filename
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

// Generate unique filename for upload
export function generateUniqueFilename(originalName, conversationId) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const extension = getFileExtension(originalName)
  
  return `${conversationId}/${timestamp}-${random}.${extension}`
}

// Check if file is an image
export function isImage(file) {
  return file.type.startsWith('image/')
}

// Check if file is a video
export function isVideo(file) {
  return file.type.startsWith('video/')
}

// Check if file is audio
export function isAudio(file) {
  return file.type.startsWith('audio/')
}

// Get appropriate icon for file type
export function getFileIcon(file) {
  if (isImage(file)) return '📷'
  if (isVideo(file)) return '🎥'
  if (isAudio(file)) return '🎵'
  return '📎'
}

// Create preview URL for media files
export function createPreviewUrl(file) {
  return URL.createObjectURL(file)
}

// Clean up preview URLs to prevent memory leaks
export function revokePreviewUrl(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
