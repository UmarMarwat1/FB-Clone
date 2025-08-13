import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

// Configure for large file uploads
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
    responseLimit: false,
  },
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const fileType = formData.get('fileType')
    const userId = formData.get('userId')
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("=== STORY UPLOAD API DEBUG ===")
    console.log("File:", file?.name, file?.size, file?.type)
    console.log("File type:", fileType)
    console.log("User ID:", userId)

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ 
        error: `File ${file.name} is too large. Maximum size is 50MB` 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ 
        error: `File ${file.name} has invalid type. Allowed: images and videos` 
      }, { status: 400 })
    }

    // Create authenticated Supabase client
    let supabaseAuth = supabase
    if (token) {
      supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAuth.storage
      .from('stories')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      throw new Error("Failed to upload file")
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAuth.storage
      .from('stories')
      .getPublicUrl(fileName)

    // For videos, generate thumbnail (simplified - in production you'd use FFmpeg)
    let thumbnailUrl = null
    if (fileType === 'video') {
      // In a real implementation, you would generate a thumbnail here
      // For now, we'll return null and handle it on the frontend
      thumbnailUrl = null
    }

    console.log("File uploaded successfully:", fileName)
    return Response.json({ 
      success: true,
      mediaUrl: publicUrl,
      thumbnailUrl: thumbnailUrl,
      fileName: fileName
    })

  } catch (error) {
    console.error("Upload API error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
