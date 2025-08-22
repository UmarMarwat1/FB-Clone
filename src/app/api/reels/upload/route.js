import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

// Disable body parsing for this route to handle large files
export const config = {
  api: {
    bodyParser: false,
  },
}

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

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request) {
  try {
    // Log request details for debugging
    console.log('Reel upload request received:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    })

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization failed: No valid header')
      return NextResponse.json({ 
        error: 'No authorization header',
        status: 'unauthenticated'
      }, { status: 401 })
    }
    
    const supabase = createAuthenticatedClient(request)
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('User verification failed:', userError)
      return NextResponse.json({ 
        error: 'Invalid token',
        status: 'invalid_token'
      }, { status: 401 })
    }
    
    console.log('Auth check successful:', { 
      user: user?.id, 
      userEmail: user?.email 
    })

    // Parse form data with error handling
    let formData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error('FormData parsing error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse form data. File may be too large or corrupted.' },
        { status: 400 }
      )
    }

    const file = formData.get('video')
    const caption = formData.get('caption')
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
      console.log('File size validation failed:', {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileName: file.name
      })
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

    console.log('Starting video upload:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId: user.id
    })

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

    console.log('Video uploaded successfully:', uploadData)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    // For now, use the same URL for thumbnail (you can implement proper thumbnail generation later)
    const thumbnailUrl = publicUrl

    // Get video metadata (you might need a library for this in production)
    const duration = 15 // Placeholder - you'd extract this from the video
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

    console.log('Reel created successfully:', reel)

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
    
    // Ensure we always return valid JSON
    return NextResponse.json(
      { 
        error: 'Failed to upload reel: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}