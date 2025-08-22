import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

export async function POST(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No authorization header',
        status: 'unauthenticated'
      }, { status: 401 })
    }
    
    const supabase = createAuthenticatedClient(request)
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token',
        status: 'invalid_token'
      }, { status: 401 })
    }

    // Get the raw body as a buffer first
    const rawBody = await request.arrayBuffer()
    
    // Convert to FormData
    const formData = new FormData()
    
    // Parse the raw body manually if needed
    // This is a fallback approach for deployment environments
    try {
      // Try to parse as FormData
      const text = new TextDecoder().decode(rawBody)
      const boundary = request.headers.get('content-type')?.split('boundary=')[1]
      
      if (boundary) {
        // Parse multipart form data manually
        const parts = text.split('--' + boundary)
        for (const part of parts) {
          if (part.includes('Content-Disposition: form-data')) {
            const lines = part.split('\r\n')
            let name = ''
            let filename = ''
            let content = ''
            let isContent = false
            
            for (const line of lines) {
              if (line.startsWith('Content-Disposition: form-data;')) {
                const nameMatch = line.match(/name="([^"]+)"/)
                const filenameMatch = line.match(/filename="([^"]+)"/)
                if (nameMatch) name = nameMatch[1]
                if (filenameMatch) filename = filenameMatch[1]
              } else if (line === '') {
                isContent = true
              } else if (isContent) {
                content += line
              }
            }
            
            if (name === 'video' && filename) {
              // Create a file object from the content
              const file = new File([content], filename, { type: 'video/mp4' })
              formData.append('video', file)
            } else if (name === 'caption') {
              formData.append('caption', content)
            } else if (name === 'privacy') {
              formData.append('privacy', content)
            }
          }
        }
      }
    } catch (parseError) {
      console.error('Manual parsing failed, trying alternative approach')
      // Fallback: create a minimal form data
      formData.append('caption', '')
      formData.append('privacy', 'public')
    }

    const file = formData.get('video')
    const caption = formData.get('caption') || ''
    const privacy = formData.get('privacy') || 'public'

    if (!file) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE
        },
        { status: 413 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${user.id}/${timestamp}_${file.name}`

    // Upload video to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload video: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    // For now, use the same URL for thumbnail
    const thumbnailUrl = publicUrl

    // Get video metadata
    const duration = 15 // Placeholder
    const width = 1080 // Placeholder
    const height = 1920 // Placeholder

    // Create reel record
    const { data: reel, error: reelError } = await supabase
      .from('reels')
      .insert({
        user_id: user.id,
        caption,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        width,
        height,
        file_size: file.size,
        privacy,
        is_active: true
      })
      .select('*')
      .single()

    if (reelError) {
      console.error('Reel creation error:', reelError)
      // Clean up uploaded file if reel creation fails
      await supabase.storage.from('videos').remove([fileName])
      
      return NextResponse.json(
        { error: 'Failed to create reel: ' + reelError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      reel: {
        id: reel.id,
        caption: reel.caption,
        video_url: reel.video_url,
        user_id: reel.user_id,
        created_at: reel.created_at
      }
    })
  } catch (error) {
    console.error('Error uploading reel:', error)
    return NextResponse.json(
      { error: 'Failed to upload reel: ' + error.message },
      { status: 500 }
    )
  }
}
