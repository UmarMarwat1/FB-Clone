import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Base client (no user auth attached). Used only for lightweight auth methods.
const baseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Please log in to upload files',
        details: 'No authorization header'
      }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user (using base client)
    const { data: { user }, error: userError } = await baseClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Please log in to upload files',
        details: 'Invalid token'
      }, { status: 401 })
    }

    // Create a user-scoped client so storage rules see an authenticated user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Proceed with upload using supabaseUser

    const formData = await request.formData()
    const files = formData.getAll('files')
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Validate file count (max 10 files)
    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 files allowed' }, { status: 400 })
    }

    const uploadedFiles = []
    const userId = user.id

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 50MB` 
        }, { status: 400 })
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: `File ${file.name} has invalid type. Allowed: images and videos` 
        }, { status: 400 })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}/${timestamp}_${randomString}.${fileExtension}`

      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Supabase Storage
        const { data, error } = await supabaseUser.storage
          .from('post-media')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600'
          })

        if (error) {
          console.error('Storage upload error:', error)
          return NextResponse.json({ 
            error: `Failed to upload ${file.name}` 
          }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseUser.storage
          .from('post-media')
          .getPublicUrl(fileName)

        uploadedFiles.push({
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name,
          size: file.size
        })
        
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        return NextResponse.json({ 
          error: `Failed to process ${file.name}` 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
